import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSendMessage: (text: string, emoji?: string) => void;
  onTypingChange: (isTyping: boolean) => void;
}

const EMOJIS = ['👍', '😄', '😮', '😢'];
const MAX_CHARS = 200;
const TYPING_DEBOUNCE_MS = 2000;

export default function ChatInput({ onSendMessage, onTypingChange }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Handle typing indicator with debounce
  const handleTextChange = useCallback((value: string) => {
    setText(value);

    // Start typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      onTypingChange(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    if (value.length > 0) {
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsTyping(false);
        onTypingChange(false);
      }, TYPING_DEBOUNCE_MS);
    } else {
      // Immediately stop if text is empty
      setIsTyping(false);
      onTypingChange(false);
    }
  }, [isTyping, onTypingChange]);

  // Send text message
  const handleSend = useCallback(() => {
    if (text.trim().length === 0) return;

    onSendMessage(text.trim());
    setText('');
    setIsTyping(false);
    onTypingChange(false);

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-focus input after send
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [text, onSendMessage, onTypingChange]);

  // Send emoji-only message
  const handleEmojiClick = useCallback((emoji: string) => {
    onSendMessage('', emoji);

    // Auto-focus input after send
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [onSendMessage]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const charsRemaining = MAX_CHARS - text.length;

  return (
    <div className="border-t border-emerald-500/30 p-3 bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm">
      {/* Quick emoji reactions */}
      <div className="flex gap-2 mb-2">
        {EMOJIS.map((emoji) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleEmojiClick(emoji)}
            className="text-2xl p-1 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={`Envoyer ${emoji}`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>

      {/* Input + Send button */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_CHARS}
            placeholder="Tapez un message..."
            className="w-full px-4 py-2 pr-12 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />

          {/* Character counter */}
          <div
            className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
              charsRemaining < 20 ? 'text-amber-400' : 'text-gray-500'
            }`}
          >
            {charsRemaining}
          </div>
        </div>

        {/* Send button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={text.trim().length === 0}
          className={`px-5 py-2 rounded-xl font-medium text-sm transition-all ${
            text.trim().length > 0
              ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-emerald-500/30'
              : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
          }`}
          aria-label="Envoyer le message"
        >
          Envoyer
        </motion.button>
      </div>
    </div>
  );
}
