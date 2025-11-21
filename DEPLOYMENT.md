# Guide de Déploiement - Akong (Jeu du Songo)

Ce guide vous explique comment déployer l'application Akong avec une architecture hybride :
- **Frontend** : Vercel (gratuit)
- **Backend Socket.io** : Fly.io (gratuit jusqu'à 3 machines)

## Architecture

```
┌──────────────┐         ┌──────────────────┐
│              │         │                  │
│   Joueurs    │────────▶│  Vercel (CDN)    │
│              │         │  Frontend React  │
└──────────────┘         └──────────────────┘
                                  │
                                  │ WebSocket
                                  ▼
                         ┌──────────────────┐
                         │   Fly.io         │
                         │   Socket.io      │
                         │   Server         │
                         └──────────────────┘
```

## Prérequis

- Compte GitHub (gratuit)
- Compte Vercel (gratuit) : https://vercel.com
- Compte Fly.io (gratuit) : https://fly.io
- CLI Fly.io installé : https://fly.io/docs/hands-on/install-flyctl/
- Git installé

---

## Partie 1 : Déployer le Backend Socket.io sur Fly.io

### Étape 1.1 : Installer Fly.io CLI

**Windows (PowerShell) :**
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**Mac/Linux :**
```bash
curl -L https://fly.io/install.sh | sh
```

### Étape 1.2 : Se connecter à Fly.io

```bash
flyctl auth login
```

### Étape 1.3 : Créer l'application Fly.io

```bash
# Depuis le dossier racine du projet
flyctl apps create akong-server
```

**Note :** Changez `akong-server` par le nom que vous voulez (doit être unique).

### Étape 1.4 : Modifier fly.toml

Ouvrez `fly.toml` et changez la ligne :
```toml
app = "akong-server"  # Mettez le nom que vous avez choisi
```

### Étape 1.5 : Déployer sur Fly.io

```bash
flyctl deploy
```

Cette commande va :
1. Construire l'image Docker
2. Déployer le serveur Socket.io
3. Vous donner une URL (ex: `https://akong-server.fly.dev`)

### Étape 1.6 : Vérifier le déploiement

```bash
flyctl status
flyctl logs
```

Votre serveur Socket.io est maintenant en ligne ! 🎉
**Notez l'URL** (ex: `https://akong-server.fly.dev`) - vous en aurez besoin.

---

## Partie 2 : Déployer le Frontend sur Vercel

### Étape 2.1 : Pousser le code sur GitHub

Si ce n'est pas déjà fait :

```bash
git add .
git commit -m "feat: Prepare for deployment with Vercel + Fly.io"
git push origin main
```

### Étape 2.2 : Connecter Vercel à GitHub

1. Allez sur https://vercel.com
2. Cliquez sur **"Add New Project"**
3. Importez votre repository GitHub `akong-online`
4. Vercel détectera automatiquement que c'est un projet Vite

### Étape 2.3 : Configurer les variables d'environnement

Dans les paramètres du projet Vercel :

1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez :
   ```
   Name: VITE_SOCKET_SERVER_URL
   Value: https://akong-server.fly.dev
   ```
   (Remplacez par votre URL Fly.io notée à l'étape 1.6)

### Étape 2.4 : Déployer

Cliquez sur **"Deploy"** - Vercel va :
1. Construire votre application
2. La déployer sur son CDN mondial
3. Vous donner une URL (ex: `https://akong-online.vercel.app`)

---

## Partie 3 : Tester le déploiement

### Test du mode multijoueur en ligne

1. Ouvrez votre site Vercel : `https://akong-online.vercel.app`
2. Cliquez sur **"Jeu en ligne"** → **"Créer une salle"**
3. Ouvrez un nouvel onglet (ou un autre appareil)
4. Rejoignez la salle avec le code
5. Jouez ! 🎮

### Vérifier les logs Fly.io

```bash
flyctl logs
```

Vous devriez voir :
```
A user connected: [socket-id]
User created room [room-id]
User joined room [room-id]
```

---

## Commandes Utiles

### Fly.io

```bash
# Voir les logs en temps réel
flyctl logs

# Redémarrer l'app
flyctl apps restart akong-server

# Voir le statut
flyctl status

# Accéder au dashboard web
flyctl dashboard

# Mettre à jour après modifications
flyctl deploy
```

### Vercel

```bash
# Installer la CLI Vercel (optionnel)
npm i -g vercel

# Déployer depuis la ligne de commande
vercel

# Voir les logs
vercel logs
```

---

## Coûts

### Fly.io (Gratuit)
- 3 machines partagées (1x shared-cpu-1x, 256MB RAM)
- 3GB de stockage persistant
- 160GB de transfert sortant/mois

**Suffisant pour :** Plusieurs centaines de parties simultanées

### Vercel (Gratuit)
- 100 GB de bande passante/mois
- Builds illimités
- Déploiements illimités

**Suffisant pour :** Des milliers de visiteurs/mois

---

## Dépannage

### Problème : "Connection refused" dans le jeu

**Solution :**
1. Vérifiez que le serveur Fly.io est actif : `flyctl status`
2. Vérifiez la variable d'environnement sur Vercel
3. Vérifiez les logs Fly.io : `flyctl logs`

### Problème : Le serveur s'arrête automatiquement

**Comportement normal !** Fly.io arrête les machines inactives pour économiser les ressources. Elles redémarrent automatiquement à la première connexion (prend ~2 secondes).

Pour garder le serveur toujours actif (plan payant uniquement) :
```toml
# Dans fly.toml
[http_service]
  auto_stop_machines = false
  min_machines_running = 1
```

### Problème : CORS errors

Vérifiez que `server.js` a :
```javascript
const io = new Server(server, {
  cors: {
    origin: "*",  // Ou spécifiez votre domaine Vercel
    methods: ["GET", "POST"]
  }
});
```

---

## Mises à jour

### Mettre à jour le backend (Fly.io)

```bash
git add server.js
git commit -m "Update server"
git push

# Puis déployer sur Fly.io
flyctl deploy
```

### Mettre à jour le frontend (Vercel)

```bash
git add .
git commit -m "Update frontend"
git push
```

Vercel redéploie **automatiquement** à chaque push sur `main` ! 🚀

---

## Sécurité (Optionnel mais recommandé)

### 1. Ajouter une limite de rate

Dans `server.js` :
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite à 100 requêtes
});

app.use(limiter);
```

### 2. Restreindre les origines CORS

```javascript
const io = new Server(server, {
  cors: {
    origin: "https://akong-online.vercel.app", // Votre domaine uniquement
    methods: ["GET", "POST"]
  }
});
```

---

## Support

- Documentation Fly.io : https://fly.io/docs
- Documentation Vercel : https://vercel.com/docs
- Documentation Socket.io : https://socket.io/docs

---

**Félicitations ! Votre jeu Akong est maintenant en ligne ! 🎉**
