import React, { useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

export function ErrorBoundary({ children }: Props) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const isIgnoredError = (reasonStr: string): boolean => {
      const lower = (reasonStr || '').toLowerCase();
      return (
        lower.includes('websocket') ||
        lower.includes('vite') ||
        lower.includes('resizeobserver') ||
        lower.includes('networkerror') ||
        lower.includes('load failed') ||
        lower.includes('failed to fetch')
      );
    };

    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || event.error?.message || '';
      if (isIgnoredError(msg)) return;
      console.error('Captured Global Error in Boundary:', event.error);
      setError(event.error || new Error(event.message || 'Erro de execução imprevisto'));
      setHasError(true);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason || '');
      if (isIgnoredError(reason)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      console.error('Captured Promise Rejection in Boundary:', event.reason);
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
      setHasError(true);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const handleReload = () => {
    setHasError(false);
    setError(null);
    window.location.reload();
  };

  const handleResetStorage = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    setHasError(false);
    setError(null);
    window.location.reload();
  };

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="size-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="size-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Recuperação de Interface RLT
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              O sistema detectou uma exceção na renderização e ativou a recuperação automática.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left overflow-auto max-h-36 text-[11px] font-mono text-slate-700 dark:text-slate-300">
              {error.toString()}
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleReload}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="size-4" />
              Recarregar Aplicação
            </button>
            
            <button
              onClick={handleResetStorage}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Limpar Cache Local e Reiniciar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


