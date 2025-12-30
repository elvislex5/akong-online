import React from 'react';
import { motion } from 'framer-motion';
import { GameMode, Player, AIDifficulty } from '../../types';
import type { GameRoom } from '../../services/supabase';
import { Smile, Meh, Frown, Flame, Crown, ArrowLeft, Users, Gamepad2, Globe, Cpu, AlertTriangle } from 'lucide-react';
import { Lobby } from '../online/Lobby';

type MenuStep = 'main' | 'ai_difficulty' | 'ai_select' | 'online_menu' | 'online_lobby' | 'online_join' | 'room_waiting';

interface MainMenuProps {
  menuStep: MenuStep;
  setMenuStep: (step: MenuStep) => void;
  startGame: (mode: GameMode, aiPlayer?: Player | null, startingPlayer?: Player) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: (roomId?: string) => void;
  exitToMenu: () => void;
  setAiPlayer: (player: Player | null) => void;
  setAiStartsFirst: (starts: boolean) => void;
  setAiDifficulty: (difficulty: AIDifficulty) => void;
  aiPlayer: Player | null;
  aiStartsFirst: boolean;
  onlineGame: {
    roomId: string; // Used for display
    room: GameRoom | null;
    onlineStatus: string;
    joinInputId: string;
    setJoinInputId: (value: string) => void;
    isGuest: boolean;
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
              className="title-section text-gradient-gold mb-2"
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
              className="group relative glass-blue border-glow-blue rounded-2xl p-6 transition-all duration-300 overflow-hidden focus-visible-ring"
            >
              <div className="hover-overlay-blue" />
              <div className="relative flex flex-col items-center">
                <Users className="w-16 h-16 mb-4 text-blue-400 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-bold text-white text-xl mb-2">2 Joueurs Local</h3>
                <p className="text-blue-200 text-sm">Jouez sur le même écran</p>
              </div>
            </motion.button>

            {/* VS AI */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMenuStep('ai_select')}
              className="group relative glass-gold border-glow-gold rounded-2xl p-6 transition-all duration-300 overflow-hidden focus-visible-ring"
            >
              <div className="hover-overlay-gold" />
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 mb-4 flex items-center justify-center bg-amber-500/20 rounded-full">
                  <Cpu className="w-10 h-10 text-amber-400" />
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
              className="group relative glass-emerald border-glow-emerald rounded-2xl p-6 transition-all duration-300 overflow-hidden focus-visible-ring"
            >
              <div className="hover-overlay-emerald" />
              <div className="relative flex flex-col items-center">
                <Globe className="w-16 h-16 mb-4 text-emerald-400 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-bold text-white text-xl mb-2">Jeu en ligne</h3>
                <p className="text-emerald-200 text-sm">Affrontez vos amis</p>
              </div>
            </motion.button>

            {/* Simulation */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame(GameMode.Simulation)}
              className="group relative glass-purple border-glow-purple rounded-2xl p-6 transition-all duration-300 overflow-hidden focus-visible-ring"
            >
              <div className="hover-overlay-purple" />
              <div className="relative flex flex-col items-center">
                <div className="w-16 h-16 mb-4 flex items-center justify-center bg-purple-500/20 rounded-full">
                  <Gamepad2 className="w-10 h-10 text-purple-400" />
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
          <h3 className="title-section text-gradient-gold text-center mb-4">
            Jeu en ligne
          </h3>
          <button
            onClick={() => setMenuStep('online_lobby')}
            className="group relative glass-gold border-glow-gold rounded-xl p-5 transition-all duration-300 overflow-hidden focus-visible-ring flex items-center justify-center gap-3"
          >
            <div className="hover-overlay-gold" />
            <Users className="w-6 h-6 text-white" />
            <span className="font-bold text-white text-lg">Liste des joueurs</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCreateRoom}
              className="bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 rounded-xl p-4 font-bold text-white transition-all focus-visible-ring"
            >
              Créer Privé
            </button>
            <button
              onClick={() => setMenuStep('online_join')}
              className="bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 rounded-xl p-4 font-bold text-white transition-all focus-visible-ring"
            >
              Rejoindre ID
            </button>
          </div>

