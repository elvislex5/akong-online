import { useState, useCallback, useRef } from 'react';
import { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

const MAX_MESSAGES = 50; // Keep last 50 messages in memory

interface UseChatProps {
  userId: string | null;
  userName: string;
  onBroadcastMessage: (message: ChatMessage) => void;
  onBroadcastTyping: (isTyping: boolean) => void;
}

export function useChat({
  userId,
  userName,
  onBroadcastMessage,
  onBroadcastTyping
}: UseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const typingTimeoutsRef = useRef<Map<string, number>>(new Map());

  // Send a message
  const sendMessage = useCallback((text: string, emoji?: string) => {
    if (!userId) return;

    const message: ChatMessage = {
      id: uuidv4(),
      senderId: userId,
      senderName: userName,
      text: text || '', // Empty if emoji-only
      timestamp: Date.now(),
      emoji
    };

    // Add to local state immediately (optimistic update)
    setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), message]);

    // Broadcast to others
    onBroadcastMessage(message);
  }, [userId, userName, onBroadcastMessage]);

  // Receive a message from another user
  const receiveMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), message]);

    // Increment unread count if chat is closed
    if (!isOpen) {
      setUnreadCount(prev => prev + 1);
    }
  }, [isOpen]);

  // Handle typing indicator
  const handleTyping = useCallback((isTyping: boolean) => {
    onBroadcastTyping(isTyping);
  }, [onBroadcastTyping]);

  // Receive typing status from another user
  const receiveTyping = useCallback((userId: string, userName: string, isTyping: boolean) => {
    if (isTyping) {
      setTypingUsers(prev => {
        if (!prev.includes(userName)) {
          return [...prev, userName];
        }
        return prev;
      });

      // Clear previous timeout
      const existingTimeout = typingTimeoutsRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Auto-remove after 3 seconds
      const timeout = window.setTimeout(() => {
        setTypingUsers(prev => prev.filter(name => name !== userName));
        typingTimeoutsRef.current.delete(userId);
      }, 3000);

      typingTimeoutsRef.current.set(userId, timeout);
    } else {
      setTypingUsers(prev => prev.filter(name => name !== userName));
      const timeout = typingTimeoutsRef.current.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutsRef.current.delete(userId);
      }
    }
  }, []);

  // Toggle chat overlay
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setUnreadCount(0); // Clear unread when opening
    }
  }, [isOpen]);

  // Clear messages (e.g., when leaving game)
  const clearMessages = useCallback(() => {
    setMessages([]);
    setTypingUsers([]);
    setUnreadCount(0);
    setIsOpen(false);

    // Clear all typing timeouts
    typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    typingTimeoutsRef.current.clear();
  }, []);

  return {
    messages,
    isOpen,
    unreadCount,
    typingUsers,
    sendMessage,
    receiveMessage,
    handleTyping,
    receiveTyping,
    toggleChat,
    clearMessages
  };
}
