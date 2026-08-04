
import { Motion } from '@capacitor/motion';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { safeLocalStorage } from '../lib/utils';
import { StepTracker, HealthConnectStatus } from './nativeStepBridge';

export interface StepSensorData {
  steps: number;
  timestamp: number;
}

class SensorService {
  private steps: number = 0;
  private lastStepTime: number = 0;
  private minStepInterval: number = 380; // ms between human steps (min 2.6 steps/sec)
  private isListening: boolean = false;
  private onStepCallback: ((steps: number) => void) | null = null;
  private wasBelowThreshold: boolean = true;
  private motionListenerHandle: any = null;

  private intensity: number = 0;
  private intensityBuffer: number[] = [];
  private readonly BUFFER_SIZE = 10;

  private audioCtx: AudioContext | null = null;
  private keepAliveInterval: any = null;
  private isKeepAliveActive: boolean = false;
  private nativeSyncInterval: any = null;

  constructor() {
    this.checkAndResetDaily();
    this.setupResumeAndAppSync();
  }

  private setupResumeAndAppSync() {
    // Solução 3, 7, 8 & 11: Auto Sync on App Resume / Unlocking / Focus
    const handleResumeSync = () => {
      this.syncStepBaselineFromStorage();
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleResumeSync();
      } else {
        safeLocalStorage.setItem('sensor_last_bg_time', Date.now().toString());
        safeLocalStorage.setItem('sensor_steps_bg', this.steps.toString());
      }
    });

    window.addEventListener('focus', handleResumeSync);
    window.addEventListener('pageshow', handleResumeSync);

    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          handleResumeSync();
        } else {
          safeLocalStorage.setItem('sensor_last_bg_time', Date.now().toString());
          safeLocalStorage.setItem('sensor_steps_bg', this.steps.toString());
        }
      });
    }
  }

  public syncStepBaselineFromStorage() {
    this.checkAndResetDaily();
    const storedSteps = parseInt(safeLocalStorage.getItem('sensor_steps') || '0', 10);
    const lastBgTime = parseInt(safeLocalStorage.getItem('sensor_last_bg_time') || '0', 10);

    // Solução 11: Smart hardware sync & step catch-up engine
    if (storedSteps > this.steps) {
      this.steps = storedSteps;
    }

    // If app was closed/backgrounded, sync latest step state to listeners
    if (this.onStepCallback) {
      this.onStepCallback(this.steps);
    }

    // Fire-and-forget: pull whatever the native side counted while this JS
    // context wasn't running at all (app killed, not just backgrounded) —
    // the JS-side accelerometer listener above can't see that gap, only the
    // native foreground service (Opção A) and Health Connect (Opção B) can.
    void this.syncFromNativeSources();
  }

  /**
   * Reconciles the JS-tracked step count against the two native Android
   * sources. Both are best-effort and independent: if Health Connect isn't
   * installed/authorized, its call simply fails and is ignored; if the
   * native foreground service hasn't produced a sensor event yet today, it
   * just returns 0. Whichever source reports the highest count for today
   * wins — "se um não funcionar, puxa o outro" — since undercounting from a
   * quiet/unavailable source is far more likely than any source overcounting.
   */
  public async syncFromNativeSources(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const debug = await this.getDebugStepSources();

    let best = this.steps;
    if (debug.service !== null && debug.service > best) best = debug.service;
    if (debug.healthConnect !== null && debug.healthConnect > best) best = debug.healthConnect;

    if (best > this.steps) {
      this.setSteps(best);
    }
  }

  /**
   * Raw per-source readout, with the actual error message when a source
   * fails, instead of collapsing everything into a single number silently.
   * Surfaced in the UI (Exercises.tsx step-goal card) so a real failure can
   * be diagnosed by reading the screen instead of needing device logs.
   */
  public async getDebugStepSources(): Promise<{
    service: number | null;
    serviceError?: string;
    healthConnect: number | null;
    healthConnectError?: string;
  }> {
    const result: { service: number | null; serviceError?: string; healthConnect: number | null; healthConnectError?: string } = {
      service: null,
      healthConnect: null,
    };

    if (!Capacitor.isNativePlatform()) {
      result.serviceError = 'not native platform';
      result.healthConnectError = 'not native platform';
      return result;
    }

    try {
      const { steps } = await StepTracker.getSteps();
      result.service = steps;
    } catch (e: any) {
      result.serviceError = e?.message || String(e);
    }

    try {
      const { available, status } = await StepTracker.isHealthConnectAvailable();
      if (!available) {
        result.healthConnectError = `status: ${status}`;
      } else {
        const { steps } = await StepTracker.getHealthConnectSteps();
        result.healthConnect = steps;
      }
    } catch (e: any) {
      result.healthConnectError = e?.message || String(e);
    }

    return result;
  }

  /** Prompts the user for Health Connect read access (Opção B) — safe to call repeatedly. */
  public async requestHealthConnectPermission(): Promise<{ granted: boolean; status: HealthConnectStatus }> {
    if (!Capacitor.isNativePlatform()) return { granted: false, status: 'not_supported' };
    try {
      const { status } = await StepTracker.isHealthConnectAvailable();
      if (status !== 'available') return { granted: false, status };
      const { granted } = await StepTracker.requestHealthConnectPermission();
      if (granted) void this.syncFromNativeSources();
      return { granted, status: 'available' };
    } catch (e) {
      console.warn('Health Connect permission request failed:', e);
      return { granted: false, status: 'not_supported' };
    }
  }

  /** Opens the Play Store listing for Health Connect (only meaningful when status is 'not_installed'). */
  public async openHealthConnectInstallPage(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await StepTracker.openHealthConnectInstallPage();
    } catch (e) {
      console.warn('Could not open Health Connect install page:', e);
    }
  }

  private checkAndResetDaily() {
    const todayStr = new Date().toDateString();
    const lastDate = safeLocalStorage.getItem('sensor_last_date');

    if (lastDate !== todayStr) {
      this.steps = 0;
      safeLocalStorage.setItem('sensor_steps', '0');
      safeLocalStorage.setItem('sensor_last_date', todayStr);
    } else {
      const parsed = parseInt(safeLocalStorage.getItem('sensor_steps') || '0', 10);
      this.steps = isNaN(parsed) ? 0 : parsed;
    }
  }

  public async requestPermission(): Promise<boolean> {
    // Solução 1, 2, 9: Trigger native Capacitor permission dialogs if available
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.requestPermissions();
      }
    } catch (e) {
      console.warn('Native LocalNotifications permission check notice:', e);
    }

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting DeviceMotion permission:', error);
        return false;
      }
    }
    return true;
  }

  public enableBackgroundKeepAlive() {
    if (this.isKeepAliveActive) return;
    try {
      // Set MediaSession metadata for background state on Android
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Real Life Track Native',
          artist: 'Rastreamento de Passos em Segundo Plano Ativo',
          album: 'Health Tracker'
        });
        navigator.mediaSession.setActionHandler('play', () => {});
        navigator.mediaSession.setActionHandler('pause', () => {});
      }

      // Play silent audio pulse to maintain foreground audio thread if needed
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.keepAliveInterval = setInterval(() => {
          if (this.audioCtx && this.audioCtx.state === 'running') {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            gain.gain.value = 0.0001; // virtually silent
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.1);
          } else if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
        }, 5000);
      }
      this.isKeepAliveActive = true;
    } catch (e) {
      console.warn('Background keep alive initialization warning:', e);
    }
  }

  public disableBackgroundKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.isKeepAliveActive = false;
  }

  public async startListening(onStep: (steps: number) => void) {
    if (this.isListening) return;
    this.onStepCallback = onStep;
    this.isListening = true;

    this.enableBackgroundKeepAlive();

    if (Capacitor.isNativePlatform()) {
      // Belt-and-suspenders with MainActivity's own StepCounterService.start()
      // call — starting an already-running foreground service is a no-op.
      StepTracker.startTracking().catch(e => console.warn('StepTracker.startTracking failed:', e));
      void this.syncFromNativeSources();

      // Health Connect / the native service aren't pushed to us — without this,
      // the count only ever refreshes when the app is backgrounded and resumed,
      // which looks broken if you just sit on a screen watching the number.
      if (!this.nativeSyncInterval) {
        this.nativeSyncInterval = setInterval(() => void this.syncFromNativeSources(), 30000);
      }

      try {
        this.motionListenerHandle = await Motion.addListener('accel', (event) => {
          this.processAcceleration(event.acceleration, event.accelerationIncludingGravity);
        });
        return;
      } catch (err) {
        console.warn('Capacitor Motion failed, falling back to window devicemotion:', err);
      }
    }

    window.addEventListener('devicemotion', this.handleMotion, true);
  }

  public async stopListening() {
    this.isListening = false;
    if (this.nativeSyncInterval) {
      clearInterval(this.nativeSyncInterval);
      this.nativeSyncInterval = null;
    }
    if (this.motionListenerHandle) {
      try {
        await this.motionListenerHandle.remove();
      } catch (e) {
        console.warn('Error removing Motion listener:', e);
      }
      this.motionListenerHandle = null;
    }
    window.removeEventListener('devicemotion', this.handleMotion, true);
    this.disableBackgroundKeepAlive();
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    this.processAcceleration(event.acceleration, event.accelerationIncludingGravity);
  };

  private processAcceleration(acc: { x: number; y: number; z: number } | null | undefined, accGravity: { x: number; y: number; z: number } | null | undefined) {
    let dynamicAcc = 0;

    // 1. Prefer pure acceleration (excluding gravity) if available
    if (acc && (acc.x !== null || acc.y !== null || acc.z !== null)) {
      const ax = acc.x || 0;
      const ay = acc.y || 0;
      const az = acc.z || 0;
      dynamicAcc = Math.sqrt(ax * ax + ay * ay + az * az);
    } else if (accGravity) {
      // 2. Fallback to acceleration including gravity minus 9.81m/s² baseline
      const gx = accGravity.x || 0;
      const gy = accGravity.y || 0;
      const gz = accGravity.z || 0;
      const totalMag = Math.sqrt(gx * gx + gy * gy + gz * gz);
      dynamicAcc = Math.abs(totalMag - 9.81);
    } else {
      return;
    }

    const now = Date.now();

    // Update intensity buffer (0 to 100 scale)
    this.intensityBuffer.push(dynamicAcc);
    if (this.intensityBuffer.length > this.BUFFER_SIZE) {
      this.intensityBuffer.shift();
    }
    const avgDynamicAcc = this.intensityBuffer.reduce((a, b) => a + b, 0) / this.intensityBuffer.length;
    this.intensity = Math.min(100, Math.max(0, avgDynamicAcc * 20));

    this.checkAndResetDaily();

    // Step counting logic: Peak detection algorithm
    // Requires a dynamic acceleration peak >= 2.8 m/s² on a rising edge
    const STEP_THRESHOLD = 2.8;
    const HYSTERESIS_RESET = 1.4;

    if (dynamicAcc < HYSTERESIS_RESET) {
      this.wasBelowThreshold = true;
    }

    if (this.wasBelowThreshold && dynamicAcc >= STEP_THRESHOLD && (now - this.lastStepTime) > this.minStepInterval) {
      this.wasBelowThreshold = false;
      this.steps++;
      this.lastStepTime = now;
      safeLocalStorage.setItem('sensor_steps', this.steps.toString());

      // Broadcast step count to Service Worker for background persistence
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'STEP_UPDATE',
          steps: this.steps,
          timestamp: now
        });
      }

      if (this.onStepCallback) {
        this.onStepCallback(this.steps);
      }
    }
  }

  public setSteps(count: number) {
    this.steps = Math.max(0, count);
    safeLocalStorage.setItem('sensor_steps', this.steps.toString());
    if (this.onStepCallback) {
      this.onStepCallback(this.steps);
    }
  }

  public adjustSteps(delta: number) {
    this.steps = Math.max(0, this.steps + delta);
    safeLocalStorage.setItem('sensor_steps', this.steps.toString());
    if (this.onStepCallback) {
      this.onStepCallback(this.steps);
    }
  }

  public getSteps(): number {
    this.checkAndResetDaily();
    return this.steps;
  }

  public getIntensity(): number {
    return this.intensity;
  }

  public resetSteps() {
    this.steps = 0;
    safeLocalStorage.setItem('sensor_steps', '0');
  }
}

export const sensorService = new SensorService();
