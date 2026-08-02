import { useEffect, useCallback, useRef, useState } from 'react';

interface StepServiceWorkerData {
  steps: number;
  startTime: string | null;
  lastSync: string | null;
  dailyGoal: number;
  history: { date: string; steps: number }[];
}

interface UseStepServiceWorkerOptions {
  onStepsUpdated?: (data: StepServiceWorkerData) => void;
  onStepsReset?: (data: StepServiceWorkerData) => void;
}

export function useStepServiceWorker(options: UseStepServiceWorkerOptions = {}) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const swRef = useRef<ServiceWorker | null>(null);

  // Check if Service Workers are supported
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setError('Service Workers não são suportados neste navegador');
    }
  }, []);

  // Register the Service Worker
  const register = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.register('/step-counter-sw.js', {
        scope: '/',
      });

      console.log('[App] Service Worker registered:', registration.scope);
      swRef.current = registration.active;
      setIsRegistered(true);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[App] New Service Worker available');
              // Could prompt user to refresh
            }
          });
        }
      });

      // Handle controller change (when SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] Service Worker controller changed');
        if (navigator.serviceWorker.controller) {
          swRef.current = navigator.serviceWorker.controller;
        }
      });

      return true;
    } catch (err) {
      console.error('[App] Service Worker registration failed:', err);
      setError('Falha ao registrar Service Worker');
      return false;
    }
  }, [isSupported]);

  // Initialize on mount
  useEffect(() => {
    if (isSupported) {
      register();
    }
  }, [isSupported, register]);

  // Listen for messages from the Service Worker
  useEffect(() => {
    if (!isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'STEPS_UPDATED':
          console.log('[App] Steps updated from SW:', data);
          options.onStepsUpdated?.(data);
          break;
        case 'STEPS_RESET':
          console.log('[App] Steps reset from SW:', data);
          options.onStepsReset?.(data);
          break;
        case 'DATA_RESPONSE':
          console.log('[App] Data response from SW:', data);
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [isSupported, options]);

  // Send message to Service Worker
  const sendMessage = useCallback((type: string, data?: any) => {
    return new Promise<void>((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        // If no controller, try to register first
        register().then(() => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type, data });
            resolve();
          } else {
            reject(new Error('Service Worker not available'));
          }
        });
        return;
      }

      // Create a one-time message handler
      const handler = (event: MessageEvent) => {
        if (event.data.type === `${type}_RESPONSE` || 
            event.data.type === 'STEPS_UPDATED' || 
            event.data.type === 'STEPS_RESET') {
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve();
        }
      };

      navigator.serviceWorker.addEventListener('message', handler);

      // Send the message
      navigator.serviceWorker.controller.postMessage({ type, data });

      // Timeout after 5 seconds
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(); // Resolve anyway to not block the app
      }, 5000);
    });
  }, [register]);

  // Request Background Sync (if supported)
  const requestBackgroundSync = useCallback(async () => {
    if (!('sync' in ServiceWorkerRegistration.prototype)) {
      console.log('[App] Background Sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-steps');
      console.log('[App] Background Sync registered');
      return true;
    } catch (err) {
      console.error('[App] Background Sync registration failed:', err);
      return false;
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setError('Notificações não são suportadas');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  // Show local notification
  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (Notification.permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...({ vibrate: [200, 100, 200] } as NotificationOptions),
        ...options,
      });
      return true;
    } catch (err) {
      console.error('[App] Failed to show notification:', err);
      return false;
    }
  }, [requestNotificationPermission]);

  // Get data from Service Worker
  const getData = useCallback(async (): Promise<StepServiceWorkerData | null> => {
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'DATA_RESPONSE') {
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(event.data.data);
        }
      };

      navigator.serviceWorker.addEventListener('message', handler);
      sendMessage('GET_DATA');

      // Timeout
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(null);
      }, 3000);
    });
  }, [sendMessage]);

  // Update steps
  const updateSteps = useCallback((steps: number) => {
    sendMessage('UPDATE_STEPS', { steps });
    
    // Also try to trigger background sync
    if ('sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        (registration as any).sync.register('sync-steps').catch(() => {
          // Ignore sync registration errors
        });
      });
    }
  }, [sendMessage]);

  // Reset steps
  const resetSteps = useCallback(() => {
    sendMessage('RESET_STEPS');
  }, [sendMessage]);

  // Set goal
  const setGoal = useCallback((goal: number) => {
    sendMessage('SET_GOAL', { goal });
  }, [sendMessage]);

  // Start tracking
  const startTracking = useCallback(() => {
    sendMessage('START_TRACKING');
    requestNotificationPermission();
  }, [sendMessage, requestNotificationPermission]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    sendMessage('STOP_TRACKING');
  }, [sendMessage]);

  return {
    isRegistered,
    isSupported,
    error,
    register,
    getData,
    updateSteps,
    resetSteps,
    setGoal,
    startTracking,
    stopTracking,
    requestBackgroundSync,
    showNotification,
    requestNotificationPermission,
  };
}

export default useStepServiceWorker;
