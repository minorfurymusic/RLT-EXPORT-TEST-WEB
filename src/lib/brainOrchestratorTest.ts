import { classifyAndExecuteQuery, BrainOrchestratorContext } from './brainOrchestrator';
import { WaterLog, Meal, GymWorkoutLog, HistoryRecord, CalendarEvent, UserProfile, ExamRecord } from '../types';

export function runFullTransactionalTestSuite() {
  const results: { suite: string; name: string; passed: boolean; details: string }[] = [];

  // In-memory state mock representing Base Central (HealthContext)
  let waterLogs: WaterLog[] = [];
  let meals: Meal[] = [];
  let gymLogs: GymWorkoutLog[] = [];
  let historyRecords: HistoryRecord[] = [];
  let events: CalendarEvent[] = [];
  let profile: UserProfile = {
    name: 'Usuário Teste',
    email: 'user@example.com',
    avatar: null,
    onboardingCompleted: true,
    age: 32,
    height: 178,
    weight: 82,
    sex: 'Male',
    stepGoal: 10000,
    units: 'metric',
    goal: 'Muscle Gain'
  };

  const getCtx = (): BrainOrchestratorContext => ({
    profile,
    waterLogs,
    meals,
    gymLogs,
    historyRecords,
    events,
    goals: [],
    getDailyWaterTarget: () => 3.0,
    getDailyCalorieTarget: () => 2500,
    getProteinTarget: () => 160,

    addWaterLog: (log) => {
      waterLogs.push({ ...log, id: 'w_' + Math.random().toString(36).substr(2, 6) });
    },
    deleteWaterLog: (id) => {
      waterLogs = waterLogs.filter(w => w.id !== id);
    },

    addMeal: (meal) => {
      meals.push({ ...meal, id: 'm_' + Math.random().toString(36).substr(2, 6) });
    },
    deleteMeal: (id) => {
      meals = meals.filter(m => m.id !== id);
    },

    addGymLog: (log) => {
      gymLogs.push({ ...log, id: 'g_' + Math.random().toString(36).substr(2, 6) });
    },
    deleteGymLog: (id) => {
      gymLogs = gymLogs.filter(g => g.id !== id);
    },

    addHistoryRecord: (record) => {
      historyRecords.push({ ...record, id: 'h_' + Math.random().toString(36).substr(2, 6) });
    },
    deleteHistoryRecord: (id) => {
      historyRecords = historyRecords.filter(h => h.id !== id);
    },

    addEvent: (event) => {
      events.push({ ...event, id: 'e_' + Math.random().toString(36).substr(2, 6) });
    },
    deleteEvent: (id) => {
      events = events.filter(e => e.id !== id);
    },

    updateProfile: (p) => {
      profile = { ...profile, ...p };
    },

    toggleDarkMode: () => {}
  });

  // ==========================================
  // CENÁRIO 1 — ÁGUA
  // ==========================================
  classifyAndExecuteQuery('Bebi 500ml de água', getCtx());
  const waterAdded = waterLogs.length === 1 && waterLogs[0].amount === 500;
  
  classifyAndExecuteQuery('Retire a água', getCtx());
  const waterRemoved = waterLogs.length === 0;

  results.push({
    suite: 'Cenário 1',
    name: 'Água Transacional (Adicionar -> Consultar -> Remover -> Validar)',
    passed: waterAdded && waterRemoved,
    details: `Adicionado: ${waterAdded}, Removido: ${waterRemoved}`
  });

  // ==========================================
  // CENÁRIO 2 — NUTRIÇÃO
  // ==========================================
  classifyAndExecuteQuery('Adicione 2 ovos', getCtx());
  const mealAdded = meals.length === 1 && meals[0].description.includes('Ovos');

  classifyAndExecuteQuery('Remova os ovos', getCtx());
  const mealRemoved = meals.length === 0;

  results.push({
    suite: 'Cenário 2',
    name: 'Nutrição Transacional (Adicionar -> Consultar -> Excluir -> Validar)',
    passed: mealAdded && mealRemoved,
    details: `Adicionado: ${mealAdded}, Removido: ${mealRemoved}`
  });

  // ==========================================
  // CENÁRIO 3 — TREINO
  // ==========================================
  classifyAndExecuteQuery('Registre supino reto 30 kg 45 repetições', getCtx());
  const gymAdded = gymLogs.length === 1 && gymLogs[0].exerciseName.includes('Supino');

  classifyAndExecuteQuery('Remova o treino', getCtx());
  const gymRemoved = gymLogs.length === 0;

  results.push({
    suite: 'Cenário 3',
    name: 'Exercício Transacional (Adicionar -> Consultar -> Excluir -> Validar)',
    passed: gymAdded && gymRemoved,
    details: `Adicionado: ${gymAdded}, Removido: ${gymRemoved}`
  });

  // ==========================================
  // CENÁRIO 4 — EXAME
  // ==========================================
  classifyAndExecuteQuery('Cadastre exame de testosterona. Resultado 1550 ng/dL. Data 03/07.', getCtx());
  const examRecord = historyRecords.find(r => r.category === 'Exams') as ExamRecord | undefined;
  const examAdded = !!examRecord && 
    examRecord.examName.includes('Testosterona') &&
    examRecord.results.some(res => String(res.value) === '1550' && res.unit === 'ng/dL') &&
    examRecord.date.includes('2026-07-03');

  classifyAndExecuteQuery('Cancele o exame', getCtx());
  const examRemoved = historyRecords.filter(r => r.category === 'Exams').length === 0;

  results.push({
    suite: 'Cenário 4',
    name: 'Exame Transacional (Nome -> Resultado -> Unidade -> Data -> Excluir)',
    passed: examAdded && examRemoved,
    details: `Adicionado com campos corretos: ${examAdded}, Excluído: ${examRemoved}`
  });

  // ==========================================
  // CENÁRIO 5 — CONSULTA
  // ==========================================
  classifyAndExecuteQuery('Marque Dermatologista dia 30 de setembro às 10h.', getCtx());
  const event = events[0];
  const eventAdded = !!event && 
    event.title.includes('Dermatologista') && 
    event.date.includes('2026-09-30') && 
    event.time === '10:00';

  classifyAndExecuteQuery('Cancele a consulta', getCtx());
  const eventRemoved = events.length === 0;

  results.push({
    suite: 'Cenário 5',
    name: 'Agenda Transacional (Data 30/09 -> Hora 10h -> Título -> Excluir)',
    passed: eventAdded && eventRemoved,
    details: `Agendado em 30/09 às 10h: ${eventAdded}, Cancelado: ${eventRemoved}`
  });

  // ==========================================
  // FASE 6 — COMANDO COMPOSTO COMPLETO
  // ==========================================
  // Pre-seed water so "Retire 1L de água" operates on existing water log
  waterLogs = [{ id: 'w_seed', amount: 1000, time: '08:00', date: new Date().toISOString() }];

  const compoundQuery = `Retire 1 litro de água. Adicione 2 ovos. Marque Dermatologista dia 30 de setembro às 10h. Registre supino reto 30 kg 45 repetições. Cadastre exame de testosterona. Resultado 1550 ng/dL. Data 03/07.`;
  
  const compoundRes = classifyAndExecuteQuery(compoundQuery, getCtx());

  const cWaterOk = waterLogs.length === 0; // 1L removed
  const cMealOk = meals.length === 1 && meals[0].description.includes('Ovos');
  const cAgendaOk = events.length === 1 && events[0].title.includes('Dermatologista') && events[0].date.includes('2026-09-30');
  const cGymOk = gymLogs.length === 1 && gymLogs[0].exerciseName.includes('Supino');
  const cExamRec = historyRecords.find(r => r.category === 'Exams') as ExamRecord | undefined;
  const cExamOk = !!cExamRec && cExamRec.results.some(r => String(r.value) === '1550') && cExamRec.date.includes('2026-07-03');

  const compoundPassed = cWaterOk && cMealOk && cAgendaOk && cGymOk && cExamOk;

  results.push({
    suite: 'FASE 6',
    name: 'Comando Composto (5 Domínios Simultâneos)',
    passed: compoundPassed,
    details: `Água: ${cWaterOk}, Nutrição: ${cMealOk}, Agenda: ${cAgendaOk}, Exercício: ${cGymOk}, Exame: ${cExamOk}`
  });

  // ==========================================
  // FASE 7 — TESTE DE REVERSÃO COMPLETO
  // ==========================================
  const revertQuery = `Retire a água. Remova os ovos. Cancele o exame. Remova o treino. Cancele a consulta.`;
  classifyAndExecuteQuery(revertQuery, getCtx());

  const rWaterOk = waterLogs.length === 0;
  const rMealOk = meals.length === 0;
  const rGymOk = gymLogs.length === 0;
  const rExamOk = historyRecords.filter(r => r.category === 'Exams').length === 0;
  const rEventOk = events.length === 0;

  const revertPassed = rWaterOk && rMealOk && rGymOk && rExamOk && rEventOk;

  results.push({
    suite: 'FASE 7',
    name: 'Teste de Reversão (Rollback de Todos os Domínios)',
    passed: revertPassed,
    details: `Água: ${rWaterOk}, Nutrição: ${rMealOk}, Treino: ${rGymOk}, Exame: ${rExamOk}, Agenda: ${rEventOk}`
  });

  // ==========================================
  // FASE 8 — TESTE DE GOVERNANÇA RLT ENGINE V3
  // ==========================================
  const govRes = classifyAndExecuteQuery('Mostrar relatório de governança e regras RLT Engine V3', getCtx());
  const govPassed = govRes.handledLocally &&
    !!govRes.responseContent &&
    govRes.responseContent.includes('RLT ENGINE V3') &&
    govRes.responseContent.includes('FASE 0') &&
    govRes.responseContent.includes('FASE 9') &&
    govRes.responseContent.includes('R11');

  results.push({
    suite: 'FASE 8',
    name: 'RLT Engine V3 (Pipeline de Governança Fases 0-9 & Prova de Uso de 11 Regras)',
    passed: govPassed,
    details: `Relatório de Governança V3 gerado com prova de utilização: ${govPassed}`
  });

  // ==========================================
  // CENÁRIO 9 — META DE PASSOS
  // ==========================================
  classifyAndExecuteQuery('Aumente minha meta de passos para 12000', getCtx());
  const stepGoalOk = profile.stepGoal === 12000;

  results.push({
    suite: 'Cenário 9',
    name: 'Perfil — Meta de Passos (Atualização via Cérebro)',
    passed: stepGoalOk,
    details: `Meta de passos atualizada para 12000: ${stepGoalOk}`
  });

  // ==========================================
  // CENÁRIO 10 — DATA POR DIA DA SEMANA ("sexta que vem")
  // ==========================================
  events = [];
  classifyAndExecuteQuery('Marque cardiologista sexta que vem às 10h.', getCtx());
  const weekdayEvent = events[0];

  const today = new Date();
  const expectedFriday = new Date(today);
  let daysAhead = (5 - today.getDay() + 7) % 7;
  if (daysAhead === 0) daysAhead = 7;
  expectedFriday.setDate(expectedFriday.getDate() + daysAhead);
  const expectedDateStr = `${expectedFriday.getFullYear()}-${String(expectedFriday.getMonth() + 1).padStart(2, '0')}-${String(expectedFriday.getDate()).padStart(2, '0')}`;
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const weekdayOk = !!weekdayEvent &&
    weekdayEvent.title.includes('Cardiologista') &&
    weekdayEvent.date.includes(expectedDateStr) &&
    !weekdayEvent.date.includes(todayDateStr);

  results.push({
    suite: 'Cenário 10',
    name: 'Agenda — Data por Dia da Semana ("sexta que vem" não vira hoje)',
    passed: weekdayOk,
    details: `Agendado para ${expectedDateStr} (não ${todayDateStr}): ${weekdayOk}`
  });

  const allPassed = results.every(r => r.passed);

  return {
    allPassed,
    results
  };
}
