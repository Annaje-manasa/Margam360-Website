// Conversation history, kept in the visitor's own browser (localStorage).
// Nothing is stored on the server.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'm360-chat-v1';
const MAX_SESSIONS = 20;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function load() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && Array.isArray(j.sessions)) return j;
  } catch { /* storage unavailable */ }
  return null;
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* full or blocked */ }
}
const blank = () => ({ id: uid(), createdAt: Date.now(), updatedAt: Date.now(), messages: [] });

export function titleOf(session) {
  const first = session.messages.find((m) => m.role === 'user');
  return first ? first.content.slice(0, 60) : 'New conversation';
}

export default function useChatStore() {
  const [state, setState] = useState(() => {
    const s = load();
    if (s?.sessions.length) return s;
    const b = blank();
    return { activeId: b.id, sessions: [b] };
  });

  useEffect(() => {
    // don't persist empty sessions
    save({ ...state, sessions: state.sessions.filter((s) => s.messages.length || s.id === state.activeId).slice(0, MAX_SESSIONS) });
  }, [state]);

  const active = state.sessions.find((s) => s.id === state.activeId) || state.sessions[0];

  const setMessages = useCallback((updater) => {
    setState((st) => ({
      ...st,
      sessions: st.sessions.map((s) => s.id === st.activeId
        ? { ...s, messages: typeof updater === 'function' ? updater(s.messages) : updater, updatedAt: Date.now() }
        : s),
    }));
  }, []);

  const newChat = useCallback(() => {
    setState((st) => {
      const cur = st.sessions.find((s) => s.id === st.activeId);
      if (cur && !cur.messages.length) return st; // already on a fresh chat
      const b = blank();
      return { activeId: b.id, sessions: [b, ...st.sessions.filter((s) => s.messages.length)].slice(0, MAX_SESSIONS) };
    });
  }, []);

  const openChat = useCallback((id) => setState((st) => ({ ...st, activeId: id })), []);

  const deleteChat = useCallback((id) => {
    setState((st) => {
      const rest = st.sessions.filter((s) => s.id !== id);
      if (!rest.length) { const b = blank(); return { activeId: b.id, sessions: [b] }; }
      return { activeId: st.activeId === id ? rest[0].id : st.activeId, sessions: rest };
    });
  }, []);

  const history = state.sessions.filter((s) => s.messages.length).sort((a, b) => b.updatedAt - a.updatedAt);

  return { active, messages: active.messages, setMessages, newChat, openChat, deleteChat, history };
}
