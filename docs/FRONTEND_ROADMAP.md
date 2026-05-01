# Frontend & UX Roadmap - Akong

## 🎯 Objectif

Transformer Akong en une **expérience utilisateur exceptionnelle** avec :
- Page d'accueil professionnelle et attractive
- Design responsive parfait sur tous les appareils (mobile, tablette, desktop)
- Animations fluides et interface moderne
- Accessibilité et performance optimales

---

## 📱 État Actuel (Mise à jour : 29 Nov 2025)

### ✅ Ce qui fonctionne
- ✅ **Landing Page complète** - Page d'accueil moderne avec Hero, Features, How to Play, CTA
- ✅ **Navigation avec React Router** - Routing fonctionnel (/, /game, /rules)
- ✅ **Navbar responsive** - Avec burger menu mobile
- ✅ **Footer complet** - Branding et liens de navigation
- ✅ **Layout wrapper** - Structure réutilisable pour toutes les pages
- ✅ Menu principal fonctionnel
- ✅ Plateau de jeu avec animations
- ✅ Écran d'authentification
- ✅ Page de profil basique
- ✅ Page des règles détaillée
- ✅ **Accessibilité** - Navigation clavier, ARIA, Focus traps

### ⚠️ Problèmes restants
- ⚠️ **Responsivité du plateau** - Besoin d'optimiser Board.tsx et Pit.tsx pour mobile
- ⚠️ **Touch targets** - Vérifier taille minimale 44x44px sur mobile
- ⚠️ **Tests mobile** - Besoin de tester sur appareils réels
- ⚠️ **PWA** - Pas encore installable comme app native

---

## 🎨 Phase UI/UX : Design & Responsivité

### **Étape 1 : Page d'Accueil (Landing Page)** 🏠 ✅ **TERMINÉE**

**Objectif** : Créer une première impression professionnelle

**Statut** : ✅ Complétée (LandingPage.tsx implémentée avec toutes les sections)

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
- [x] Créer `pages/LandingPage.tsx`
- [x] Designer le Hero section avec gradient moderne
- [x] Ajouter des cards pour les fonctionnalités
- [x] Intégrer l'image akong.png
- [x] Créer un footer réutilisable
- [ ] Ajouter des animations au scroll (AOS ou Framer Motion) - Phase 4

#### Assets
- [x] `public/akong.png` - Image du plateau (existant)
- [x] Icônes SVG inline dans le code (features)
- [ ] `public/gameplay.gif` - Animation du jeu (optionnel)

---

### **Étape 2 : Navigation & Routing** 🧭 ✅ **TERMINÉE**

**Objectif** : Structure claire et navigation fluide

**Statut** : ✅ Complétée (React Router, Navbar, Footer, Layout implémentés)

#### Routes créées
```typescript
/ → Landing Page ✅
/game → Menu de jeu / Jeu (protégé par auth) ✅
/rules → Règles détaillées ✅
/profile → Profil utilisateur (modal) ✅
/leaderboard → Classement (Phase 4) ⏳
/about → À propos du jeu ⏳
```

#### Tâches
- [x] Installer React Router (`npm install react-router-dom`)
- [x] Créer la structure de routing dans `AppRouter.tsx`
- [x] Créer un composant `Navbar` réutilisable
- [x] Ajouter navigation responsive (burger menu sur mobile)
- [x] Gérer les routes protégées (authentification requise)

#### Composants créés
- [x] `AppRouter.tsx` - Router principal
- [x] `components/layout/Navbar.tsx` - Avec burger menu mobile
- [x] `components/layout/Footer.tsx` - Footer complet
- [x] `components/layout/Layout.tsx` - Wrapper avec header/footer
- [x] `pages/LandingPage.tsx` - Page d'accueil
- [x] `pages/RulesPage.tsx` - Page des règles

---

### **Étape 3 : Responsivité Mobile** 📱 ✅ **TERMINÉE**

**Objectif** : Jeu parfaitement jouable sur mobile

