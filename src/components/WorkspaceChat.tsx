import { useEffect, useState, useRef } from 'react';
import { WorkspaceMessage, getWorkspaceMessages, addWorkspaceMessage } from '@/lib/store';
import { Send, Hash, Info, User } from 'lucide-react';
import styles from './WorkspaceChat.module.css';

interface WorkspaceChatProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
}

export default function WorkspaceChat({ currentUserId, currentUserName, currentUserRole }: WorkspaceChatProps) {
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = () => {
    setMessages(getWorkspaceMessages());
  };

  useEffect(() => {
    loadMessages();
    const handleSync = () => loadMessages();
    window.addEventListener('uka-workspace-sync-complete', handleSync);
    
    // Polling as a fallback to keep chats in sync if multiple tabs are open
    const interval = setInterval(loadMessages, 5000);
    return () => {
      window.removeEventListener('uka-workspace-sync-complete', handleSync);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    addWorkspaceMessage(currentUserId, currentUserName, currentUserRole, input.trim());
    setInput('');
    loadMessages();
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.hashIcon}><Hash size={20} strokeWidth={2} /></div>
          <div>
            <h2 className={styles.chatTitle}>Workspace</h2>
            <p className={styles.chatSubtitle}>Group chat for all Admin and Staff. Messages delete automatically after 3 days.</p>
          </div>
        </div>
      </div>

      <div className={styles.messagesArea} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <Info size={40} className={styles.emptyIcon} />
            <h3>Welcome to the Workspace</h3>
            <p>This is a shared space for everyone. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === currentUserId;
            const isAdmin = msg.senderRole === 'Admin';
            const showHeader = i === 0 || messages[i - 1].senderId !== msg.senderId;

            return (
              <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.isMe : ''}`}>
                {!isMe && showHeader && (
                  <div className={styles.avatarWrap}>
                    <div className={`${styles.avatar} ${isAdmin ? styles.adminAvatar : ''}`}>
                      {msg.senderName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                
                <div className={styles.messageContent}>
                  {showHeader && (
                    <div className={styles.messageMeta}>
                      <span className={styles.senderName}>{msg.senderName}</span>
                      <span className={`${styles.senderRole} ${isAdmin ? styles.adminRole : ''}`}>
                        {msg.senderRole}
                      </span>
                      <span className={styles.time}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div className={`${styles.bubble} ${isMe ? styles.myBubble : styles.theirBubble}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message #workspace..."
          className={styles.inputField}
        />
        <button type="submit" className={styles.sendBtn} disabled={!input.trim()}>
          <Send size={18} strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
