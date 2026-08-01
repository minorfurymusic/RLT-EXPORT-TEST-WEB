import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalErrorLogger } from './lib/logger';
import { ErrorBoundary } from './components/ErrorBoundary';

// Initialize global error interceptors and 30-day log purge
initGlobalErrorLogger();

// Register Service Worker for PWA, Periodic Sync and Background Sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered successfully:', registration);

      // Register Periodic Background Sync if supported
      if ('periodicSync' in registration) {
        try {
          const status = await (navigator as any).permissions?.query({ name: 'periodic-background-sync' });
          if (status?.state === 'granted') {
            await (registration as any).periodicSync.register('step-sync-task', {
              minInterval: 12 * 60 * 60 * 1000, // 12 hours
            });
            console.log('Periodic sync registered: step-sync-task');
          }
        } catch (e) {
          console.warn('Periodic sync registration info:', e);
        }
      }

      // Register Background Sync if supported
      if ('sync' in registration) {
        try {
          await (registration as any).sync.register('sync-health-logs');
          console.log('Background sync registered: sync-health-logs');
        } catch (e) {
          console.warn('Background sync registration info:', e);
        }
      }
    } catch (registrationError) {
      console.log('SW registration error:', registrationError);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


