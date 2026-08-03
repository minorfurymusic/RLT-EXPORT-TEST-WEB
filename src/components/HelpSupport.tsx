import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { 
  ArrowLeft, 
  Search, 
  HelpCircle, 
  ChevronRight, 
  Sparkles, 
  FileText, 
  Download,
  CheckCircle2,
  X,
  Activity,
  Medication,
  RefreshCw
} from './Icons';
import { cn } from '../lib/utils';
import { getTranslation } from '../lib/i18n';
import { getGoogleGenAI } from '../lib/ai';

export default function HelpSupport() {
  const navigate = useNavigate();
  const { generateDebugLog, appLanguage } = useHealth();
  const t = (key: string) => getTranslation(appLanguage, key);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isGeneratingLog, setIsGeneratingLog] = useState(false);
  const [showLogSuccess, setShowLogSuccess] = useState(false);

  const TUTORIALS = [
    { id: 'atestado', title: t('help.tutorialAtestado'), icon: <FileText className="size-4" /> },
    { id: 'pressao', title: t('help.tutorialPressao'), icon: <Activity className="size-4" /> },
    { id: 'medicacao', title: t('help.tutorialMedicacao'), icon: <Medication className="size-4" /> },
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsTyping(true);
    setAiResponse(null);

    try {
      const genAI = getGoogleGenAI();

      const prompt = `You are an AI Health App Tutor. Provide a short, clear tutorial (max 3 sentences) for the following user question: "${searchQuery}".
      If the question is about "atestado", explain how to use the Smart Scan in the Medical section.
      If it's about "pressao", explain how to check the Routine Vitals dashboard.
      If it's about "medicação", explain how to use the Adherence Log in the Home or Medical section.
      Be helpful and concise.`;

      const result = await genAI.models.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      const text = result.text;
      setAiResponse(text);
    } catch (error) {
      setAiResponse(t('help.aiError'));
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateLog = () => {
    setIsGeneratingLog(true);
    setTimeout(() => {
      generateDebugLog();
      setIsGeneratingLog(false);
      setShowLogSuccess(true);
      setTimeout(() => setShowLogSuccess(false), 3000);
    }, 1500);
  };

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
        <h1 className="text-xl font-bold">{t('profile.help')}</h1>
      </header>

      <div className="flex-1 p-6 space-y-8">
        {/* Interactive Help */}
        <section>
          <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-[2rem] border border-primary/20 dark:border-primary/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center">
                <Sparkles className="size-5" />
              </div>
              <h2 className="font-bold text-lg">{t('help.tutor')}</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              {t('help.ask')}
            </p>
            
            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('help.placeholder')}
                className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-primary transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronRight className="size-5" />
              </button>
            </form>

            <AnimatePresence mode="wait">
              {(isTyping || aiResponse) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  {isTyping ? (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex gap-1">
                        <span className="size-1.5 bg-primary rounded-full animate-bounce" />
                        <span className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.loading')}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {aiResponse}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Quick Tutorials */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">{t('help.quickTutorials')}</h3>
          <div className="grid grid-cols-1 gap-3">
            {TUTORIALS.map((tutorial) => (
              <button 
                key={tutorial.id}
                onClick={() => setSearchQuery(tutorial.title)}
                className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                    {tutorial.icon}
                  </div>
                  <span className="font-bold text-sm">{tutorial.title}</span>
                </div>
                <ChevronRight className="size-5 text-slate-400" />
              </button>
            ))}
          </div>
        </section>

        {/* Debug Log Generator */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">{t('help.technicalSupport')}</h3>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <button 
              onClick={handleGenerateLog}
              disabled={isGeneratingLog}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                  {isGeneratingLog ? <RefreshCw className="size-5 animate-spin" /> : <Download className="size-5" />}
                </div>
                <div className="text-left">
                  <span className="block font-bold text-sm">{t('help.debugLog')}</span>
                  <span className="text-xs text-slate-500">{t('help.debugLogDesc')}</span>
                </div>
              </div>
              {showLogSuccess ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : (
                <ChevronRight className="size-5 text-slate-400" />
              )}
            </button>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 text-center px-6">
            {t('help.debugLogDisclaimer')}
          </p>
        </section>
      </div>
    </motion.div>
  );
}
