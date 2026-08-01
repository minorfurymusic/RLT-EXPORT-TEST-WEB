# RLT - Real Life Track
## Relatório Técnico do Projeto

**Versão:** 1.2  
**Última Atualização:** 2026-07-26  
**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Motion

---

## 🎯 Objetivo Principal

Transformar a gestão da saúde pessoal em uma experiência simples, unificada e sem fricção. O usuário pode registrar e acompanhar dados por meio de interações visuais diretas ou via linguagem natural (texto e comando de voz), enquanto o Motor Central (BrainOrchestrator) garante a atualização consistente, a integridade transacional e a leitura posterior (read-back) da Base Central do aplicativo.

---

## 🏗️ Arquitetura Técnica

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Estilização:** Tailwind CSS + Lucide Icons
- **Animações:** Motion (framer-motion)
- **Persisão:** localStorage + IndexedDB (via Service Worker)

### Backend
- **API:** Gemini (Google AI) via proxy Express (porta 3000)
- **Features:** Fallback automático de chaves, retries para rate limit (HTTP 429/503), comutação entre modelos

### Pipeline de Governança V3
- Roteador determinístico de intenções
- Policy Engine
- Domain Routers
- Parsers higienizadores
- Confirmação por Read-back

---

## 📦 Estrutura de Diretórios

```
src/
├── components/           # Componentes React
│   ├── AIAssistant.tsx      # Chatbot com processamento NL
│   ├── Calendar.tsx         # Agenda unificada
│   ├── Exercises.tsx         # Exercícios e treinos
│   ├── HealthConditionsManager.tsx
│   ├── HistoryForm.tsx       # Formulário de histórico médico
│   ├── Home.tsx              # Dashboard principal
│   ├── Icons.tsx             # Exportação de ícones
│   ├── Insights.tsx          # Análises e sugestões
│   ├── Layout.tsx            # Layout principal
│   ├── Medical.tsx           # Histórico médico
│   ├── MetricDetail.tsx      # Detalhes de métricas
│   ├── Notifications.tsx     # Sistema de notificações
│   ├── Nutrition.tsx         # Nutrição e refeições
│   ├── Onboarding.tsx        # Fluxo de onboarding
│   ├── Profile.tsx           # Perfil do usuário
│   ├── StepCounter.tsx       # Contador de passos (NOVO)
│   └── WaterTracking.tsx     # Rastreamento de água
├── context/
│   └── HealthContext.tsx     # Estado global da aplicação
├── data/
│   ├── exerciseLibrary.ts     # Biblioteca de exercícios
│   └── healthConditions.ts    # Condições de saúde
├── hooks/                    # Hooks customizados
│   ├── useStepCounter.ts      # Rastreamento via acelerômetro (NOVO)
│   └── useStepServiceWorker.ts # Gerenciamento SW (NOVO)
├── lib/
│   └── utils.ts              # Funções utilitárias
├── services/
│   ├── aiMedicalService.ts   # Processamento de PDFs/imagens médicas
│   └── brainOrchestrator.ts   # Motor de comandos NL (NOVO)
├── types.ts                  # Definições de tipos TypeScript
├── App.tsx                  # Componente raiz
├── main.tsx                 # Entry point
└── index.css                # Estilos globais

public/
└── step-counter-sw.js        # Service Worker para tracking (NOVO)
```

---

## 🧠 Os 17 Domínios e Módulos