**Statut** : ✅ Complétée (Landing/Navbar/Board/Pit optimisés, modals responsive)

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
- [x] Réduire la taille du plateau sur mobile (`max-w-[98vw]`) ✅
- [x] Agrandir les zones cliquables des pits (72px → 80px width) ✅
- [x] Adapter la taille des graines (dynamiques selon congestion) ✅
- [x] Scores déjà responsive (stores adaptés) ✅
- [ ] Tester sur iPhone 11, 12, 13 (Safari) ⏳ (Tests réels requis)
- [ ] Tester sur Android (Chrome Mobile) ⏳ (Tests réels requis)

#### Tâches - Navigation mobile
- [x] Créer un burger menu pour mobile ✅
- [ ] Bottom navigation sur mobile (style app native) ⏳ (Optionnel)
- [ ] Gestures tactiles (swipe pour revenir, etc.) ⏳ (Optionnel)

#### Tâches - Modals responsive
- [x] Limiter hauteur des modals (`max-h-[90vh]`) ✅
- [x] Ajouter scroll interne (`overflow-y-auto`) ✅
- [x] Padding responsive déjà configuré ✅

---

### **Étape 4 : Animations & Micro-interactions** ✨ ✅ **TERMINÉE**

**Objectif** : Rendre l'interface vivante et engageante

**Statut** : ✅ Complétée (Transitions de pages, Toast notifications, Confetti victoires)

#### Animations ajoutées
- [x] **Page transitions** (fade, slide avec Framer Motion) ✅
- [x] **Hover effects** sur boutons (déjà présents avec Tailwind) ✅
- [x] **Loading states** (spinner d'auth) ✅
- [x] **Toast notifications** pour feedback utilisateur ✅
- [x] **Confetti** lors d'une victoire ✅
- [ ] **Shake** sur erreur (mouvement invalide) ⏳ (Optionnel)

#### Librairies installées
- [x] **Framer Motion** : Animations React complexes ✅
- [x] **React Hot Toast** : Notifications élégantes ✅
- [x] **Canvas Confetti** : Effet de célébration ✅

#### Tâches complétées
- [x] Installer Framer Motion : `npm install framer-motion` ✅
- [x] Installer React Hot Toast : `npm install react-hot-toast` ✅
- [x] Installer Canvas Confetti : `npm install canvas-confetti` ✅
- [x] Créer ToastProvider avec configuration globale ✅
- [x] Ajouter transitions entre pages avec AnimatePresence ✅
- [x] Intégrer confetti lors des victoires (App.tsx) ✅

---

### **Étape 5 : Accessibilité (a11y)** ♿ ✅ **TERMINÉE**

**Objectif** : Jeu accessible à tous

**Statut** : ✅ Complétée (Focus traps, ARIA labels, Navigation clavier, SkipLink)

#### Checklist accessibilité
- [x] **Contraste des couleurs** : Focus visible amélioré (anneaux) ✅
- [x] **Navigation clavier** : Tab, Enter, Esc fonctionnels ✅
- [x] **ARIA labels** : Attributs pour lecteurs d'écran ✅
- [x] **Focus visible** : Outline sur éléments interactifs ✅
- [x] **Textes alternatifs** : Alt text sur toutes les images ✅
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

1. ✅ **Étape 2 : Navigation** - 1 jour (TERMINÉ)
   - Structure le reste
2. ✅ **Étape 1 : Landing Page** - 2 jours (TERMINÉ)
   - Première impression cruciale
3. ✅ **Étape 3 : Responsivité Mobile** - 1-2 jours (TERMINÉ)
   - Le jeu DOIT fonctionner sur mobile (Board.tsx et Pit.tsx optimisés)
4. ✅ **Étape 4 : Animations** - 1 jour (TERMINÉ)
   - Polish avec transitions, toast, et confetti
5. ✅ **Étape 5 : Accessibilité** (TERMINÉ) - 1 jour
   - Focus management, ARIA, Keyboard nav
6. ⏳ **Étape 6 : Performance** (À FAIRE) - 1 jour
   - Optimisations continues
7. ⏳ **Étape 7 : PWA** (Optionnel) - 1 jour
   - Nice to have

**Progression : 5/7 étapes terminées (71%)**
**Temps restant estimé : 2 jours**

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
