# Rapport d'Harmonisation du Design - AKÔNG

**Date:** 28 novembre 2025
**Statut:** Analyse complète

---

## 📊 Vue d'ensemble

L'application AKÔNG utilise une esthétique **African-inspired Cyberpunk** avec un système de design tokens robuste (`design-tokens.css`). Cependant, plusieurs incohérences ont été identifiées entre les différentes pages et composants.

---

## 🎨 Palette de Couleurs Établie

### Couleurs Primaires
- **Gold/Amber**: `#FFD700`, `#FF8C00` - Accent principal
- **Emerald**: `#00FF7F` - Accent secondaire (succès)
- **Cyan**: `#00FFFF` - Accent secondaire (info)
- **Purple/Magenta**: `#FF00FF` - Accent tertiaire

### Backgrounds
- **Black**: `#000000`
- **Dark**: `#1a1a1a`
- **Charcoal**: `#2a2a2a`

---

## ⚠️ Incohérences Identifiées

### 1. **Bordures et Effets de Glow**

#### ❌ Problème
Les pages utilisent des opacités et styles de bordures **inconsistants**:

| Composant | Bordure | Effet Hover |
|-----------|---------|-------------|
| **LandingPage** | `border-2 border-white/30` | `border-white/50` |
| **RulesPage** | `border border-gray-700/50` | `border-amber-500/50` |
| **LobbyPage** | `border border-purple-500/30` | `border-purple-500/60` |
| **ProfilePage** | `border-2 border-amber-500/20` | `border-amber-500/40` |
| **MainMenu** | `border border-blue-500/30` | `border-blue-500/60` |
| **GameOverModal** | `border-2 border-amber-500/30` | Pas de hover |
| **RulesModal** | `border-2 border-amber-500/30` | `border-amber-500/40` |

#### ✅ Recommandation
**Standardiser sur:**
```css
/* État normal */
border-2 border-{color}-500/30

/* État hover */
hover:border-{color}-500/60
```

---

### 2. **Radius des Cartes**

#### ❌ Problème
Utilisation mixte de `rounded-2xl`, `rounded-3xl`, `rounded-xl`:

| Composant | Radius |
|-----------|--------|
| **LandingPage CTA** | `rounded-2xl` |
| **RulesPage Cards** | `rounded-3xl` |
| **LobbyPage Cards** | `rounded-3xl` |
| **ProfilePage** | `rounded-3xl` |
| **MainMenu Buttons** | `rounded-2xl` |
| **GameOverModal** | `rounded-3xl` |
| **EditSimulationModal** | `rounded-3xl` |

#### ✅ Recommandation
**Standardiser sur:**
- **Modales/Pages principales:** `rounded-3xl` (24px)
- **Boutons/Cards secondaires:** `rounded-2xl` (16px)
- **Petits éléments:** `rounded-xl` (12px)

---

### 3. **Backgrounds avec Glassmorphism**

#### ❌ Problème
Opacités variables pour les backgrounds:

| Composant | Background |
|-----------|-----------|
| **RulesPage Cards** | `from-gray-800/70 to-gray-900/70` |
| **LobbyPage Cards** | `from-purple-900/30 to-purple-800/20` |
| **ProfilePage** | `from-gray-900/95 to-gray-950/98` |
| **GameOverModal** | `from-gray-900/95 to-black/95` |
| **RulesModal** | `from-gray-900/95 to-black/95` |
| **MainMenu Buttons** | `from-blue-900/40 to-blue-800/20` |

#### ✅ Recommandation
**Standardiser sur 3 niveaux:**

1. **Modales/Overlays:** `from-gray-900/95 to-black/95` + `backdrop-blur-xl`
2. **Cartes principales:** `from-{color}-900/40 to-{color}-800/20` + `backdrop-blur-xl`
3. **Cartes secondaires:** `from-gray-800/60 to-gray-900/60` + `backdrop-blur-md`

---

### 4. **Titres et Gradients de Texte**

#### ❌ Problème
Tailles de police et gradients **non uniformes**:

| Composant | Titre | Gradient |
|-----------|-------|----------|
| **LandingPage H1** | `text-7xl sm:text-8xl lg:text-9xl` | `from-amber-400 via-amber-500 to-orange-500` |
| **RulesPage H1** | `text-5xl sm:text-6xl lg:text-7xl` | `from-amber-500 to-orange-500` |
| **LobbyPage H1** | `text-5xl sm:text-6xl lg:text-7xl` | `from-purple-400 to-blue-500` |
| **ProfilePage** | Pas de H1 principal | N/A |
| **GameOverModal H2** | `text-2xl sm:text-3xl` | `from-amber-400 to-orange-500` |
| **MainMenu H2** | `text-4xl sm:text-5xl` | `from-amber-400 to-orange-500` |

#### ✅ Recommandation
**Hiérarchie standardisée:**

