
import { Motion } from '@capacitor/motion';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Live motion-intensity gauge used while a workout (walking/running/cycling)
 * is being actively tracked in Exercises.tsx — unrelated to daily step
 * counting, which has been removed from this app.
 */
class SensorService {
  private isListening: boolean = false;
  private motionListenerHandle: any = null;

  private intensity: number = 0;
  private intensityBuffer: number[] = [];
  private readonly BUFFER_SIZE = 10;

  private audioCtx: AudioContext | null = null;
  private keepAliveInterval: any = null;
  private isKeepAliveActive: boolean = false;

  public async requestPermission(): Promise<boolean> {
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
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Real Life Track Native',
          artist: 'Rastreamento de Atividade em Segundo Plano Ativo',
          album: 'Health Tracker'
        });
        navigator.mediaSession.setActionHandler('play', () => {});
        navigator.mediaSession.setActionHandler('pause', () => {});
      }

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

  public async startListening() {
    if (this.isListening) return;
    this.isListening = true;

    this.enableBackgroundKeepAlive();

    if (Capacitor.isNativePlatform()) {
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

    // Update intensity buffer (0 to 100 scale)
    this.intensityBuffer.push(dynamicAcc);
    if (this.intensityBuffer.length > this.BUFFER_SIZE) {
      this.intensityBuffer.shift();
    }
    const avgDynamicAcc = this.intensityBuffer.reduce((a, b) => a + b, 0) / this.intensityBuffer.length;
    this.intensity = Math.min(100, Math.max(0, avgDynamicAcc * 20));
  }

  public getIntensity(): number {
    return this.intensity;
  }
}

export const sensorService = new SensorService();
