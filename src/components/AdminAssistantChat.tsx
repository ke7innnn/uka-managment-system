'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, X, MessageSquare, Trash2, Send, Loader2 } from 'lucide-react';
import { getStaff, getClients } from '@/lib/store';

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
          content: 'Greetings, I am UKA, How can I help you today?'
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
    if (window.confirm("Are you sure you want to clear the conversation history? UKA will forget this chat context.")) {
      const initial = [{
        role: 'model' as const,
        content: 'Greetings, I am UKA, How can I help you today?'
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

      // Artificial 1.9s premium thinking delay
      await new Promise(resolve => setTimeout(resolve, 1900));

      if (response.ok) {
        setMessages(prev => [...prev, { role: 'model', content: data.message }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: `⚠️ Error: ${data.error || 'Failed to connect to AI.'}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "⚠️ Network Error: Could not reach the UKA AI server." }]);
    } finally {
      setIsLoading(false);
      // 3. Keep the input locked for an artificial "Cooldown" period to mathematically prevent hitting the 20/min API limit.
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
      }, 7000); // 7 seconds forced wait between questions
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), #818cf8)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', border: 'none', cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Bot size={28} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
      width: '100%', maxWidth: '380px', height: '600px', maxHeight: '80vh',
      background: 'rgba(10, 12, 16, 0.95)', backdropFilter: 'blur(30px)',
      border: '1px solid var(--border)',
      borderRadius: '20px', display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset', 
      overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem', background: 'rgba(15, 18, 25, 0.98)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <Bot size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>UKA Assistant</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Real-time Admin Advisor</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={handleClearChat} title="Clear Chat History" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
            <Trash2 size={18} />
          </button>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
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
              background: isModel ? 'rgba(255,255,255,0.08)' : 'var(--primary)',
              color: isModel ? 'var(--text-main)' : 'white',
              padding: '0.85rem 1rem',
              borderRadius: '16px',
              borderBottomLeftRadius: isModel ? '4px' : '16px',
              borderBottomRightRadius: isModel ? '16px' : '4px',
              border: isModel ? '1px solid rgba(255,255,255,0.1)' : 'none',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {renderFormattedText(msg.content)}
            </div>
          );
        })}
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
            padding: '0.85rem 1rem', borderRadius: '16px', borderBottomLeftRadius: '4px', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
          }}>
            <Loader2 size={16} className="animate-spin" /> UKA is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'rgba(15, 18, 25, 0.98)' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={cooldown ? "Cooling down for 7 seconds..." : "Ask UKA a question..."}
            disabled={isLoading || cooldown}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.85rem 1.1rem', borderRadius: '24px', color: 'var(--text-main)',
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
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
