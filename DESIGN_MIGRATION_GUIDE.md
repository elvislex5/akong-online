# Guide de Migration du Design - AKÔNG

Ce guide explique comment migrer progressivement les composants existants vers les nouvelles classes utilitaires standardisées.

---

## 📚 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Classes Utilitaires](#classes-utilitaires)
3. [Migration par Composant](#migration-par-composant)
4. [Exemples Avant/Après](#exemples-avantaprès)
5. [Checklist](#checklist)

---

## Vue d'ensemble

### Fichiers Créés
- ✅ `styles/utilities.css` - Classes utilitaires standardisées
- ✅ `DESIGN_HARMONIZATION_REPORT.md` - Rapport d'analyse
- ✅ `DESIGN_MIGRATION_GUIDE.md` - Ce guide

### Objectifs
- 🎯 Standardiser les bordures et glows
- 🎯 Uniformiser les backgrounds glassmorphism
- 🎯 Harmoniser la typographie
- 🎯 Consistent spacing et padding
- 🎯 Effets hover uniformes

---

## Classes Utilitaires

### 1. Cartes et Conteneurs

```css
/* Au lieu de */
className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8"

/* Utiliser */
className="modal-container border-glow-gold"
```

**Classes disponibles:**
- `.card-primary` - Carte principale avec tous les styles
- `.card-secondary` - Carte secondaire plus légère
- `.card-game-mode` - Carte pour les modes de jeu
- `.modal-container` - Conteneur de modale standardisé
- `.modal-header` - Header de modale
- `.modal-content` - Contenu scrollable de modale

### 2. Bordures avec Glow

```css
/* Au lieu de */
className="border-2 border-amber-500/30 hover:border-amber-500/60"

/* Utiliser */
className="border-glow-gold"
```

**Classes disponibles:**
- `.border-glow-gold` - Bordure gold/amber (principal)
- `.border-glow-emerald` - Bordure emerald (succès)
- `.border-glow-purple` - Bordure purple (spécial)
- `.border-glow-blue` - Bordure blue (info)
- `.border-glow-cyan` - Bordure cyan
- `.border-glow-red` - Bordure red (erreur)

### 3. Backgrounds

```css
/* Au lieu de */
className="bg-gradient-to-br from-amber-900/40 to-orange-800/20 backdrop-blur-xl"

/* Utiliser */
className="glass-gold"
```

**Classes disponibles:**
- `.glass-modal` - Background de modale
- `.glass-card` - Background de carte
- `.glass-dark` - Background sombre
- `.glass-gold` - Background coloré gold
- `.glass-emerald` - Background coloré emerald
- `.glass-purple` - Background coloré purple
- `.glass-blue` - Background coloré blue

### 4. Gradients de Texte

```css
/* Au lieu de */
className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500"

/* Utiliser */
className="text-gradient-gold"
```

**Classes disponibles:**
- `.text-gradient-gold` - Gradient gold (titres principaux)
- `.text-gradient-emerald` - Gradient emerald
- `.text-gradient-purple` - Gradient purple
- `.text-gradient-blue` - Gradient blue
- `.text-gradient-red` - Gradient red

### 5. Hiérarchie Typographique

```css
/* Au lieu de */
className="text-5xl sm:text-6xl lg:text-7xl font-black"

/* Utiliser */
className="title-page text-gradient-gold"
```

**Classes disponibles:**
- `.title-hero` - Titre héro (Landing Page uniquement)
- `.title-page` - Titre de page (H1)
- `.title-section` - Titre de section (H2)
- `.title-card` - Titre de carte (H3)
- `.title-small` - Petit titre (H4)

### 6. Boutons

```css
/* Au lieu de */
className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-amber-500/50"

/* Utiliser */
className="btn-primary"
```

**Classes disponibles:**
- `.btn-primary` - Bouton principal (gold/amber)
- `.btn-secondary` - Bouton secondaire (ghost)
- `.btn-emerald` - Bouton emerald
- `.btn-purple` - Bouton purple
- `.btn-danger` - Bouton danger (red)
- `.btn-sm` - Modificateur: petit
- `.btn-lg` - Modificateur: grand

### 7. Effets Hover

```css
/* Au lieu de */
className="hover:scale-105 transition-transform duration-300"

/* Utiliser */
className="hover-scale"
```

**Classes disponibles:**
- `.hover-scale` - Scale 1.05
- `.hover-scale-sm` - Scale 1.02
- `.hover-lift` - Translate Y -1
- `.hover-glow-gold` - Glow gold
- `.hover-glow-emerald` - Glow emerald
- `.hover-glow-purple` - Glow purple

### 8. Overlays

```css
/* Au lieu de */
className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none rounded-3xl"

/* Utiliser */
className="glow-overlay-gold"
```

**Classes disponibles:**
- `.glow-overlay-gold` - Overlay subtil gold
- `.glow-overlay-emerald` - Overlay subtil emerald
- `.glow-overlay-purple` - Overlay subtil purple
- `.hover-overlay-gold` - Overlay hover gold
- `.hover-overlay-emerald` - Overlay hover emerald
- `.hover-overlay-purple` - Overlay hover purple
- `.hover-overlay-blue` - Overlay hover blue

---

## Migration par Composant

### Priorité 1 (Impact élevé)

#### 1. GameOverModal.tsx
**Avant:**
```tsx
className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl shadow-2xl"
```

**Après:**
```tsx
className="modal-container border-glow-gold"
```

**Changements:**
- Utiliser `.modal-container` pour le conteneur
- Utiliser `.modal-content` pour le contenu scrollable
- Utiliser `.btn-primary` pour le bouton "REJOUER"
- Utiliser `.btn-secondary` pour le bouton "MENU"

#### 2. RulesModal.tsx
**Avant:**
```tsx
className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl"
```

**Après:**
```tsx
className="modal-container border-glow-gold"
```

**Changements:**
- Utiliser `.modal-header` pour le header
- Utiliser `.modal-content` pour le contenu
- Utiliser `.title-section` pour "Règles du Songo"

#### 3. EditSimulationModal.tsx
**Avant:**
```tsx
className="glass-dark neon-border-emerald p-8 rounded-3xl"
```

**Après:**
```tsx
className="modal-container border-glow-emerald p-6 sm:p-8"
```

**Changements:**
- Uniformiser le padding avec `.p-6 sm:p-8`
- Utiliser `.btn-emerald` pour "Valider"
- Utiliser `.btn-secondary` pour "Annuler"

#### 4. MainMenuRevolutionary.tsx
**Avant:**
```tsx
className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 backdrop-blur-xl border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-6"
```

**Après:**
```tsx
className="card-game-mode glass-blue border-glow-blue group"
```

**Changements:**
- Remplacer chaque carte de mode de jeu
- Utiliser `.title-section` pour "Choisissez votre mode"
- Utiliser `.title-card` pour les titres de cartes
- Ajouter `.group` pour les effets hover

#### 5. ProfilePage.tsx
**Avant:**
```tsx
className="bg-gradient-to-br from-gray-900/95 to-gray-950/98"
```

**Après:**
```tsx
className="glass-modal"
```

**Changements:**
- Simplifier le background principal
- Utiliser `.btn-primary` pour "Sauvegarder"
- Utiliser `.btn-secondary` pour "Annuler"

### Priorité 2 (Impact moyen)

#### 6. LobbyPageRevolutionary.tsx
**Changements:**
- Utiliser `.title-page text-gradient-purple` pour le titre
- Utiliser `.card-game-mode glass-purple border-glow-purple` pour les cartes
- Uniformiser les boutons avec `.btn-purple` et `.btn-secondary`

#### 7. RulesPageImmersive.tsx
**Changements:**
- Utiliser `.title-page` pour "Règles du Songo"
- Utiliser `.card-secondary` pour les cartes de règles
- Ajouter `.hover-scale-sm` aux cartes

#### 8. LandingPageRevolutionary.tsx
**Changements:**
- Garder les animations existantes
- Utiliser `.title-hero text-gradient-gold` pour "AKÔNG"
- Utiliser `.btn-primary btn-lg` pour "Commencer"
- Utiliser `.btn-secondary btn-lg` pour "Découvrir"

### Priorité 3 (Impact faible)

#### 9. SimulationControlPanel.tsx
**Changements:**
- Uniformiser les boutons avec les classes `.btn-*`
- Utiliser `.text-gradient-purple` pour le titre "LABO"

#### 10. BoardRevolutionary.tsx
**Changements:**
- Garder la structure actuelle (complexe)
- Optimiser uniquement les parties critiques

---

## Exemples Avant/Après

### Exemple 1: Modal Simple

**Avant:**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
  <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden relative flex flex-col">
    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none rounded-3xl"></div>

    <div className="flex-shrink-0 bg-black/60 backdrop-blur-xl p-4 sm:p-6 border-b border-amber-500/30 flex justify-between items-center z-10">
      <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
        Titre
      </h2>
      <button className="...">Fermer</button>
    </div>

    <div className="relative z-10 p-4 sm:p-6 overflow-y-auto flex-1">
      Contenu
    </div>
  </div>
</div>
```

**Après:**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
  <div className="modal-container border-glow-gold max-w-2xl">
    <div className="glow-overlay-gold"></div>

    <div className="modal-header border-glow-gold">
      <h2 className="title-card text-gradient-gold">
        Titre
      </h2>
      <button className="btn-secondary btn-sm">Fermer</button>
    </div>

    <div className="modal-content">
      Contenu
    </div>
  </div>
</div>
```

### Exemple 2: Carte de Mode de Jeu

**Avant:**
```tsx
<button className="group relative bg-gradient-to-br from-blue-900/40 to-blue-800/20 backdrop-blur-xl border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-6 transition-all duration-300 overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
  <div className="relative">
    <h3 className="font-bold text-white text-xl mb-2">2 Joueurs Local</h3>
    <p className="text-blue-200 text-sm">Jouez sur le même écran</p>
  </div>
</button>
```

**Après:**
```tsx
<button className="card-game-mode glass-blue border-glow-blue group hover-scale-sm">
  <div className="hover-overlay-blue" />
  <div className="relative">
    <h3 className="title-card">2 Joueurs Local</h3>
    <p className="text-blue-200 text-sm">Jouez sur le même écran</p>
  </div>
</button>
```

### Exemple 3: Bouton d'Action

**Avant:**
```tsx
<button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-bold text-white transition-all duration-300 shadow-lg hover:shadow-amber-500/50">
  Valider
</button>
```

**Après:**
```tsx
<button className="btn-primary">
  Valider
</button>
```

---

## Checklist

### Phase 1: Modales et Popups
- [ ] GameOverModal.tsx
- [ ] RulesModal.tsx
- [ ] EditSimulationModal.tsx
- [ ] SurrenderModal.tsx

### Phase 2: Menus
- [ ] MainMenuRevolutionary.tsx
- [ ] SimulationControlPanel.tsx

### Phase 3: Pages
- [ ] ProfilePage.tsx
- [ ] LobbyPageRevolutionary.tsx
- [ ] RulesPageImmersive.tsx
- [ ] LandingPageRevolutionary.tsx

### Phase 4: Tests
- [ ] Tester chaque composant migré
- [ ] Vérifier les breakpoints responsive
- [ ] Valider les effets hover
- [ ] Tester les animations

### Phase 5: Documentation
- [ ] Mettre à jour CLAUDE.md
- [ ] Documenter les nouvelles conventions
- [ ] Créer des exemples de code

---

## Notes Importantes

### ⚠️ Points d'Attention

1. **Ne pas tout migrer d'un coup** - Migrer composant par composant
2. **Tester après chaque changement** - Vérifier visuellement et fonctionnellement
3. **Garder les animations complexes** - Ne pas simplifier les animations existantes de Framer Motion
4. **Respecter la hiérarchie** - Utiliser les bonnes classes de titre selon le niveau
5. **Mobile first** - Toujours vérifier sur mobile après migration

### ✅ Avantages de la Migration

- **Moins de code** - Classes réutilisables
- **Maintenance facile** - Un seul endroit pour modifier les styles
- **Cohérence** - Design uniforme sur toute l'application
- **Performance** - Classes CSS optimisées
- **Lisibilité** - Code JSX plus propre

### 🔄 Process de Migration Recommandé

1. **Lire ce guide**
2. **Choisir un composant**
3. **Identifier les patterns** à remplacer
4. **Appliquer les nouvelles classes**
5. **Tester visuellement**
6. **Commit le changement**
7. **Passer au composant suivant**

---

**Bonne migration! 🚀**