          <button
            onClick={() => setMenuStep('main')}
            className="text-gray-400 hover:text-amber-400 mt-4 transition-colors focus-visible-ring rounded-lg p-2 flex items-center justify-center gap-2"
            aria-label="Retour au menu principal"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </motion.div>
      )}

      {menuStep === 'online_lobby' && (
        <div className="h-[500px] w-full">
          <Lobby
            onJoinRoom={(roomId) => {
              onlineGame.setJoinInputId(roomId);
              // Pass roomId directly to avoid race condition
              handleJoinRoom(roomId);
            }}
            onClose={() => setMenuStep('online_menu')}
          />
          <button
            onClick={() => setMenuStep('online_menu')}
            className="w-full mt-4 text-gray-400 hover:text-white transition-colors"
          >
            Retour
          </button>
        </div>
      )}

      {menuStep === 'room_waiting' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white/5 backdrop-blur-xl border-2 border-emerald-500/50 p-8 rounded-2xl"
          role="alert"
          aria-live="polite"
        >
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
            {onlineGame.isGuest ? 'En attente...' : 'Salle créée !'}
          </h3>
          {!onlineGame.isGuest && (
            <>
              <p className="text-gray-400 mb-6">Partagez cet ID avec votre ami :</p>
              <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-2 border-emerald-500 p-4 rounded-xl font-mono text-3xl font-bold tracking-wider select-all cursor-pointer text-emerald-400 mb-6 hover:scale-105 transition-transform" tabIndex={0} aria-label={`ID de la salle : ${onlineGame.roomId || 'Génération en cours'}`}>
                {onlineGame.roomId || 'Génération...'}
              </div>
            </>
          )}
          <div className="flex items-center justify-center gap-2 text-gray-400 animate-pulse mb-6" aria-live="polite">
            <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" aria-hidden="true"></span>
            {onlineGame.onlineStatus}
          </div>

          {/* Lobby for invites */}
          {onlineGame.room && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-2 max-h-[300px] overflow-hidden flex flex-col">
              <Lobby
                onJoinRoom={() => { }}
                onClose={() => { }}
                existingRoomId={onlineGame.room!.id}
                existingRoomCode={onlineGame.room!.room_code}
              />
            </div>
          )}
          <button
            onClick={exitToMenu}
            className="mt-6 text-amber-400 hover:text-amber-300 font-semibold transition-colors focus-visible-ring rounded-lg p-2"
          >
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
          <label htmlFor="room-id-input" className="sr-only">ID de la salle</label>
          <input
            id="room-id-input"
            type="text"
            placeholder="Entrez l'ID de la salle"
            value={onlineGame.joinInputId}
            onChange={(e) => onlineGame.setJoinInputId(e.target.value)}
            className="bg-white/10 backdrop-blur-md border-2 border-white/20 focus:border-emerald-500 focus:outline-none p-5 rounded-xl text-white text-center font-mono uppercase text-xl transition-all placeholder-gray-500 focus-visible-ring"
          />
          <button
            onClick={() => handleJoinRoom()}
            className="btn-emerald text-lg py-5 focus-visible-ring"
          >
            Rejoindre
          </button>
          <p className="text-center text-gray-400 mt-2" aria-live="polite">{onlineGame.onlineStatus}</p>
          <button
            onClick={() => setMenuStep('online_menu')}
            className="text-gray-400 hover:text-amber-400 mt-4 transition-colors focus-visible-ring rounded-lg p-2 flex items-center justify-center gap-2"
            aria-label="Retour au menu en ligne"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
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
            className="bg-gradient-to-r from-blue-600/40 to-blue-500/20 backdrop-blur-xl border-2 border-blue-500/50 hover:border-blue-500 p-6 rounded-xl font-bold text-white hover:scale-105 transition-all flex justify-between items-center focus-visible-ring"
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
            className="bg-gradient-to-r from-amber-600/40 to-orange-500/20 backdrop-blur-xl border-2 border-amber-500/50 hover:border-amber-500 p-6 rounded-xl font-bold text-white hover:scale-105 transition-all flex justify-between items-center focus-visible-ring"
          >
            <span>L'IA commence</span>
            <span className="text-xs bg-white/10 px-3 py-1 rounded-full text-amber-200">Vous êtes en bas</span>
          </button>
          <button
            onClick={() => setMenuStep('main')}
            className="text-gray-400 hover:text-amber-400 mt-4 transition-colors focus-visible-ring rounded-lg p-2 flex items-center justify-center gap-2"
            aria-label="Retour au menu principal"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </motion.div>
      )}

      {menuStep === 'ai_difficulty' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="text-center mb-2">
            <h3 className="title-section text-gradient-gold mb-1">
              Niveau de l'IA
            </h3>
            <p className="text-gray-400 text-sm">Choisissez la force de votre adversaire</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-visible p-1">
            {/* Facile */}
            <button
              onClick={() => {
                setAiDifficulty('easy');
                startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
              }}
              className="group relative flex flex-col items-center justify-center p-4 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-500/80 rounded-xl transition-all duration-200 focus-visible-ring"
            >
              <div className="p-3 bg-emerald-500/10 rounded-full mb-2 group-hover:bg-emerald-500/20 transition-colors">
                <Smile className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-white mb-1">Facile</span>
                <span className="text-xs text-emerald-200/70">Idéal pour débuter</span>
              </div>
            </button>

            {/* Moyen */}
            <button
              onClick={() => {
                setAiDifficulty('medium');
                startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
              }}
              className="group relative flex flex-col items-center justify-center p-4 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 hover:border-blue-500/80 rounded-xl transition-all duration-200 focus-visible-ring"
            >
              <div className="p-3 bg-blue-500/10 rounded-full mb-2 group-hover:bg-blue-500/20 transition-colors">
                <Meh className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-white mb-1">Moyen</span>
                <span className="text-xs text-blue-200/70">Challenge équilibré</span>
              </div>
            </button>

            {/* Difficile */}
            <button
              onClick={() => {
                setAiDifficulty('hard');
                startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
              }}
              className="group relative flex flex-col items-center justify-center p-4 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-500/30 hover:border-amber-500/80 rounded-xl transition-all duration-200 focus-visible-ring"
            >
              <div className="p-3 bg-amber-500/10 rounded-full mb-2 group-hover:bg-amber-500/20 transition-colors">
                <Frown className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-white mb-1">Difficile</span>
                <span className="text-xs text-amber-200/70">Pour les habitués</span>
              </div>
            </button>

            {/* Expert */}
            <button
              onClick={() => {
                setAiDifficulty('expert');
                startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
              }}
              className="group relative flex flex-col items-center justify-center p-4 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 hover:border-red-500/80 rounded-xl transition-all duration-200 focus-visible-ring"
            >
              <div className="p-3 bg-red-500/10 rounded-full mb-2 group-hover:bg-red-500/20 transition-colors">
                <Flame className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-white mb-1">Expert</span>
                <span className="text-xs text-red-200/70">Réflexion approfondie</span>
              </div>
            </button>

            {/* Légende */}
            <button
              onClick={() => {
                setAiDifficulty('legend');
                startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
              }}
              className="sm:col-span-2 group relative flex flex-row items-center justify-center gap-4 p-4 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-500/80 rounded-xl transition-all duration-200 focus-visible-ring"
            >
              <div className="p-3 bg-purple-500/10 rounded-full group-hover:bg-purple-500/20 transition-colors">
                <Crown className="w-8 h-8 text-purple-400" />
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-lg">Légende</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase tracking-wide">
                    Ultime
                  </span>
                </div>
                <p className="text-xs text-purple-200/70 mt-0.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  IA lente mais redoutable (35+ coups)
                </p>
              </div>
            </button>
          </div>

          <button
            onClick={() => setMenuStep('ai_select')}
            className="text-gray-400 hover:text-amber-400 mt-2 transition-colors focus-visible-ring rounded-lg p-2 flex items-center justify-center gap-2 mx-auto"
            aria-label="Retour à la sélection du joueur"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </motion.div>
      )}
    </div>
  );
}
