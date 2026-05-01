# 🚀 Checklist de Déploiement - Akông

## ✅ Ce qui vient d'être fait

### 1. Push vers GitHub ✅
```bash
git add .
git commit -m "feat: Optimize mobile game layout for landscape mode"
git push origin main
```

**Status :** ✅ Complété (commit `16b7264`)

---

## 📋 Prochaines Étapes

### 2. Frontend (Vercel) - Déploiement Automatique

**Status :** 🔄 En cours (automatique)

Vercel détecte automatiquement les push sur `main` et déclenche un build.

**Pour vérifier :**
1. Aller sur https://vercel.com/dashboard
2. Trouver votre projet `akong-online`
3. Vérifier l'état du déploiement

**Temps estimé :** 2-3 minutes

**Ce qui sera déployé :**
- ✅ Optimisations mobile (spacing, taille texte)
- ✅ Media query CSS pour mode paysage
- ✅ Nouveau design révolutionnaire (si pas déjà fait)
- ✅ PWA manifest et icons
- ✅ Nouveaux composants (BoardRevolutionary, etc.)

---

### 3. Backend (Fly.io) - À REDÉPLOYER ⚠️

**Status :** ⚠️ **REQUIS**

**Pourquoi ?** Le fichier `server.js` a été modifié avec :
- Nouvelles fonctions de présence (`setUserOnline`, `setUserOffline`)
- Support pour le système d'invitations
- Améliorations de la gestion des rooms

**Comment redéployer :**

#### Option A - Via Fly.io CLI (Recommandé)
```bash
# 1. S'assurer d'être dans le dossier du projet
cd D:\akong-online

# 2. Vérifier la connexion Fly.io
flyctl auth whoami

# 3. Redéployer
flyctl deploy

# 4. Vérifier le statut
flyctl status

# 5. Voir les logs en temps réel
flyctl logs
```

**Temps estimé :** 3-5 minutes

#### Option B - Via Dashboard Fly.io
1. Aller sur https://fly.io/dashboard
2. Trouver votre app `akong-server` (ou le nom que vous avez donné)
3. Aller dans l'onglet "Deployments"
4. Cliquer sur "Deploy" → "Deploy from GitHub"

---

## 🔍 Vérifications Post-Déploiement

### ✅ Frontend (Vercel)

**Test 1 - Desktop :**
```
1. Ouvrir https://VOTRE_APP.vercel.app
2. Vérifier que la page d'accueil charge
3. Lancer un match local
4. Vérifier que le design révolutionnaire est présent
```

**Test 2 - Mobile Portrait :**
```
1. Ouvrir sur mobile ou DevTools (F12 → Toggle device)
2. Sélectionner iPhone 12
3. Vérifier que tout s'affiche correctement
4. Lancer un match
5. Vérifier que les noms de joueurs sont lisibles
```

**Test 3 - Mobile Paysage (CRITIQUE) :**
```
1. Même chose que Test 2
2. Tourner l'écran en mode paysage (clic sur icône rotation)
3. ✅ VÉRIFIER: Tout le plateau est visible SANS SCROLL
4. ✅ VÉRIFIER: Les boutons ne se chevauchent pas
5. ✅ VÉRIFIER: Les noms des joueurs sont compacts
```

### ✅ Backend (Fly.io)

**Test 1 - Santé du serveur :**
```bash
curl https://VOTRE_APP.fly.dev/health

# Réponse attendue:
# { "status": "ok", "database": "connected", "timestamp": "..." }
```

**Test 2 - WebSocket Connection :**
```
1. Ouvrir https://VOTRE_APP.vercel.app
2. Ouvrir DevTools Console (F12)
3. Créer une partie en ligne
4. Vérifier dans les logs: "[onlineManager] Connected to server"
```

**Test 3 - Multiplayer Complet :**
```
1. Créer une partie en ligne (Joueur 1)
2. Noter le code de la room
3. Ouvrir un autre onglet/appareil
4. Rejoindre avec le code (Joueur 2)
5. Jouer quelques coups
6. Vérifier la synchronisation
```

---

## ⚠️ Points d'Attention

### 1. Variables d'Environnement

**Vercel :**
Vérifier que ces variables sont configurées :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SOCKET_SERVER_URL` (doit pointer vers Fly.io)

**Fly.io :**
Vérifier via `flyctl secrets list` :
- `PORT=3002`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### 2. CORS

Si vous rencontrez des erreurs CORS, vérifier dans `server.js` ligne ~30 :
```javascript
const io = new Server(server, {
  cors: {
    origin: "*",  // OU votre domaine Vercel spécifique
    methods: ["GET", "POST"]
  }
});
```

### 3. Migrations Supabase

**Nouvelles migrations détectées :**
- `003_social_features.sql` - Système d'invitations
- `004_board_skins.sql` - Skins de plateau

**À exécuter dans Supabase SQL Editor si pas déjà fait :**
```sql
-- Exécuter dans l'ordre:
-- 1. 003_social_features.sql
-- 2. 004_board_skins.sql
```

---

## 📊 Résumé du Déploiement

| Composant | Action | Status | Durée |
|-----------|--------|--------|-------|
| GitHub | Push ✅ | ✅ Complété | 1 min |
| Vercel (Frontend) | Auto-deploy 🔄 | 🔄 En cours | 2-3 min |
| Fly.io (Backend) | Manual deploy ⚠️ | ⏳ À faire | 3-5 min |
| Supabase (Migrations) | SQL Editor ⚠️ | ⏳ Vérifier | 2 min |

**Temps total estimé :** ~10 minutes

---

## 🐛 Troubleshooting

### Problème : Vercel build échoue
**Solution :**
```bash
# Tester le build localement
npm run build

# Si ça échoue, vérifier les erreurs TypeScript
npm run build 2>&1 | grep "error"
```

### Problème : Fly.io deploy échoue
**Solution :**
```bash
# Vérifier les logs
flyctl logs

# Rebuild avec verbose
flyctl deploy --verbose

# Vérifier fly.toml
cat fly.toml
```

### Problème : Backend ne se connecte pas
**Solution :**
1. Vérifier les secrets : `flyctl secrets list`
2. Vérifier les logs : `flyctl logs`
3. Tester la connexion : `curl https://VOTRE_APP.fly.dev/health`

### Problème : WebSocket ne se connecte pas
**Solution :**
1. Vérifier `VITE_SOCKET_SERVER_URL` dans Vercel
2. Vérifier CORS dans `server.js`
3. Tester manuellement : `wscat -c wss://VOTRE_APP.fly.dev`

---

## 📝 Notes Importantes

### Ce qui a changé dans ce déploiement :

**Frontend :**
- 🎨 Optimisations mobile paysage (~140px économisés)
- 🎨 Design révolutionnaire avec glassmorphism
- 📱 PWA installable avec manifest.json
- 🎮 BoardRevolutionary avec skins

**Backend :**
- 👥 Système de présence utilisateur
- 💌 Support invitations
- 🔄 Améliorations reconnexion

**Base de données :**
- 📊 Nouvelles tables : user_presence, game_invitations
- 🎨 Table board_skins

---

## ✅ Commande Rapide (Tout en Une)

Si vous êtes pressé :
```bash
# Frontend (automatique via Vercel)
# Rien à faire, push déjà fait !

# Backend
flyctl deploy && flyctl status && flyctl logs --recent
```

---

**Date :** 27 Novembre 2025
**Commit :** `16b7264`
**Version :** Mobile Optimized v1.0
