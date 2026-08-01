import dotenv from 'dotenv';
dotenv.config();

import { cerebroRunner } from './brainAgent';

async function testBrainAgent() {
  console.log('--- TESTE BRAIN AGENT (ADK) ---');
  const session = await cerebroRunner.sessionService.createSession({
    appName: 'rlt_cerebro',
    userId: 'test_user'
  });
  console.log('Sessão criada ID:', session.id);

  const events = cerebroRunner.runAsync({
    userId: 'test_user',
    sessionId: session.id,
    newMessage: { role: 'user', parts: [{ text: 'beba 500ml de água' }] }
  });

  for await (const event of events) {
    console.log('EVENTO:', JSON.stringify(event, null, 2));
  }
}

testBrainAgent().catch((err) => {
  console.error('ERRO CAPTURADO:', err);
});
