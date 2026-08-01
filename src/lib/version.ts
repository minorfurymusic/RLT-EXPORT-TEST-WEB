import { useEffect } from 'react';

export const APP_BUILD_VERSION = "2026.07.27.0315";
export const APP_BUILD_TIME = "2026-07-27 03:15:00";

export interface ComponentRuntimeRecord {
  name: string;
  version: string;
  mountedAt: string;
  status: 'OK' | 'ERRO';
}

export interface ServerHealthResponse {
  status: string;
  version: string;
  uptime: number;
  port: number;
  timestamp: string;
}

export interface LiveDiagnosticStatus {
  buildVersion: string;
  buildTime: string;
  serverVersion: string;
  serverUptime: number;
  serverPort: number;
  serverStatus: 'OK' | 'INDISPONÍVEL';
  components: Record<string, ComponentRuntimeRecord>;
  cacheCount: number;
  cacheNames: string[];
  swStatus: 'DESATIVADO' | 'ATIVO' | 'LIMPANDO';
  swRegistrationCount: number;
  inconsistencyDetected: boolean;
  inconsistencyReason?: string;
  lastCheckedAt: string;
}

declare global {
  interface Window {
    __APP_BUILD_VERSION__?: string;
    __APP_BUILD_TIME__?: string;
    __RLT_RUNTIME__?: {
      buildVersion: string;
      buildTime: string;
      registeredComponents: Record<string, ComponentRuntimeRecord>;
    };
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  if (!window.__RLT_RUNTIME__) {
    window.__RLT_RUNTIME__ = {
      buildVersion: APP_BUILD_VERSION,
      buildTime: APP_BUILD_TIME,
      registeredComponents: {}
    };
  }
  window.__APP_BUILD_VERSION__ = APP_BUILD_VERSION;
  window.__APP_BUILD_TIME__ = APP_BUILD_TIME;
  
  console.log(
    `%c[RLT DIAGNÓSTICO ATIVO]%c Build: ${APP_BUILD_VERSION} | Time: ${APP_BUILD_TIME} | Mode: REAL-TIME MONITORING`,
    'background: #4f46e5; color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 4px;',
    'color: #6366f1; font-weight: bold;'
  );
}

// Register component in global runtime
export function registerComponentRuntime(name: string, status: 'OK' | 'ERRO' = 'OK') {
  if (typeof window !== 'undefined') {
    if (!window.__RLT_RUNTIME__) {
      window.__RLT_RUNTIME__ = {
        buildVersion: APP_BUILD_VERSION,
        buildTime: APP_BUILD_TIME,
        registeredComponents: {}
      };
    }
    const record: ComponentRuntimeRecord = {
      name,
      version: APP_BUILD_VERSION,
      mountedAt: new Date().toLocaleTimeString('pt-BR'),
      status
    };
    window.__RLT_RUNTIME__.registeredComponents[name] = record;
    console.log(`[RLT RUNTIME REGISTRY] Mounted: ${name} | Version: ${APP_BUILD_VERSION} | Status: ${status}`);
  }
}

// Hook to automatically register component mounting
export function useRegisterComponentRuntime(name: string) {
  useEffect(() => {
    registerComponentRuntime(name, 'OK');
  }, [name]);
}

// Perform live runtime diagnostics dynamically
export async function fetchLiveDiagnostics(): Promise<LiveDiagnosticStatus> {
  let serverVersion = "DESCONHECIDO";
  let serverUptime = 0;
  let serverPort = 3000;
  let serverStatus: 'OK' | 'INDISPONÍVEL' = 'INDISPONÍVEL';

  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data: ServerHealthResponse = await res.json();
      serverVersion = data.version || "0.0.0";
      serverUptime = data.uptime || 0;
      serverPort = data.port || 3000;
      serverStatus = data.status === 'ok' ? 'OK' : 'INDISPONÍVEL';
    }
  } catch (err) {
    console.warn('[RLT DIAGNÓSTICO] Falha ao consultar endpoint de servidor /api/health:', err);
  }

  // SW Status
  let swStatus: 'DESATIVADO' | 'ATIVO' | 'LIMPANDO' = 'DESATIVADO';
  let swRegistrationCount = 0;
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      swRegistrationCount = regs.length;
      if (regs.length > 0) {
        swStatus = 'ATIVO';
      }
    } catch (e) {
      console.warn('SW Check error:', e);
    }
  }

  // Cache Storage
  let cacheCount = 0;
  let cacheNames: string[] = [];
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      cacheNames = await caches.keys();
      cacheCount = cacheNames.length;
    } catch (e) {
      console.warn('Cache Check error:', e);
    }
  }

  // Registered Components
  const registeredComponents = window.__RLT_RUNTIME__?.registeredComponents || {};

  // Check Inconsistencies
  let inconsistencyDetected = false;
  let inconsistencyReason: string | undefined = undefined;

  if (serverStatus === 'OK' && serverVersion !== APP_BUILD_VERSION) {
    inconsistencyDetected = true;
    inconsistencyReason = `Divergência de Versão: Servidor (${serverVersion}) ≠ Build (${APP_BUILD_VERSION})`;
  } else if (swRegistrationCount > 0) {
    inconsistencyDetected = true;
    inconsistencyReason = `Service Worker Ativo Detectado (${swRegistrationCount} registro(s)). Pode reter cache antigo.`;
  } else if (cacheCount > 0) {
    inconsistencyDetected = true;
    inconsistencyReason = `Cache Storage Ativo Detectado (${cacheCount} entrada(s)).`;
  }

  const liveStatus: LiveDiagnosticStatus = {
    buildVersion: APP_BUILD_VERSION,
    buildTime: APP_BUILD_TIME,
    serverVersion,
    serverUptime,
    serverPort,
    serverStatus,
    components: registeredComponents,
    cacheCount,
    cacheNames,
    swStatus,
    swRegistrationCount,
    inconsistencyDetected,
    inconsistencyReason,
    lastCheckedAt: new Date().toLocaleTimeString('pt-BR')
  };

  console.log('[RLT DIAGNÓSTICO RESULTADO EM TEMPO DE EXECUÇÃO]:', liveStatus);

  return liveStatus;
}

// Purge SW & Caches & Force Reload
export async function forcePurgeAndReload(): Promise<void> {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }
  }

  sessionStorage.clear();
  window.location.reload();
}
