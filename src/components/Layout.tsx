import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, History, Utensils, FitnessCenter } from './Icons';
import { Brain, ChevronDown, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';
import DiagnosticModal from './DiagnosticModal';
import { useHealth } from '../context/HealthContext';
import { APP_BUILD_VERSION, fetchLiveDiagnostics, useRegisterComponentRuntime } from '../lib/version';

const RTL_LANGUAGES = ['ar-SA'];

export default function Layout() {
  useRegisterComponentRuntime('Layout');
  const navigate = useNavigate();
  const { appLanguage, t } = useHealth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  useEffect(() => {
    // Startup check
    fetchLiveDiagnostics().then((diag) => {
      console.log(`[RLT AUTO-DIAGNOSTIC] Build: ${diag.buildVersion} | SW: ${diag.swStatus} | Cache: ${diag.cacheCount} entries`);
    });
  }, []);

  const isRTL = RTL_LANGUAGES.includes(appLanguage);

  const goTo = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <div
      className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col max-w-md mx-auto border-x border-slate-200 dark:border-slate-800 relative"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Real Life Track é o botão fixo do topo: abre o menu com as telas que
          saíram da barra inferior (Médico, Nutrição, Exercícios). A barra de
          baixo fica só com Início e Cérebro — as duas coisas que se consultam
          o tempo todo; o resto é mais esporádico e mora aqui. */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <button
          onClick={() => setIsMenuOpen(prev => !prev)}
          aria-expanded={isMenuOpen}
          aria-controls="app-menu-panel"
          className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
        >
          <div className="size-8 rounded-xl bg-gradient-to-tr from-accent to-accent flex items-center justify-center text-accent-ink shadow-md shrink-0">
            <Brain className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
              Real Life Track
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {t('nav.medical')} · {t('nav.nutrition')} · {t('nav.exercises')}
            </p>
          </div>
          <ChevronDown className={cn("size-4 text-slate-400 shrink-0 transition-transform", isMenuOpen && "rotate-180")} />
        </button>

        <div
          id="app-menu-panel"
          className={cn(
            "overflow-hidden transition-[max-height] duration-200 ease-out border-t border-slate-100 dark:border-slate-800",
            isMenuOpen ? "max-h-64" : "max-h-0 border-t-0"
          )}
        >
          <div className="grid grid-cols-3 gap-2.5 px-4 pt-3 pb-1">
            <MenuItem icon={<History />} label={t('nav.medical')} onClick={() => goTo('/medical')} />
            <MenuItem icon={<Utensils />} label={t('nav.nutrition')} onClick={() => goTo('/nutrition')} />
            <MenuItem icon={<FitnessCenter />} label={t('nav.exercises')} onClick={() => goTo('/exercises')} />
          </div>
          <button
            onClick={() => { setIsMenuOpen(false); setIsDiagnosticOpen(true); }}
            className="w-full flex items-center gap-1.5 px-4 py-3 text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 hover:text-accent transition-colors"
          >
            <Cpu className="size-3.5" />
            <span>Build: {APP_BUILD_VERSION}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Barra de Navegação Inferior — só o essencial: olhar rápido + IA */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-6 pb-5 pt-2 flex justify-center items-end gap-10 z-50">
        <NavItem to="/" icon={<Home />} label={t('nav.home')} />

        <NavLink
          to="/ai"
          className="flex flex-col items-center gap-1 -mt-4"
        >
          {({ isActive }) => (
            <>
              <span className={cn(
                "size-[52px] rounded-full flex items-center justify-center shadow-lg shadow-accent/25 transition-transform",
                isActive ? "bg-accent scale-105" : "bg-accent"
              )}>
                <Brain className="size-6 text-accent-ink" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">
                {t('nav.brain')}
              </span>
            </>
          )}
        </NavLink>
      </nav>

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
          "flex flex-col items-center gap-1 transition-colors w-16",
          isActive ? "text-accent font-bold" : "text-slate-400 dark:text-slate-500"
        )
      }
    >
      <span className="[&>svg]:size-6">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </NavLink>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-accent-soft dark:hover:bg-accent-soft border border-slate-100 dark:border-slate-800 hover:border-accent/40 transition-colors group"
    >
      <span className="text-accent [&>svg]:size-5">{icon}</span>
      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}</span>
    </button>
  );
}
