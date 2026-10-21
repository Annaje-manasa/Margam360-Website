import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Markdown from './Markdown.jsx';
import useChatStore, { titleOf } from './useChatStore.js';
import { streamChat } from './transport.js';
import aiRobot from '../../assets/ai-robot.png';
import cardWave from '../../assets/card-wave-clean.png';
import './chat.css';

const SUGGESTIONS = [
  'What services do you offer?',
  'How does the free strategy call work?',
  'How much do your services cost?',
  'What results have clients seen?',
  'How do you use AI in marketing?',
  'Where is your office?',
  'What is your process?',
  'Do you work with US businesses?',
];
const MAX_CHARS = 1500;

const Orb = ({ size = 34, live = false }) => (
  <span className={`cw-orb ${live ? 'is-live' : ''}`} style={{ '--s': `${size}px` }} aria-hidden="true">
    <img src={aiRobot} alt="" width={size} height={size} />
  </span>
);

const Icon = {
  chat: (
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <path
        d="M5 13.5C5 8.8 8.8 5 13.5 5h1C19.2 5 23 8.8 23 13.5c0 4.7-3.8 8.5-8.5 8.5h-1.8l-4.2 3.4c-.6.5-1.5.1-1.5-.7v-2.8C5.8 20.3 5 17 5 13.5z"
        fill="#ffffff"
      />
      <circle cx="10.8" cy="13.5" r="1.3" fill="#E5261F" />
      <circle cx="14" cy="13.5" r="1.3" fill="#E5261F" />
      <circle cx="17.2" cy="13.5" r="1.3" fill="#E5261F" />
    </svg>
  ),
  close: <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  plus: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  history: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4h4M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  send: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  stop: <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" /></svg>,
  trash: <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  back: <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

function timeAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function ChatWidget() {
  const { active, messages, setMessages, newChat, openChat, deleteChat, history } = useChatStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('chat'); // chat | history
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | waiting | streaming
  const [teaser, setTeaser] = useState(true);
  const ctlRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fabRef = useRef(null);
  const stickRef = useRef(true);

  const busy = status !== 'idle';
  const msgsRef = useRef(messages);
  msgsRef.current = messages;
  const sendRef = useRef(null);

  /* ---------- open / close ---------- */
  const show = useCallback((prompt) => {
    setOpen(true);
    setTeaser(false);
    setView('chat');
    if (typeof prompt === 'string' && prompt) setTimeout(() => sendRef.current?.(prompt), 50);
  }, []);
  const hide = useCallback(() => { setOpen(false); fabRef.current?.focus(); }, []);

  useEffect(() => {
    const onOpen = (e) => show(e.detail?.prompt);
    const onNav = () => { if (window.matchMedia('(max-width: 560px)').matches) setOpen(false); };
    window.addEventListener('m360:open-chat', onOpen);
    window.addEventListener('m360:chat-navigate', onNav);
    return () => { window.removeEventListener('m360:open-chat', onOpen); window.removeEventListener('m360:chat-navigate', onNav); };
  }, [show]);

  // gentle teaser bubble, once per browser session
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('m360-chat-teaser') === '1'; } catch { /* ignore */ }
    if (seen) return;
    const t = setTimeout(() => {
      setTeaser(true);
      try { sessionStorage.setItem('m360-chat-teaser', '1'); } catch { /* ignore */ }
    }, 9000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 220);
    const mobile = window.matchMedia('(max-width: 560px)').matches;
    if (mobile) document.documentElement.classList.add('cw-lock');
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); document.documentElement.classList.remove('cw-lock'); };
  }, [open, hide]);

  /* ---------- scrolling ---------- */
  const onScroll = () => {
    const el = listRef.current;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, status, open, view]);

  /* ---------- sending ---------- */
  const run = useCallback(async (history) => {
    ctlRef.current?.abort();
    const ctl = new AbortController();
    ctlRef.current = ctl;
    stickRef.current = true;
    setStatus('waiting');
    const payload = history.filter((m) => !m.error && m.content.trim()).map(({ role, content }) => ({ role, content }));
    let started = false;
    try {
      await streamChat(payload, {
        signal: ctl.signal,
        onText: (text) => {
          if (!started) {
            started = true;
            setStatus('streaming');
            setMessages((ms) => [...ms, { role: 'assistant', content: text, at: Date.now() }]);
          } else {
            setMessages((ms) => { const c = ms.slice(); c[c.length - 1] = { ...c[c.length - 1], content: text }; return c; });
          }
        },
      });
    } catch (e) {
      if (e.code === 'cancelled') {
        if (started) setMessages((ms) => { const c = ms.slice(); c[c.length - 1] = { ...c[c.length - 1], stopped: true }; return c; });
      } else {
        setMessages((ms) => {
          const c = started ? ms.slice(0, -1) : ms.slice();
          if (started && e.partial) c.push({ role: 'assistant', content: e.partial, at: Date.now(), stopped: true });
          c.push({ role: 'assistant', content: e.message, error: true, at: Date.now() });
          return c;
        });
      }
    } finally {
      if (ctlRef.current === ctl) { ctlRef.current = null; setStatus('idle'); }
    }
  }, [setMessages]);

  const send = useCallback((textArg) => {
    const text = (typeof textArg === 'string' ? textArg : input).trim().slice(0, MAX_CHARS);
    if (!text) return;
    setInput('');
    setView('chat');
    const next = [...msgsRef.current.filter((m) => !m.error), { role: 'user', content: text, at: Date.now() }];
    setMessages(next);
    run(next);
  }, [input, run, setMessages]);
  sendRef.current = send;

  const stop = () => ctlRef.current?.abort();

  const retry = () => {
    const clean = msgsRef.current.filter((m) => !m.error);
    // drop a partial/stopped answer after the last question
    while (clean.length && clean[clean.length - 1].role === 'assistant') clean.pop();
    if (!clean.length) return;
    setMessages(clean);
    run(clean);
  };

  const startNew = () => { stop(); newChat(); setView('chat'); setInput(''); setTimeout(() => inputRef.current?.focus(), 50); };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!busy) send();
    }
  };

  // auto-grow textarea
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 132) + 'px';
  }, [input, open]);

  const asked = new Set(messages.filter((m) => m.role === 'user').map((m) => m.content));
  const followUps = SUGGESTIONS.filter((s) => !asked.has(s)).slice(0, 2);
  const last = messages[messages.length - 1];
  const showFollowUps = !busy && last?.role === 'assistant' && !last.error;

  return (
    <div className={`cw ${open ? 'is-open' : ''}`}>
      {/* teaser */}
      {teaser && !open && (
        <div className="cw-teaser" role="status">
          <div className="cw-teaser-wave" style={{ backgroundImage: `url(${cardWave})` }} aria-hidden="true" />
          <button className="cw-teaser-body" onClick={() => show()}>
            <div className="cw-teaser-avatar">
              <img src={aiRobot} alt="Margam AI Assistant" width="60" height="60" />
            </div>
            <div className="cw-teaser-content">
              <div className="cw-teaser-tag">
                <span className="cw-teaser-tag-line" /> MARGAM AI
              </div>
              <h4 className="cw-teaser-title">
                Questions about <span className="cw-teaser-highlight">growing your brand?</span>
              </h4>
              <p className="cw-teaser-desc">
                Ask Margam AI, our assistant. It replies instantly.
              </p>
            </div>
          </button>
          <button className="cw-teaser-x" aria-label="Dismiss" onClick={() => setTeaser(false)}>
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* launcher */}
      <button
        ref={fabRef}
        className="cw-fab"
        data-magnetic="0.25"
        data-cursor={open ? undefined : 'Ask AI'}
        aria-label={open ? 'Close chat' : 'Chat with Margam AI'}
        aria-expanded={open}
        aria-controls="cw-panel"
        onClick={() => (open ? hide() : show())}
      >
        <span className="cw-fab-aura" aria-hidden="true" />
        <span className="cw-fab-orbit" aria-hidden="true">
          <span className="cw-fab-satellite" />
        </span>
        <span className="cw-fab-ring" aria-hidden="true" />
        <span className="cw-fab-icon cw-fab-chat">{Icon.chat}</span>
        <span className="cw-fab-icon cw-fab-close">{Icon.close}</span>
      </button>

      {/* panel */}
      <section id="cw-panel" className="cw-panel" role="dialog" aria-modal="false" aria-label="Chat with Margam AI" aria-hidden={!open} inert={!open}>
        <header className="cw-head">
          {view === 'history' ? (
            <button className="cw-icon" onClick={() => setView('chat')} aria-label="Back to chat">{Icon.back}</button>
          ) : (
            <Orb live={busy} />
          )}
          <div className="cw-head-text">
            <strong>{view === 'history' ? 'Conversations' : 'Margam AI'}</strong>
            <span>{view === 'history' ? 'Saved on this device only' : (<><i className="cw-dot" /> {busy ? 'Typing…' : 'Online · replies in seconds'}</>)}</span>
          </div>
          <div className="cw-head-actions">
            {view === 'chat' && <button className="cw-icon" onClick={() => setView('history')} aria-label="Conversation history" title="History">{Icon.history}</button>}
            <button className="cw-icon" onClick={startNew} aria-label="New conversation" title="New chat">{Icon.plus}</button>
            <button className="cw-icon" onClick={hide} aria-label="Close chat" title="Close">{Icon.close}</button>
          </div>
        </header>

        {view === 'history' ? (
          <div className="cw-history">
            {history.length === 0 && <p className="cw-empty">Your conversations will appear here.</p>}
            <ul>
              {history.map((s) => (
                <li key={s.id} className={s.id === active.id ? 'is-active' : ''}>
                  <button className="cw-hist-open" onClick={() => { stop(); openChat(s.id); setView('chat'); }}>
                    <span className="cw-hist-title">{titleOf(s)}</span>
                    <span className="cw-hist-meta">{s.messages.length} messages · {timeAgo(s.updatedAt)}</span>
                  </button>
                  <button className="cw-icon cw-hist-del" aria-label={`Delete “${titleOf(s)}”`} onClick={() => deleteChat(s.id)}>{Icon.trash}</button>
                </li>
              ))}
            </ul>
            <button className="cw-new-wide" onClick={startNew}>{Icon.plus} Start a new conversation</button>
          </div>
        ) : (
          <>
            <div className="cw-list" ref={listRef} onScroll={onScroll} aria-live="polite" aria-busy={busy}>
              {messages.length === 0 ? (
                <div className="cw-welcome">
                  <div className="cw-welcome-header">
                    <div className="cw-welcome-orb"><Orb size={54} live /></div>
                    <h3>Hi, I’m Margam AI.</h3>
                  </div>
                  <p>Ask me about Margam360’s services, results, process, or the free 30-minute growth call. I answer only from what Margam360 has published, and I’ll say so if I don’t know.</p>
                  <div className="cw-suggest" role="list">
                    {SUGGESTIONS.slice(0, 4).map((s, i) => (
                      <button key={s} role="listitem" style={{ '--i': i }} onClick={() => send(s)}>{s}<span aria-hidden="true">→</span></button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`cw-msg cw-${m.role} ${m.error ? 'is-error' : ''}`}>
                    {m.role === 'assistant' && <Orb size={26} />}
                    <div className="cw-bubble">
                      {m.role === 'assistant' ? <Markdown text={m.content} /> : <p>{m.content}</p>}
                      {status === 'streaming' && i === messages.length - 1 && <span className="cw-caret" aria-hidden="true" />}
                      {m.stopped && !m.error && <span className="cw-note">Stopped</span>}
                      {m.error && (
                        <div className="cw-err-actions">
                          <button onClick={retry}>Try again</button>
                          <a href="#booking" onClick={hide}>Book a call instead</a>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {status === 'waiting' && (
                <div className="cw-msg cw-assistant">
                  <Orb size={26} live />
                  <div className="cw-bubble cw-typing" aria-label="Margam AI is typing"><i /><i /><i /></div>
                </div>
              )}

              {showFollowUps && (
                <div className="cw-follow">
                  {followUps.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
                  <a className="cw-follow-cta" href="#booking" onClick={hide}>Book a free strategy call ↗</a>
                </div>
              )}
            </div>

            <form className="cw-input" onSubmit={(e) => { e.preventDefault(); if (!busy) send(); }}>
              <label htmlFor="cw-text" className="cw-sr">Message Margam AI</label>
              <textarea
                id="cw-text"
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={MAX_CHARS}
                placeholder="Ask about our services, results…"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
              />
              {busy ? (
                <button type="button" className="cw-send is-stop" onClick={stop} aria-label="Stop generating">{Icon.stop}</button>
              ) : (
                <button type="submit" className="cw-send" disabled={!input.trim()} aria-label="Send message">{Icon.send}</button>
              )}
              {input.length > MAX_CHARS - 300 && <span className="cw-count">{input.length}/{MAX_CHARS}</span>}
            </form>
            <p className="cw-foot">AI assistant · answers come from margam360.com and may be imperfect. For anything important, <a href="#booking" onClick={hide}>talk to our team</a>.</p>
          </>
        )}
      </section>
    </div>
  );
}
