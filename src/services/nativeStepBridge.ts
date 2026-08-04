import { registerPlugin, Capacitor } from '@capacitor/core';

export interface StepTrackerPermissionResult {
  granted: boolean;
}

export interface StepTrackerStepsResult {
  steps: number;
  lastUpdateMs: number;
  isTracking: boolean;
  sensorAvailable: boolean;
  permissionGranted: boolean;
}

export interface StepTrackerBatteryResult {
  ignoring: boolean;
}

interface StepTrackerPluginInterface {
  checkPermissions(): Promise<StepTrackerPermissionResult>;
  requestPermissions(): Promise<StepTrackerPermissionResult>;
  isSensorAvailable(): Promise<{ available: boolean }>;
  startTracking(): Promise<{ success: boolean }>;
  stopTracking(): Promise<{ success: boolean }>;
  getSteps(): Promise<StepTrackerStepsResult>;
  isIgnoringBatteryOptimizations(): Promise<StepTrackerBatteryResult>;
  requestIgnoreBatteryOptimizations(): Promise<StepTrackerBatteryResult>;
}

// No web implementation on purpose — TYPE_STEP_COUNTER is a native Android
// sensor with no browser equivalent. Every method resolves to an honest
// "not available here" instead of throwing, so calling code in the dev
// browser/preview doesn't need extra guards beyond checking `sensorAvailable`.
const webFallback: StepTrackerPluginInterface = {
  async checkPermissions() { return { granted: false }; },
  async requestPermissions() { return { granted: false }; },
  async isSensorAvailable() { return { available: false }; },
  async startTracking() { return { success: false }; },
  async stopTracking() { return { success: false }; },
  async getSteps() { return { steps: 0, lastUpdateMs: 0, isTracking: false, sensorAvailable: false, permissionGranted: false }; },
  async isIgnoringBatteryOptimizations() { return { ignoring: true }; },
  async requestIgnoreBatteryOptimizations() { return { ignoring: true }; }
};

const StepTrackerNative = registerPlugin<StepTrackerPluginInterface>('StepTracker', {
  web: async () => webFallback
});

class NativeStepBridge {
  private isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  isSupported(): boolean {
    return this.isNative;
  }

  async checkPermission(): Promise<boolean> {
    if (!this.isNative) return false;
    const { granted } = await StepTrackerNative.checkPermissions();
    return granted;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNative) return false;
    const { granted } = await StepTrackerNative.requestPermissions();
    return granted;
  }

  async isSensorAvailable(): Promise<boolean> {
    if (!this.isNative) return false;
    const { available } = await StepTrackerNative.isSensorAvailable();
    return available;
  }

  async startTracking(): Promise<boolean> {
    if (!this.isNative) return false;
    const { success } = await StepTrackerNative.startTracking();
    return success;
  }

  async stopTracking(): Promise<void> {
    if (!this.isNative) return;
    await StepTrackerNative.stopTracking();
  }

  async getSteps(): Promise<StepTrackerStepsResult> {
    if (!this.isNative) {
      return { steps: 0, lastUpdateMs: 0, isTracking: false, sensorAvailable: false, permissionGranted: false };
    }
    return StepTrackerNative.getSteps();
  }

  async isIgnoringBatteryOptimizations(): Promise<boolean> {
    if (!this.isNative) return true;
    const { ignoring } = await StepTrackerNative.isIgnoringBatteryOptimizations();
    return ignoring;
  }

  async requestIgnoreBatteryOptimizations(): Promise<boolean> {
    if (!this.isNative) return true;
    const { ignoring } = await StepTrackerNative.requestIgnoreBatteryOptimizations();
    return ignoring;
  }
}

export const nativeStepBridge = new NativeStepBridge();
