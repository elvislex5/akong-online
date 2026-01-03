import { motion } from 'framer-motion';
import { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
  currentUserId: string | null;
}

export default function ChatMessage({ message, currentUserId }: ChatMessageProps) {
  const isSent = message.senderId === currentUserId;

  // Format timestamp to HH:MM
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[70%] lg:max-w-[60%] rounded-2xl px-4 py-2 ${
          isSent
            ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white'
            : 'bg-white/10 text-gray-100 backdrop-blur-sm'
        }`}
      >
        {/* Sender name (only for received messages) */}
        {!isSent && (
          <div className="text-xs font-semibold text-emerald-400 mb-1">
            {message.senderName}
          </div>
        )}

        {/* Message text */}
        {message.text && (
          <div className="text-sm break-words">
            {message.text}
          </div>
        )}

        {/* Emoji reaction */}
        {message.emoji && (
          <div className="text-2xl mt-1">
            {message.emoji}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1 ${
            isSent ? 'text-emerald-100' : 'text-gray-400'
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  );
}
