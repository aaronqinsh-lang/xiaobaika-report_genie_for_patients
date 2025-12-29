
/**
 * ⚠️ 重要：为了修复 "Could not find a relationship" 错误，
 * 请务必在 Supabase SQL Editor 执行以下命令以建立物理关联：
 * 
 * ALTER TABLE messages 
 * ADD CONSTRAINT fk_session 
 * FOREIGN KEY (session_id) 
 * REFERENCES sessions(id) 
 * ON DELETE CASCADE;
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsywyxrzkrkcvhejoeds.supabase.co';
const supabaseKey = 'sb_publishable_Cjn1NY9LfSqTi3r_BV6B8Q_PA22WFcL';

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- Auth Functions ---
export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });
  if (error) throw error;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// --- Data Functions ---
export const saveSessionToCloud = async (session: any, userId: string) => {
  const { error: sessionError } = await supabase
    .from('sessions')
    .upsert({
      id: session.id,
      user_id: userId,
      title: session.title,
      created_at: new Date(session.createdAt).toISOString()
    });

  if (sessionError) throw sessionError;

  if (session.messages && session.messages.length > 0) {
    const messagesToInsert = session.messages.map((msg: any) => ({
      id: msg.id,
      session_id: session.id,
      role: msg.role,
      content: msg.content,
      analysis: msg.analysis,
      image: msg.image
    }));

    const { error: messageError } = await supabase
      .from('messages')
      .upsert(messagesToInsert);

    if (messageError) throw messageError;
  }
};

export const deleteSessionFromCloud = async (id: string) => {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const fetchSessionsFromCloud = async (userId: string) => {
  // 1. 尝试联表查询（依赖物理外键关联）
  let { data: rawSessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*, messages(*)')
    .eq('user_id', userId);
  
  // 2. 韧性处理：如果报 "Could not find a relationship" 错误，则手动分步查询
  if (sessionsError && (sessionsError.message.includes('relationship') || sessionsError.code === 'PGRST200')) {
    console.warn("Supabase 架构缓存未刷新，尝试分步查询数据...");
    
    // 先查 sessions
    const { data: sData, error: sErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId);
    
    if (sErr) throw sErr;
    if (!sData || sData.length === 0) return [];

    // 再查对应的 messages
    const sessionIds = sData.map(s => s.id);
    const { data: mData, error: mErr } = await supabase
      .from('messages')
      .select('*')
      .in('session_id', sessionIds);
    
    if (mErr) throw mErr;

    // 手动聚合数据
    rawSessions = sData.map(s => ({
      ...s,
      messages: (mData || []).filter(m => m.session_id === s.id)
    }));
  } else if (sessionsError) {
    throw sessionsError;
  }

  return (rawSessions || []).map(s => ({
    id: s.id,
    title: s.title,
    createdAt: new Date(s.created_at).getTime(),
    messages: (s.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      analysis: m.analysis,
      image: m.image,
      reportType: m.analysis?.reportType
    })).sort((a: any, b: any) => {
        const timeA = a.analysis?.timestamp || 0;
        const timeB = b.analysis?.timestamp || 0;
        return timeA - timeB;
    })
  })).sort((a, b) => b.createdAt - a.createdAt);
};

export const submitFeedback = async (messageId: string, userId: string, type: 'up' | 'down') => {
  const { error } = await supabase
    .from('feedback')
    .upsert(
      {
        message_id: messageId,
        user_id: userId,
        type
      },
      { onConflict: 'message_id,user_id' }
    );
  if (error) throw error;
};
