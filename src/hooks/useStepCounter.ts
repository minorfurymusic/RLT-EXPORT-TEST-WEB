import { useState, useEffect, useCallback, useRef } from 'react';

interface StepData {
  steps: number;
  lastUpdated: string;
  isTracking: boolean;
  hasSensorSupport: boolean;
  startTime: string | null;
}

interface StepCounterConfig {
  sensitivity?: number; // 1-10, higher = more sensitive
  sampleRate?: number; // ms between samples
  minStepInterval?: number; // minimum ms between steps
  onStep?: (totalSteps: number) => void;
}

const STORAGE_KEY = 'rlt_step_data';
const MIDNIGHT_RESET_KEY = 'rlt_last_reset_date';

const defaultConfig: StepCounterConfig = {
  sensitivity: 5,
  sampleRate: 50,
  minStepInterval: 250, // ~240 steps per minute max
};

export function useStepCounter(config: StepCounterConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config };
  
  const [stepData, setStepData] = useState<StepData>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if it's a new day and reset
      const today = new Date().toDateString();
      const lastReset = localStorage.getItem(MIDNIGHT_RESET_KEY);
      if (lastReset !== today) {
        // New day - keep the counter but reset for the new day
        localStorage.setItem(MIDNIGHT_RESET_KEY, today);
        const yesterdaySteps = parsed.yesterdaySteps || 0;
        return {
          ...parsed,
          steps: 0, // Reset for new day
          lastUpdated: new Date().toISOString(),
          yesterdaySteps,
        };
      }
      return parsed;
    }
    return {
      steps: 0,
      lastUpdated: new Date().toISOString(),
      isTracking: false,
      hasSensorSupport: false,
      startTime: null,
    };
  });

  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for step detection algorithm
  const lastStepTime = useRef<number>(0);
  const accelerationHistory = useRef<number[]>([]);
  const lastMagnitude = useRef<number>(0);
  const isFirstReading = useRef<boolean>(true);
  
  // Calculate dynamic threshold based on sensitivity (1-10)
  const threshold = 1.2 + (10 - mergedConfig.sensitivity!) * 0.3; // 1.2 to 3.5

  // Save to localStorage whenever stepData changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stepData));
  }, [stepData]);

  // Check sensor availability
  useEffect(() => {
    const checkAvailability = () => {
      if (typeof DeviceMotionEvent !== 'undefined') {
        // Check for iOS 13+ permission
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          setIsAvailable(true);
        } else if ('ontouchstart' in window) {
          // Mobile browser without permission API
          setIsAvailable(true);
        } else {
          // Desktop - show but with warning
          setIsAvailable(true);
        }
      } else {
        setIsAvailable(false);
        setError('DeviceMotion API não disponível neste dispositivo');
      }
    };
    
    checkAvailability();
  }, []);

  // Request permission (iOS 13+)
  const requestPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        return permission === 'granted';
      } catch (err) {
        setError('Permissão negada para usar sensores de movimento');
        return false;
      }
    }
    return true; // Non-iOS devices don't need permission
  }, []);

  // Process accelerometer data to detect steps
  const processAccelerometerData = useCallback((event: DeviceMotionEvent) => {
    const { x, y, z } = event.accelerationIncludingGravity || event.acceleration || {};
    
    if (x === null || y === null || z === null) return;

    // Calculate magnitude of acceleration
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    // Keep history for smoothing
    accelerationHistory.current.push(magnitude);
    if (accelerationHistory.current.length > 10) {
      accelerationHistory.current.shift();
    }
    
    // Apply simple smoothing
    const smoothedMagnitude = accelerationHistory.current.reduce((a, b) => a + b, 0) / 
                              accelerationHistory.current.length;

    const now = Date.now();
    const timeSinceLastStep = now - lastStepTime.current;

    // Step detection algorithm
    // Detect when magnitude crosses threshold going up (peak detection)
    if (!isFirstReading.current) {
      const delta = smoothedMagnitude - lastMagnitude.current;
      
      // Check for step: 
      // 1. There's a significant change
      // 2. It's been long enough since last step
      // 3. The magnitude is in a reasonable range (filter out noise)
      if (delta > threshold && 
          timeSinceLastStep > mergedConfig.minStepInterval! &&
          smoothedMagnitude > 9 && smoothedMagnitude < 12) { // Earth gravity ~9.8-10
        
        lastStepTime.current = now;
        
        setStepData(prev => {
          const newSteps = prev.steps + 1;
          if (mergedConfig.onStep) {
            mergedConfig.onStep(newSteps);
          }
          return {
            ...prev,
            steps: newSteps,
            lastUpdated: new Date().toISOString(),
          };
        });
      }
    }

    lastMagnitude.current = smoothedMagnitude;
    isFirstReading.current = false;
  }, [mergedConfig, threshold]);

  // Start tracking
  const startTracking = useCallback(async () => {
    // Request permission if needed
    const hasPermission = await requestPermission();
    if (!hasPermission) return false;

    setStepData(prev => ({
      ...prev,
      isTracking: true,
      startTime: prev.startTime || new Date().toISOString(),
    }));

    window.addEventListener('devicemotion', processAccelerometerData as EventListener);
    setError(null);
    return true;
  }, [requestPermission, processAccelerometerData]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    window.removeEventListener('devicemotion', processAccelerometerData as EventListener);
    setStepData(prev => ({
      ...prev,
      isTracking: false,
    }));
  }, [processAccelerometerData]);

  // Reset steps for today
  const resetSteps = useCallback(() => {
    setStepData(prev => ({
      ...prev,
      steps: 0,
      lastUpdated: new Date().toISOString(),
      startTime: new Date().toISOString(),
    }));
    lastStepTime.current = 0;
    accelerationHistory.current = [];
    isFirstReading.current = true;
  }, []);

  // Manually add steps
  const addSteps = useCallback((count: number) => {
    setStepData(prev => ({
      ...prev,
      steps: prev.steps + count,
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  // Simulate steps (for testing on desktop/unsupported devices)
  const simulateSteps = useCallback((count: number = 1) => {
    setStepData(prev => {
      const newSteps = prev.steps + count;
      if (mergedConfig.onStep) {
        mergedConfig.onStep(newSteps);
      }
      return {
        ...prev,
        steps: newSteps,
        lastUpdated: new Date().toISOString(),
      };
    });
  }, [mergedConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', processAccelerometerData as EventListener);
    };
  }, [processAccelerometerData]);

  return {
    steps: stepData.steps,
    isTracking: stepData.isTracking,
    hasSensorSupport: isAvailable,
    error,
    startTracking,
    stopTracking,
    resetSteps,
    addSteps,
    simulateSteps,
    requestPermission,
  };
}

export default useStepCounter;
