# 🧪 Instructions de Test - PWA & Performance

## 🚀 Lancer le Test

### 1. Build de Production
```bash
npm run build
```

### 2. Preview en Mode Production
```bash
npm run preview
```

L'application sera accessible sur **http://localhost:4173**

---

## 📱 Tests à Effectuer

### ✅ Test 1: PWA Manifest

**Chrome/Edge DevTools:**
1. Ouvrir **DevTools** (F12)
2. Onglet **Application**
3. Section **Manifest**

**Vérifications:**
- ✅ Nom: "Akông - Le Jeu du Songo"
- ✅ Short name: "Akông"
- ✅ Theme color: #FFD700 (or)
- ✅ Background: #000000 (noir)
- ✅ Display: standalone
- ✅ Icônes: 4 icônes (192x192, 512x512, maskable)

---

### ✅ Test 2: Service Worker

**Chrome/Edge DevTools:**
1. Onglet **Application**
2. Section **Service Workers**

**Vérifications:**
- ✅ Status: **activated and is running**
- ✅ Source: `/sw.js`
- ✅ Update on reload: Coché

**Test Offline:**
1. Onglet **Network**
2. Cocher **Offline**
3. Rafraîchir la page (F5)
4. ✅ La page doit toujours charger !

---

### ✅ Test 3: Installation PWA

**Desktop (Chrome/Edge):**
1. Regarder la barre d'adresse
2. ✅ Icône d'installation (➕ ou 🖥️)
3. Cliquer pour installer
4. ✅ Fenêtre standalone sans barre de navigation

**Ou:**
1. Attendre 3 secondes
2. ✅ Popup d'installation en bas à droite
3. Cliquer "Installer"

**Android (Chrome):**
1. Menu (⋮) → **Installer l'application**
2. ✅ Icône ajoutée à l'écran d'accueil
3. Ouvrir l'icône
4. ✅ Mode fullscreen sans Chrome UI

**iOS (Safari):**
1. Bouton Partager (⬆️)
2. **Ajouter à l'écran d'accueil**
3. ✅ Icône ajoutée
4. Ouvrir l'icône
5. ✅ Mode standalone

---

### ✅ Test 4: Lazy Loading

**Chrome DevTools:**
1. Onglet **Network**
2. Filtre **JS**
3. Rafraîchir la page

**Vérifications au chargement initial:**
- ✅ `index-*.js` (~242KB) - Bundle principal
- ✅ `react-vendor-*.js` (~45KB) - React
- ✅ **PAS** tous les autres bundles

**Navigation vers /game:**
- ✅ `App-*.js` se charge maintenant (~86KB)

**Navigation vers /rules:**
- ✅ `RulesPageImmersive-*.js` se charge maintenant (~20KB)

---

### ✅ Test 5: Code Splitting

**Bundles générés** (vérifier dans dist/assets/):
- ✅ `react-vendor-*.js` (React, React-DOM, Router)
- ✅ `game-logic-*.js` (songoLogic, AI)
- ✅ `ui-components-*.js` (Framer Motion, Toast, Lucide)
- ✅ `three-vendor-*.js` (Three.js, React Three Fiber)

**Tailles attendues:**
- Bundle principal: ~240KB
- React vendor: ~45KB
- UI components: ~148KB
- Three vendor: ~182KB
- Game logic: ~7KB

---

### ✅ Test 6: Images Optimisées

**Vérifier les tailles:**
```bash
# Voir les tailles originales
ls -lh public/*.original.png

# Voir les tailles optimisées
ls -lh public/*.png
```

**Vérifications:**
- ✅ akong.png: ~468KB (était 768KB)
- ✅ multiplayer-icon.png: ~230KB (était 605KB)
- ✅ online-icon.png: ~187KB (était 627KB)

**Test visuel:**
1. Ouvrir l'application
2. ✅ Les images sont toujours nettes
3. ✅ Pas de dégradation visible

---

### ✅ Test 7: Performance (Lighthouse)

**Chrome DevTools:**
1. Onglet **Lighthouse**
2. Mode: **Desktop** ou **Mobile**
3. Catégories: **Performance**, **PWA**, **Best Practices**
4. Cliquer **Analyze page load**

