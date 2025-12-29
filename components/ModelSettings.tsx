
import React, { useState } from 'react';
import { useStore } from '../store';
import { AIProvider, Language } from '../types';
import { CyberCard, CyberButton } from './CyberCard';
import { testConnection } from '../services/geminiService';

export const ModelSettings: React.FC = () => {
  const { configs, activeConfig, updateConfig, setActiveProvider, language } = useStore();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [localConfig, setLocalConfig] = useState(activeConfig);

  const t = {
    ZH: {
      title: 'AI模型配置',
      subtitle: '管理您的 AI 提供商和端点。',
      saveBtn: '测试并保存配置',
      endpoint: '端点 URL',
      modelName: '模型名称',
      testing: '验证中...',
      success: '授权验证成功',
      error: '验证失败，请联系管理员',
      managed: '系统自动授权',
      active: '当前活动',
      savedLocally: '配置已加密保存在浏览器本地。',
      apiKeyInfo: 'API 密钥已通过系统环境变量自动注入，无需手动输入。',
      provider: 'AI 提供商'
    },
    EN: {
      title: 'AI Model Settings',
      subtitle: 'Manage your AI providers and endpoints.',
      saveBtn: 'Save & Test',
      endpoint: 'Endpoint URL',
      modelName: 'Model Name',
      testing: 'Testing...',
      success: 'Authorization Success',
      error: 'Authorization Failed',
      managed: 'Auto Authorized',
      active: 'Active Provider',
      savedLocally: 'Settings are saved locally.',
      apiKeyInfo: 'API Key is automatically injected via system environment.',
      provider: 'AI Provider'
    }
  }[language];

  const handleLocalUpdate = (field: string, value: string) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    setTestStatus('idle');
  };

  const handleSaveAndTest = async () => {
    setTestStatus('testing');
    try {
      const isOk = await testConnection();
      if (isOk) {
        updateConfig(localConfig.provider, localConfig);
        setActiveProvider(localConfig.provider);
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (e) {
      setTestStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-10">
        <h2 className="font-orbitron text-2xl text-[#e94560] neon-text uppercase tracking-widest">{t.title}</h2>
        <p className="text-white/40 text-xs mt-2 font-orbitron uppercase tracking-widest">{t.subtitle}</p>
      </div>

      <CyberCard glow className="space-y-6">
        <div>
          <label className="block text-[10px] text-white/30 font-orbitron uppercase tracking-widest mb-3">{t.provider}</label>
          <div className="grid grid-cols-3 gap-3">
            {[AIProvider.GEMINI, AIProvider.FASTGPT, AIProvider.DIFY].map((p) => (
              <button
                key={p}
                onClick={() => handleLocalUpdate('provider', p)}
                className={`py-3 rounded-xl border font-orbitron text-[10px] transition-all ${
                  localConfig.provider === p 
                    ? 'border-[#e94560] bg-[#e94560]/10 text-white shadow-[0_0_15px_rgba(233,69,96,0.1)]' 
                    : 'border-white/5 bg-white/2 text-white/40 hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-white/30 font-orbitron uppercase tracking-widest mb-2">{t.modelName}</label>
            <input 
              value={localConfig.modelName}
              onChange={(e) => handleLocalUpdate('modelName', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#e94560] outline-none transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] text-white/30 font-orbitron uppercase tracking-widest mb-2">{t.endpoint}</label>
            <input 
              value={localConfig.baseUrl}
              onChange={(e) => handleLocalUpdate('baseUrl', e.target.value)}
              placeholder="https://..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#e94560] outline-none transition-all font-mono"
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/2 border border-white/5">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            <span className="text-[10px] text-white/60 font-orbitron uppercase tracking-widest">{t.managed}</span>
          </div>
          <p className="text-[10px] text-white/30 leading-relaxed italic">{t.apiKeyInfo}</p>
        </div>

        <div className="pt-4">
          <CyberButton 
            onClick={handleSaveAndTest}
            className="w-full py-4 text-xs tracking-[0.2em]"
            disabled={testStatus === 'testing'}
          >
            {testStatus === 'testing' ? t.testing : t.saveBtn}
          </CyberButton>
          
          {testStatus !== 'idle' && (
            <div className={`mt-4 p-3 rounded-xl border text-[10px] font-orbitron text-center uppercase tracking-widest ${
              testStatus === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {testStatus === 'success' ? t.success : t.error}
            </div>
          )}
        </div>
      </CyberCard>

      <div className="text-center">
        <p className="text-[9px] text-white/20 font-orbitron uppercase tracking-[0.3em]">{t.savedLocally}</p>
      </div>
    </div>
  );
};
