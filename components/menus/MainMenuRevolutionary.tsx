import React from 'react';
import { ArrowLeft, Users, Cpu, Globe, Gamepad2, Smile, Meh, Frown, Flame, Crown, Brain } from 'lucide-react';
import { GameMode, Player, AIDifficulty, GameSystem } from '../../types';
import type { GameRoom } from '../../services/supabase';
import { Lobby } from '../online/Lobby';

type MenuStep =
  | 'main'
  | 'ai_difficulty'
  | 'ai_select'
  | 'online_menu'
  | 'online_lobby'
  | 'online_join'
  | 'room_waiting';

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
  gameSystem: GameSystem;
  setGameSystem: (system: GameSystem) => void;
  onlineGame: {
    roomId: string;
    room: GameRoom | null;
    onlineStatus: string;
    joinInputId: string;
    setJoinInputId: (value: string) => void;
    isGuest: boolean;
  };
}

/* ============================================================
   MainMenu — pre-game flow
   ============================================================ */

export function MainMenuRevolutionary(props: MainMenuProps) {
  const { menuStep } = props;

  return (
    <div className="w-full max-w-[760px] px-4 sm:px-6">
      {menuStep === 'main' && <Main {...props} />}
      {menuStep === 'ai_select' && <AiSelect {...props} />}
      {menuStep === 'ai_difficulty' && <AiDifficulty {...props} />}
      {menuStep === 'online_menu' && <OnlineMenu {...props} />}
      {menuStep === 'online_lobby' && <OnlineLobbyView {...props} />}
      {menuStep === 'online_join' && <OnlineJoin {...props} />}
      {menuStep === 'room_waiting' && <RoomWaiting {...props} />}
    </div>
  );
}

/* ----------------------------------------------------------------
   Step: main
   ---------------------------------------------------------------- */

const Main: React.FC<MainMenuProps> = ({ startGame, setMenuStep, gameSystem, setGameSystem }) => (
  <div className="space-y-10">
    {/* Game system selector */}
    <div>
      <p className="kicker mb-3">Système</p>
      <div role="tablist" aria-label="Système de jeu" className="grid grid-cols-2 border border-rule">
        <SystemTab
          active={gameSystem === 'mgpwem'}
          onClick={() => setGameSystem('mgpwem')}
          label="Mgpwém"
          sub="5 graines / case"
        />
        <SystemTab
          active={gameSystem === 'angbwe'}
          onClick={() => setGameSystem('angbwe')}
          label="Angbwé"
          sub="4 graines · semis relais"
        />
      </div>
      {gameSystem === 'angbwe' && (
        <p className="mt-3 text-xs text-ink-muted leading-relaxed">
          Le perchoir — 56 pions, capture à 4. Idéal pour débuter.
        </p>
      )}
    </div>

    {/* Mode selection */}
    <div>
      <p className="kicker mb-4">Mode de jeu</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-rule border border-rule">
        <ModeCard
          icon={Users}
          title="2 joueurs · local"
          description="Sur le même écran"
          onClick={() => startGame(GameMode.LocalMultiplayer)}
        />
        <ModeCard
          icon={Cpu}
          title="Contre l'IA"
          description="Cinq niveaux du facile à la légende"
          onClick={() => setMenuStep('ai_select')}
        />
        <ModeCard
          icon={Globe}
          title="En ligne"
          description="Trouver ou créer une partie"
          onClick={() => setMenuStep('online_menu')}
        />
        <ModeCard
          icon={Gamepad2}
          title="Labo · simulation"
          description="Configurer une position"
          onClick={() => startGame(GameMode.Simulation)}
        />
      </div>
    </div>
  </div>
);

/* ----------------------------------------------------------------
   Step: ai_select (who starts)
   ---------------------------------------------------------------- */

const AiSelect: React.FC<MainMenuProps> = ({ setAiPlayer, setAiStartsFirst, setMenuStep }) => (
  <Step kicker="Match contre l'IA" title="Qui commence ?" onBack={() => setMenuStep('main')}>
    <div className="grid grid-cols-1 gap-px bg-rule border border-rule">
      <Choice
        label="Vous commencez"
        sub="Vous êtes en bas du plateau"
        onClick={() => {
          setAiPlayer(Player.Two);
          setAiStartsFirst(false);
          setMenuStep('ai_difficulty');
        }}
      />
      <Choice
        label="L'IA commence"
        sub="Vous êtes en bas du plateau"
        onClick={() => {
          setAiPlayer(Player.Two);
          setAiStartsFirst(true);
          setMenuStep('ai_difficulty');
        }}
      />
    </div>
  </Step>
);

/* ----------------------------------------------------------------
   Step: ai_difficulty
   ---------------------------------------------------------------- */

