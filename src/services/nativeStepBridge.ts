import { registerPlugin } from '@capacitor/core';

/**
 * JS binding for the two native Android step sources
 * (android/app/src/main/java/com/reallifetrack/app/StepTrackerPlugin.kt):
 *  - Opção A: this device's own foreground-service pedometer.
 *  - Opção B: Health Connect (aggregates Google Fit/Samsung Health/etc).
 * Only registered/usable on Android — sensorService.ts falls back to the
 * existing DeviceMotion-based JS counting everywhere else (web preview, iOS).
 */
export interface StepTrackerPlugin {
  startTracking(): Promise<void>;
  getSteps(): Promise<{ steps: number }>;
  isHealthConnectAvailable(): Promise<{ available: boolean }>;
  requestHealthConnectPermission(): Promise<{ granted: boolean }>;
  getHealthConnectSteps(): Promise<{ steps: number }>;
}

export const StepTracker = registerPlugin<StepTrackerPlugin>('StepTracker');
