
import { GoogleGenAI, Type } from "@google/genai";
import { AIDataResponse } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY}); strictly as required.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseNaturalLanguage = async (text: string): Promise<AIDataResponse> => {
  const prompt = `
    حلل النص التالي المستخرج من مشغل خياطة وحوله إلى بيانات منظمة بصيغة JSON.
    النص: "${text}"

    القواعد:
    1. إذا كان النص يتحدث عن إنتاج عاملة (مثلاً: حنان عملت 50 قبة بسعر 0.1)، نوع البيانات هو 'production'.
    2. إذا كان النص يتحدث عن سلفة لعاملة (مثلاً: سلفة لسميرة 100 شيكل)، نوع البيانات هو 'advance'.
    3. إذا كان النص يتحدث عن مصاريف عامة (مثلاً: فاتورة كهرباء 200 شيكل)، نوع البيانات هو 'expense'.
    4. في الإنتاج، استخرج 'worker_name', 'task_name', 'quantity', 'worker_rate', 'supplier_rate'.
    5. في السلف والمصاريف، استخرج 'amount' و 'note'.
    6. العملة هي الشيكل دائماً.
  `;

  try {
    // Generate content using the recommended Gemini 3 Flash model for text processing tasks.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['production', 'advance', 'expense', 'unknown'] },
            data: {
              type: Type.OBJECT,
              properties: {
                worker_name: { type: Type.STRING },
                task_name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                worker_rate: { type: Type.NUMBER },
                supplier_rate: { type: Type.NUMBER },
                amount: { type: Type.NUMBER },
                category: { type: Type.STRING },
                note: { type: Type.STRING }
              }
            }
          },
          required: ["type", "data"]
        }
      }
    });

    // Access text property directly from the response as per extracting text guidelines.
    const jsonStr = response.text?.trim() || '{}';
    return JSON.parse(jsonStr) as AIDataResponse;
  } catch (error) {
    console.error("Gemini Error:", error);
    return { type: 'unknown', data: {} };
  }
};