```css
/* Hero Titles (Landing only) */
h1.hero: text-7xl sm:text-8xl lg:text-9xl

/* Page Titles */
h1: text-5xl sm:text-6xl lg:text-7xl
bg-gradient-to-r from-amber-400 to-orange-500

/* Section Titles */
h2: text-3xl sm:text-4xl
bg-gradient-to-r from-amber-400 to-orange-500

/* Card Titles */
h3: text-xl sm:text-2xl
text-white (pas de gradient)
```

---

### 5. **Padding et Spacing**

#### ❌ Problème
Padding inconsistant pour les cartes/modales:

| Composant | Padding |
|-----------|---------|
| **RulesPage Cards** | `p-8` |
| **LobbyPage Cards** | `p-8` |
| **ProfilePage** | `p-6 sm:p-8` |
| **GameOverModal** | `p-6` |
| **RulesModal** | `p-4 sm:p-6` |
| **EditSimulationModal** | `p-8` |

#### ✅ Recommandation
**Standardiser sur:**
```css
/* Modales */
p-6 sm:p-8

/* Cartes principales */
p-6

/* Cartes secondaires */
p-4
```

---

### 6. **Transitions et Animations**

#### ❌ Problème
Durées d'animation variables:

| Composant | Transition |
|-----------|-----------|
| **LandingPage** | `duration-300`, `duration-1000`, `duration-3000` |
| **RulesPage** | `duration-500`, `duration-2000` |
| **LobbyPage** | `duration-300` |
| **ProfilePage** | `duration-300` |
| **GameOverModal** | `duration-300` |

#### ✅ Recommandation
**Utiliser les tokens définis:**
```css
/* Hover effects */
transition-all duration-300 /* --duration-medium */

/* Animations */
duration-500 /* --duration-slow */

/* Hero animations */
duration-1000 /* --duration-slowest */
```

---

### 7. **Shadow Effects**

#### ❌ Problème
Ombres portées **incohérentes**:

| Composant | Shadow |
|-----------|--------|
| **LandingPage CTA** | `shadow-2xl` |
| **GameOverModal Buttons** | `shadow-lg hover:shadow-amber-500/50` |
| **MainMenu Buttons** | Pas d'ombre |
| **RulesPage Cards** | Pas d'ombre |

#### ✅ Recommandation
**Standardiser sur:**
```css
/* Boutons primaires */
shadow-lg hover:shadow-{color}-500/50

/* Cartes */
shadow-2xl

/* Modales */
shadow-2xl
```

---

## 📋 Plan d'Action

### Phase 1: Composants de Base
- [x] ~~Créer des classes utilitaires pour bordures standards~~
- [ ] Uniformiser les backgrounds glassmorphism
- [ ] Standardiser les radius

### Phase 2: Typographie
- [ ] Appliquer la hiérarchie de titres partout
- [ ] Uniformiser les gradients de texte

### Phase 3: Interactions
- [ ] Harmoniser les transitions
- [ ] Standardiser les effets hover

### Phase 4: Validation
- [ ] Tester sur toutes les pages
- [ ] Vérifier la cohérence responsive

---

## 🎯 Classes Utilitaires Proposées

```css
/* Ajouter à design-tokens.css ou créer un nouveau fichier utilities.css */

/* === CARDS === */
.card-primary {
  @apply bg-gradient-to-br backdrop-blur-xl border-2 rounded-3xl p-6 transition-all duration-300;
}

.card-secondary {
  @apply bg-gradient-to-br backdrop-blur-md border rounded-2xl p-4 transition-all duration-300;
}

/* === BORDERS === */
.border-glow-gold {
  @apply border-2 border-amber-500/30 hover:border-amber-500/60;
}

.border-glow-emerald {
  @apply border-2 border-emerald-500/30 hover:border-emerald-500/60;
}

.border-glow-purple {
  @apply border-2 border-purple-500/30 hover:border-purple-500/60;
}

.border-glow-blue {
  @apply border-2 border-blue-500/30 hover:border-blue-500/60;
}

/* === BACKGROUNDS === */
.glass-modal {
  @apply bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl;
}

.glass-card {
  @apply bg-white/5 backdrop-blur-md;
}

/* === TEXT GRADIENTS === */
.text-gradient-gold {
  @apply text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500;
}

.text-gradient-emerald {
  @apply text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500;
}

.text-gradient-purple {
  @apply text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500;
}
```

---

## 📝 Notes Importantes

### Points Forts du Design Actuel
✅ Système de design tokens bien structuré
✅ Palette de couleurs cohérente (gold/amber dominant)
✅ Utilisation appropriée de Framer Motion
✅ Responsive design en place
✅ Glassmorphism bien implémenté

### Points à Améliorer
⚠️ Standardisation des bordures et opacités
⚠️ Uniformisation des radius
⚠️ Hiérarchie typographique à renforcer
⚠️ Spacing plus consistant
⚠️ Effets de glow à harmoniser

---

## 🚀 Prochaines Étapes

1. **Créer un fichier de classes utilitaires** (`utilities.css`)
2. **Refactoriser les composants** un par un en utilisant les nouvelles classes
3. **Tester visuellement** chaque page après modification
4. **Documenter les changements** dans un changelog

---

**Fin du rapport**
