import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { 
  ArrowLeft, 
  Globe, 
  Check, 
  Settings,
  ChevronRight
} from './Icons';
import { cn } from '../lib/utils';

const LANGUAGES = [
  { id: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { id: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { id: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { id: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { id: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { id: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
  { id: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { id: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { id: 'ru-RU', name: 'Русский', flag: '🇷🇺' },
  { id: 'ar-SA', name: 'العربية', flag: '🇸🇦', rtl: true },
  { id: 'hi-IN', name: 'हिन्दी', flag: '🇮🇳' },
  { id: 'ko-KR', name: '한국어', flag: '🇰🇷' },
];

export default function LanguageRegional() {
  const navigate = useNavigate();
  const { profile, updateProfile, t } = useHealth();

  const currentLang = profile.language || 'pt-BR';

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
        <h1 className="text-xl font-bold">{t('profile.language')}</h1>
      </header>

      <div className="flex-1 p-6 space-y-8">
        {/* Language Selector */}
        <section>
          <div className="flex items-center gap-3 mb-4 ml-1">
            <Globe className="size-4 text-primary" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('profile.language')}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 divide-y divide-slate-100 dark:divide-slate-800">
              {LANGUAGES.map((lang) => (
                <button 
                  key={lang.id}
                  onClick={() => updateProfile({ language: lang.id })}
                  className={cn(
                    "w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                    currentLang === lang.id && "bg-primary/5 dark:bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xl">{lang.flag}</span>
                    <span className={cn(
                      "font-bold text-sm",
                      currentLang === lang.id ? "text-primary" : "text-slate-700 dark:text-slate-300"
                    )}>
                      {lang.name}
                    </span>
                  </div>
                  {currentLang === lang.id && (
                    <Check className="size-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Regional Settings */}
        <section>
          <div className="flex items-center gap-3 mb-4 ml-1">
            <Settings className="size-4 text-primary" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('profile.settings')}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="block font-bold text-sm">{t('common.units')}</span>
                <span className="text-xs text-slate-500">{t('common.metric')} vs {t('common.imperial')}</span>
              </div>
              <button 
                id="btn-units-selector"
                onClick={() => updateProfile({ units: profile.units === 'metric' ? 'imperial' : 'metric' })}
                className="relative w-14 h-8 bg-slate-100 dark:bg-slate-800 rounded-full p-1 transition-colors"
              >
                <motion.div 
                  animate={{ x: profile.units === 'metric' ? 0 : 24 }}
                  className="size-6 bg-white dark:bg-slate-600 rounded-full shadow-sm flex items-center justify-center text-[10px] font-bold"
                >
                  {profile.units === 'metric' ? 'M' : 'I'}
                </motion.div>
              </button>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
