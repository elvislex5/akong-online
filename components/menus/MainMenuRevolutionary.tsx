import React from 'react';
import { motion } from 'framer-motion';
import { GameMode, Player } from '../../types';

type MenuStep = 'main' | 'ai_difficulty' | 'ai_select' | 'online_menu' | 'online_lobby' | 'online_join';

interface MainMenuProps {
  menuStep: MenuStep;
  setMenuStep: (step: MenuStep) => void;
  startGame: (mode: GameMode, aiPlayer?: Player | null, startingPlayer?: Player) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: () => void;
  exitToMenu: () => void;
  setAiPlayer: (player: Player | null) => void;
  setAiStartsFirst: (starts: boolean) => void;
  setAiDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  aiPlayer: Player | null;
  aiStartsFirst: boolean;
  onlineGame: {
    roomId: string;
    onlineStatus: string;
    joinInputId: string;
    setJoinInputId: (value: string) => void;
  };
}

export function MainMenuRevolutionary({
  menuStep,
  setMenuStep,
  startGame,
  handleCreateRoom,
  handleJoinRoom,
  exitToMenu,
  setAiPlayer,
  setAiStartsFirst,
  setAiDifficulty,
  aiPlayer,
  aiStartsFirst,
  onlineGame
}: MainMenuProps) {
  return (
    <div className="relative w-full max-w-2xl p-6 flex flex-col gap-4">
      {menuStep === 'main' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          {/* Header */}
          <div className="text-center mb-4">
            <motion.h2
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2"
            >
              Choisissez votre mode
            </motion.h2>
            <p className="text-gray-400 text-lg">Comment voulez-vous jouer ?</p>
          </div>

          {/* Menu Buttons Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Local Multiplayer */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame(GameMode.LocalMultiplayer)}
              className="group relative bg-gradient-to-br from-blue-900/40 to-blue-800/20 backdrop-blur-xl border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-6 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              <div className="relative">
                <img src="/multiplayer-icon.png" alt="Multiplayer" className="w-16 h-16 mx-auto mb-4 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-bold text-white text-xl mb-2">2 Joueurs Local</h3>
                <p className="text-blue-200 text-sm">Jouez sur le même écran</p>
              </div>
            </motion.button>

            {/* VS AI */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMenuStep('ai_select')}
              className="group relative bg-gradient-to-br from-amber-900/40 to-orange-800/20 backdrop-blur-xl border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-6 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-amber-500/20 rounded-full">
                  <span className="text-amber-400 text-4xl font-black">IA</span>
                </div>
                <h3 className="font-bold text-white text-xl mb-2">Contre l'IA</h3>
                <p className="text-amber-200 text-sm">Défiez l'ordinateur</p>
              </div>
            </motion.button>

            {/* Online */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMenuStep('online_menu')}
              className="group relative bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-6 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              <div className="relative">
                <img src="/online-icon.png" alt="Online" className="w-16 h-16 mx-auto mb-4 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-bold text-white text-xl mb-2">Jeu en ligne</h3>
                <p className="text-emerald-200 text-sm">Affrontez vos amis</p>
              </div>
            </motion.button>

            {/* Simulation */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame(GameMode.Simulation)}
              className="group relative bg-gradient-to-br from-purple-900/40 to-purple-800/20 backdrop-blur-xl border border-purple-500/30 hover:border-purple-500/60 rounded-2xl p-6 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-purple-500/20 rounded-full">
                  <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white text-xl mb-2">Simulation / Labo</h3>
                <p className="text-purple-200 text-sm">Configurez le plateau</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}

      {menuStep === 'online_menu' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-4"
        >
          <h3 className="text-3xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Jeu en ligne
          </h3>
          <button
            onClick={handleCreateRoom}
            className="px-8 py-5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-xl font-bold text-lg text-white transition-all duration-300 shadow-lg hover:shadow-emerald-500/50"
          >
            Créer une salle
          </button>
          <button
            onClick={() => setMenuStep('online_join')}
            className="px-8 py-5 bg-white/10 backdrop-blur-md border-2 border-white/20 hover:bg-white/20 hover:border-white/40 rounded-xl font-bold text-lg text-white transition-all duration-300"
          >
            Rejoindre une salle
          </button>
          <button onClick={() => setMenuStep('main')} className="text-gray-400 hover:text-amber-400 mt-4 transition-colors">
            ← Retour
          </button>
        </motion.div>
      )}

      {menuStep === 'online_lobby' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white/5 backdrop-blur-xl border-2 border-emerald-500/50 p-8 rounded-2xl"
        >
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
            Salle créée !
          </h3>
          <p className="text-gray-400 mb-6">Partagez cet ID avec votre ami :</p>
          <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-2 border-emerald-500 p-4 rounded-xl font-mono text-3xl font-bold tracking-wider select-all cursor-pointer text-emerald-400 mb-6 hover:scale-105 transition-transform">
            {onlineGame.roomId || 'Génération...'}
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-400 animate-pulse">
            <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50"></span>
            {onlineGame.onlineStatus}
          </div>
          <button onClick={exitToMenu} className="mt-6 text-amber-400 hover:text-amber-300 font-semibold transition-colors">
            Annuler
          </button>
        </motion.div>
      )}

      {menuStep === 'online_join' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-4"
        >
          <h3 className="text-3xl font-black text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Rejoindre une salle
          </h3>
          <input
            type="text"
            placeholder="Entrez l'ID de la salle"
            value={onlineGame.joinInputId}
            onChange={(e) => onlineGame.setJoinInputId(e.target.value)}
            className="bg-white/10 backdrop-blur-md border-2 border-white/20 focus:border-emerald-500 focus:outline-none p-5 rounded-xl text-white text-center font-mono uppercase text-xl transition-all placeholder-gray-500"
          />
          <button
            onClick={handleJoinRoom}
            className="px-8 py-5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-xl font-bold text-lg text-white transition-all duration-300 shadow-lg hover:shadow-emerald-500/50"
          >
            Rejoindre
          </button>
          <p className="text-center text-gray-400 mt-2">{onlineGame.onlineStatus}</p>
          <button onClick={() => setMenuStep('online_menu')} className="text-gray-400 hover:text-amber-400 mt-4 transition-colors">
            ← Retour
          </button>
        </motion.div>
      )}

      {menuStep === 'ai_select' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-4"
        >
          <h3 className="text-3xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
            Qui commence ?
          </h3>
          <button
            onClick={() => {
              setAiPlayer(Player.Two);
              setAiStartsFirst(false);
              setMenuStep('ai_difficulty');
            }}
            className="bg-gradient-to-r from-blue-600/40 to-blue-500/20 backdrop-blur-xl border-2 border-blue-500/50 hover:border-blue-500 p-6 rounded-xl font-bold text-white hover:scale-105 transition-all flex justify-between items-center"
          >
            <span>Vous commencez</span>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-blue-200">Vous êtes en bas</span>
          </button>
          <button
            onClick={() => {
              setAiPlayer(Player.Two);
              setAiStartsFirst(true);
              setMenuStep('ai_difficulty');
            }}
            className="bg-gradient-to-r from-amber-600/40 to-orange-500/20 backdrop-blur-xl border-2 border-amber-500/50 hover:border-amber-500 p-6 rounded-xl font-bold text-white hover:scale-105 transition-all flex justify-between items-center"
          >
            <span>L'IA commence</span>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-amber-200">Vous êtes en bas</span>
          </button>
          <button onClick={() => setMenuStep('main')} className="text-gray-400 hover:text-amber-400 mt-4 transition-colors">
            ← Retour
          </button>
        </motion.div>
      )}

      {menuStep === 'ai_difficulty' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-4"
        >
          <h3 className="text-3xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
            Niveau de l'IA
          </h3>
          <button
            onClick={() => {
              setAiDifficulty('easy');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="px-8 py-5 bg-gradient-to-r from-emerald-600/40 to-emerald-500/20 backdrop-blur-xl border-2 border-emerald-500/50 hover:border-emerald-500 rounded-xl font-bold text-xl text-white hover:scale-105 transition-all"
          >
            Facile
          </button>
          <button
            onClick={() => {
              setAiDifficulty('medium');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="px-8 py-5 bg-gradient-to-r from-amber-600/40 to-orange-500/20 backdrop-blur-xl border-2 border-amber-500/50 hover:border-amber-500 rounded-xl font-bold text-xl text-white hover:scale-105 transition-all"
          >
            Moyen
          </button>
          <button
            onClick={() => {
              setAiDifficulty('hard');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="px-8 py-5 bg-gradient-to-r from-red-600/40 to-red-500/20 backdrop-blur-xl border-2 border-red-500/50 hover:border-red-500 rounded-xl font-bold text-xl text-white hover:scale-105 transition-all"
          >
            Difficile
          </button>
          <button onClick={() => setMenuStep('ai_select')} className="text-gray-400 hover:text-amber-400 mt-4 transition-colors">
            ← Retour
          </button>
        </motion.div>
      )}
    </div>
  );
}
