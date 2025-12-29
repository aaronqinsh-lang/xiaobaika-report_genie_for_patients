
import { GoogleGenAI, Type } from "@google/genai";
import { MedicalAnalysis, ReportType, AnalysisDimension, Language } from "../types";

export const testConnection = async (): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'ping',
    });
    return !!response.text;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
};

/**
 * 生成医学概念插图（赛博朋克风格）
 */
const generateMedicalIllustration = async (prompt: string): Promise<string | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A futuristic, high-tech cyber-noir medical illustration showing: ${prompt}. Glowing neon lines, deep blues and reds, dark atmosphere, clinical but artistic, 16:9 aspect ratio.` }]
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed:", e);
  }
  return undefined;
};

export const analyzeMedicalReport = async (
  imageContent: string, // base64
  selectedType: ReportType,
  language: Language
): Promise<MedicalAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const targetLang = language === Language.ZH ? 'Chinese (Simplified)' : 'English';
  const systemInstruction = `
    你是“小白卡助手”，一个顶尖的赛博医学分析专家。
    任务：提供极其详尽的报告解读。
    
    结构要求 (JSON 格式):
    1. reportType: 确定的报告类型。
    2. summary: 整个报告的全局结论。
    3. dimensions: 数组，必须包含 10 个维度。
       每个维度包含：
       - title: 维度名称。
       - conclusion: 1句核心结论。
       - highlights: 包含 2-3 个核心发现的数组。
       - content: 深入的临床解读。
       - severity: 'low' | 'medium' | 'high' | 'info'。
       - visualHint: 图标建议。
    4. disclaimer: 专业的免责声明。

    严格遵循：所有文本必须是${targetLang}。内容要专业且富有洞察力。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: imageContent, mimeType: 'image/jpeg' } },
        { text: `请严格以 ${targetLang} 提供深度分析。确保每个维度都有 conclusion 和至少 2 个 highlights。` }
      ]
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reportType: { type: Type.STRING },
          summary: { type: Type.STRING },
          dimensions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                conclusion: { type: Type.STRING },
                highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                content: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['low', 'medium', 'high', 'info'] },
                visualHint: { type: Type.STRING }
              },
              required: ['title', 'conclusion', 'highlights', 'content', 'severity']
            }
          },
          disclaimer: { type: Type.STRING }
        },
        required: ['reportType', 'summary', 'dimensions', 'disclaimer']
      }
    }
  });

  const rawJson = JSON.parse(response.text);
  
  // 异步生成背景插图
  const illustration = await generateMedicalIllustration(rawJson.summary);

  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    reportType: rawJson.reportType as ReportType,
    dimensions: rawJson.dimensions as AnalysisDimension[],
    summary: rawJson.summary,
    disclaimer: rawJson.disclaimer,
    generatedIllustration: illustration
  };
};

export const chatAboutReport = async (
  history: { role: 'user' | 'assistant', content: string }[],
  analysis: MedicalAnalysis,
  language: Language
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const systemInstruction = `
    你是“小白卡助手”，医疗报告解读专家。
    当前病例背景：
    - 类型：${analysis.reportType}
    - 核心摘要：${analysis.summary}
    - 分析详情：${JSON.stringify(analysis.dimensions)}

    回复格式准则（严格执行）：
    1. 禁用 Markdown 标题（如 #, ##, ###）。
    2. 使用【】作为栏目标题，例如：【核心定义】。
    3. 每一段落之间必须空一行，保持视觉清爽。
    4. 重点信息使用“>>”符号引导，分行排列。
    5. 结构分层逻辑：定义 -> 数值解读 -> 临床建议 -> 温馨提示。
    6. 禁止使用复杂的 Markdown 表格。
    7. 回答完全使用中文。
    8. 每次回答最后固定提醒：[建议不能代替面诊]。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
    })),
    config: {
      systemInstruction,
      temperature: 0.7,
    }
  });

  return response.text || "系统响应异常。";
};
