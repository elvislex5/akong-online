# Configuration Google OAuth - Guide Complet

Ce guide vous aide à configurer l'authentification Google (OAuth) pour Akông Online.

## ✅ Avantages de Google OAuth

- **Simplicité** : Un seul clic pour se connecter
- **Sécurité** : Pas de mot de passe à mémoriser, utilise le compte Google existant
- **Confiance** : Les utilisateurs font confiance à Google
- **Moins de friction** : Taux d'inscription beaucoup plus élevé

---

## 📋 Prérequis

- Compte Google (gmail)
- Accès à votre projet Supabase
- 20-30 minutes

---

## 🔧 Étape 1 : Google Cloud Console

### 1.1 Créer un projet Google Cloud

1. Allez sur https://console.cloud.google.com
2. Cliquez sur le sélecteur de projet en haut (à côté de "Google Cloud")
3. Cliquez sur **"NEW PROJECT"**
4. Nom du projet : **Akong Online**
5. Cliquez sur **"CREATE"**

### 1.2 Activer l'OAuth Consent Screen

1. Dans le menu de gauche → **APIs & Services** → **OAuth consent screen**
2. Choisissez **"External"** (pour que tout le monde puisse se connecter)
3. Cliquez **"CREATE"**

**Remplissez le formulaire :**
- **App name** : `Akông Online`
- **User support email** : Votre email Gmail
- **App logo** (optionnel) : Uploadez votre favicon ou logo
- **App domain** (optionnel) : `akong-online.com`
- **Authorized domains** :
  ```
  akong-online.com
  supabase.co
  ```
- **Developer contact information** : Votre email

Cliquez **"SAVE AND CONTINUE"**

4. **Scopes** : Ne rien ajouter (les scopes par défaut suffisent : email, profile)
   - Cliquez **"SAVE AND CONTINUE"**

5. **Test users** (optionnel) : Ajoutez votre email pour tester
   - Cliquez **"SAVE AND CONTINUE"**

6. **Summary** : Vérifiez et cliquez **"BACK TO DASHBOARD"**

### 1.3 Créer les identifiants OAuth

1. Menu de gauche → **APIs & Services** → **Credentials**
2. Cliquez sur **"+ CREATE CREDENTIALS"** en haut
3. Sélectionnez **"OAuth client ID"**

**Configuration :**
- **Application type** : `Web application`
- **Name** : `Akông Online - Production`

**Authorized JavaScript origins** :
```
https://akong-online.com
http://localhost:3000
```

**Authorized redirect URIs** - **TRÈS IMPORTANT** :

Vous devez ajouter l'URL de callback Supabase. Pour la trouver :

1. Ouvrez un nouvel onglet
2. Allez sur votre projet Supabase → **Authentication** → **Providers**
3. Cliquez sur **Google** dans la liste
4. Copiez la **"Callback URL (for OAuth)"** affichée en haut
   - Format : `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`

Exemple :
```
https://abcdefghijklmnop.supabase.co/auth/v1/callback
http://localhost:54321/auth/v1/callback
```

⚠️ **Remplacez `YOUR-PROJECT-REF` par votre vrai project ref Supabase**

4. Cliquez **"CREATE"**

### 1.4 Récupérez vos clés

