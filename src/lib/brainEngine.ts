// Provider-agnostic AI gateway — runs entirely in the client now, calling
// Gemini/OpenAI/Claude/DeepSeek/Kimi/custom directly with the user's own
// key. This used to live server-side (server.ts's /api/brain and /api/ai),
// which worked fine in the dev browser (same origin serves both the static
// app and the API) but silently went nowhere on the packaged Android app —
// a Capacitor WebView has no bundled server behind it, so every fetch to a
// relative "/api/..." path failed and the app quietly fell back to the much
// weaker local regex parser for every single command. Calling providers
// directly from the client removes that dependency entirely — this is also
// how Google AI Studio itself talks to Gemini from a browser, and Anthropic
// ships a dedicated header (below) specifically to support this.
import { allBrainTools } from './brainTools';
import { toOpenAITool, toAnthropicTool, type BrainTool } from './toolSchema';
import { AI_PROVIDER_PRESETS, loadAIProviderConfig, resolveEndpoint, type AIProviderId, type AIProviderConfig } from './aiProviders';

interface ProviderImage {
  mimeType: string;
  data: string; // base64, no "data:" prefix
}

interface CallProviderParams {
  provider: AIProviderId;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  systemInstruction?: string;
  userText: string;
  images?: ProviderImage[];
  tools?: BrainTool[];
  jsonMode?: boolean;
}

interface ProviderResult {
  text: string;
  toolCalls: { name: string; args: any }[];
}

