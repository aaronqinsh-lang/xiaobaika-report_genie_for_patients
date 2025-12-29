
export enum AIProvider {
  GEMINI = 'GEMINI',
  FASTGPT = 'FASTGPT',
  DIFY = 'DIFY',
  ZHIPU = 'ZHIPU',
  CUSTOM = 'CUSTOM'
}

export enum ReportType {
  BLOOD = 'BLOOD',
  CT = 'CT',
  MRI = 'MRI',
  ULTRASOUND = 'ULTRASOUND',
  URINE = 'URINE',
  TUMOR_MARKER = 'TUMOR_MARKER',
  LIVER_FUNCTION = 'LIVER_FUNCTION',
  UNKNOWN = 'UNKNOWN'
}

export enum Language {
  ZH = 'ZH',
  EN = 'EN'
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ModelConfig {
  provider: AIProvider;
  baseUrl: string;
  modelName: string;
}

export interface AnalysisDimension {
  title: string;
  conclusion: string; // 核心结论
  highlights: string[]; // 2-3个重点
  content: string; // 详细解读
  severity: 'low' | 'medium' | 'high' | 'info';
  visualHint?: string; // 用于前端渲染图标的关键词
}

export interface MedicalAnalysis {
  id: string;
  timestamp: number;
  reportType: ReportType;
  dimensions: AnalysisDimension[];
  summary: string;
  disclaimer: string;
  generatedIllustration?: string; // AI 生成的视觉图
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  analysis?: MedicalAnalysis;
  image?: string;
  reportType?: ReportType;
  feedback?: 'up' | 'down' | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}
