import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { allBrainTools } from "./src/lib/brainTools";
import { toOpenAITool, toAnthropicTool, type BrainTool } from "./src/lib/toolSchema";
import { AI_PROVIDER_PRESETS, type AIProviderId } from "./src/lib/aiProviders";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers with 50mb limit for image base64 payloads (Smart Scan, Nutrition photos)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper for async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ===========================================================================
// PROVIDER-AGNOSTIC AI GATEWAY
//
// Every provider the user might plug in a key for (Gemini, OpenAI, DeepSeek,
// Kimi/Moonshot, "Personalizado") speaks the OpenAI Chat Completions request
// shape — that's the de facto standard now, so one adapter covers all of them
// by just varying baseUrl/model. Anthropic's Messages API has a different
// enough shape (system param, content blocks, tool_use blocks) to need its
// own adapter. Both normalize down to the same { text, toolCalls } result so
// the two route handlers below don't need to know which provider answered.
// ===========================================================================

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
      'anthropic-version': '2023-06-01'
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
    // Providers retire model names over time (this is exactly what happened with
    // gemini-2.5-flash) — retry once with the preset's fallback before giving up.
    if (preset.fallbackModel && preset.fallbackModel !== model && isModelNotFoundError(err)) {
      return await call(preset.fallbackModel);
    }
    throw err;
  }
}

function resolveApiKey(bodyKey: unknown): string | null {
  const key = (typeof bodyKey === 'string' ? bodyKey : '').trim() || process.env.GEMINI_API_KEY?.trim() || '';
  if (!key || key === 'null' || key === 'undefined' || key.startsWith('YOUR_') || key.startsWith('MY_GEM')) return null;
  return key;
}

function isTransientError(err: any): boolean {
  const s = String(err?.message || err).toLowerCase();
  return s.includes('429') || s.includes('503') || s.includes('quota') || s.includes('demand') || s.includes('overloaded') || s.includes('resource_exhausted');
}

// Gemini's SDK-shaped `contents` (still the wire format the client sends, since
// only server.ts and the provider adapters need to know about other providers)
// — pull out the plain text and any inline images.
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

// Health check route
const SERVER_BUILD_VERSION = "2026.07.27.0315";
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    version: SERVER_BUILD_VERSION,
    uptime: Math.floor(process.uptime()),
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Brain Endpoint — the Cérebro's natural-language interpreter. Provider-agnostic:
// whichever provider/key the client sends drives the tool-calling.
app.post("/api/brain", async (req, res) => {
  try {
    const { message, healthContextSnapshot, sessionId, provider, apiKey, baseUrl, model } = req.body;

    const resolvedProvider: AIProviderId = (provider as AIProviderId) || 'gemini';
    const resolvedKey = resolveApiKey(apiKey);
    if (!resolvedKey) {
      return res.status(401).json({
        error: "NO_API_KEY",
        message: "Nenhuma chave de API de IA configurada. Configure a sua em Perfil > Assistente de IA."
      });
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "MISSING_MESSAGE",
        message: "O parâmetro 'message' é obrigatório."
      });
    }

    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    const todayBr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    const systemInstruction = `DATA DE HOJE: ${todayIso} (${todayBr}). Isto é um fato real, lido agora do relógio do servidor — não uma estimativa sua. É a informação mais importante deste prompt para resolver qualquer data.

REGRA DE OURO PARA DATAS, sem exceção: o ANO de qualquer data que você gerar é ${todayIso.slice(0, 4)}, a menos que o usuário diga um ano explicitamente diferente. Isso vale mesmo quando o usuário só menciona um dia solto ("dia 10", "dia 15") sem mês nem ano — nesses casos, assuma o mês atual (ou o mais próximo, passado ou futuro, que fizer sentido pelo verbo usado) e o ano ${todayIso.slice(0, 4)}. Nunca, em nenhuma circunstância, escreva um ano baseado no seu próprio conhecimento/treinamento — a única fonte de verdade para "que ano é" é a data real informada acima.
Toda expressão relativa ("hoje", "agora", "ontem", "amanhã", "essa hora", "esse mês", "mês que vem", uma data sem ano como "15/08") deve ser resolvida a partir desta data real, no fuso do servidor.

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
   - Unidades: converta tudo para a unidade que a tool espera (litros/copos -> ml; libras -> kg; etc.), nunca passe a unidade errada adiante.
   - Medicamentos (Continuous Medication): normalize nome (sem verbos/data/hora dentro do nome) e dosagem antes de chamar medical_history_tool. SEMPRE inclua o campo "times" com pelo menos um horário — se o usuário não disser a hora exata ("essa hora mesmo", sem especificar), use um horário padrão razoável (ex: "08:00") em vez de omitir o campo. Sem "times" o medicamento não aparece na agenda do usuário.
   - Datas: "hoje"/"ontem"/"amanhã"/"dia X" — resolva sempre para uma data absoluta (YYYY-MM-DD) antes de enviar; nunca repasse texto relativo cru.
6. Se o pedido tiver informação insuficiente para uma ação seguramente correta (ex: falta identificar qual registro remover entre vários parecidos), use needsClarification=true e clarificationQuestion em vez de adivinhar.`;

    let result: ProviderResult | null = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await callAIProvider({
          provider: resolvedProvider,
          apiKey: resolvedKey,
          baseUrl,
          model,
          systemInstruction,
          userText: message,
          tools: allBrainTools
        });
        break;
      } catch (err: any) {
        lastError = err;
        if (isTransientError(err) && attempt === 0) await delay(1500); else break;
      }
    }

    if (!result) {
      console.error("AI provider failed in /api/brain:", lastError);
      return res.status(isTransientError(lastError) ? 429 : 500).json({
        error: "BRAIN_ERROR",
        message: lastError?.message || "Erro no Cérebro ao processar a mensagem."
      });
    }

    const toolMap = new Map(allBrainTools.map(t => [t.name, t]));
    const operations: any[] = [];
    for (const call of result.toolCalls) {
      const tool = toolMap.get(call.name);
      if (!tool) continue;
      try {
        const parsedArgs = tool.schema.parse(call.args);
        operations.push(await tool.execute(parsedArgs));
      } catch (err: any) {
        console.error(`Error running tool ${call.name}:`, err);
      }
    }

    const reply = result.text || (operations.length > 0
      ? `Operações identificadas pelo Cérebro OMNI: ${operations.length} ação(ões).`
      : "Processado pelo Cérebro OMNI.");

    return res.json({
      operations,
      reply,
      sessionId: sessionId || "session_default"
    });
  } catch (error: any) {
    console.error("Error in POST /api/brain:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: error?.message || "Erro interno no servidor /api/brain."
    });
  }
});

