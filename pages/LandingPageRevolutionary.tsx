import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Brain, Zap, Palette } from 'lucide-react';

const LandingPageRevolutionary: React.FC = () => {
  return (
    <div className="relative min-h-[400vh] bg-transparent">
      {/* SCROLLING CONTENT */}
      <div className="relative z-10">
        {/* SECTION 1: HERO */}
        <section className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center max-w-5xl"
          >
            {/* Main Title */}
            <motion.h1
              className="text-7xl sm:text-8xl lg:text-9xl font-black mb-6"
              animate={{
                textShadow: [
                  '0 0 40px rgba(255, 215, 0, 0.5)',
                  '0 0 80px rgba(255, 215, 0, 0.8)',
                  '0 0 40px rgba(255, 215, 0, 0.5)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500">
                AKÔNG
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white/90 mb-8"
            >
              Le Songo Réinventé
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Plongez dans une expérience de jeu stratégique millénaire,
              transformée par la technologie moderne
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <Link
                to="/game"
                className="group relative px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl font-black text-2xl text-white overflow-hidden shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center gap-3">
                  Commencer
                  <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>

              <Link
                to="/rules"
                className="px-12 py-6 bg-white/10 backdrop-blur-md border-2 border-white/30 hover:bg-white/20 hover:border-white/50 rounded-2xl font-bold text-2xl text-white transition-all duration-300"
              >
                Découvrir
              </Link>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
            >
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-amber-500"
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm uppercase tracking-wider">Défiler</span>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* SECTION 2: FEATURES */}
        <section className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-6xl w-full">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl sm:text-6xl font-black text-center mb-16 text-white"
            >
              Pourquoi <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Akông</span> ?
            </motion.h2>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: <Globe className="w-16 h-16 text-amber-500 mb-4" />,
                  title: 'Multijoueur Temps Réel',
                  desc: 'Affrontez joueurs du monde entier avec synchronisation instantanée',
                },
                {
                  icon: <Brain className="w-16 h-16 text-amber-500 mb-4" />,
                  title: 'IA Avancée',
                  desc: 'Algorithme Minimax avec 3 niveaux de difficulté adaptatifs',
                },
                {
                  icon: <Zap className="w-16 h-16 text-amber-500 mb-4" />,
                  title: 'Ultra Rapide',
                  desc: 'Animations fluides 60fps et interface réactive',
                },
                {
                  icon: <Palette className="w-16 h-16 text-amber-500 mb-4" />,
                  title: 'Design Immersif',
                  desc: 'Expérience visuelle next-gen avec effets 3D',
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative bg-white/5 backdrop-blur-xl border border-white/10 hover:border-amber-500/50 rounded-3xl p-8 transition-all duration-300 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-300" />
                  <div className="relative">
                    <div className="mb-4 flex justify-center sm:justify-start">{feature.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-gray-300 text-lg leading-relaxed">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: HOW TO PLAY */}
        <section className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-5xl w-full">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl sm:text-6xl font-black text-center mb-16 text-white"
            >
              En 3 étapes <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">simples</span>
            </motion.h2>

            <div className="space-y-12">
              {[
                {
                  num: '01',
                  title: 'Distribuez',
                  desc: 'Prenez les graines d\'une case et distribuez-les une par une',
                  color: 'from-amber-500 to-orange-500',
                },
                {
                  num: '02',
                  title: 'Capturez',
                  desc: 'Si votre dernière graine tombe sur 2, 3 ou 4 graines adverses, capturez-les',
                  color: 'from-blue-500 to-cyan-500',
                },
                {
                  num: '03',
                  title: 'Dominez',
                  desc: 'Premier à capturer plus de 35 graines remporte la victoire',
                  color: 'from-purple-500 to-pink-500',
                },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="relative"
                >
                  <div className="flex items-start gap-6">
                    <div className={`flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-2xl`}>
                      <span className="text-3xl font-black text-white">{step.num}</span>
                    </div>
                    <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                      <h3 className="text-3xl font-bold text-white mb-3">{step.title}</h3>
                      <p className="text-gray-300 text-xl leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: FINAL CTA */}
        <section className="min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl"
          >
            <h2 className="text-6xl sm:text-7xl lg:text-8xl font-black mb-8">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-[length:200%_auto] animate-gradient">
                Prêt ?
              </span>
            </h2>

            <p className="text-2xl sm:text-3xl text-gray-300 mb-12 leading-relaxed">
              Rejoignez des milliers de joueurs et découvrez la stratégie qui traverse les siècles
            </p>

            <Link
              to="/game"
              className="inline-block group relative px-16 py-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl font-black text-3xl text-white overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <motion.span
                className="relative z-10"
                animate={{
                  textShadow: [
                    '0 0 20px rgba(255, 255, 255, 0.5)',
                    '0 0 40px rgba(255, 255, 255, 0.8)',
                    '0 0 20px rgba(255, 255, 255, 0.5)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Jouer Maintenant
              </motion.span>
            </Link>
          </motion.div>
        </section>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPageRevolutionary;
