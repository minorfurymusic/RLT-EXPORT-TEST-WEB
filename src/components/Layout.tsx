import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, History, Utensils, FitnessCenter } from './Icons';
import { Brain, Share2, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';
import ShareModal from './ShareModal';
import DiagnosticModal from './DiagnosticModal';
import { useHealth } from '../context/HealthContext';
import { APP_BUILD_VERSION, fetchLiveDiagnostics, useRegisterComponentRuntime } from '../lib/version';

const RTL_LANGUAGES = ['ar-SA'];

export default function Layout() {
  useRegisterComponentRuntime('Layout');
  const { appLanguage, t } = useHealth();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  useEffect(() => {
    // Startup check
    fetchLiveDiagnostics().then((diag) => {
      console.log(`[RLT AUTO-DIAGNOSTIC] Build: ${diag.buildVersion} | SW: ${diag.swStatus} | Cache: ${diag.cacheCount} entries`);
    });
  }, []);

  const isRTL = RTL_LANGUAGES.includes(appLanguage);

  return (
    <div 
      className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col max-w-md mx-auto border-x border-slate-200 dark:border-slate-800 relative"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top Bar with Brand, Version Badge and Diagnostic Trigger */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Brain className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
              Real Life Track
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={() => setIsDiagnosticOpen(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/60 dark:border-indigo-800/60 text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-colors"
                title="Abrir Diagnóstico do Ambiente"
              >
                <Cpu className="size-3" />
                <span>Build: {APP_BUILD_VERSION}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Barra de Navegação Inferior - 6 botões principais */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 pb-5 pt-2 flex justify-between items-center z-50">
        <NavItem to="/" icon={<Home />} label={t('nav.home')} />
        <NavItem to="/medical" icon={<History />} label={t('nav.medical')} />
        
        {/* CÉREBRO IA na barra inferior */}
        <NavLink
          to="/ai"
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 transition-colors",
              isActive ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"
            )
          }
        >
          <Brain className="size-6 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-tight text-indigo-600 dark:text-indigo-400">🧠 Cérebro</span>
        </NavLink>

        <NavItem to="/nutrition" icon={<Utensils />} label={t('nav.nutrition')} />
        <NavItem to="/exercises" icon={<FitnessCenter />} label={t('nav.exercises')} />

        {/* 6º Botão Principal: Compartilhar */}
        <button
          id="btn-nav-share"
          onClick={() => setIsShareOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          title="Compartilhar Progresso"
        >
          <Share2 className="size-6" />
          <span className="text-[10px] font-bold uppercase tracking-tight">Compartilhar</span>
        </button>
      </nav>

      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
      <DiagnosticModal isOpen={isDiagnosticOpen} onClose={() => setIsDiagnosticOpen(false)} />
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center gap-1 transition-colors",
          isActive ? "text-primary font-bold" : "text-slate-400 dark:text-slate-500"
        )
      }
    >
      <span className="[&>svg]:size-6">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </NavLink>
  );
}
