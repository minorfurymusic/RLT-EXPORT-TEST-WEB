package com.reallifetrack.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Opção A — hardware-backed pedometer that keeps counting while the app is
 * minimized or closed. TYPE_STEP_COUNTER is a cumulative count since the
 * device's last boot, so "today's steps" is that raw value minus a baseline
 * captured at the start of the day (or right after a reboot, since the
 * sensor resets to 0 then).
 */
class StepCounterService : Service(), SensorEventListener {

    private var sensorManager: SensorManager? = null
    private lateinit var prefs: SharedPreferences

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        createNotificationChannel()
        // Android 10+ (API 29) requires the foreground service type to be passed
        // here explicitly, matching android:foregroundServiceType="health" in the
        // manifest — mandatory (not just recommended) as of Android 14 (API 34).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, buildNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
        } else {
            startForeground(NOTIFICATION_ID, buildNotification())
        }

        sensorManager = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val stepCounter = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (stepCounter != null) {
            sensorManager?.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_NORMAL)
        } else {
            // Device has no hardware step counter — nothing this service can do;
            // the JS-side DeviceMotion fallback (sensorService.ts) still applies
            // while the app is in the foreground.
            stopSelf()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event == null || event.sensor.type != Sensor.TYPE_STEP_COUNTER) return
        val rawTotal = event.values[0]

        val today = todayString()
        val baselineDate = prefs.getString(KEY_BASELINE_DATE, null)
        var baseline = prefs.getFloat(KEY_BASELINE_VALUE, -1f)

        val needsNewBaseline = baselineDate != today || baseline < 0f || rawTotal < baseline
        if (needsNewBaseline) {
            // New day, first run, or the sensor reset (device rebooted since the
            // last known baseline) — start counting from the current raw value.
            baseline = rawTotal
            prefs.edit()
                .putFloat(KEY_BASELINE_VALUE, baseline)
                .putString(KEY_BASELINE_DATE, today)
                .apply()
        }

        val stepsToday = (rawTotal - baseline).toInt().coerceAtLeast(0)
        prefs.edit().putInt(KEY_STEPS_TODAY, stepsToday).apply()
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onDestroy() {
        sensorManager?.unregisterListener(this)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Contador de Passos",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "Mantém a contagem de passos ativa em segundo plano"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Real Life Track")
            .setContentText("Contando seus passos em segundo plano")
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    private fun todayString(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    companion object {
        private const val PREFS_NAME = "rlt_step_prefs"
        private const val KEY_BASELINE_VALUE = "baseline_value"
        private const val KEY_BASELINE_DATE = "baseline_date"
        private const val KEY_STEPS_TODAY = "steps_today"
        private const val CHANNEL_ID = "rlt_step_service_channel"
        private const val NOTIFICATION_ID = 4821

        // @JvmStatic so MainActivity.java (plain Java) can call
        // StepCounterService.start(this) directly instead of the more verbose
        // StepCounterService.Companion.start(this) Java requires without it.
        @JvmStatic
        fun start(context: Context) {
            val intent = Intent(context, StepCounterService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }

        /** Reads the last value the service persisted — safe to call without binding. */
        @JvmStatic
        fun getStepsToday(context: Context): Int {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            val baselineDate = prefs.getString(KEY_BASELINE_DATE, null)
            // If the persisted baseline is from a previous day, today's steps are 0
            // until the service processes its next sensor event and rolls the baseline.
            if (baselineDate != today) return 0
            return prefs.getInt(KEY_STEPS_TODAY, 0)
        }
    }
}
