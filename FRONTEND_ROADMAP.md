# Frontend & UX Roadmap - Akong

## 🎯 Objectif

Transformer Akong en une **expérience utilisateur exceptionnelle** avec :
- Page d'accueil professionnelle et attractive
- Design responsive parfait sur tous les appareils (mobile, tablette, desktop)
- Animations fluides et interface moderne
- Accessibilité et performance optimales

---

## 📱 État Actuel

### ✅ Ce qui fonctionne
- Menu principal fonctionnel
- Plateau de jeu avec animations
- Écran d'authentification
- Page de profil basique

### ⚠️ Problèmes identifiés
- **Pas de page d'accueil** - L'utilisateur arrive directement sur le menu de jeu
- **Responsivité limitée** - Non optimisé pour mobile (iPhone, Android)
- **Images manquantes** - Pas d'assets visuels (logo akong.png, illustrations)
- **Navigation basique** - Pas de vraie structure de navigation
- **Plateau non responsive** - Difficile à jouer sur petit écran

---

## 🎨 Phase UI/UX : Design & Responsivité

### **Étape 1 : Page d'Accueil (Landing Page)** 🏠

**Objectif** : Créer une première impression professionnelle

#### Structure de la page
```
┌─────────────────────────────────┐
│   HEADER (Navigation)           │
│   [Logo] [Accueil] [Jeu] [...]  │
├─────────────────────────────────┤
│   HERO SECTION                  │
│   - Grand titre "AKONG"         │
│   - Sous-titre accrocheur       │
│   - Image/illustration du jeu   │
│   - CTA : "Jouer maintenant"    │
├─────────────────────────────────┤
│   FONCTIONNALITÉS               │
│   [Icon] Multijoueur en ligne   │
│   [Icon] IA intelligente        │
│   [Icon] Classement mondial     │
│   [Icon] Tournois               │
├─────────────────────────────────┤
│   COMMENT JOUER                 │
│   - Vidéo ou GIF du gameplay   │
│   - Règles simplifiées          │
│   - "En savoir plus" → Règles   │
├─────────────────────────────────┤
│   STATISTIQUES                  │
│   [X joueurs] [Y parties] [Z]   │
├─────────────────────────────────┤
│   FOOTER                        │
│   - Liens utiles                │
│   - Réseaux sociaux             │
│   - Copyright                   │
└─────────────────────────────────┘
```

#### Tâches
- [ ] Créer `pages/LandingPage.tsx`
- [ ] Designer le Hero section avec gradient moderne
- [ ] Ajouter des cards pour les fonctionnalités
- [ ] Intégrer les images (akong.png, plateau, graines)
- [ ] Ajouter des animations au scroll (AOS ou Framer Motion)
- [ ] Créer un footer réutilisable

#### Assets nécessaires
- [ ] `public/akong-logo.png` - Logo principal (transparent)
- [ ] `public/akong-hero.png` - Illustration pour le hero
- [ ] `public/features/multiplayer.svg` - Icône multijoueur
- [ ] `public/features/ai.svg` - Icône IA
- [ ] `public/features/ranking.svg` - Icône classement
- [ ] `public/features/tournament.svg` - Icône tournois
- [ ] `public/gameplay.gif` - Animation du jeu

---

### **Étape 2 : Navigation & Routing** 🧭

**Objectif** : Structure claire et navigation fluide

#### Routes à créer
```typescript
/ → Landing Page (accueil)
/game → Menu de jeu (actuel)
/play → Plateau de jeu (en partie)
/profile → Profil utilisateur
/leaderboard → Classement (Phase 4)
/rules → Règles détaillées
/about → À propos du jeu
```

#### Tâches
- [ ] Installer React Router (`npm install react-router-dom`)
- [ ] Créer la structure de routing dans `App.tsx`
- [ ] Créer un composant `Navbar` réutilisable
- [ ] Ajouter navigation responsive (burger menu sur mobile)
- [ ] Gérer les routes protégées (authentification requise)

#### Composants
- `components/layout/Navbar.tsx`
- `components/layout/Footer.tsx`
- `components/layout/Layout.tsx` (wrapper avec header/footer)

---

### **Étape 3 : Responsivité Mobile** 📱

**Objectif** : Jeu parfaitement jouable sur mobile

#### Problèmes à résoudre
1. **Plateau de jeu trop grand** - Ne rentre pas sur écran mobile
2. **Boutons trop petits** - Difficile à cliquer avec le doigt
3. **Texte illisible** - Taille de police trop petite
4. **Modals non scrollables** - Contenu coupé sur petit écran

#### Breakpoints Tailwind
```css
sm: 640px   /* Petit mobile (portrait) */
md: 768px   /* Tablette (portrait) */
lg: 1024px  /* Tablette (landscape) / Desktop petit */
xl: 1280px  /* Desktop standard */
2xl: 1536px /* Grand écran */
```

