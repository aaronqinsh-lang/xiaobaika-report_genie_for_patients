
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AIProvider, ModelConfig, ChatSession, Language, UserProfile } from './types';
import { deleteSessionFromCloud } from './services/supabaseClient';

/**
 * 💡 确认：报错中的“空间超出”确实是由上传的医疗报告图片（Base64 字符串）引起的。
 * 修复策略：
 * 1. sessions（包含大图片）现在仅保存在内存和云端，不再存入 LocalStorage。
 * 2. 自动清理旧版缓存键，释放 5MB 的限制空间。
 */

const OLD_STORAGE_KEYS = [
  'xiaobai-storage-v1',
  'xiaobai-storage-v2',
  'xiaobai-storage-v3',
  'xiaobai-storage-v4',
  'xiaobai-cloud-storage-v5'
];

try {
  OLD_STORAGE_KEYS.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`[Storage Cleanup] 成功移除旧版超量缓存: ${key}`);
    }
  });
} catch (e) {
  console.error('[Storage Cleanup] 清理失败:', e);
}

interface AppState {
  user: UserProfile | null;
  sessions: ChatSession[];
  currentSessionId: string | null;
  activeConfig: ModelConfig;
  configs: Record<AIProvider, ModelConfig>;
  language: Language;
  isSyncing: boolean;
  
  setUser: (user: UserProfile | null) => void;
  setSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (id: string, session: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
  setCurrentSessionId: (id: string | null) => void;
  updateConfig: (provider: AIProvider, config: Partial<ModelConfig>) => void;
  setActiveProvider: (provider: AIProvider) => void;
  setLanguage: (lang: Language) => void;
  setSyncing: (syncing: boolean) => void;
}

const defaultConfigs: Record<AIProvider, ModelConfig> = {
  [AIProvider.GEMINI]: {
    provider: AIProvider.GEMINI,
    baseUrl: '',
    modelName: 'gemini-3-flash-preview',
  },
  [AIProvider.FASTGPT]: { provider: AIProvider.FASTGPT, baseUrl: '', modelName: '' },
  [AIProvider.DIFY]: { provider: AIProvider.DIFY, baseUrl: '', modelName: '' },
  [AIProvider.ZHIPU]: { provider: AIProvider.ZHIPU, baseUrl: '', modelName: '' },
  [AIProvider.CUSTOM]: { provider: AIProvider.CUSTOM, baseUrl: '', modelName: '' }
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      sessions: [],
      currentSessionId: null,
      activeConfig: defaultConfigs[AIProvider.GEMINI],
      configs: defaultConfigs,
      language: Language.ZH,
      isSyncing: false,

      setUser: (user) => set({ user }),
      setSessions: (sessions) => set({ sessions }),
      addSession: (session) => set((state) => ({ 
        sessions: [session, ...state.sessions],
        currentSessionId: session.id 
      })),
      updateSession: (id, sessionUpdate) => set((state) => ({
        sessions: state.sessions.map(s => s.id === id ? { ...s, ...sessionUpdate } : s)
      })),
      deleteSession: (id) => set((state) => {
        deleteSessionFromCloud(id).catch(console.error);
        return {
          sessions: state.sessions.filter(s => s.id !== id),
          currentSessionId: state.currentSessionId === id ? null : state.currentSessionId
        };
      }),
      setCurrentSessionId: (id) => set({ currentSessionId: id }),
      updateConfig: (provider, configUpdate) => set((state) => {
        const newConfigs = { ...state.configs, [provider]: { ...state.configs[provider], ...configUpdate } };
        return { configs: newConfigs, activeConfig: state.activeConfig.provider === provider ? newConfigs[provider] : state.activeConfig };
      }),
      setActiveProvider: (provider) => set((state) => ({ activeConfig: state.configs[provider] })),
      setLanguage: (language) => set({ language }),
      setSyncing: (isSyncing) => set({ isSyncing })
    }),
    { 
      name: 'xiaobai-cloud-storage-v6', // 升级版本号以应用新策略
      // 核心修复：只持久化配置和语言，完全排除包含大图片的 sessions
      partialize: (state) => ({
        configs: state.configs,
        activeConfig: state.activeConfig,
        language: state.language
      }),
    }
  )
);
