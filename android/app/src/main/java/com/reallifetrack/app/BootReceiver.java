package com.reallifetrack.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.core.content.ContextCompat;

/**
 * TYPE_STEP_COUNTER resets to 0 on every reboot and the service's sensor
 * listener does not survive a reboot on its own — without this receiver,
 * step counting would silently stop until the user manually reopens the app.
 * Only restarts tracking if the user had actually turned it on before
 * (tracking_enabled), never starts it unsolicited.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

        SharedPreferences prefs = context.getSharedPreferences(StepCounterService.PREFS_NAME, Context.MODE_PRIVATE);
        boolean wasTracking = prefs.getBoolean(StepCounterService.KEY_TRACKING_ENABLED, false);
        if (!wasTracking) return;

        Intent serviceIntent = new Intent(context, StepCounterService.class);
        ContextCompat.startForegroundService(context, serviceIntent);
    }
}