#### Tâches - Plateau de jeu mobile
- [ ] Réduire la taille du plateau sur mobile (`scale` CSS)
- [ ] Agrandir les zones cliquables des pits (min 44x44px)
- [ ] Adapter la taille des graines (plus grosses sur mobile)
- [ ] Repositionner les scores (vertical sur mobile)
- [ ] Tester sur iPhone 11, 12, 13 (Safari)
- [ ] Tester sur Android (Chrome Mobile)

#### Tâches - Navigation mobile
- [ ] Créer un burger menu pour mobile
- [ ] Bottom navigation sur mobile (style app native)
- [ ] Gestures tactiles (swipe pour revenir, etc.)

#### Tâches - Modals responsive
- [ ] Limiter hauteur des modals (`max-h-[90vh]`)
- [ ] Ajouter scroll interne (`overflow-y-auto`)
- [ ] Ajuster padding sur mobile (moins d'espace)

---

### **Étape 4 : Animations & Micro-interactions** ✨

**Objectif** : Rendre l'interface vivante et engageante

#### Animations à ajouter
- [ ] **Page transitions** (fade, slide)
- [ ] **Hover effects** sur boutons (scale, shadow)
- [ ] **Loading states** (skeleton screens)
- [ ] **Toast notifications** pour feedback utilisateur
- [ ] **Confetti** lors d'une victoire
- [ ] **Shake** sur erreur (mouvement invalide)

#### Librairies recommandées
- **Framer Motion** : Animations React complexes
- **React Hot Toast** : Notifications élégantes
- **Canvas Confetti** : Effet de célébration

#### Tâches
- [ ] Installer Framer Motion : `npm install framer-motion`
- [ ] Installer React Hot Toast : `npm install react-hot-toast`
- [ ] Créer un système de notifications global
- [ ] Ajouter transitions entre pages
- [ ] Animer l'apparition des éléments (stagger)

---

### **Étape 5 : Accessibilité (a11y)** ♿

**Objectif** : Jeu accessible à tous

#### Checklist accessibilité
- [ ] **Contraste des couleurs** : Vérifier WCAG AA (ratio 4.5:1)
- [ ] **Navigation clavier** : Tab, Enter, Esc fonctionnels
- [ ] **ARIA labels** : Attributs pour lecteurs d'écran
- [ ] **Focus visible** : Outline sur éléments interactifs
- [ ] **Textes alternatifs** : Alt text sur toutes les images
- [ ] **Taille de texte** : Minimum 16px, ajustable
- [ ] **Touch targets** : Minimum 44x44px (mobile)

#### Outils de test
- Lighthouse (Chrome DevTools)
- axe DevTools (extension)
- WAVE (Web Accessibility Evaluation Tool)

---

### **Étape 6 : Performance** ⚡

**Objectif** : Temps de chargement < 2 secondes

#### Optimisations
- [ ] **Images** : Optimiser et convertir en WebP
- [ ] **Code splitting** : Lazy loading des routes
- [ ] **Bundle size** : Analyser et réduire
- [ ] **Fonts** : Preload et optimiser
- [ ] **Cache** : Service Worker (PWA)

#### Tâches
- [ ] Compresser toutes les images (TinyPNG, Squoosh)
- [ ] Lazy load les composants lourds
- [ ] Ajouter `loading="lazy"` sur images
- [ ] Minifier le CSS (déjà fait par Vite)
- [ ] Analyser avec Lighthouse (score > 90)

---

### **Étape 7 : PWA (Progressive Web App)** 📲

**Objectif** : Installable comme une app native

#### Fonctionnalités PWA
- [ ] **Manifest** : Icônes, nom, couleurs
- [ ] **Service Worker** : Cache offline
- [ ] **Install prompt** : Bouton "Installer l'app"
- [ ] **Splash screen** : Écran de démarrage
- [ ] **Mode standalone** : Plein écran (sans barre browser)

#### Tâches
- [ ] Créer `public/manifest.json`
- [ ] Générer icônes PWA (512x512, 192x192, etc.)
- [ ] Configurer Vite PWA plugin
- [ ] Tester installation sur mobile

---

## 🎨 Design System

### Palette de couleurs (actuelle)
```css
/* Background */
--bg-primary: #111827    /* gray-900 */
--bg-secondary: #1F2937  /* gray-800 */

/* Accent */
--accent-primary: #F59E0B   /* amber-500 */
--accent-secondary: #D97706 /* amber-600 */

/* Text */
--text-primary: #F3F4F6   /* gray-100 */
--text-secondary: #9CA3AF /* gray-400 */
```

### Typographie
```css
/* Titres */
font-family: system-ui, sans-serif
h1: 48px - 72px (bold)
h2: 36px - 48px (bold)
h3: 24px - 36px (semibold)

/* Corps */
body: 16px - 18px (normal)
small: 12px - 14px (normal)
```

### Espacements
```css
/* Padding */
mobile: 16px (p-4)
tablet: 24px (p-6)
desktop: 32px (p-8)

/* Gaps */
tight: 8px (gap-2)
normal: 16px (gap-4)
loose: 24px (gap-6)
```

---

## 📐 Wireframes & Mockups

### Landing Page (Desktop)
```
┌────────────────────────────────────────────────┐
│  [Logo AKONG]    Accueil  Jeu  Règles  Profil │
├────────────────────────────────────────────────┤
│                                                 │
│              AKONG - Le Jeu du Songo           │
│         Stratégie africaine millénaire         │
│                                                 │
│         [Image du plateau de jeu]              │
│                                                 │
│    [Jouer Maintenant]  [En savoir plus]        │
│                                                 │
├────────────────────────────────────────────────┤
│   🌐 Multijoueur    🤖 IA      🏆 Tournois     │
│   Jouez en ligne   3 niveaux   Compétitions    │
└────────────────────────────────────────────────┘
```

### Landing Page (Mobile)
```
┌─────────────────────┐
│ [☰] AKONG   [👤]   │
├─────────────────────┤
│                     │
│   AKONG             │
│   Le Jeu du Songo   │
│                     │
│   [Image]           │
│                     │
│   [Jouer]           │
│                     │
├─────────────────────┤
│ 🌐 Multijoueur      │
│ 🤖 IA               │
│ 🏆 Tournois         │
└─────────────────────┘
```

---

## 🧪 Tests Responsivité

### Appareils cibles
| Appareil | Résolution | Tester |
|----------|------------|--------|
| iPhone SE | 375x667 | [ ] |
| iPhone 11/12/13 | 390x844 | [ ] |
| iPhone 14 Pro Max | 430x932 | [ ] |
| Samsung Galaxy S21 | 360x800 | [ ] |
| iPad Mini | 768x1024 | [ ] |
| iPad Pro | 1024x1366 | [ ] |
| Desktop HD | 1920x1080 | [ ] |
| Desktop 4K | 3840x2160 | [ ] |

### Navigateurs
- [ ] Chrome Mobile (Android)
- [ ] Safari (iOS)
- [ ] Firefox Mobile
- [ ] Samsung Internet
- [ ] Chrome Desktop
- [ ] Firefox Desktop
- [ ] Safari Desktop
- [ ] Edge Desktop

---

## 📊 Métriques de succès

### Performance
- Lighthouse Performance: > 90
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Cumulative Layout Shift: < 0.1

### UX
- Taux de rebond: < 40%
- Temps moyen sur site: > 5 min
- Taux de conversion (inscription): > 30%
- NPS (Net Promoter Score): > 50

---

## 🚀 Ordre d'implémentation recommandé

1. **Étape 3 : Responsivité Mobile** (Priorité 1) - 1-2 jours
   - Le jeu DOIT fonctionner sur mobile
2. **Étape 1 : Landing Page** (Priorité 2) - 2 jours
   - Première impression cruciale
3. **Étape 2 : Navigation** (Priorité 3) - 1 jour
   - Structure le reste
4. **Étape 4 : Animations** (Priorité 4) - 1 jour
   - Polish
5. **Étape 5 : Accessibilité** (Priorité 5) - 1 jour
   - Important mais peut être incrémental
6. **Étape 6 : Performance** (Priorité 6) - 1 jour
   - Optimisations continues
7. **Étape 7 : PWA** (Optionnel) - 1 jour
   - Nice to have

**Total estimé : 7-10 jours**

---

## 📝 Notes importantes

### Images à créer/obtenir
1. **Logo AKONG** (akong.png)
   - Fond transparent
   - Versions : 512x512, 256x256, 128x128, 64x64
   - Formats : PNG, SVG

2. **Illustrations**
   - Plateau de jeu vide
   - Graines (différentes couleurs)
   - Main qui distribue
   - Victoire/Défaite

3. **Icônes fonctionnalités**
   - Multijoueur (deux joueurs connectés)
   - IA (cerveau/robot)
   - Tournoi (trophée)
   - Classement (podium)

### Considérations mobiles
- Toujours tester en conditions réelles (appareil physique)
- Simuler réseau lent (3G) pour tester performance
- Tester orientation portrait ET landscape
- Vérifier zones cliquables (doigt = 44px minimum)
- Éviter hover-only interactions (pas de hover sur mobile)

### Outils de développement
```bash
# Installer dépendances frontend
npm install framer-motion react-hot-toast
npm install react-router-dom
npm install -D @types/react-router-dom

# PWA (optionnel)
npm install -D vite-plugin-pwa
```

---

**Prêt à transformer l'expérience utilisateur ! 🎨📱**
