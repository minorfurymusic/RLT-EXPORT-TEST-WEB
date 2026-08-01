import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { ChevronRight, Check, Sparkles, FitnessCenter, Utensils, Lightbulb } from './Icons';
import { cn, safeLocalStorage } from '../lib/utils';
import { HealthGoal } from '../types';
import { getTranslation } from '../lib/i18n';

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, goals, updateGoal, appLanguage } = useHealth();
  const t = (key: string) => getTranslation(appLanguage, key);
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  // Step 1 state
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState<number | ''>(profile.age || '');
  const [weight, setWeight] = useState<number | ''>(profile.weight || '');
  const [height, setHeight] = useState<number | ''>(profile.height || '');
  const [sex, setSex] = useState(profile.sex || 'Male');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError(appLanguage === 'pt-BR' ? 'Por favor, insira seu nome.' : 'Please enter your name.');
        return;
      }
      if (!age || age <= 0) {
        setError(appLanguage === 'pt-BR' ? 'Por favor, insira uma idade válida.' : 'Please enter a valid age.');
        return;
      }
      if (!weight || weight <= 0) {
        setError(appLanguage === 'pt-BR' ? 'Por favor, insira um peso válido.' : 'Please enter a valid weight.');
        return;
      }
      if (!height || height <= 0) {
        setError(appLanguage === 'pt-BR' ? 'Por favor, insira uma altura válida.' : 'Please enter a valid height.');
        return;
      }
      setError('');
      setStep(step + 1);
    } else {
      safeLocalStorage.setItem('hasCompletedOnboarding', 'true');
      updateProfile({ 
        name,
        age: Number(age), 
        weight: Number(weight), 
        height: Number(height), 
        sex, 
        onboardingCompleted: true 
      });
      navigate('/');
    }
  };

  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col max-w-md mx-auto border-x border-slate-200 dark:border-slate-800 relative shadow-sm">
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-primary"
        />
      </div>

      <div className="flex-1 p-8 flex flex-col">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{t('onboarding.essentialInfo')}</h1>
                <p className="text-slate-500">{t('onboarding.essentialInfoDesc')}</p>
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase ml-1">{t('common.name')}</label>
                  <input 
                    type="text" 
                    placeholder={appLanguage === 'pt-BR' ? 'Seu nome completo' : 'Your full name'}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 font-bold text-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase ml-1">{t('common.age')}</label>
                    <input 
                      type="number" 
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value === '' ? '' : Number(e.target.value));
                        setError('');
                      }}
                      className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 font-bold text-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400 uppercase ml-1">{t('common.sex')}</label>
                    <select 
                      value={sex}
                      onChange={(e) => {
                        setSex(e.target.value as any);
                        setError('');
                      }}
                      className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 font-bold text-lg appearance-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100"
                    >
                      <option value="Male">{t('common.sex.male')}</option>
                      <option value="Female">{t('common.sex.female')}</option>
                      <option value="Other">{t('common.sex.other')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase ml-1">{t('common.weight')} ({t('common.units.kg')})</label>
                  <input 
                    type="number" 
                    value={weight}
                    onChange={(e) => {
                      setWeight(e.target.value === '' ? '' : Number(e.target.value));
                      setError('');
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 font-bold text-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400 uppercase ml-1">{t('common.height')} ({t('common.units.cm')})</label>
                  <input 
                    type="number" 
                    value={height}
                    onChange={(e) => {
                      setHeight(e.target.value === '' ? '' : Number(e.target.value));
                      setError('');
                    }}
                    className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 font-bold text-lg focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">{t('onboarding.yourGoals')}</h1>
                <p className="text-slate-500">{t('onboarding.yourGoalsDesc')}</p>
              </div>

              <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-6 pb-4">
                <GoalCategorySection 
                  title={t('goals.performance')} 
                  icon={<FitnessCenter className="size-5" />}
                  goals={goals.filter(g => g.category === 'Performance')}
                  onToggle={(id, selected) => updateGoal(id, { selected })}
                />
                <GoalCategorySection 
                  title={t('goals.nutrition')} 
                  icon={<Utensils className="size-5" />}
                  goals={goals.filter(g => g.category === 'Nutrition')}
                  onToggle={(id, selected) => updateGoal(id, { selected })}
                />
                <GoalCategorySection 
                  title={t('goals.wellbeing')} 
                  icon={<Lightbulb className="size-5" />}
                  goals={goals.filter(g => g.category === 'Well-being')}
                  onToggle={(id, selected) => updateGoal(id, { selected })}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-sm font-bold mt-4">
            ⚠️ {error}
          </div>
        )}

        <button 
          onClick={handleNext}
          className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-95 mt-6"
        >
          {step === totalSteps ? t('common.finish') : t('common.next')}
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

function GoalCategorySection({ title, icon, goals, onToggle }: { title: string, icon: React.ReactNode, goals: HealthGoal[], onToggle: (id: string, selected: boolean) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-xs tracking-wider ml-1">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2">
        {goals.map(goal => (
          <button
            key={goal.id}
            onClick={() => onToggle(goal.id, !goal.selected)}
            className={cn(
              "w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-4",
              goal.selected 
                ? "bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30" 
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
            )}
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm mb-0.5">{goal.title}</h3>
              <p className="text-xs text-slate-500 truncate">{goal.description}</p>
            </div>
            <div className={cn(
              "size-6 rounded-full border-2 flex items-center justify-center transition-all",
              goal.selected ? "bg-primary border-primary" : "border-slate-200 dark:border-slate-700"
            )}>
              {goal.selected && <Check className="size-4 text-white" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
