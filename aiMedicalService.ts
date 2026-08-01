import { GoogleGenAI, Type } from "@google/genai";
import { ExamRecord, ConsultationRecord, MedicalCertificateRecord, BiomarkerResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractionProgress {
  step: 'uploading' | 'reading' | 'extracting' | 'saving' | 'idle' | 'error';
  message: string;
  progress: number;
}

export async function extractExamData(fileData: string, mimeType: string): Promise<Partial<ExamRecord>> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract structured medical data from this exam report.
    Return a JSON object with the following fields:
    - examName: string
    - examCategory: string (one of the predefined categories like 'Blood Tests', 'Imaging Exams', etc.)
    - provider: string (clinic or hospital name)
    - doctorResponsible: string (if available)
    - status: 'Normal' | 'Attention Required' | 'Abnormal' | 'Pending Results'
    - methodUsed: string
    - materialUsed: string
    - results: array of objects with:
      - name: string (biomarker name, e.g., 'Hemoglobin')
      - value: string or number
      - unit: string (e.g., 'g/dL')
      - referenceRange: string
      - status: 'Normal' | 'Attention Required' | 'Abnormal'
      - method: string
      - material: string

    Focus on accuracy. If a field is not found, leave it empty or null.
    For blood tests like Hemogram, extract Hemoglobin, Hematocrit, Red Blood Cells, Leukocytes, Platelets.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: fileData.split(',')[1], // Remove data:image/png;base64,
              mimeType: mimeType
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          examName: { type: Type.STRING },
          examCategory: { type: Type.STRING },
          provider: { type: Type.STRING },
          doctorResponsible: { type: Type.STRING },
          status: { type: Type.STRING },
          methodUsed: { type: Type.STRING },
          materialUsed: { type: Type.STRING },
          results: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.STRING },
                unit: { type: Type.STRING },
                referenceRange: { type: Type.STRING },
                status: { type: Type.STRING },
                method: { type: Type.STRING },
                material: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function extractReportData(fileData: string, mimeType: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Read this medical report (laudo) and generate structured, concise notes summarizing the findings, diagnosis, and recommendations.
    Return only the summarized text.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: fileData.split(',')[1],
              mimeType: mimeType
            }
          }
        ]
      }
    ]
  });

  return response.text || "";
}

export async function extractCertificateData(fileData: string, mimeType: string): Promise<Partial<MedicalCertificateRecord>> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract structured data from this medical certificate (atestado médico).
    Return a JSON object with:
    - doctorName: string
    - date: string (ISO format or YYYY-MM-DD)
    - duration: string (e.g., '5 days', '2 hours')
    - reason: string (reason for the certificate/CID if available)
    - notes: string (any additional observations)
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: fileData.split(',')[1],
              mimeType: mimeType
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          doctorName: { type: Type.STRING },
          date: { type: Type.STRING },
          duration: { type: Type.STRING },
          reason: { type: Type.STRING },
          notes: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
