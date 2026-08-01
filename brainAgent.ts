import { InMemoryRunner, LlmAgent } from '@google/adk';
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
} from '../src/lib/brainTools';

const CEREBRO_INSTRUCTION = `
Você é o Cérebro RLT, assistente inteligente de saúde e bem-estar em português.
Sua função é interpretar as solicitações do usuário e invocar as ferramentas apropriadas para atualizar ou registrar informações de saúde.

Regras:
1. Analise o pedido do usuário e invoque a ferramenta correspondente com a ação e parâmetros corretos.
2. Se o pedido envolver água (ex: "beba 500ml de água"), invoque a ferramenta 'water_tool' com action='addWaterLog' e amount=500.
3. Se o pedido envolver alteração de perfil (ex: "mude meu peso para 82kg"), invoque 'profile_tool' com action='updateProfile' e weight=82.
4. Se o pedido for composto, invoque todas as ferramentas necessárias em sequência.
5. Seja direto e preciso.
`;

export const cerebroAgent = new LlmAgent({
  name: 'cerebro_rlt',
  model: 'gemini-3.6-flash',
  description: 'Interpreta comandos de saúde do usuário em português e executa as tools apropriadas.',
  instruction: CEREBRO_INSTRUCTION,
  tools: [
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
  ],
});

export const cerebroRunner = new InMemoryRunner({
  agent: cerebroAgent,
  appName: 'rlt_cerebro',
});
