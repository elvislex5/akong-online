import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Container } from '../components/ui/Container';

/* ============================================================
   Songo — Règles (variante Mpem / Mgpwém)
   ----------------------------------------------------------------
   Editorial layout: each rule has a number, a title, a body. No
   gradient cards, no animation, no glow. The text is the design.
   ============================================================ */

export default function RulesPage() {
  return (
    <div className="bg-canvas">
      {/* Hero */}
      <section className="border-b border-rule">
        <Container width="reading" className="py-16 md:py-24">
          <p className="kicker mb-6">Variante Mpem · Mgpwém</p>
          <h1
            className="font-display text-ink leading-[0.95] tracking-[-0.03em]"
            style={{
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontSize: 'clamp(3rem, 8vw, 6rem)',
            }}
          >
            Règles
          </h1>
          <p className="lead mt-6">
            Le Songo se joue à deux, sur un plateau de quatorze cases et
            soixante-dix graines. Cinq graines par case au départ. Le premier
            joueur à capturer plus de trente-cinq graines remporte la partie.
          </p>
        </Container>
      </section>

      {/* Numbered rules */}
      <Rule
        n="01"
        kicker="But du jeu"
        title="Capturer plus de la moitié."
        body={[
          'La partie se joue avec soixante-dix graines au total. Capturer plus de trente-cinq, c\'est gagner.',
          'Si la partie se termine sans qu\'aucun joueur n\'ait dépassé ce seuil — par blocage, par épuisement — celui qui en a capturé le plus l\'emporte.',
        ]}
      />

      <Rule
        n="02"
        kicker="Distribution"
        title="Semer dans le sens du soleil."
        body={[
          'On prend les graines d\'une de ses propres cases et on les distribue une par une, dans le sen horaire, vers la gauche dans son camp puis vers la droite dans le camp adverse.',
          'Si la quantité dépasse quatorze graines, on saute la case de départ pour ne pas la regarnir au passage du tour complet.',
          'On ne peut jouer que depuis ses propres cases — les sept du bas pour le joueur 1, les sept du haut pour le joueur 2.',
        ]}
      />

      <Rule
        n="03"
        kicker="La capture"
        title="Deux, trois ou quatre."
        body={[
          'Si la dernière graine semée tombe dans une case adverse et porte cette case à un total de deux, trois ou quatre graines — on capture toutes les graines de cette case.',
          'On regarde alors la case précédente, toujours du côté adverse. Si elle contient aussi deux, trois ou quatre graines, on capture également. On remonte ainsi tant que la condition est vraie.',
          'C\'est la chaîne. Bien préparée, elle peut tomber sur cinq ou six cases d\'un coup.',
        ]}
      />

      {/* Special rules */}
      <section className="border-b border-rule">
        <Container width="wide" className="py-16 md:py-24">
          <p className="kicker mb-6">Règles spéciales</p>
          <h2
            className="font-display text-ink leading-[1.05] tracking-[-0.03em] mb-12 max-w-[680px]"
            style={{
              fontVariationSettings: '"opsz" 60, "SOFT" 40',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            Les quatre cas qui changent tout.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule">
            <SpecialRule
              n="A"
              title="Auto-capture"
              body="Si un tour complet termine avec exactement une graine dans la case de départ — quatorze, vingt-huit, quarante-deux — cette graine est capturée par le joueur."
            />
            <SpecialRule
              n="B"
              title="Solidarité"
              body="Si vous n'avez plus qu'une graine dans votre dernière case, vous l'auto-capturez. L'adversaire doit alors jouer un coup qui vous regarnit, si la position le permet. C'est l'obligation de nourrir."
            />
            <SpecialRule
              n="C"
              title="Sécheresse"
              body="Vous ne pouvez pas capturer toutes les graines de votre adversaire au point de le laisser sans aucun coup possible — sauf si la position vous y oblige. Affamer est interdit, sauf inévitable."
            />
            <SpecialRule
              n="D"
              title="Blocage"
              body="Si plus aucun coup n'est jouable, la partie s'arrête. Toutes les graines restantes vont au dernier joueur ayant pu jouer."
            />
          </div>
        </Container>
      </section>

      {/* Lexicon bridge */}
      <section className="border-b border-rule">
        <Container width="reading" className="py-16 md:py-24">
          <p className="kicker mb-6">Vocabulaire</p>
          <h2
            className="font-display text-ink leading-[1.05] tracking-[-0.03em] mb-8"
            style={{
              fontVariationSettings: '"opsz" 60, "SOFT" 40',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            Quelques mots à connaître.
          </h2>
          <p className="prose-body text-ink-muted mb-10">
            Le Songo est un jeu d'observation et de comptage. Les joueurs nomment
            les positions ; chaque mot Ekang correspond à une configuration
            précise.
          </p>
          <dl className="divide-y divide-rule border-t border-b border-rule">
            <Term word="Yini" def="Une case qui contient exactement cinq graines. C'est la position bloquée — on ne peut pas y jouer sans la défaire." />
            <Term word="Akuru" def="Une case lourde, dix-neuf graines ou plus. Elle déclenche un tour complet et change la circulation." />
            <Term word="Olôa" def="La case sentinelle, exactement quatorze graines. Distribuée en bloc, elle vide la rangée et revient à elle-même." />
            <Term word="Bikuruya" def="Le coup d'impact — celui qui rompt l'équilibre, force la capture, ou détruit la solidité adverse." />
            <Term word="Adzi" def="Capturer. Littéralement : « manger »." />
            <Term word="Aleh" def="Jouer." />
          </dl>
        </Container>
      </section>

      {/* CTA bridge */}
      <section>
        <Container width="reading" className="py-16 md:py-24">
          <p className="kicker mb-6">Pour aller plus loin</p>
          <h2
            className="font-display text-ink leading-[1.05] tracking-[-0.03em] mb-6"
            style={{
              fontVariationSettings: '"opsz" 60, "SOFT" 40',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            Apprendre par l'exemple.
          </h2>
          <p className="prose-body text-ink-muted mb-10 max-w-[640px]">
            Les règles s'écrivent en quelques paragraphes ; le Songo se comprend
            en jouant. Suivez le parcours pas à pas — histoire, premiers coups,
            captures, finales.
          </p>
          <Link
            to="/learn"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150 text-sm font-medium tracking-wide"
          >
            Suivre les leçons
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </Container>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------
   Local components
   ---------------------------------------------------------------- */

const Rule: React.FC<{ n: string; kicker: string; title: string; body: string[] }> = ({
  n,
  kicker,
  title,
  body,
}) => (
  <section className="border-b border-rule">
    <Container width="wide" className="py-16 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <div className="lg:col-span-3 lg:sticky lg:top-24 self-start">
          <p
            className="font-display text-ink-subtle leading-none tracking-[-0.04em] mb-2"
            style={{
              fontVariationSettings: '"opsz" 144, "SOFT" 30',
              fontSize: 'clamp(3rem, 6vw, 5rem)',
            }}
          >
            {n}
          </p>
          <p className="kicker">{kicker}</p>
        </div>
        <div className="lg:col-span-9 max-w-[680px]">
          <h2
            className="font-display text-ink leading-[1.05] tracking-[-0.03em] mb-8"
            style={{
              fontVariationSettings: '"opsz" 60, "SOFT" 40',
              fontSize: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            {title}
          </h2>
          <div className="prose-body text-ink-muted space-y-4">
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </Container>
  </section>
);

const SpecialRule: React.FC<{ n: string; title: string; body: string }> = ({ n, title, body }) => (
  <div className="bg-canvas p-8">
    <div className="flex items-baseline justify-between mb-4">
      <span
        className="font-display text-ink-subtle italic"
        style={{ fontVariationSettings: '"opsz" 36, "SOFT" 60', fontSize: '1.5rem' }}
      >
        ({n})
      </span>
    </div>
    <h3
      className="font-display text-2xl text-ink mb-3"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
    >
      {title}
    </h3>
    <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
  </div>
);

const Term: React.FC<{ word: string; def: string }> = ({ word, def }) => (
  <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] gap-6 py-4 items-baseline">
    <dt
      className="font-display text-xl text-ink italic"
      style={{ fontVariationSettings: '"opsz" 24, "SOFT" 60' }}
    >
      {word}
    </dt>
    <dd className="text-md text-ink-muted leading-relaxed">{def}</dd>
  </div>
);
