import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Settings, SmartToy, Send, Camera, Plus, Trash2, Loader2, Sparkles, X, Search, FileText, Download, Activity, HelpCircle, User, ShieldCheck } from './Icons';
import { Mic, MicOff, Paperclip, Volume2, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHealth } from '../context/HealthContext';
import { useRegisterComponentRuntime } from '../lib/version';
import { anonymizeProfile } from '../lib/lgpd';
import { getGoogleGenAI } from '../lib/ai';
import { compressImageIfNeeded } from '../lib/imageCompressor';
import { safeLocalStorage } from '../lib/utils';
import { classifyAndExecuteQuery } from '../lib/brainOrchestrator';
import { runBrain } from '../lib/brainEngine';
import { runFullTransactionalTestSuite } from '../lib/brainOrchestratorTest';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  isPinned?: boolean;
}

export default function AIAssistant() {
  useRegisterComponentRuntime('AIAssistant');
  const navigate = useNavigate();
  const { 
    profile, 
    historyRecords, 
    t, 
    appLanguage, 
    updateProfile,
    addWaterLog,
    updateWaterLog,
    deleteWaterLog,
    addMeal,
    updateMeal,
    deleteMeal,
    toggleDarkMode,
    setDarkMode,
    darkMode,
    addGymLog,
    deleteGymLog,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    generateDailyPerformanceSnapshot,
    waterLogs,
    meals,
    gymLogs,
    events,
    goals,
    getDailyWaterTarget,
    getDailyCalorieTarget,
    getProteinTarget,
    addHistoryRecord,
    updateHistoryRecord,
    deleteHistoryRecord,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleAdherence,
    updateGoal,
    addMentalHealthResponse,
    addNotification
  } = useHealth();

  const defaultWelcomeMessage: ChatMessage = {
    id: '1',
    role: 'assistant',
    content: t('ai.welcome')
  };

  // Sessions state & active session initialization
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = safeLocalStorage.getParsed<ChatSession[]>('health_brain_sessions', []);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    // Migration: Check legacy health_brain_messages
    const legacyMsgs = safeLocalStorage.getParsed<ChatMessage[]>('health_brain_messages', []);
    const initialMsgs = (legacyMsgs && Array.isArray(legacyMsgs) && legacyMsgs.length > 0) ? legacyMsgs : [defaultWelcomeMessage];
    
    const initialSession: ChatSession = {
      id: 'session_' + Date.now(),
      title: 'Conversa Inicial',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: initialMsgs,
      isPinned: true
    };
    return [initialSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = safeLocalStorage.getItem('health_brain_active_session_id');
    if (saved && sessions.some(s => s.id === saved)) {
      return saved;
    }
    return sessions[0]?.id || 'session_default';
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<{ data: string; name: string; type: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // Maximum messages before collapsing history
  const MAX_VISIBLE_MESSAGES = 15;

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Active session helper
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: 'fallback',
    title: 'Nova Conversa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [defaultWelcomeMessage]
  };

  const messages = activeSession.messages;

  // Persist sessions
  useEffect(() => {
    safeLocalStorage.setItem('health_brain_sessions', JSON.stringify(sessions));
    safeLocalStorage.setItem('health_brain_messages', JSON.stringify(messages)); // backward compatibility
  }, [sessions, messages]);

  useEffect(() => {
    safeLocalStorage.setItem('health_brain_active_session_id', activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const updateActiveSessionMessages = (newMessages: ChatMessage[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        // Auto-generate summary title from first user message
        const firstUserMsg = newMessages.find(m => m.role === 'user');
        const updatedTitle = (s.title === 'Conversa Inicial' || s.title === 'Nova Conversa') && firstUserMsg 
          ? (firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')) 
          : s.title;

        return {
          ...s,
          title: updatedTitle,
          updatedAt: new Date().toISOString(),
          messages: newMessages
        };
      }
      return s;
    }));
  };

  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: 'session_' + Date.now(),
      title: 'Nova Conversa',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [defaultWelcomeMessage]
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsDrawerOpen(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // Just reset the single session
      updateActiveSessionMessages([defaultWelcomeMessage]);
      return;
    }
    const filtered = sessions.filter(s => s.id !== sessionId);
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      setActiveSessionId(filtered[0].id);
    }
  };

  const handleTogglePin = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s));
  };

  const handleExportChat = () => {
    const transcript = messages.map(m => `[${m.role.toUpperCase()}]:\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cerebro_RLT_Conversa_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Conversa exportada com sucesso!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let base64 = await fileToBase64(file);
        if (file.type.startsWith('image/')) {
          base64 = await compressImageIfNeeded(base64, 1024, 0.8);
        }
        setAttachments(prev => [...prev, { data: base64, name: file.name, type: file.type }]);
      } catch (err) {
        console.error('Error processing attachment:', err);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAttachments(prev => [...prev, { data: base64Audio, name: 'Áudio gravado', type: 'audio/webm' }]);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert(t('ai.microphoneError'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleSend = async (customText?: string) => {
    const messageText = customText || input;
    if (!messageText.trim() && attachments.length === 0) return;

    const userMessageContent = messageText + (attachments.length > 0 ? `\n[${attachments.length} anexo(s) enviado(s)]` : '');
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', content: userMessageContent }
    ];

    updateActiveSessionMessages(newMessages);
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsTyping(true);

    const todayStr = new Date().toDateString();
    const todayWaterLogs = waterLogs.filter(w => new Date(w.date).toDateString() === todayStr);
    const totalWaterMl = todayWaterLogs.reduce((sum, w) => sum + w.amount, 0);
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === todayStr);
    const totalCaloriesEaten = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

    try {
      // 0. Test Suite trigger
      const cleanCmd = messageText.trim().toLowerCase();
      if (cleanCmd === '/validar' || cleanCmd === '/test' || cleanCmd === '/loop' || cleanCmd === 'validar cérebro') {
        const testOutput = runFullTransactionalTestSuite();
        const testReport = `🧪 **Relatório de Validação Transacional do Cérebro RLT:**\n\n` +
          `Status Geral: ${testOutput.allPassed ? '✅ TODOS OS TESTES APROVADOS (100% SUCESSO)' : '❌ ALGUNS TESTES FALHARAM'}\n\n` +
          testOutput.results.map(r => `• **${r.suite} - ${r.name}:** ${r.passed ? '✔ Aprovado' : '✖ Falhou'} (${r.details})`).join('\n') +
          `\n\n*Cérebro RLT operando em MODO LOOP com pipeline de 5 fases ativas e validadas.*`;

        const finalMessages: ChatMessage[] = [
          ...newMessages,
          { id: (Date.now() + 1).toString(), role: 'assistant', content: testReport }
        ];
        updateActiveSessionMessages(finalMessages);
        setIsTyping(false);
        return;
      }

      // Build the local-orchestrator context once — it's the fallback if the AI
      // call below fails or the user has no working API key, not the first attempt.
      const localOrchestratorContext = {
        profile,
        waterLogs,
        meals,
        gymLogs,
        historyRecords,
        events,
        goals,
        getDailyWaterTarget,
        getDailyCalorieTarget,
        getProteinTarget,
        addWaterLog,
        updateWaterLog,
        deleteWaterLog,
        addMeal,
        updateMeal,
        deleteMeal,
        addGymLog,
        deleteGymLog,
        addHistoryRecord,
        updateHistoryRecord,
        deleteHistoryRecord,
        addEvent,
        deleteEvent,
        updateProfile,
        toggleDarkMode
      };

      // 1. AI Brain Endpoint (/api/brain) is the PRIMARY interpreter — it does all
      // the language understanding and the math (nutrition estimates, unit
      // conversions, date resolution). The local regex orchestrator only takes
      // over below, as a fallback, if this fails (no key, offline, rate limit).
      const healthContextSnapshot = {
        profile: anonymizeProfile(profile),
        waterLogs,
        meals,
        gymLogs,
        historyRecords,
        events,
        goals
      };

      let brainData: any;
      try {
        brainData = await runBrain({
          message: messageText,
          healthContextSnapshot,
          sessionId: activeSession.id
        });
      } catch (aiError: any) {
        // The AI is the primary interpreter now — the local regex orchestrator only
        // steps in here, as a fallback, when it genuinely couldn't be reached
        // (offline, no/invalid API key, rate limit). It's the "ou se a IA não
        // entender" branch, not the default path.
        const orchestratorResult = classifyAndExecuteQuery(messageText, localOrchestratorContext);
        if (orchestratorResult.handledLocally && orchestratorResult.responseContent) {
          const fallbackMessages: ChatMessage[] = [
            ...newMessages,
            { id: (Date.now() + 1).toString(), role: 'assistant', content: orchestratorResult.responseContent }
          ];
          updateActiveSessionMessages(fallbackMessages);
          setIsTyping(false);
          return;
        }
        throw aiError; // local fallback couldn't handle it either — surface the original AI error
      }

      const operations: any[] = brainData.operations || [];
      const brainReply: string = brainData.reply || "";

      // 3. Execute real HealthContext functions for each operation
      const appliedLogs: string[] = [];
      const clarificationQuestions: string[] = [];

      for (const op of operations) {
        const { domain, action, payload } = op;
        if (!payload) continue;

        // The AI flags parts of the message it wasn't confident enough about instead
        // of guessing. Skip applying just that operation and ask the user back —
        // everything else in the same message that WAS understood still gets applied.
        if (op.needsClarification) {
          if (op.clarificationQuestion) clarificationQuestions.push(op.clarificationQuestion);
          continue;
        }

        if (domain === 'WATER') {
          if (action === 'addWaterLog') {
            const amount = Number(payload.amount) || 250;
            const date = payload.date || new Date().toISOString().split('T')[0];
            const time = payload.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            addWaterLog({ amount, date, time });
            appliedLogs.push(`• **Água:** Registrado +${amount}ml em ${date} às ${time}`);
          } else if (action === 'deleteWaterLog' && payload.id) {
            deleteWaterLog(payload.id);
            appliedLogs.push(`• **Água:** Registro de água removido (${payload.id})`);
          }
        } else if (domain === 'MEALS') {
          if (action === 'addMeal') {
            const mealData = {
              description: payload.description || 'Refeição',
              type: payload.type || 'Meal',
              calories: Number(payload.calories) || 0,
              protein: Number(payload.protein) || 0,
              carbs: Number(payload.carbs) || 0,
              fat: Number(payload.fat) || 0,
              date: payload.date || new Date().toISOString(),
              time: payload.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              portionSize: payload.portionSize || ''
            };
            addMeal(mealData);
            appliedLogs.push(`• **Nutrição:** Refeição "${mealData.description}" (${mealData.calories} kcal, ${mealData.protein}g proteína) adicionada`);
          } else if (action === 'updateMeal' && payload.id) {
            updateMeal(payload.id, payload);
            appliedLogs.push(`• **Nutrição:** Refeição atualizada`);
          } else if (action === 'deleteMeal' && payload.id) {
            deleteMeal(payload.id);
            appliedLogs.push(`• **Nutrição:** Refeição removida (${payload.id})`);
          }
        } else if (domain === 'GYM') {
          if (action === 'addGymLog') {
            const gymData = {
              exerciseName: payload.exerciseName || 'Exercício',
              muscleGroup: payload.muscleGroup || 'Chest',
              sets: payload.sets || [],
              notes: payload.notes || '',
              date: payload.date || new Date().toISOString(),
              exerciseId: payload.exerciseId || `custom-${Date.now()}`,
              caloriesBurned: Number(payload.caloriesBurned) || 0
            };
            addGymLog(gymData);
            appliedLogs.push(`• **Treino:** Exercício "${gymData.exerciseName}" (${gymData.muscleGroup}) registrado`);
          } else if (action === 'deleteGymLog' && payload.id) {
            deleteGymLog(payload.id);
            appliedLogs.push(`• **Treino:** Registro de treino removido (${payload.id})`);
          } else if (action === 'addRoutine') {
            const routineData = {
              name: payload.name || 'Rotina',
              time: payload.time || '08:00',
              completed: Boolean(payload.completed),
              type: payload.routineType || 'other',
              repeat: payload.repeat || 'Every day'
            };
            addRoutine(routineData);
            appliedLogs.push(`• **Treino:** Rotina "${routineData.name}" criada`);
          } else if (action === 'updateRoutine' && payload.id) {
            const { routineType, ...rest } = payload;
            updateRoutine(payload.id, routineType ? { ...rest, type: routineType } : rest);
            appliedLogs.push(`• **Treino:** Rotina atualizada (${payload.id})`);
          } else if (action === 'deleteRoutine' && payload.id) {
            deleteRoutine(payload.id);
            appliedLogs.push(`• **Treino:** Rotina removida (${payload.id})`);
          }
        } else if (domain === 'MEDICAL_HISTORY') {
          if (action === 'addHistoryRecord') {
            // Continuous Medication needs `times` to show up on the agenda at all
            // (medicationEvents iterates it) — the AI doesn't always include it
            // when the user's message didn't give a clear time.
            const historyPayload = payload.category === 'Continuous Medication'
              ? { ...payload, times: Array.isArray(payload.times) && payload.times.length > 0 ? payload.times : ['08:00'] }
              : payload;
            await addHistoryRecord(historyPayload);
            appliedLogs.push(`• **Histórico Médico:** Registro "${payload.examName || payload.conditionName || payload.title || payload.category}" adicionado`);
          } else if (action === 'updateHistoryRecord' && payload.id) {
            await updateHistoryRecord(payload.id, payload);
            appliedLogs.push(`• **Histórico Médico:** Registro atualizado`);
          } else if (action === 'deleteHistoryRecord' && payload.id) {
            deleteHistoryRecord(payload.id);
            appliedLogs.push(`• **Histórico Médico:** Registro removido (${payload.id})`);
          }
        } else if (domain === 'ADHERENCE') {
          if (action === 'toggleAdherence') {
            const medId = payload.medicationId || 'med_1';
            const date = payload.date || new Date().toISOString().split('T')[0];
            const time = payload.time || '08:00';
            const status = payload.status || 'taken';
            toggleAdherence(medId, date, time, status);
            appliedLogs.push(`• **Aderência:** Medicamento marcado como ${status.toUpperCase()} em ${date} às ${time}`);
          }
        } else if (domain === 'AGENDA') {
          if (action === 'addEvent') {
            const evtData = {
              title: payload.title || 'Compromisso',
              date: payload.date || new Date().toISOString().split('T')[0],
              time: payload.time || '10:00',
              type: payload.type || 'medical',
              description: payload.description || ''
            };
            await addEvent(evtData);
            appliedLogs.push(`• **Agenda:** Compromisso "${evtData.title}" agendado para ${evtData.date} às ${evtData.time}`);
          } else if (action === 'updateEvent' && payload.id) {
            updateEvent(payload.id, payload);
            appliedLogs.push(`• **Agenda:** Compromisso atualizado`);
          } else if (action === 'deleteEvent' && payload.id) {
            await deleteEvent(payload.id);
            appliedLogs.push(`• **Agenda:** Compromisso removido`);
          }
        } else if (domain === 'PROFILE') {
          if (action === 'updateProfile') {
            updateProfile(payload);
            const changes: string[] = [];
            if (payload.weight !== undefined) changes.push(`peso: ${payload.weight}kg`);
            if (payload.height !== undefined) changes.push(`altura: ${payload.height}cm`);
            if (payload.name !== undefined) changes.push(`nome: ${payload.name}`);
            if (payload.age !== undefined) changes.push(`idade: ${payload.age} anos`);
            appliedLogs.push(`• **Perfil:** ${changes.join(', ') || 'Perfil atualizado com sucesso'}`);
          }
        } else if (domain === 'GOALS') {
          if (action === 'updateGoal' && payload.id) {
            updateGoal(payload.id, payload);
            appliedLogs.push(`• **Metas:** Meta atualizada (${payload.id})`);
          }
        } else if (domain === 'MENTAL_HEALTH') {
          if (action === 'addMentalHealthResponse') {
            addMentalHealthResponse(payload);
            appliedLogs.push(`• **Saúde Mental:** Resposta registrada com pontuação ${payload.score ?? 100}`);
          }
        } else if (domain === 'NOTIFICATIONS') {
          if (action === 'addNotification') {
            addNotification({
              title: payload.title || 'Lembrete',
              description: payload.description || '',
              type: payload.type || 'system',
              time: payload.time || 'Agora'
            });
            appliedLogs.push(`• **Notificação:** Lembrete "${payload.title}" criado`);
          }
        } else if (domain === 'SETTINGS') {
          if (action === 'setDarkMode' && typeof payload.darkMode === 'boolean') {
            setDarkMode(payload.darkMode);
            appliedLogs.push(`• **Configurações:** Tema ${payload.darkMode ? 'escuro' : 'claro'} ativado`);
          }
        }
      }

      // 4. Construct final response citing real recorded values — and, for any
      // part of the message the AI wasn't sure about, ask instead of having
      // silently guessed. The two are independent: what was understood gets
      // recorded either way, the question is just about what wasn't.
      let aiContent = "";
      if (appliedLogs.length > 0) {
        aiContent = `🤖 **Cérebro OMNI — Operações Executadas na Base Central:**\n\n` +
          appliedLogs.join('\n') +
          `\n\n*Valores reais gravados e confirmados no seu HealthContext.*`;
      } else if (clarificationQuestions.length === 0) {
        aiContent = brainReply || t('ai.error');
      }
      if (clarificationQuestions.length > 0) {
        const questionsBlock = `❓ **Preciso confirmar antes de continuar:**\n\n` +
          clarificationQuestions.map(q => `• ${q}`).join('\n');
        aiContent = aiContent ? `${aiContent}\n\n${questionsBlock}` : questionsBlock;
      }

      const finalMessages: ChatMessage[] = [
        ...newMessages,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: aiContent }
      ];
      updateActiveSessionMessages(finalMessages);

    } catch (error: any) {
      console.error('AI Assistant Error:', error);
      const errMsg = error?.message || String(error);
      const isQuotaOrRateLimit = errMsg.includes('429') || errMsg.includes('503') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('limite') || errMsg.toLowerCase().includes('demanda') || errMsg.toLowerCase().includes('rate');

      let displayContent = '';
      if (isQuotaOrRateLimit) {
        displayContent = `⚠️ **STATUS DO MOTOR CENTRAL RLT (RATE LIMIT TEMPORÁRIO)**\n\n` +
          `O provedor de IA configurado atingiu o limite de requisições por minuto na nuvem.\n\n` +
          `📋 **RESUMO RÁPIDO DA SUA BASE CENTRAL DE HOJE:**\n` +
          `• **Água:** ${totalWaterMl} ml / ${Math.round(getDailyWaterTarget() * 1000)} ml\n` +
          `• **Nutrição:** ${totalCaloriesEaten} kcal / ${Math.round(getDailyCalorieTarget())} kcal\n` +
          `• **Refeições:** ${todayMeals.length} registradas (${todayMeals.map(m => m.description).join(', ') || 'Nenhuma'})\n` +
          `• **Metas Ativas:** ${goals.filter(g => g.selected).map(g => g.title).join(', ') || 'Nenhuma'}\n\n` +
          `*(Nota: Para registrar dados como "Bebi 200ml" ou "Comi 2 ovos", digite diretamente que o Motor Central local processa instantaneamente sem depender da nuvem).*`;
      } else {
        displayContent = t('ai.connectionError') || 'Erro de conexão com o Cérebro RLT.';
      }

      const errMessages: ChatMessage[] = [
        ...newMessages,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: displayContent }
      ];
      updateActiveSessionMessages(errMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark relative overflow-hidden">
      {/* Drawer Lateral do Cérebro */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">Cérebro RLT</h3>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase">Gestão & Histórico</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Drawer Actions */}
              <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleCreateNewChat}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-98 transition-all"
                >
                  <Plus className="size-4" />
                  <span>Nova Conversa</span>
                </button>

                <div className="relative">
                  <Search className="size-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar conversas..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 border border-transparent focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Histórico de Conversas</p>
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      session.id === activeSession.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 font-semibold'
                        : 'bg-transparent border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-12">
                      <FileText className={`size-4 shrink-0 ${session.id === activeSession.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      <span className="truncate">{session.title}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleTogglePin(session.id, e)}
                        className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${session.isPinned ? 'text-amber-500' : 'text-slate-400'}`}
                        title="Fixar conversa"
                      >
                        <Pin className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Excluir"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Drawer Footer / Quick Tools */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1">
                <button
                  onClick={() => {
                    generateDailyPerformanceSnapshot();
                    setStatusMessage('Snapshot gerado no Bio-Status!');
                    setTimeout(() => setStatusMessage(null), 3000);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Activity className="size-4 text-emerald-500" />
                  <span>Bio-Status Snapshot</span>
                </button>
                <button
                  onClick={handleExportChat}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Download className="size-4 text-indigo-500" />
                  <span>Exportar Conversa</span>
                </button>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Settings className="size-4 text-slate-500" />
                  <span>Configurações & Perfil</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Header - Only 1 Menu Button ☰ */}
      <header className="flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3.5 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-800/60"
            title="Menu do Cérebro"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                Cérebro Real Life Track
              </h2>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Núcleo Central de Inteligência</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ONLINE
          </span>
        </div>
      </header>

      {statusMessage && (
        <div className="bg-indigo-600 text-white text-xs font-bold text-center py-1.5 px-4 shadow-inner animate-fade-in shrink-0">
          {statusMessage}
        </div>
      )}

      {/* Messages Scroll Area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        <AnimatePresence initial={false}>
          {messages.length > MAX_VISIBLE_MESSAGES && !isHistoryCollapsed && (
            <button
              onClick={() => setIsHistoryCollapsed(true)}
              className="w-full py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-indigo-500">↑</span>
              Ver mensagens anteriores ({messages.length - MAX_VISIBLE_MESSAGES} ocultas)
            </button>
          )}
          
          {isHistoryCollapsed && (
            <button
              onClick={() => {
                setIsHistoryCollapsed(false);
                setTimeout(() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                  }
                }, 100);
              }}
              className="w-full py-2 px-4 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-indigo-500">↓</span>
              Expandir histórico completo
            </button>
          )}
          
          {messages.map((m, index) => {
            // If collapsed, only show last MAX_VISIBLE_MESSAGES
            if (isHistoryCollapsed && index < messages.length - MAX_VISIBLE_MESSAGES) {
              return null;
            }
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex items-end gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}
              >
                {m.role === 'assistant' && (
                  <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <SmartToy className="size-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isTyping && (
          <div className="flex items-end gap-3">
            <div className="size-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <SmartToy className="size-4" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
              <Loader2 className="size-4 text-indigo-600 animate-spin" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cérebro processando...</span>
            </div>
          </div>
        )}
      </main>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="p-2.5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto shrink-0">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group shrink-0">
              {att.type.startsWith('image/') ? (
                <img src={att.data} alt="Anexo" className="size-14 object-cover rounded-xl border border-slate-300 dark:border-slate-700" />
              ) : (
                <div className="size-14 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-400 p-1 text-center font-bold">
                  {att.name.slice(0, 10)}
                </div>
              )}
              <button 
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 transition-transform"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form Footer */}
      <footer className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }} 
          className="flex items-center gap-2"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            multiple 
            accept="image/*,audio/*,.pdf,.txt" 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Anexar arquivo ou imagem"
          >
            <Paperclip className="size-5" />
          </button>

          <button 
            type="button" 
            onClick={toggleRecording}
            className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isRecording ? "Parar gravação" : "Gravar áudio"}
          >
            {isRecording ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? `Gravando... (${recordingTime}s)` : "Digite para o Cérebro RLT..."}
            disabled={isRecording}
            className="flex-1 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm border border-transparent focus:border-indigo-500 outline-none transition-all"
          />

          <button 
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || isTyping}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all shrink-0 active:scale-95"
            title="Enviar mensagem"
          >
            <Send className="size-5" />
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          {t('ai.disclaimer')}
        </p>
      </footer>
    </div>
  );
}
