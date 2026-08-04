import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Walk, 
  FitnessCenter, 
  History, 
  ChevronRight, 
  Plus, 
  Settings, 
  X, 
  Play, 
  Pause,
  Square, 
  Timer, 
  Map, 
  Flame, 
  TrendingUp, 
  Dumbbell, 
  Info, 
  Edit3, 
  Check, 
  Trash2, 
  Clock, 
  Calendar,
  ArrowLeft,
  Zap,
  Save,
  Activity,
  RefreshCw,
  Pencil
} from './Icons';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { useRegisterComponentRuntime } from '../lib/version';
import { ExerciseRoutine, ActivityTracking, GymExercise, GymSet, ActivityType, GymWorkoutSession } from '../types';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary';
import { safeJsonParse, getGoogleGenAI } from '../lib/ai';
import { sensorService } from '../services/sensorService';
import { locationService } from '../services/locationService';

export default function Exercises() {
  useRegisterComponentRuntime('Exercises');
  const navigate = useNavigate();
  const { 
    t,
    appLanguage,
    routines, 
    updateRoutine, 
    addRoutine, 
    deleteRoutine, 
    profile, 
    updateProfile, 
    getTodayValue, 
    addActivity, 
    addGymLog,
    gymLogs,
    deleteGymLog,
    addHistoryRecord,
    requestSensorPermission,
    activeActivity,
    setActiveActivity,
    isSyncing
  } = useHealth();

  const today = new Date().toISOString().split('T')[0];
  const todayWeekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const activeRoutines = routines.filter(r => {
    if (r.skippedDates?.includes(today)) return false;
    if (r.isExtra) return true;
    if (r.repeat === 'Every day') return true;
    if (r.repeat === 'Monday-Friday' && !['Saturday', 'Sunday'].includes(todayWeekday)) return true;
    if (Array.isArray(r.repeat) && r.repeat.includes(todayWeekday)) return true;
    return false;
  });

  const [isRoutineSettingsOpen, setIsRoutineSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'routines' | 'gym'>('routines');
  const [editingRoutine, setEditingRoutine] = useState<ExerciseRoutine | null>(null);
  const [isGymLogOpen, setIsGymLogOpen] = useState(false);
  const [selectedExerciseForLog, setSelectedExerciseForLog] = useState<any>(null);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingTypeSpecific, setIsEditingTypeSpecific] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<ExerciseRoutine | null>(null);

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  // Sync modal visibility with activeActivity if it's a new activity
  useEffect(() => {
    if (activeActivity && !isEditingTypeSpecific) {
      setIsTrackingModalOpen(true);
    }
  }, [activeActivity]);

  const handleRequestPermission = async () => {
    const granted = await requestSensorPermission();
    if (granted) {
      // Permission granted, sensorService is already listening
    } else {
      alert(t('exercises.sensorDenied'));
    }
  };

  const handleStartActivity = (type: 'walking' | 'running' | 'cycling' | 'gym' | 'other') => {
    const newActivity: ActivityTracking = {
      id: Math.random().toString(36).substr(2, 9),
      type: type === 'gym' ? 'walking' : type as any,
      status: 'ongoing',
      name: type === 'other' ? t('exercises.other') : t(`exercises.${type}`),
      startTime: new Date().toISOString(),
      duration: 0,
      distance: 0,
      avgSpeed: 0,
      calories: 0,
      elevation: 0
    };
    if (type === 'gym') {
      setActiveActivity({ ...newActivity, type: 'gym' as any });
    } else {
      setActiveActivity(newActivity);
    }
    setIsTrackingModalOpen(true);
  };

  if (isEditingTypeSpecific && editingRoutine) {
    if (editingRoutine.type === 'gym') {
      return <GymRoutineEditor 
        routine={editingRoutine} 
        onBack={() => {
          setIsEditingTypeSpecific(false);
          setEditingRoutine(null);
        }} 
        onComplete={(calories) => {
          setIsEditingTypeSpecific(false);
          setEditingRoutine(null);
        }} 
      />;
    }
    if (['walking', 'running', 'cycling'].includes(editingRoutine.type)) {
      return <CardioRoutineEditor routine={editingRoutine} onBack={() => {
        setIsEditingTypeSpecific(false);
        setEditingRoutine(null);
      }} onComplete={(activity) => {
        addActivity(activity);
        setIsEditingTypeSpecific(false);
        setEditingRoutine(null);
      }} />;
    }
    return <OtherRoutineEditor routine={editingRoutine} onBack={() => {
      setIsEditingTypeSpecific(false);
      setEditingRoutine(null);
    }} onComplete={(activity) => {
      addActivity(activity);
      setIsEditingTypeSpecific(false);
      setEditingRoutine(null);
    }} />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col pb-24"
    >
      <header className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-primary/10">
        <div className="flex-1 flex items-center justify-center relative">
          <h1 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">{t('exercises.title')}</h1>
          {isSyncing && (
            <div className="absolute right-0 flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full animate-pulse">
              <RefreshCw className="size-3 text-primary animate-spin" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('exercises.syncingBio')}</span>
            </div>
          )}
        </div>
      </header>

      {/* Segmented Tab Bar: Atividades & Rotinas vs Academia */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-inner">
          <button
            onClick={() => setActiveTab('routines')}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'routines'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Walk className="size-4" />
            <span>{appLanguage === 'pt-BR' ? 'Atividades & Rotinas' : 'Routines & Activities'}</span>
          </button>
          <button
            onClick={() => setActiveTab('gym')}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'gym'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FitnessCenter className="size-4" />
            <span>{appLanguage === 'pt-BR' ? 'Academia' : 'Gym Library'}</span>
          </button>
        </div>
      </div>

      <main className="p-4 space-y-6">
        {activeTab === 'routines' ? (
          <>
            {/* Daily Routines */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">{t('exercises.dailyRoutines')}</h2>
                <button 
                  onClick={() => setIsRoutineSettingsOpen(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-primary"
                >
                  <Plus className="size-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                {activeRoutines.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('exercises.noRoutinesToday')}</p>
                  </div>
                )}
                {/* Active Activity Highlight - Background Mode */}
                {activeActivity && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      if (activeActivity.routineId) {
                        const routine = routines.find(r => r.id === activeActivity.routineId);
                        if (routine) {
                          setEditingRoutine(routine);
                          setIsEditingTypeSpecific(true);
                        }
                      } else {
                        setIsTrackingModalOpen(true);
                      }
                    }}
                    className="bg-primary/10 dark:bg-primary/20 p-4 rounded-2xl border-2 border-primary shadow-lg shadow-primary/10 cursor-pointer relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-2">
                      <div className="size-2 bg-primary rounded-full animate-ping"></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-primary text-white flex items-center justify-center">
                          <Timer className="size-7 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-black text-primary text-base">{t('exercises.active', { name: activeActivity.name || activeActivity.type })}</h3>
                          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">{t('exercises.tapToResume')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-primary tabular-nums">
                          {Math.floor(activeActivity.duration / 60)}:{(activeActivity.duration % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-[10px] font-bold text-primary/60 uppercase">{t('exercises.elapsed')}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Scheduled Routines for Today */}
                {routines.filter(r => {
                  if (r.skippedDates?.includes(new Date().toISOString().split('T')[0])) return false;
                  if (r.isExtra) return true;
                  const today = new Date().toLocaleDateString(appLanguage, { weekday: 'long' });
                  if (typeof r.repeat === 'string' && (r.repeat === 'Every day' || r.repeat === t('exercises.everyDay'))) return true;
                  if (typeof r.repeat === 'string' && (r.repeat === 'Monday-Friday' || r.repeat === t('exercises.monFri')) && !['Saturday', 'Sunday'].includes(today)) return true;
                  if (Array.isArray(r.repeat) && r.repeat.includes(today)) return true;
                  return false;
                }).map(routine => (
                  <div 
                    key={routine.id} 
                    onClick={() => {
                      setEditingRoutine(routine);
                      setIsEditingTypeSpecific(true);
                    }}
                    className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm flex items-center justify-between group cursor-pointer transition-all ${
                      routine.completed ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-primary/10 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${
                        routine.completed 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : routine.type === 'gym' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {routine.completed ? <Check className="size-6" /> : routine.type === 'gym' ? <FitnessCenter className="size-6" /> : <Walk className="size-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm">{routine.name}</h3>
                          {routine.isExtra && (
                            <span className="text-[8px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">{t('exercises.extra')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{routine.time}</p>
                          {routine.completed && routine.calories && (
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                              {Math.round(routine.calories)} kcal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRoutine(routine.id);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-all"
                        title={t('exercises.deleteRoutine')}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const isCompleting = !routine.completed;
                          updateRoutine(routine.id, { 
                            completed: isCompleting,
                            lastCompletedDate: isCompleting ? new Date().toISOString() : routine.lastCompletedDate
                          });
                        }}
                        className={`size-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          routine.completed 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-primary bg-white dark:bg-slate-800'
                        }`}
                      >
                        {routine.completed ? <Check className="size-4" /> : <div className="size-4 rounded-full bg-transparent"></div>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Start Activity */}
            <section className="sticky bottom-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md -mx-4 px-4 py-4 border-t border-primary/10 z-10">
              <h2 className="text-slate-900 dark:text-slate-100 text-sm font-bold leading-tight mb-3 uppercase tracking-wider opacity-60">{t('exercises.startActivity')}</h2>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                <ActivityButton 
                  icon={<Walk className="size-5" />} 
                  label={t('exercises.walking')} 
                  onClick={() => handleStartActivity('walking')}
                />
                <ActivityButton 
                  icon={<Walk className="size-5" />} 
                  label={t('exercises.running')} 
                  onClick={() => handleStartActivity('running')}
                />
                <ActivityButton 
                  icon={<Map className="size-5" />} 
                  label={t('exercises.cycling')} 
                  onClick={() => handleStartActivity('cycling')}
                />
                <ActivityButton 
                  icon={<FitnessCenter className="size-5" />} 
                  label={t('exercises.gym')} 
                  onClick={() => {
                    setActiveTab('gym');
                  }}
                />
                <ActivityButton 
                  icon={<Plus className="size-5" />} 
                  label={t('exercises.other')} 
                  onClick={() => handleStartActivity('other' as any)}
                />
              </div>

              {/* Performance & Bio-Status Button */}
              <div className="mt-4 relative">
                {isSyncing && (
                  <div className="absolute -top-6 right-0 flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse">
                    <RefreshCw className="size-3 animate-spin" />
                    <span>{t('exercises.syncingBio')}</span>
                  </div>
                )}
                <button 
                  onClick={() => navigate('/performance')}
                  className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-primary/20 shadow-sm flex items-center justify-between group transition-all hover:bg-primary/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Activity className="size-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('exercises.performanceBio')}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('exercises.radarChartAI')}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Today's Gym Logs */}
            {gymLogs.filter(log => new Date(log.date).toDateString() === new Date().toDateString()).length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">{t('exercises.todaysLogs')}</h2>
                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-full">
                    {t('exercises.countExercises', { count: gymLogs.filter(log => new Date(log.date).toDateString() === new Date().toDateString()).length })}
                  </div>
                </div>
                <div className="space-y-3">
                  {gymLogs.filter(log => new Date(log.date).toDateString() === new Date().toDateString()).map(log => (
                    <div key={log.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-primary/10 shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {EXERCISE_LIBRARY.find(ex => ex.id === log.exerciseId)?.illustration || '💪'}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{log.exerciseName}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{t(`exercises.${log.muscleGroup.toLowerCase().replace(' ', '')}`)}</span>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                              {log.caloriesBurned} kcal
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // Logs created by the Cérebro (AI) only carry exerciseName/muscleGroup,
                            // not a matching EXERCISE_LIBRARY id — fall back to a synthetic entry
                            // built from the log itself so editing still works for those.
                            const ex = EXERCISE_LIBRARY.find(e => e.id === log.exerciseId) || {
                              id: log.exerciseId || log.id,
                              name: log.exerciseName,
                              muscleGroup: log.muscleGroup,
                              equipment: '',
                              illustration: '💪'
                            };
                            setSelectedExerciseForLog(ex);
                            setEditingLog(log);
                            setIsGymLogOpen(true);
                          }}
                          className="p-2 text-primary hover:bg-primary/5 rounded-full transition-colors"
                          title={t('exercises.editExercise')}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button 
                          onClick={() => deleteGymLog(log.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          title={t('exercises.deleteExercise')}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gym Exercise Library */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">{t('exercises.gymLibrary')}</h2>
                <button 
                  onClick={() => {
                    setSelectedExerciseForLog(null);
                    setIsGymLogOpen(true);
                  }}
                  className="px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-extrabold shadow-md shadow-primary/20 flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Plus className="size-4" />
                  <span>{appLanguage === 'pt-BR' ? 'Registrar Séries' : t('exercises.addSets')}</span>
                </button>
              </div>
              
              <div className="mb-4">
                <input 
                  type="text"
                  placeholder={t('exercises.searchExercises')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                {['All', 'Lower Body', 'Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Full Body'].map(group => (
                  <button 
                    key={group}
                    onClick={() => setSelectedMuscleGroup(group === 'All' ? null : group)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                      (selectedMuscleGroup === group || (group === 'All' && !selectedMuscleGroup))
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    {group === 'All' ? t('exercises.all') : t(`exercises.${group.charAt(0).toLowerCase() + group.slice(1).replace(' ', '')}`)}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-1 gap-3 mt-4">
                {EXERCISE_LIBRARY
                  .filter(ex => (!selectedMuscleGroup || ex.muscleGroup === selectedMuscleGroup) && 
                                (ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(ex => (
                    <div key={ex.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm">
                      <div className="size-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl shrink-0">
                        {ex.illustration}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{ex.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase inline-block">
                            {t(`exercises.${ex.muscleGroup.charAt(0).toLowerCase() + ex.muscleGroup.slice(1).replace(' ', '')}`)}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedExerciseForLog(ex);
                          setIsGymLogOpen(true);
                        }}
                        className="bg-primary/10 text-primary px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-colors shrink-0 whitespace-nowrap"
                      >
                        {t('exercises.addSets')}
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isRoutineSettingsOpen && (
          <RoutineSettingsModal 
            onClose={() => {
              setIsRoutineSettingsOpen(false);
              setRoutineToEdit(null);
            }} 
            routines={routines}
            onAddRoutine={addRoutine}
            onRemoveRoutine={deleteRoutine}
            onUpdateRoutine={updateRoutine}
            routineToEdit={routineToEdit}
            onEditRoutine={(r: any) => setRoutineToEdit(r)}
          />
        )}
        {activeActivity && isTrackingModalOpen && (
          <ActivityTrackingModal 
            activity={activeActivity} 
            onClose={() => setIsTrackingModalOpen(false)}
            onSave={(tracking) => {
              addActivity(tracking);
              setIsTrackingModalOpen(false);
            }} 
          />
        )}
        {isGymLogOpen && (
          <GymLogModal 
            onClose={() => {
              setIsGymLogOpen(false);
              setSelectedExerciseForLog(null);
              setEditingLog(null);
            }}
            initialExercise={selectedExerciseForLog}
            initialLog={editingLog}
            onSave={(log) => {
              if (editingLog) {
                // Update existing log
                deleteGymLog(editingLog.id);
                addGymLog({ ...log, id: editingLog.id });
              } else {
                addGymLog(log);
              }
              setIsGymLogOpen(false);
              setSelectedExerciseForLog(null);
              setEditingLog(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActivityButton({ icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col gap-2 rounded-2xl border border-primary/10 bg-white dark:bg-slate-900 p-4 items-center transition-all hover:bg-primary/5 active:scale-95 shadow-sm"
    >
      <div className="text-primary bg-primary/10 p-3 rounded-full">
        {icon}
      </div>
      <span className="text-slate-800 dark:text-slate-200 text-xs font-bold">{label}</span>
    </button>
  );
}

function GymRoutineEditor({ routine, onBack, onComplete }: { routine: ExerciseRoutine, onBack: () => void, onComplete: (calories: number) => void }) {
  const { t, updateRoutine, profile } = useHealth();
  const [currentExercise, setCurrentExercise] = useState('');
  const [currentMuscle, setCurrentMuscle] = useState('Chest');
  const [sets, setSets] = useState<any[]>([]);
  const [localLogs, setLocalLogs] = useState<any[]>(routine.loggedGymExercises || []);
  const [editingLogIndex, setEditingLogIndex] = useState<number | null>(null);

  const addSet = () => {
    setSets([...sets, { weight: sets.length > 0 ? sets[sets.length - 1].weight : 0, reps: sets.length > 0 ? sets[sets.length - 1].reps : 0 }]);
  };

  const finishExercise = () => {
    if (!currentExercise) return;
    
    // OMNI-V15: Prevent duplicate logs
    if (editingLogIndex === null && localLogs.some(log => log.name.toLowerCase() === currentExercise.toLowerCase())) {
      alert(t('exercises.alreadyLogged').replace('{name}', currentExercise));
      return;
    }

    const newLog = { name: currentExercise, muscle: currentMuscle, sets };
    
    let updatedLogs;
    if (editingLogIndex !== null) {
      updatedLogs = [...localLogs];
      updatedLogs[editingLogIndex] = newLog;
      setEditingLogIndex(null);
    } else {
      updatedLogs = [...localLogs, newLog];
    }
    
    setLocalLogs(updatedLogs);
    updateRoutine(routine.id, { loggedGymExercises: updatedLogs });
    
    setCurrentExercise('');
    setSets([]);
  };

  const editLog = (index: number) => {
    const log = localLogs[index];
    setCurrentExercise(log.name);
    setCurrentMuscle(log.muscle);
    setSets(log.sets);
    setEditingLogIndex(index);
    // Scroll to top to see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishWorkout = () => {
    if (localLogs.length === 0) return;

    const weight = profile.weight || 75;
    const lbm = profile.leanBodyMass || (weight * (1 - ((profile.bodyFatPercentage || 20) / 100)));

    let totalKcal = 0;

    localLogs.forEach(log => {
      // OMNI-V7 Intensity Factors (Fm)
      const mg = log.muscle;
      let fm = 0.5; // Arms/Core
      if (['Legs', 'Back', 'Lower Body', 'Full Body'].includes(mg)) fm = 1.0; // Legs/Back
      else if (['Chest', 'Shoulders'].includes(mg)) fm = 0.8; // Chest/Shoulders

      let logVolume = 0;
      let logTimeSeconds = 0;

      log.sets.forEach((set: any) => {
        const reps = set.reps || 0;
        const load = set.weight || 0;
        
        // OMNI-V7 Formulas
        logVolume += (load * reps);
        logTimeSeconds += (reps * 4) + 90;
      });

      const logTimeHours = logTimeSeconds / 3600;
      const safeTimeHours = Math.max(logTimeHours, 0.01);
      const safeLbm = Math.max(lbm, 30);
      
      // IER = Volume_Total_Acumulado / (LBM * Tempo_Total_h)
      const ier = logVolume / (safeLbm * safeTimeHours);
      
      let baseMet = 3.5;
      if (ier >= 80) baseMet = 9.5;
      else if (ier >= 50) baseMet = 7.5;
      else if (ier >= 20) baseMet = 5.5;

      // MET_Final = 1.0 + (MET_Base * Fm)
      const finalMet = 1.0 + (baseMet * fm);
      
      // Net Calories = (MET_Final - 1.0) * Weight * Total_Time_h
      let caloriesBurned = (finalMet - 1.0) * weight * logTimeHours;
      
      // Safety Cap: 12 kcal/min
      const logMinutes = Math.round(logTimeSeconds / 60);
      const maxCalories = logMinutes * 12;
      if (caloriesBurned > maxCalories) caloriesBurned = maxCalories;

      totalKcal += caloriesBurned;
    });

    updateRoutine(routine.id, {
      completed: true,
      calories: Math.round(totalKcal),
      loggedGymExercises: localLogs,
      lastCompletedDate: new Date().toISOString()
    });

    onComplete(Math.round(totalKcal));
  };

  const deleteLog = (index: number) => {
    const updated = localLogs.filter((_, i) => i !== index);
    setLocalLogs(updated);
    updateRoutine(routine.id, { loggedGymExercises: updated });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-primary/10 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-bold">{routine.name}</h1>
        </div>
        <button 
          onClick={handleFinishWorkout}
          className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
        >
          {routine.completed ? t('exercises.updateWorkout') : t('exercises.finishWorkout')}
        </button>
      </header>

      <main className="p-4 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-primary/10 shadow-sm">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Plus className="size-4 text-primary" /> {t('exercises.addExercise')}
          </h2>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder={t('exercises.exerciseNamePlaceholder')}
              value={currentExercise}
              onChange={(e) => setCurrentExercise(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-primary/20"
            />
            <select 
              value={currentMuscle}
              onChange={(e) => setCurrentMuscle(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-primary/20"
            >
              {['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map(m => (
                <option key={m} value={m}>{t(`exercises.${m.toLowerCase()}`)}</option>
              ))}
            </select>

            <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded-xl border border-primary/10">
              <p className="text-[9px] font-medium text-slate-600 dark:text-slate-400 leading-tight">
                <span className="font-bold text-primary">{t('exercises.tip')}:</span> {t('exercises.unilateralTip')}
              </p>
            </div>
            
            <div className="space-y-2">
              {sets.map((set, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-8">#{i+1}</span>
                  <input 
                    type="number" 
                    placeholder={t('exercises.kg')}
                    value={set.weight || ''}
                    onChange={(e) => {
                      const newSets = [...sets];
                      newSets[i].weight = Number(e.target.value);
                      setSets(newSets);
                    }}
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-center"
                  />
                  <input 
                    type="number" 
                    placeholder={t('exercises.reps')}
                    value={set.reps || ''}
                    onChange={(e) => {
                      const newSets = [...sets];
                      newSets[i].reps = Number(e.target.value);
                      setSets(newSets);
                    }}
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-center"
                  />
                </div>
              ))}
              <button 
                onClick={addSet}
                className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:border-primary hover:text-primary transition-colors"
              >
                + {t('exercises.addSet')}
              </button>
            </div>

            <button 
              onClick={finishExercise}
              disabled={!currentExercise}
              className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold disabled:opacity-50"
            >
              {editingLogIndex !== null ? t('exercises.updateExercise') : t('exercises.logExercise')}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-bold flex items-center gap-2">
            <History className="size-4 text-slate-400" /> {t('exercises.currentWorkout')}
          </h2>
          
          {localLogs.length === 0 && (
            <div className="text-center py-8 opacity-40">
              <Dumbbell className="size-12 mx-auto mb-2" />
              <p className="text-xs font-bold uppercase tracking-widest">{t('exercises.noExercisesLogged')}</p>
            </div>
          )}

          {localLogs.map((log, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-primary/20 shadow-sm border-l-4 border-l-primary group relative">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">{log.name}</h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <span className="text-[10px] font-bold text-slate-500">{t(`exercises.${log.muscle.toLowerCase()}`)}</span>
                    <button 
                      onClick={() => editLog(i)}
                      className="p-0.5 text-slate-400 hover:text-primary transition-colors"
                      title={t('exercises.editExercise')}
                    >
                      <Edit3 className="size-2.5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => deleteLog(i)}
                    className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {log.sets.map((s: any, j: number) => (
                  <div key={j} className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                    {s.weight}kg x {s.reps}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </motion.div>
  );
}

function CardioRoutineEditor({ routine, onBack, onComplete }: { routine: ExerciseRoutine, onBack: () => void, onComplete: (activity: ActivityTracking) => void }) {
  const { t, setActiveActivity, activeActivity, profile } = useHealth();
  const [isTracking, setIsTracking] = useState(activeActivity?.routineId === routine.id);
  const [duration, setDuration] = useState(activeActivity?.routineId === routine.id ? activeActivity.duration || 0 : 0);
  const [distance, setDistance] = useState(activeActivity?.routineId === routine.id ? activeActivity.distance || 0 : 0);
  const [isPaused, setIsPaused] = useState(activeActivity?.routineId === routine.id ? activeActivity.isPaused ?? false : false);
  const [intensity, setIntensity] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isTracking && !isPaused) {
      // Start Location Tracking for Running/Cycling
      if (routine.type === 'running' || routine.type === 'cycling') {
        locationService.startTracking((data, totalDistance) => {
          setDistance(totalDistance);
        });
      }

      // Start Sensor Tracking for Intensity
      sensorService.startListening();

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          // Update global state for background persistence
          setActiveActivity({
            id: activeActivity?.id || Math.random().toString(36).substr(2, 9),
            routineId: routine.id,
            type: routine.type as ActivityType,
            status: 'ongoing',
            name: routine.name,
            duration: next,
            distance: distance,
            isPaused: false
          });
          return next;
        });

        // Update Intensity from sensors
        setIntensity(sensorService.getIntensity());

        // Fallback distance if GPS is not moving or not available (mock for walking)
        if (routine.type === 'walking') {
          const speedFactor = 0.0015; // ~5.4 km/h
          setDistance(prev => prev + speedFactor);
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      locationService.stopTracking();
      if (isTracking) {
        setActiveActivity({
          id: activeActivity?.id || Math.random().toString(36).substr(2, 9),
          routineId: routine.id,
          type: routine.type as ActivityType,
          status: 'paused',
          name: routine.name,
          duration: duration,
          distance: distance,
          isPaused: true
        });
      }
    }
    return () => {
      clearInterval(timerRef.current);
      locationService.stopTracking();
    };
  }, [isTracking, isPaused, routine.type]);

  const calculateCalories = () => {
    // Formula: (MET - 1) * Weight * (Duration / 60)
    // MET values: running: 10, walking: 3.5, cycling: 8
    const met = routine.type === 'running' ? 10 : routine.type === 'walking' ? 3.5 : 8;
    const weight = profile.weight || 75;
    const multiplier = 1.0;
    
    // Net Calories = (MET - 1) * Weight * Time_Hours
    const netCalories = (met - 1) * weight * (duration / 3600) * multiplier;
    return Math.max(0, netCalories);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const avgSpeed = duration > 0 ? (distance / (duration / 3600)) : 0;

  const handleFinish = () => {
    onComplete({
      id: activeActivity?.id || Math.random().toString(36).substr(2, 9),
      type: routine.type as ActivityType,
      status: 'completed',
      name: routine.name,
      duration: duration,
      distance: parseFloat(distance.toFixed(2)),
      avgSpeed: parseFloat(avgSpeed.toFixed(1)),
      calories: Math.round(calculateCalories()),
      date: new Date().toISOString()
    });
  };

  const handleCancel = () => {
    setActiveActivity(null);
    onBack();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-white dark:bg-slate-950 flex flex-col overflow-hidden h-[100dvh]">
      {/* Header - Sticky - Anchored Navigation */}
      <div className="flex justify-between items-center p-4 shrink-0 pt-safe bg-white dark:bg-slate-950 border-b border-primary/5 z-20">
        <button 
          onClick={onBack} 
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-transform"
          aria-label={t('exercises.goBack')}
        >
          <ArrowLeft className="size-6" />
        </button>
        
        <div className="text-center">
          <h1 className="font-bold leading-tight text-sm sm:text-base">{routine.name}</h1>
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('exercises.routineTracking')}</p>
        </div>

        <button 
          onClick={onBack} 
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-transform"
          aria-label={t('exercises.minimize')}
          title={t('exercises.minimizeToBackground')}
        >
          <X className="size-6" />
        </button>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex flex-col items-center p-6 space-y-6 min-h-full">
          {/* Circular Timer - Dynamic Scale (30% of screen height) */}
          <div className="relative h-[30dvh] aspect-square flex items-center justify-center shrink-0 mt-2">
            <div className="absolute inset-0 rounded-full border-[6px] sm:border-[10px] border-slate-100 dark:border-slate-900"></div>
            <svg className="absolute inset-0 size-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray="251"
                strokeDashoffset={251 - (duration % 60 / 60 * 251)}
                className={`text-primary transition-all duration-1000 ${isTracking && !isPaused ? 'opacity-100' : 'opacity-30'}`}
              />
            </svg>
            
            <div className="text-center z-10">
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-0.5">{t('exercises.timeElapsed')}</p>
              <h2 className="text-2xl sm:text-4xl font-black tabular-nums text-slate-900 dark:text-white">{formatTime(duration)}</h2>
            </div>
          </div>

          {/* Stats Grid - Side by side */}
          <div className="grid grid-cols-2 w-full gap-3 sm:gap-4 max-w-sm">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 rounded-[1.2rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-5 sm:size-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Walk className="size-3" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('exercises.distance')}</span>
              </div>
              <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                {distance.toFixed(2)} <span className="text-[10px] font-bold opacity-40">km</span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 rounded-[1.2rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-5 sm:size-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <Zap className="size-3" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('exercises.calories')}</span>
              </div>
              <p className="text-lg sm:text-2xl font-black text-emerald-500">
                {Math.round(calculateCalories())} <span className="text-[10px] font-bold opacity-40 text-slate-400">kcal</span>
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-900/50 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <Timer className="size-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('exercises.avgSpeed')}</span>
                <p className="text-xl font-black text-slate-900 dark:text-white">{avgSpeed.toFixed(1)} <span className="text-[10px] font-bold opacity-40">km/h</span></p>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-4"></div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('exercises.intensity')}</span>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(i => {
                  const level = intensity / 20;
                  return (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= level ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Visual Padding for Scroll */}
          <div className="h-20 shrink-0"></div>
        </div>
      </div>

      {/* Controls - Fixed at bottom above nav */}
      <div className="shrink-0 p-6 bg-white dark:bg-slate-950 border-t border-primary/5 pb-safe z-20 mb-6">
        <div className="flex items-center justify-center gap-6 max-w-md mx-auto">
          {!isTracking ? (
            <button 
              onClick={() => setIsTracking(true)}
              className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Play className="size-6 fill-white" />
              {t('exercises.startActivityBtn')}
            </button>
          ) : (
            <>
              <button 
                onClick={() => setShowCancelConfirm(true)}
                className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center active:scale-95 transition-all"
                title={t('exercises.cancelActivity')}
              >
                <Trash2 className="size-6" />
              </button>

              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`size-16 sm:size-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
                  isPaused 
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 shadow-slate-200/50 dark:shadow-none'
                }`}
              >
                {isPaused ? <Play className="size-6 sm:size-8 fill-current" /> : <Pause className="size-6 sm:size-8 fill-current" />}
              </button>
              
              <button 
                onClick={handleFinish}
                className="size-16 sm:size-20 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                title={t('exercises.finishActivity')}
              >
                <Check className="size-7 sm:size-10" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Overlay */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-xs text-center shadow-2xl"
            >
              <div className="size-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="size-8" />
              </div>
              <h3 className="text-xl font-black mb-2">{t('exercises.discardActivity')}</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">{t('exercises.discardActivityDesc')}</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm"
                >
                  {t('exercises.keep')}
                </button>
                <button 
                  onClick={handleCancel}
                  className="py-4 bg-red-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20"
                >
                  {t('exercises.discard')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function OtherRoutineEditor({ routine, onBack, onComplete }: { routine: ExerciseRoutine, onBack: () => void, onComplete: (activity: ActivityTracking) => void }) {
  const { t, profile, isAiConfigured, appLanguage } = useHealth();
  const [name, setName] = useState(routine.name === 'Other' ? '' : routine.name);
  const [duration, setDuration] = useState(30);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatedCalories, setEstimatedCalories] = useState(0);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  const estimateCalories = async () => {
    if (!name || name.length < 3) return;

    if (!isAiConfigured) {
      alert(appLanguage === 'pt-BR' ? 'Por favor, configure sua IA nas Configurações de Perfil.' : 'Please configure your AI provider in Profile Settings.');
      return;
    }

    setIsEstimating(true);
    setAiFeedback(null);
    try {
      const ai = getGoogleGenAI();
      const weight = profile.weight || 75;
      const prompt = `
        User Profile:
        - Name: ${profile.name}
        - Age: ${profile.age || 30}
        - Weight: ${weight}kg
        - Height: ${profile.height || 180}cm
        - Sex: ${profile.sex || 'Male'}
        - Occupation: ${profile.occupation || ''}
        - Metabolism: Standard
        
        Activity: "${name}" for ${duration} minutes.
        
        Task:
        1. If the activity name is too vague (e.g. "thing", "stuff", "exercise"), return a JSON object: {"error": "Please be more specific about the activity (e.g. Swimming, Heavy Cleaning, Martial Arts) so I can estimate accurately."}
        2. If valid, estimate calories burned based on NET MET values (MET - 1.0) and the user's profile. 
           Formula: (MET - 1.0) * Weight * (Duration / 60)
           Return a JSON object: {"kcal": number, "feedback": "Short encouraging message about this specific activity"}.
        
        Return ONLY the JSON.
      `;

      const response = await ai.models.generateContent({
        contents: prompt,
      });
      
      const text = response.text;
      const data = safeJsonParse<{ kcal?: number; feedback?: string; error?: string }>(text, { error: "Invalid AI response" });
      
      if (data.error) {
        setAiFeedback(data.error);
        setEstimatedCalories(0);
      } else {
        setEstimatedCalories(data.kcal || 0);
        setAiFeedback(data.feedback || null);
      }
    } catch (error) {
      console.error(error);
      setEstimatedCalories(duration * 7.5); // Fallback with adjustment
    } finally {
      setIsEstimating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (name && duration) estimateCalories();
    }, 1200);
    return () => clearTimeout(timer);
  }, [name, duration]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-white dark:bg-slate-950 flex flex-col p-6 overflow-hidden h-[100dvh]">
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-primary/10 flex items-center justify-between sticky top-0 z-10 shrink-0 pt-safe">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full active:scale-90 transition-transform">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="font-bold leading-tight">{t('exercises.otherActivity')}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('exercises.aiSmartEstimation')}</p>
          </div>
        </div>
        <button 
          disabled={!name || estimatedCalories === 0}
          onClick={() => onComplete({
            id: Math.random().toString(36).substr(2, 9),
            type: 'other',
            name,
            duration,
            calories: estimatedCalories,
            date: new Date().toISOString()
          })}
          className={`px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-95 ${(!name || estimatedCalories === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {t('common.save')}
        </button>
      </header>

      <main className="p-6 flex-1 flex flex-col justify-around min-h-0">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('exercises.whatAreYouDoing')}</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('exercises.otherActivityPlaceholder')}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-lg font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{t('exercises.durationMinutes', { minutes: duration })}</label>
            <input 
              type="range"
              min="5"
              max="180"
              step="5"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>5m</span>
              <span>180m</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative overflow-hidden shrink-0">
          {isEstimating && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold text-primary uppercase animate-pulse">{t('exercises.aiThinking')}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('exercises.estimatedBurn')}</p>
              <h3 className="text-3xl sm:text-4xl font-black text-emerald-500">
                {estimatedCalories} <span className="text-sm font-bold opacity-40 text-slate-400">kcal</span>
              </h3>
            </div>
            <div className="size-10 sm:size-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0">
              <Zap className="size-5 sm:size-6" />
            </div>
          </div>

          {aiFeedback && (
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 max-h-24 overflow-y-auto">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">"{aiFeedback}"</p>
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );
}

// --- Modals ---

function RoutineSettingsModal({ onClose, routines, onAddRoutine, onRemoveRoutine, onUpdateRoutine, routineToEdit, onEditRoutine }: any) {
  const { t, appLanguage } = useHealth();
  const today = new Date().toISOString().split('T')[0];
  const todayWeekday = new Date().toLocaleDateString(appLanguage, { weekday: 'long' });
  const activeRoutines = routines.filter((r: any) => {
    if (r.skippedDates?.includes(today)) return false;
    if (r.isExtra) return true;
    if (r.repeat === 'Every day') return true;
    if (r.repeat === 'Monday-Friday' && !['Saturday', 'Sunday'].includes(todayWeekday)) return true;
    if (Array.isArray(r.repeat) && r.repeat.includes(todayWeekday)) return true;
    return false;
  });
  
  const [newRoutineName, setNewRoutineName] = useState(routineToEdit?.name || t(`exercises.${routineToEdit?.type || 'walking'}`));
  const [newRoutineTime, setNewRoutineTime] = useState(routineToEdit?.time || '08:00');
  const [newRoutineType, setNewRoutineType] = useState<'walking' | 'running' | 'cycling' | 'gym' | 'other'>(routineToEdit?.type || 'walking');
  const [repeatType, setRepeatType] = useState<'Every day' | 'Monday-Friday' | 'More'>(
    routineToEdit?.repeat === 'Every day' || routineToEdit?.repeat === 'Monday-Friday' 
      ? routineToEdit.repeat 
      : Array.isArray(routineToEdit?.repeat) ? 'More' : 'Every day'
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(Array.isArray(routineToEdit?.repeat) ? routineToEdit.repeat : []);

  useEffect(() => {
    if (routineToEdit) {
      setNewRoutineName(routineToEdit.name);
      setNewRoutineTime(routineToEdit.time);
      setNewRoutineType(routineToEdit.type);
      if (routineToEdit.repeat === 'Every day' || routineToEdit.repeat === 'Monday-Friday') {
        setRepeatType(routineToEdit.repeat);
        setSelectedDays([]);
      } else if (Array.isArray(routineToEdit.repeat)) {
        setRepeatType('More');
        setSelectedDays(routineToEdit.repeat);
      }
    } else {
      setNewRoutineName(t(`exercises.${newRoutineType}`));
    }
  }, [routineToEdit]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleSelectType = (type: any) => {
    setNewRoutineType(type);
    const typeKeys = ['walking', 'running', 'cycling', 'gym', 'other'];
    const standardNames = typeKeys.map(k => t(`exercises.${k}`));
    if (!newRoutineName.trim() || standardNames.includes(newRoutineName)) {
      setNewRoutineName(t(`exercises.${type}`));
    }
  };

  const handleSave = () => {
    const finalName = newRoutineName.trim() || t(`exercises.${newRoutineType}`);
    
    let repeat: 'Every day' | 'Monday-Friday' | string[] = repeatType === 'More' ? selectedDays : repeatType;
    if (repeatType === 'More' && selectedDays.length === 0) repeat = 'Every day';

    const routineData = {
      name: finalName,
      time: newRoutineTime,
      type: newRoutineType,
      repeat
    };

    if (routineToEdit) {
      onUpdateRoutine(routineToEdit.id, routineData);
    } else {
      onAddRoutine({
        ...routineData,
        completed: false
      });
    }

    onClose();
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold">{t('exercises.routineSettings')}</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <X className="size-6" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Routine Type Selection */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 px-1">{t('exercises.routineType')}</h4>
            <div className="grid grid-cols-3 gap-2">
              {['walking', 'running', 'cycling', 'gym', 'other'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className={`py-3 rounded-2xl text-xs font-bold capitalize transition-all border-2 ${
                    newRoutineType === type
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500'
                  }`}
                >
                  {t(`exercises.${type}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat Selection */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 px-1">{t('exercises.repeat')}</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Every day', label: t('exercises.everyDay') },
                { id: 'Monday-Friday', label: t('exercises.monFri') },
                { id: 'More', label: t('exercises.more') }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setRepeatType(option.id as any)}
                  className={`py-3 rounded-2xl text-xs font-bold transition-all border-2 ${
                    repeatType === option.id 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {repeatType === 'More' && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`py-2 rounded-xl text-[10px] font-bold transition-all border ${
                      selectedDays.includes(day)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {t(`exercises.${day.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Routine Details */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 px-1">{t('exercises.routineDetails')}</h4>
            <input
              type="text"
              placeholder={t('exercises.routineNamePlaceholder')}
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-4 px-5 text-sm font-bold"
            />
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-4 px-5">
              <Clock className="size-5 text-slate-400" />
              <input
                type="time"
                value={newRoutineTime}
                onChange={(e) => setNewRoutineTime(e.target.value)}
                className="bg-transparent border-none text-sm font-bold flex-1 focus:ring-0"
              />
            </div>
          </div>

          {/* Scheduled Routines */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm uppercase tracking-wider text-slate-400 px-1">{t('exercises.scheduledRoutines')}</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
              {activeRoutines.map((r: ExerciseRoutine) => (
                <div key={r.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      {r.type === 'gym' ? <FitnessCenter className="size-5" /> : <Walk className="size-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{r.name}</p>
                      <p className="text-[10px] text-slate-500">{r.time} • {Array.isArray(r.repeat) ? r.repeat.map(d => t(`exercises.${d.toLowerCase()}`)).join(', ') : r.repeat === 'Every day' ? t('exercises.everyDay') : t('exercises.monFri')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveRoutine(r.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <button
                    onClick={() => onEditRoutine(r)}
                    className="p-2 text-slate-300 hover:text-primary transition-colors"
                  >
                    <Edit3 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            {routineToEdit ? t('exercises.updateRoutine') : t('exercises.saveRoutine')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ActivityTrackingModal({ activity, onClose, onSave }: any) {
  const { t, setActiveActivity, activeActivity, profile } = useHealth();
  const [elapsed, setElapsed] = useState(activity.duration || 0);
  const [distance, setDistance] = useState(activity.distance || 0);
  const [isPaused, setIsPaused] = useState(activity.isPaused ?? false);
  const [intensity, setIntensity] = useState(0);
  const [customName, setCustomName] = useState(activity.name || '');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isPaused) {
      // Start Location Tracking for Running/Cycling
      if (activity.type === 'running' || activity.type === 'cycling') {
        locationService.startTracking((data, totalDistance) => {
          setDistance(totalDistance);
        });
      }

      // Start Sensor Tracking for Intensity
      sensorService.startListening();

      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
        // Update Intensity from sensors
        setIntensity(sensorService.getIntensity());

        // Fallback distance if GPS is not moving or not available (mock for walking)
        if (activity.type === 'walking') {
          const speedFactor = 0.0015; // ~5.4 km/h
          setDistance(prev => prev + speedFactor);
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      locationService.stopTracking();
    }

    return () => {
      clearInterval(timerRef.current);
      locationService.stopTracking();
    };
  }, [isPaused, activity.type]);

  // Update global state for background persistence - OMNI-V16: Moved out of setInterval to avoid "update while rendering"
  useEffect(() => {
    if (activeActivity && !isPaused) {
      setActiveActivity({
        ...activeActivity,
        duration: elapsed,
        distance: distance,
        isPaused: false
      });
    }
  }, [elapsed, distance, isPaused]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const avgSpeed = elapsed > 0 ? (distance / (elapsed / 3600)) : 0;
  
  // Net MET calculation to avoid double counting with BMR
  // Formula: (MET - 1) * Weight * (Duration / 3600)
  const multiplier = 1.0;
  const weight = profile.weight || 75;
  
  let calories = 0;
  if (activity.type === 'other') {
    // For 'Other', use intensity-based MET estimation
    const met = Math.max(2.0, Math.min(10.0, (intensity / 10)));
    calories = (elapsed / 3600) * (met - 1) * weight * multiplier;
  } else {
    // For distance-based, estimate MET from speed or use simplified net factor
    // Running ~10 MET, Walking ~3.5 MET, Cycling ~8 MET
    const met = activity.type === 'running' ? 10 : activity.type === 'walking' ? 3.5 : 8;
    calories = (elapsed / 3600) * (met - 1) * weight * multiplier;
  }

  const handleFinish = () => {
    onSave({
      ...activity,
      status: 'completed',
      name: activity.type === 'other' ? (customName || t('exercises.otherActivity')) : activity.name,
      duration: elapsed,
      distance: parseFloat(distance.toFixed(2)),
      avgSpeed: parseFloat(avgSpeed.toFixed(1)),
      calories: Math.round(calories),
      endTime: new Date().toISOString()
    });
  };

  const handleCancel = () => {
    setActiveActivity(null);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-white dark:bg-slate-950 flex flex-col overflow-hidden h-[100dvh]">
      {/* Header - Sticky - Anchored Navigation */}
      <div className="flex justify-between items-center p-4 shrink-0 pt-safe bg-white dark:bg-slate-950 border-b border-primary/5 z-20">
        <button 
          onClick={handleCancel} 
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-transform"
          aria-label={t('exercises.goBack')}
        >
          <ArrowLeft className="size-6" />
        </button>

        <div className="text-center">
          {activity.type === 'other' ? (
            <input 
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t('exercises.exerciseNamePlaceholder')}
              className="text-sm sm:text-base font-bold bg-transparent border-b border-primary/20 focus:border-primary outline-none w-32 text-center"
              autoFocus
            />
          ) : (
            <h3 className="text-sm sm:text-base font-bold capitalize leading-tight">{t(`exercises.${activity.type}`)}</h3>
          )}
          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('exercises.liveTracking')}</p>
        </div>

        <button 
          onClick={onClose} 
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 active:scale-90 transition-transform"
          aria-label={t('exercises.minimize')}
          title={t('exercises.minimizeToBackground')}
        >
          <X className="size-6" />
        </button>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex flex-col items-center p-6 space-y-6 min-h-full">
          {/* Circular Timer - Dynamic Scale (30% of screen height) */}
          <div className="relative h-[30dvh] aspect-square flex items-center justify-center shrink-0 mt-2">
            <div className="absolute inset-0 rounded-full border-[6px] sm:border-[10px] border-slate-100 dark:border-slate-900"></div>
            <svg className="absolute inset-0 size-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray="251"
                strokeDashoffset={251 - (elapsed % 60 / 60 * 251)}
                className={`text-primary transition-all duration-1000 ${!isPaused ? 'opacity-100' : 'opacity-30'}`}
              />
            </svg>
            
            <div className="text-center z-10">
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-0.5">{t('exercises.timeElapsed')}</p>
              <h2 className="text-2xl sm:text-4xl font-black tabular-nums text-slate-900 dark:text-white">{formatTime(elapsed)}</h2>
            </div>
          </div>

          {/* Stats Grid - Side by side */}
          <div className="grid grid-cols-2 w-full gap-2 sm:gap-4 max-w-sm">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-4 sm:size-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Walk className="size-3" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('exercises.distance')}</span>
              </div>
              <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white">
                {distance.toFixed(2)} <span className="text-[10px] font-bold opacity-40">km</span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-4 rounded-[1.2rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-4 sm:size-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <Zap className="size-3" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('exercises.calories')}</span>
              </div>
              <p className="text-base sm:text-2xl font-black text-emerald-500">
                {Math.round(calories)} <span className="text-[10px] font-bold opacity-40 text-slate-400">kcal</span>
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <Timer className="size-4" />
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{t('exercises.avgSpeed')}</span>
                <p className="text-base font-black text-slate-900 dark:text-white">{avgSpeed.toFixed(1)} <span className="text-[10px] font-bold opacity-40">km/h</span></p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-3"></div>
            <div className="flex-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">{t('exercises.intensity')}</span>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(i => {
                  const level = intensity / 20;
                  return (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= level ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Visual Padding for Scroll */}
          <div className="h-20 shrink-0"></div>
        </div>
      </div>

      {/* Controls - Fixed at bottom above nav */}
      <div className="shrink-0 p-6 bg-white dark:bg-slate-950 border-t border-primary/5 pb-safe z-20 mb-6">
        <div className="flex items-center justify-center gap-6 max-w-md mx-auto">
          <button 
            onClick={() => setShowCancelConfirm(true)}
            className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center active:scale-95 transition-all"
            title={t('exercises.cancelActivity')}
          >
            <Trash2 className="size-6" />
          </button>

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`size-16 sm:size-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
              isPaused 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 shadow-slate-200/50 dark:shadow-none'
            }`}
          >
            {isPaused ? <Play className="size-6 sm:size-8 fill-current" /> : <Pause className="size-6 sm:size-8 fill-current" />}
          </button>
          
          <button 
            onClick={handleFinish}
            className="size-16 sm:size-20 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
            title={t('exercises.finishActivity')}
          >
            <Check className="size-7 sm:size-10" />
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Overlay */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-xs text-center shadow-2xl"
            >
              <div className="size-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="size-8" />
              </div>
              <h3 className="text-xl font-black mb-2">{t('exercises.discardActivity')}</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">{t('exercises.discardActivityDesc')}</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-sm"
                >
                  {t('exercises.keep')}
                </button>
                <button 
                  onClick={handleCancel}
                  className="py-4 bg-red-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20"
                >
                  {t('exercises.discard')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GymLogModal({ onClose, onSave, initialExercise, initialLog }: { onClose: () => void, onSave: (log: any) => void, initialExercise?: any, initialLog?: any }) {
  const { t, profile, gymLogs, deleteGymLog } = useHealth();
  const [selectedExercise, setSelectedExercise] = useState<GymExercise | null>(initialExercise || null);
  const [sets, setSets] = useState<GymSet[]>(initialLog?.sets || [{ weight: 0, reps: 0 }]);
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);

  // Reactive Time & Volume Calculation for feedback (OMNI-V7)
  const stats = useMemo(() => {
    if (!selectedExercise) return { volume: 0, time: 0 };
    
    let volume = 0;
    let timeSeconds = 0;

    sets.forEach(set => {
      const reps = set.reps || 0;
      const weight = set.weight || 0;
      
      // OMNI-V7 Formulas
      volume += (weight * reps);
      timeSeconds += (reps * 4) + 90;
    });

    return {
      volume,
      time: Math.round(timeSeconds / 60)
    };
  }, [sets, selectedExercise]);

  const handleAddSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets([...sets, { weight: lastSet ? lastSet.weight : 0, reps: lastSet ? lastSet.reps : 0 }]);
  };

  const handleUpdateSet = (index: number, field: keyof GymSet, value: number) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const handleSave = () => {
    if (!selectedExercise) return;
    
    // OMNI-V15: Prevent duplicate logs for today (unless editing)
    const today = new Date().toDateString();
    if (!initialLog && gymLogs.some(log => log.exerciseName.toLowerCase() === selectedExercise.name.toLowerCase() && new Date(log.date).toDateString() === today)) {
      alert(t('exercises.alreadyLoggedMsg', { name: selectedExercise.name }));
      return;
    }
    
    const weight = profile.weight || 75;
    const lbm = profile.leanBodyMass || (weight * (1 - ((profile.bodyFatPercentage || 20) / 100)));

    // OMNI-V7 Intensity Factors (Fm)
    const mg = selectedExercise.muscleGroup;
    let fm = 0.5; // Arms/Core
    if (['Legs', 'Back', 'Lower Body', 'Full Body'].includes(mg)) fm = 1.0; // Legs/Back
    else if (['Chest', 'Shoulders'].includes(mg)) fm = 0.8; // Chest/Shoulders

    // 3. Reactive Time Motor & Volume
    let totalVolume = 0;
    let totalTimeSeconds = 0;

    sets.forEach(set => {
      const reps = set.reps || 0;
      const load = set.weight || 0;
      
      // OMNI-V7 Formulas
      totalVolume += (load * reps);
      totalTimeSeconds += (reps * 4) + 90;
    });

    const totalTimeHours = totalTimeSeconds / 3600;
    const durationMinutes = Math.round(totalTimeSeconds / 60);

    // 4. Intensity (IER & Dynamic MET)
    // IER = Accumulated_Total_Volume / (LBM * Total_Time_h)
    const safeTimeHours = Math.max(totalTimeHours, 0.01);
    const safeLbm = Math.max(lbm, 30);
    const ier = totalVolume / (safeLbm * safeTimeHours);
    
    let baseMet = 3.5;
    if (ier >= 80) baseMet = 9.5;
    else if (ier >= 50) baseMet = 7.5;
    else if (ier >= 20) baseMet = 5.5;

    // MET_Final = 1.0 + (MET_Base * Fm)
    const finalMet = 1.0 + (baseMet * fm);

    // 5. Calorie Calculation
    // Net Calories = (MET_Final - 1.0) * Weight * Total_Time_h
    let caloriesBurned = (finalMet - 1.0) * weight * totalTimeHours;
    
    // Safety Cap: 12 kcal/min
    const maxCalories = durationMinutes * 12;
    if (caloriesBurned > maxCalories) caloriesBurned = maxCalories;

    onSave({
      date: new Date().toISOString(),
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      muscleGroup: selectedExercise.muscleGroup,
      sets,
      caloriesBurned: Math.round(caloriesBurned),
      duration: durationMinutes,
      totalVolume,
      isUnilateral: false // Legacy field, always false in V7
    });
    
    console.log(`OMNI-V7 Log: Volume: ${totalVolume}kg | Time: ${durationMinutes}min | MET: ${finalMet.toFixed(2)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold">{selectedExercise ? t('exercises.logSets') : t('exercises.selectExercise')}</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <X className="size-6" />
          </button>
        </div>

        {!selectedExercise ? (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
              {['All', 'Lower Body', 'Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Full Body'].map(group => (
                <button 
                  key={group}
                  onClick={() => setMuscleGroup(group === 'All' ? null : group)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                    (muscleGroup === group || (group === 'All' && !muscleGroup))
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {group === 'All' ? t('exercises.all') : t(`exercises.${group.charAt(0).toLowerCase() + group.slice(1).replace(' ', '')}`)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3">
              {EXERCISE_LIBRARY
                .filter(ex => !muscleGroup || ex.muscleGroup === muscleGroup)
                .map(ex => (
                  <button 
                    key={ex.id}
                    onClick={() => setSelectedExercise(ex)}
                    className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4 hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="size-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-xl shadow-sm">
                      {ex.illustration}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{t(`exercises.${ex.name.charAt(0).toLowerCase() + ex.name.slice(1).replace(/ /g, '')}`)}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t(`exercises.${ex.muscleGroup.toLowerCase().replace(' ', '')}`)}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl">
              <div className="size-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                {selectedExercise.illustration}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg leading-tight">{t(`exercises.${selectedExercise.name.charAt(0).toLowerCase() + selectedExercise.name.slice(1).replace(/ /g, '')}`)}</h4>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">{t(`exercises.${selectedExercise.muscleGroup.toLowerCase().replace(' ', '')}`)}</p>
                <p className="text-[10px] text-slate-500 mt-1">{selectedExercise.equipment}</p>
              </div>
              {!initialExercise && (
                <button onClick={() => setSelectedExercise(null)} className="text-xs font-bold text-primary uppercase">{t('exercises.change')}</button>
              )}
            </div>

            <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl border border-primary/10 mb-4">
              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                <span className="font-bold text-primary">{t('exercises.tip')}:</span> {t('exercises.unilateralTip')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('exercises.volume')}</span>
                <span className="text-xl font-black text-primary">{stats.volume.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">{t('exercises.kg').toUpperCase()}</span></span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('exercises.estTime')}</span>
                <span className="text-xl font-black text-primary">{stats.time} <span className="text-[10px] font-bold text-slate-400">{t('exercises.min').toUpperCase()}</span></span>
              </div>
            </div>

            <div className="space-y-4">
              {sets.map((set, index) => (
                <div key={index} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <div className="size-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('exercises.weightLabel')}</label>
                      <input 
                        type="number" 
                        value={isNaN(set.weight) ? '' : set.weight} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleUpdateSet(index, 'weight', isNaN(val) ? 0 : val);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl py-2 px-3 text-sm font-bold"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('exercises.repsLabel')}</label>
                      <input 
                        type="number" 
                        value={isNaN(set.reps) ? '' : set.reps} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          handleUpdateSet(index, 'reps', isNaN(val) ? 0 : val);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl py-2 px-3 text-sm font-bold"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {sets.length > 1 && (
                    <button 
                      onClick={() => setSets(sets.filter((_, i) => i !== index))}
                      className="text-slate-300 hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <button 
                onClick={handleAddSet}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 font-bold text-sm hover:border-primary hover:text-primary transition-all"
              >
                + {t('exercises.addSet')}
              </button>
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              {t('exercises.finishExercise')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
