import { describe, it, expect } from 'vitest';
import {
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
} from './brainTools';
import type { BrainTool } from './toolSchema';

// async so a synchronous schema.parse() rejection (invalid payload) still
// surfaces as a rejected promise, matching the .rejects assertions below
async function runTool(tool: BrainTool, args: any) {
  return tool.execute(tool.schema.parse(args));
}

describe('water_tool', () => {
  it('accepts a valid addWaterLog payload', async () => {
    const result = await runTool(waterTool, { action: 'addWaterLog', amount: 500, time: '10:00', date: '2026-07-27' });
    expect(result.domain).toBe('WATER');
    expect(result.action).toBe('addWaterLog');
    expect(result.payload.amount).toBe(500);
  });

  it('rejects a non-numeric amount', async () => {
    await expect(runTool(waterTool, { action: 'addWaterLog', amount: 'muita_agua' })).rejects.toThrow();
  });
});

describe('meals_tool', () => {
  it('accepts a valid addMeal payload', async () => {
    const result = await runTool(mealsTool, { action: 'addMeal', description: 'Omelete com café', type: 'Breakfast', calories: 350, protein: 25 });
    expect(result.domain).toBe('MEALS');
    expect(result.payload.calories).toBe(350);
  });

  it('rejects an invalid meal type enum', async () => {
    await expect(runTool(mealsTool, { action: 'addMeal', type: 'Invalido' })).rejects.toThrow();
  });
});

describe('gym_tool', () => {
  it('accepts a valid addGymLog payload', async () => {
    const result = await runTool(gymTool, { action: 'addGymLog', exerciseName: 'Supino Reto', muscleGroup: 'Chest', sets: [{ weight: 80, reps: 10 }] });
    expect(result.domain).toBe('GYM');
    expect(result.payload.exerciseName).toBe('Supino Reto');
  });

  it('rejects sets that is not an array', async () => {
    await expect(runTool(gymTool, { action: 'addGymLog', sets: 'cinco' })).rejects.toThrow();
  });
});

describe('medical_history_tool', () => {
  it('accepts a valid addHistoryRecord payload', async () => {
    const result = await runTool(medicalHistoryTool, { action: 'addHistoryRecord', category: 'Exams', examName: 'Hemograma Completo', provider: 'Laboratório Central', status: 'Normal' });
    expect(result.domain).toBe('MEDICAL_HISTORY');
    expect(result.payload.category).toBe('Exams');
  });

  it('rejects an unknown category', async () => {
    await expect(runTool(medicalHistoryTool, { action: 'addHistoryRecord', category: 'CategoriaInexistente' })).rejects.toThrow();
  });
});

describe('adherence_tool', () => {
  it('accepts a valid toggleAdherence payload', async () => {
    const result = await runTool(adherenceTool, { action: 'toggleAdherence', medicationId: 'med-123', date: '2026-07-27', time: '08:00', status: 'taken' });
    expect(result.domain).toBe('ADHERENCE');
    expect(result.payload.status).toBe('taken');
  });

  it('rejects a payload missing required fields', async () => {
    await expect(runTool(adherenceTool, { action: 'toggleAdherence', medicationId: 'med-123' })).rejects.toThrow();
  });
});

describe('agenda_tool', () => {
  it('accepts a valid addEvent payload', async () => {
    const result = await runTool(agendaTool, { action: 'addEvent', title: 'Consulta Cardiologista', date: '2026-08-10', time: '14:00', type: 'medical' });
    expect(result.domain).toBe('AGENDA');
    expect(result.payload.title).toBe('Consulta Cardiologista');
  });

  it('rejects an invalid event type enum', async () => {
    await expect(runTool(agendaTool, { action: 'addEvent', title: 'Consulta', type: 'tipo_invalido' })).rejects.toThrow();
  });
});

describe('profile_tool', () => {
  it('accepts a valid updateProfile payload', async () => {
    const result = await runTool(profileTool, { action: 'updateProfile', name: 'João Silva', age: 30, weight: 75.5, units: 'metric' });
    expect(result.domain).toBe('PROFILE');
    expect(result.payload.weight).toBe(75.5);
  });

  it('rejects a negative age', async () => {
    await expect(runTool(profileTool, { action: 'updateProfile', age: -5 })).rejects.toThrow();
  });
});

describe('goals_tool', () => {
  it('accepts a valid updateGoal payload', async () => {
    const result = await runTool(goalsTool, { action: 'updateGoal', id: 'goal-1', current: 5, target: 10 });
    expect(result.domain).toBe('GOALS');
    expect(result.payload.target).toBe(10);
  });

  it('rejects a payload missing the required id', async () => {
    await expect(runTool(goalsTool, { action: 'updateGoal' })).rejects.toThrow();
  });
});

describe('mental_health_tool', () => {
  it('accepts a valid addMentalHealthResponse payload', async () => {
    const result = await runTool(mentalHealthTool, {
      action: 'addMentalHealthResponse',
      date: '2026-07-27',
      answers: [{ questionId: 'q1', question: 'Como se sente?', answer: 4 }],
      score: 85
    });
    expect(result.domain).toBe('MENTAL_HEALTH');
    expect(result.payload.score).toBe(85);
  });

  it('rejects a payload missing answers and score', async () => {
    await expect(runTool(mentalHealthTool, { action: 'addMentalHealthResponse', date: '2026-07-27' })).rejects.toThrow();
  });
});

describe('notifications_tool', () => {
  it('accepts a valid addNotification payload', async () => {
    const result = await runTool(notificationsTool, {
      action: 'addNotification',
      title: 'Hora de tomar água',
      description: 'Não se esqueça de se hidratar',
      time: '15:00',
      type: 'medication',
      read: false
    });
    expect(result.domain).toBe('NOTIFICATIONS');
    expect(result.payload.title).toBe('Hora de tomar água');
  });

  it('rejects an invalid notification type enum', async () => {
    await expect(runTool(notificationsTool, { action: 'addNotification', title: 'Teste', type: 'tipo_invalido' })).rejects.toThrow();
  });
});

describe('settings_tool', () => {
  it('accepts a valid setDarkMode payload', async () => {
    const result = await runTool(settingsTool, { action: 'setDarkMode', darkMode: true });
    expect(result.domain).toBe('SETTINGS');
    expect(result.payload.darkMode).toBe(true);
  });

  it('rejects setDarkMode without a boolean value', async () => {
    await expect(runTool(settingsTool, { action: 'setDarkMode' })).rejects.toThrow();
  });
});

describe('profile_tool language field', () => {
  it('accepts a valid language change', async () => {
    const result = await runTool(profileTool, { action: 'updateProfile', language: 'en-US' });
    expect(result.payload.language).toBe('en-US');
  });

  it('rejects an unknown language code', async () => {
    await expect(runTool(profileTool, { action: 'updateProfile', language: 'xx-XX' })).rejects.toThrow();
  });
});
