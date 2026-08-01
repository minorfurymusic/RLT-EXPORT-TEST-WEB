import { safeLocalStorage } from './utils';

export type ErrorType = 'runtime' | 'api' | 'ai' | 'custom' | 'unhandledrejection';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  type: ErrorType;
  message: string;
  stack?: string;
  module?: string;
  url?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'vitalsync_error_logs';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days retention

/**
 * Automatically purges error records older than 30 days.
 */
export function purgeOldLogs(): void {
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const logs: ErrorLogEntry[] = JSON.parse(raw);
    if (!Array.isArray(logs)) return;

    const now = Date.now();
    const freshLogs = logs.filter(log => {
      const time = new Date(log.timestamp).getTime();
      return !isNaN(time) && (now - time) <= MAX_AGE_MS;
    });

    if (freshLogs.length !== logs.length) {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(freshLogs));
    }
  } catch (err) {
    console.error('Failed to purge old logs:', err);
  }
}

/**
 * Gets all stored error logs.
 */
export function getErrorLogs(): ErrorLogEntry[] {
  try {
    purgeOldLogs();
    return safeLocalStorage.getParsed<ErrorLogEntry[]>(STORAGE_KEY, []);
  } catch {
    return [];
  }
}

/**
 * Save a new error log entry.
 */
export function logError(entry: {
  type?: ErrorType;
  message: string;
  stack?: string;
  module?: string;
  metadata?: Record<string, unknown>;
}): ErrorLogEntry {
  const newLog: ErrorLogEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    type: entry.type || 'custom',
    message: entry.message || 'Unknown Error',
    stack: entry.stack,
    module: entry.module || 'app',
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    metadata: entry.metadata,
  };

  try {
    const logs = getErrorLogs();
    logs.unshift(newLog);
    const capped = logs.slice(0, 200);
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch (e) {
    console.error('Failed to write error log to localStorage:', e);
  }

  return newLog;
}

/**
 * Clears all error logs.
 */
export function clearErrorLogs(): void {
  try {
    safeLocalStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear error logs:', e);
  }
}


/**
 * Generates and triggers download of a detailed diagnostic JSON report.
 */
export function exportErrorReport(): void {
  const logs = getErrorLogs();
  const report = {
    app: 'VitalSync',
    generatedAt: new Date().toISOString(),
    retentionDays: 30,
    totalLogsCount: logs.length,
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'Unknown',
    },
    logs,
  };

  const jsonStr = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const nowStr = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `vitalsync_diagnostic_logs_${nowStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Initializes global error event listeners (uncaught exceptions and unhandled promise rejections).
 */
export function initGlobalErrorLogger(): void {
  if (typeof window === 'undefined') return;

  purgeOldLogs();

  window.addEventListener('error', (event: ErrorEvent) => {
    logError({
      type: 'runtime',
      message: event.message || 'Unhandled Error',
      stack: event.error?.stack,
      module: event.filename ? `${event.filename.split('/').pop()}:${event.lineno}:${event.colno}` : 'global',
    });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = typeof reason === 'object' && reason?.message ? reason.message : String(reason || 'Unhandled Promise Rejection');
    const stack = typeof reason === 'object' && reason?.stack ? reason.stack : undefined;
    
    logError({
      type: 'unhandledrejection',
      message,
      stack,
      module: 'Promise',
    });
  });
}
