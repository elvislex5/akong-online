import React from 'react';
import { GameMode, Player } from '../../types';
import { StrategyIcon, AIIcon, SimulationIcon } from '../icons/NeonIcons';
import { Globe, CircleDot } from 'lucide-react';
import ParticleBackground from '../effects/ParticleBackground';

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

export function MainMenu({
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
    <div className="relative w-full max-w-md p-6 flex flex-col gap-4">
      {/* Particle Background */}
      <ParticleBackground particleCount={30} />

      {menuStep === 'main' && (
        <>
          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="w-24 h-24 glass-glow-gold rounded-3xl mx-auto mb-4 shadow-2xl rotate-3 flex items-center justify-center card-3d">
              <div className="animate-float"><CircleDot className="w-16 h-16 text-amber-500" /></div>
            </div>
            <h2 className="text-gold text-glow-gold-sm text-sm uppercase tracking-widest shimmer-gold">
              Jeu de stratégie africain
            </h2>
          </div>

          {/* Menu Buttons */}
          <button
            onClick={() => startGame(GameMode.LocalMultiplayer)}
            className="neon-card card-3d-tilt p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center font-bold text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all glow-blue-sm relative z-10">
              2
            </div>
            <div className="text-left relative z-10">
              <div className="font-bold text-white text-glow-gold-sm">2 Joueurs (Local)</div>
              <div className="text-xs text-white-60">Sur le même écran</div>
            </div>
          </button>

          <button
            onClick={() => setMenuStep('ai_select')}
            className="neon-card card-3d-tilt p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl flex items-center justify-center relative z-10">
              <AIIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-left relative z-10">
              <div className="font-bold text-white text-glow-gold-sm">1 Joueur (vs IA)</div>
              <div className="text-xs text-white-60">Défiez l'ordinateur</div>
            </div>
          </button>

          <button
            onClick={() => setMenuStep('online_menu')}
            className="neon-card card-3d-tilt p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center font-bold text-2xl group-hover:bg-emerald-600 transition-all glow-emerald-sm relative z-10">
              <Globe className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-left relative z-10">
              <div className="font-bold text-white text-glow-gold-sm">Jeu en ligne</div>
              <div className="text-xs text-white-60">Affrontez un ami à distance</div>
            </div>
          </button>

          <button
            onClick={() => startGame(GameMode.Simulation)}
            className="neon-card card-3d-tilt p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 rounded-xl flex items-center justify-center relative z-10">
              <SimulationIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-left relative z-10">
              <div className="font-bold text-white text-glow-gold-sm">Simulation / Labo</div>
              <div className="text-xs text-white-60">Configurez le plateau</div>
            </div>
          </button>
        </>
      )}

      {menuStep === 'online_menu' && (
        <div className="flex flex-col gap-4 relative z-10">
          <h3 className="text-2xl font-bold text-center mb-4 neon-text-gold text-glow-gold-md shimmer-gold">
            Jeu en ligne
          </h3>
          <button
            onClick={handleCreateRoom}
            className="neon-button px-6 py-4 rounded-xl font-bold text-lg"
          >
            Créer une salle
          </button>
          <button
            onClick={() => setMenuStep('online_join')}
            className="glass-button px-6 py-4 rounded-xl font-bold text-lg hover:glass-glow-gold"
          >
            Rejoindre une salle
          </button>
          <button onClick={() => setMenuStep('main')} className="text-white-40 hover:text-gold mt-4 transition-colors">
            ← Retour
          </button>
        </div>
      )}

      {menuStep === 'online_lobby' && (
        <div className="text-center glass-dark neon-border-gold p-8 rounded-2xl relative z-10">
          <h3 className="text-2xl font-bold neon-text-gold mb-2 shimmer-gold">Salle créée !</h3>
          <p className="text-sm text-white-60 mb-4">Partagez cet ID avec votre ami :</p>
          <div className="glass-glow-gold p-4 rounded-xl font-mono text-2xl tracking-wider select-all cursor-pointer text-gold mb-4 shimmer-gold">
            {onlineGame.roomId || 'Génération...'}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-white-60 animate-pulse">
            <span className="w-2 h-2 bg-emerald-500 rounded-full glow-emerald-sm"></span>
            {onlineGame.onlineStatus}
          </div>
          <button onClick={exitToMenu} className="mt-6 text-amber-400 hover:text-amber-300 text-sm transition-colors">
            Annuler
          </button>
        </div>
      )}

      {menuStep === 'online_join' && (
        <div className="flex flex-col gap-4 relative z-10">
          <h3 className="text-2xl font-bold text-center mb-2 neon-text-gold text-glow-gold-md shimmer-gold">
            Rejoindre
          </h3>
          <input
            type="text"
            placeholder="Entrez l'ID de la salle"
            value={onlineGame.joinInputId}
            onChange={(e) => onlineGame.setJoinInputId(e.target.value)}
            className="glass-input p-4 rounded-xl text-white text-center font-mono uppercase text-lg focus:glass-glow-gold transition-all"
          />
          <button
            onClick={handleJoinRoom}
            className="neon-button-emerald px-6 py-4 rounded-xl font-bold text-lg"
          >
            Rejoindre
          </button>
          <p className="text-center text-sm text-white-60 mt-2">{onlineGame.onlineStatus}</p>
          <button onClick={() => setMenuStep('online_menu')} className="text-white-40 hover:text-gold mt-4 transition-colors">
            ← Retour
          </button>
        </div>
      )}

      {menuStep === 'ai_select' && (
        <div className="flex flex-col gap-4 relative z-10">
          <h3 className="text-2xl font-bold text-center mb-4 neon-text-gold text-glow-gold-md shimmer-gold">
            Qui commence ?
          </h3>
          <button
            onClick={() => {
              setAiPlayer(Player.Two);
              setAiStartsFirst(false);
              setMenuStep('ai_difficulty');
            }}
            className="neon-card-blue p-5 rounded-xl font-bold hover:scale-105 transition-all flex justify-between items-center"
          >
            <span className="text-white">Vous commencez</span>
            <span className="text-xs glass px-3 py-1 rounded-full text-white-60">Vous êtes en bas</span>
          </button>
          <button
            onClick={() => {
              setAiPlayer(Player.Two);
              setAiStartsFirst(true);
              setMenuStep('ai_difficulty');
            }}
            className="neon-card-amber p-5 rounded-xl font-bold hover:scale-105 transition-all flex justify-between items-center"
          >
            <span className="text-white">L'IA commence</span>
            <span className="text-xs glass px-3 py-1 rounded-full text-white-60">Vous êtes en bas</span>
          </button>
          <button onClick={() => setMenuStep('main')} className="text-white-40 hover:text-gold mt-4 transition-colors">
            ← Retour
          </button>
        </div>
      )}

      {menuStep === 'ai_difficulty' && (
        <div className="flex flex-col gap-4 relative z-10">
          <h3 className="text-2xl font-bold text-center mb-4 neon-text-gold text-glow-gold-md shimmer-gold">
            Niveau de l'IA
          </h3>
          <button
            onClick={() => {
              setAiDifficulty('easy');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="neon-card-emerald p-5 rounded-xl font-bold text-lg hover:scale-105 transition-all"
          >
            Facile
          </button>
          <button
            onClick={() => {
              setAiDifficulty('medium');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="neon-card-amber p-5 rounded-xl font-bold text-lg hover:scale-105 transition-all"
          >
            Moyen
          </button>
          <button
            onClick={() => {
              setAiDifficulty('hard');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="neon-card-red p-5 rounded-xl font-bold text-lg hover:scale-105 transition-all"
          >
            Difficile
          </button>
          <button onClick={() => setMenuStep('ai_select')} className="text-white-40 hover:text-gold mt-4 transition-colors">
            ← Retour
          </button>
        </div>
      )}
    </div>
  );
}
