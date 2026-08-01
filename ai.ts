import { GoogleGenAI } from "@google/genai";
import { jsonrepair } from "jsonrepair";
import { redactImagePII } from "./lgpd";
import { logError } from "./logger";
import { safeLocalStorage } from "./utils";

export function getGoogleGenAI(): any {
  return {
    models: {
      generateContent: async (params: { model?: string; contents: any; config?: any }) => {
        let localKey = safeLocalStorage.getItem('gemini_api_key');
        if (localKey) {
          localKey = localKey.trim();
          if (localKey === "null" || localKey === "undefined" || localKey === "") {
            localKey = null;
          }
        }

        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (localKey) {
            headers['x-gemini-api-key'] = localKey;
          }

          const response = await fetch('/api/gemini', {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
          });

          const data = await response.json();

          if (!response.ok) {
            const errorMsg = data.message || `Erro ao chamar a API Gemini (${response.status})`;
            logError({
              type: 'ai',
              module: 'Gemini Proxy /api/gemini',
              message: errorMsg,
              metadata: { status: response.status, model: params?.model },
            });
            throw new Error(errorMsg);
          }

          return {
            text: data.text || "",
            candidates: data.candidates || [],
            usageMetadata: data.usageMetadata || null,
          };
        } catch (fetchErr: any) {
          console.warn("Backend proxy /api/gemini error, attempting direct client SDK fallback...", fetchErr);
          
          const envKey = process.env.GEMINI_API_KEY?.trim();
          const activeKey = localKey || (envKey && !envKey.startsWith("YOUR_") ? envKey : "");
          if (activeKey) {
            try {
              const directAi = new GoogleGenAI({ apiKey: activeKey });
              return await directAi.models.generateContent(params as any);
            } catch (directErr: any) {
              logError({
                type: 'ai',
                module: 'Gemini Client SDK Fallback',
                message: directErr.message || 'Error executing direct Gemini call',
                stack: directErr.stack,
              });
              throw directErr;
            }
          }

          logError({
            type: 'ai',
            module: 'Gemini AI Engine',
            message: fetchErr.message || 'Failed to generate content with Gemini',
            stack: fetchErr.stack,
          });
          throw fetchErr;
        }
      }
    }
  };
}

export function cleanAiResponse(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  
  // 1. Try to extract content from markdown code blocks
  const codeBlockRegex = /```(?:json)?\n?([\s\S]*?)\n?```/g;
  const matches = [...cleaned.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    // If we found blocks, join their contents
    cleaned = matches.map(m => m[1]).join("\n").trim();
  }

  // 2. If it doesn't start with { or [, try to find the first occurrence
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const startBrace = cleaned.indexOf('{');
    const startBracket = cleaned.indexOf('[');
    const start = (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) ? startBrace : startBracket;
    
    if (start !== -1) {
      cleaned = cleaned.substring(start);
    }
  }
  
  // 3. If it doesn't end with } or ], try to find the last occurrence
  if (!cleaned.endsWith('}') && !cleaned.endsWith(']')) {
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    
    if (end !== -1) {
      cleaned = cleaned.substring(0, end + 1);
    }
  }
  
  return cleaned.trim();
}

