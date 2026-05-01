import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../types';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

interface ChatOverlayProps {
  messages: ChatMessageType[];
  currentUserId: string | null;
  currentUserName: string;
  typingUsers: string[];
  onSendMessage: (text: string, emoji?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  isOpen: boolean;
  onToggle: () => void;
  unreadCount: number;
}

export default function ChatOverlay({
  messages,
  currentUserId,
  currentUserName,
  typingUsers,
  onSendMessage,
  onTypingChange,
  isOpen,
  onToggle,
  unreadCount,
}: ChatOverlayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onToggle();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Toggle FAB — bottom-left, sits below the move history toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
        className={
          'fixed z-40 inline-flex items-center justify-center w-10 h-10 rounded-full border shadow-md transition-colors duration-150 ' +
          (isOpen
            ? 'bg-accent text-accent-ink border-accent'
            : 'bg-canvas/90 backdrop-blur-md text-ink-muted border-rule hover:text-accent hover:border-accent')
        }
        style={{
          bottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))',
          left: 'calc(0.75rem + env(safe-area-inset-left, 0px))',
        }}
      >
        <MessageCircle size={16} strokeWidth={1.75} />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium tabular-nums bg-danger text-canvas rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-canvas flex flex-col safe-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-rule">
              <div>
                <p className="kicker">Conversation</p>
              </div>
              <button
                type="button"
                onClick={onToggle}
                aria-label="Fermer le chat"
                className="inline-flex items-center justify-center w-8 h-8 text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-ink-subtle">
                  Aucun message. Lancez la conversation.
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} currentUserId={currentUserId} />
                  ))}
                  <TypingIndicator typingUsers={typingUsers} />
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <ChatInput onSendMessage={onSendMessage} onTypingChange={onTypingChange} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
