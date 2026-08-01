import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { allBrainTools } from "./src/lib/brainTools";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers with 50mb limit for image base64 payloads (Smart Scan, Nutrition photos)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper for async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to sanitize Zod schema for Gemini API (removes exclusiveMinimum / exclusiveMaximum)
function cleanSchema(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanSchema);
  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'exclusiveMinimum' || key === 'exclusiveMaximum') continue;
    newObj[key] = cleanSchema(value);
  }
  return newObj;
}

// In-memory rate limiting map for /api/brain
interface RateLimitRecord {
  count: number;
  dateKey: string;
}
const brainRateLimitMap = new Map<string, RateLimitRecord>();

const getDailyRateLimit = (): number => {
  const envVal = process.env.BRAIN_DAILY_RATE_LIMIT;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // Now the primary interpretation path (not just a fallback), so the default needs
  // real headroom — override with BRAIN_DAILY_RATE_LIMIT once free-tier users are live.
  return 2000; // Default limit per session/IP per day
};

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

// ADK Brain Endpoint (LOOP 4 & LOOP 5)
app.post("/api/brain", async (req, res) => {
  try {
    const { message, healthContextSnapshot, sessionId } = req.body;

    // Rate Limiting (LOOP 5)
    const clientKey = (sessionId && typeof sessionId === "string" && sessionId.trim())
      ? `session:${sessionId.trim()}`
      : `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;

    const todayDateKey = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const limit = getDailyRateLimit();

    const record = brainRateLimitMap.get(clientKey);
    if (record && record.dateKey === todayDateKey) {
      if (record.count >= limit) {
        return res.status(429).json({
          error: "RATE_LIMIT_EXCEEDED",
          message: `Limite diário de requisições do Cérebro OMNI excedido (${limit} chamadas/dia). Tente novamente amanhã.`,
          limit,
          currentUsage: record.count
        });
      }
      record.count += 1;
    } else {
      brainRateLimitMap.set(clientKey, { count: 1, dateKey: todayDateKey });
    }

    // Exclusively use server process.env.GEMINI_API_KEY
    const envKey = process.env.GEMINI_API_KEY?.trim();
    if (!envKey || envKey === "null" || envKey === "undefined" || envKey.startsWith("YOUR_")) {
      return res.status(401).json({
        error: "NO_API_KEY",
        message: "Variável GEMINI_API_KEY do servidor não configurada no ambiente."
      });
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "MISSING_MESSAGE",
        message: "O parâmetro 'message' é obrigatório."
      });
    }

    const ai = new GoogleGenAI({ apiKey: envKey });

    const toolMap = new Map();
    allBrainTools.forEach(t => toolMap.set(t.name, t));

    const functionDeclarations = allBrainTools.map(t => {
      const decl = t._getDeclaration();
      return {
        ...decl,
        parameters: cleanSchema(decl.parameters)
      };
    });

    const systemInstruction = `Você é o Cérebro do Assistente de Saúde e Nutrição OMNI — a ÚNICA camada de interpretação do app. O aplicativo não tem lógica própria de entendimento de linguagem natural nem de cálculo nutricional/médico: tudo isso é sua responsabilidade. O app só grava exatamente os parâmetros que você retornar.
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
   - Medicamentos: normalize nome (sem verbos/data/hora dentro do nome), dosagem e horário faltante (padrão razoável se não informado) antes de chamar medical_history_tool.
   - Datas: "hoje"/"ontem"/"amanhã"/"dia X" — resolva sempre para uma data absoluta (YYYY-MM-DD) antes de enviar; nunca repasse texto relativo cru.
6. Se o pedido tiver informação insuficiente para uma ação seguramente correta (ex: falta identificar qual registro remover entre vários parecidos), use needsClarification=true e clarificationQuestion em vez de adivinhar.`;

    const modelsToTry = ["gemini-2.0-flash"];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: [
              { role: "user", parts: [{ text: message }] }
            ],
            config: {
              systemInstruction,
              tools: [{ functionDeclarations }]
            }
          });
          if (response) break;
        } catch (err: any) {
          lastError = err;
          const errStr = String(err?.message || err).toLowerCase();
          const isTransient = errStr.includes("429") || errStr.includes("503") || errStr.includes("quota") || errStr.includes("resource_exhausted");
          if (isTransient && attempt === 0) {
            await delay(1500);
          } else {
            break;
          }
        }
      }
      if (response) break;
    }

    if (!response) {
      console.error("All Gemini models failed in /api/brain:", lastError);
      return res.status(500).json({
        error: "BRAIN_ERROR",
        message: lastError?.message || "Erro no Cérebro ADK ao processar modelos de IA."
      });
    }

    const functionCalls = response.functionCalls || [];
    const operations: any[] = [];
    const mockToolContext = {} as any;

    for (const call of functionCalls) {
      const tool = toolMap.get(call.name);
      if (tool) {
        try {
          const result = await tool.runAsync({
            args: call.args as any,
            toolContext: mockToolContext
          });
          operations.push(result);
        } catch (err: any) {
          console.error(`Error running tool ${call.name}:`, err);
        }
      }
    }

    const reply = response.text || (operations.length > 0
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

// Centralized Proxy Endpoint for Gemini API with Automatic Key Fallback & Retries
app.post("/api/gemini", async (req, res) => {
  try {
    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const envKey = process.env.GEMINI_API_KEY?.trim();

    const keysToTry: string[] = [];
    if (customKey && customKey.trim() && customKey !== "null" && customKey !== "undefined") {
      keysToTry.push(customKey.trim());
    }
    if (envKey && envKey !== "null" && envKey !== "undefined" && !envKey.startsWith("YOUR_") && !envKey.startsWith("MY_GEM")) {
      if (!keysToTry.includes(envKey)) {
        keysToTry.push(envKey);
      }
    }

    if (keysToTry.length === 0) {
      return res.status(401).json({
        error: "NO_API_KEY",
        message: "Nenhuma chave da API Gemini foi configurada (nem chave customizada do usuário, nem variável GEMINI_API_KEY do servidor)."
      });
    }

    let { model = "gemini-2.5-flash", contents, config } = req.body;

    if (!contents) {
      return res.status(400).json({
        error: "MISSING_CONTENTS",
        message: "O parâmetro 'contents' é obrigatório para realizar a chamada ao Gemini."
      });
    }

    // Prepare candidate models using valid Gemini API aliases
    const defaultModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
    const modelsToTry: string[] = [];
    if (model && typeof model === "string") {
      modelsToTry.push(model);
    }
    for (const fallbackModel of defaultModels) {
      if (!modelsToTry.includes(fallbackModel)) {
        modelsToTry.push(fallbackModel);
      }
    }

    let response: any = null;
    let lastError: any = null;

    // Try keys x models x retries
    for (const apiKey of keysToTry) {
      for (const targetModel of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const ai = new GoogleGenAI({ apiKey });
            response = await ai.models.generateContent({
              model: targetModel,
              contents,
              config,
            });
            if (response) break;
          } catch (err: any) {
            lastError = err;
            const errStr = String(err?.message || err).toLowerCase();
            const isTransient = errStr.includes("503") || errStr.includes("high demand") || errStr.includes("unavailable") || errStr.includes("429") || errStr.includes("quota") || errStr.includes("resource_exhausted");

            console.warn(`Attempt ${attempt + 1} with key (${apiKey.substring(0, 6)}...) and model (${targetModel}) failed:`, err?.message || err);

            if (isTransient && attempt === 0) {
              // Wait 1.5s before retrying transient quota/demand error
              await delay(1500);
            } else {
              break; // Try next model or next key
            }
          }
        }
        if (response) break;
      }
      if (response) break;
    }

    if (response) {
      return res.json({
        text: response.text,
        candidates: response.candidates,
        usageMetadata: response.usageMetadata
      });
    }

    console.error("All available Gemini API keys failed. Last error:", lastError);
    const errorMessage = lastError?.message || String(lastError);
    const isPermissionDenied = errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("forbidden") || lastError?.status === 403;
    const isNotFound = errorMessage.toLowerCase().includes("not_found") || errorMessage.toLowerCase().includes("not found") || lastError?.status === 404;
    const isQuotaOrRateLimit = errorMessage.includes("429") || errorMessage.includes("503") || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("demand") || errorMessage.toLowerCase().includes("resource_exhausted");

    const userFriendlyMessage = isQuotaOrRateLimit
      ? "O serviço de IA do Gemini atingiu temporariamente o limite de requisições por minuto ou está sob alta demanda. Por favor, aguarde alguns instantes e tente novamente."
      : errorMessage;

    return res.status(lastError?.status || (isQuotaOrRateLimit ? 429 : 500)).json({
      error: isPermissionDenied ? "PERMISSION_DENIED" : (isNotFound ? "NOT_FOUND" : (isQuotaOrRateLimit ? "RATE_LIMIT_EXCEEDED" : "GEMINI_ERROR")),
      message: userFriendlyMessage,
      details: lastError?.details || null
    });
  } catch (error: any) {
    console.error("Error in /api/gemini proxy endpoint:", error);
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
