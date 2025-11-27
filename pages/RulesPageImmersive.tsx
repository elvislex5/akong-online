import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { Target, RefreshCw, Sparkles, Zap, Handshake, Ban, Pause, Lightbulb } from 'lucide-react';
import ImmersiveWrapper from '../components/layout/ImmersiveWrapper';

const RulesPageImmersive: React.FC = () => {
  const rules = [
    {
      icon: <Target className="w-8 h-8 text-white" />,
      title: 'But du jeu',
      description: 'Capturer plus de 35 graines (ou avoir plus de 35 points en fin de partie).',
      color: 'from-amber-600 to-orange-600',
      iconBg: 'bg-gradient-to-br from-amber-600 to-orange-600',
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-white" />,
      title: 'Distribution',
      description: 'On sème les graines une par une vers la droite (sens anti-horaire). Si on a plus de 14 graines, on fait un tour complet en sautant la case de départ.',
      color: 'from-blue-600 to-cyan-600',
      iconBg: 'bg-gradient-to-br from-blue-600 to-cyan-600',
    },
    {
      icon: <Sparkles className="w-8 h-8 text-white" />,
      title: 'La Prise (Capture)',
      description: 'Si la dernière graine tombe chez l\'adversaire et que la case contient alors 2, 3 ou 4 graines, on capture ces graines (ainsi que celles des cases précédentes si elles remplissent la même condition).',
      color: 'from-green-600 to-emerald-600',
      iconBg: 'bg-gradient-to-br from-green-600 to-emerald-600',
    },
  ];

  const specialRules = [
    {
      emoji: <Zap className="w-10 h-10" />,
      title: 'Auto-capture',
      description: 'Si un tour complet se termine avec 1 graine restante (ex: 14, 28...), elle est capturée automatiquement.',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      emoji: <Handshake className="w-10 h-10" />,
      title: 'Solidarité (Le Un)',
      description: 'Si vous n\'avez plus qu\'une seule graine et qu\'elle est dans votre dernière case, vous l\'auto-capturez. L\'adversaire DOIT alors jouer un coup qui vous redonne des graines (si possible).',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      emoji: <Ban className="w-10 h-10" />,
      title: 'Sécheresse',
      description: 'On ne peut pas prendre TOUTES les graines de l\'adversaire si cela le laisse sans aucun coup jouable (sauf si c\'est inévitable).',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      emoji: <Pause className="w-10 h-10" />,
      title: 'Blocage (PAT)',
      description: 'Si aucun coup n\'est possible, le jeu s\'arrête et les graines restantes vont au dernier joueur qui a pu jouer.',
      gradient: 'from-red-500 to-orange-500',
    },
  ];

  return (
    <ImmersiveWrapper variant="vibrant" showParticles={true}>
      <div className="min-h-screen py-12 sm:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.h1
              className="text-5xl sm:text-6xl lg:text-7xl font-black mb-4"
              animate={{
                textShadow: [
                  '0 0 20px rgba(255, 215, 0, 0.5)',
                  '0 0 40px rgba(255, 215, 0, 0.8)',
                  '0 0 20px rgba(255, 215, 0, 0.5)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Règles du <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Songo</span>
            </motion.h1>
            <p className="text-2xl text-gray-400">(Variante MPEM)</p>
          </motion.div>

          {/* Main Rules Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {rules.map((rule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.05}>
                  <div className="h-full bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md rounded-3xl border border-gray-700/50 hover:border-amber-500/50 transition-all p-8 relative overflow-hidden group">
                    {/* Glow effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${rule.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                    {/* Icon */}
                    <div className={`relative w-16 h-16 ${rule.iconBg} rounded-2xl flex items-center justify-center mb-6 text-4xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                      {rule.icon}
                    </div>

                    {/* Content */}
                    <h2 className="text-2xl font-bold mb-4 text-white group-hover:text-amber-400 transition-colors">
                      {rule.title}
                    </h2>
                    <p className="text-gray-300 leading-relaxed text-lg">
                      {rule.description}
                    </p>

                    {/* Corner glow */}
                    <div className={`absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br ${rule.color} opacity-20 blur-3xl`}></div>
                  </div>
                </Tilt>
              </motion.div>
            ))}
          </div>

          {/* Special Rules Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-black mb-4">
                Règles <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Spéciales</span>
              </h2>
              <p className="text-xl text-gray-400">Les subtilités qui font toute la différence</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {specialRules.map((rule, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
                    <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-md rounded-2xl border border-gray-700/50 hover:border-purple-500/50 transition-all p-6 relative overflow-hidden group h-full">
                      {/* Background glow */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${rule.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

                      <div className="relative flex items-start space-x-4">
                        {/* Emoji */}
                        <div className="text-5xl flex-shrink-0 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
                          {rule.emoji}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r ${rule.gradient}`}>
                            {rule.title}
                          </h3>
                          <p className="text-gray-300 leading-relaxed">
                            {rule.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Tilt>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tips Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mb-16"
          >
            <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
              <div className="bg-gradient-to-r from-amber-900/30 via-orange-900/30 to-amber-900/30 backdrop-blur-md rounded-3xl border-2 border-amber-500/30 p-8 sm:p-12 relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/10 to-amber-500/5 animate-gradient-shift"></div>

                <div className="relative">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="text-amber-400"><Lightbulb className="w-12 h-12" /></div>
                    <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                      Conseils Stratégiques
                    </h3>
                  </div>

                  <ul className="space-y-4 text-lg text-gray-200">
                    <li className="flex items-start space-x-3">
                      <span className="text-amber-500 font-bold">→</span>
                      <span>Gardez toujours un œil sur vos dernières cases pour éviter la solidarité</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-amber-500 font-bold">→</span>
                      <span>Comptez vos graines pour anticiper les captures multiples</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-amber-500 font-bold">→</span>
                      <span>Ne capturez pas tout si cela affame l'adversaire (sauf en fin de partie)</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="text-amber-500 font-bold">→</span>
                      <span>Les cases avec 12-13 graines sont souvent stratégiques pour les tours complets</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Tilt>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="text-center"
          >
            <Tilt tiltMaxAngleX={10} tiltMaxAngleY={10} scale={1.05}>
              <Link
                to="/game"
                className="inline-block group relative px-12 py-6 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-[length:200%_auto] text-white rounded-2xl font-black text-2xl shadow-2xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 group-hover:animate-shimmer"></div>
                <span className="relative z-10">Commencer à jouer</span>

                {/* Pulsing glow */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-2xl -z-10"
                ></motion.div>
              </Link>
            </Tilt>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 10s ease infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </ImmersiveWrapper>
  );
};

export default RulesPageImmersive;
