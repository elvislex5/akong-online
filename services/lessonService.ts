import { Player } from '../types';

export interface LessonStep {
  type: 'text' | 'board' | 'interactive';
  title?: string;
  content?: string;
  board?: number[];
  scores?: [number, number];
  currentPlayer?: Player;
  highlightPits?: number[];
  expectedMove?: number;
  successMessage?: string;
  failMessage?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  category: 'histoire' | 'angbwe' | 'mgpwem-bases' | 'mgpwem-captures' | 'mgpwem-avance';
  steps: LessonStep[];
  estimatedMinutes: number;
}

const LESSONS: Lesson[] = [
  // === HISTOIRE DU SONGO ===
  {
    id: 'histoire-1',
    title: "L'histoire du Songo",
    description: "Origines, migrations Ékang et évolution d'un jeu millénaire.",
    category: 'histoire',
    estimatedMinutes: 5,
    steps: [
      {
        type: 'text',
        title: 'Un jeu ancestral',
        content: "Le **Songo** (Sôong, Songa, Akôngh, Ôkola) est un jeu de stratégie de la famille des **mancala**, originaire du peuple **Ékang** (Fang-Bulu-Beti) d'Afrique centrale. Il est pratiqué depuis des millénaires au Cameroun, au Gabon, en Guinée Équatoriale et au Congo.",
      },
      {
        type: 'text',
        title: "Des racines égyptiennes",
        content: "Selon les travaux de Venant Debomame Zue Ntougou, le Songo possède des racines remontant à l'**Égypte antique**. Le tablier mesure 2 coudées royales (≈105 cm). Chaque rangée de 7 cases correspond à 7 paumes du système métrique égyptien.",
      },
      {
        type: 'text',
        title: 'Les 7 jours de la création',
        content: "Les **7 cases** représentent les 7 jours de la création dans la cosmogonie Ékang : **Terre** (Si), **Soleil** (Ngon), **Lune** (Alôa), **Mère** (Nna), **Père** (Essa), **Peuple** (Nnam), **Dieu** (Zambe). Le Songo n'est pas qu'un jeu — c'est un **modèle du monde**.",
      },
      {
        type: 'text',
        title: 'Technique de guerre',
        content: "Le Songo a servi de **technique de guerre** : les trous représentent des postes de sentinelles, les graines des soldats. Distribuer les graines, c'est **déployer ses troupes**. Capturer, c'est **conquérir**. Les grands stratèges Ékang s'entraînaient sur le tablier avant de planifier leurs campagnes.",
      },
      {
        type: 'text',
        title: 'Les 4 ères du tablier',
        content: "Le tablier a connu 4 ères d'évolution :\n\n1. **Trous dans le sol** (ère agricole)\n2. **Bronze et cuivre** (ère métallurgique)\n3. **Bois et raphia** (forêt d'Afrique centrale)\n4. **PVC et plastique** (modernité)\n\nAujourd'hui, on joue sur un plateau de 2×7 cases avec **70 graines d'ézang** (ou des billes à la diaspora).",
      },
      {
        type: 'text',
        title: '4 systèmes de jeu',
        content: "Le Songo compte au moins **4 systèmes de jeu** distincts :\n\n- **Mgpwém** — Le système principal, complexe et compétitif (5 graines/case)\n- **Angbwé** — Le système d'apprentissage (4 graines/case, relay sowing)\n- **Angounou** — Règles intermédiaires\n- **Bikom** — Variante historique\n\nSur Songo Online, vous pouvez jouer au **Mgpwém** et à l'**Angbwé**.",
      },
      {
        type: 'text',
        title: "Le champion : Vivi",
        content: "**Parfait Ekiki Metou**, dit **Vivi**, est le plus grand joueur de Songo connu. Reconnu pour sa maîtrise absolue du Mgpwém, il est l'équivalent d'un Magnus Carlsen pour le Songo. Son jeu se distingue par l'invention de concepts stratégiques comme les **cases-gènes** (bidoua).",
      },
    ],
  },

  // === ANGBWÉ — PREMIER PAS ===
  {
    id: 'angbwe-1',
    title: "Angbwé — Premier pas",
    description: "Le système le plus simple, idéal pour les débutants.",
    category: 'angbwe',
    estimatedMinutes: 5,
    steps: [
      {
        type: 'text',
        title: "Qu'est-ce que l'Angbwé ?",
        content: "L'Angbwé est le système de Songo le plus accessible. Il se joue avec **4 graines par case** (56 au total), et les règles sont simples : on distribue, on relance, et on capture quand une case atteint exactement **4 graines**.",
      },
      {
        type: 'board',
        title: 'Position de départ',
        content: "Voici le plateau de départ de l'Angbwé. Chaque case contient **4 graines**. Le joueur du bas (Joueur 1) joue en premier.",
        board: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        scores: [0, 0],
        currentPlayer: Player.One,
      },
      {
        type: 'text',
        title: 'Distribuer les graines',
        content: "Pour jouer, choisissez une de vos cases. Prenez **toutes les graines** et distribuez-les une par une dans le sens horaire (vers la droite pour le Joueur 1).\n\nChaque case reçoit une graine en passant.",
      },
      {
        type: 'text',
        title: 'Le relais (relay)',
        content: "La particularité de l'Angbwé : quand votre dernière graine tombe dans une case **non vide**, vous ramassez toutes les graines de cette case et continuez à distribuer ! C'est le **relais**.\n\nLe tour se termine seulement quand la dernière graine tombe dans une case **vide** (ou quand une capture a lieu).",
      },
      {
        type: 'text',
        title: 'Capture à 4',
        content: "Pendant la distribution, si une case atteint exactement **4 graines**, ces 4 graines sont immédiatement **capturées** et ajoutées à votre score.\n\nIl n'y a pas de capture en chaîne en Angbwé — chaque capture est indépendante.",
      },
      {
        type: 'text',
        title: 'Fin de partie',
        content: "La partie se termine quand un joueur n'a **plus aucune graine** dans ses cases au début de son tour. Le joueur avec le plus de graines capturées **gagne** !\n\nL'Angbwé est un excellent point de départ avant de passer au Mgpwém.",
      },
    ],
  },

  // === MGPWÉM — LES BASES ===
  {
    id: 'mgpwem-1',
    title: 'Mgpwém — Les bases',
    description: 'Distribution, sens de jeu et premières captures.',
    category: 'mgpwem-bases',
    estimatedMinutes: 7,
    steps: [
      {
        type: 'text',
        title: 'Le système principal',
        content: "Le **Mgpwém** est le système de jeu le plus joué et le plus compétitif du Songo. Il se joue avec **5 graines par case** (70 au total). C'est un jeu de profondeur stratégique immense — plus de **3 quadrillions** de positions possibles !",
      },
      {
        type: 'board',
        title: 'Position de départ',
        content: "Chaque case contient **5 graines**. Joueur 1 (bas, cases A1 à A7) joue en premier. Joueur 2 (haut, cases B1 à B7) joue ensuite.",
        board: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        scores: [0, 0],
        currentPlayer: Player.One,
      },
      {
        type: 'text',
        title: 'RADIMESE — Le mot magique',
        content: "La distribution suit le principe **RADIMESE** : **RA**masser, **DI**stribuer, **ME**ttre, **SE**mer. Prenez toutes les graines d'une case et distribuez-les une par une dans le sens horaire.\n\nPour Joueur 1 : de gauche à droite (A1→A7) puis vers le camp adverse (B1→B7).\nPour Joueur 2 : de gauche à droite (B7→B1) puis vers le camp adverse (A7→A1).",
      },
      {
        type: 'text',
        title: 'Les captures (Ditoto)',
        content: "Quand votre dernière graine tombe dans une case **adverse** contenant **1 ou 3 graines** (portant le total à **2, 3 ou 4**), vous capturez toutes les graines de cette case !\n\nLes captures valides : **2**, **3**, ou **4** graines dans la case d'arrivée.\n5 graines ou plus : pas de capture.",
      },
      {
        type: 'text',
        title: 'Captures en chaîne',
        content: "Après une capture, regardez la case **précédente** (dans le sens inverse de la distribution). Si elle contient aussi 2, 3 ou 4 graines et est dans le camp adverse, vous la capturez aussi !\n\nLa chaîne continue tant que les conditions sont remplies. C'est la **capture en chaîne** (Ditoto en chaîne).",
      },
      {
        type: 'board',
        title: 'Exemple de capture',
        content: "Joueur 1 joue A3 (case 2, 3 graines). Les graines atterrissent sur A4, A5, A6. Pas de capture ici car ce sont vos propres cases. Essayez de trouver des positions où la dernière graine tombe chez l'adversaire !",
        board: [5, 5, 3, 0, 0, 0, 0, 0, 1, 0, 0, 0, 5, 3],
        scores: [25, 23],
        currentPlayer: Player.One,
        highlightPits: [2],
      },
      {
        type: 'text',
        title: 'Gagner la partie',
        content: "Pour gagner, il faut capturer **36 graines ou plus** (sur 70). C'est le seuil de victoire standard (variante Gabon).\n\nEn variante Cameroun, le seuil est de **40 graines**.\n\nLa partie peut aussi se terminer en match nul si les deux joueurs atteignent 35.",
      },
    ],
  },

  // === MGPWÉM — CAPTURES ET INTERDITS ===
  {
    id: 'mgpwem-2',
    title: 'Mgpwém — Captures et interdits',
    description: 'Solidarité, protection des cases de départ et règles avancées.',
    category: 'mgpwem-captures',
    estimatedMinutes: 7,
    steps: [
      {
        type: 'text',
        title: "La règle de solidarité (Feeding)",
        content: "Si votre adversaire n'a **aucune graine** dans ses cases, vous **devez** le nourrir : jouer un coup qui distribue au moins une graine dans son camp.\n\nSi aucun de vos coups ne peut nourrir l'adversaire, vous capturez toutes les graines restantes et la partie se termine.",
      },
      {
        type: 'text',
        title: "Protection de la case de départ",
        content: "Les cases **A1** (case 0, pour Joueur 2) et **B1** (case 7, pour Joueur 1) sont les **cases de départ** adverses. Quand votre dernière graine atterrit sur la case de départ adverse, **pas de capture** — même si le total est 2, 3 ou 4.\n\nMais attention : les captures en chaîne peuvent **traverser** les cases de départ !",
      },
      {
        type: 'text',
        title: "Interdiction du grand slam",
        content: "Vous ne pouvez **pas** capturer toutes les graines de l'adversaire en un seul coup. Si un coup capturerait toutes les cases adverses, la capture est **annulée** et les graines restent en place.\n\nC'est la **règle d'asséchement** : vous ne devez pas laisser l'adversaire sans graines après votre capture.",
      },
      {
        type: 'board',
        title: 'Exemple de solidarité',
        content: "L'adversaire (Joueur 2, haut) n'a aucune graine. Joueur 1 **doit** jouer un coup qui nourrit l'adversaire. Ici, seul A6 (case 5) ou A7 (case 6) peut atteindre le camp adverse.",
        board: [2, 0, 0, 0, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0],
        scores: [25, 39],
        currentPlayer: Player.One,
        highlightPits: [5, 6],
      },
      {
        type: 'text',
        title: 'Tour complet (14+ graines)',
        content: "Quand une case contient **14 graines ou plus**, la distribution fait un **tour complet** du plateau. La case de départ est **sautée** lors de la distribution (on ne remet pas de graine dedans).\n\nLa 14e graine (et au-delà) continue après le tour complet et est auto-capturée si elle atterrit dans votre propre case de départ.",
      },
      {
        type: 'text',
        title: "L'Akuru — la grande case",
        content: "Une case contenant **19 graines ou plus** est appelée **Akuru** (grande case). C'est une arme stratégique redoutable : elle permet des tours complets dévastateurs.\n\nAccumuler des graines dans une case stratégique est une tactique clé du Mgpwém avancé.",
      },
      {
        type: 'text',
        title: "L'Olôa — la case vigile",
        content: "Une case contenant exactement **14 graines** est appelée **Olôa** (case vigile). Elle est sur le point de permettre un tour complet.\n\nLe **Yini** est la case mère contenant exactement **5 graines** — le nombre de départ. Ces concepts sont nommés en langue Ékang pour honorer les racines culturelles du jeu.",
      },
    ],
  },

  // === MGPWÉM — CONCEPTS AVANCÉS ===
  {
    id: 'mgpwem-3',
    title: 'Mgpwém — Akuru et stratégie',
    description: "Concepts stratégiques : menaces, bidoua, cases-gènes.",
    category: 'mgpwem-avance',
    estimatedMinutes: 6,
    steps: [
      {
        type: 'text',
        title: 'La menace simple',
        content: "Une **menace** est un coup potentiel qui capturerait des graines adverses. Votre adversaire doit réagir en protégeant la case menacée ou en contre-attaquant.\n\nCompter les menaces est fondamental : le joueur avec le plus de menaces a l'initiative.",
      },
      {
        type: 'text',
        title: 'La menace double',
        content: "Une **menace double** (Yinda) est un coup qui crée **deux menaces simultanées** que l'adversaire ne peut pas toutes les deux parer. C'est l'équivalent de la fourchette aux échecs.\n\nLes menaces doubles sont souvent décisives dans les parties de haut niveau.",
      },
      {
        type: 'text',
        title: 'Le Bidoua',
        content: "Le **Bidoua** (cases-gènes) est un concept inventé par le champion Vivi. Il s'agit de cases stratégiques qui contrôlent le rythme de la partie.\n\nUn bon Bidoua consiste à placer des graines dans des positions qui créent des menaces multiples tout en protégeant votre camp.",
      },
      {
        type: 'text',
        title: 'Le Grenier',
        content: "Accumuler beaucoup de graines dans une seule case crée un **Grenier** (Akuru quand ≥19). Un grenier vous donne un pouvoir de distribution énorme, mais il est aussi vulnérable : l'adversaire peut l'éviter ou vous forcer à le jouer au mauvais moment.\n\nSavoir **quand** libérer un grenier est l'art du Mgpwém.",
      },
      {
        type: 'text',
        title: "L'Éki-mbang (le Gabon)",
        content: "Capturer **toutes les 70 graines** (ou 36-0 en pratique) est un **Éki-mbang** — la victoire absolue, aussi appelée « Gabon ». C'est l'humiliation suprême pour l'adversaire.\n\nInfliger un Éki-mbang est un badge de prestige sur Songo Online.",
      },
      {
        type: 'text',
        title: 'Prêt pour la compétition',
        content: "Vous connaissez maintenant les concepts essentiels du Mgpwém !\n\nPour progresser :\n- Jouez des **puzzles** pour entraîner votre tactique\n- Affrontez l'**IA** à différents niveaux\n- Jouez en **ligne** pour obtenir votre classement Glicko-2\n- Visez votre premier **titre Ékang** : Nle Songo !\n\nBonne chance, futur Maître Semeur.",
      },
    ],
  },
];

export function getLessons(): Lesson[] {
  return LESSONS;
}

export function getLessonById(id: string): Lesson | undefined {
  return LESSONS.find(l => l.id === id);
}

export function getLessonsByCategory(category: Lesson['category']): Lesson[] {
  return LESSONS.filter(l => l.category === category);
}

export function getCategories(): { id: Lesson['category']; name: string; color: string }[] {
  return [
    { id: 'histoire', name: "Histoire du Songo", color: 'text-purple-400' },
    { id: 'angbwe', name: 'Angbwé — Débutant', color: 'text-emerald-400' },
    { id: 'mgpwem-bases', name: 'Mgpwém — Bases', color: 'text-amber-400' },
    { id: 'mgpwem-captures', name: 'Mgpwém — Captures', color: 'text-orange-400' },
    { id: 'mgpwem-avance', name: 'Mgpwém — Avancé', color: 'text-red-400' },
  ];
}
