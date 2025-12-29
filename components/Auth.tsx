
import React, { useState } from 'react';
import { supabase, signInWithGoogle } from '../services/supabaseClient';
import { CyberCard, CyberButton } from './CyberCard';
import { Language } from '../types';
import { useStore } from '../store';

export const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info'; action?: () => void } | null>(null);
  const { language } = useStore();

  const t = {
    ZH: {
      title: '小白卡助手',
      subtitle: '连接到云端病例库',
      email: '终端 ID (邮箱)',
      pass: '密钥 (密码)',
      login: '验证连接',
      signup: '申请新秘钥',
      google: '通过 Google 矩阵连接',
      toggle: isSignUp ? '已有秘钥？尝试连接' : '未授权？申请新权限',
      checkEmail: '验证包已发送！请检查邮箱（包括垃圾箱）',
      authError: '验证失败：凭据不匹配。',
      fixSuggest: '点击此处尝试“申请新权限”以修复该账号',
      testTip: '测试账号:',
      autofill: '一键填入',
      processing: '同步中...'
    }
  }.ZH;

  const handleAutofill = () => {
    setEmail('admin@xiaoyibao.com.cn');
    setPassword('123456');
    setMessage(null);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, password, options: { data: { full_name: email.split('@')[0] } }
        });
        if (error) throw error;
        if (data?.user && data.session) {
            setMessage({ text: "连接成功！正在进入矩阵...", type: 'success' });
        } else {
            setMessage({ text: t.checkEmail, type: 'success' });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setMessage({ text: t.authError, type: 'error', action: () => setIsSignUp(true) });
            return;
          }
          throw error;
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-[90vh] px-6">
      <CyberCard glow className="w-full max-w-md animate-in zoom-in-95 duration-700 shadow-[0_0_60px_rgba(233,69,96,0.15)]">
        <div className="text-center mb-10">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-[#e94560] rounded-[24px] animate-pulse blur-3xl opacity-20"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-[24px] flex items-center justify-center shadow-2xl border border-[#e94560]/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-[#e94560]/20 to-transparent"></div>
              <span className="font-orbitron font-bold text-white text-2xl neon-text z-10">小白卡</span>
            </div>
          </div>
          <h2 className="font-orbitron text-2xl text-white mb-2 tracking-tighter neon-text uppercase">{t.title}</h2>
          <p className="text-white/30 text-[9px] uppercase tracking-[0.5em] font-orbitron">{t.subtitle}</p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#e94560]/50 to-purple-600/50 rounded-3xl blur opacity-20 group-focus-within:opacity-100 transition duration-1000"></div>
            <input
              type="email"
              autoComplete="email"
              spellCheck={false}
              autoCapitalize="none"
              placeholder={t.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative w-full bg-[#050507] border border-white/10 rounded-2xl px-6 py-6 text-lg text-white focus:border-[#e94560] outline-none transition-all placeholder:text-white/10"
              required
            />
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#e94560]/50 to-purple-600/50 rounded-3xl blur opacity-20 group-focus-within:opacity-100 transition duration-1000"></div>
            <input
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              spellCheck={false}
              placeholder={t.pass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="relative w-full bg-[#050507] border border-white/10 rounded-2xl px-6 py-6 text-lg text-white focus:border-[#e94560] outline-none transition-all placeholder:text-white/10"
              required
            />
          </div>

          <CyberButton className="w-full py-6 text-sm tracking-[0.3em] font-bold group relative overflow-hidden" disabled={loading}>
            <span className="relative z-10">{loading ? t.processing : isSignUp ? t.signup : t.login}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </CyberButton>
        </form>

        <div className="my-10 flex items-center">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/10"></div>
          <span className="mx-4 text-[8px] text-white/10 font-orbitron tracking-[0.4em] uppercase">安全加密协议</span>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/10"></div>
        </div>

        <button 
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center py-4 rounded-2xl border border-white/5 hover:border-[#e94560]/30 bg-white/2 hover:bg-[#e94560]/5 transition-all group"
        >
          <svg className="w-5 h-5 mr-3 opacity-60 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          </svg>
          <span className="text-[10px] font-orbitron text-white/40 group-hover:text-white/80 transition-colors uppercase tracking-widest">{t.google}</span>
        </button>

        <div className="mt-8 text-center">
          <button 
            type="button"
            className="text-[10px] text-[#e94560] hover:text-[#ff5b75] font-bold transition-colors font-orbitron uppercase tracking-[0.2em] mb-8 underline underline-offset-4"
            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
          >
            {t.toggle}
          </button>
          
          <div className="relative group">
             <div className="absolute -inset-0.5 bg-[#e94560]/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
             <div className="relative p-4 rounded-2xl bg-[#0a0a0f] border border-white/5 flex items-center justify-between transition-all">
                <div className="text-left">
                    <p className="text-[8px] text-white/20 font-orbitron uppercase tracking-widest mb-1">{t.testTip}</p>
                    <p className="text-[9px] text-white/40 font-mono">admin@xiaoyibao.com.cn</p>
                </div>
                <button onClick={handleAutofill} className="px-3 py-1.5 rounded-lg bg-[#e94560]/10 border border-[#e94560]/30 text-[9px] text-[#e94560] font-orbitron hover:bg-[#e94560] hover:text-white transition-all">
                    {t.autofill}
                </button>
             </div>
          </div>
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-xl border text-[10px] text-center font-orbitron animate-in fade-in slide-in-from-top-2 ${
            message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
            message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
            'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}>
            <span>{message.text}</span>
            {message.action && (
                <button onClick={message.action} className="block w-full mt-2 py-1 text-[#e94560] font-bold underline decoration-dotted underline-offset-4 animate-pulse">
                    {t.fixSuggest}
                </button>
            )}
          </div>
        )}
      </CyberCard>
    </div>
  );
};
