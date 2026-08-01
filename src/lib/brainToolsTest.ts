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
  notificationsTool
} from './brainTools';

export interface ToolTestReport {
  toolName: string;
  domain: string;
  validPayloadPassed: boolean;
  invalidPayloadPassed: boolean; // passed means it correctly REJECTED invalid payload
  validOutput?: any;
  invalidErrorMessage?: string;
}

function runTool(tool: { schema: any; execute: (args: any) => Promise<any> }, args: any) {
  return tool.execute(tool.schema.parse(args));
}

export async function runAllBrainToolsTests(): Promise<{ allPassed: boolean; reports: ToolTestReport[] }> {
  const reports: ToolTestReport[] = [];

  // 1. WATER TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(waterTool, { action: 'addWaterLog', amount: 500, time: '10:00', date: '2026-07-27' });
      if (validOutput.domain === 'WATER' && validOutput.action === 'addWaterLog' && validOutput.payload.amount === 500) {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(waterTool, { action: 'addWaterLog', amount: 'muita_agua' as any });
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: waterTool.name,
      domain: 'WATER',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 2. MEALS TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(mealsTool, { action: 'addMeal', description: 'Omelete com café', type: 'Breakfast', calories: 350, protein: 25 });
      if (validOutput.domain === 'MEALS' && validOutput.action === 'addMeal' && validOutput.payload.calories === 350) {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(mealsTool, { action: 'addMeal', type: 'Invalido' as any }); // type wrong enum
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: mealsTool.name,
      domain: 'MEALS',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 3. GYM TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(gymTool, { action: 'addGymLog', exerciseName: 'Supino Reto', muscleGroup: 'Chest', sets: [{ weight: 80, reps: 10 }] });
      if (validOutput.domain === 'GYM' && validOutput.action === 'addGymLog' && validOutput.payload.exerciseName === 'Supino Reto') {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(gymTool, { action: 'addGymLog', sets: 'cinco' as any }); // sets must be array
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: gymTool.name,
      domain: 'GYM',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 4. MEDICAL HISTORY TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(medicalHistoryTool, { action: 'addHistoryRecord', category: 'Exams', examName: 'Hemograma Completo', provider: 'Laboratório Central', status: 'Normal' });
      if (validOutput.domain === 'MEDICAL_HISTORY' && validOutput.action === 'addHistoryRecord' && validOutput.payload.category === 'Exams') {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(medicalHistoryTool, { action: 'addHistoryRecord', category: 'CategoriaInexistente' as any });
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: medicalHistoryTool.name,
      domain: 'MEDICAL_HISTORY',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 5. ADHERENCE TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(adherenceTool, { action: 'toggleAdherence', medicationId: 'med-123', date: '2026-07-27', time: '08:00', status: 'taken' });
      if (validOutput.domain === 'ADHERENCE' && validOutput.action === 'toggleAdherence' && validOutput.payload.status === 'taken') {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(adherenceTool, { action: 'toggleAdherence', medicationId: 'med-123' }); // missing required fields: date, time, status
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: adherenceTool.name,
      domain: 'ADHERENCE',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 6. AGENDA TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(agendaTool, { action: 'addEvent', title: 'Consulta Cardiologista', date: '2026-08-10', time: '14:00', type: 'medical' });
      if (validOutput.domain === 'AGENDA' && validOutput.action === 'addEvent' && validOutput.payload.title === 'Consulta Cardiologista') {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(agendaTool, { action: 'addEvent', title: 'Consulta', type: 'tipo_invalido' as any });
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: agendaTool.name,
      domain: 'AGENDA',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 7. PROFILE TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(profileTool, { action: 'updateProfile', name: 'João Silva', age: 30, weight: 75.5, units: 'metric' });
      if (validOutput.domain === 'PROFILE' && validOutput.action === 'updateProfile' && validOutput.payload.weight === 75.5) {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(profileTool, { action: 'updateProfile', age: -5 }); // negative age fails .positive()
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: profileTool.name,
      domain: 'PROFILE',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 8. GOALS TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(goalsTool, { action: 'updateGoal', id: 'goal-1', current: 5, target: 10 });
      if (validOutput.domain === 'GOALS' && validOutput.action === 'updateGoal' && validOutput.payload.target === 10) {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(goalsTool, { action: 'updateGoal' }); // missing required id
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: goalsTool.name,
      domain: 'GOALS',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 9. MENTAL_HEALTH TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(mentalHealthTool, {
          action: 'addMentalHealthResponse',
          date: '2026-07-27',
          answers: [{ questionId: 'q1', question: 'Como se sente?', answer: 4 }],
          score: 85
        });
      if (validOutput.domain === 'MENTAL_HEALTH' && validOutput.action === 'addMentalHealthResponse' && validOutput.payload.score === 85) {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(mentalHealthTool, { action: 'addMentalHealthResponse', date: '2026-07-27' }); // missing answers & score
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: mentalHealthTool.name,
      domain: 'MENTAL_HEALTH',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  // 10. NOTIFICATIONS TOOL
  {
    let validOk = false;
    let invalidRejected = false;
    let validOutput: any;
    let invalidError: string | undefined;

    try {
      validOutput = await runTool(notificationsTool, {
          action: 'addNotification',
          title: 'Hora de tomar água',
          description: 'Não se esqueça de se hidratar',
          time: '15:00',
          type: 'medication',
          read: false
        });
      if (validOutput.domain === 'NOTIFICATIONS' && validOutput.action === 'addNotification' && validOutput.payload.title === 'Hora de tomar água') {
        validOk = true;
      }
    } catch (e: any) {
      validOk = false;
    }

    try {
      await runTool(notificationsTool, { action: 'addNotification', title: 'Teste', type: 'tipo_invalido' as any });
      invalidRejected = false;
    } catch (e: any) {
      invalidRejected = true;
      invalidError = e.message;
    }

    reports.push({
      toolName: notificationsTool.name,
      domain: 'NOTIFICATIONS',
      validPayloadPassed: validOk,
      invalidPayloadPassed: invalidRejected,
      validOutput,
      invalidErrorMessage: invalidError
    });
  }

  const allPassed = reports.every(r => r.validPayloadPassed && r.invalidPayloadPassed);

  return { allPassed, reports };
}