| Módulo | Descrição | Status |
|--------|-----------|--------|
| 💧 Água | Registro diário, meta calculada dinamicamente, conversão | ✅ Implementado |
| 🥗 Nutrição | Controle de calorias e macros, catálogo de alimentos | ✅ Implementado |
| 💊 Medicamentos | Cronograma de dosagens, horários, frequência | ✅ Implementado |
| 🏋️ Exercícios | Registro de exercícios, séries, repetições, grupo muscular | ✅ Implementado |
| 🩺 Exames | Histórico de resultados, valores de referência | ✅ Implementado |
| 🏥 Consultas | Agendamento por especialidade, integração com lembretes | ✅ Implementado |
| 👤 Perfil | Peso, altura, TDEE/BMR, necessidade hídrica | ✅ Implementado |
| 🎯 Objetivos | Metas de hipertrofia, emagrecimento, condicionamento | ✅ Implementado |
| 😴 Sono | Monitoramento de horas dormidas | 🔜 Pendente |
| 😊 Humor | Registro de energia, humor, anotações | 🔜 Pendente |
| 📅 Agenda | Visão centralizada de eventos | ✅ Implementado |
| ⚙️ Configurações | Modo claro/escuro, idiomas | ⚠️ Parcial |
| 🔒 Permissões | Gestão de acesso | 🔜 Pendente |
| 🔔 Notificações | Alertas e lembretes inteligentes | ✅ Implementado |
| 🤖 Cérebro | Motor NL com processador atômico | ✅ Implementado |
| 📜 Timeline | Histórico longitudinal | 🔜 Pendente |
| 🧪 Suite de Testes | Diagnóstico interno | 🔜 Pendente |

**Legenda:** ✅ Completo | ⚠️ Parcial | 🔜 A implementar

---

## 🤖 Brain Orchestrator (Motor Central)

### Arquivo
`src/services/brainOrchestrator.ts`

### Funcionalidades
- **Processamento de linguagem natural** para comandos do usuário
- **Transações atômicas** isoladas por domínio
- **Parsers especializados** para cada tipo de dado

### Comandos Suportados

| Comando | Exemplo | Ação |
|---------|---------|------|
| Água | "Bebi 750ml de água" | Registra quantidade |
| Exercício | "Fiz supino reto com 40kg, 12 reps, 4 séries" | Registra treino |
| Exame | "Registrei um hemograma, hemoglobina 14.2, dia 15/07" | Cadastra exame |
| Consulta | "Marca consulta com cardiologista pro dia 12/08" | Agenda consulta |
| Medicamento | "Comecei a tomar Losartana 50mg, 1x/dia, a partir de 15/07" | Registra medicação |
| Peso | "Meu peso mudou para 75kg" | Atualiza perfil |
| Altura | "Corrige minha altura pra 180cm" | Atualiza perfil |
| Tema | "Muda pro modo escuro" | Alterna tema |
| Consulta Info | "Quanto de água bebi hoje?" | Retorna informações |

### Características Importantes
- ✅ **Saudação não executa ação** ("Bom dia" apenas responde)
- ✅ **Nomes simplificados** ("Supino Reto" não "fui na academia e fiz supino reto...")
- ✅ **Datas respeitadas** (não cadastra no dia atual se especificar outra data)
- ✅ **Fallback para IA** se parser local falhar

---

## 👟 Sistema de Contador de Passos

### Arquivos
- `src/hooks/useStepCounter.ts` - Hook principal
- `src/hooks/useStepServiceWorker.ts` - Gerenciamento do SW
- `public/step-counter-sw.js` - Service Worker
- `src/components/StepCounter.tsx` - Interface UI

### Funcionalidades
- **Rastreamento via acelerômetro** (DeviceMotion API)
- **Tracking em background** via Service Worker
- **Persistência** no localStorage/IndexedDB
- **Reset automático** à meia-noite
- **Fallback** para entrada manual em desktop

### Limitações Conhecidas
- **Desktop:** Funciona apenas com entrada manual/simulação
- **iOS Safari:** Requer permissão explícita, limitações em background
- **Melhor experiência:** PWA instalada no Android Chrome

---

## 📊 HealthContext (Estado Global)

### Arquivo
`src/context/HealthContext.tsx`

### Dados Gerenciados
- `records` - Registros de saúde (calorias, proteína, hidratação, passos, score)
- `profile` - Perfil do usuário (nome, peso, altura, objetivos, etc.)
- `meals` - Refeições do dia
- `waterLogs` - Registro de hidratação
- `routines` - Rotinas de exercício
- `gymLogs` - Log de exercícios de academia
- `activities` - Atividades físicas
- `historyRecords` - Histórico médico completo
- `events` - Eventos do calendário
- `notifications` - Sistema de notificações
- `goals` - Objetivos de saúde
- `insights` - Análises e sugestões da IA
- `stepCounter` - Estado do contador de passos (NOVO)

