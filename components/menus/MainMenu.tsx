import React from 'react';
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
    <div className="w-full max-w-md p-6 flex flex-col gap-4 animate-fade-in">
      {menuStep === 'main' && (
        <>
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-700 rounded-3xl mx-auto mb-4 shadow-lg rotate-3 flex items-center justify-center">
              <div className="text-4xl">🌰</div>
            </div>
            <h2 className="text-gray-400 text-sm uppercase tracking-widest">Jeu de stratégie africain</h2>
          </div>

          <button
            onClick={() => startGame(GameMode.LocalMultiplayer)}
            className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg border border-gray-600 flex items-center gap-4 transition-all hover:scale-105 group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold group-hover:bg-blue-500">
              2
            </div>
            <div className="text-left">
              <div className="font-bold">2 Joueurs (Local)</div>
              <div className="text-xs text-gray-400">Sur le même écran</div>
            </div>
          </button>

          <button
            onClick={() => setMenuStep('ai_select')}
            className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg border border-gray-600 flex items-center gap-4 transition-all hover:scale-105 group"
          >
            <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center font-bold group-hover:bg-amber-500">
              IA
            </div>
            <div className="text-left">
              <div className="font-bold">1 Joueur (vs IA)</div>
              <div className="text-xs text-gray-400">Défiez l'ordinateur</div>
            </div>
          </button>

          <button
            onClick={() => setMenuStep('online_menu')}
            className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg border border-gray-600 flex items-center gap-4 transition-all hover:scale-105 group"
          >
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold group-hover:bg-green-500">
              🌐
            </div>
            <div className="text-left">
              <div className="font-bold">Jeu en ligne</div>
              <div className="text-xs text-gray-400">Affrontez un ami à distance</div>
            </div>
          </button>

          <button
            onClick={() => startGame(GameMode.Simulation)}
            className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg border border-gray-600 flex items-center gap-4 transition-all hover:scale-105 group"
          >
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold group-hover:bg-purple-500">
              ⚡
            </div>
            <div className="text-left">
              <div className="font-bold">Simulation / Labo</div>
              <div className="text-xs text-gray-400">Configurez le plateau</div>
            </div>
          </button>
        </>
      )}

      {menuStep === 'online_menu' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-center mb-4">Jeu en ligne</h3>
          <button
            onClick={handleCreateRoom}
            className="bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-500"
          >
            Créer une salle
          </button>
          <button
            onClick={() => setMenuStep('online_join')}
            className="bg-gray-700 p-4 rounded-xl font-bold hover:bg-gray-600"
          >
            Rejoindre une salle
          </button>
          <button onClick={() => setMenuStep('main')} className="text-gray-500 mt-4">
            Retour
          </button>
        </div>
      )}

      {menuStep === 'online_lobby' && (
        <div className="text-center bg-gray-800 p-6 rounded-xl border border-gray-600">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Salle créée !</h3>
          <p className="text-sm text-gray-400 mb-4">Partagez cet ID avec votre ami :</p>
          <div className="bg-black p-4 rounded font-mono text-2xl tracking-wider select-all cursor-pointer border border-gray-700 text-white mb-4">
            {onlineGame.roomId || 'Génération...'}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            {onlineGame.onlineStatus}
          </div>
          <button onClick={exitToMenu} className="mt-6 text-red-400 hover:text-red-300 text-sm">
            Annuler
          </button>
        </div>
      )}

      {menuStep === 'online_join' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-center mb-2">Rejoindre</h3>
          <input
            type="text"
            placeholder="Entrez l'ID de la salle"
            value={onlineGame.joinInputId}
            onChange={(e) => onlineGame.setJoinInputId(e.target.value)}
            className="bg-gray-800 border border-gray-600 p-4 rounded-xl text-white text-center font-mono uppercase"
          />
          <button
            onClick={handleJoinRoom}
            className="bg-green-600 p-4 rounded-xl font-bold hover:bg-green-500"
          >
            Rejoindre
          </button>
          <p className="text-center text-sm text-gray-400 mt-2">{onlineGame.onlineStatus}</p>
          <button onClick={() => setMenuStep('online_menu')} className="text-gray-500 mt-4">
            Retour
          </button>
        </div>
      )}

      {menuStep === 'ai_select' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-center mb-4">Qui commence ?</h3>
          <button
            onClick={() => {
              setAiPlayer(Player.Two);
              setAiStartsFirst(false);
              setMenuStep('ai_difficulty');
            }}
            className="bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-500 flex justify-between items-center"
          >
            <span>Vous commencez</span>
            <span className="text-xs bg-black/20 px-2 py-1 rounded">Vous êtes en bas</span>
          </button>
          <button
            onClick={() => {
              setAiPlayer(Player.Two);
              setAiStartsFirst(true);
              setMenuStep('ai_difficulty');
            }}
            className="bg-amber-600 p-4 rounded-xl font-bold hover:bg-amber-500 flex justify-between items-center"
          >
            <span>L'IA commence</span>
            <span className="text-xs bg-black/20 px-2 py-1 rounded">Vous êtes en bas</span>
          </button>
          <button onClick={() => setMenuStep('main')} className="text-gray-500 mt-4">
            Retour
          </button>
        </div>
      )}

      {menuStep === 'ai_difficulty' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-bold text-center mb-4">Niveau de l'IA</h3>
          <button
            onClick={() => {
              setAiDifficulty('easy');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="bg-green-600/20 text-green-400 border border-green-600 p-4 rounded-xl font-bold hover:bg-green-600 hover:text-white"
          >
            Facile
          </button>
          <button
            onClick={() => {
              setAiDifficulty('medium');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="bg-amber-600/20 text-amber-400 border border-amber-600 p-4 rounded-xl font-bold hover:bg-amber-600 hover:text-white"
          >
            Moyen
          </button>
          <button
            onClick={() => {
              setAiDifficulty('hard');
              startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
            }}
            className="bg-red-600/20 text-red-400 border border-red-600 p-4 rounded-xl font-bold hover:bg-red-600 hover:text-white"
          >
            Difficile
          </button>
          <button onClick={() => setMenuStep('ai_select')} className="text-gray-500 mt-4">
            Retour
          </button>
        </div>
      )}
    </div>
  );
}
