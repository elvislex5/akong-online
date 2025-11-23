<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Akong - Le Jeu du Songo

Un jeu de stratégie africain traditionnel (variante Songo MPEM) avec distribution de graines et captures.

## Modes de Jeu

- 🎮 **2 Joueurs (Local)** - Sur le même écran
- 🤖 **vs IA** - Affrontez l'ordinateur (3 niveaux de difficulté)
- 🌐 **Multijoueur en ligne** - Jouez avec un ami à distance via Socket.io
- ⚡ **Simulation/Labo** - Configurez et testez des positions personnalisées

## Développement Local

**Prérequis :** Node.js (v20 ou supérieur)

### Frontend (Application React)

```bash
# Installer les dépendances
npm install

# Copier le fichier d'exemple et configurer les variables
cp .env.example .env.local
# Éditez .env.local si nécessaire

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur **http://localhost:3000**

### Backend (Serveur Socket.io pour le multijoueur)

Dans un terminal séparé :

```bash
# Démarrer le serveur Socket.io
node server.js
```

Le serveur Socket.io sera sur **http://localhost:3002**

## Déploiement en Production

📘 **Guide complet de déploiement :** [DEPLOYMENT.md](./DEPLOYMENT.md)

Architecture recommandée :
- **Frontend** : Vercel (gratuit)
- **Backend** : Fly.io (gratuit)

## Technologies

- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS
- **Backend** : Node.js, Socket.io, Express
- **IA** : Minimax avec élagage alpha-beta
- **Audio** : Web Audio API

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Guide pour développeurs (architecture du code)
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guide de déploiement détaillé
