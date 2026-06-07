'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, X, MessageSquare, Trash2, Send, Loader2 } from 'lucide-react';
import Script from 'next/script';
import { getStaff, getClients } from '@/lib/store';

const ModelViewer = 'model-viewer' as any;

type Message = {
  role: 'user' | 'model';
  content: string;
};

const renderFormattedText = (text: string) => {
  // Simple regex to parse **bold text**
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('uka_admin_chat_history');
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        // Initial greeting
        setMessages([{
          role: 'model',
          content: 'Greetings Umesh, I am Bruce Wayne, How can I help you today?'
        }]);
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }, []);

  // Save chat history to localStorage (keep last 15 messages to save storage & tokens)
  useEffect(() => {
    if (messages.length > 0) {
      // Keep only the last 16 messages (1 system greeting + 15 user/model exchanges)
      const trimmed = messages.length > 16 ? messages.slice(messages.length - 16) : messages;
      localStorage.setItem('uka_admin_chat_history', JSON.stringify(trimmed));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the conversation history? Bruce Wayne will forget this chat context.")) {
      const initial = [{
        role: 'model' as const,
        content: 'Greetings Umesh, I am Bruce Wayne, How can I help you today?'
      }];
      setMessages(initial);
      localStorage.setItem('uka_admin_chat_history', JSON.stringify(initial));
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
      // 1. Fetch real-time database exactly at the moment of asking
      const staff = getStaff();
      const clients = getClients();

      // 2. Send to our API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: { staff, clients }
        })
      });

      const data = await response.json();

      // Removed artificial delay since we have paid tier

      if (response.ok) {
        setMessages(prev => [...prev, { role: 'model', content: data.message }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: `⚠️ Error: ${data.error || 'Failed to connect to AI.'}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "⚠️ Network Error: Could not reach the Bruce Wayne AI server." }]);
    } finally {
      setIsLoading(false);
      // 3. Keep the input locked for an artificial "Cooldown" period to mathematically prevent hitting the 20/min API limit.
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
      }, 1000); // 1 second forced wait between questions
    }
  };

  if (!isOpen) {
    return (
      <>
        <button 
          onClick={() => setIsOpen(true)}
          className="floating-assistant-btn"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" strategy="beforeInteractive" />
          {/* @ts-ignore */}
          <ModelViewer 
            src="/glb/Batman.glb" 
            alt="Bruce Wayne Assistant" 
            scale="6 6 6"
            loading="eager"
            camera-orbit="0deg 85deg 50%"
            camera-target="0m 1.35m 0m"
            camera-controls
            interaction-prompt="none"
            className="breathe-animation"
            style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}
          ></ModelViewer>
        </button>

        <style jsx global>{`
          @keyframes breatheEffect {
            0% { transform: scale(1) translateY(0px); }
            50% { transform: scale(1.03) translateY(-6px); }
            100% { transform: scale(1) translateY(0px); }
          }
          .breathe-animation {
            animation: breatheEffect 4s ease-in-out infinite;
            transform-origin: center bottom;
          }
          .floating-assistant-btn {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 9999;
            width: 240px;
            height: 240px;
            border-radius: 50%;
            background: transparent;
            box-shadow: none;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
          }
          .floating-assistant-btn:hover {
            transform: scale(1.05);
          }
          .floating-assistant-btn:active {
            transform: scale(0.95);
          }
          .floating-assistant-icon {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));
          }
          @media (max-width: 768px) {
            .floating-assistant-btn {
              width: 56px;
              height: 56px;
              bottom: 1.25rem;
              right: 1.25rem;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <div 
      className="assistant-chat-window animate-fade-in"
      style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
        background: 'var(--bg-raised)', backdropFilter: 'blur(30px)',
        border: '1px solid var(--border)',
        borderRadius: '20px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px var(--border) inset', 
        overflow: 'hidden'
      }}
    >
      <style jsx global>{`
        .assistant-chat-window {
          width: 380px;
          height: 600px;
          max-height: 80vh;
        }
        @media (max-width: 768px) {
          .assistant-chat-window {
            bottom: 1rem !important;
            right: 1rem !important;
            left: 1rem !important;
            width: calc(100vw - 2rem) !important;
            max-width: 100% !important;
            height: 520px !important;
            max-height: 85vh !important;
          }
        }
      `}</style>
      {/* Header */}
      <div style={{
        padding: '1.25rem', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)'
          }}>
            {/* @ts-ignore */}
            <ModelViewer 
              src="/glb/Batman.glb" 
              alt="Bruce Wayne" 
              scale="3 3 3"
              loading="eager"
              camera-orbit="0deg 90deg auto"
              camera-target="0m 2.0m 0m"
              field-of-view="22deg"
              camera-controls
              interaction-prompt="none"
              className="breathe-animation"
              style={{ width: '100%', height: '100%' }}
            ></ModelViewer>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Bruce Wayne Assistant</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Real-time Admin Advisor</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={handleClearChat} title="Clear Chat History" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
            <Trash2 size={18} />
          </button>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem'
      }}>
        {messages.map((msg, idx) => {
          const isModel = msg.role === 'model';
          return (
            <div key={idx} style={{
              alignSelf: isModel ? 'flex-start' : 'flex-end',
              maxWidth: '85%',
              background: isModel ? 'var(--bg-hover)' : 'var(--primary)',
              color: isModel ? 'var(--text)' : '#ffffff',
              padding: '0.85rem 1rem',
              borderRadius: '16px',
              borderBottomLeftRadius: isModel ? '4px' : '16px',
              borderBottomRightRadius: isModel ? '16px' : '4px',
              border: isModel ? '1px solid var(--border)' : 'none',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              {renderFormattedText(msg.content)}
            </div>
          );
        })}
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start', background: 'var(--bg-hover)', color: 'var(--text-secondary)',
            padding: '0.85rem 1rem', borderRadius: '16px', borderBottomLeftRadius: '4px', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
          }}>
            <Loader2 size={16} className="animate-spin" /> Bruce Wayne is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={cooldown ? "Cooling down for 1 second..." : "Ask Bruce Wayne a question..."}
            disabled={isLoading || cooldown}
            style={{
              flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
              padding: '0.85rem 1.1rem', borderRadius: '24px', color: 'var(--text)',
              fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s',
              opacity: cooldown ? 0.5 : 1
            }}
          />
          <button 
            type="submit" 
            disabled={isLoading || cooldown || !input.trim()}
            style={{
              background: isLoading || cooldown || !input.trim() ? 'var(--border)' : 'var(--primary)',
              color: 'white', border: 'none', width: '42px', height: '42px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <Send size={18} style={{ color: 'white' }} />
          </button>
        </form>
      </div>
    </div>
  );
}