Google va afficher :
- **Client ID** : `123456789012-xxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client secret** : `GOCSPX-xxxxxxxxxxxxxxxxxxxxxx`

**📋 COPIEZ CES DEUX VALEURS** (vous en aurez besoin pour Supabase)

---

## 🔐 Étape 2 : Configuration Supabase

### 2.1 Activer le provider Google

1. Allez sur votre projet Supabase
2. Menu de gauche → **Authentication** → **Providers**
3. Cherchez **Google** dans la liste
4. Cliquez dessus pour l'ouvrir

### 2.2 Configurer les clés

1. Activez le toggle **"Google Enabled"** (en haut à droite)

2. Remplissez les champs :
   - **Client ID (for OAuth)** : Collez le Client ID de Google (étape 1.4)
   - **Client Secret (for OAuth)** : Collez le Client Secret de Google (étape 1.4)

3. **Skip nonce check** : Laissez décoché (sauf si vous avez des problèmes de sécurité)

4. Cliquez **"Save"** en bas

---

## 🚀 Étape 3 : Test Local

### 3.1 Démarrez votre application

```bash
npm run dev
```

### 3.2 Testez la connexion

1. Allez sur http://localhost:3000
2. Vous devriez voir un bouton **"Continuer avec Google"** sur l'écran de connexion
3. Cliquez dessus
4. Vous serez redirigé vers Google
5. Sélectionnez votre compte Google
6. Autorisez l'application
7. Vous serez redirigé vers `/game` automatiquement
8. Votre profil sera créé automatiquement dans Supabase

### 3.3 Vérifiez dans Supabase

1. Allez sur Supabase → **Authentication** → **Users**
2. Vous devriez voir votre utilisateur avec :
   - Email de votre compte Google
   - Provider : `google`
   - Avatar : Photo de profil Google

---

## 🌍 Étape 4 : Déploiement Production

### 4.1 Mettez à jour les URLs autorisées sur Google Cloud

1. Retournez sur Google Cloud Console → **Credentials**
2. Cliquez sur votre OAuth client ID
3. Ajoutez votre URL de production :

**Authorized JavaScript origins** :
```
https://akong-online.com
https://www.akong-online.com
```

**Authorized redirect URIs** :
```
https://[VOTRE-PROJECT-REF].supabase.co/auth/v1/callback
```

4. Cliquez **"SAVE"**

### 4.2 Déployez votre code

```bash
git add .
git commit -m "feat: Add Google OAuth authentication"
git push
```

Vercel déploiera automatiquement.

### 4.3 Testez en production

1. Allez sur https://akong-online.com
2. Cliquez sur "Continuer avec Google"
3. Vérifiez que la connexion fonctionne

---

## 🐛 Dépannage

### Erreur : "redirect_uri_mismatch"

**Problème** : L'URL de redirection n'est pas autorisée.

**Solution** :
1. Vérifiez que l'URL de callback Supabase est exactement la même dans Google Cloud Console
2. Format : `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Pas d'espace avant/après
4. Attendez 5 minutes après modification (propagation)

### Erreur : "This app isn't verified"

**C'est normal en développement !**

**Solution temporaire** :
- Cliquez sur "Advanced" (Paramètres avancés)
- Cliquez sur "Go to Akông Online (unsafe)" (Accéder à Akông Online)

**Solution permanente** (après le lancement) :
1. Soumettez votre app pour vérification Google (gratuit)
2. Google vérifiera en 2-4 semaines
3. Documentation : https://support.google.com/cloud/answer/7454865

### Erreur : "Access blocked: This app's request is invalid"

**Problème** : OAuth consent screen mal configuré.

**Solution** :
1. Retournez sur Google Cloud Console → OAuth consent screen
2. Vérifiez que "Publishing status" est "In production" ou "Testing"
3. Si "Testing", ajoutez votre email dans "Test users"

### L'utilisateur est redirigé mais pas connecté

**Problème** : Le profil n'a pas été créé.

**Solution** :
1. Vérifiez que le trigger `handle_new_user()` existe dans Supabase
2. SQL Editor → Exécutez :
   ```sql
   SELECT * FROM profiles WHERE email = 'votre-email-google@gmail.com';
   ```
3. Si vide, le trigger ne fonctionne pas → Relancez la migration `001_initial_schema.sql`

---

## 📊 Métriques attendues

Avec Google OAuth, vous devriez voir :
- **+200% de taux d'inscription** (moins de friction)
- **-50% d'abandon** sur la page d'inscription
- **0 problème de mot de passe oublié**

---

## 🔒 Sécurité

### Bonnes pratiques

✅ **Client Secret** : Ne jamais l'exposer côté client (il est utilisé uniquement par Supabase)
✅ **HTTPS obligatoire** : Google OAuth ne fonctionne qu'en HTTPS (production)
✅ **Callback URL** : Doit être exactement celle de Supabase
✅ **Scopes minimaux** : On demande uniquement email + profile (pas d'accès Gmail/Drive)

### Données récupérées par Google OAuth

Google partage avec nous :
- ✅ Nom complet
- ✅ Email
- ✅ Photo de profil
- ❌ Pas d'accès aux emails Gmail
- ❌ Pas d'accès à Drive/Calendar/etc.

---

## 📚 Ressources

- [Documentation Supabase OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console](https://console.cloud.google.com)
- [Guide OAuth 2.0 Google](https://developers.google.com/identity/protocols/oauth2)

---

**Questions ? Problèmes ?**
Vérifiez les logs dans :
- Browser DevTools → Console (erreurs JavaScript)
- Supabase → Logs → Auth Logs (erreurs backend)
- Google Cloud Console → APIs & Services → Credentials (configuration OAuth)
