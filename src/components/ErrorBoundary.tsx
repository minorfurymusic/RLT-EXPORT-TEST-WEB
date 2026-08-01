import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

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

/**
 * A real React error boundary (class component, getDerivedStateFromError /
 * componentDidCatch) — this is the only mechanism React has for catching
 * errors thrown during rendering. Without it, an uncaught render error
 * unmounts the entire app (no fallback UI, just a blank white screen).
 * Also listens globally for uncaught errors and unhandled promise
 * rejections, which happen *outside* React's render cycle and a render
 * error boundary never sees on its own.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Captured React Render Error in Boundary:', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }

  handleGlobalError = (event: ErrorEvent) => {
    const msg = event.message || event.error?.message || '';
    if (isIgnoredError(msg)) return;
    console.error('Captured Global Error in Boundary:', event.error);
    this.setState({ hasError: true, error: event.error || new Error(event.message || 'Erro de execução imprevisto') });
  };

  handleRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (isIgnoredError(reason)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    console.error('Captured Promise Rejection in Boundary:', event.reason);
    this.setState({ hasError: true, error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)) });
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
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

            {this.state.error && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left overflow-auto max-h-36 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="size-4" />
                Recarregar Aplicação
              </button>

              <button
                onClick={this.handleResetStorage}
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

    return this.props.children;
  }
}
