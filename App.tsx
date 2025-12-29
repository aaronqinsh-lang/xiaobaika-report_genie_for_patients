
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from './store';
import { ReportType, ChatSession, Message, Language } from './types';
import { analyzeMedicalReport, chatAboutReport } from './services/geminiService';
import { ReportUploader } from './components/ReportUploader';
import { MedicalAnalysisView } from './components/MedicalAnalysisView';
import { ModelSettings } from './components/ModelSettings';
import { CyberButton, CyberCard } from './components/CyberCard';
import { Auth } from './components/Auth';
import { supabase, saveSessionToCloud, fetchSessionsFromCloud, signOut } from './services/supabaseClient';

const App: React.FC = () => {
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    user,
    sessions, 
    currentSessionId, 
    activeConfig, 
    language,
    isSyncing,
    setUser,
    addSession, 
    setCurrentSessionId,
    deleteSession,
    setLanguage,
    setSessions,
    setSyncing,
    updateSession
  } = useStore();

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const lastAnalysis = currentSession?.messages.findLast(m => !!m.analysis)?.analysis;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages, isThinking]);

  // Auth Listener
  useEffect(() => {
    const handleSession = (session: any) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          display_name: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name || session.user.email.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url || null,
        });
      } else {
        setUser(null);
        setSessions([]); // 登出时清空会话
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
    return () => subscription.unsubscribe();
  }, [setUser, setSessions]);

  // Sync Sessions from Cloud
  useEffect(() => {
    if (user) {
      const load = async () => {
        setSyncing(true);
        try {
          const data = await fetchSessionsFromCloud(user.id);
          setSessions(data);
          setError(null);
        } catch (e: any) { 
          console.error("Sync Error:", e);
          let errorMessage = "同步服务暂时不可用";
          
          const isQuotaError = 
            e?.name === 'QuotaExceededError' || 
            e?.code === 22 || 
            (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota exceeded'));

          if (isQuotaError) {
             errorMessage = "浏览器本地缓存已满，系统已尝试自动清理旧数据。请刷新页面。";
             // 清理旧版本的所有可能缓存
             ['xiaobai-storage-v1', 'xiaobai-storage-v2', 'xiaobai-storage-v3', 'xiaobai-storage-v4', 'xiaobai-cloud-storage-v5'].forEach(k => localStorage.removeItem(k));
          } else if (typeof e === 'string') {
            errorMessage = e;
          } else if (e?.message) {
            errorMessage = e.message;
          }

          setError(`同步失败: ${errorMessage}`);
        } finally { setSyncing(false); }
      };
      load();
    }
  }, [user, setSessions, setSyncing]);

  const runAnalysis = async (base64: string, type: ReportType) => {
    if (!user) {
      setError("请先登录。");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeMedicalReport(base64, type, Language.ZH);
      const newMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '深度解读完成，您可以针对报告细节进行追问。',
        analysis,
        image: base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`,
        reportType: type
      };
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: `${type} 报告分析 - ${new Date().toLocaleDateString()}`,
        messages: [newMessage],
        createdAt: Date.now()
      };
      addSession(newSession);
      await saveSessionToCloud(newSession, user.id);
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err);
      setError(`AI 引擎异常: ${msg}`);
    } finally { setIsAnalyzing(false); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !currentSession || !lastAnalysis || !user) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: chatInput };
    const updatedMessages = [...currentSession.messages, userMsg];
    updateSession(currentSession.id, { messages: updatedMessages });
    setChatInput('');
    setIsThinking(true);
    try {
      const history = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const aiResponse = await chatAboutReport(history, lastAnalysis, Language.ZH);
      const aiMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: aiResponse };
      const finalMessages = [...updatedMessages, aiMsg];
      const updatedSession = { ...currentSession, messages: finalMessages };
      updateSession(currentSession.id, updatedSession);
      await saveSessionToCloud(updatedSession, user.id);
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err);
      setError(`回复失败: ${msg}`);
    } finally { setIsThinking(false); }
  };

  if (!user) return <Auth />;

  const t = {
    ZH: { dashboard: '医疗终端', settings: 'AI模型配置', logout: '断开连接', history: '病例历史', newCase: '新建诊疗', start: '分析报告', chatPlaceholder: '关于报告我有疑问...', send: '发送指令' }
  }.ZH;

  return (
    <div className="min-h-screen pb-10 bg-[#0a0a12]">
      <header className="sticky top-0 z-50 glass-morphism border-b border-white/5 py-4 px-6 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('main')}>
            <div className="w-12 h-10 bg-[#e94560] rounded-xl flex items-center justify-center shadow-lg shadow-[#e94560]/40 overflow-hidden px-1">
              <span className="font-orbitron font-bold text-white text-[10px] leading-tight text-center">小白卡</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-orbitron font-bold text-white tracking-tighter uppercase">小白卡助手</h1>
              <p className="text-[10px] text-white/40 tracking-[0.2em] font-orbitron uppercase truncate max-w-[150px]">{user.display_name || user.email}</p>
            </div>
          </div>
          <nav className="flex items-center space-x-4 md:space-x-6">
            <button onClick={() => setView('main')} className={`text-xs font-orbitron transition-all ${view === 'main' ? 'text-[#e94560] neon-text' : 'text-white/60 hover:text-white'}`}>{t.dashboard}</button>
            <button onClick={() => setView('settings')} className={`text-xs font-orbitron transition-all ${view === 'settings' ? 'text-[#e94560] neon-text' : 'text-white/60 hover:text-white'}`}>{t.settings}</button>
            <button onClick={signOut} className="text-xs font-orbitron text-red-400/60 hover:text-red-400 transition-all">{t.logout}</button>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span className="text-[9px] text-white/50 font-orbitron uppercase tracking-widest">{isSyncing ? '同步中' : '云端同步'}</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        {error && (
          <div className="mb-8 p-4 bg-red-900/40 border border-red-500/30 rounded-2xl text-red-200 text-sm flex justify-between items-center animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-3">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
              <span className="font-mono text-xs">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white">✕</button>
          </div>
        )}

        {view === 'settings' ? ( <ModelSettings /> ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 space-y-4">
              <h3 className="font-orbitron text-[10px] text-white/30 uppercase tracking-[0.2em] mb-4">{t.history}</h3>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto scroll-hide pr-2">
                <button onClick={() => setCurrentSessionId(null)} className={`w-full p-5 rounded-3xl text-left transition-all border ${!currentSessionId ? 'border-[#e94560] bg-[#e94560]/10 shadow-[0_0_15px_rgba(233,69,96,0.1)]' : 'border-white/5 bg-white/2 hover:bg-white/5'}`}>
                  <span className="font-orbitron text-[10px] text-[#e94560] block mb-1 uppercase tracking-widest">{t.newCase}</span>
                  <span className="text-sm font-medium text-white">{t.start}</span>
                </button>
                {sessions.map(session => (
                  <div key={session.id} onClick={() => setCurrentSessionId(session.id)} className={`relative p-5 rounded-3xl border transition-all cursor-pointer group ${currentSessionId === session.id ? 'border-white/20 bg-white/10' : 'border-white/5 bg-white/2 hover:bg-white/5'}`}>
                    <span className="text-[10px] text-white/30 block mb-1 uppercase tracking-widest">{new Date(session.createdAt).toLocaleDateString()}</span>
                    <span className="text-sm font-medium text-white/80 block truncate">{session.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-9">
              {isAnalyzing ? (
                <div className="h-[65vh] flex flex-col items-center justify-center text-center">
                  <div className="relative w-40 h-40 mb-12">
                    <div className="absolute inset-0 rounded-full border-[2px] border-[#e94560]/5 border-t-[#e94560] animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-[#e94560] rounded-full shadow-[0_0_15px_rgba(233,69,96,1)]"></div>
                    </div>
                  </div>
                  <h3 className="font-orbitron text-2xl text-white tracking-[0.3em] uppercase neon-text">解构中...</h3>
                  <p className="text-white/20 text-[10px] mt-6 uppercase tracking-[0.5em] font-orbitron">AI助手 v4.5</p>
                </div>
              ) : currentSession ? (
                <div className="flex flex-col h-[75vh]">
                  <div className="flex-1 overflow-y-auto pr-2 space-y-12 pb-10 scroll-hide">
                    {currentSession.messages.map(msg => (
                      <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {msg.analysis && (
                          <MedicalAnalysisView 
                            messageId={msg.id} 
                            analysis={msg.analysis} 
                          />
                        )}
                        {msg.role === 'user' ? (
                          <div className="flex justify-end mb-4">
                            <div className="max-w-[80%] bg-[#e94560]/10 border border-[#e94560]/30 rounded-2xl px-5 py-3 text-white/90">
                              {msg.content}
                            </div>
                          </div>
                        ) : !msg.analysis && (
                          <div className="flex justify-start mb-4">
                            <div className="max-w-[80%] glass-morphism border-l-2 border-[#e94560] rounded-2xl px-5 py-3 text-white/80 leading-relaxed">
                              {msg.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {isThinking && (
                      <div className="flex justify-start animate-pulse">
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white/40 text-xs font-orbitron uppercase tracking-widest">
                          AI助手正在解构指令...
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <CyberCard className="mt-4 p-3 flex items-center space-x-3 border-[#e94560]/20">
                    <input 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={t.chatPlaceholder}
                      className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/20 px-3"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={isThinking || !chatInput.trim()}
                      className="bg-[#e94560] hover:bg-[#ff5b75] p-2.5 rounded-xl transition-all shadow-lg shadow-[#e94560]/20 disabled:opacity-30"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </CyberCard>
                </div>
              ) : (
                <ReportUploader onUpload={(file, type) => {
                  const reader = new FileReader();
                  reader.onload = () => runAnalysis((reader.result as string).split(',')[1], type);
                  reader.readAsDataURL(file);
                }} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
