package com.reallifetrack.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * JS bridge for StepCounterService. Every method reflects real, freshly-checked
 * state — no timeout races that report "granted" before the OS dialog actually
 * returns (that exact anti-pattern is what made the previous permission flow
 * lie to the user; see DIAGNOSTICO_CONTADOR_PASSOS_E_CEREBRO.md).
 */
@CapacitorPlugin(
    name = "StepTracker",
    permissions = { @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = StepTrackerPlugin.ACTIVITY_RECOGNITION) }
)
public class StepTrackerPlugin extends Plugin {

    static final String ACTIVITY_RECOGNITION = "activityRecognition";

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", isActivityRecognitionGranted());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (isActivityRecognitionGranted()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias(ACTIVITY_RECOGNITION, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", isActivityRecognitionGranted());
        call.resolve(result);
    }

    private boolean isActivityRecognitionGranted() {
        // ACTIVITY_RECOGNITION only became a runtime-requestable permission on
        // API 29 (Q) — the step counter sensor works without it on older versions.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return true;
        return getPermissionState(ACTIVITY_RECOGNITION) == PermissionState.GRANTED;
    }

    @PluginMethod
    public void isSensorAvailable(PluginCall call) {
        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        boolean available = sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null;
        JSObject result = new JSObject();
        result.put("available", available);
        call.resolve(result);
    }

    @PluginMethod
    public void startTracking(PluginCall call) {
        if (!isActivityRecognitionGranted()) {
            call.reject("Permissão de reconhecimento de atividade não concedida.", "PERMISSION_DENIED");
            return;
        }
        Intent serviceIntent = new Intent(getContext(), StepCounterService.class);
        ContextCompat.startForegroundService(getContext(), serviceIntent);
        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        getContext().stopService(new Intent(getContext(), StepCounterService.class));
        getPrefs().edit().putBoolean(StepCounterService.KEY_TRACKING_ENABLED, false).apply();
        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void getSteps(PluginCall call) {
        SharedPreferences prefs = getPrefs();
        String today = todayStr();
        String baselineDate = prefs.getString(StepCounterService.KEY_BASELINE_DATE, null);

        int stepsToday = today.equals(baselineDate) ? prefs.getInt(StepCounterService.KEY_STEPS_TODAY, 0) : 0;
        long lastUpdateMs = prefs.getLong(StepCounterService.KEY_LAST_UPDATE_MS, 0);
        boolean isTracking = prefs.getBoolean(StepCounterService.KEY_TRACKING_ENABLED, false);

        SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        boolean sensorAvailable = sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null;

        JSObject result = new JSObject();
        result.put("steps", stepsToday);
        result.put("lastUpdateMs", lastUpdateMs);
        result.put("isTracking", isTracking);
        result.put("sensorAvailable", sensorAvailable);
        result.put("permissionGranted", isActivityRecognitionGranted());
        call.resolve(result);
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ignoring", isIgnoringBatteryOptimizationsInternal());
        call.resolve(result);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (isIgnoringBatteryOptimizationsInternal()) {
            call.resolve(new JSObject().put("ignoring", true));
            return;
        }
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        startActivityForResult(call, intent, "batteryOptimizationCallback");
    }

    @ActivityCallback
    private void batteryOptimizationCallback(PluginCall call, ActivityResult result) {
        if (call == null) return;
        call.resolve(new JSObject().put("ignoring", isIgnoringBatteryOptimizationsInternal()));
    }

    private boolean isIgnoringBatteryOptimizationsInternal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(StepCounterService.PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static String todayStr() {
        SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        fmt.setTimeZone(TimeZone.getDefault());
        return fmt.format(new Date());
    }
}