const AiDifficulty: React.FC<MainMenuProps> = ({ setAiDifficulty, startGame, aiPlayer, aiStartsFirst, setMenuStep, gameSystem }) => {
  const launch = (difficulty: AIDifficulty) => {
    setAiDifficulty(difficulty);
    startGame(GameMode.VsAI, aiPlayer, aiStartsFirst ? Player.Two : Player.One);
  };
  // Angbwé est un système d'initiation (CDC §5.1). On expose 3 niveaux
  // (Facile, Moyen, Difficile) — pas Expert/Légende/Neuronale qui sont
  // calibrés pour la complexité du Mgpwém.
  const isAngbwe = gameSystem === 'angbwe';
  return (
    <Step kicker="Niveau de l'IA" title="Choisissez la force." onBack={() => setMenuStep('ai_select')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-rule border border-rule">
        <DifficultyCard icon={Smile} label="Facile" sub="Idéal pour débuter" onClick={() => launch('easy')} />
        <DifficultyCard icon={Meh} label="Moyen" sub="Challenge équilibré" onClick={() => launch('medium')} />
        <DifficultyCard icon={Frown} label="Difficile" sub={isAngbwe ? 'Le plus fort en Angbwé' : 'Pour les habitués'} onClick={() => launch('hard')} />
        {!isAngbwe && (
          <>
            <DifficultyCard icon={Flame} label="Expert" sub="Réflexion approfondie" onClick={() => launch('expert')} />
            <DifficultyCard
              icon={Brain}
              label="Neuronale"
              sub="AlphaZero · style auto-jeu"
              onClick={() => launch('neural')}
              wide
            />
            <DifficultyCard
              icon={Crown}
              label="Légende"
              sub="Lente mais redoutable — 35+ coups"
              onClick={() => launch('legend')}
              wide
            />
          </>
        )}
      </div>
    </Step>
  );
};

/* ----------------------------------------------------------------
   Step: online_menu
   ---------------------------------------------------------------- */

const OnlineMenu: React.FC<MainMenuProps> = ({ setMenuStep, handleCreateRoom }) => (
  <Step kicker="Jeu en ligne" title="Trouver un adversaire." onBack={() => setMenuStep('main')}>
    <div className="grid grid-cols-1 gap-px bg-rule border border-rule mb-px">
      <Choice
        label="Liste des joueurs"
        sub="Voir toutes les parties ouvertes"
        onClick={() => setMenuStep('online_lobby')}
      />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-rule border border-rule">
      <Choice label="Créer une partie privée" sub="Partager un code" onClick={handleCreateRoom} />
      <Choice label="Rejoindre par code" sub="Entrer un identifiant" onClick={() => setMenuStep('online_join')} />
    </div>
  </Step>
);

/* ----------------------------------------------------------------
   Step: online_lobby
   ---------------------------------------------------------------- */

const OnlineLobbyView: React.FC<MainMenuProps> = ({ setMenuStep, onlineGame, handleJoinRoom }) => (
  <Step kicker="Jeu en ligne" title="Liste des joueurs" onBack={() => setMenuStep('online_menu')}>
    <div className="h-[480px] border border-rule">
      <Lobby
        onJoinRoom={(roomId) => {
          onlineGame.setJoinInputId(roomId);
          handleJoinRoom(roomId);
        }}
        onClose={() => setMenuStep('online_menu')}
      />
    </div>
  </Step>
);

/* ----------------------------------------------------------------
   Step: online_join
   ---------------------------------------------------------------- */

const OnlineJoin: React.FC<MainMenuProps> = ({ setMenuStep, onlineGame, handleJoinRoom }) => (
  <Step kicker="Jeu en ligne" title="Rejoindre par code." onBack={() => setMenuStep('online_menu')}>
    <div className="space-y-4">
      <input
        id="room-id-input"
        type="text"
        placeholder="ABCDEF"
        value={onlineGame.joinInputId}
        onChange={(e) => onlineGame.setJoinInputId(e.target.value.toUpperCase())}
        aria-label="Identifiant de la salle"
        className="w-full h-14 px-4 bg-surface text-ink text-center font-mono uppercase text-2xl tracking-[0.4em] border border-rule-strong focus:outline-none focus:border-accent transition-colors duration-150"
      />
      <button
        type="button"
        onClick={() => handleJoinRoom()}
        className="w-full h-12 inline-flex items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
      >
        Rejoindre
      </button>
      {onlineGame.onlineStatus && (
        <p className="text-center text-sm text-ink-muted" aria-live="polite">
          {onlineGame.onlineStatus}
        </p>
      )}
    </div>
  </Step>
);

/* ----------------------------------------------------------------
   Step: room_waiting
   ---------------------------------------------------------------- */

const RoomWaiting: React.FC<MainMenuProps> = ({ onlineGame, exitToMenu }) => (
  <div role="alert" aria-live="polite">
    <p className="kicker mb-3">{onlineGame.isGuest ? 'En attente' : 'Salle créée'}</p>
    <h3
      className="font-display text-3xl text-ink mb-8"
      style={{ fontVariationSettings: '"opsz" 36, "SOFT" 40' }}
    >
      {onlineGame.isGuest ? 'Connexion à l\'hôte…' : 'Partagez le code à votre adversaire.'}
    </h3>

    {!onlineGame.isGuest && (
      <div className="border border-rule bg-surface p-6 mb-6 text-center">
        <p className="kicker mb-3">Code de la salle</p>
        <p
          className="font-mono text-3xl tracking-[0.4em] text-ink select-all cursor-pointer"
          tabIndex={0}
        >
          {onlineGame.roomId || '— — — — — —'}
        </p>
      </div>
    )}

    <div className="flex items-center gap-2 text-sm text-ink-muted mb-8">
      <span className="relative flex w-2 h-2">
        <span className="absolute inset-0 bg-accent rounded-full animate-ping opacity-50" />
        <span className="absolute inset-0 bg-accent rounded-full" />
      </span>
      {onlineGame.onlineStatus}
    </div>

    {onlineGame.room && (
      <div className="border border-rule mb-6 max-h-[280px] overflow-hidden">
        <Lobby
          onJoinRoom={() => {}}
          onClose={() => {}}
          existingRoomId={onlineGame.room!.id}
          existingRoomCode={onlineGame.room!.room_code}
        />
      </div>
    )}

    <button
      type="button"
      onClick={exitToMenu}
      className="text-sm text-ink-muted hover:text-ink underline decoration-rule-strong underline-offset-[3px] hover:decoration-accent hover:text-accent transition-colors duration-150"
    >
      Annuler
    </button>
  </div>
);

/* ----------------------------------------------------------------
   Local components
   ---------------------------------------------------------------- */

const Step: React.FC<{ kicker: string; title: string; onBack: () => void; children: React.ReactNode }> = ({
  kicker,
  title,
  onBack,
  children,
}) => (
  <div className="space-y-8">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors duration-150"
    >
      <ArrowLeft size={14} strokeWidth={1.75} />
      Retour
    </button>
    <div>
      <p className="kicker mb-3">{kicker}</p>
      <h2
        className="font-display text-ink leading-[1.05] tracking-[-0.03em]"
        style={{
          fontVariationSettings: '"opsz" 60, "SOFT" 40',
          fontSize: 'clamp(1.875rem, 4vw, 2.5rem)',
        }}
      >
        {title}
      </h2>
    </div>
    {children}
  </div>
);

const SystemTab: React.FC<{ active: boolean; onClick: () => void; label: string; sub: string }> = ({
  active,
  onClick,
  label,
  sub,
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={
      'h-16 px-4 flex flex-col items-center justify-center transition-colors duration-150 ' +
      (active ? 'bg-accent text-accent-ink' : 'bg-canvas text-ink-muted hover:text-ink hover:bg-surface')
    }
  >
    <span
      className="font-display text-lg leading-none"
      style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
    >
      {label}
    </span>
    <span className="text-xs mt-1 opacity-80">{sub}</span>
  </button>
);

const ModeCard: React.FC<{
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group bg-canvas p-6 flex flex-col items-start hover:bg-surface transition-colors duration-150 text-left"
  >
    <Icon size={20} strokeWidth={1.5} className="text-ink-subtle group-hover:text-accent transition-colors duration-150 mb-4" />
    <p
      className="font-display text-lg text-ink mb-1"
      style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
    >
      {title}
    </p>
    <p className="text-xs text-ink-muted leading-relaxed">{description}</p>
  </button>
);

const Choice: React.FC<{ label: string; sub: string; onClick: () => void }> = ({ label, sub, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="bg-canvas p-5 flex items-center justify-between hover:bg-surface transition-colors duration-150 text-left"
  >
    <div>
      <p
        className="font-display text-lg text-ink"
        style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
      >
        {label}
      </p>
      <p className="text-xs text-ink-muted mt-0.5">{sub}</p>
    </div>
    <ArrowLeft size={14} strokeWidth={1.5} className="rotate-180 text-ink-subtle" />
  </button>
);

const DifficultyCard: React.FC<{
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  sub: string;
  onClick: () => void;
  wide?: boolean;
}> = ({ icon: Icon, label, sub, onClick, wide }) => (
  <button
    type="button"
    onClick={onClick}
    className={
      'group bg-canvas p-5 flex items-center gap-4 hover:bg-surface transition-colors duration-150 text-left ' +
      (wide ? 'sm:col-span-2' : '')
    }
  >
    <Icon size={18} strokeWidth={1.5} className="text-ink-subtle group-hover:text-accent transition-colors duration-150 shrink-0" />
    <div className="min-w-0">
      <p
        className="font-display text-lg text-ink"
        style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
      >
        {label}
      </p>
      <p className="text-xs text-ink-muted mt-0.5">{sub}</p>
    </div>
  </button>
);
