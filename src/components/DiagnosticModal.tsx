import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Activity, CheckCircle, Cpu, Server, Database, X, AlertTriangle, Layers } from 'lucide-react';
import { APP_BUILD_VERSION, fetchLiveDiagnostics, forcePurgeAndReload, LiveDiagnosticStatus } from '../lib/version';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DiagnosticModal({ isOpen, onClose }: DiagnosticModalProps) {
  const [status, setStatus] = useState<LiveDiagnosticStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const liveData = await fetchLiveDiagnostics();
      setStatus(liveData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForceReload = async () => {
    setIsPurging(true);
    await forcePurgeAndReload();
  };

  const registeredComponentKeys = status ? Object.keys(status.components) : [];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Diagnóstico do Ambiente em Tempo Real
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Monitoramento Dinâmico de Runtime, Servidor & Cache
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Inconsistency Alert Banner */}
        {status?.inconsistencyDetected && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                INCONSISTÊNCIA DETECTADA
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                {status.inconsistencyReason}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatusCard 
            label="Build Version" 
            value={status?.buildVersion || APP_BUILD_VERSION} 
            badge={status?.serverVersion === status?.buildVersion ? "Sincronizado" : "Verificando"} 
            icon={<ShieldCheck className="size-4 text-indigo-500" />} 
          />
          <StatusCard 
            label="Servidor Express" 
            value={status?.serverStatus || "Buscando..."} 
            badge={status?.serverStatus === 'OK' ? `Uptime: ${status.serverUptime}s` : "Erro"} 
            icon={<Server className="size-4 text-emerald-500" />} 
          />
          <StatusCard 
            label="Cache Storage" 
            value={`${status?.cacheCount ?? 0} entrada(s)`} 
            badge={status?.cacheCount === 0 ? "LIMPO" : "RETIDO"} 
            icon={<Database className="size-4 text-blue-500" />} 
          />
          <StatusCard 
            label="Service Worker" 
            value={status?.swStatus || "DESATIVADO"} 
            badge={status?.swRegistrationCount === 0 ? "DESATIVADO" : "ATIVO"} 
            icon={<Activity className="size-4 text-amber-500" />} 
          />
        </div>

        {/* Dynamic Component Registry List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="size-4 text-indigo-500" />
              Componentes Registrados em Runtime
            </span>
            <span className="text-[10px] text-slate-400">
              ({registeredComponentKeys.length} carregados)
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 max-h-36 overflow-y-auto">
            {registeredComponentKeys.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">
                Nenhum componente registrado ainda nesta sessão.
              </p>
            ) : (
              registeredComponentKeys.map((compName) => {
                const comp = status?.components[compName];
                return (
                  <div key={compName} className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-3.5 text-emerald-500" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{compName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>v{comp?.version}</span>
                      <span>•</span>
                      <span>{comp?.mountedAt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Server & Build Runtime Details */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Hora do Build:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{status?.buildTime || 'Calculando...'}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Servidor (/api/health):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Porta {status?.serverPort || 3000} | Version: {status?.serverVersion}
            </span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Última Checagem:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{status?.lastCheckedAt || '--:--:--'}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={runDiagnostics}
            disabled={isLoading || isPurging}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Executando Diagnóstico...' : 'Executar Diagnóstico (Recalcular)'}</span>
          </button>

          <button
            onClick={handleForceReload}
            disabled={isPurging}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isPurging ? 'animate-spin' : ''}`} />
            <span>{isPurging ? 'Purgando & Recarregando...' : 'Atualizar Aplicação (Limpar Cache & Recarregar)'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

function StatusCard({ label, value, badge, icon }: { label: string; value: string; badge: string; icon: React.ReactNode }) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span className="truncate">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{value}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
          {badge}
        </span>
      </div>
    </div>
  );
}