async function callOpenAICompat(p: Required<Pick<CallProviderParams, 'apiKey' | 'baseUrl' | 'model'>> & CallProviderParams): Promise<ProviderResult> {
  const contentParts: any[] = [];
  if (p.userText) contentParts.push({ type: 'text', text: p.userText });
  for (const img of p.images || []) {
    contentParts.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } });
  }

  const messages: any[] = [];
  if (p.systemInstruction) messages.push({ role: 'system', content: p.systemInstruction });
  messages.push({ role: 'user', content: contentParts.length > 1 ? contentParts : p.userText });

  const body: any = { model: p.model, messages };
  if (p.tools && p.tools.length > 0) {
    body.tools = p.tools.map(toOpenAITool);
    body.tool_choice = 'auto';
  }
  if (p.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${p.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Provider error (${res.status}): ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message || {};
  const toolCalls = (msg.tool_calls || []).map((tc: any) => {
    let args: any = {};
    try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { /* leave empty on malformed args */ }
    return { name: tc.function?.name, args };
  });

  return { text: msg.content || '', toolCalls };
}

async function callAnthropic(p: Required<Pick<CallProviderParams, 'apiKey' | 'baseUrl' | 'model'>> & CallProviderParams): Promise<ProviderResult> {
  const contentParts: any[] = [];
  for (const img of p.images || []) {
    contentParts.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.data } });
  }
  contentParts.push({ type: 'text', text: p.userText });

  let system = p.systemInstruction;
  if (p.jsonMode) {
    system = `${system ? system + '\n\n' : ''}Responda SOMENTE com um JSON válido, sem nenhum texto, comentário ou markdown ao redor.`;
  }

  const body: any = {
    model: p.model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: contentParts }]
  };
  if (system) body.system = system;
  if (p.tools && p.tools.length > 0) {
    body.tools = p.tools.map(toAnthropicTool);
  }

  const res = await fetch(`${p.baseUrl.replace(/\/$/, '')}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': p.apiKey,
      'anthropic-version': '2023-06-01',
      // Anthropic blocks direct browser calls unless this is set — it exists
      // specifically for apps like this one where each user brings their own key.
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Provider error (${res.status}): ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  let text = '';
  const toolCalls: { name: string; args: any }[] = [];
  for (const block of data.content || []) {
    if (block.type === 'text') text += block.text;
    else if (block.type === 'tool_use') toolCalls.push({ name: block.name, args: block.input });
  }

  return { text, toolCalls };
}

function isModelNotFoundError(err: any): boolean {
  const s = String(err?.message || err).toLowerCase();
  return s.includes('404') || s.includes('not_found') || s.includes('no longer available') || s.includes('model not found') || s.includes('does not exist') || s.includes('invalid model');
}

function isTransientError(err: any): boolean {
  const s = String(err?.message || err).toLowerCase();
  return s.includes('429') || s.includes('503') || s.includes('quota') || s.includes('demand') || s.includes('overloaded') || s.includes('resource_exhausted');
}

async function callAIProvider(params: CallProviderParams): Promise<ProviderResult> {
  const preset = AI_PROVIDER_PRESETS[params.provider] || AI_PROVIDER_PRESETS.custom;
  const baseUrl = (params.baseUrl && params.baseUrl.trim()) || preset.baseUrl;
  const model = (params.model && params.model.trim()) || preset.defaultModel;

  if (!baseUrl) throw new Error('Nenhum endpoint configurado para este provedor.');
  if (!model) throw new Error('Nenhum modelo configurado para este provedor.');

  const call = (m: string) => {
    const resolved = { ...params, baseUrl, model: m };
    return preset.kind === 'anthropic' ? callAnthropic(resolved) : callOpenAICompat(resolved);
  };

  try {
    return await call(model);
  } catch (err: any) {
    // Providers retire model names over time — retry once with the preset's
    // fallback before giving up.
    if (preset.fallbackModel && preset.fallbackModel !== model && isModelNotFoundError(err)) {
      return await call(preset.fallbackModel);
    }
    throw err;
  }
}

async function callWithRetry(params: CallProviderParams): Promise<ProviderResult> {
  let lastError: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callAIProvider(params);
    } catch (err: any) {
      lastError = err;
      if (isTransientError(err) && attempt === 0) await new Promise(r => setTimeout(r, 1500));
      else break;
    }
  }
  throw lastError;
}

function resolveApiKey(config: AIProviderConfig | null): string | null {
  const key = (config?.apiKey || '').trim();
  if (!key || key === 'null' || key === 'undefined' || key.startsWith('YOUR_') || key.startsWith('MY_GEM')) return null;
  return key;
}

function buildBrainSystemInstruction(healthContextSnapshot: any): string {
  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const todayBr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return `DATA DE HOJE: ${todayIso} (${todayBr}). Isto é um fato real, lido agora do relógio do dispositivo — não uma estimativa sua. É a informação mais importante deste prompt para resolver qualquer data.

REGRA DE OURO PARA DATAS, sem exceção: o ANO de qualquer data que você gerar é ${todayIso.slice(0, 4)}, a menos que o usuário diga um ano explicitamente diferente. Isso vale mesmo quando o usuário só menciona um dia solto ("dia 10", "dia 15") sem mês nem ano — nesses casos, assuma o mês atual (ou o mais próximo, passado ou futuro, que fizer sentido pelo verbo usado) e o ano ${todayIso.slice(0, 4)}. Nunca, em nenhuma circunstância, escreva um ano baseado no seu próprio conhecimento/treinamento — a única fonte de verdade para "que ano é" é a data real informada acima.
Toda expressão relativa ("hoje", "agora", "ontem", "amanhã", "essa hora", "esse mês", "mês que vem", "sexta que vem", uma data sem ano como "15/08") deve ser resolvida a partir desta data real, no fuso do dispositivo.

Você é o Cérebro do Assistente de Saúde e Nutrição OMNI — a ÚNICA camada de interpretação do app. O aplicativo não tem lógica própria de entendimento de linguagem natural nem de cálculo nutricional/médico: tudo isso é sua responsabilidade. O app só grava exatamente os parâmetros que você retornar.
Você tem acesso ao estado atual do usuário fornecido no snapshot.
Sua função é interpretar o pedido do usuário (por mais informal, incompleto ou ambíguo que seja) e invocar as ferramentas (tools) adequadas para registrar, atualizar ou remover dados nos domínios correspondentes.

SNAPSHOT DO CONTEXTO DE SAÚDE ATUAL:
${JSON.stringify(healthContextSnapshot || {}, null, 2)}

DIRETRIZES DE USO DAS TOOLS:
1. Para cada pedido de alteração de dados (água, refeições, treinos, histórico médico, aderência a remédios, agenda, perfil, metas, saúde mental, notificações), escolha e execute a ferramenta específica com os parâmetros corretos.
2. Se a mensagem do usuário contiver pedidos para múltiplos domínios (ex: água + peso + treino), você DEVE invocar a ferramenta correspondente para CADA UM dos pedidos na mesma resposta.
3. Se o pedido for apenas informativo, uma conversa geral ou tira-dúvidas sem alteração de estado, não invoque nenhuma ferramenta e responda diretamente.
4. Mantenha os valores coerentes com os parâmetros pedidos. Exemplo: "mude meu peso para 82kg" -> profile_tool(action="updateProfile", weight=82). "beba 500ml de água" -> water_tool(action="addWaterLog", amount=500).
5. FAÇA VOCÊ MESMO todo cálculo e normalização — nunca deixe um campo numérico em branco esperando que o app calcule depois:
   - Refeições: se o usuário descrever um alimento/prato sem valores exatos ("comi um sanduíche de atum", "2 ovos mexidos"), estime calorias, proteína, carboidratos e gordura usando seu conhecimento nutricional e porções padrão, e preencha esses campos na mealsTool. Só deixe em branco se for genuinamente impossível estimar.
   - Exercícios: se o usuário descrever um treino, estime calorias queimadas (caloriesBurned) com base no exercício, peso corporal aproximado e volume (séries/reps ou duração) — nunca deixe em 0 por padrão.
   - Unidades: converta tudo para a unidade que a tool espera (litros/copos -> ml; libras -> kg; etc.), nunca passe a unidade errada adiante.
   - Medicamentos (Continuous Medication): normalize nome (sem verbos/data/hora dentro do nome) e dosagem antes de chamar medical_history_tool. SEMPRE inclua o campo "times" com pelo menos um horário — se o usuário não disser a hora exata ("essa hora mesmo", sem especificar), use um horário padrão razoável (ex: "08:00") em vez de omitir o campo. Sem "times" o medicamento não aparece na agenda do usuário. Se o usuário mencionar até quando vai tomar ("até dia 30/09", "por 10 dias", "só essa semana"), resolva isso para uma data absoluta e preencha "validityDate" — sem esse campo o medicamento é tratado como uso contínuo (sem data final) e continua aparecendo na agenda indefinidamente.
   - Datas: "hoje"/"ontem"/"amanhã"/"dia X"/dias da semana ("sexta", "segunda que vem") — resolva sempre para uma data absoluta (YYYY-MM-DD) antes de enviar; nunca repasse texto relativo cru. Repetindo a REGRA DE OURO bem aqui, no ponto onde você monta o campo de data: o ano é ${todayIso.slice(0, 4)} a menos que o usuário diga um ano diferente — isso vale mesmo se outras partes do pedido (nome do remédio, dosagem) estiverem faltando e você for usar needsClarification; a incerteza sobre esses outros campos não deve te fazer hesitar ou errar o ano.
6. Se o pedido tiver informação insuficiente para uma ação seguramente correta (ex: falta identificar qual registro remover entre vários parecidos, ou falta o nome de um remédio), use needsClarification=true e clarificationQuestion em vez de adivinhar.`;
}

export interface BrainResult {
  operations: any[];
  reply: string;
  sessionId: string;
}

/**
 * The Cérebro's natural-language interpreter, run entirely client-side.
 * Throws on missing key / provider errors — callers should catch and fall
 * back to the local regex orchestrator, same as before.
 */
export async function runBrain({ message, healthContextSnapshot, sessionId }: {
  message: string;
  healthContextSnapshot: any;
  sessionId: string;
}): Promise<BrainResult> {
  const config = loadAIProviderConfig();
  const resolvedKey = resolveApiKey(config);
  if (!resolvedKey || !config) {
    throw new Error('Nenhuma chave de API de IA configurada. Configure a sua em Perfil > Assistente de IA.');
  }

  const { baseUrl, model } = resolveEndpoint(config);
  const systemInstruction = buildBrainSystemInstruction(healthContextSnapshot);

  const result = await callWithRetry({
    provider: config.provider,
    apiKey: resolvedKey,
    baseUrl,
    model,
    systemInstruction,
    userText: message,
    tools: allBrainTools
  });

  const toolMap = new Map(allBrainTools.map(t => [t.name, t]));
  const operations: any[] = [];
  let failedToolCalls = 0;
  for (const call of result.toolCalls) {
    const tool = toolMap.get(call.name);
    if (!tool) continue;
    try {
      const parsedArgs = tool.schema.parse(call.args);
      operations.push(await tool.execute(parsedArgs));
    } catch (err: any) {
      console.error(`Error running tool ${call.name}:`, err);
      failedToolCalls++;
    }
  }

  const baseReply = result.text || (operations.length > 0
    ? `Operações identificadas pelo Cérebro OMNI: ${operations.length} ação(ões).`
    : (failedToolCalls > 0 ? '' : 'Processado pelo Cérebro OMNI.'));
  const reply = failedToolCalls > 0
    ? [baseReply, 'Não consegui registrar parte do seu pedido porque faltou alguma informação — pode detalhar melhor (nome, valor, data...)?'].filter(Boolean).join('\n\n')
    : baseReply;

  return { operations, reply, sessionId: sessionId || 'session_default' };
}

// Gemini-SDK-shaped `contents` (kept as the wire format so callers like ai.ts
// didn't need to change) — pull out the plain text and any inline images.
function extractTextAndImages(contents: any): { text: string; images: ProviderImage[] } {
  let text = '';
  const images: ProviderImage[] = [];
  const items = Array.isArray(contents) ? contents : [contents];
  for (const item of items) {
    if (typeof item === 'string') { text += (text ? '\n' : '') + item; continue; }
    const parts = item?.parts || (item?.text ? [{ text: item.text }] : []);
    for (const part of parts) {
      if (part?.text) text += (text ? '\n' : '') + part.text;
      if (part?.inlineData?.data) {
        images.push({ mimeType: part.inlineData.mimeType || 'image/jpeg', data: part.inlineData.data });
      }
    }
  }
  return { text, images };
}

/**
 * Generic content-generation call (Smart Scan OCR, medication insights,
 * meal-photo analysis, routine suggestions...) — the client-side counterpart
 * of the old /api/ai proxy, called directly against whichever provider the
 * user configured.
 */
export async function runGenericAI({ contents, config: genConfig, model: modelOverride }: { contents: any; config?: any; model?: string }): Promise<{ text: string; candidates: any[]; usageMetadata: null }> {
  const providerConfig = loadAIProviderConfig();
  const resolvedKey = resolveApiKey(providerConfig);
  if (!resolvedKey || !providerConfig) {
    throw new Error('Nenhuma chave de API de IA configurada. Configure a sua em Perfil > Assistente de IA.');
  }

  const { baseUrl, model: defaultModel } = resolveEndpoint(providerConfig);
  const model = modelOverride || defaultModel;
  const { text, images } = extractTextAndImages(contents);
  const jsonMode = genConfig?.responseMimeType === 'application/json';

  const result = await callWithRetry({
    provider: providerConfig.provider,
    apiKey: resolvedKey,
    baseUrl,
    model,
    systemInstruction: genConfig?.systemInstruction,
    userText: text,
    images,
    jsonMode
  });

  return { text: result.text, candidates: [], usageMetadata: null };
}
