import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lightbulb, ChevronRight, Sparkles, Activity, Utensils, Clock, Dumbbell, Heart, Brain, Zap } from './Icons';
import { cn } from '../lib/utils';
import { useHealth } from '../context/HealthContext';

export default function Insights() {
  const navigate = useNavigate();
  const { goals, profile, t } = useHealth();

  const dynamicInsights = useMemo(() => {
    const list = [];
    
    // Muscle Gain Insights
    const muscleGainGoal = goals.find(g => g.id === 'muscle-gain');
    if (muscleGainGoal?.selectedOption === 'Yes') {
      list.push({
        id: 'muscle-1',
        title: t('insights.hypertrophyTitle'),
        content: t('insights.hypertrophyContent'),
        icon: <Dumbbell className="size-5" />,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-50',
      });
      list.push({
        id: 'muscle-2',
        title: t('insights.trainingFreqTitle'),
        content: t('insights.trainingFreqContent'),
        icon: <Activity className="size-5" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
      });
    }

    // Endurance Insights
    const enduranceGoal = goals.find(g => g.id === 'endurance');
    if (enduranceGoal?.selectedOption === 'Yes') {
      list.push({
        id: 'endurance-1',
        title: t('insights.cardioProgTitle'),
        content: t('insights.cardioProgContent'),
        icon: <Zap className="size-5" />,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
      });
      list.push({
        id: 'endurance-2',
        title: t('insights.cyclingEffTitle'),
        content: t('insights.cyclingEffContent'),
        icon: <Heart className="size-5" />,
        color: 'text-rose-500',
        bgColor: 'bg-rose-50',
      });
    }

    // Fat Loss Insights
    const fatLossGoal = goals.find(g => g.id === 'fat-loss');
    if (fatLossGoal?.selectedOption === 'Yes') {
      list.push({
        id: 'fat-loss-1',
        title: t('insights.caloricDeficitTitle'),
        content: t('insights.caloricDeficitContent'),
        icon: <Utensils className="size-5" />,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
      });
    }

    // Stress Management Insights
    const stressGoal = goals.find(g => g.id === 'stress-management');
    if (stressGoal?.selectedOption === 'Yes') {
      list.push({
        id: 'stress-1',
        title: t('insights.mentalResilienceTitle'),
        content: t('insights.mentalResilienceContent'),
        icon: <Brain className="size-5" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
      });
    }

    // Default insights if list is short
    if (list.length < 3) {
      list.push({
        id: 'default-1',
        title: t('insights.hydrationAlertTitle'),
        content: t('insights.hydrationAlertContent'),
        icon: <Clock className="size-5" />,
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-50',
      });
    }

    return list;
  }, [goals, profile, t]);

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="p-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronRight className="size-6 rotate-180" />
        </button>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="size-6" />
        </div>
        <h1 className="text-xl font-bold">{t('insights.title')}</h1>
      </header>

      <main className="p-6 space-y-4">
        <div className="bg-gradient-to-br from-secondary to-primary p-6 rounded-[2rem] text-white shadow-xl shadow-primary/20 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="size-6" />
            <h2 className="text-lg font-bold">{t('common.aiAnalysis')}</h2>
          </div>
          <p className="text-white/90 leading-relaxed">
            {t('common.aiAnalysisDesc')}
          </p>
        </div>

        <div className="grid gap-4">
          {dynamicInsights.map((insight, index) => (
            <motion.div 
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4"
            >
              <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", insight.bgColor)}>
                <div className={insight.color}>{insight.icon}</div>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">{insight.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{insight.content}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm text-slate-400">{t('common.aiInsightsDaily')}</p>
        </div>
      </main>
    </div>
  );
}
