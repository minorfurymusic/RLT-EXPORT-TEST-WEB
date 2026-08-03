import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, Palette, Brain } from 'lucide-react';
import { useHealth } from '../context/HealthContext';
import { ArrowLeft } from './Icons';
import { cn } from '../lib/utils';
import { ACCENT_COLORS, AccentColor } from '../types';

const SWATCH_HEX: Record<AccentColor, string> = {
  indigo: '#4f46e5',
  coral: '#d9532f',
  oliva: '#6b7d2f',
  petroleo: '#0f7d8c',
  ameixa: '#8a3f8f'
};

const SWATCH_LABEL_KEY: Record<AccentColor, string> = {
  indigo: 'personalize.colorIndigo',
  coral: 'personalize.colorCoral',
  oliva: 'personalize.colorOliva',
  petroleo: 'personalize.colorPetroleo',
  ameixa: 'personalize.colorAmeixa'
};

export default function Personalize() {
  const navigate = useNavigate();
  const { accentColor, setAccentColor, t } = useHealth();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950 pb-20"
    >
      <header className="p-6 flex items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="text-xl font-bold">{t('personalize.title')}</h1>
      </header>

      <div className="flex-1 p-6 space-y-8">
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
            {t('personalize.accentColor')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 ml-1">
            {t('personalize.accentColorDesc')}
          </p>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <div className="grid grid-cols-5 gap-3">
              {ACCENT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  aria-pressed={accentColor === color}
                  className="flex flex-col items-center gap-2 group"
                  title={t(SWATCH_LABEL_KEY[color])}
                >
                  <span
                    className={cn(
                      "size-11 rounded-full flex items-center justify-center transition-all",
                      accentColor === color
                        ? "ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                        : "ring-1 ring-black/5"
                    )}
                    style={{ backgroundColor: SWATCH_HEX[color] }}
                  >
                    {accentColor === color && <Check className="size-5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {t(SWATCH_LABEL_KEY[color])}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">
            {t('personalize.preview')}
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex items-center gap-4">
            <span className="size-14 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/25 shrink-0">
              <Brain className="size-6 text-accent-ink" />
            </span>
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <Palette className="size-4 text-accent" />
                {t(SWATCH_LABEL_KEY[accentColor])}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('personalize.previewDesc')}</p>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
