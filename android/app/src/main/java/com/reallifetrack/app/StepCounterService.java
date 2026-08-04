package com.reallifetrack.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Keeps a SensorManager listener on TYPE_STEP_COUNTER (hardware step counter,
 * cumulative since last boot) alive as a real Android foreground service —
 * per Android's own docs, the sensor only delivers events while a listener
 * stays registered, and that registration dies the moment the process is
 * backgrounded unless it's pinned by a foreground service. All state
 * (today's baseline, last raw reading, computed steps-today) is persisted to
 * SharedPreferences on every sensor event, so StepTrackerPlugin can read the
 * current count without any IPC/broadcast plumbing, and so a process restart
 * (OS kill + BootReceiver / relaunch) picks up exactly where it left off
 * instead of losing the day's count.
 */
public class StepCounterService extends Service implements SensorEventListener {

    public static final String PREFS_NAME = "rlt_step_counter";
    public static final String KEY_BASELINE_RAW = "baseline_raw";
    public static final String KEY_BASELINE_DATE = "baseline_date";
    public static final String KEY_LAST_RAW_TOTAL = "last_raw_total";
    public static final String KEY_STEPS_TODAY = "steps_today";
    public static final String KEY_LAST_UPDATE_MS = "last_update_ms";
    public static final String KEY_TRACKING_ENABLED = "tracking_enabled";

    private static final String CHANNEL_ID = "rlt_step_counter_channel";
    private static final int NOTIFICATION_ID = 4821;

    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private int lastNotifiedSteps = -1;

    @Override
    public void onCreate() {
        super.onCreate();
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        stepCounterSensor = sensorManager != null ? sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) : null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Must be called within a few seconds of the service starting on Android 8+,
        // and with a matching foregroundServiceType on Android 14+, or the system
        // kills the service outright (ForegroundServiceDidNotStartInTimeException /
        // MissingForegroundServiceTypeException) — this was the exact class of bug
        // that made the previous native step counter attempt silently never run.
        startForeground(NOTIFICATION_ID, buildNotification(currentStepsToday()));

        getPrefs().edit().putBoolean(KEY_TRACKING_ENABLED, true).apply();

        if (stepCounterSensor != null && sensorManager != null) {
            sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;

        float rawTotal = event.values[0];
        SharedPreferences prefs = getPrefs();
        String today = todayStr();

        float baselineRaw = prefs.getFloat(KEY_BASELINE_RAW, -1);
        String baselineDate = prefs.getString(KEY_BASELINE_DATE, null);
        float lastRawTotal = prefs.getFloat(KEY_LAST_RAW_TOTAL, -1);

        boolean firstRun = baselineDate == null || lastRawTotal < 0;
        boolean newDay = !firstRun && !today.equals(baselineDate);
        // TYPE_STEP_COUNTER resets to 0 on every device reboot — a raw value
        // lower than what we last saw means the phone rebooted since, not that
        // steps went backwards. Fold the steps already counted today into the
        // new baseline instead of losing them.
        boolean rebooted = !firstRun && !newDay && rawTotal < lastRawTotal;

        if (firstRun || newDay) {
            baselineRaw = rawTotal;
        } else if (rebooted) {
            float stepsSoFarToday = Math.max(0, lastRawTotal - baselineRaw);
            baselineRaw = rawTotal - stepsSoFarToday;
        }

        int stepsToday = Math.max(0, Math.round(rawTotal - baselineRaw));

        prefs.edit()
            .putFloat(KEY_BASELINE_RAW, baselineRaw)
            .putString(KEY_BASELINE_DATE, today)
            .putFloat(KEY_LAST_RAW_TOTAL, rawTotal)
            .putInt(KEY_STEPS_TODAY, stepsToday)
            .putLong(KEY_LAST_UPDATE_MS, System.currentTimeMillis())
            .apply();

        if (stepsToday != lastNotifiedSteps) {
            lastNotifiedSteps = stepsToday;
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildNotification(stepsToday));
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) { /* not used */ }

    private int currentStepsToday() {
        SharedPreferences prefs = getPrefs();
        String today = todayStr();
        if (today.equals(prefs.getString(KEY_BASELINE_DATE, null))) {
            return prefs.getInt(KEY_STEPS_TODAY, 0);
        }
        return 0;
    }

    private SharedPreferences getPrefs() {
        return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static String todayStr() {
        SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        fmt.setTimeZone(TimeZone.getDefault());
        return fmt.format(new Date());
    }

    private Notification buildNotification(int steps) {
        createChannelIfNeeded();
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Real Life Track")
            .setContentText(steps + " passos hoje")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Contador de Passos",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Mantém a contagem de passos ativa em segundo plano.");
        channel.setShowBadge(false);
        nm.createNotificationChannel(channel);
    }
}
