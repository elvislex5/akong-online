import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  typingUsers: string[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  // Format typing users text
  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} est en train d'écrire...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} et ${typingUsers[1]} sont en train d'écrire...`;
    } else {
      return `Plusieurs personnes sont en train d'écrire...`;
    }
  };

  // Animation for bouncing dots
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -5 },
  };

  const dotTransition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: 'reverse' as const,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 mb-3"
    >
      {/* Typing text */}
      <span className="text-xs text-emerald-400 font-medium">
        {getTypingText()}
      </span>

      {/* Animated dots */}
      <div className="flex gap-1">
        <motion.div
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...dotTransition, delay: 0 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
        />
        <motion.div
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...dotTransition, delay: 0.15 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
        />
        <motion.div
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...dotTransition, delay: 0.3 }}
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
        />
      </div>
    </motion.div>
  );
}
