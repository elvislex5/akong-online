import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Gamepad2, Link as LinkIcon, Globe } from 'lucide-react';

const LobbyPageRevolutionary: React.FC = () => {
  // Mock data - à remplacer par de vraies données
  const onlineRooms = [
    { id: '1', host: 'Player123', players: 2, status: 'waiting' },
    { id: '2', host: 'StratMaster', players: 2, status: 'playing' },
    { id: '3', host: 'AkongPro', players: 1, status: 'waiting' },
  ];

  const onlinePlayers = 247;

  return (
    <div className="min-h-screen bg-black pt-24 pb-12 px-4">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
              Lobby
            </span>
          </h1>
          <p className="text-xl text-gray-400">
            <span className="text-green-500 font-bold">{onlinePlayers}</span> joueurs en ligne
          </p>
        </motion.div>

        {/* Actions Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Create Room */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="group relative bg-gradient-to-br from-purple-900/30 to-purple-800/20 backdrop-blur-xl border border-purple-500/30 hover:border-purple-500/60 rounded-3xl p-8 transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-300" />
            <div className="relative">
              <div className="mb-4 flex justify-center sm:justify-start"><Gamepad2 className="w-16 h-16 text-purple-400" /></div>
              <h2 className="text-3xl font-bold text-white mb-3">Créer une partie</h2>
              <p className="text-gray-300 text-lg mb-6">
                Invitez vos amis et lancez une nouvelle partie multijoueur
              </p>
              <button className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold text-white text-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/50">
                Créer
              </button>
            </div>
          </motion.div>

          {/* Join Room */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="group relative bg-gradient-to-br from-blue-900/30 to-blue-800/20 backdrop-blur-xl border border-blue-500/30 hover:border-blue-500/60 rounded-3xl p-8 transition-all duration-300 cursor-pointer hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-300" />
            <div className="relative">
              <div className="mb-4 flex justify-center sm:justify-start"><LinkIcon className="w-16 h-16 text-blue-400" /></div>
              <h2 className="text-3xl font-bold text-white mb-3">Rejoindre une partie</h2>
              <p className="text-gray-300 text-lg mb-6">
                Entrez un code de salle pour rejoindre une partie
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Code de la salle"
                  className="flex-1 px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-blue-500/50">
                  Go
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Active Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-blue-400"><Globe className="w-10 h-10" /></span>
            Parties publiques
          </h2>

          <div className="grid gap-4">
            {onlineRooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="group relative bg-white/5 backdrop-blur-xl border border-white/10 hover:border-amber-500/50 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* Room Status */}
                    <div className={`w-3 h-3 rounded-full ${room.status === 'waiting' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />

                    {/* Room Info */}
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        Partie de {room.host}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {room.players}/2 joueurs · {room.status === 'waiting' ? 'En attente' : 'En cours'}
                      </p>
                    </div>
                  </div>

                  {/* Join Button */}
                  {room.status === 'waiting' ? (
                    <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg">
                      Rejoindre
                    </button>
                  ) : (
                    <button className="px-6 py-3 bg-white/10 border border-white/20 rounded-xl font-semibold text-gray-400 cursor-not-allowed">
                      Spectateur
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* No Rooms Message */}
          {onlineRooms.length === 0 && (
            <div className="text-center py-16">
              <div className="mb-4 flex justify-center"><Gamepad2 className="w-20 h-20 text-gray-600" /></div>
              <p className="text-gray-400 text-lg">
                Aucune partie publique disponible
              </p>
              <p className="text-gray-500 mt-2">
                Créez la première !
              </p>
            </div>
          )}
        </motion.div>

        {/* Quick Play */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-400 mb-4">
            Ou jouez directement contre l'IA
          </p>
          <Link
            to="/game"
            className="inline-block px-12 py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-2xl font-bold text-white text-xl transition-all duration-300 shadow-2xl hover:shadow-amber-500/50 hover:scale-105"
          >
            Partie Rapide
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default LobbyPageRevolutionary;
