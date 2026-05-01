import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, RefreshCw, Send, Swords, MessageCircle, Users } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { useAuth } from '../hooks/useAuth';
import { useBoardSkin } from '../hooks/useBoardSkin';
import { useSeedColor } from '../hooks/useSeedColor';
import { useSpectatorChat } from '../hooks/useSpectatorChat';
import { useSpectatorPresence } from '../hooks/useSpectatorPresence';
import { useSpectatorGame } from '../hooks/useSpectatorGame';
import {
  getActiveRooms,
  getRoomByCode,
  getMatchFormatLabel,
  subscribeToRoom,
} from '../services/roomService';
import { getEkangTitle } from '../services/glicko2';
import type { GameRoom, Profile } from '../services/supabase';
import { GameMode, Player, GameStatus, type GameState } from '../types';
import BoardRevolutionary from '../components/BoardRevolutionary';

const REFRESH_MS = 15000;

const elapsed = (startedAt: string | null): string => {
  if (!startedAt) return '—';
  const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};

const nameOf = (p: Profile | null | undefined, fallback: string): string =>
  p?.display_name || p?.username || fallback;

/* ============================================================
   WatchPage — spectator view
   ----------------------------------------------------------------
   Layout:  [ board + chat ] | [ sidebar of other rooms ]
   The active room comes from the `?room=<code>` query param so the
   page is deep-linkable and shareable.
   ============================================================ */

const WatchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCode = searchParams.get('room');

  const { user, profile } = useAuth();
  const { boardSkinUrl } = useBoardSkin(user?.id || null);
  const { seedColor } = useSeedColor(user?.id || null);

  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      else setRefreshing(true);
      try {
        const all = await getActiveRooms();
        const live = all.filter((r) => r.status === 'playing' && r.host && r.guest);
        setRooms(live);

        // Auto-select first if no active code in URL
        if (!activeCode && live.length > 0) {
          setSearchParams({ room: live[0].room_code }, { replace: true });
        }
      } catch (err) {
        console.error('[WatchPage] fetchRooms:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCode, setSearchParams]
  );

  // Initial fetch + periodic refresh
  useEffect(() => {
    fetchRooms(true);
    const id = setInterval(() => fetchRooms(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchRooms]);

  // Subscribe to the active room's live updates
  useEffect(() => {
    if (!activeCode) {
      setActiveRoom(null);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const room = await getRoomByCode(activeCode);
        if (cancelled || !room) return;
        setActiveRoom(room);

        // Realtime: only the row columns change in `payload.new` (no joins).
        // Keep host/guest from the initial fetch and merge fresh game state.
        unsubscribe = subscribeToRoom(room.id, (updated) => {
          setActiveRoom((prev) => (prev ? { ...prev, ...updated } : updated));
        });
      } catch (err) {
        console.error('[WatchPage] subscribe:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [activeCode]);

  const otherRooms = useMemo(
    () => rooms.filter((r) => r.room_code !== activeCode),
    [rooms, activeCode]
  );

  return (
    <div className="bg-canvas min-h-[80vh]">
      <Container width="wide" className="py-10 md:py-12">
        {/* Header */}
        <div className="flex items-end justify-between gap-6 flex-wrap mb-8">
          <div>
            <p className="kicker mb-3 inline-flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 bg-danger rounded-full animate-ping opacity-50" />
                <span className="absolute inset-0 bg-danger rounded-full" />
              </span>
              En direct
            </p>
            <h1
              className="font-display text-4xl md:text-5xl text-ink leading-[1.05] tracking-[-0.03em]"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40' }}
            >
              Regarder
            </h1>
          </div>
          <button
            type="button"
            onClick={() => fetchRooms(false)}
            aria-label="Rafraîchir la liste"
            className="inline-flex items-center justify-center w-10 h-10 rounded-md text-ink-muted hover:text-ink hover:bg-surface border border-rule transition-colors duration-150"
          >
            <RefreshCw size={16} strokeWidth={1.75} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <SkeletonLayout />
        ) : rooms.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            {/* Main column */}
            <main className="min-w-0">
              {activeRoom ? (
                <>
                  <MatchHeader room={activeRoom} />
                  <SpectatorBoard
                    room={activeRoom}
                    boardSkinUrl={boardSkinUrl}
                    seedColor={seedColor}
                    userId={user?.id || null}
                  />
                  <SpectatorChat
                    roomId={activeRoom.id}
                    userId={user?.id || null}
                    username={profile?.display_name || profile?.username || null}
                  />
                </>
              ) : (
                <NoRoomSelected />
              )}
            </main>

            {/* Sidebar */}
            <aside className="min-w-0">
              <RoomSidebar
                rooms={otherRooms}
                activeCode={activeCode}
                onSelect={(code) => setSearchParams({ room: code })}
              />
            </aside>
          </div>
        )}
      </Container>
    </div>
  );
};

export default WatchPage;

/* ----------------------------------------------------------------
   MatchHeader — players, scores, format, elapsed
   ---------------------------------------------------------------- */

const MatchHeader: React.FC<{ room: GameRoom }> = ({ room }) => {
  const { user } = useAuth();
  const { count: spectatorCount } = useSpectatorPresence({
    roomId: room.id,
    userId: user?.id || null,
  });

  const hostTitle = room.host ? getEkangTitle(room.host.elo_rating) : null;
  const guestTitle = room.guest ? getEkangTitle(room.guest.elo_rating) : null;
  const nameOne = nameOf(room.host, 'Hôte');
  const nameTwo = nameOf(room.guest, 'Invité');
  const showsMatch = room.match_format !== 'infinite';

  return (
    <div className="border border-rule bg-surface mb-4">
      <div className="grid grid-cols-[1fr_auto_1fr] divide-x divide-rule">
        <PlayerCell name={nameOne} rating={room.host?.elo_rating} title={hostTitle?.name} />
        <div className="flex flex-col items-center justify-center px-4 min-w-[120px]">
          {showsMatch ? (
            <>
              <p
                className="font-display tabular-nums text-ink leading-none"
                style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.5rem' }}
              >
                {room.match_score_host} – {room.match_score_guest}
              </p>
              <p className="kicker mt-1.5">{getMatchFormatLabel(room.match_format, room.match_target)}</p>
            </>
          ) : (
            <p className="kicker">Parties libres</p>
          )}
        </div>
        <PlayerCell name={nameTwo} rating={room.guest?.elo_rating} title={guestTitle?.name} align="right" />
      </div>
      <div className="border-t border-rule px-4 py-2 flex items-center justify-between text-xs text-ink-subtle">
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <Eye size={12} strokeWidth={1.75} />
            Vue spectateur
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Users size={12} strokeWidth={1.75} />
            {spectatorCount} {spectatorCount > 1 ? 'spectateurs' : 'spectateur'}
          </span>
        </span>
        <span className="tabular-nums">{elapsed(room.started_at)}</span>
      </div>
    </div>
  );
};

const PlayerCell: React.FC<{
  name: string;
  rating: number | null | undefined;
  title?: string;
  align?: 'left' | 'right';
}> = ({ name, rating, title, align = 'left' }) => (
  <div className={'flex flex-col px-4 py-3 ' + (align === 'right' ? 'items-end text-right' : 'items-start')}>
    <p className="text-sm text-ink font-medium truncate w-full">{name}</p>
    <p className="text-xs text-ink-subtle truncate w-full">
      {rating ?? 1200}
      {title && <span className="ml-1.5 italic font-display">· {title}</span>}
    </p>
  </div>
);

/* ----------------------------------------------------------------
   SpectatorBoard — read-only board
   Renders BoardRevolutionary with gameMode = OnlineSpectator
   ---------------------------------------------------------------- */

const SpectatorBoard: React.FC<{
  room: GameRoom;
  boardSkinUrl: string;
  seedColor: any;
  userId: string | null;
}> = ({ room, boardSkinUrl, seedColor, userId }) => {
  const noopRef = useRef(() => {});

  const fallbackGame: GameState = (room.game_state as GameState | null) || {
    board: Array(14).fill(0),
    scores: { [Player.One]: 0, [Player.Two]: 0 },
    currentPlayer: Player.One,
    status: GameStatus.Playing,
    winner: null,
    message: '',
    isSolidarityMode: false,
    solidarityBeneficiary: null,
  };

  // Live spectator with full animations. When the socket is connected,
  // gameState/animations come from Socket.io broadcasts. When the user is
  // anonymous (no userId) or the socket fails, we fall back to the
  // Realtime snapshot from `room.game_state`.
  const { gameState, isAnimating, animHand, connected } = useSpectatorGame({
    roomCode: room.room_code,
    userId,
    fallbackState: fallbackGame,
  });

  const displayState = connected && gameState ? gameState : fallbackGame;
  const isPlaying = displayState.status === GameStatus.Playing;
  const guestActive = isPlaying && displayState.currentPlayer === Player.Two;
  const hostActive = isPlaying && displayState.currentPlayer === Player.One;

  return (
    <div className="border border-rule bg-canvas mb-4 overflow-hidden">
      {/* Top player (Player.Two = guest with invertView=false) */}
      <PlayerStrip
        name={nameOf(room.guest, 'Joueur 2')}
        rating={room.guest?.elo_rating}
        score={displayState.scores[Player.Two]}
        active={guestActive}
        position="top"
      />

      {/* Board */}
      <div className="p-3 sm:p-4">
        <BoardRevolutionary
          gameState={displayState}
          onMove={noopRef.current}
          gameMode={GameMode.OnlineSpectator}
          isAnimating={connected ? isAnimating : false}
          handState={connected ? animHand : { pitIndex: null, seedCount: 0 }}
          playerProfiles={{
            [Player.One]: room.host || null,
            [Player.Two]: room.guest || null,
          }}
          invertView={false}
          boardSkinUrl={boardSkinUrl}
          gameSystem={'mgpwem'}
          seedColor={seedColor}
        />
      </div>

      {/* Bottom player (Player.One = host with invertView=false) */}
      <PlayerStrip
        name={nameOf(room.host, 'Joueur 1')}
        rating={room.host?.elo_rating}
        score={displayState.scores[Player.One]}
        active={hostActive}
        position="bottom"
      />
    </div>
  );
};

const PlayerStrip: React.FC<{
  name: string;
  rating: number | null | undefined;
  score: number;
  active: boolean;
  position: 'top' | 'bottom';
}> = ({ name, rating, score, active, position }) => {
  const borderClass = position === 'top' ? 'border-b border-rule' : 'border-t border-rule';
  return (
    <div
      className={
        'relative flex items-center justify-between px-4 h-11 transition-colors duration-200 ' +
        borderClass +
        ' ' +
        (active ? 'bg-accent/10' : 'bg-surface')
      }
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent"
        />
      )}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-medium tracking-[0.18em] uppercase text-ink-subtle">
          {position === 'top' ? 'Haut' : 'Bas'}
        </span>
        <span className={'text-sm truncate ' + (active ? 'text-ink font-medium' : 'text-ink-muted')}>
          {name}
        </span>
        {rating != null && (
          <span className="text-xs text-ink-subtle tabular-nums shrink-0">{rating}</span>
        )}
      </div>
      <span
        className={
          'font-display tabular-nums leading-none shrink-0 ' + (active ? 'text-accent' : 'text-ink')
        }
        style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30', fontSize: '1.5rem' }}
      >
        {score}
      </span>
    </div>
  );
};

/* ----------------------------------------------------------------
   SpectatorChat — live chat among spectators of the active room
   ---------------------------------------------------------------- */

const SpectatorChat: React.FC<{
  roomId: string;
  userId: string | null;
  username: string | null;
}> = ({ roomId, userId, username }) => {
  const { messages, loading, sending, error, send, canPost } = useSpectatorChat({
    roomId,
    userId,
    username,
  });
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft('');
    await send(text);
  };

  return (
    <div className="border border-rule bg-surface flex flex-col">
      <div className="px-4 h-10 flex items-center justify-between border-b border-rule">
        <p className="kicker inline-flex items-center gap-1.5">
          <MessageCircle size={11} strokeWidth={1.75} />
          Chat spectateurs
        </p>
        {messages.length > 0 && (
          <span className="text-xs text-ink-subtle tabular-nums">{messages.length}</span>
        )}
      </div>

      <div ref={scrollRef} className="h-[260px] overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <p className="text-xs text-ink-subtle">Chargement…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-ink-subtle italic">
            Personne n'a encore parlé. Lance la conversation.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-baseline gap-2 text-sm">
              <span className="text-ink font-medium shrink-0 truncate max-w-[120px]">
                {m.username}
              </span>
              <span className="text-ink-subtle text-xs shrink-0">·</span>
              <span className="text-ink-muted leading-snug break-words">{m.message}</span>
            </div>
          ))
        )}
      </div>

      {error && (
        <p role="alert" className="px-4 pb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="border-t border-rule p-2 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={canPost ? 'Tapez un message…' : 'Connectez-vous pour participer'}
          maxLength={280}
          disabled={!canPost || sending}
          className="flex-1 h-9 px-3 text-sm bg-canvas text-ink placeholder:text-ink-subtle border border-rule-strong rounded-md focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          aria-label="Message du chat spectateurs"
        />
        <button
          type="submit"
          disabled={!canPost || sending || !draft.trim()}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          aria-label="Envoyer"
        >
          <Send size={14} strokeWidth={1.75} />
        </button>
      </form>
    </div>
  );
};