// Generic content-generation proxy (Smart Scan OCR, medication insights, meal-photo
// analysis, routine suggestions, etc). Provider-agnostic like /api/brain — the client
// keeps sending Gemini-SDK-shaped `contents`/`config` (nothing about the ~6 components
// that call this needed to change), and this endpoint translates that into whichever
// provider the user configured.
app.post("/api/ai", async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, model, contents, config } = req.body;

    const resolvedProvider: AIProviderId = (provider as AIProviderId) || 'gemini';
    const resolvedKey = resolveApiKey(apiKey);
    if (!resolvedKey) {
      return res.status(401).json({
        error: "NO_API_KEY",
        message: "Nenhuma chave de API de IA configurada. Configure a sua em Perfil > Assistente de IA."
      });
    }

    if (!contents) {
      return res.status(400).json({
        error: "MISSING_CONTENTS",
        message: "O parâmetro 'contents' é obrigatório para realizar a chamada de IA."
      });
    }

    const { text, images } = extractTextAndImages(contents);
    const jsonMode = config?.responseMimeType === 'application/json';

    let result: ProviderResult | null = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await callAIProvider({
          provider: resolvedProvider,
          apiKey: resolvedKey,
          baseUrl,
          model,
          systemInstruction: config?.systemInstruction,
          userText: text,
          images,
          jsonMode
        });
        break;
      } catch (err: any) {
        lastError = err;
        if (isTransientError(err) && attempt === 0) await delay(1500); else break;
      }
    }

    if (result) {
      return res.json({ text: result.text, candidates: [], usageMetadata: null });
    }

    console.error("AI provider failed in /api/ai:", lastError);
    const errorMessage = lastError?.message || String(lastError);
    const transient = isTransientError(lastError);

    return res.status(transient ? 429 : 500).json({
      error: transient ? "RATE_LIMIT_EXCEEDED" : "AI_PROVIDER_ERROR",
      message: transient
        ? "O provedor de IA atingiu temporariamente o limite de requisições ou está sob alta demanda. Aguarde e tente novamente."
        : errorMessage
    });
  } catch (error: any) {
    console.error("Error in /api/ai proxy endpoint:", error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: error?.message || "Erro interno no servidor ao processar chamada de IA."
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OMNI-V50 Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
