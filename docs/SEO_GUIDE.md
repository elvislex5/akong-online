# Guide SEO - Akông Online

Ce guide liste toutes les actions à réaliser pour améliorer le référencement de votre site.

## ✅ Actions déjà effectuées

1. **Métadonnées HTML complètes** (`index.html`)
   - Title optimisé avec mots-clés
   - Meta description descriptive
   - Meta keywords pertinents
   - Open Graph tags (Facebook, LinkedIn)
   - Twitter Card tags
   - Canonical URL

2. **Fichiers SEO de base**
   - `robots.txt` créé
   - `sitemap.xml` créé

## 🎯 Actions prioritaires à faire maintenant

### 1. Google Search Console (CRITIQUE - À FAIRE EN PREMIER)

**⚠️ IMPORTANT :** Votre domaine utilise les DNS de Vercel, pas Hostinger !

**OPTION 1 - Méthode Fichier HTML (RECOMMANDÉE - Plus simple)**

1. Allez sur https://search.google.com/search-console
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Ajouter une propriété"
4. Choisissez **"Préfixe d'URL"** (option de droite)
5. Entrez `https://akong-online.com`
6. Sélectionnez la méthode **"Fichier HTML"**
7. Google vous donnera un fichier comme `google1234567890abcdef.html` à télécharger
8. Placez ce fichier dans votre dossier `/public` (côté de `sitemap.xml`)
9. Déployez sur Vercel
10. Vérifiez l'accès : `https://akong-online.com/google1234567890abcdef.html`
11. Retournez sur Search Console et cliquez **"Valider"**
12. Une fois validé, utilisez "Inspection de l'URL" → Tapez `https://akong-online.com` → "Demander une indexation"

**OPTION 2 - Méthode DNS TXT (via Vercel)**

1. Allez sur https://search.google.com/search-console
2. Choisissez **"Domaine"** (option de gauche)
3. Entrez `akong-online.com`
4. Google vous donnera un code TXT comme : `google-site-verification=abc123xyz...`
5. Allez sur **Vercel Dashboard** → Votre projet → **Settings** → **Domains** → `akong-online.com`
6. Scrollez jusqu'à **"DNS Records"**
7. Cliquez **"Add"** :
   - Type: `TXT`
   - Name: `@` (ou laissez vide)
   - Value: `[le code donné par Google]`
   - TTL: Auto
8. Attendez 5-10 minutes (propagation DNS)
9. Retournez sur Search Console et cliquez **"Valider"**
10. Une fois validé, utilisez "Inspection de l'URL" pour demander l'indexation

**Délai attendu :** 24-72h pour l'indexation initiale

### 2. Créer une image Open Graph

**Fichier à créer :** `/public/og-image.png`

**Spécifications :**
- Dimensions : 1200x630 pixels (ratio 1.91:1)
- Format : PNG ou JPG
- Poids : < 300 KB
- Contenu suggéré :
  - Logo "AKÔNG"
  - Sous-titre : "Jeu de Songo Traditionnel"
  - Visuel du plateau de jeu
  - Couleurs : Or/Ambre sur fond sombre (cohérent avec votre design)

**Outils gratuits :**
- Canva (https://canva.com)
- Figma (https://figma.com)
- Photopea (https://photopea.com) - Photoshop gratuit en ligne

**Test :** Une fois créée, testez l'apparence sur :
- Facebook Debugger : https://developers.facebook.com/tools/debug/
- LinkedIn Post Inspector : https://www.linkedin.com/post-inspector/

### 3. Vérifier le fichier favicon.ico

Actuellement référencé dans `index.html` mais non vérifié.

**À faire :**
- Vérifiez que `/public/favicon.ico` existe
- Si absent, créez-le (32x32 pixels minimum, idéalement multi-résolution)
- Ajoutez aussi les variantes modernes :
  ```html
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  ```

## 🚀 Actions de promotion (Après Google Search Console)

### 1. Réseaux sociaux
- [ ] Poster sur LinkedIn avec le lien
- [ ] Partager sur Facebook
- [ ] Partager sur Twitter/X
- [ ] Groupes Facebook de développeurs africains
- [ ] Communautés de jeux de stratégie

### 2. Backlinks (Liens entrants)
- [ ] Lister le site sur Product Hunt
- [ ] Soumettre à des directories de jeux en ligne
- [ ] Contacter des blogs sur les jeux africains
- [ ] Wikipedia : Ajouter le lien dans l'article "Songo (jeu)"

### 3. Contenu (Améliore le référencement naturel)
- [ ] Créer une page blog avec articles sur :
  - L'histoire du Songo/Akông
  - Stratégies de jeu
  - Variantes régionales
  - Tutoriels pour débutants
- [ ] Ajouter des vidéos (YouTube) de parties commentées

## 📊 Outils de suivi SEO

1. **Google Search Console** (gratuit)
   - Suivi de l'indexation
   - Performances de recherche
   - Erreurs techniques

2. **Google Analytics 4** (gratuit)
   - Trafic du site
   - Sources de visiteurs
   - Comportement utilisateur

3. **SEO Browser Extensions**
   - META SEO Inspector (Chrome)
   - SEO Minion (Chrome/Firefox)

## 🎯 Objectifs de référencement

### Court terme (1-2 mois)
- [x] Indexation sur Google
- [ ] Apparaître sur "Akông online"
- [ ] Apparaître sur "Songo en ligne"
- [ ] Apparaître sur "jeu africain en ligne"

### Moyen terme (3-6 mois)
- [ ] Top 10 sur "jeu de Songo"
- [ ] Top 5 sur "Akông"
- [ ] Référencement sur "jeux africains"

### Long terme (6-12 mois)
- [ ] Position #1 sur "Akông"
- [ ] Position #1 sur "Songo en ligne"
- [ ] Suggestions automatiques sur Google

## 🔧 Optimisations techniques supplémentaires

### Performance (Impact SEO)
- [ ] Activer la compression GZIP/Brotli sur Vercel
- [ ] Optimiser les images (WebP, lazy loading)
- [ ] Minifier JS/CSS (Vite le fait déjà)
- [ ] Activer le cache HTTP

### Schema.org (Rich Snippets)
Ajouter des données structurées JSON-LD dans `index.html` :

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Akông Online",
  "description": "Jeu de stratégie traditionnel africain (Songo MPEM) en ligne",
  "url": "https://akong-online.com",
  "genre": ["Strategy", "Board Game"],
  "gamePlatform": "Web Browser",
  "playMode": "MultiPlayer",
  "numberOfPlayers": {
    "@type": "QuantitativeValue",
    "minValue": 1,
    "maxValue": 2
  }
}
</script>
```

### Accessibilité (Améliore le SEO)
- [ ] Ajouter des attributs `alt` sur toutes les images
- [ ] Vérifier le contraste des couleurs (WCAG AA)
- [ ] Tester avec un lecteur d'écran
- [ ] Ajouter des landmarks ARIA

## 📈 Suivi des progrès

| Date | Action | Résultat |
|------|--------|----------|
| 2025-12-30 | Métadonnées ajoutées | En attente |
| 2025-12-30 | robots.txt + sitemap.xml créés | En attente |
| ... | Google Search Console | ... |

---

**Questions ? Besoin d'aide ?**
Consultez la documentation officielle :
- Google Search Console : https://support.google.com/webmasters
- Open Graph Protocol : https://ogp.me/
- Schema.org : https://schema.org/docs/gs.html
