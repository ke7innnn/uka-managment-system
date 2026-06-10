'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Trash2, Send, Loader2, Bot } from 'lucide-react';
import { getStaff, getClients, getWorkspaceMessages, getAlerts, addWorkspaceMessage } from '@/lib/store';

type Message = {
  role: 'user' | 'model';
  content: string;
};

const renderFormattedText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'inherit' }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

export default function AdminAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect mobile FIRST so we skip 3D model loading on mobile entirely
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('uka_admin_chat_history');
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([{
          role: 'model',
          content: 'Greetings Umesh, I am Bruce Wayne. How can I help you today?'
        }]);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      const trimmed = messages.length > 16 ? messages.slice(messages.length - 16) : messages;
      try {
        localStorage.setItem('uka_admin_chat_history', JSON.stringify(trimmed));
      } catch (e) {
        console.error('Failed to save chat history', e);
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      const initial = [{ role: 'model' as const, content: 'Greetings Umesh, I am Bruce Wayne. How can I help you today?' }];
      setMessages(initial);
      try { localStorage.setItem('uka_admin_chat_history', JSON.stringify(initial)); } catch (e) {}
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const staff = getStaff();
      const clients = getClients();
      const workspaceMessages = getWorkspaceMessages();
      const alerts = getAlerts();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context: { staff, clients, workspaceMessages, alerts } })
      });

      const data = await response.json();

      if (response.ok) {
        let aiMessage = data.message;
        const actionRegex = /\[ACTION:\s*ADD_WORKSPACE_MESSAGE\]\s*"([^"]+)"/g;
        let match;
        let actionsTaken = 0;
        while ((match = actionRegex.exec(aiMessage)) !== null) {
          addWorkspaceMessage('bruce_wayne', 'Bruce Wayne', 'Admin AI', match[1]);
          actionsTaken++;
        }
        aiMessage = aiMessage.replace(/\[ACTION:\s*ADD_WORKSPACE_MESSAGE\]\s*"[^"]+"/g, '').trim();
        if (!aiMessage && actionsTaken > 0) aiMessage = 'I have posted the message to the team workspace as requested, sir.';
        setMessages(prev => [...prev, { role: 'model', content: aiMessage }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: `⚠️ Error: ${data.error || 'Failed to connect to AI.'}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: '⚠️ Network Error: Could not reach the Bruce Wayne AI server.' }]);
    } finally {
      setIsLoading(false);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 1000);
    }
  };

  // Chat window shared between mobile and desktop
  const ChatWindow = () => (
    <div style={{
      width: isMobile ? 'calc(100vw - 2rem)' : '380px',
      height: isMobile ? '70vh' : '520px',
      maxHeight: '80vh',
      background: 'var(--bg-raised)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      border: '2px solid var(--border)',
      borderRadius: isMobile ? '20px' : '40px 40px 12px 40px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Bruce Wayne Assistant</h3>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Real-time Admin Advisor</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={handleClearChat} title="Clear Chat" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
            <Trash2 size={18} />
          </button>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((msg, idx) => {
          const isModel = msg.role === 'model';
          return (
            <div key={idx} style={{
              alignSelf: isModel ? 'flex-start' : 'flex-end',
              maxWidth: '85%',
              background: isModel ? 'var(--bg-hover)' : 'var(--primary)',
              color: isModel ? 'var(--text)' : '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '16px',
              borderBottomLeftRadius: isModel ? '4px' : '16px',
              borderBottomRightRadius: isModel ? '16px' : '4px',
              border: isModel ? '1px solid var(--border)' : 'none',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}>
              {renderFormattedText(msg.content)}
            </div>
          );
        })}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-hover)', color: 'var(--text-secondary)', padding: '0.75rem 1rem', borderRadius: '16px', borderBottomLeftRadius: '4px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <Loader2 size={16} className="animate-spin" /> Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={cooldown ? 'Please wait...' : 'Ask Bruce Wayne...'}
            disabled={isLoading || cooldown}
            style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', padding: '0.7rem 1rem', borderRadius: '24px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', opacity: cooldown ? 0.5 : 1 }}
          />
          <button type="submit" disabled={isLoading || cooldown || !input.trim()} style={{ background: isLoading || cooldown || !input.trim() ? 'var(--border)' : 'var(--primary)', color: 'white', border: 'none', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );

  // ── MOBILE LAYOUT: simple fixed button, no 3D model ──────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Simple mobile chat trigger button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            style={{
              position: 'fixed',
              top: '50%',
              right: 0,
              transform: 'translateY(-50%)',
              zIndex: 9999,
              background: 'rgba(10,10,10,0.9)',
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
              borderRight: 'none',
              padding: '10px 8px 10px 12px',
              borderRadius: '24px 0 0 24px',
              boxShadow: '-4px 4px 15px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Open Bruce Wayne AI"
          >
            <img src="/icon.png" alt="BW" style={{ width: 24, height: 24, borderRadius: '50%' }} />
          </button>
        )}

        {/* Mobile chat window — fullscreen-style overlay */}
        {isOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '1rem',
          }}>
            <ChatWindow />
          </div>
        )}
      </>
    );
  }

  // ── DESKTOP LAYOUT: Batman 3D model + floating chat bubble ───────────────────
  // Dynamically import model-viewer only on desktop to avoid mobile memory crash
  const ModelViewer = 'model-viewer' as any;

  return (
    <>
      {/* Preload the 3D model on desktop only */}
      <link rel="preload" href="/glb/Batman.glb" as="fetch" crossOrigin="anonymous" />
      {/* Load the model-viewer script reliably */}
      <script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        async
      />

      {/* Batman 3D Model Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: '-180px',
          right: '-70px',
          zIndex: 9999,
          width: '336px',
          height: '420px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {/* @ts-ignore */}
        <ModelViewer
          src="/glb/Batman.glb"
          alt="Bruce Wayne Assistant"
          scale="3 3 3"
          loading="eager"
          min-camera-orbit="auto auto 10%"
          camera-orbit="0deg 85deg 62%"
          camera-target="0m 1.45m 0m"
          disable-zoom
          interaction-prompt="none"
          style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))', animation: 'breatheEffect 4s ease-in-out infinite' }}
        />
      </button>

      {/* Desktop Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '175px',
          right: '150px',
          zIndex: 9999,
          filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.4))',
        }}>
          <ChatWindow />
        </div>
      )}

      <style>{`
        @keyframes breatheEffect {
          0% { transform: scale(1) translateY(0px); }
          50% { transform: scale(1.03) translateY(-6px); }
          100% { transform: scale(1) translateY(0px); }
        }
      `}</style>
    </>
  );
}