export function safeJsonParse<T>(text: string, defaultValue: T): T {
  if (!text) return defaultValue;
  
  // Helper to try parsing a string with various recovery steps
  const tryParse = (str: string): T | null => {
    if (!str) return null;
    
    const attempt = (s: string): T | null => {
      try {
        return JSON.parse(s) as T;
      } catch (e: any) {
        // If it's a trailing character error, try to fix it manually
        if (e.message?.includes('Unexpected non-whitespace character after JSON') || 
            e.message?.includes('Unexpected character "."')) {
          try {
            const trimmed = s.trim().replace(/[.,;!]+$/, '');
            return JSON.parse(trimmed) as T;
          } catch { /* ignore */ }
        }
        return null;
      }
    };

    // 1. Pure JSON parse
    const r1 = attempt(str);
    if (r1 !== null) return r1;

    // 2. Jsonrepair
    try {
      const repaired = jsonrepair(str);
      const r2 = attempt(repaired);
      if (r2 !== null) return r2;
    } catch { /* ignore */ }

    // 3. Aggressive cleaning + Jsonrepair
    try {
      const aggressive = str
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
        .trim();
      const repaired = jsonrepair(aggressive);
      return attempt(repaired);
    } catch {
      return null;
    }
  };

  // 1. Try cleaned response first
  const cleaned = cleanAiResponse(text);
  const result1 = tryParse(cleaned);
  if (result1 !== null) return result1;

  // 2. Surgical recovery: find all { } or [ ] blocks and try them
  const findBlocks = (input: string, startChar: '{' | '[', endChar: '}' | ']'): string[] => {
    const blocks: string[] = [];
    let pos = 0;
    
    while (pos < input.length) {
      const start = input.indexOf(startChar, pos);
      if (start === -1) break;
      
      let depth = 0;
      let inString = false;
      let escaped = false;
      let found = false;
      
      for (let i = start; i < input.length; i++) {
        const char = input[i];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        
        if (!inString) {
          if (char === startChar) depth++;
          else if (char === endChar) {
            depth--;
            if (depth === 0) {
              blocks.push(input.substring(start, i + 1));
              pos = i + 1;
              found = true;
              break;
            }
          }
        }
      }
      
      if (!found) {
        // Fallback to last index if matching failed
        const lastEnd = input.lastIndexOf(endChar);
        if (lastEnd > start) {
          blocks.push(input.substring(start, lastEnd + 1));
          pos = lastEnd + 1;
        } else {
          pos = start + 1;
        }
      }
    }
    
    return blocks;
  };

  // Try all object blocks
  const objectBlocks = findBlocks(text, '{', '}');
  for (const block of objectBlocks) {
    const res = tryParse(block);
    if (res !== null) return res;
  }

  // Try all array blocks
  const arrayBlocks = findBlocks(text, '[', ']');
  for (const block of arrayBlocks) {
    const res = tryParse(block);
    if (res !== null) return res;
  }

  console.error("All JSON recovery attempts failed for text:", text.substring(0, 100) + "...");
  return defaultValue;
}

