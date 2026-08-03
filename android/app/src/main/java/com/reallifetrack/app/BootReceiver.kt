package com.reallifetrack.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restarts the step-counter foreground service after a device reboot —
 * without this, "contador de passos não funciona com o app fechado" would
 * also be true right after every restart, even once the service itself works.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
            StepCounterService.start(context)
        }
    }
}
