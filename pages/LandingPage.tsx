import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { useOnlineCount } from '../hooks/useOnlineCount';

/* ============================================================
   Songo — Landing
   ----------------------------------------------------------------
   Editorial structure. The page tells the story of the game,
   not the platform's features. Restraint is the design.
   ============================================================ */

const GAME_SYSTEMS = [
  {
    name: 'Mgpwém',
    seeds: '5 graines / case',
    description:
      'Le système courant, le plus joué en compétition. Cinq graines par case, partie ouverte.',
    state: 'available',
  },
  {
    name: 'Angbwé',
    seeds: '4 graines / case',
    description:
      'La porte d\'entrée des enfants et des débutants. Plus court, plus tactique, moins exigeant en mémoire.',
    state: 'planned',
  },
  {
    name: 'Angounou',
    seeds: '35 graines / 7ᵉ case',
    description:
      'Une variante singulière où tout est concentré dans une seule case. La distribution change tout.',
    state: 'planned',
  },
  {
    name: 'Nya Songo',
    seeds: 'la loi du neuf',
    description:
      '« Le vrai songo ». Système avancé fondé sur la solidarité et la circulation des graines.',
    state: 'planned',
  },
  {
    name: 'Bikom',
    seeds: 'le plus ancien',
    description:
      'Aussi appelé Nkogh Judo. Le système d\'origine, encore pratiqué dans les villages historiques.',
    state: 'planned',
  },
] as const;

const LEXICON = [
  { word: 'Aleh', def: 'jouer' },
  { word: 'Atén-NDA', def: 'passer son tour' },
  { word: 'Adzi', def: 'capturer ; littéralement « manger »' },
  { word: 'Bikuruya', def: 'coup d\'impact, de rupture' },
  { word: 'Yini', def: 'case bloquée — exactement 5 graines' },
  { word: 'Akuru', def: 'grande case — 19 graines ou plus' },
  { word: 'Olôa', def: 'case sentinelle — 14 graines' },
  { word: 'AbØ songo', def: 'ouverture, classification d\'une partie' },
];

