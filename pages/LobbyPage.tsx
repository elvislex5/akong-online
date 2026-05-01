import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Users } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { getActiveRooms, getMatchFormatLabel } from '../services/roomService';
import { getEkangTitle } from '../services/glicko2';
import { useEmailVerificationGate } from '../hooks/useEmailVerificationGate';
import type { GameRoom } from '../services/supabase';

const REFRESH_MS = 10000;

const formatWaiting = (createdAt: string): string => {
  const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (elapsed < 60) return `${elapsed}s`;
  const m = Math.floor(elapsed / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h`;
};

export default function LobbyPage() {
  const navigate = useNavigate();
  const requireVerified = useEmailVerificationGate();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const all = await getActiveRooms();
      const waiting = all.filter((r) => r.status === 'waiting' && r.host);
      setRooms(waiting);
    } catch (err) {
      console.error('[LobbyPage] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch(true);
    const id = setInterval(() => fetch(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetch]);

  return (
    <div className="bg-canvas min-h-[60vh]">
      <Container width="wide" className="py-12 md:py-16">
        {/* Header */}
        <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <p className="kicker mb-3">En attente d'adversaire</p>
            <h1
              className="font-display text-4xl md:text-5xl text-ink leading-[1.05] tracking-[-0.03em]"
              style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40' }}
            >
              Lobby
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetch(false)}
              aria-label="Rafraîchir la liste"
              className="inline-flex items-center justify-center w-10 h-10 rounded-md text-ink-muted hover:text-ink hover:bg-surface border border-rule transition-colors duration-150"
            >
              <RefreshCw size={16} strokeWidth={1.75} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() =>
                requireVerified(() => navigate('/game?action=create-online'), 'créer une partie en ligne')
              }
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
            >
              <Plus size={16} strokeWidth={1.75} />
              Créer une partie
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <SkeletonRows />
        ) : rooms.length === 0 ? (
          <EmptyState
            onCreate={() =>
              requireVerified(() => navigate('/game?action=create-online'), 'créer une partie en ligne')
            }
          />
        ) : (
          <RoomTable
            rooms={rooms}
            onJoin={(code) =>
              requireVerified(() => navigate(`/game?join=${code}`), 'rejoindre une partie en ligne')
            }
          />
        )}
      </Container>
    </div>
  );
}

const RoomTable: React.FC<{ rooms: GameRoom[]; onJoin: (code: string) => void }> = ({ rooms, onJoin }) => (
  <div className="border border-rule">
    {/* Header row */}
    <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-6 px-5 py-3 border-b border-rule bg-surface">
      <span className="kicker">Hôte</span>
      <span className="kicker">Format</span>
      <span className="kicker">Attente</span>
      <span className="kicker text-right">Action</span>
    </div>
    <ul role="list" className="divide-y divide-rule">
      {rooms.map((room) => {
        const title = room.host ? getEkangTitle(room.host.elo_rating) : null;
        return (
          <li
            key={room.id}
            className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 md:gap-6 px-5 py-4 items-center bg-canvas hover:bg-surface transition-colors duration-150 cursor-pointer"
            onClick={() => onJoin(room.room_code)}
          >
            {/* Host */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-rule shrink-0">
                <img
                  src={room.host?.avatar_url || '/avatars/avatar_male_black.png'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-ink font-medium truncate">
                  {room.host?.display_name || room.host?.username || 'Anonyme'}
                </p>
                <p className="text-xs text-ink-subtle">
                  {room.host?.elo_rating || 1200}
                  {title && <span className="ml-1.5 italic font-display">· {title.name}</span>}
                </p>
              </div>
            </div>

            {/* Format */}
            <div className="text-sm text-ink-muted">
              {getMatchFormatLabel(room.match_format, room.match_target)}
            </div>

            {/* Wait time */}
            <div className="text-sm text-ink-subtle tabular-nums">
              {formatWaiting(room.created_at)}
            </div>

            {/* Action */}
            <div className="md:text-right">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin(room.room_code);
                }}
                className="inline-flex items-center h-8 px-3 rounded-sm text-xs font-medium border border-rule-strong text-ink hover:bg-canvas hover:border-accent hover:text-accent transition-colors duration-150"
              >
                Rejoindre
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

const SkeletonRows: React.FC = () => (
  <div className="border border-rule divide-y divide-rule">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="px-5 py-4 flex items-center gap-3 bg-canvas">
        <div className="w-9 h-9 rounded-full bg-surface animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 bg-surface rounded animate-pulse" />
          <div className="h-3 w-20 bg-surface rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="border border-rule py-20 px-6 text-center">
    <Users size={28} strokeWidth={1.5} className="mx-auto text-ink-subtle mb-4" />
    <h2
      className="font-display text-2xl text-ink mb-2"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
    >
      Aucune partie en attente
    </h2>
    <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
      Soyez le premier à proposer une partie. Vos adversaires arrivent en quelques secondes.
    </p>
    <button
      type="button"
      onClick={onCreate}
      className="mt-6 inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
    >
      <Plus size={16} strokeWidth={1.75} />
      Créer une partie
    </button>
  </div>
);