### Métodos Principais
```typescript
addRecord(), updateRecord(), deleteRecord()
addMeal(), updateMeal(), deleteMeal()
addWaterLog(), updateWaterLog(), deleteWaterLog()
addRoutine(), updateRoutine(), deleteRoutine()
addGymLog(), deleteGymLog()
addActivity()
addHistoryRecord(), updateHistoryRecord(), deleteHistoryRecord()
addEvent(), updateEvent(), deleteEvent()
updateProfile()
addNotification(), markNotificationRead(), dismissNotification()
// Step Counter (NOVO)
startStepCounter(), stopStepCounter(), resetStepCounter()
addSteps(), setStepGoal()
```

---

## 🔧 Tipos Principais (types.ts)

```typescript
// Perfil do Usuário
interface UserProfile {
  name: string;
  email: string;
  avatar: string | null;
  onboardingCompleted: boolean;
  age?: number;
  weight?: number;
  height?: number;
  sex?: 'Male' | 'Female' | 'Other';
  stepGoal: number;
  // ... mais campos
}

// Registro de Saúde
interface HealthRecord {
  id: string;
  metric: 'calories' | 'protein' | 'hydration' | 'steps' | 'healthScore';
  value: number;
  date: string; // ISO
}

// Refeição
interface Meal {
  id: string;
  name?: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Post-workout' | 'Custom';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // ... mais campos
}

// Histórico Médico (polimórfico)
type HistoryRecord = MedicalHistoryRecord | ExamRecord | ConsultationRecord | 
                     EmergencyRecord | FamilyHistoryRecord | StressReportRecord | 
                     MedicalCertificateRecord;
```

---

## 🌐 Variáveis de Ambiente (.env.example)

```env
GEMINI_API_KEY=sua_chave_aqui
```

---

## 📝 Últimas Mudanças (Julho 2026)

### PR #1: Brain Orchestrator e Contador de Passos
**Branch:** `feature/brain-orchestrator`  
**Status:** Aberto para review

#### Alterações:
1. **Brain Orchestrator** - Novo módulo para processamento de comandos NL
2. **Contador de Passos** - Sistema completo com acelerômetro e SW
3. **Correções no processamento NL:**
   - Água: Apenas registra água
   - Exercícios: Nomes simplificados
   - Exames: Data correta respeitada
   - Consultas: Data correta respeitada
   - Medicamentos: Data de início respeitada
   - Tema: Toggle correto

---

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

---

## 📋 Pendências Conhecidas

1. **Sono** - Módulo não implementado
2. **Humor/Bem-Estar** - Módulo não implementado
3. **Timeline** - Histórico longitudinal não implementado
4. **Suite de Testes** - Diagnóstico interno não implementado
5. **Permissões/Privacidade** - Gestão de acesso não implementada
6. **Servidor Express** - Proxy para Gemini não criado (`server.ts`)
7. **i18n** - Suporte a múltiplos idiomas incompleto
8. **Testes E2E** - Suite de testes não criada

---

## 🎨 Design System

### Cores
```css
/* Light Mode */
--primary: #6366f1;        /* Indigo */
--secondary: #8b5cf6;       /* Purple */
--background: #ffffff;
--text: #0f172a;

/* Dark Mode */
--primary: #818cf8;         /* Indigo lighter */
--secondary: #a78bfa;        /* Purple lighter */
--background: #0f172a;
--text: #f1f5f9;
```

### Fonte
- Sistema: Inter (fallback: system-ui, sans-serif)

---

## 🔗 Links Úteis

- **Repositório:** https://github.com/jeanrsl098/RLT---Real-Life-Track-1.2
- **PR Atual:** https://github.com/jeanrsl098/RLT---Real-Life-Track-1.2/pull/1

---

## 📌 Notas para Desenvolvimento

1. **APIs de Saúde Nativas:** Considere usar HealthKit (iOS) ou Google Fit (Android) para dados mais precisos
2. **PWA:** Implementar manifest.json e service worker completo
3. **Backend:** Criar servidor Express para proxy da API Gemini
4. **Database:** Considerar Firebase/Supabase para sincronização cross-device
5. **Testes:** Adicionar Jest/React Testing Library + Playwright

---

*Documento gerado em 2026-07-26*
