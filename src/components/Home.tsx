import { 
  Bell, 
  Beef, 
  FitnessCenter, 
  Droplets,
  Medication,
  Calendar, 
  Walk, 
  Lightbulb, 
  Dumbbell, 
  Stethoscope, 
  Flame, 
  ChevronRight, 
  Sparkles, 
  Utensils, 
  X, 
  TrendingUp, 
  Check, 
  Brain,
  Activity,
  ArrowLeft,
  CheckCircle2,
  Loader2
} from './Icons';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useHealth } from '../context/HealthContext';
import { cn } from '../lib/utils';
import { safeJsonParse, getGoogleGenAI } from '../lib/ai';
import { MentalHealthResponse } from '../types';
import { anonymizeProfile } from '../lib/lgpd';
import { useRegisterComponentRuntime } from '../lib/version';
import ShareModal from './ShareModal';

export default function Home() {
  useRegisterComponentRuntime('Home');
  const navigate = useNavigate();
  const { 
    getTodayValue, 
    profile, 
    goals,
    avatar, 
    notifications, 
    events, 
    markNotificationRead, 
    dismissNotification,
    clearAllNotifications,
    dismissedNotificationIds,
    getDailyWaterTarget, 
    getFatLossEstimation,
    getDailyCalorieTarget,
    getProteinTarget,
    totalCaloriesBurned,
    totalExerciseCalories,
    mentalHealthScore,
    isDayEnded,
    meals,
    routines,
    historyRecords,
    selectedDate,
    toggleAdherence,
    appLanguage,
    t
  } = useHealth();
  
  const [view, setView] = useState<'main' | 'mental'>('main');
  const [isShareOpen, setIsShareOpen] = useState(false);

  const targetDate = new Date(selectedDate + 'T12:00:00');
  const targetDateStr = targetDate.toDateString();
  const targetIsoDate = selectedDate;
  const targetWeekday = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

  const todayCalories = meals.filter(m => new Date(m.date).toDateString() === targetDateStr)
    .reduce((sum, m) => sum + m.calories, 0);
  const dailyCalorieTarget = getDailyCalorieTarget();

  const activeRoutines = routines.filter(r => {
    if (r.skippedDates?.includes(targetIsoDate)) return false;
    if (r.isExtra) return true;
    if (r.repeat === 'Every day') return true;
    if (r.repeat === 'Monday-Friday' && !['Saturday', 'Sunday'].includes(targetWeekday)) return true;
    if (Array.isArray(r.repeat) && r.repeat.includes(targetWeekday)) return true;
    return false;
  });

  const calculateHealthScore = () => {
    let score = 0;
    
    // 1. Exercise (25 points)
    const completedRoutines = activeRoutines.filter(r => r.completed).length;
    score += (completedRoutines / Math.max(1, activeRoutines.length)) * 25;

    // 2. Nutrition (25 points)
    const calorieDiff = Math.abs(todayCalories - dailyCalorieTarget);
    const calorieScore = Math.max(0, 25 - (calorieDiff / 100));
    score += calorieScore;

    // 3. Medical (20 points)
    const medicalRecords = historyRecords.length;
    score += Math.min(20, medicalRecords * 2);

    // 4. Mental Well-Being (15 points)
    score += (mentalHealthScore / 100) * 15;

    // 5. Sleep (15 points)
    score += 12;

    return Math.round(score);
  };

  const healthScore = calculateHealthScore();
  const calories = getTodayValue('calories');
  const protein = getTodayValue('protein');
  const water = getTodayValue('hydration');

  const isProfileIncomplete = !profile.sex || !profile.age || !profile.height;

  const calorieTarget = getDailyCalorieTarget();
  const waterTarget = getDailyWaterTarget();
  const proteinTarget = getProteinTarget();
  const { deficit, fatLossKg, status } = getFatLossEstimation();

  const unreadCount = notifications.filter(n => !n.read && !dismissedNotificationIds.includes(n.id)).length;
  const visibleNotifications = notifications
    .filter(n => !dismissedNotificationIds.includes(n.id))
    .slice(0, 2);
  const todayEvents = events.filter(e => new Date(e.date).toDateString() === targetDateStr);

  const stressManagementGoal = goals.find(g => g.id === 'g12' && g.selected);
  const mentalHealthGoal = goals.find(g => g.id === 'g15' && g.selected);

  // Goal completion logic
  const isCalorieGoalMet = isDayEnded && (
    (goals.find(g => g.id === 'g1' && g.selected) ? calories >= calorieTarget : calories <= calorieTarget)
  );
  const isProteinGoalMet = isDayEnded && protein >= proteinTarget;
  const isWaterGoalMet = isDayEnded && water >= waterTarget;

  const isCalorieMissed = isDayEnded && !isCalorieGoalMet;
  const isProteinMissed = isDayEnded && !isProteinGoalMet;
  const isWaterMissed = isDayEnded && !isWaterGoalMet;

  const handleCheckInStart = () => {
    setView('mental');
  };

  if (view === 'mental') {
    return <MentalWellBeing onBack={() => setView('main')} />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col pb-24"
    >
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/profile')}
            className="size-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary overflow-hidden transition-transform active:scale-90"
          >
            {avatar ? (
              <img className="w-full h-full object-cover" src={avatar} alt={t('profile.title')} referrerPolicy="no-referrer" />
            ) : (
              <div className="text-primary font-bold">{profile.name.substring(0, 2).toUpperCase()}</div>
            )}
          </button>
          <button 
            onClick={() => navigate('/calendar')}
            className="text-left transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold leading-tight">{t('common.welcome')}, {profile.name.split(' ')[0]} 👋</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
              {targetDate.toLocaleDateString(appLanguage === 'pt-BR' ? 'pt-BR' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              <ChevronRight className="size-3" />
            </p>
          </button>
        </div>
        <button 
          onClick={() => navigate('/notifications')}
          className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 relative"
        >
          <Bell className="size-5 text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
              {unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Profile Incomplete Warning */}
      {isProfileIncomplete && (
        <section className="px-6 mb-6">
          <button 
            onClick={() => navigate('/profile')}
            className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-4 transition-transform active:scale-[0.98]"
          >
            <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <Medication className="size-5" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-amber-900 dark:text-amber-100 text-sm">{t('actions.completeProfile')}</h4>
              <p className="text-amber-700 dark:text-amber-400 text-[10px] font-medium">{t('actions.completeProfileDesc')}</p>
            </div>
            <ChevronRight className="size-4 text-amber-400" />
          </button>
        </section>
      )}

      {/* Notifications Section */}
      {visibleNotifications.length > 0 && (
        <section className="px-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.recentNotifications')}</h3>
            <button 
              onClick={clearAllNotifications}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              {t('common.clearAll')}
            </button>
          </div>
          <div className="space-y-2">
            {visibleNotifications.map(n => (
              <div key={n.id} className="relative group">
                <button
                  onClick={() => {
                    markNotificationRead(n.id);
                    if (n.targetPath) navigate(n.targetPath);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all active:scale-[0.98]",
                    n.read ? "bg-slate-50/50 border-slate-100 opacity-60" : "bg-primary/5 border-primary/20 shadow-sm"
                  )}
                >
                  <div className="size-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{n.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{n.description}</p>
                  </div>
                  <ChevronRight className="size-3 text-slate-300" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(n.id);
                  }}
                  className="absolute -top-1 -right-1 size-5 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center border border-white dark:border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Health Score */}
      {!isProfileIncomplete && (
        <section className="px-6 mb-6">
          <div className="relative bg-white dark:bg-slate-900 p-6 rounded-3xl border border-primary/10 shadow-sm group transition-all hover:bg-primary/5">
            <button
              id="btn-nav-share"
              onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }}
              className="absolute top-4 right-4 size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-accent hover:bg-accent-soft transition-colors z-10"
              title={t('common.shareProgress')}
              aria-label={t('common.shareProgress')}
            >
              <Share2 className="size-4" />
            </button>
            <button
              id="btn-health-checkin"
              onClick={handleCheckInStart}
              className="w-full text-left flex items-center justify-between"
            >
              <div className="flex-1 pr-10">
                <h2 className="text-lg font-bold">{t('common.healthScore')}</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{t('common.healthScoreDesc')}</p>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-primary">
                  {t('common.improveScore')} <ChevronRight className="size-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="relative flex items-center justify-center size-24">
                <svg className="size-24 transform -rotate-90">
                  <circle className="text-slate-100 dark:text-slate-800" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="10"></circle>
                  <circle
                    className="text-primary transition-all duration-1000"
                    cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                    strokeLinecap="round"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black leading-none">{healthScore}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">/100</span>
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} defaultCategory="biostatus" />

      {/* Mental Health Score (Conditional) */}
      {(stressManagementGoal || mentalHealthGoal) && (
        <section className="px-6 mb-6">
          <motion.div 
            id="start-checkin-btn-dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setView('mental')}
            className={cn(
              "p-6 rounded-3xl border flex flex-col gap-4 cursor-pointer transition-all hover:shadow-md",
              mentalHealthScore < 65 
                ? "bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/20" 
                : "bg-indigo-50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/20"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-10 rounded-xl flex items-center justify-center",
                  mentalHealthScore < 65 ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"
                )}>
                  <Brain className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('common.mentalWellBeing')}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.weeklyAverage')}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "text-2xl font-black",
                  mentalHealthScore < 65 ? "text-rose-500" : "text-indigo-500"
                )}>{mentalHealthScore}%</span>
              </div>
            </div>

            <div className="h-2 w-full bg-white/50 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${mentalHealthScore}%` }}
                className={cn(
                  "h-full rounded-full",
                  mentalHealthScore < 65 ? "bg-rose-500" : "bg-indigo-500"
                )}
              />
            </div>

            {mentalHealthScore < 65 ? (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                {t('common.stressWarning')}
              </p>
            ) : (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed">
                {t('common.stressSuccess')}
              </p>
            ) }
          </motion.div>
        </section>
      )}

      {/* Daily Goals */}
      <section className="px-6 mb-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">{t('common.dailyGoals')}</h3>
          </div>
          <div className="space-y-4">
            <GoalItem 
              onClick={() => navigate('/nutrition')}
              icon={<Flame className="size-4 text-orange-500" />} 
              label={t('common.calories')} 
              current={Math.round(calories)} 
              target={Math.round(calorieTarget)} 
              unit={t('common.units.kcal')} 
              color="bg-orange-500" 
              isCompleted={isCalorieGoalMet}
              isMissed={isCalorieMissed}
              extraInfo={
                <div className="flex items-center gap-1 text-emerald-500">
                  <Flame className="size-3" />
                  <span>{Math.round(totalExerciseCalories)} {t('common.kcalBurned')}</span>
                </div>
              }
            />
            
            {/* Fat Loss Trend bar repositioned */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-secondary flex items-center gap-2">
                  <TrendingUp className="size-4" /> {t('common.fatLossTrend')}
                </span>
                <span className="text-slate-500 font-bold uppercase text-[10px]">{status}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (fatLossKg / 0.1) * 100)}%` }}
                  className="h-full bg-secondary rounded-full"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 italic">
                <span>{t('common.basedOnActivity')}</span>
                <span>{fatLossKg.toFixed(3)} {t('common.kgEst')}</span>
              </div>
            </div>

            <GoalItem 
              onClick={() => navigate('/nutrition')}
              icon={<Beef className="size-4 text-blue-500" />} 
              label={t('common.protein')} 
              current={Math.round(protein)} 
              target={proteinTarget} 
              unit={t('common.units.g')} 
              color="bg-blue-500" 
              isCompleted={isProteinGoalMet}
              isMissed={isProteinMissed}
            />
            <GoalItem 
              onClick={() => navigate('/metric/hydration')}
              icon={<Droplets className="size-4 text-cyan-500" />} 
              label={t('common.water')} 
              current={water.toFixed(1)} 
              target={waterTarget.toFixed(1)} 
              unit={t('common.units.l')} 
              color="bg-cyan-500" 
              isCompleted={isWaterGoalMet}
              isMissed={isWaterMissed}
            />
          </div>
        </div>
      </section>

      {/* Daily Agenda */}
      <section className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">{t('common.dailyAgenda')}</h3>
          <button onClick={() => navigate('/calendar')} className="text-xs text-primary font-bold">{t('common.manage')}</button>
        </div>
        <div className="space-y-3">
          {todayEvents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400">{t('common.noEvents')}</p>
            </div>
          ) : (
            todayEvents.map(event => (
              <AgendaItem 
                key={event.id}
                onClick={() => navigate('/calendar')}
                icon={
                  event.type === 'medical' ? <Stethoscope className="size-5 text-blue-600" /> :
                  event.type === 'workout' ? <Walk className="size-5 text-emerald-600" /> :
                  event.type === 'medication' ? <Medication className="size-5 text-red-600" /> :
                  <Utensils className="size-5 text-orange-600" />
                } 
                title={event.title} 
                desc={event.description} 
                time={event.time} 
                bgColor={
                  event.type === 'medical' ? "bg-blue-100" :
                  event.type === 'workout' ? "bg-emerald-100" :
                  event.type === 'medication' ? "bg-red-100" :
                  "bg-orange-100"
                } 
                isMedication={event.type === 'medication'}
                status={event.status}
                onToggleAdherence={(status: 'taken' | 'missed') => {
                  if (event.linkedId) {
                    toggleAdherence(event.linkedId, event.date, event.time, status);
                  }
                }}
              />
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}

const MentalWellBeing = ({ onBack }: { onBack: () => void }) => {
  const { t, profile, addMentalHealthResponse, routines, historyRecords, goals, appLanguage } = useHealth();
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [questions, setQuestions] = useState<{ id: string; text: string; options: { label: string; value: number }[] }[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');

  const generateQuestions = async () => {
    setLoading(true);
    try {
      // LGPD: Anonymize profile
      const anonProfile = anonymizeProfile(profile);
      
      // Prepare context for AI
      const context = {
        user: anonProfile.name,
        goals: goals.filter(g => g.selected).map(g => g.title),
        recentExercises: routines.slice(0, 3).map(r => r.name),
        recentMedical: historyRecords.slice(0, 2).map(h => {
          if ('conditionName' in h) return h.conditionName;
          if ('examName' in h) return h.examName;
          // Anonymize doctor names for LGPD
          if ('doctorName' in h) return `${t('common.doctor')} (${(h as any).specialty || t('common.general')})`;
          return h.category;
        }),
        lastMentalScore: profile.mentalHealthHistory?.[0]?.score
      };

      const prompt = `Generate 5 adaptive mental well-being questions for a health app (LGPD Protocol). 
      The user's current language is ${appLanguage}.
      Context: ${JSON.stringify(context)}.
      The questions should cover themes like: ${t('mental.howFeeling')}, ${t('mental.sleepQuality')}, ${t('mental.energyLevels')}, ${t('mental.physicalSoreness')}, ${t('mental.mentalFocus')}, ${t('mental.appetiteHunger')}.
      Return a JSON array of objects with: id, text, and 4 options (label and value 1-10).`;

      const genAI = getGoogleGenAI();
      const response = await genAI.models.generateContent({
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = safeJsonParse(response.text, []);
      setQuestions(data);
      setStep('quiz');
    } catch (error) {
      console.error("Error generating questions:", error);
      // Fallback questions
      setQuestions([
        { id: '1', text: t('mental.fallbackQ1'), options: [{label: t('mental.fallbackQ1Opt1'), value: 10}, {label: t('mental.fallbackQ1Opt2'), value: 7}, {label: t('mental.fallbackQ1Opt3'), value: 5}, {label: t('mental.fallbackQ1Opt4'), value: 2}] },
        { id: '2', text: t('mental.fallbackQ2'), options: [{label: t('mental.fallbackQ2Opt1'), value: 10}, {label: t('mental.fallbackQ2Opt2'), value: 7}, {label: t('mental.fallbackQ2Opt3'), value: 4}, {label: t('mental.fallbackQ2Opt4'), value: 1}] },
        { id: '3', text: t('mental.fallbackQ3'), options: [{label: t('mental.fallbackQ3Opt1'), value: 10}, {label: t('mental.fallbackQ3Opt2'), value: 7}, {label: t('mental.fallbackQ3Opt3'), value: 4}, {label: t('mental.fallbackQ3Opt4'), value: 1}] },
        { id: '4', text: t('mental.sleepQuality'), options: [{label: t('mental.fallbackQ2Opt1'), value: 10}, {label: t('mental.fallbackQ2Opt2'), value: 7}, {label: t('mental.fallbackQ2Opt3'), value: 4}, {label: t('mental.fallbackQ2Opt4'), value: 1}] },
        { id: '5', text: t('mental.energyLevels'), options: [{label: t('mental.fallbackQ3Opt1'), value: 10}, {label: t('mental.fallbackQ3Opt2'), value: 7}, {label: t('mental.fallbackQ3Opt3'), value: 4}, {label: t('mental.fallbackQ3Opt4'), value: 1}] },
      ]);
      setStep('quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setAnalyzing(true);
    const totalScore = Object.values(answers).reduce((a: number, b: number) => a + b, 0);
    const maxScore = questions.length * 10;
    const finalScore = Math.round((Number(totalScore) / Math.max(1, Number(maxScore))) * 100);

    const mentalResponse: Omit<MentalHealthResponse, 'id'> = {
      date: new Date().toISOString(),
      answers: questions.map(q => ({
        questionId: q.id,
        question: q.text,
        answer: answers[q.id]
      })),
      score: finalScore
    };

    addMentalHealthResponse(mentalResponse);

    try {
      const prompt = `Based on these mental health quiz results (Score: ${finalScore}/100) and answers: ${JSON.stringify(mentalResponse.answers)}, provide a short, supportive, and actionable insight (max 3 sentences).
      
      INSTRUÇÕES DE IDIOMA (OMNI-V50):
      - Responda exclusivamente no idioma: ${appLanguage}.
      - Mantenha termos médicos universais e códigos CID entre parênteses, mas a explicação deve ser em ${appLanguage}.`;
      
      const genAI = getGoogleGenAI();
      const response = await genAI.models.generateContent({
        contents: prompt
      });
      setAiInsight(response.text);
    } catch (error) {
      setAiInsight(t('mental.aiInsightFallback'));
    } finally {
      setAnalyzing(false);
      setStep('result');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <header className="p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full bg-white dark:bg-slate-900 shadow-sm">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-xl font-bold">{t('common.mentalWellBeing')}</h1>
      </header>

      <main className="px-6">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <div className="size-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="size-12 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4">{t('common.howAreYouFeeling')}</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                {t('common.mentalCheckInDesc')}
              </p>
              <button 
                id="start-checkin-btn"
                onClick={generateQuestions}
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                {loading ? t('common.preparingCheckIn') : t('common.startCheckIn')}
              </button>
            </motion.div>
          )}

          {step === 'quiz' && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {Object.keys(answers).length < questions.length && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {t('common.questionOf', { current: Object.keys(answers).length + 1, total: questions.length })}
                  </span>
                  <div className="flex gap-1">
                    {questions.map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-1 w-6 rounded-full transition-colors",
                          i < Object.keys(answers).length ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                        )} 
                      />
                    ))}
                  </div>
                </div>
              )}

              {questions.map((q, idx) => {
                if (idx !== Object.keys(answers).length) return null;
                return (
                  <div key={q.id} className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {q.text}
                    </h3>
                    <div className="grid gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                          className="w-full p-5 text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary transition-colors flex items-center justify-between group"
                        >
                          <span className="font-medium">{opt.label}</span>
                          <div className="size-5 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-primary transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {Object.keys(answers).length === questions.length && (
                <button 
                  onClick={handleFinish}
                  disabled={analyzing}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                >
                  {analyzing ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
                  {analyzing ? t('common.analyzingResults') : t('common.finishCheckIn')}
                </button>
              )}
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="relative size-48 mx-auto mb-8">
                <svg className="size-48 transform -rotate-90">
                  <circle className="text-slate-100 dark:text-slate-800" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="12"></circle>
                  <circle 
                    className="text-indigo-500 transition-all duration-1000" 
                    cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="12"
                    strokeDasharray="502.4"
                    strokeDashoffset={502.4 - (502.4 * (Number(profile.mentalHealthHistory?.[0]?.score) || 0)) / 100}
                    strokeLinecap="round"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-indigo-600">{profile.mentalHealthHistory?.[0]?.score}%</span>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{t('common.resilience')}</span>
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 mb-8 text-left">
                <div className="flex items-center gap-2 mb-3 text-indigo-600">
                  <Sparkles className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t('common.aiInsight')}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{aiInsight}"
                </p>
              </div>

              <button 
                onClick={onBack}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold"
              >
                {t('common.backToDashboard')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

function GoalItem({ icon, label, current, target, unit, color, onClick, isCompleted, isMissed, extraInfo }: any) {
  const progress = Math.min(100, (current / target) * 100);
  return (
    <button onClick={onClick} className="w-full text-left group">
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="font-medium flex items-center gap-2 group-hover:text-primary transition-colors">
            {icon} {label}
            {isCompleted && <Check className="size-3 text-emerald-500 font-bold" />}
            {isMissed && <X className="size-3 text-red-500 font-bold" />}
          </span>
          <span className={cn(
            "text-slate-500", 
            isCompleted && "text-emerald-500 font-bold",
            isMissed && "text-red-500 font-bold"
          )}>
            {current}{unit} / {target}{unit}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isCompleted ? "bg-emerald-500" : (isMissed ? "bg-red-500" : color)
            )} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        {extraInfo && (
          <div className="text-[10px] font-bold uppercase tracking-wider mt-1">
            {extraInfo}
          </div>
        )}
      </div>
    </button>
  );
}

function AgendaItem({ icon, title, desc, time, bgColor, onClick, isMedication, status, onToggleAdherence }: any) {
  return (
    <div className="relative group">
      <div 
        onClick={onClick}
        className="w-full flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-transform active:scale-[0.98] cursor-pointer"
      >
        <div className={`size-10 rounded-lg ${bgColor} dark:bg-opacity-20 flex items-center justify-center`}>
          {icon}
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{time}</span>
          {isMedication && (
            <div className="flex items-center gap-1 mt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAdherence('taken');
                }}
                className={cn(
                  "size-6 rounded-md flex items-center justify-center transition-all",
                  status === 'taken' 
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600"
                )}
              >
                <Check className="size-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAdherence('missed');
                }}
                className={cn(
                  "size-6 rounded-md flex items-center justify-center transition-all",
                  status === 'missed' 
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
                )}
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
