import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { HealthRecord, Notification, CalendarEvent, UserProfile, HealthGoal, Meal, WaterLog, ExerciseRoutine, GymWorkoutLog, ActivityTracking, HistoryRecord, HistoryCategory, StressReportRecord, MentalHealthResponse, GymWorkoutSession, PerformanceSnapshot, RadarChartAxes, AIBiofeedbackReport, RoutineVitalsRecord, AdherenceLog, AccentColor, ACCENT_COLORS } from '../types';
import { cleanAiResponse, safeJsonParse, generateMedicationInsights, getGoogleGenAI } from '../lib/ai';
import { anonymizeProfile } from '../lib/lgpd';
import { Language, getTranslation } from '../lib/i18n';
import { safeLocalStorage } from '../lib/utils';
import { loadAIProviderConfig, saveAIProviderConfig, type AIProviderConfig } from '../lib/aiProviders';

import { sensorService } from '../services/sensorService';
import { googleSignIn, logoutGoogle, createGoogleEvent, deleteGoogleEvent, fetchGoogleEvents, setAccessToken } from '../services/googleCalendarService';
import SystemPermissionsModal from '../components/SystemPermissionsModal';

interface HealthContextType {
  isPermissionsModalOpen: boolean;
  openPermissionsModal: () => void;
  closePermissionsModal: () => void;
  records: HealthRecord[];
  notifications: Notification[];
  events: CalendarEvent[];
  profile: UserProfile;
  avatar: string | null;
  appLanguage: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  goals: HealthGoal[];
  meals: Meal[];
  waterLogs: WaterLog[];
  routines: ExerciseRoutine[];
  gymLogs: GymWorkoutLog[];
  activities: ActivityTracking[];
  activeActivity: ActivityTracking | null;
  setActiveActivity: (activity: ActivityTracking | null) => void;
  historyRecords: HistoryRecord[];
  adherenceLogs: AdherenceLog[];
  toggleAdherence: (medicationId: string, date: string, time: string, status: 'taken' | 'missed' | 'pending') => void;
  isDayEnded: boolean;
  darkMode: boolean;
  isSyncing: boolean;
  googleUser: any | null;
  googleAccessToken: string | null;
  connectGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
  syncGoogleCalendar: () => Promise<void>;
  logout: () => Promise<void>;
  dismissedNotificationIds: string[];
  sensorSteps: number;
  updateSensorSteps: (steps: number) => void;
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  clearAllNotifications: () => void;
  addRecord: (metric: HealthRecord['metric'], value: number) => void;
  updateRecord: (id: string, value: number) => void;
  deleteRecord: (id: string) => void;
  getTodayValue: (metric: HealthRecord['metric']) => number;
  getHistory: (metric: HealthRecord['metric']) => HealthRecord[];
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void | Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void | Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateGoal: (id: string, goal: Partial<HealthGoal>) => void;
  setAvatar: (avatar: string | null) => void;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  // Meal CRUD
  addMeal: (meal: Omit<Meal, 'id'>) => void;
  updateMeal: (id: string, meal: Partial<Meal>) => void;
  deleteMeal: (id: string) => void;
  // Water CRUD
  addWaterLog: (log: Omit<WaterLog, 'id'>) => void;
  updateWaterLog: (id: string, log: Partial<WaterLog>) => void;
  deleteWaterLog: (id: string) => void;
  // Routine CRUD
  addRoutine: (routine: Omit<ExerciseRoutine, 'id'>) => void;
  updateRoutine: (id: string, routine: Partial<ExerciseRoutine>) => void;
  deleteRoutine: (id: string) => void;
  // Gym Log CRUD
  addGymLog: (log: Omit<GymWorkoutLog, 'id'>) => void;
  updateGymLog: (id: string, log: Partial<GymWorkoutLog>) => void;
  deleteGymLog: (id: string) => void;
  // Activity Tracking CRUD
  addActivity: (activity: ActivityTracking) => void;
  updateActivity: (id: string, activity: Partial<ActivityTracking>) => void;
  deleteActivity: (id: string) => void;
  // History Records CRUD
  addHistoryRecord: (record: Omit<HistoryRecord, 'id'>) => Promise<void>;
  updateHistoryRecord: (id: string, record: Partial<HistoryRecord>) => Promise<void>;
  deleteHistoryRecord: (id: string) => void;
  // Helpers
  getDailyWaterTarget: () => number;
  getFatLossEstimation: () => { deficit: number; fatLossKg: number; status: 'deficit' | 'maintenance' | 'surplus'; totalBurned: number };
  getDailyCalorieTarget: () => number;
  calculateBMR: () => number;
  getProteinTarget: () => number;
  totalCaloriesBurned: number;
  totalExerciseCalories: number;
  totalDailyExpenditure: number;
  mentalHealthScore: number;
  endDay: () => void;
  reopenDay: () => void;
  addMentalHealthResponse: (response: Omit<MentalHealthResponse, 'id'>) => void;
  requestSensorPermission: () => Promise<boolean>;
  performanceSnapshots: PerformanceSnapshot[];
  generateDailyPerformanceSnapshot: () => Promise<PerformanceSnapshot>;
  getPerformanceSnapshotByDate: (date: string) => PerformanceSnapshot | undefined;
  exportData: () => string;
  clearNutritionMediaCache: () => void;
  generateDebugLog: () => void;
  aiProviderConfig: AIProviderConfig | null;
  saveAiProviderConfig: (config: AIProviderConfig | null) => void;
  isAiConfigured: boolean;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

const DEFAULT_GOALS: HealthGoal[] = [
  // Performance
  { id: 'g1', category: 'Performance', title: 'Muscle Gain', description: 'Focus on hypertrophy and strength training.', selected: false, type: 'toggle' },
  { id: 'g2', category: 'Performance', title: 'Endurance Improvement', description: 'Improve running or cycling stamina.', selected: false, type: 'toggle' },
  { id: 'g3', category: 'Performance', title: 'Flexibility and Mobility', description: 'Reduce body stiffness and improve range of motion.', selected: false, type: 'toggle' },
  { id: 'g5', category: 'Performance', title: 'Training for Specific Event', description: 'Preparation for competitions, fitness tests, or races.', selected: false, type: 'numeric', targetValue: 4, unit: 'days/week' },
  // Nutrition
  { id: 'g6', category: 'Nutrition', title: 'Food Reeducation', description: 'Focus on food quality instead of restrictive dieting.', selected: false, type: 'input', inputValue: '' },
  { id: 'g7', category: 'Nutrition', title: 'Fat Loss', description: 'Strategic caloric deficit with focus on health.', selected: false, type: 'numeric', targetValue: 500, unit: 'kcal/day' },
  { id: 'g8', category: 'Nutrition', title: 'Increase Protein Intake', description: 'Track macros to reach daily protein target.', selected: true, type: 'options', options: ['Increase Protein Intake', 'Maintain Protein Intake', 'Do Not Track Protein Goal'], selectedOption: 'Maintain Protein Intake' },
  { id: 'g9', category: 'Nutrition', title: 'Reduce Ultra-Processed Foods', description: 'Decrease sugar and industrialized foods.', selected: false, type: 'toggle' },
  { id: 'g10', category: 'Nutrition', title: 'Optimized Hydration', description: 'Set and maintain a daily water intake goal.', selected: true, type: 'toggle' },
  // Well-being
  { id: 'g11', category: 'Well-being', title: 'Sleep Hygiene', description: 'Sleep a specific number of hours or improve sleep quality.', selected: false, type: 'time', timeValue: '22:00' },
  { id: 'g12', category: 'Well-being', title: 'Stress Management', description: 'Meditation, breathing practices, or active breaks.', selected: false, type: 'toggle' },
  { id: 'g13', category: 'Well-being', title: 'Addiction Reduction', description: 'Reduce caffeine, alcohol, or tobacco consumption.', selected: false, type: 'toggle' },
  { id: 'g14', category: 'Well-being', title: 'Longevity', description: 'Focus on long-term health markers.', selected: false, type: 'toggle' },
  { id: 'g15', category: 'Well-being', title: 'Mental Health', description: 'Encourage hobbies, relaxation, and digital detox.', selected: false, type: 'toggle' },
];

export function HealthProvider({ children }: { children: React.ReactNode }) {
  // Safe clean cache routine on initialization to clear old test states
  useState(() => {
    const CLEANUP_KEY = 'real_life_track_v2_cleaned';
    if (typeof window !== 'undefined' && !safeLocalStorage.getItem(CLEANUP_KEY)) {
      const keysToClean = [
        'health_profile',
        'health_records',
        'health_notifications',
        'health_events',
        'health_goals',
        'health_meals',
        'health_water',
        'health_routines',
        'health_gym_logs',
        'health_activities',
        'health_active_activity',
        'health_history_records',
        'health_mental_health_responses',
        'health_performance_snapshots',
        'health_adherence_logs',
        'health_day_ended',
        'health_dismissed_notifications'
      ];
      keysToClean.forEach(k => safeLocalStorage.removeItem(k));
      safeLocalStorage.setItem(CLEANUP_KEY, 'true');
    }
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [records, setRecords] = useState<HealthRecord[]>(() => {
    return safeLocalStorage.getParsed<HealthRecord[]>('health_records', []);
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    return safeLocalStorage.getParsed<Notification[]>('health_notifications', []);
  });

  const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>(() => {
    return safeLocalStorage.getParsed<AdherenceLog[]>('health_adherence_logs', []);
  });

  useEffect(() => {
    safeLocalStorage.setItem('health_adherence_logs', JSON.stringify(adherenceLogs));
  }, [adherenceLogs]);

  const toggleAdherence = useCallback((medicationId: string, date: string, time: string, status: 'taken' | 'missed' | 'pending') => {
    setAdherenceLogs(prev => {
      const id = `${medicationId}-${date}-${time}`;
      const existing = prev.find(l => l.id === id);
      if (existing) {
        if (existing.status === status) {
          return prev.filter(l => l.id !== id);
        }
        return prev.map(l => l.id === id ? { ...l, status } : l);
      }
      return [...prev, { id, medicationId, date, time, status }];
    });
  }, []);

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    return safeLocalStorage.getParsed<CalendarEvent[]>('health_events', []);
  });

  const DEFAULT_GOOGLE_USER = {
    uid: 'google-user-local-default',
    displayName: 'Usuário RLT',
    email: 'usuario.rlt@gmail.com',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    emailVerified: true,
  };

  const [googleUser, setGoogleUser] = useState<any | null>(() => {
    return safeLocalStorage.getParsed<any>('google_user', DEFAULT_GOOGLE_USER);
  });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return safeLocalStorage.getItem('google_access_token') || 'rlt_local_google_token_active';
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (googleAccessToken) {
      setAccessToken(googleAccessToken);
    }
  }, [googleAccessToken]);

  const [aiProviderConfig, setAiProviderConfig] = useState<AIProviderConfig | null>(() => {
    return loadAIProviderConfig();
  });

  const saveAiProviderConfig = (config: AIProviderConfig | null) => {
    saveAIProviderConfig(config);
    setAiProviderConfig(config && config.apiKey.trim() ? config : null);
  };

  const isAiConfigured = !!aiProviderConfig;

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = safeLocalStorage.getItem('health_profile');
    const hasCompletedSaved = safeLocalStorage.getItem('hasCompletedOnboarding');
    const defaultProfile = {
      name: 'Usuário RLT',
      email: 'usuario.rlt@gmail.com',
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      onboardingCompleted: true,
      age: 30,
      weight: 75,
      height: 175,
      bodyFatPercentage: 18,
      sex: 'Male',
      stepGoal: 8000,
      workActivityType: 'Sedentary',
      sleepQuality: 'Good',
      units: 'metric',
      language: 'pt-BR',
      occupation: '',
      biometricEnabled: false,
    };
    
    let parsed: any = null;
    try {
      parsed = saved ? JSON.parse(saved) : null;
    } catch {
      parsed = null;
    }

    let onboardingCompleted = true;
    if (hasCompletedSaved !== null) {
      onboardingCompleted = hasCompletedSaved === 'true';
    } else if (parsed) {
      onboardingCompleted = parsed.onboardingCompleted !== undefined ? !!parsed.onboardingCompleted : true;
    }

    if (!parsed) return { ...defaultProfile, onboardingCompleted } as UserProfile;
    return { ...defaultProfile, ...parsed, onboardingCompleted } as UserProfile;
  });

  const [appLanguage, setAppLanguage] = useState<Language>(() => {
    const saved = safeLocalStorage.getItem('app_language');
    if (saved) return saved as Language;
    return (profile.language as Language) || 'pt-BR';
  });

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return getTranslation(appLanguage, key, params);
  }, [appLanguage]);

  useEffect(() => {
    safeLocalStorage.setItem('app_language', appLanguage);
  }, [appLanguage]);

  const [goals, setGoals] = useState<HealthGoal[]>(() => {
    return safeLocalStorage.getParsed<HealthGoal[]>('health_goals', DEFAULT_GOALS);
  });

  const [meals, setMeals] = useState<Meal[]>(() => {
    return safeLocalStorage.getParsed<Meal[]>('health_meals', []);
  });

  const [waterLogs, setWaterLogs] = useState<WaterLog[]>(() => {
    return safeLocalStorage.getParsed<WaterLog[]>('health_water', []);
  });

  const [routines, setRoutines] = useState<ExerciseRoutine[]>(() => {
    const saved = safeLocalStorage.getItem('health_routines');
    const defaultRoutines: ExerciseRoutine[] = [
      { id: 'step-goal-permanent', name: 'Step Goal', time: 'All Day', completed: false, type: 'steps', repeat: 'Every day' },
    ];
    if (!saved) return defaultRoutines;
    let parsed: ExerciseRoutine[] = [];
    try {
      parsed = JSON.parse(saved);
    } catch {
      return defaultRoutines;
    }
    
    // Migration: Ensure permanent step goal exists
    if (!parsed.some((r: any) => r.id === 'step-goal-permanent')) {
      parsed = [defaultRoutines[0], ...parsed];
    }
    
    return parsed;
  });

  const [sensorSteps, setSensorSteps] = useState(sensorService.getSteps());
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  const openPermissionsModal = () => setIsPermissionsModalOpen(true);
  const closePermissionsModal = () => setIsPermissionsModalOpen(false);

  useEffect(() => {
    // Show system permissions modal on app load if not prompted yet
    const prompted = safeLocalStorage.getItem('health_permissions_prompted');
    if (!prompted) {
      const timer = setTimeout(() => {
        setIsPermissionsModalOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateSensorSteps = (newSteps: number) => {
    sensorService.setSteps(newSteps);
    setSensorSteps(newSteps);
  };

  useEffect(() => {
    sensorService.startListening((steps) => {
      setSensorSteps(steps);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const current = sensorService.getSteps();
        setSensorSteps(current);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      sensorService.stopListening();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const requestSensorPermission = async () => {
    return await sensorService.requestPermission();
  };

  const [gymLogs, setGymLogs] = useState<GymWorkoutLog[]>(() => {
    return safeLocalStorage.getParsed<GymWorkoutLog[]>('health_gym_logs', []);
  });

  const [activities, setActivities] = useState<ActivityTracking[]>(() => {
    return safeLocalStorage.getParsed<ActivityTracking[]>('health_activities', []);
  });

  const [activeActivity, setActiveActivity] = useState<ActivityTracking | null>(() => {
    return safeLocalStorage.getParsed<ActivityTracking | null>('health_active_activity', null);
  });

  useEffect(() => {
    safeLocalStorage.setItem('health_active_activity', JSON.stringify(activeActivity));
  }, [activeActivity]);

  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(() => {
    const saved = safeLocalStorage.getItem('health_history_records');
    const defaultRecords: HistoryRecord[] = [];

    if (!saved) return defaultRecords;
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(saved);
    } catch {
      return defaultRecords;
    }
    
    // Migration for notes: string -> Note[]
    return parsed.map((r: any) => {
      if (typeof r.notes === 'string') {
        return {
          ...r,
          notes: r.notes ? [{ id: Math.random().toString(36).substr(2, 9), date: r.date || new Date().toISOString(), text: r.notes }] : []
        };
      }
      return r;
    });
  });

  const continuousMeds = useMemo(() => 
    historyRecords.filter(r => r.category === 'Continuous Medication'),
    [historyRecords]
  );

  const routineVitals = useMemo(() => 
    historyRecords.filter(r => r.category === 'Routine Vitals'),
    [historyRecords]
  );

  const getDailyWaterTarget = useCallback(() => {
    const weight = profile.weight || 70;
    const bf = profile.bodyFatPercentage || 20;
    const lbm = weight * (1 - (bf / 100));
    
    // OMNI-V15: Dynamic Hydration based on LBM (more metabolic active tissue = more water)
    // Base: 35ml per kg of total weight + extra for LBM
    let target = (weight * 35) / 1000; 
    if (lbm > 60) target += 0.5; // Extra for high LBM

    // AI Adjustment based on stimulants/substances
    const stimulants = profile.stimulantConsumption?.toLowerCase() || '';
    if (stimulants.includes('coffee')) target += 0.3; // Increased penalty V15
    if (stimulants.includes('creatine')) target += 0.6; // Increased V15
    if (stimulants.includes('alcohol')) target += 0.7; // Increased V15
    if (stimulants.includes('testosterone')) target += 0.4;
    
    // Adjustment based on today's meals
    const today = new Date().toDateString();
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === today);
    
    todayMeals.forEach(meal => {
      const desc = meal.description.toLowerCase();
      if (desc.includes('salty') || desc.includes('sodium') || desc.includes('chips') || desc.includes('fast food')) {
        target += 0.4; // Increase for salty foods V15
      }
      if (desc.includes('coffee') || desc.includes('espresso') || desc.includes('caffeine')) {
        target += 0.3;
      }
      if (desc.includes('alcohol') || desc.includes('beer') || desc.includes('wine') || desc.includes('whiskey')) {
        target += 0.6;
      }
    });

    return target;
  }, [profile, meals]);

  const calculateBMR = useCallback(() => {
    const weight = profile.weight || 75;
    const height = profile.height || 180;
    const age = profile.age || 30;
    const sex = profile.sex || 'Male';
    const gender = sex.toLowerCase();
    const bf = profile.bodyFatPercentage;

    let bmr = 0;

    // OMNI-V7 BMR Logic
    if (bf !== undefined && bf > 0) {
      // Katch-McArdle: TMB = 370 + (21.6 * LBM)
      const lbm = weight * (1 - (bf / 100));
      bmr = 370 + (21.6 * lbm);
    } else {
      // Mifflin-St Jeor for Adults
      const adjustment = gender === 'male' ? 5 : -161;
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + adjustment;
    }

    // AI Smart Scan Metabolic Adjustments
    const metabolicAdjustments = historyRecords.filter(r => r.metabolicAdjustment).length;
    if (metabolicAdjustments > 0) {
      const adjustmentFactor = 1 + Math.min(metabolicAdjustments * 0.05, 0.15);
      bmr *= adjustmentFactor;
    }

    return bmr;
  }, [profile, historyRecords]);

  const mentalHealthScore = useMemo(() => {
    const stressReports = historyRecords.filter(r => r.category === 'Stress Reports') as StressReportRecord[];
    if (stressReports.length === 0) return 100;

    // Get reports from last 7 days
    const last7Days = stressReports.filter(r => {
      const date = new Date(r.date);
      const now = new Date();
      return (now.getTime() - date.getTime()) <= (7 * 24 * 60 * 60 * 1000);
    });

    if (last7Days.length === 0) return 100;

    const avgStress = last7Days.reduce((acc, curr) => acc + curr.stressLevel, 0) / last7Days.length;
    // Score is inverse of stress (10 stress = 0 score, 1 stress = 100 score)
    const score = Math.max(0, Math.min(100, 100 - (avgStress - 1) * 11));
    return Math.round(score);
  }, [historyRecords]);

  const getDailyCalorieTarget = useCallback(() => {
    const bmr = calculateBMR();
    
    // 2. Fator de Atividade (Work Activity Type)
    let activityMultiplier = 1.2; // Sedentary default
    if (profile.workActivityType === 'Active') activityMultiplier = 1.375;
    if (profile.workActivityType === 'Very Active') activityMultiplier = 1.55;
    
    const baseTDEE = bmr * activityMultiplier;
    
    // 3. EXERCISES (Gasto Extra de Daily Routines)
    const today = new Date(selectedDate + 'T12:00:00').toDateString();
    
    // Calorias de rotinas completadas hoje (incluindo as "Extra Activities")
    const routineBurned = routines
      .filter(r => r.completed && r.lastCompletedDate && new Date(r.lastCompletedDate).toDateString() === today)
      .reduce((sum, r) => sum + (r.calories || 0), 0);

    // Cardio/Other activities (manual tracking)
    // We filter out activities that are already represented as routines to avoid double counting
    // Since all manual activities are now injected as routines, we primarily rely on routineBurned
    const exerciseBurned = activities
      .filter(a => {
        const isToday = new Date(a.date || a.startTime).toDateString() === today;
        // Check if this activity is already accounted for in routines (by name and calories on same day)
        const isAlreadyInRoutines = routines.some(r => 
          r.completed && 
          r.name === a.name && 
          r.calories === a.calories && 
          r.lastCompletedDate && 
          new Date(r.lastCompletedDate).toDateString() === today
        );
        return isToday && !isAlreadyInRoutines;
      })
      .reduce((sum, a) => sum + (a.calories || 0), 0);

    // Gym workouts
    const gymBurned = gymLogs
      .filter(g => new Date(g.date).toDateString() === today)
      .reduce((sum, g) => sum + (g.caloriesBurned || 0), 0);

    // 4. Superávit/Déficit (Health Goals)
    const fatLossGoal = goals.find(g => g.id === 'g7' && g.selected);
    const muscleGainGoal = goals.find(g => g.id === 'g1' && g.selected);
    
    let goalAdjustment = 0;
    if (fatLossGoal) {
      goalAdjustment = -(fatLossGoal.targetValue || 500); 
    } else if (muscleGainGoal) {
      goalAdjustment = 300; 
    }
    
    // Medical conditions adjustment
    const medicalConditions = historyRecords.filter(r => r.category === 'Medical History' && (r as any).status === 'Active');
    medicalConditions.forEach(c => {
      const name = (c as any).conditionName.toLowerCase();
      if (name.includes('hypothyroidism')) goalAdjustment -= 200;
      if (name.includes('hyperthyroidism')) goalAdjustment += 200;
    });

    // Total GASTO Target = Base + Atividade + Rotinas + Exercícios + Gym + Ajuste de Meta
    // Note: Exercise, routine and gym calories are calculated as NET calories. Steps burned are tracked under burned_calories.
    return baseTDEE + routineBurned + exerciseBurned + gymBurned + goalAdjustment;
  }, [profile, activities, routines, gymLogs, goals, historyRecords, calculateBMR, selectedDate]);

  const [performanceSnapshots, setPerformanceSnapshots] = useState<PerformanceSnapshot[]>(() => {
    return safeLocalStorage.getParsed<PerformanceSnapshot[]>('health_performance_snapshots', []);
  });

  const [mentalHealthResponses, setMentalHealthResponses] = useState<MentalHealthResponse[]>(() => {
    return safeLocalStorage.getParsed<MentalHealthResponse[]>('health_mental_health_responses', []);
  });

  useEffect(() => {
    safeLocalStorage.setItem('health_performance_snapshots', JSON.stringify(performanceSnapshots));
  }, [performanceSnapshots]);

  useEffect(() => {
    safeLocalStorage.setItem('health_mental_health_responses', JSON.stringify(mentalHealthResponses));
  }, [mentalHealthResponses]);

  const getTodayValue = useCallback((metric: HealthRecord['metric']) => {
    const today = new Date(selectedDate + 'T12:00:00').toDateString();
    
    if (metric === 'calories') {
      const intake = meals
        .filter(m => new Date(m.date).toDateString() === today)
        .reduce((sum, m) => sum + m.calories, 0);
      const burned = getTodayValue('burned_calories');
      return intake - burned;
    }

    if (metric === 'burned_calories') {
      const routineBurned = routines
        .filter(r => r.completed && r.lastCompletedDate && new Date(r.lastCompletedDate).toDateString() === today)
        .reduce((sum, r) => sum + (r.calories || 0), 0);

      const activityBurned = activities
        .filter(a => {
          const isToday = new Date(a.endTime || a.startTime || a.date).toDateString() === today;
          const isCompleted = a.status === 'completed' || !!a.endTime;
          const isAlreadyInRoutines = routines.some(r => 
            r.completed && 
            r.name === a.name && 
            r.calories === a.calories && 
            r.lastCompletedDate && 
            new Date(r.lastCompletedDate).toDateString() === today
          );
          return isToday && isCompleted && !isAlreadyInRoutines;
        })
        .reduce((sum, a) => sum + (a.calories || 0), 0);
      
      const gymBurned = gymLogs
        .filter(g => new Date(g.date).toDateString() === today)
        .reduce((sum, g) => sum + (g.caloriesBurned || 0), 0);
      
      const stepsToday = today === new Date().toDateString() 
        ? sensorSteps 
        : records
            .filter(r => r.metric === 'steps' && new Date(r.date).toDateString() === today)
            .reduce((sum, r) => sum + r.value, 0);
      // Updates 4 kcal for every 100 steps performed
      const stepsBurned = Math.floor(stepsToday / 100) * 4;
          
      return routineBurned + activityBurned + gymBurned + stepsBurned;
    }

    if (metric === 'net_calories') {
      const intake = meals
        .filter(m => new Date(m.date).toDateString() === today)
        .reduce((sum, m) => sum + m.calories, 0);
      const burned = getTodayValue('burned_calories');
      return intake - burned;
    }
    
    if (metric === 'protein') {
      return meals
        .filter(m => new Date(m.date).toDateString() === today)
        .reduce((sum, m) => sum + m.protein, 0);
    }
    
    if (metric === 'hydration') {
      return waterLogs
        .filter(w => new Date(w.date).toDateString() === today)
        .reduce((sum, w) => sum + w.amount, 0) / 1000; // Convert ml to L
    }

    if (metric === 'steps') {
      // If it's today, return sensor steps, otherwise return recorded steps
      if (today === new Date().toDateString()) {
        return sensorSteps;
      }
      return records
        .filter(r => r.metric === 'steps' && new Date(r.date).toDateString() === today)
        .reduce((sum, r) => sum + r.value, 0);
    }

    if (metric === 'healthScore') {
      // 1. Steps Score (20%)
      const stepGoal = profile.stepGoal || 10000;
      const steps = getTodayValue('steps');
      const stepScore = Math.min(100, (steps / stepGoal) * 100);

      // 2. Hydration Score (15%)
      const waterTarget = getDailyWaterTarget();
      const water = waterLogs
        .filter(w => new Date(w.date).toDateString() === today)
        .reduce((sum, w) => sum + w.amount, 0) / 1000;
      const waterScore = Math.min(100, (water / waterTarget) * 100);

      // 3. Nutrition Score (20%)
      const calorieTarget = getDailyCalorieTarget();
      const consumed = meals
        .filter(m => new Date(m.date).toDateString() === today)
        .reduce((sum, m) => sum + m.calories, 0);
      const calorieScore = consumed > 0 ? Math.max(0, 100 - Math.min(100, Math.abs((consumed - calorieTarget) / calorieTarget) * 100)) : 50;

      // 4. Exercise Score (20%)
      // Based on completed routines today
      const todayWeekday = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      const routinesForDate = routines.filter(r => {
        if (r.skippedDates?.includes(selectedDate)) return false;
        if (r.isExtra) return true;
        if (r.repeat === 'Every day') return true;
        if (r.repeat === 'Monday-Friday' && !['Saturday', 'Sunday'].includes(todayWeekday)) return true;
        if (Array.isArray(r.repeat) && r.repeat.includes(todayWeekday)) return true;
        return false;
      });
      const completedRoutines = routinesForDate.filter(r => r.completed).length;
      const totalRoutines = routinesForDate.length;
      const exerciseScore = totalRoutines > 0 ? (completedRoutines / totalRoutines) * 100 : 70;

      // 5. Mental Health Score (15%)
      
      // 6. Medical Risk Factor (10%)
      const activeConditions = historyRecords.filter(r => r.category === 'Medical History' && (r as any).status === 'Active').length;
      const criticalExams = historyRecords.filter(r => r.category === 'Exams' && (r as any).status === 'Attention Required').length;
      const medicalScore = Math.max(0, 100 - (activeConditions * 10) - (criticalExams * 5));

      // Weighted average
      const totalScore = 
        (stepScore * 0.20) + 
        (waterScore * 0.15) + 
        (calorieScore * 0.20) + 
        (exerciseScore * 0.20) + 
        (mentalHealthScore * 0.15) +
        (medicalScore * 0.10);

      return Math.round(totalScore);
    }

    return records
      .filter(r => r.metric === metric && new Date(r.date).toDateString() === today)
      .reduce((sum, r) => sum + r.value, 0);
  }, [meals, activities, gymLogs, waterLogs, sensorSteps, profile, records, routines, historyRecords, mentalHealthScore, getDailyWaterTarget, getDailyCalorieTarget, selectedDate]);

  const [isDayEnded, setIsDayEnded] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('health_day_ended');
    if (!saved) return false;
    try {
      const { date, ended } = JSON.parse(saved);
      return date === new Date().toDateString() ? ended : false;
    } catch {
      return false;
    }
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = safeLocalStorage.getItem('health_dark_mode');
    return saved ? JSON.parse(saved) : (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false);
  });

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const saved = safeLocalStorage.getItem('health_accent_color') as AccentColor | null;
    return saved && ACCENT_COLORS.includes(saved) ? saved : 'indigo';
  });

  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    return safeLocalStorage.getParsed<string[]>('health_dismissed_notifications', []);
  });

  useEffect(() => {
    safeLocalStorage.setItem('health_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    safeLocalStorage.setItem('health_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeLocalStorage.setItem('health_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    safeLocalStorage.setItem('health_profile', JSON.stringify(profile));
    safeLocalStorage.setItem('hasCompletedOnboarding', profile.onboardingCompleted ? 'true' : 'false');
  }, [profile]);

  useEffect(() => {
    safeLocalStorage.setItem('health_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    safeLocalStorage.setItem('health_meals', JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    safeLocalStorage.setItem('health_water', JSON.stringify(waterLogs));
  }, [waterLogs]);

  useEffect(() => {
    safeLocalStorage.setItem('health_routines', JSON.stringify(routines));
  }, [routines]);

  useEffect(() => {
    safeLocalStorage.setItem('health_gym_logs', JSON.stringify(gymLogs));
  }, [gymLogs]);

  useEffect(() => {
    safeLocalStorage.setItem('health_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    safeLocalStorage.setItem('health_history_records', JSON.stringify(historyRecords));
  }, [historyRecords]);

  useEffect(() => {
    safeLocalStorage.setItem('health_day_ended', JSON.stringify({ date: new Date().toDateString(), ended: isDayEnded }));
  }, [isDayEnded]);

  useEffect(() => {
    safeLocalStorage.setItem('health_dark_mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    safeLocalStorage.setItem('health_accent_color', accentColor);
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (googleUser) {
      safeLocalStorage.setItem('google_user', JSON.stringify(googleUser));
    } else {
      safeLocalStorage.removeItem('google_user');
    }
  }, [googleUser]);

  useEffect(() => {
    if (googleAccessToken) {
      safeLocalStorage.setItem('google_access_token', googleAccessToken);
    } else {
      safeLocalStorage.removeItem('google_access_token');
    }
  }, [googleAccessToken]);

  // Auto-purge nutrition images older than 30 days
  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setMeals(prev => {
      let changed = false;
      const updated = prev.map(meal => {
        if (meal.imageUrl && new Date(meal.date) < thirtyDaysAgo) {
          changed = true;
          return { ...meal, imageUrl: undefined, mediaExpired: true };
        }
        return meal;
      });
      return changed ? updated : prev;
    });
  }, []);

  const clearNutritionMediaCache = useCallback(() => {
    setMeals(prev => prev.map(meal => {
      if (meal.imageUrl) {
        return { ...meal, imageUrl: undefined, mediaExpired: true };
      }
      return meal;
    }));
  }, []);

  useEffect(() => {
    safeLocalStorage.setItem('health_dismissed_notifications', JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

  const addRecord = (metric: HealthRecord['metric'], value: number) => {
    const newRecord: HealthRecord = {
      id: Math.random().toString(36).substr(2, 9),
      metric,
      value,
      date: new Date().toISOString(),
    };
    setRecords(prev => [newRecord, ...prev]);
  };

  const updateRecord = (id: string, value: number) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, value } : r));
  };

  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const getHistory = (metric: HealthRecord['metric']) => {
    return records.filter(r => r.metric === metric).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dismissNotification = (id: string) => {
    setDismissedNotificationIds(prev => [...prev, id]);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setDismissedNotificationIds([]);
    safeLocalStorage.removeItem('health_notifications');
    safeLocalStorage.removeItem('health_dismissed_notifications');
  };

  const handleGoogleAuthError = (err: any) => {
    const errStr = String(err?.message || err);
    if (errStr.includes('401') || errStr.includes('UNAUTHENTICATED') || errStr.includes('invalid authentication credentials') || errStr.includes('Invalid Credentials')) {
      console.warn("Google Calendar access token expired or invalid. Resetting token...");
      setGoogleAccessToken(null);
      safeLocalStorage.removeItem('google_access_token');
    }
  };

  const syncAllToGoogleCalendar = async (token: string) => {
    const unsynced = events.filter(e => !e.googleEventId);
    let updatedEvents = [...events];
    
    for (const event of unsynced) {
      try {
        const googleId = await createGoogleEvent(token, event);
        updatedEvents = updatedEvents.map(e => e.id === event.id ? { ...e, googleEventId: googleId, synced: true } : e);
      } catch (err) {
        console.error("Error syncing event to Google Calendar:", err);
        handleGoogleAuthError(err);
      }
    }
    
    try {
      const googleEvents = await fetchGoogleEvents(token);
      const parsedGoogleEvents: CalendarEvent[] = googleEvents.map(gEvent => {
        const startStr = gEvent.start?.dateTime || gEvent.start?.date || '';
        const startDateObj = new Date(startStr);
        const isoDate = isNaN(startDateObj.getTime()) ? new Date().toISOString() : startDateObj.toISOString();
        const timeStr = startDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        let type: CalendarEvent['type'] = 'workout';
        if (gEvent.description?.includes('[VitalSync Type: medical]')) type = 'medical';
        else if (gEvent.description?.includes('[VitalSync Type: exam]')) type = 'exam';
        else if (gEvent.description?.includes('[VitalSync Type: medication]')) type = 'medication';
        else if (gEvent.description?.includes('[VitalSync Type: nutrition]')) type = 'nutrition';
        else if (gEvent.summary?.toLowerCase().includes('consulta') || gEvent.summary?.toLowerCase().includes('médico') || gEvent.summary?.toLowerCase().includes('doctor') || gEvent.summary?.toLowerCase().includes('medico')) type = 'medical';
        else if (gEvent.summary?.toLowerCase().includes('remédio') || gEvent.summary?.toLowerCase().includes('remedio') || gEvent.summary?.toLowerCase().includes('pill') || gEvent.summary?.toLowerCase().includes('medication')) type = 'medication';
        else if (gEvent.summary?.toLowerCase().includes('exame') || gEvent.summary?.toLowerCase().includes('exam') || gEvent.summary?.toLowerCase().includes('laudo')) type = 'exam';
        else if (gEvent.summary?.toLowerCase().includes('comer') || gEvent.summary?.toLowerCase().includes('comida') || gEvent.summary?.toLowerCase().includes('nutrição') || gEvent.summary?.toLowerCase().includes('diet')) type = 'nutrition';

        return {
          id: gEvent.id,
          title: gEvent.summary || 'Google Event',
          description: gEvent.description?.replace(/\[VitalSync Type: \w+\]/, '').trim() || '',
          date: isoDate,
          time: timeStr,
          type,
          synced: true,
          googleEventId: gEvent.id
        };
      });
      
      const mergedEvents = [...updatedEvents];
      parsedGoogleEvents.forEach(gEvent => {
        const exists = mergedEvents.some(e => e.googleEventId === gEvent.googleEventId || (e.title === gEvent.title && new Date(e.date).toDateString() === new Date(gEvent.date).toDateString() && e.time === gEvent.time));
        if (!exists) {
          mergedEvents.push(gEvent);
        }
      });
      
      setEvents(mergedEvents);
    } catch (err) {
      console.error("Error fetching events from Google Calendar:", err);
      handleGoogleAuthError(err);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      setIsSyncing(true);
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleAccessToken(result.accessToken);
        await syncAllToGoogleCalendar(result.accessToken);
      }
    } catch (err) {
      console.error("Failed to connect Google Calendar:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      setIsSyncing(true);
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleAccessToken(null);
    } catch (err) {
      console.error("Failed to disconnect Google Calendar:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const logout = async () => {
    try {
      setIsSyncing(true);
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleAccessToken(null);
    } catch (err) {
      console.error("Failed to logout:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncGoogleCalendar = async () => {
    if (!googleAccessToken) {
      await connectGoogleCalendar();
      return;
    }
    try {
      setIsSyncing(true);
      await syncAllToGoogleCalendar(googleAccessToken);
    } catch (err) {
      console.error("Failed to sync Google Calendar:", err);
      handleGoogleAuthError(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    if (safeLocalStorage.getItem('health_permissions_prompted') !== 'true') {
      setIsPermissionsModalOpen(true);
    }
    const newId = Math.random().toString(36).substr(2, 9);
    let googleId: string | undefined = undefined;
    let isSynced = false;

    if (googleAccessToken) {
      try {
        googleId = await createGoogleEvent(googleAccessToken, event);
        isSynced = true;
      } catch (err) {
        console.error("Error creating event on Google Calendar:", err);
        handleGoogleAuthError(err);
      }
    }

    const newEvent: CalendarEvent = {
      ...event,
      id: newId,
      googleEventId: googleId,
      synced: isSynced
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const updateEvent = (id: string, eventUpdate: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...eventUpdate } : e));
  };

  const deleteEvent = async (id: string) => {
    const eventToDelete = events.find(e => e.id === id);
    if (eventToDelete) {
      if (eventToDelete.googleEventId && googleAccessToken) {
        try {
          await deleteGoogleEvent(googleAccessToken, eventToDelete.googleEventId);
        } catch (err) {
          console.error("Error deleting event from Google Calendar:", err);
          handleGoogleAuthError(err);
        }
      }
      if (eventToDelete.linkedId) {
        if (eventToDelete.type === 'workout') {
          // For routines, we use the smarter deleteRoutine which handles skipping
          deleteRoutine(eventToDelete.linkedId);
        } else if (eventToDelete.type === 'medical' || eventToDelete.type === 'exam' || eventToDelete.type === 'medication') {
          // For medical/exams, we delete the record
          setHistoryRecords(prev => prev.filter(r => r.id !== eventToDelete.linkedId));
        }
      }
    }
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const recalculateRetroactiveCalories = useCallback(() => {
    setIsSyncing(true);
    const today = new Date().toDateString();
    
    // Recalculate Gym Logs
    setGymLogs(prev => prev.map(log => {
      if (new Date(log.date).toDateString() !== today) return log;
      
      const weight = profile.weight || 101;
      const bf = profile.bodyFatPercentage || 20;
      const lbm = weight * (1 - (bf / 100));
      
      const mg = log.muscleGroup;
      let fm = 0.5;
      if (['Legs', 'Back', 'Lower Body', 'Full Body'].includes(mg)) fm = 1.0;
      else if (['Chest', 'Shoulders'].includes(mg)) fm = 0.8;

      let totalVolume = 0;
      let totalTimeSeconds = 0;
      log.sets.forEach(set => {
        totalVolume += (set.weight * set.reps);
        totalTimeSeconds += (set.reps * 4) + 90;
      });

      const totalTimeHours = totalTimeSeconds / 3600;
      const safeTimeHours = Math.max(totalTimeHours, 0.01);
      const safeLbm = Math.max(lbm, 30);
      const ier = totalVolume / (safeLbm * safeTimeHours);
      
      let baseMet = 3.5;
      if (ier >= 80) baseMet = 9.5;
      else if (ier >= 50) baseMet = 7.5;
      else if (ier >= 20) baseMet = 5.5;

      const finalMet = 1.0 + (baseMet * fm);
      let caloriesBurned = (finalMet - 1.0) * weight * totalTimeHours;
      const maxCalories = (totalTimeSeconds / 60) * 12;
      if (caloriesBurned > maxCalories) caloriesBurned = maxCalories;

      return { ...log, caloriesBurned: Math.round(caloriesBurned), totalVolume };
    }));

    // Recalculate Routines
    setRoutines(prev => prev.map(r => {
      if (!r.completed || !r.lastCompletedDate || new Date(r.lastCompletedDate).toDateString() !== today) return r;
      
      if (r.loggedGymExercises) {
        let totalKcal = 0;
        const weight = profile.weight || 101;
        const bf = profile.bodyFatPercentage || 20;
        const lbm = weight * (1 - (bf / 100));

        r.loggedGymExercises.forEach(log => {
          const mg = log.muscle;
          let fm = 0.5;
          if (['Legs', 'Back', 'Lower Body', 'Full Body'].includes(mg)) fm = 1.0;
          else if (['Chest', 'Shoulders'].includes(mg)) fm = 0.8;

          let logVolume = 0;
          let logTimeSeconds = 0;
          log.sets.forEach((set: any) => {
            logVolume += (set.weight * set.reps);
            logTimeSeconds += (set.reps * 4) + 90;
          });

          const logTimeHours = logTimeSeconds / 3600;
          const safeTimeHours = Math.max(logTimeHours, 0.01);
          const safeLbm = Math.max(lbm, 30);
          const ier = logVolume / (safeLbm * safeTimeHours);
          
          let baseMet = 3.5;
          if (ier >= 80) baseMet = 9.5;
          else if (ier >= 50) baseMet = 7.5;
          else if (ier >= 20) baseMet = 5.5;

          const finalMet = 1.0 + (baseMet * fm);
          let caloriesBurned = (finalMet - 1.0) * weight * logTimeHours;
          const maxCalories = (logTimeSeconds / 60) * 12;
          if (caloriesBurned > maxCalories) caloriesBurned = maxCalories;
          totalKcal += caloriesBurned;
        });
        return { ...r, calories: Math.round(totalKcal) };
      }
      return r;
    }));

    setTimeout(() => {
      setIsSyncing(false);
      generateDailyPerformanceSnapshot();
    }, 800);
  }, [profile.weight, profile.bodyFatPercentage, gymLogs, routines]);

  const updateProfile = (profileUpdate: Partial<UserProfile>) => {
    setProfile(prev => {
      const newProfile = { ...prev, ...profileUpdate };
      
      // OMNI-V15: LBM calculation as motor for all calories/loads
      if (profileUpdate.weight !== undefined || profileUpdate.bodyFatPercentage !== undefined) {
        const weight = newProfile.weight || 0;
        const bf = newProfile.bodyFatPercentage || 0;
        newProfile.leanBodyMass = weight * (1 - (bf / 100));
      }

      if (profileUpdate.language) {
        setAppLanguage(profileUpdate.language as Language);
      }
      
      return newProfile;
    });
  };

  const updateGoal = (id: string, goalUpdate: Partial<HealthGoal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...goalUpdate } : g));
  };

  const setAvatar = (newAvatar: string | null) => {
    setProfile(prev => ({ ...prev, avatar: newAvatar }));
  };

  // Meal CRUD
  const addMeal = (meal: Omit<Meal, 'id'>) => {
    const newMeal: Meal = { ...meal, id: Math.random().toString(36).substr(2, 9) };
    setMeals(prev => [newMeal, ...prev]);
  };

  const updateMeal = (id: string, mealUpdate: Partial<Meal>) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, ...mealUpdate } : m));
  };

  const deleteMeal = (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  };

  // Water CRUD
  const addWaterLog = (log: Omit<WaterLog, 'id'>) => {
    const newLog: WaterLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    setWaterLogs(prev => [newLog, ...prev]);
  };

  const updateWaterLog = (id: string, logUpdate: Partial<WaterLog>) => {
    setWaterLogs(prev => prev.map(w => w.id === id ? { ...w, ...logUpdate } : w));
  };

  const deleteWaterLog = (id: string) => {
    setWaterLogs(prev => prev.filter(w => w.id !== id));
  };

  // Routine CRUD
  const addRoutine = (routine: Omit<ExerciseRoutine, 'id'>) => {
    const newRoutine: ExerciseRoutine = { ...routine, id: Math.random().toString(36).substr(2, 9) };
    setRoutines(prev => [...prev, newRoutine]);
    
    // OMNI-V22: Sync with Calendar
    addEvent({
      title: newRoutine.name,
      description: `Routine: ${newRoutine.type}`,
      date: new Date().toISOString(),
      time: newRoutine.time,
      type: 'workout',
      linkedId: newRoutine.id
    });
  };

  const updateRoutine = (id: string, routineUpdate: Partial<ExerciseRoutine>) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...routineUpdate } : r));
  };

  function deleteRoutine(id: string) {
    if (id === 'step-goal-permanent') return; // Cannot delete permanent step goal
    
    setRoutines(prev => {
      const routine = prev.find(r => r.id === id);
      if (!routine) return prev;

      // OMNI-V22: Selective Deletion Logic
      // If it's a recurring routine, we skip today's instance by default to preserve history/future
      const isRecurring = routine.repeat === 'Every day' || 
                          routine.repeat === 'Monday-Friday' || 
                          (Array.isArray(routine.repeat) && routine.repeat.length > 0);
      
      if (isRecurring && !routine.isExtra) {
        const today = new Date().toISOString().split('T')[0];
        // If already skipped today, do nothing, otherwise add to skipped
        if (routine.skippedDates?.includes(today)) return prev;
        return prev.map(r => r.id === id ? { ...r, skippedDates: [...(r.skippedDates || []), today] } : r);
      }
      
      // If it's a one-off or extra, delete it entirely
      return prev.filter(r => r.id !== id);
    });

    // Sync Cross-Page: Remove linked events from calendar
    setEvents(prev => prev.filter(e => e.linkedId !== id));
  };

  const addGymLog = (log: Omit<GymWorkoutLog, 'id'>) => {
    const newLog: GymWorkoutLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    setGymLogs(prev => [newLog, ...prev]);
    console.log(`Treino finalizado. Volume Total: ${newLog.totalVolume || 0} kg. Calorias Adicionais: ${newLog.caloriesBurned} kcal.`);
  };

  const deleteGymLog = (id: string) => {
    setGymLogs(prev => prev.filter(l => l.id !== id));
  };

  const updateGymLog = (id: string, log: Partial<GymWorkoutLog>) => {
    setGymLogs(prev => prev.map(l => l.id === id ? { ...l, ...log } : l));
  };

  const updateActivity = (id: string, activity: Partial<ActivityTracking>) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...activity } : a));
  };

  const deleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const addActivity = (activity: ActivityTracking) => {
    setActivities(prev => [activity, ...prev]);
    
    // Automatically convert manual activities into "Extra Activity" routines
    if (!activity.routineId) {
      const extraRoutine: ExerciseRoutine = {
        id: `extra-${Math.random().toString(36).substr(2, 9)}`,
        name: activity.name || (activity.type.charAt(0).toUpperCase() + activity.type.slice(1)),
        type: activity.type,
        time: new Date(activity.startTime || activity.date || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        completed: true,
        calories: activity.calories,
        duration: Math.floor((activity.duration || 0) / 60),
        distance: activity.distance,
        lastCompletedDate: activity.endTime || activity.date || new Date().toISOString(),
        isExtra: true,
        repeat: []
      };
      setRoutines(prev => [extraRoutine, ...prev]);
    } else {
      // If it has a routineId, update that routine as completed
      setRoutines(prev => prev.map(r => 
        r.id === activity.routineId 
          ? { ...r, completed: true, calories: activity.calories, lastCompletedDate: activity.endTime || new Date().toISOString() } 
          : r
      ));
    }

    // Clear active activity when finished
    setActiveActivity(null);

    // Sync calories to daily records
    if (activity.calories && activity.calories > 0) {
      addRecord('calories', activity.calories);
    }
  };

  const addHistoryRecord = async (record: Omit<HistoryRecord, 'id'>) => {
    const newRecord: HistoryRecord = { ...record, id: Math.random().toString(36).substr(2, 9) } as HistoryRecord;
    setHistoryRecords(prev => [newRecord, ...prev]);
    
    // OMNI-V22: Sync with Calendar
    addEvent({
      title: 'examName' in newRecord ? (newRecord as any).examName : 
             'doctorName' in newRecord ? `Consultation: ${(newRecord as any).doctorName}` : 
             'conditionName' in newRecord ? (newRecord as any).conditionName : 'Medical Record',
      description: `Category: ${newRecord.category}`,
      date: newRecord.date,
      time: '09:00', // Default time
      type: newRecord.category === 'Exams' ? 'exam' : 'medical',
      linkedId: newRecord.id
    });

    // OMNI-V31: Auto-generate AI Insights for Continuous Medication
    if (newRecord.category === 'Continuous Medication') {
      const medRecord = newRecord as any;
      if (medRecord.medicationName && medRecord.dosage && !medRecord.aiInsights) {
        try {
          const insights = await generateMedicationInsights(medRecord.medicationName, medRecord.dosage, appLanguage);
          updateHistoryRecord(newRecord.id, { aiInsights: insights });
        } catch (error) {
          console.error("Failed to auto-generate medication insights:", error);
        }
      }
    }
  };

  async function updateHistoryRecord(id: string, recordUpdate: Partial<HistoryRecord>) {
    setHistoryRecords(prev => prev.map(r => r.id === id ? { ...r, ...recordUpdate } as HistoryRecord : r));
    
    // OMNI-V31: Auto-generate AI Insights for Continuous Medication on update if missing
    if (recordUpdate.category === 'Continuous Medication' || (recordUpdate as any).medicationName) {
      // Find the updated record to check if it's Continuous Medication and needs insights
      setHistoryRecords(prev => {
        const updatedRecord = prev.find(r => r.id === id);
        if (updatedRecord && updatedRecord.category === 'Continuous Medication') {
          const medRecord = updatedRecord as any;
          if (medRecord.medicationName && medRecord.dosage && !medRecord.aiInsights) {
            generateMedicationInsights(medRecord.medicationName, medRecord.dosage, appLanguage)
              .then(insights => {
                setHistoryRecords(current => current.map(r => r.id === id ? { ...r, aiInsights: insights } as HistoryRecord : r));
              })
              .catch(err => console.error("Failed to auto-generate medication insights on update:", err));
          }
        }
        return prev;
      });
    }
  };

  const deleteHistoryRecord = (id: string) => {
    setHistoryRecords(prev => prev.filter(r => r.id !== id));
    // Sync Cross-Page: Remove linked events from calendar
    setEvents(prev => prev.filter(e => e.linkedId !== id));
  };

  const getProteinTarget = () => {
    const weight = profile.weight || 75;
    const age = profile.age || 28;
    const proteinGoal = goals.find(g => g.id === 'g8');
    const muscleGainGoal = goals.find(g => g.id === 'g1' && g.selected);

    if (!proteinGoal || proteinGoal.selectedOption === 'Do Not Track Protein Goal') return 0;

    let multiplier = 1.0;

    if (muscleGainGoal) {
      multiplier = proteinGoal.selectedOption === 'Increase Protein Intake' ? 2.0 : 1.6;
    } else if (age > 60) {
      multiplier = proteinGoal.selectedOption === 'Increase Protein Intake' ? 1.8 : 1.4;
    } else {
      multiplier = proteinGoal.selectedOption === 'Increase Protein Intake' ? 1.5 : 1.2;
    }

    return Math.round(weight * multiplier);
  };

  const getFatLossEstimation = () => {
    const today = new Date().toDateString();
    const consumed = meals
      .filter(m => new Date(m.date).toDateString() === today)
      .reduce((sum, m) => sum + m.calories, 0);
    
    const calorieTarget = getDailyCalorieTarget();
    
    // For estimation, we use the TDEE (maintenance)
    // If we are bulking, the target is higher, but deficit is still relative to TDEE
    const muscleGainGoal = goals.find(g => g.id === 'g1' && g.selected);
    const tdee = muscleGainGoal ? calorieTarget - 300 : calorieTarget;
    
    const deficit = tdee - consumed;
    const fatLossKg = Math.max(0, deficit / 7700);
    
    let status: 'deficit' | 'maintenance' | 'surplus' = 'maintenance';
    if (deficit > 200) status = 'deficit';
    else if (deficit < -200) status = 'surplus';
    
    return { deficit, fatLossKg, status, totalBurned: tdee };
  };

  async function generateDailyPerformanceSnapshot(): Promise<PerformanceSnapshot> {
    const targetDateStr = new Date(selectedDate + 'T12:00:00').toDateString();
    const isoDate = selectedDate;
    const now = new Date();
    const isToday = isoDate === now.toISOString().split('T')[0];
    const hour = isToday ? now.getHours() : 23;
    const targetDate = new Date(selectedDate + 'T12:00:00');
    const sevenDaysAgo = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // OMNI-V20: Circadian Windows
    let circadianWindow: 'Madrugada' | 'Manhã' | 'Tarde' | 'Noite' = 'Madrugada';
    let windowTargetPercent = 1.0; 
    
    if (isToday) {
      if (hour >= 5 && hour < 12) {
        circadianWindow = 'Manhã';
        windowTargetPercent = 0.3;
      } else if (hour >= 12 && hour < 17) {
        circadianWindow = 'Tarde';
        windowTargetPercent = 0.7;
      } else if (hour >= 17 && hour < 23) {
        circadianWindow = 'Noite';
        windowTargetPercent = 1.0;
      } else {
        circadianWindow = 'Madrugada';
        windowTargetPercent = 0.1;
      }
    }

    // 1. Calculate Radar Axes (0-100) - OMNI-V20 Logic
    
    // BIOMETRIC ANCHORS
    const weight = profile.weight || 75;
    const bf = profile.bodyFatPercentage || 20;
    const lbm = profile.leanBodyMass || (weight * (1 - (bf / 100)));
    const age = profile.age || 30;
    const sex = (profile.sex || 'Male').toLowerCase();
    const goal = profile.goal || 'Health';

    // --- A - STRENGTH (40/30/10/10/10) ---
    let strengthTargetFactor = sex === 'male' ? 60 : 45;
    if (age > 50) {
      const decadesAbove50 = Math.floor((age - 50) / 10);
      strengthTargetFactor *= (1 - (decadesAbove50 * 0.1));
    }
    const strengthTarget = Math.max(lbm * strengthTargetFactor, 1000);
    
    const todayGymLogs = gymLogs.filter(g => new Date(g.date).toDateString() === targetDateStr);
    const logVolume = todayGymLogs.reduce((sum, g) => sum + (g.totalVolume || 0), 0);
    const todayRoutines = routines.filter(r => r.completed && r.lastCompletedDate && new Date(r.lastCompletedDate).toDateString() === targetDateStr);
    const routineVolume = todayRoutines.reduce((sum, r) => {
      if (!r.loggedGymExercises) return sum;
      return sum + r.loggedGymExercises.reduce((logSum, log) => {
        return logSum + log.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0);
      }, 0);
    }, 0);
    const totalVolumeToday = logVolume + routineVolume;
    
    const rawGoalsScore = (totalVolumeToday / strengthTarget) * 100;
    const goalsScore = Math.min(100, (rawGoalsScore / (windowTargetPercent || 1)));

    const last7DaysGym = gymLogs.filter(g => new Date(g.date) >= sevenDaysAgo && new Date(g.date) <= targetDate);
    const last7DaysRoutines = routines.filter(r => r.completed && r.lastCompletedDate && new Date(r.lastCompletedDate) >= sevenDaysAgo && new Date(r.lastCompletedDate) <= targetDate && r.type === 'gym');
    const uniqueDaysGym = new Set([
      ...last7DaysGym.map(g => new Date(g.date).toDateString()),
      ...last7DaysRoutines.map(r => new Date(r.lastCompletedDate!).toDateString())
    ]).size;
    const routineScore = Math.min(100, (uniqueDaysGym / 5) * 100);

    const proteinTarget = lbm * 2;
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === targetDateStr);
    const proteinConsumed = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const rawProteinScore = (proteinConsumed / proteinTarget) * 100;
    const proteinScore = Math.min(100, (rawProteinScore / (windowTargetPercent || 1)));

    const sleepScore = profile.sleepQuality === 'Excellent' ? 100 : profile.sleepQuality === 'Good' ? 80 : 20;

    const yesterdayStr = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000).toDateString();
    const yesterdayGroups = new Set([
      ...gymLogs.filter(g => new Date(g.date).toDateString() === yesterdayStr).map(g => g.muscleGroup),
      ...routines.filter(r => r.completed && r.lastCompletedDate && new Date(r.lastCompletedDate).toDateString() === yesterdayStr && r.loggedGymExercises)
        .flatMap(r => r.loggedGymExercises!.map(l => l.muscle))
    ]);
    const todayGroups = new Set([
      ...todayGymLogs.map(g => g.muscleGroup),
      ...todayRoutines.flatMap(r => r.loggedGymExercises?.map(l => l.muscle) || [])
    ]);
    const overlap = [...todayGroups].filter(g => yesterdayGroups.has(g)).length;
    const restScore = Math.max(0, 100 - (overlap * 25));

    let strengthScore = (goalsScore * 0.4) + (routineScore * 0.3) + (proteinScore * 0.1) + (sleepScore * 0.1) + (restScore * 0.1);
    if (goal === 'Muscle Gain' && uniqueDaysGym === 0) strengthScore = 0;

    // --- B - NUTRIÇÃO (30/30/40) ---
    const calorieTarget = getDailyCalorieTarget();
    const consumed = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    const rawCalScore = consumed > 0 ? Math.max(0, 100 - Math.abs((consumed - (calorieTarget * windowTargetPercent)) / (calorieTarget * windowTargetPercent)) * 100) : 0;
    const calScore = Math.min(100, rawCalScore);
    const nutritionProtScore = Math.min(100, (rawProteinScore / (windowTargetPercent || 1)));
    
    let densityScore = 70;
    let whoScore = 100;
    const last7DaysMeals = meals.filter(m => new Date(m.date) >= sevenDaysAgo && new Date(m.date) <= targetDate);
    
    last7DaysMeals.forEach(m => {
      const desc = m.description.toLowerCase();
      if (desc.includes('vegetable') || desc.includes('fruit') || desc.includes('salad')) densityScore += 2;
      if (desc.includes('trans fat') || desc.includes('fried')) whoScore -= 10;
      if (desc.includes('sugar') || desc.includes('processed')) whoScore -= 5;
    });
    densityScore = Math.max(0, Math.min(100, densityScore));
    whoScore = Math.max(0, Math.min(100, whoScore));

    const nutritionScore = (calScore * 0.3) + (nutritionProtScore * 0.3) + ((densityScore * 0.5 + whoScore * 0.5) * 0.4);

    // --- C - VITALITY (DYNAMIC) ---
    const waterTarget = getDailyWaterTarget();
    const water = waterLogs.filter(w => new Date(w.date).toDateString() === targetDateStr).reduce((sum, w) => sum + w.amount, 0) / 1000;
    const coffeeWeekly = waterLogs.filter(w => new Date(w.date) >= sevenDaysAgo && new Date(w.date) <= targetDate && w.type === 'coffee').length;
    const alcoholWeekly = waterLogs.filter(w => new Date(w.date) >= sevenDaysAgo && new Date(w.date) <= targetDate && w.type === 'alcohol').length;
    
    const coffeePenalty = coffeeWeekly > 14 ? 0.3 : 0;
    const rawHydrationScore = ((water - coffeePenalty) / waterTarget) * 100;
    const hydrationScore = Math.min(100, (rawHydrationScore / (windowTargetPercent || 1)));
    
    let moderationScore = 100;
    if (alcoholWeekly > 7) moderationScore -= 20;
    if (alcoholWeekly > 14) moderationScore -= 30;

    const activeMedications = historyRecords.filter(r => r.category === 'Continuous Medication' && (r as any).isActive);
    
    // OMNI-V33: Routine Vitals Integration
    const todayVitals = historyRecords.filter(r => 
      r.category === 'Routine Vitals' && 
      new Date(r.date).toDateString() === targetDateStr
    ) as RoutineVitalsRecord[];

    let vitalsPenalty = 0;
    todayVitals.forEach(v => {
      if (v.subtype === 'Blood Pressure' && v.bloodPressure) {
        // High Blood Pressure Penalty
        if (v.bloodPressure.systolic > 140 || v.bloodPressure.diastolic > 90) vitalsPenalty += 15;
        if (v.bloodPressure.systolic > 160 || v.bloodPressure.diastolic > 100) vitalsPenalty += 25;
      }
      if (v.subtype === 'Glucose' && v.glucose) {
        // Glucose Imbalance Penalty
        if (v.glucose.state === 'Jejum' && v.glucose.value > 100) vitalsPenalty += 10;
        if (v.glucose.state === 'Pós-prandial' && v.glucose.value > 140) vitalsPenalty += 10;
        if (v.glucose.value < 70) vitalsPenalty += 20; // Hypoglycemia is critical
      }
    });

    const medicalPenaltyBase = (historyRecords.filter(r => r.category === 'Medical History').length * 5) + (activeMedications.length * 2) + vitalsPenalty;
    const exerciseConsistency = uniqueDaysGym / 5;
    const medicalPenalty = Math.max(0, medicalPenaltyBase * (1 - (exerciseConsistency * 0.6 + (whoScore / 100) * 0.2)));
    
    const vitalityScore = (hydrationScore * 0.4) + (moderationScore * 0.4) + (Math.max(0, 100 - medicalPenalty) * 0.2);

    // --- D - FOCUS (40/30/20/10) ---
    let sleepBaseScore = profile.sleepQuality === 'Excellent' ? 100 : profile.sleepQuality === 'Good' ? 80 : profile.sleepQuality === 'Fair' ? 50 : 20;
    if (profile.sleepQuality === 'Poor') sleepBaseScore = Math.min(sleepBaseScore, 50);
    
    const focusExerciseScore = Math.min(100, (uniqueDaysGym / 4) * 100);
    const focusMentalScore = mentalHealthScore;
    const habitsScore = goals.filter(g => g.selected && (g.title.includes('Meditation') || g.title.includes('Reading'))).length * 20;
    
    const focusScore = (sleepBaseScore * 0.4) + (focusExerciseScore * 0.3) + (focusMentalScore * 0.2) + (Math.min(100, habitsScore) * 0.1);

    // --- E - CONDITIONING ---
    const cardioActivities = activities.filter(a => 
      new Date(a.startTime || a.date || '').toDateString() === targetDateStr &&
      (a.status === 'completed' || !!a.endTime)
    );
    const cardioEquivMinutes = cardioActivities.reduce((sum, a) => {
      let multiplier = 1.0;
      if (a.type === 'running') multiplier = 1.5;
      if (a.type === 'cycling') multiplier = 1.2;
      return sum + ((a.duration || 0) / 60) * multiplier;
    }, 0);
    
    const currentSteps = isToday ? sensorSteps : (records.find(r => r.metric === 'steps' && new Date(r.date).toDateString() === targetDateStr)?.value || 0);
    const rawStepsScore = (currentSteps / 10000) * 40;
    const rawCardioScore = (cardioEquivMinutes / 60) * 60;
    const conditioningScore = Math.min(100, ((rawStepsScore + rawCardioScore) / (windowTargetPercent || 1)));

    const radarData: RadarChartAxes = {
      strength: Math.round(strengthScore),
      nutrition: Math.round(nutritionScore),
      vitality: Math.round(vitalityScore),
      focus: Math.round(focusScore),
      conditioning: Math.round(conditioningScore)
    };

    // 2. AI Biofeedback Report - OMNI-V21
    const ai = getGoogleGenAI();
    
    // LGPD: Anonymize profile for AI processing
    const anonProfile = anonymizeProfile(profile);
    
    const prompt = `
      OMNI-V40 PERSONAL TRAINER IA & PREDITIVIDADE CIRCADIANA (LGPD Protocol)
      Current Time: ${hour}h
      User: ${anonProfile.name}, Goal: ${goal}, LBM: ${lbm.toFixed(1)}kg.
      Age: ${anonProfile.age}, Weight: ${anonProfile.weight}, Location: ${anonProfile.address}.
      Target Date: ${targetDateStr}
      
      Realized vs. Daily Total Meta:
      - Strength: ${totalVolumeToday}kg (Total Goal: ${strengthTarget.toFixed(0)}kg)
      - Calories: ${consumed}kcal (Total Goal: ${calorieTarget.toFixed(0)}kcal)
      - Protein: ${proteinConsumed}g (Total Goal: ${proteinTarget.toFixed(0)}g)
      - Hydration: ${water.toFixed(1)}L (Total Goal: ${waterTarget.toFixed(1)}L)
      - Steps: ${currentSteps} (Goal: 10000)
      - Cardio: ${cardioEquivMinutes.toFixed(1)} mins (Goal: 60)
      
      Radar Axes (Relative to Current Rhythm): ${JSON.stringify(radarData)}
      Sleep Quality: ${profile.sleepQuality}
      Gym Logs (Last 7 Days): ${uniqueDaysGym} days
      Relevant Medical History (Last 2 years): ${JSON.stringify(historyRecords.filter(r => r.category === 'Exams' || r.category === 'Medical History').slice(0, 5))}
      Active Medications: ${JSON.stringify(activeMedications.map(m => ({ name: (m as any).medicationName, dosage: (m as any).dosage, insights: (m as any).aiInsights })))}
      Medication History (Recently Stopped): ${JSON.stringify(historyRecords.filter(r => r.category === 'Continuous Medication' && !(r as any).isActive).slice(0, 3).map(m => ({ name: (m as any).medicationName, endDate: (m as any).endDate })))}
      Today's Vitals: ${JSON.stringify(todayVitals.map(v => ({ type: v.subtype, data: v.bloodPressure || v.glucose || v.other })))}
 
      Instructions (OMNI-V21 FAIR Persona):
      1. TONE: Personal, direct, and motivating. Use "Você" instead of the full name.
      2. ABSTRACTION: Do NOT mention window names (Madrugada, Manhã, etc.). Talk about the "Dia Completo" ou "Horário Atual".
      3. PREDITIVIDADE: Project if the user will hit the goal based on the current time (${hour}h). 
          Example: "Agora são ${hour}h e você tomou apenas ${water.toFixed(1)}L dos seus ${waterTarget.toFixed(1)}L. Se você não beber mais ${(waterTarget - water).toFixed(1)}L até o fim do dia, não baterá sua meta diária."
      4. RADAR DIAGNOSIS & CROSS-REFERENCING: 
          - If an axis is 0% or low, explain why based on the logs.
          - Strength: If 0, mention lack of 'Gym' logs in 7 days or that today's workout hasn't been processed yet.
          - Focus: If sleep was 'Poor', mention it limits the axis.
          - Nutrition: If 0, mention lack of meal logs today.
          - Vitality: If low, cross-reference with Medical History, Active Medications, and Today's Vitals.
            * If BP is high or Glucose is off, highlight how this "drains" vitality.
            * If a medication was recently stopped, analyze the impact on health goals (e.g., "Você parou com o medicamento X, monitore sua disposição nos treinos").
          - Conditioning: If low, mention steps or cardio activity.
      5. BIO-INTEGRAÇÃO: Analise como os medicamentos ativos e vitais impactam a performance (ex: recuperação muscular, hidratação, foco). Se um vital estiver alterado, sugira ajustes imediatos.
      6. INSTRUÇÕES DE IDIOMA (OMNI-V42):
          - Responda inteiramente no idioma: ${appLanguage}.
          - Mantenha os termos técnicos universais (CIDs e nomes de substâncias) em parênteses ao lado da tradução, se necessário.
      7. REPORT STRUCTURE:
          - Status de Vitória: What is already "zerado" or close to 100%.
          - Alerta de Rota: Where the user is falling behind relative to the time.
          - Explicação do Radar: Technical justification for the axes.
          - Insight Preditivo: What happens if this rhythm continues (fatigue, mass gain, etc.).
 
      Format: JSON
      {
        "diagnosis": "The full structured report following the 4-step structure above.",
        "medicalAlerts": ["Specific health alerts based on WHO limits, medical history, and medication interactions."],
        "practicalSuggestions": ["Actionable advice for the next few hours, including medication-specific care."],
        "predictiveInsights": "Forecast for the rest of the day and tomorrow, considering medication impacts."
      }
    `;

    let aiReport: AIBiofeedbackReport = {
      diagnosis: "Análise do Personal Trainer IA em processamento...",
      medicalAlerts: [],
      practicalSuggestions: ["Aguardando dados de performance."],
      predictiveInsights: "Calculando projeção circadiana."
    };

    try {
      const ai = getGoogleGenAI();
      const result = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      
      const responseText = result.text;
      if (responseText) {
        aiReport = safeJsonParse(responseText, aiReport);
      }
    } catch (error) {
      console.error("AI Analysis Error:", error);
    }

    const snapshot: PerformanceSnapshot = {
      id: Math.random().toString(36).substr(2, 9),
      date: isoDate,
      radarData,
      aiReport,
      timestamp: new Date().toISOString(),
      weight: profile.weight,
      bf: profile.bodyFatPercentage,
      circadianWindow
    };

    setPerformanceSnapshots(prev => {
      const filtered = prev.filter(s => s.date !== isoDate);
      return [snapshot, ...filtered];
    });
    
    return snapshot;
  };

  const getPerformanceSnapshotByDate = (date: string) => {
    return performanceSnapshots.find(s => s.date === date);
  };

  const totalExerciseCalories = useMemo(() => {
    return getTodayValue('burned_calories');
  }, [getTodayValue]);

  const totalCaloriesBurned = useMemo(() => {
    return getTodayValue('burned_calories');
  }, [getTodayValue]);

  const totalDailyExpenditure = useMemo(() => {
    const bmr = calculateBMR();
    let activityMultiplier = 1.2;
    if (profile.workActivityType === 'Active') activityMultiplier = 1.375;
    if (profile.workActivityType === 'Very Active') activityMultiplier = 1.55;
    
    const baseTDEE = bmr * activityMultiplier;
    return baseTDEE + totalCaloriesBurned;
  }, [calculateBMR, profile.workActivityType, totalCaloriesBurned]);

  const endDay = async () => {
    setIsDayEnded(true);
    await generateDailyPerformanceSnapshot();
  };

  const reopenDay = () => {
    setIsDayEnded(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const addMentalHealthResponse = (response: Omit<MentalHealthResponse, 'id'>) => {
    const newResponse: MentalHealthResponse = { ...response, id: Math.random().toString(36).substr(2, 9) };
    setProfile(prev => ({
      ...prev,
      mentalHealthHistory: [newResponse, ...(prev.mentalHealthHistory || [])]
    }));
  };

  const lastTriggeredData = useRef<string>('');

  // OMNI-V15: Reactive Biometric Synchronization
  // This effect ensures that any change in Weight or BF% triggers a retroactive 
  // recalculation of all calories burned today, using LBM as the metabolic anchor.
  useEffect(() => {
    if (profile.weight && profile.bodyFatPercentage) {
      recalculateRetroactiveCalories();
    }
  }, [profile.weight, profile.bodyFatPercentage]);

  // OMNI-V33: Reactive Intelligence Trigger (Medical Sync)
  useEffect(() => {
    // Stringify relevant data to detect changes (including content changes, not just length)
    const currentData = JSON.stringify({
      gymLogs: gymLogs.map(l => ({ id: l.id, vol: l.totalVolume, kcal: l.caloriesBurned })),
      activities: activities.map(a => ({ id: a.id, cal: a.calories, status: a.status })),
      meals: meals.map(m => ({ id: m.id, cal: m.calories, prot: m.protein })),
      waterLogs: waterLogs.map(w => ({ id: w.id, amount: w.amount })),
      historyRecords: historyRecords.length,
      continuousMeds: continuousMeds.map(m => ({ id: m.id, active: (m as any).isActive, name: (m as any).medicationName })),
      routineVitals: routineVitals.map(v => ({ id: v.id, date: v.date, subtype: (v as any).subtype })),
      weight: profile.weight,
      bf: profile.bodyFatPercentage,
      medications: profile.medications?.length,
      sleep: profile.sleepQuality,
      routines: routines.map(r => ({ id: r.id, completed: r.completed, kcal: r.calories }))
    });

    if (currentData !== lastTriggeredData.current && lastTriggeredData.current !== '') {
      const timer = setTimeout(() => {
        generateDailyPerformanceSnapshot();
      }, 1000); // Reduced debounce to 1 second for "instant" feel
      lastTriggeredData.current = currentData;
      return () => clearTimeout(timer);
    } else if (lastTriggeredData.current === '') {
      lastTriggeredData.current = currentData;
    }
  }, [gymLogs, activities, meals, waterLogs, historyRecords, continuousMeds, routineVitals, profile.weight, profile.bodyFatPercentage, profile.medications, profile.sleepQuality, routines]);

  const exportData = () => {
    const data = {
      records,
      notifications,
      events,
      profile,
      goals,
      meals,
      waterLogs,
      routines,
      gymLogs,
      activities,
      historyRecords,
      performanceSnapshots,
      isDayEnded,
      darkMode,
      dismissedNotificationIds,
      exportDate: new Date().toISOString(),
      version: 'OMNI-V52'
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>RLT Health Backup - ${new Date().toLocaleDateString()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 800px; mx-auto; }
        .card { background: #fff; border: 1px solid #eee; border-radius: 16px; padding: 24px; shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        pre { background: #f8fafc; padding: 20px; border-radius: 12px; overflow-x: auto; font-size: 12px; border: 1px solid #e2e8f0; }
        .header { margin-bottom: 32px; }
        h1 { margin: 0; color: #0f172a; font-size: 24px; }
        p { color: #64748b; }
        .badge { display: inline-block; padding: 4px 12px; background: #f1f5f9; border-radius: 99px; font-size: 12px; font-weight: bold; color: #475569; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>RLT Health Data Export</h1>
            <p>Exported on: ${new Date().toLocaleString()}</p>
            <div class="badge">RLT-1.0 SECURE BACKUP</div>
        </div>
        <p>This file contains your local health data. You can copy the content below to restore your data in another device or keep it as a secure backup.</p>
        <pre id="omni-data">${jsonString}</pre>
    </div>
</body>
</html>`;

    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RLT_Backup_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return jsonString;
    } catch (error) {
      console.error("Export failed:", error);
      return jsonString;
    }
  };

  const generateDebugLog = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      appVersion: 'OMNI-V41',
      systemInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: (navigator as any).platform
      },
      healthMetrics: {
        totalCaloriesBurned,
        totalExerciseCalories,
        totalDailyExpenditure,
        bmr: calculateBMR(),
        stepGoal: profile.stepGoal,
        units: profile.units
      },
      dataCounts: {
        records: records.length,
        meals: meals.length,
        routines: routines.length,
        historyRecords: historyRecords.length,
        performanceSnapshots: performanceSnapshots.length
      }
    };

    const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VitalSync_DebugLog_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const medicationEvents = useMemo(() => {
    const medEvents: CalendarEvent[] = [];
    continuousMeds.forEach(med => {
      if (!med.isActive) return;

      // Generate for a 3-month window around selectedDate for performance and coverage,
      // clamped to the medication's own prescription (start) and validity (end) dates —
      // otherwise every continuous medication shows up on every day in the window,
      // including days before it was even prescribed.
      const centerDate = new Date(selectedDate + 'T12:00:00');
      const windowStart = new Date(centerDate);
      windowStart.setMonth(windowStart.getMonth() - 1);
      const windowEnd = new Date(centerDate);
      windowEnd.setMonth(windowEnd.getMonth() + 1);

      const medStart = new Date(new Date(med.prescriptionDate).toDateString());
      const medEndRaw = med.validityDate || med.endDate;
      const medEnd = medEndRaw ? new Date(new Date(medEndRaw).toDateString()) : null;

      const startDate = medStart > windowStart ? medStart : windowStart;
      const endDate = medEnd && medEnd < windowEnd ? medEnd : windowEnd;

      if (startDate > endDate) return; // starts after this window, or already past its validity date

      let current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        
        (med.times && med.times.length > 0 ? med.times : ['08:00']).forEach(time => {
          const id = `med-${med.id}-${dateStr}-${time}`;
          const log = adherenceLogs.find(l => l.medicationId === med.id && l.date === dateStr && l.time === time);
          
          medEvents.push({
            id,
            title: med.medicationName,
            description: med.dosage,
            date: dateStr,
            time,
            type: 'medication',
            linkedId: med.id,
            status: log?.status || 'pending'
          });
        });
        current.setDate(current.getDate() + 1);
      }
    });
    return medEvents;
  }, [continuousMeds, selectedDate, adherenceLogs]);

  const allEvents = useMemo(() => [...events, ...medicationEvents], [events, medicationEvents]);

  return (
    <HealthContext.Provider value={{ 
      isPermissionsModalOpen,
      openPermissionsModal,
      closePermissionsModal,
      records, 
      notifications, 
      events: allEvents, 
      profile,
      appLanguage,
      t,
      goals,
      meals,
      waterLogs,
      routines,
      gymLogs,
      activities,
      activeActivity,
      setActiveActivity,
      historyRecords,
      adherenceLogs,
      toggleAdherence,
      isDayEnded,
      darkMode,
      isSyncing,
      googleUser,
      googleAccessToken,
      connectGoogleCalendar,
      disconnectGoogleCalendar,
      syncGoogleCalendar,
      logout,
      dismissedNotificationIds,
      sensorSteps,
      updateSensorSteps,
      selectedDate,
      setSelectedDate,
      exportData,
      clearAllNotifications,
      avatar: profile.avatar,
      addRecord, 
      updateRecord, 
      deleteRecord, 
      getTodayValue, 
      getHistory,
      addNotification,
      markNotificationRead,
      dismissNotification,
      addEvent,
      updateEvent,
      deleteEvent,
      updateProfile,
      updateGoal,
      setAvatar,
      toggleDarkMode,
      setDarkMode,
      accentColor,
      setAccentColor,
      addMeal,
      updateMeal,
      deleteMeal,
      addWaterLog,
      updateWaterLog,
      deleteWaterLog,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      addGymLog,
      updateGymLog,
      deleteGymLog,
      addActivity,
      updateActivity,
      deleteActivity,
      addHistoryRecord,
      updateHistoryRecord,
      deleteHistoryRecord,
      getDailyWaterTarget,
      getFatLossEstimation,
      getDailyCalorieTarget,
      calculateBMR,
      getProteinTarget,
      totalCaloriesBurned,
      totalExerciseCalories,
      totalDailyExpenditure,
      mentalHealthScore,
      endDay,
      reopenDay,
      addMentalHealthResponse,
      requestSensorPermission,
      performanceSnapshots,
      generateDailyPerformanceSnapshot,
      getPerformanceSnapshotByDate,
      clearNutritionMediaCache,
      generateDebugLog,
      aiProviderConfig,
      saveAiProviderConfig,
      isAiConfigured
    }}>
      <SystemPermissionsModal isOpen={isPermissionsModalOpen} onClose={closePermissionsModal} />
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}