export async function extractMedicalData(files: { data: string, mimeType: string }[], language: string = 'pt-BR') {
  try {
    const model = "gemini-3.6-flash";
    
    // LGPD & Multimodal pre-processing: Detect exact mimeType for PDF, TXT or Images
    const redactedFiles = await Promise.all(files.map(async f => {
      let effectiveMime = f.mimeType;

      if (f.data.startsWith('data:')) {
        const matches = f.data.match(/^data:(.*?);base64,/);
        if (matches && matches[1]) {
          effectiveMime = matches[1];
        }
      }

      if (!effectiveMime || effectiveMime === 'application/octet-stream') {
        if (f.data.startsWith('data:application/pdf')) {
          effectiveMime = 'application/pdf';
        } else if (f.data.startsWith('data:text/plain')) {
          effectiveMime = 'text/plain';
        } else {
          effectiveMime = 'image/jpeg';
        }
      }

      return {
        ...f,
        mimeType: effectiveMime,
        data: await redactImagePII(f.data)
      };
    }));

    const prompt = `
        Você é o motor de processamento do "AI Smart Scan" do RLT - Real Life Track 1.0 (LGPD Protocol).
        Sua tarefa é analisar o(s) documento(s) médico(s) em anexo (fotos, arquivos PDF ou documentos de texto TXT) e extrair dados estruturados para preenchimento automático.
        
        INSTRUÇÕES DE IDIOMA:
        - Responda exclusivamente no idioma: ${language}.
        - Mantenha termos médicos universais e códigos CID entre parênteses, mas a explicação deve ser em ${language}.
        
        PROTOCOLO DE PRIVACIDADE (LGPD):
        - O usuário é identificado apenas como "User_ID_Alpha".
        - Se encontrar nomes reais, CPFs, RGs ou endereços, ignore-os ou substitua por "[REDACTED]".
        - O sistema já aplicou uma máscara de privacidade (redação) nas áreas sensíveis.
        
        FOCO ESPECIAL EM ATESTADOS MÉDICOS, EXAMES LABORATORIAIS EM PDF E LAUDOS:
        1. Instituição: Nome da clínica, laboratório ou hospital.
        2. Paciente: Confirmar se o nome no documento corresponde ao usuário logado (User_ID_Alpha).
        3. CID / Diagnóstico: Identificar códigos CID-10 ou a descrição da patologia.
        4. Período de Afastamento: Extrair o número de dias ou horas e a data de início/fim.
        5. CRM do Médico: Localizar e validar o registro do profissional.
        6. Biomarcadores e Laudos: Em exames em PDF (ex: Hemograma, Perfil Lipídico, Hormônios), extraia todos os valores medidos e faixas de referência.
        
        FORMATO DE SAÍDA (JSON APENAS):
        {
          "extracted_data": {
            "title": "Nome principal (ex: Hemograma Completo, Atestado Médico, Laudo RX)",
            "date": "Data do documento (ISO 8601)",
            "category": "Exams" | "Consultations" | "Medical History" | "Medical Certificate",
            "status": "NORMAL" | "ALERT" | "Scheduled" | "Completed",
            "exam_category": "Blood Tests" | "Imaging Exams" | "Cardiology" | "Other",
            "critical_markers": ["Marcadores fora da referência"],
            "priority": boolean,
            "recommendations": ["Resumo das recomendações"],
            "metabolic_impact": boolean,
            "doctor_name": "Nome do médico (se houver)",
            "specialty": "Especialidade (se houver)",
            "doctor_crm": "CRM do médico (se houver)",
            "certificate_info": {
              "institution": "Nome da clínica/hospital",
              "patient_name": "Nome do paciente",
              "is_patient_confirmed": boolean,
              "cid": "Código CID-10",
              "diagnosis": "Descrição da patologia",
              "leave_period": {
                "value": number,
                "unit": "hours" | "days",
                "start_date": "ISO 8601",
                "end_date": "ISO 8601"
              }
            },
            "prescriptions": [
              {
                "medicationName": "Nome do remédio",
                "dosage": "Dose (ex: 500mg)",
                "frequency": "Frequência (ex: 8/8h)",
                "duration": "Duração (ex: 7 dias)"
              }
            ],
            "results": [
              {
                "name": "Nome do biomarcador",
                "value": "Valor encontrado",
                "unit": "Unidade",
                "referenceRange": "Faixa de referência"
              }
            ]
          }
        }

        REGRAS:
        1. Se for um atestado, use category: "Medical Certificate".
        2. Se for uma receita, use category: "Consultations".
        3. Se for um exame, use category: "Exams".
        4. Identifique se há impacto metabólico (ex: alterações em glicose, tireoide, cortisol).
        5. Seja extremamente preciso com dosagens e nomes de medicamentos.
        6. Consolide dados de múltiplos arquivos ou páginas de PDF se necessário.
      `;

    const ai = getGoogleGenAI();
    const result = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            ...redactedFiles.map(f => ({
              inlineData: {
                data: f.data.split(",")[1], // Remove data:image/png;base64,
                mimeType: f.mimeType,
              },
            })),
          ],
        },
      ],
      config: { responseMimeType: "application/json" }
    });

    const text = result.text || "";
    return safeJsonParse(text, null);
  } catch (error) {
    console.error("Error extracting medical data:", error);
    return null;
  }
}

export async function generateMedicationInsights(medicationName: string, dosage: string, language: string = 'pt-BR') {
  try {
    const model = "gemini-3.6-flash";
    const prompt = `
      Você é um assistente farmacêutico especializado.
      Gere um resumo de "Cuidados e Observações" para o seguinte medicamento:
      Nome: ${medicationName}
      Dosagem: ${dosage}

      O resumo deve incluir:
      1. Interações alimentares (ex: tomar com comida, evitar álcool).
      2. Efeitos colaterais comuns.
      3. Melhores práticas (ex: horários ideais, armazenamento).
      4. Alertas importantes (ex: não interromper o tratamento).

      INSTRUÇÕES DE IDIOMA (OMNI-V50):
      - Responda inteiramente no idioma: ${language}.
      - Mantenha os termos técnicos universais (CIDs e nomes de substâncias) em parênteses ao lado da tradução, se necessário.
      - Seja conciso, direto e use um tom profissional e cuidadoso.
      - Máximo de 3-4 parágrafos curtos ou tópicos.
    `;

    const ai = getGoogleGenAI();
    const result = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return result.text || "Não foi possível gerar insights para este medicamento.";
  } catch (error) {
    console.error("Error generating medication insights:", error);
    return "Erro ao conectar com o serviço de IA.";
  }
}