/* ----------------------------------------------------------------
   RoomSidebar — list of other live games
   ---------------------------------------------------------------- */

const RoomSidebar: React.FC<{
  rooms: GameRoom[];
  activeCode: string | null;
  onSelect: (code: string) => void;
}> = ({ rooms, activeCode, onSelect }) => {
  return (
    <div className="border border-rule bg-surface">
      <div className="px-4 h-10 flex items-center border-b border-rule">
        <p className="kicker">Autres parties · {rooms.length}</p>
      </div>

      {rooms.length === 0 ? (
        <div className="p-5 text-xs text-ink-subtle leading-relaxed">
          Aucune autre partie en cours pour le moment. Reviens dans un instant.
        </div>
      ) : (
        <ul role="list" className="divide-y divide-rule max-h-[70vh] overflow-y-auto">
          {rooms.map((room) => (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => onSelect(room.room_code)}
                aria-pressed={activeCode === room.room_code}
                className={
                  'w-full px-4 py-3 text-left transition-colors duration-150 ' +
                  (activeCode === room.room_code
                    ? 'bg-canvas ring-1 ring-inset ring-accent'
                    : 'bg-surface hover:bg-canvas')
                }
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-ink font-medium truncate">
                    {nameOf(room.host, 'Hôte')}
                  </span>
                  {room.match_format !== 'infinite' && (
                    <span className="text-xs text-ink-muted tabular-nums shrink-0 ml-2">
                      {room.match_score_host}–{room.match_score_guest}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-ink-muted truncate">
                    {nameOf(room.guest, 'Invité')}
                  </span>
                  <span className="text-[10px] text-ink-subtle tabular-nums shrink-0 ml-2">
                    {elapsed(room.started_at)}
                  </span>
                </div>
                <p className="text-[10px] text-ink-subtle truncate">
                  {getMatchFormatLabel(room.match_format, room.match_target)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------
   States
   ---------------------------------------------------------------- */

const SkeletonLayout: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
    <div className="space-y-4">
      <div className="h-20 bg-surface border border-rule animate-pulse" />
      <div className="aspect-[21/9] bg-surface border border-rule animate-pulse" />
      <div className="h-24 bg-surface border border-rule animate-pulse" />
    </div>
    <div className="border border-rule">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 bg-surface border-b border-rule last:border-0 animate-pulse" />
      ))}
    </div>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="border border-rule py-20 px-6 text-center">
    <Swords size={28} strokeWidth={1.5} className="mx-auto text-ink-subtle mb-4" />
    <h2
      className="font-display text-2xl text-ink mb-2"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
    >
      Aucune partie en cours
    </h2>
    <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
      Reviens dans quelques minutes — ou lance la tienne, des spectateurs viendront.
    </p>
  </div>
);

const NoRoomSelected: React.FC = () => (
  <div className="border border-rule py-16 px-6 text-center">
    <Eye size={24} strokeWidth={1.5} className="mx-auto text-ink-subtle mb-4" />
    <p className="text-sm text-ink-muted">
      Choisis une partie dans la liste pour la regarder.
    </p>
  </div>
);
