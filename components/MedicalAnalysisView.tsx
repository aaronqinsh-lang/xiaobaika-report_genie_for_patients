
import React, { useState, useRef } from 'react';
import { MedicalAnalysis, AnalysisDimension, Language, ReportType } from '../types';
import { CyberCard } from './CyberCard';
import { useStore } from '../store';
import { submitFeedback } from '../services/supabaseClient';

interface MedicalAnalysisViewProps {
  messageId: string;
  analysis: MedicalAnalysis;
  onRegenerate?: () => void;
}

const SeverityBadge: React.FC<{ severity: AnalysisDimension['severity']; language: Language }> = ({ severity, language }) => {
  const colors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
    high: 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
  };
  
  const labels = {
    ZH: { low: '低风险', medium: '中风险', high: '高风险', info: '信息' },
    EN: { low: 'Low', medium: 'Medium', high: 'High', info: 'Info' }
  }[language];

  return (
    <span className={`text-[9px] uppercase font-orbitron px-3 py-1 rounded-full border ${colors[severity]}`}>
      {labels[severity as keyof typeof labels]}
    </span>
  );
};

export const MedicalAnalysisView: React.FC<MedicalAnalysisViewProps> = ({ messageId, analysis, onRegenerate }) => {
  const { user, language } = useStore();
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const t = {
    ZH: { 
      title: 'AI助手深度解读报告', 
      caseId: '病例 ID', 
      category: '报告类别', 
      summary: '核心摘要', 
      regenerate: '重新构建分析', 
      feedback: '反馈质量',
      conclusionLabel: '核心结论',
      highlightsLabel: '关键重点',
      audioPlay: '播报摘要',
      audioStop: '停止播放'
    }
  }.ZH;

  const handleFeedback = async (type: 'up' | 'down') => {
    if (!user) return;
    setFeedback(type);
    try {
      await submitFeedback(messageId, user.id, type);
    } catch (e) {
      console.error(e);
    }
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const playSummaryAudio = async () => {
    if (!analysis.summaryAudio) return;
    
    if (isPlaying) {
      sourceNodeRef.current?.stop();
      setIsPlaying(false);
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioBytes = decode(analysis.summaryAudio);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      
      sourceNodeRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (e) {
      console.error("Playback failed:", e);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Concept Illustration */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#e94560] to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative glass-morphism rounded-3xl overflow-hidden border border-white/10">
          {analysis.generatedIllustration ? (
            <div className="relative h-64 w-full">
              <img src={analysis.generatedIllustration} alt="Analysis Concept" className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-8 right-8">
                 <h2 className="text-4xl font-orbitron font-bold text-white neon-text mb-2">{t.title}</h2>
                 <p className="text-white/50 text-xs font-orbitron uppercase tracking-widest">{t.caseId}: {analysis.id} • {new Date(analysis.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <h2 className="text-3xl font-orbitron font-bold text-white neon-text mb-2">{t.title}</h2>
              <p className="text-white/50 text-xs font-orbitron uppercase tracking-widest">{t.caseId}: {analysis.id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <CyberCard className="relative bg-gradient-to-br from-[#e94560]/15 to-transparent border-l-8 border-l-[#e94560] shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-8 bg-[#e94560] rounded-full animate-pulse"></div>
            <h3 className="font-orbitron text-xl text-white uppercase tracking-[0.2em]">{t.summary}</h3>
          </div>
          
          {analysis.summaryAudio && (
            <button 
              onClick={playSummaryAudio}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all border ${
                isPlaying ? 'bg-[#e94560] border-[#e94560] text-white shadow-[0_0_20px_rgba(233,69,96,0.4)]' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <svg className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isPlaying ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
              <span className="text-[10px] font-orbitron uppercase tracking-widest">{isPlaying ? t.audioStop : t.audioPlay}</span>
            </button>
          )}
        </div>
        <p className="text-white/90 leading-relaxed text-lg font-medium">{analysis.summary}</p>
      </CyberCard>

      {/* Deep Dimensions */}
      <div className="grid grid-cols-1 gap-6">
        {analysis.dimensions.map((dim, idx) => (
          <div key={idx} className="relative group animate-in slide-in-from-bottom-6 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
            <CyberCard className="hover:border-[#e94560]/50 transition-all bg-[#1a1a2e]/40 border-white/5">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Metadata */}
                <div className="md:w-1/4">
                  <div className="flex items-center space-x-2 mb-3">
                     <span className="text-[10px] font-orbitron text-[#e94560] opacity-50">#0{idx + 1}</span>
                     <h4 className="font-orbitron text-xs text-white uppercase tracking-widest font-bold">{dim.title}</h4>
                  </div>
                  <SeverityBadge severity={dim.severity} language={Language.ZH} />
                </div>

                {/* Right: Rich Content */}
                <div className="flex-1 space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[9px] font-orbitron text-[#e94560] block mb-2 uppercase tracking-widest">{t.conclusionLabel}</span>
                    <p className="text-white font-bold leading-relaxed">{dim.conclusion}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <span className="text-[9px] font-orbitron text-[#e94560] block mb-1 uppercase tracking-widest">{t.highlightsLabel}</span>
                      <ul className="space-y-2">
                        {dim.highlights.map((h, i) => (
                          <li key={i} className="flex items-start space-x-2 text-sm text-white/80">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#e94560] shadow-[0_0_5px_#e94560]"></span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-sm text-white/50 leading-relaxed border-l border-white/5 pl-4 italic">
                      {dim.content}
                    </div>
                  </div>
                </div>
              </div>
            </CyberCard>
          </div>
        ))}
      </div>

      {/* Interaction Footer */}
      <div className="flex flex-wrap items-center justify-between gap-6 pt-10 border-t border-white/5">
        <button 
          onClick={onRegenerate}
          className="flex items-center space-x-3 text-xs font-orbitron text-white/40 hover:text-[#e94560] transition-all group"
        >
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-[#e94560]/20 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:rotate-180 transition-transform duration-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="uppercase tracking-[0.2em]">{t.regenerate}</span>
        </button>

        <div className="flex items-center space-x-6">
          <span className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-orbitron">{t.feedback}</span>
          <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10">
            <button 
              onClick={() => handleFeedback('up')}
              className={`p-3 rounded-xl transition-all ${feedback === 'up' ? 'bg-green-500/20 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'hover:bg-white/5 text-white/20'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 9.333a3.333 3.333 0 00-.8 1z" />
              </svg>
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
            <button 
              onClick={() => handleFeedback('down')}
              className={`p-3 rounded-xl transition-all ${feedback === 'down' ? 'bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'hover:bg-white/5 text-white/20'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.933a3.333 3.333 0 00.8-1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-[#e94560]/5 rounded-3xl p-6 border border-[#e94560]/20">
        <div className="flex items-center space-x-3 mb-2 text-[#e94560]">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           <span className="font-orbitron text-xs font-bold uppercase tracking-widest">Medical Disclaimer</span>
        </div>
        <p className="text-[11px] text-white/40 leading-relaxed italic">本报告由小白卡助手（AI助手）根据提供数据解读，仅供医学科普参考，不作为最终诊断建议。肿瘤标志物正常不完全等同于无病灶，异常也不等同于患癌，临床结论请务必咨询您的主治医师并结合影像学检查综合判定。</p>
      </div>
    </div>
  );
};