export default function LandingPage() {
  const { online } = useOnlineCount();
  return (
    <div className="bg-canvas">
      {/* ============================================================
         Hero — typography on the left, board photograph on the right.
         ============================================================ */}
      <section className="border-b border-rule">
        <Container width="wide" className="py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left column — typography */}
            <div className="lg:col-span-7">
              <p className="kicker mb-6">Mancala africain · Variante Mpem</p>

              <h1
                className="font-display italic text-ink leading-[0.85] tracking-[-0.04em]"
                style={{
                  fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 0',
                  fontSize: 'clamp(4rem, 12vw, 9rem)',
                }}
              >
                Songo
              </h1>

              <p
                className="mt-8 max-w-[560px] text-ink-muted font-display"
                style={{
                  fontVariationSettings: '"opsz" 36, "SOFT" 50',
                  fontSize: 'clamp(1.125rem, 2.1vw, 1.5rem)',
                  lineHeight: 1.4,
                }}
              >
                Cinq systèmes de jeu, sept cases comme les sept jours de la création
                Ekang, et plus de positions possibles que les échecs. Le mancala
                d'Afrique centrale, joué en ligne pour la première fois.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  to="/game"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150 text-sm font-medium tracking-wide"
                >
                  Jouer maintenant
                  <ArrowRight size={16} strokeWidth={1.75} />
                </Link>
                <Link
                  to="/rules"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-md text-ink hover:bg-surface border border-rule-strong transition-colors duration-150 text-sm font-medium tracking-wide"
                >
                  Apprendre les règles
                </Link>
              </div>
            </div>

            {/* Right column — board with seeds (transparent PNG, floats on canvas) */}
            <figure className="lg:col-span-5">
              <img
                src="/boards/hero.png"
                alt="Plateau de Songo en terre cuite ocre avec graines ezang disposées dans les cases, partie en cours"
                className="w-full h-auto"
                onError={(e) => {
                  // Fallback to terre.png (empty plateau) until hero.png with seeds is generated
                  (e.currentTarget as HTMLImageElement).src = '/boards/terre.png';
                }}
              />
              <figcaption className="mt-3 text-xs text-ink-subtle italic font-display">
                Position de milieu de partie · plateau en terre cuite.
              </figcaption>
            </figure>
          </div>

          <div className="mt-16 md:mt-20 grid grid-cols-3 max-w-[680px] gap-6 sm:gap-12">
            <Stat n="3,17 quadrillions" label="positions possibles" />
            <Stat
              n={online > 0 ? online.toLocaleString('fr-FR') : '—'}
              label={online === 1 ? 'joueur en ligne' : 'joueurs en ligne'}
              live
            />
            <Stat n="5" label="systèmes de jeu" />
          </div>
        </Container>
      </section>

      {/* ============================================================
         Section 1 — Five game systems
         ============================================================ */}
      <section className="border-b border-rule">
        <Container width="wide" className="py-24 md:py-32">
          <SectionHeader
            kicker="Variantes"
            title="Cinq jeux dans un"
            lede="Le Songo n'est pas un jeu unique mais un ensemble de systèmes apparentés. Chaque variante a sa logique, son public, son rythme."
          />

          <ol className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-rule border border-rule">
            {GAME_SYSTEMS.map((system, i) => (
              <li
                key={system.name}
                className="bg-canvas p-8 flex flex-col"
              >
                <div className="flex items-baseline justify-between mb-4">
                  <span className="kicker">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {system.state === 'available' && (
                    <span className="text-xs text-success font-medium tracking-wide uppercase">
                      Jouable
                    </span>
                  )}
                  {system.state === 'planned' && (
                    <span className="text-xs text-ink-subtle font-medium tracking-wide uppercase">
                      À venir
                    </span>
                  )}
                </div>
                <h3
                  className="font-display text-3xl text-ink mb-1"
                  style={{ fontVariationSettings: '"opsz" 36, "SOFT" 30' }}
                >
                  {system.name}
                </h3>
                <p className="text-sm text-ink-subtle mb-4 italic font-display">
                  {system.seeds}
                </p>
                <p className="text-sm text-ink-muted leading-relaxed">
                  {system.description}
                </p>
              </li>
            ))}
            {/* fill the last grid cell with a quiet caption */}
            <li className="bg-canvas p-8 flex items-end">
              <p className="text-xs text-ink-subtle leading-relaxed">
                Variantes documentées dans la littérature Songo. Le système Mgpwém
                est implémenté, les autres arrivent par étapes.
              </p>
            </li>
          </ol>
        </Container>
      </section>

      {/* ============================================================
         Section 2 — Cultural depth (with plateau photo)
         ============================================================ */}
      <section className="border-b border-rule">
        <Container width="wide" className="py-24 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <p className="kicker mb-6">Profondeur</p>
              <h2
                className="font-display text-4xl md:text-5xl text-ink leading-[1.05] tracking-[-0.03em]"
                style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40' }}
              >
                Plus de positions
                <br />
                que les échecs.
              </h2>
              <p className="lead mt-8">
                3 173 734 438 530 120 positions atteignables. Le Songo n'est pas
                un jeu de hasard ni de comptage&nbsp;: c'est un jeu de mémoire,
                de circulation et d'anticipation profonde.
              </p>
              <div className="mt-8 prose-body space-y-3 text-ink-muted">
                <p>
                  Les sept cases d'un côté évoquent les sept jours de la
                  création dans la cosmogonie Ekang. La règle de la solidarité
                  — l'obligation de nourrir l'adversaire — change le calcul&nbsp;:
                  affamer l'autre est interdit, sauf si on n'a pas le choix.
                </p>
                <p>
                  Les chercheurs ont rapproché la mécanique des graines des
                  techniques de calcul de l'Égypte ancienne et des stratégies
                  guerrières ancestrales. Ce n'est pas une métaphore&nbsp;: c'est
                  une trace.
                </p>
              </div>
            </div>

            <figure className="lg:col-span-7">
              <div className="aspect-[16/7] bg-clay-100 dark:bg-clay-800 rounded-md overflow-hidden border border-rule">
                <img
                  src="/boards/classic.png"
                  alt="Plateau de Songo en bois sombre, gravé en Ekang"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className="mt-4 flex items-baseline justify-between gap-4 text-xs text-ink-subtle">
                <span>
                  Plateau gravé <span className="font-display italic text-ink-muted">Akông</span> — le mot Ekang qui désigne le jeu de Songo.
                </span>
                <span className="shrink-0 italic font-display">14 cases · 70 graines</span>
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      {/* ============================================================
         Section 3 — Vivi, the champion
         ============================================================ */}
      <section className="border-b border-rule">
        <Container width="wide" className="py-24 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-4 lg:sticky lg:top-24 self-start">
              <p className="kicker mb-6">Le champion</p>
              <h2
                className="font-display text-5xl md:text-6xl text-ink leading-[0.95] tracking-[-0.03em]"
                style={{ fontVariationSettings: '"opsz" 80, "SOFT" 50' }}
              >
                Vivi.
              </h2>
              <p className="mt-3 text-sm text-ink-subtle italic">
                Ekiki Metou Parfait
              </p>
            </div>

            <div className="lg:col-span-8">
              <p className="lead">
                Invaincu depuis 1995. Joue les yeux bandés. Joue par téléphone,
                en dictant ses coups.
              </p>
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-px bg-rule border border-rule">
                <FactCell heading="Depuis" value="1995" detail="Aucune défaite officielle" />
                <FactCell heading="Premier tournoi international" value="40M FCFA" detail="Guinée Équatoriale" />
                <FactCell heading="Mode" value="À l'aveugle" detail="Tient le plateau de mémoire" />
              </div>
              <p className="mt-10 prose-body text-ink-muted max-w-[640px]">
                Comme Kasparov pour les échecs ou Hikaru Nakamura pour le shogi
                moderne, Vivi incarne un sommet. Sa mémoire des positions, sa
                capacité à jouer plusieurs parties simultanées sans plateau, sa
                lecture des semis — sont la mesure du Songo de très haut niveau.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ============================================================
         Section 4 — Ekang lexicon
         ============================================================ */}
      <section className="border-b border-rule">
        <Container width="wide" className="py-24 md:py-32">
          <SectionHeader
            kicker="Vocabulaire"
            title="Lexique Ekang"
            lede="Les mots du jeu, dans la langue où il est né. Le Songo se parle avant de se jouer."
          />

          <dl className="mt-16 max-w-[760px] divide-y divide-rule border-t border-b border-rule">
            {LEXICON.map(({ word, def }) => (
              <div
                key={word}
                className="grid grid-cols-[1fr_2fr] gap-8 py-5 items-baseline"
              >
                <dt
                  className="font-display text-2xl text-ink italic"
                  style={{ fontVariationSettings: '"opsz" 24, "SOFT" 60' }}
                >
                  {word}
                </dt>
                <dd className="text-md text-ink-muted">
                  {def}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* ============================================================
         Section 5 — Federation & community
         ============================================================ */}
      <section className="border-b border-rule">
        <Container width="wide" className="py-24 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <p className="kicker mb-6">Communauté</p>
              <h2
                className="font-display text-4xl md:text-5xl text-ink leading-[1.05] tracking-[-0.03em]"
                style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40' }}
              >
                FEGASONGO,
                <br />
                quatre ligues,
                <br />
                cent onze joueurs.
              </h2>
            </div>
            <div className="lg:col-span-7">
              <div className="prose-body text-ink-muted space-y-4">
                <p>
                  La Fédération Gabonaise de Songo encadre quatre ligues
                  provinciales, des clubs structurés et un calendrier annuel.
                  Cent onze joueurs sont référencés dans la documentation
                  officielle, avec leurs surnoms et leurs clubs.
                </p>
                <p>
                  Une partie de tournoi dure deux heures. Un tournoi compte six
                  matchs de vingt minutes. Les clubs portent des noms qui
                  racontent leur territoire&nbsp;: <span className="italic font-display text-ink">Cocotiers</span>,{' '}
                  <span className="italic font-display text-ink">Akamayong</span>,{' '}
                  <span className="italic font-display text-ink">Engong des Pk</span>,{' '}
                  <span className="italic font-display text-ink">Ntseng Okele</span>.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ============================================================
         Section 6 — Final CTAs
         ============================================================ */}
      <section>
        <Container width="wide" className="py-24 md:py-32">
          <p className="kicker mb-6">Trois façons de commencer</p>
          <h2
            className="font-display text-4xl md:text-5xl text-ink leading-[1.05] tracking-[-0.03em] mb-16"
            style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40' }}
          >
            Apprendre. Jouer. Maîtriser.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule border border-rule">
            <CtaCard
              to="/rules"
              n="01"
              title="Découvrir les règles"
              description="Les bases, la solidarité, les captures, l'interdit de la famine."
            />
            <CtaCard
              to="/game"
              n="02"
              title="Affronter l'IA"
              description="Cinq niveaux de difficulté, du joueur du dimanche à la Légende."
            />
            <CtaCard
              to="/lobby"
              n="03"
              title="Jouer en ligne"
              description="Trouver un adversaire en quelques secondes, en France ou au Gabon."
            />
          </div>
        </Container>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------
   Local components — kept inline since they're not reused elsewhere
   ---------------------------------------------------------------- */

const Stat: React.FC<{ n: string; label: string; live?: boolean }> = ({ n, label, live }) => (
  <div>
    <p
      className="font-display text-ink leading-none tracking-[-0.02em]"
      style={{
        fontVariationSettings: '"opsz" 36, "SOFT" 30',
        fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
      }}
    >
      {n}
    </p>
    <p className="kicker mt-2 inline-flex items-center gap-1.5">
      {live && (
        <span className="relative flex h-1.5 w-1.5" aria-label="en direct">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
      )}
      {label}
    </p>
  </div>
);

const SectionHeader: React.FC<{ kicker: string; title: string; lede?: string }> = ({
  kicker,
  title,
  lede,
}) => (
  <div className="max-w-[760px]">
    <p className="kicker mb-6">{kicker}</p>
    <h2
      className="font-display text-4xl md:text-5xl text-ink leading-[1.05] tracking-[-0.03em]"
      style={{ fontVariationSettings: '"opsz" 60, "SOFT" 40' }}
    >
      {title}
    </h2>
    {lede && <p className="lead mt-6">{lede}</p>}
  </div>
);

const FactCell: React.FC<{ heading: string; value: string; detail: string }> = ({
  heading,
  value,
  detail,
}) => (
  <div className="bg-canvas p-6">
    <p className="kicker mb-3">{heading}</p>
    <p
      className="font-display text-2xl text-ink mb-1"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
    >
      {value}
    </p>
    <p className="text-xs text-ink-subtle">{detail}</p>
  </div>
);

const CtaCard: React.FC<{
  to: string;
  n: string;
  title: string;
  description: string;
}> = ({ to, n, title, description }) => (
  <Link
    to={to}
    className="group bg-canvas p-8 flex flex-col hover:bg-surface transition-colors duration-200"
  >
    <div className="flex items-baseline justify-between mb-6">
      <span className="kicker">{n}</span>
      <ArrowUpRight
        size={18}
        strokeWidth={1.5}
        className="text-ink-subtle group-hover:text-accent group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200"
      />
    </div>
    <h3
      className="font-display text-2xl text-ink mb-3"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
    >
      {title}
    </h3>
    <p className="text-sm text-ink-muted leading-relaxed">
      {description}
    </p>
  </Link>
);