**Scores attendus:**
- ✅ Performance: **≥ 90**
- ✅ PWA: **100**
- ✅ Accessibility: **≥ 85**
- ✅ Best Practices: **≥ 90**
- ✅ SEO: **≥ 85**

**Métriques Web Vitals:**
- ✅ FCP (First Contentful Paint): **< 1.8s**
- ✅ LCP (Largest Contentful Paint): **< 2.5s**
- ✅ TBT (Total Blocking Time): **< 300ms**
- ✅ CLS (Cumulative Layout Shift): **< 0.1**
- ✅ SI (Speed Index): **< 3.4s**

---

### ✅ Test 8: Cache Strategy

**Chrome DevTools:**
1. Onglet **Application**
2. Section **Cache Storage**
3. Ouvrir **workbox-runtime-https://localhost:4173/**

**Vérifications:**
- ✅ Images cachées
- ✅ Fonts Google cachées
- ✅ Tailwind CDN caché
- ✅ Assets statiques cachés

**Test:**
1. Charger la page normalement
2. Ouvrir DevTools → Network
3. Rafraîchir (Ctrl+R)
4. ✅ Beaucoup de ressources en **"(memory cache)"** ou **"(disk cache)"**

---

### ✅ Test 9: Install Prompt

**Desktop:**
1. Ouvrir l'application (mode non-installé)
2. Attendre **3 secondes**
3. ✅ Popup apparaît en bas à droite
4. Vérifier le design:
   - ✅ Icône Download dorée
   - ✅ Titre "Installer Akông"
   - ✅ Description claire
   - ✅ Boutons "Installer" et "Plus tard"
5. Cliquer **"Plus tard"**
6. ✅ Popup disparaît
7. Rafraîchir la page
8. ✅ Popup ne réapparaît pas (localStorage)

**Réinitialiser le prompt:**
```javascript
// Dans la console DevTools
localStorage.removeItem('pwa-prompt-dismissed');
```

---

### ✅ Test 10: Mode Standalone

**Après installation:**
1. Ouvrir l'app installée
2. ✅ Pas de barre d'adresse
3. ✅ Pas de boutons navigateur
4. ✅ Fenêtre dédiée
5. ✅ Icône dans la barre des tâches (Windows/Mac)
6. ✅ Alt+Tab montre "Akông"

---

## 📊 Checklist Complète

### PWA
- [ ] Manifest configuré
- [ ] Service Worker actif
- [ ] Installable (Desktop)
- [ ] Installable (Android)
- [ ] Installable (iOS)
- [ ] Mode offline fonctionne
- [ ] Mode standalone fonctionne
- [ ] Install prompt s'affiche
- [ ] Icônes correctes

### Performance
- [ ] Lazy loading actif
- [ ] Code splitting configuré
- [ ] Images optimisées
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse PWA = 100
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1

### Cache
- [ ] Cache Storage créé
- [ ] Images cachées
- [ ] Fonts cachées
- [ ] CDN caché
- [ ] Assets statiques cachés

---

## 🐛 Problèmes Courants

### "Service Worker not found"
**Solution:** Build avant de tester
```bash
npm run build
npm run preview
```

### "Install prompt ne s'affiche pas"
**Raisons possibles:**
1. Déjà installé → Désinstaller d'abord
2. Dismissed récemment → Vider localStorage
3. Navigateur pas compatible → Utiliser Chrome/Edge
4. Pas en HTTPS → OK en localhost

### "Lighthouse PWA score < 100"
**Vérifier:**
- [ ] Service Worker registered
- [ ] Manifest.json valide
- [ ] Icônes 192x192 et 512x512
- [ ] Theme color défini
- [ ] Display: standalone

---

## ✅ Tout est bon ?

Si tous les tests passent:
1. 🎉 **PWA complète et fonctionnelle**
2. ⚡ **Performance optimisée**
3. 📱 **Installable sur tous devices**
4. 🌐 **Fonctionne hors ligne**
5. 🚀 **Prêt pour production**

---

## 📝 Notes

- Les tests doivent être faits en **mode production** (build)
- Le mode dev (`npm run dev`) ne teste pas le PWA correctement
- Pour tester offline, utiliser DevTools, pas couper le WiFi
- iOS Safari nécessite manuel "Add to Home Screen"

---

**Bon tests ! 🧪**
