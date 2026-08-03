package com.reallifetrack.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

private const val HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata"

/**
 * Bridges two independent step-count sources to the JS side, which decides
 * which one to trust (see src/services/sensorService.ts):
 *  - Opção A: this device's own StepCounterService (always available if the
 *    phone has a step-counter sensor, works with no extra permission beyond
 *    what's already in AndroidManifest.xml).
 *  - Opção B: Health Connect (getHealthConnectSteps/requestHealthConnectPermission)
 *    — aggregates Google Fit/Samsung Health/etc, but needs Health Connect
 *    installed and the user granting read access.
 */
@CapacitorPlugin(name = "StepTracker")
class StepTrackerPlugin : Plugin() {

    private val healthPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class)
    )

    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>
    private var pendingPermissionCall: PluginCall? = null

    override fun load() {
        super.load()
        val contract = PermissionController.createRequestPermissionResultContract()
        permissionLauncher = activity.activityResultRegistry.register(
            "rlt_health_connect_permissions",
            contract
        ) { granted ->
            val call = pendingPermissionCall
            pendingPermissionCall = null
            val result = JSObject()
            result.put("granted", granted.containsAll(healthPermissions))
            call?.resolve(result)
        }
    }

    // ---- Opção A: native foreground service ----

    @PluginMethod
    fun startTracking(call: PluginCall) {
        StepCounterService.start(context)
        call.resolve()
    }

    @PluginMethod
    fun getSteps(call: PluginCall) {
        val result = JSObject()
        result.put("steps", StepCounterService.getStepsToday(context))
        call.resolve(result)
    }

    // ---- Opção B: Health Connect ----

    // "available" collapses the check for callers that don't care why; "status" is
    // one of "available" | "not_installed" | "not_supported" so the UI can tell a
    // missing app (fixable by installing it) apart from unsupported hardware/OS.
    @PluginMethod
    fun isHealthConnectAvailable(call: PluginCall) {
        val result = JSObject()
        result.put("available", healthConnectStatusString() == "available")
        result.put("status", healthConnectStatusString())
        call.resolve(result)
    }

    private fun healthConnectStatusString(): String {
        return when (HealthConnectClient.getSdkStatus(context)) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "not_installed"
            else -> "not_supported"
        }
    }

    @PluginMethod
    fun openHealthConnectInstallPage(call: PluginCall) {
        val uri = Uri.parse("market://details?id=$HEALTH_CONNECT_PACKAGE")
        try {
            activity.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("com.android.vending"))
        } catch (e: ActivityNotFoundException) {
            val webUri = Uri.parse("https://play.google.com/store/apps/details?id=$HEALTH_CONNECT_PACKAGE")
            activity.startActivity(Intent(Intent.ACTION_VIEW, webUri))
        }
        call.resolve()
    }

    @PluginMethod
    fun requestHealthConnectPermission(call: PluginCall) {
        val status = healthConnectStatusString()
        if (status != "available") {
            val result = JSObject()
            result.put("granted", false)
            result.put("status", status)
            call.resolve(result)
            return
        }
        val client = HealthConnectClient.getOrCreate(context)
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                if (granted.containsAll(healthPermissions)) {
                    val result = JSObject()
                    result.put("granted", true)
                    call.resolve(result)
                } else {
                    pendingPermissionCall = call
                    permissionLauncher.launch(healthPermissions)
                }
            } catch (e: Exception) {
                call.reject("Health Connect permission check failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun getHealthConnectSteps(call: PluginCall) {
        if (healthConnectStatusString() != "available") {
            call.reject("Health Connect not available on this device")
            return
        }
        val client = HealthConnectClient.getOrCreate(context)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(healthPermissions)) {
                    call.reject("Health Connect permission not granted")
                    return@launch
                }
                val zone = ZoneId.systemDefault()
                val startOfDay = LocalDate.now(zone).atStartOfDay(zone).toInstant()
                val response = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(startOfDay, Instant.now())
                    )
                )
                val steps = response[StepsRecord.COUNT_TOTAL] ?: 0L
                val result = JSObject()
                result.put("steps", steps.toInt())
                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Health Connect query failed: ${e.message}")
            }
        }
    }
}
