import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Construction, Users, MessageSquare, Gamepad2, Trophy, Home } from 'lucide-react';

const LobbyComingSoon: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full text-center"
      >
        {/* Icon Animation */}
        <motion.div
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="mb-8"
        >
          <div className="flex justify-center"><Construction className="w-32 h-32 text-amber-500" /></div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6"
        >
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400">
            Bientôt Disponible
          </span>
        </motion.h1>

        {/* Description Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-gray-900/40 to-black/40 backdrop-blur-xl border-2 border-amber-500/20 rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-purple-500/5 pointer-events-none"></div>

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Le Lobby arrive bientôt !
            </h2>
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              Nous travaillons activement sur une expérience de lobby révolutionnaire qui vous permettra de :
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { icon: <Users className="w-8 h-8 text-amber-500" />, text: 'Voir les joueurs en ligne' },
                { icon: <MessageSquare className="w-8 h-8 text-amber-500" />, text: 'Discuter avec la communauté' },
                { icon: <Gamepad2 className="w-8 h-8 text-amber-500" />, text: 'Créer des parties personnalisées' },
                { icon: <Trophy className="w-8 h-8 text-amber-500" />, text: 'Consulter les classements' },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 bg-white/5 rounded-xl p-4"
                >
                  <span className="flex items-center justify-center w-10 h-10">{feature.icon}</span>
                  <span className="text-white font-semibold">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            <p className="text-amber-400 font-semibold text-lg">
              ⏳ En cours de développement...
            </p>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            to="/game"
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-2xl font-bold text-lg text-white transition-all duration-300 shadow-lg hover:shadow-amber-500/50"
          >
            <span className="flex items-center gap-2"><Gamepad2 className="w-6 h-6" /> Jouer maintenant</span>
          </Link>
          <Link
            to="/"
            className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 hover:bg-white/20 hover:border-white/50 rounded-2xl font-bold text-lg text-white transition-all duration-300"
          >
            <span className="flex items-center gap-2"><Home className="w-6 h-6" /> Retour à l'accueil</span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LobbyComingSoon;
