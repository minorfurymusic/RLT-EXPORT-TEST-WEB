import { z } from 'zod';
import type { BrainTool } from './toolSchema';

export interface BrainToolResult<T = any> {
  domain: string;
  action: string;
  payload: T;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

// Helper to filter metadata out of payload
function extractPayload<T extends Record<string, any>>(args: T): Record<string, any> {
  const { action, needsClarification, clarificationQuestion, ...rest } = args;
  return rest;
}

// 1. WATER TOOL
export const waterTool: BrainTool = {
  name: 'water_tool',
  description: 'Gerencia registros de consumo de água (addWaterLog, deleteWaterLog)',
  schema: z.object({
    action: z.enum(['addWaterLog', 'deleteWaterLog']),
    id: z.string().optional(),
    amount: z.number().optional(),
    time: z.string().optional(),
    date: z.string().optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    if (args.action === 'addWaterLog' && typeof args.amount !== 'number') {
      throw new Error('amount is required for addWaterLog');
    }
    if (args.action === 'deleteWaterLog' && !args.id) {
      throw new Error('id is required for deleteWaterLog');
    }
    return {
      domain: 'WATER',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 2. MEALS TOOL
export const mealsTool: BrainTool = {
  name: 'meals_tool',
  description: 'Gerencia refeições e nutrição (addMeal, updateMeal, deleteMeal)',
  schema: z.object({
    action: z.enum(['addMeal', 'updateMeal', 'deleteMeal']),
    id: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']).optional(),
    time: z.string().optional(),
    date: z.string().optional(),
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    portionSize: z.string().optional(),
    imageUrl: z.string().optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    if (args.action === 'addMeal' && !args.description) {
      throw new Error('description is required for addMeal');
    }
    if ((args.action === 'updateMeal' || args.action === 'deleteMeal') && !args.id) {
      throw new Error('id is required for updateMeal or deleteMeal');
    }
    return {
      domain: 'MEALS',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 3. GYM / EXERCISE TOOL
export const gymTool: BrainTool = {
  name: 'gym_tool',
  description: 'Gerencia treinos, exercícios e rotinas de exercícios (addGymLog, addRoutine, updateRoutine)',
  schema: z.object({
    action: z.enum(['addGymLog', 'deleteGymLog', 'addRoutine', 'updateRoutine', 'deleteRoutine']),
    id: z.string().optional(),
    exerciseName: z.string().optional(),
    muscleGroup: z.string().optional(),
    sets: z.array(z.object({
      weight: z.number(),
      reps: z.number()
    })).optional(),
    caloriesBurned: z.number().optional(),
    date: z.string().optional(),
    name: z.string().optional(),
    time: z.string().optional(),
    routineType: z.enum(['walking', 'running', 'cycling', 'gym', 'steps', 'other']).optional(),
    repeat: z.union([z.string(), z.array(z.string())]).optional(),
    stepGoal: z.number().optional(),
    completed: z.boolean().optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    if (args.action === 'addGymLog' && !args.exerciseName) {
      throw new Error('exerciseName is required for addGymLog');
    }
    if (args.action === 'deleteGymLog' && !args.id) {
      throw new Error('id is required for deleteGymLog');
    }
    if (args.action === 'addRoutine' && !args.name) {
      throw new Error('name is required for addRoutine');
    }
    if (args.action === 'updateRoutine' && !args.id) {
      throw new Error('id is required for updateRoutine');
    }
    if (args.action === 'deleteRoutine' && !args.id) {
      throw new Error('id is required for deleteRoutine');
    }
    // The app's routine screens compare `repeat` against the exact literal
    // strings "Every day" / "Monday-Friday" — the AI naturally writes
    // "daily", "todo dia", "weekdays" etc, which would silently create a
    // routine the UI never recognizes as recurring. Normalize common
    // synonyms to the literal the rest of the app actually checks for.
    if (typeof args.repeat === 'string') {
      const normalizedRepeat = args.repeat.trim().toLowerCase();
      if (['daily', 'every day', 'everyday', 'todo dia', 'todos os dias'].includes(normalizedRepeat)) {
        args.repeat = 'Every day';
      } else if (['weekdays', 'monday-friday', 'segunda a sexta', 'seg a sex', 'dias uteis', 'dias úteis'].includes(normalizedRepeat)) {
        args.repeat = 'Monday-Friday';
      }
    }
    return {
      domain: 'GYM',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 4. MEDICAL_HISTORY TOOL
export const medicalHistoryTool: BrainTool = {
  name: 'medical_history_tool',
  description: 'Gerencia histórico médico, exames, consultas, emergência, histórico familiar, relatórios de estresse, medicação contínua, sinais vitais e atestados (addHistoryRecord, updateHistoryRecord, deleteHistoryRecord)',
  schema: z.object({
    action: z.enum(['addHistoryRecord', 'updateHistoryRecord', 'deleteHistoryRecord']),
    id: z.string().optional(),
    category: z.enum([
      'Medical History',
      'Exams',
      'Consultations',
      'Emergency',
      'Family History',
      'Stress Reports',
      'Continuous Medication',
      'Routine Vitals',
      'Medical Certificate'
    ]).optional(),
    date: z.string().optional(),
    notes: z.array(z.object({ id: z.string(), date: z.string(), text: z.string() })).optional(),
    criticalMarkers: z.array(z.string()).optional(),
    priority: z.boolean().optional(),
    // Subtype fields
    conditionName: z.string().optional(),
    conditionCategory: z.string().optional(),
    status: z.string().optional(),
    details: z.array(z.string()).optional(),
    bodyLocation: z.string().optional(),
    severity: z.string().optional(),
    examName: z.string().optional(),
    examCategory: z.string().optional(),
    provider: z.string().optional(),
    results: z.array(z.object({
      name: z.string(),
      value: z.union([z.string(), z.number()]),
      unit: z.string(),
      referenceRange: z.string().optional(),
      status: z.enum(['Normal', 'Attention Required', 'Abnormal', 'Pending Results']).optional()
    })).optional(),
    doctorName: z.string().optional(),
    specialty: z.string().optional(),
    location: z.string().optional(),
    reason: z.string().optional(),
    diagnosis: z.string().optional(),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    allergies: z.object({
      medication: z.array(z.string()),
      food: z.array(z.string()),
      environmental: z.array(z.string())
    }).optional(),
    criticalConditions: z.array(z.string()).optional(),
    organDonorStatus: z.enum(['Registered', 'Not registered', 'Prefer not to say']).optional(),
    relativeName: z.string().optional(),
    relationship: z.string().optional(),
    isLiving: z.boolean().optional(),
    familyConditions: z.array(z.object({
      condition: z.string(),
      category: z.string(),
      ageAtOnset: z.number().optional(),
      notes: z.string().optional()
    })).optional(),
    stressLevel: z.number().optional(),
    mood: z.string().optional(),
    sleepQuality: z.string().optional(),
    triggers: z.array(z.string()).optional(),
    physicalSymptoms: z.array(z.string()).optional(),
    medicationName: z.string().optional(),
    medicationType: z.enum(['Remédio', 'Procedimento']).optional(),
    dosage: z.string().optional(),
    times: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    prescriptionDate: z.string().optional(),
    validityDate: z.string().optional(),
    subtype: z.enum(['Blood Pressure', 'Glucose', 'Other']).optional(),
    bloodPressure: z.object({ systolic: z.number(), diastolic: z.number(), pulse: z.number() }).optional(),
    glucose: z.object({ value: z.number(), state: z.enum(['Jejum', 'Pré-prandial', 'Pós-prandial']) }).optional(),
    certificateInfo: z.object({
      institution: z.string(),
      patientName: z.string(),
      isPatientConfirmed: z.boolean(),
      cid: z.string().optional(),
      diagnosis: z.string().optional(),
      leavePeriod: z.object({
        value: z.number(),
        unit: z.enum(['hours', 'days']),
        startDate: z.string(),
        endDate: z.string()
      }).optional(),
      doctorCRM: z.string().optional(),
      doctorName: z.string().optional()
    }).optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    if (args.action === 'addHistoryRecord' && !args.category) {
      throw new Error('category is required for addHistoryRecord');
    }
    if ((args.action === 'updateHistoryRecord' || args.action === 'deleteHistoryRecord') && !args.id) {
      throw new Error('id is required for updateHistoryRecord or deleteHistoryRecord');
    }
    return {
      domain: 'MEDICAL_HISTORY',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 5. ADHERENCE TOOL
export const adherenceTool: BrainTool = {
  name: 'adherence_tool',
  description: 'Gerencia aderência a medicações/hábitos (toggleAdherence)',
  schema: z.object({
    action: z.enum(['toggleAdherence']),
    medicationId: z.string(),
    date: z.string(),
    time: z.string(),
    status: z.enum(['taken', 'missed', 'pending']),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    return {
      domain: 'ADHERENCE',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 6. AGENDA TOOL
export const agendaTool: BrainTool = {
  name: 'agenda_tool',
  description: 'Gerencia eventos de agenda e compromissos de saúde (addEvent, updateEvent, deleteEvent)',
  schema: z.object({
    action: z.enum(['addEvent', 'updateEvent', 'deleteEvent']),
    id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    date: z.string().optional(),
    time: z.string().optional(),
    type: z.enum(['medical', 'exam', 'medication', 'workout', 'nutrition']).optional(),
    synced: z.boolean().optional(),
    linkedId: z.string().optional(),
    status: z.enum(['taken', 'missed', 'pending']).optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    if (args.action === 'addEvent' && (!args.title || !args.date || !args.time || !args.type)) {
      throw new Error('title, date, time, and type are required for addEvent');
    }
    if ((args.action === 'updateEvent' || args.action === 'deleteEvent') && !args.id) {
      throw new Error('id is required for updateEvent or deleteEvent');
    }
    return {
      domain: 'AGENDA',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 7. PROFILE TOOL
export const profileTool: BrainTool = {
  name: 'profile_tool',
  description: 'Atualiza perfil do usuário e métricas físicas (updateProfile)',
  schema: z.object({
    action: z.enum(['updateProfile']),
    name: z.string().optional(),
    email: z.string().email().optional(),
    age: z.number().positive().optional(),
    weight: z.number().positive().optional(),
    height: z.number().positive().optional(),
    sex: z.enum(['Male', 'Female', 'Other']).optional(),
    stepGoal: z.number().positive().optional(),
    units: z.enum(['metric', 'imperial']).optional(),
    goal: z.enum(['Muscle Gain', 'Weight Loss', 'Maintenance', 'Health']).optional(),
    foodRestrictions: z.string().optional(),
    sleepQuality: z.string().optional(),
    language: z.enum(['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'zh-CN', 'ru-RU', 'ar-SA', 'hi-IN', 'ko-KR']).optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    return {
      domain: 'PROFILE',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 8. GOALS TOOL
export const goalsTool: BrainTool = {
  name: 'goals_tool',
  description: 'Atualiza metas de saúde e progresso (updateGoal)',
  schema: z.object({
    action: z.enum(['updateGoal']),
    id: z.string(),
    current: z.number().optional(),
    target: z.number().optional(),
    title: z.string().optional(),
    selected: z.boolean().optional(),
    inputValue: z.string().optional(),
    selectedOption: z.string().optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    return {
      domain: 'GOALS',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 9. MENTAL_HEALTH TOOL
export const mentalHealthTool: BrainTool = {
  name: 'mental_health_tool',
  description: 'Registra respostas de acompanhamento de saúde mental (addMentalHealthResponse)',
  schema: z.object({
    action: z.enum(['addMentalHealthResponse']),
    date: z.string(),
    answers: z.array(z.object({
      questionId: z.string(),
      question: z.string(),
      answer: z.union([z.number(), z.string()])
    })),
    score: z.number(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    return {
      domain: 'MENTAL_HEALTH',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 10. NOTIFICATIONS TOOL
export const notificationsTool: BrainTool = {
  name: 'notifications_tool',
  description: 'Cria notificações no sistema (addNotification)',
  schema: z.object({
    action: z.enum(['addNotification']),
    title: z.string(),
    description: z.string(),
    time: z.string(),
    type: z.enum(['goal', 'medication', 'event', 'exercise', 'nutrition', 'system', 'announcement']),
    read: z.boolean(),
    targetPath: z.string().optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    return {
      domain: 'NOTIFICATIONS',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

// 11. SETTINGS TOOL
export const settingsTool: BrainTool = {
  name: 'settings_tool',
  description: 'Altera preferências visuais do app: tema claro/escuro (setDarkMode). Para trocar o idioma da interface, use profile_tool com o campo "language" em vez desta ferramenta.',
  schema: z.object({
    action: z.enum(['setDarkMode']),
    darkMode: z.boolean().optional(),
    needsClarification: z.boolean().optional(),
    clarificationQuestion: z.string().optional()
  }),
  execute: async (args): Promise<BrainToolResult> => {
    if (args.action === 'setDarkMode' && typeof args.darkMode !== 'boolean') {
      throw new Error('darkMode is required for setDarkMode');
    }
    return {
      domain: 'SETTINGS',
      action: args.action,
      payload: extractPayload(args),
      needsClarification: args.needsClarification ?? false,
      clarificationQuestion: args.clarificationQuestion
    };
  }
};

export const allBrainTools: BrainTool[] = [
  waterTool,
  mealsTool,
  gymTool,
  medicalHistoryTool,
  adherenceTool,
  agendaTool,
  profileTool,
  goalsTool,
  mentalHealthTool,
  notificationsTool,
  settingsTool
];
