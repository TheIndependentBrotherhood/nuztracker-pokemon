# **NuzTracker – Projet Complet**

## 🎯 **Vue d'ensemble**

**NuzTracker** est une application web interactive permettant aux joueurs de tracker leur progression lors d'une partie Pokémon Nuzlocke. L'application combine cartographie régionale, gestion d'équipe, analyse des types et déduction stratégique pour offrir une expérience complète et visuelle du challenge Nuzlocke.

---

## 📋 **Objectif Global**

NuzTracker offre aux joueurs Pokémon une plateforme centralisée pour :

- **Tracker leurs captures** zone par zone sur une carte interactive
- **Gérer leur équipe** avec analyse détaillée des avantages/faiblesses de types
- **Générer des assets** optimisés pour les streams Twitch/YouTube
- **Explorer le mode Nuzlocke aléatoire** avec système de déduction des types par élimination logique

---

## 🎮 **MVP – Phase 1 : Fondations**

### **1. Tracker de Zones et Cartographie Régionale**

#### **Fonctionnalités Principales :**

- **Sélection de région** : Choisir parmi tous les jeux Pokémon (Gen 1 à Gen 9)
- **Carte visuelle interactive** : Affichage de la région avec zones/routes colorées selon leur statut
- **Système de couleurs (4 états)** :
  - Gris/Non visité : Zone non encore explorée
  - Bleu clair/Visité : Zone visitée mais aucune capture
  - Vert : Zone avec une capture (normal/shiny indifférencié en phase 1)
  - Orange : Zone avec plusieurs captures

#### **Interface Utilisateur :**

- **Layout principal** : Split 60/40 (gauche : map interactive, droite : mini-interface)
- **To-do list des zones** : Barre latérale listant toutes les zones avec statut visuel
  - Checkbox interactive pour marquer une zone comme visitée
  - Bouton rapide pour ajouter une capture
  - Statut : "Non visité", "Visité", "Capture(s)"
- **Mini-map avec highlight** : La zone sélectionnée (via to-do ou clic sur la map) s'illumine sans nécessiter de scroll
- **Barre d'informations** : Résumé des stats (zones visitées, captures totales, taux de capture)

#### **Gestion des Captures par Zone :**

- Pour chaque zone capturée :
  - Sélectionner le Pokémon
  - Nom optionnel (surnom)
  - Niveau (auto-rempli par le Pokédex, modifiable)
  - Genre
  - Nature (optionnel)
- **Stockage** : LocalStorage du navigateur (stockage persistant)

---

### **2. Gestion d'Équipe et Analyse des Types**

#### **Vue d'Équipe :**

- **Affichage de 6 Pokémon maximum** (format horizontal ou vertical au choix)
- **Par Pokémon affiché** :
  - Sprite/Artwork du Pokémon
  - Nom et surnom
  - Types (1 ou 2)
  - Niveau
  - Indicateur visuel des avantages/faiblesses

#### **Analyse des Types – Vue Globale :**

- **Tableau récapitulatif** :
  - Pour chaque type, afficher :
    - Avantages (types contre lesquels l'équipe résiste)
    - Faiblesses (types qui menacent l'équipe)
    - Nombre de Pokémon résistants/vulnérables
  - Code couleur : vert (résistant), rouge (faible)

#### **Analyse des Types – Vue Par Pokémon :**

- **Modal/Page détaillée** au clic sur un Pokémon :
  - Artwork HD du Pokémon
  - Stats complètes (HP, ATK, DEF, SPE ATK, SPE DEF, SPE)
  - Types et efficacités de type :
    - Efficace contre : Pokémon/types de l'équipe adverse (exemple pour Phase 1/2)
    - Faible contre : Types menaçants
  - Capacités connues (le cas échéant)

---

### **3. Assets pour Streamers**

#### **Génération d'Assets :**

L'application propose deux formats d'export pour l'équipe :

**A) Export Image (PNG) :**

- Snapshot statique de l'équipe actuelle
- Affichage des 6 Pokémon en sprite animé (GIF) ou fallback statique (PNG)
- Affichage des types à côté ou non (toggle)
- Dimensions recommandées : 1280x720px pour overlay OBS
- Fond transparent pour intégration facile en stream
- Téléchargement direct en one-click

**B) Export Lien HTML (Option 1 – Export/Import Manuel) :**

**MVP (Phase 1) :**

- Bouton "Export équipe" → Copie un lien URL-encodé avec les données compressées en base64
- Lien shareable : `nuztracker.github.io/share?team=eyJpZCI6IjEyMzQ...`
- Le lien est statique et affiche l'équipe avec mise en page optimisée pour overlay OBS
- **Important** : Chaque export génère un nouveau lien (à copier manuellement quand tu mets à jour)
- Le streamer actualise la page quand tu lui envoies un nouveau lien
- Options de customisation : afficher/masquer types, niveaux, stats (toggles dans l'URL)

**Workflow :**

1. Tu mets à jour ton équipe dans l'app
2. Tu cliques "Exporter lien" → copie le nouveau lien
3. Tu l'envoies au streamer (Discord, chat, etc.)
4. Il actualise la page avec le nouveau lien

**Limitation connue** : Pas de temps réel, nécessite export manuel à chaque changement.

**Future amélioration (Phase 3+)** : Voir ticket "Option 3 – Firebase Realtime" pour synchronisation automatique.

#### **Spécifications Techniques :**

- Fallback à sprite statique si animation non disponible
- Types affichés sous forme d'icônes/badges
- **Encoding URL** : Données compressées avec gzip puis base64 pour l'URL
- Limitation : URL limitée à ~2000 caractères (suffisant pour 6 Pokémon max)

---

## 🔮 **Phase 2 : Capture Avancée et Shiny**

### **Système de Shiny par Zone**

#### **Activation "Chasse par Zone" :**

- Toggle dans les paramètres de partie : "Shiny hunt mode"
- Si activé, possibilité de capturer **shiny ET normal** dans la même zone

#### **Nouveau Système de Couleurs (4 états) :**

- **Gris** : Zone non visitée
- **Bleu** : Zone visitée, aucune capture
- **Vert** : Zone avec capture normale uniquement
- **Doré** : Zone avec capture shiny (avec ou sans capture normale)
- **Rose/Gradient** : Zone avec capture shiny ET normale

#### **Tracking Détaillé :**

- Pour chaque capture : flag "Shiny : oui/non"
- Affichage du nombre de captures par zone : "1 normal + 1 shiny = 2 captures"

---

### **Assets Améliorés**

#### **Variantes :**

- Asset normal : Sprites standard
- Asset shiny : Versions shiny des Pokémon
- Toggle pour afficher l'une ou l'autre

---

## 🎲 **Phase 3 : Mode Nuzlocke Aléatoire (Random Mode)**

### **Concept :**

Le joueur affronte des Pokémon aux types/talents/mouvements **inconnus par défaut**. Chaque information révélée (via attaques testées, statuts vus, etc.) élimine des possibilités de types.

### **Mécanique de Déduction :**

#### **Initialisation :**

- À la création du Pokémon dans le mode random, tous ses attributs sont "?" :
  - Type 1 : Inconnu (19 types possibles)
  - Type 2 : Inconnu ou rien (19 types possibles)
  - Talent : Inconnu (liste d'1-3 talents selon Pokédex)
  - Mouvements : Inconnus (liste complète selon Pokédex)

#### **Ajout d'Indices :**

Le joueur crée des "notes" au combat, via des boutons pour sélectionner le type de l'attaque et résultat (super efficace, neutre, très peu efficace, immunité (attention aux talents)) :

- **"Attaque X a été efficace"** → Élimine les types non faibles à X
- **"Attaque X a été neutre"** → Élimine les types faibles à X
- **"Attaque X n'a pas été efficace"** → Élimine les types résistants à X
- **"Talent révélé : X"** → Affiche le talent
- **"Mouvement utilisé : X"** → Ajoute le mouvement à la liste observée

#### **Calcul Automatique :**

- L'app déduit les **types possibles** en temps réel
- Affichage : "Type 1 possible : [Liste réduite] – 4 options restantes"
- Même système pour les talents/mouvements

#### **Affichage Visuel :**

- Profil du Pokémon random avec barres de probabilité (par type)
- Exemple : "Type feu : 60% probable, Type électrique : 30% probable, Type acier : 10% probable"
- Badge "Identification en cours : 4 types possibles" → Change selon les indices
- L'utilisateur garde la possibilité de sélectionner les types qu'il souhaite pour les types finaux

#### **Sauvegarde des Indices :**

- Timeline des déductions par combat
- Export pour discussion communautaire

---

## 🔧 **Architecture Technique Recommandée**

### **Frontend :**

- **Framework** : Next.js 14+ (App Router) + Déploiement sur GitHub Pages
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **État** : React Context / Zustand
- **Cartographie** : SVG interactive (SVG recommandé pour scalabilité)
- **Stockage** : LocalStorage du navigateur (données persistantes locales)
- **Export/Partage** : Compression gzip + base64 pour encoding URL

### **Assets :**

- **Sprites Pokémon** : API PokeAPI (images CDN distantes)
- **Cartes Régionales** : SVG custom par génération (assets locaux)
- **Génération d'images PNG** : html2canvas (client-side rendering)
- **Liens de partage** : URL-encoded avec paramètres de customisation

---

## 📊 **Modèle de Données (localStorage)**

### **Structure des Entités :**

Les données sont stockées en localStorage en JSON. Voici la structure des objets :

```javascript
// Run (Partie Nuzlocke)
{
  id: string (UUID)
  gameName: string
  region: string
  difficulty: 'easy' | 'normal' | 'hard'
  isShinyHuntMode: boolean
  isRandomMode: boolean
  status: 'in-progress' | 'completed' | 'abandoned'
  zones: Zone[]
  team: Capture[]
  createdAt: number (timestamp)
  updatedAt: number (timestamp)
}

// Zone
{
  id: string
  zoneName: string
  regionArea: string
  status: 'not-visited' | 'visited' | 'captured'
  captures: Capture[]
  updatedAt: number
}

// Capture
{
  id: string
  pokemonId: number (PokeAPI ID)
  pokemonName: string
  nickname: string (optional)
  level: number
  gender: 'male' | 'female' | 'unknown'
  isShiny: boolean
  nature: string (optional)
  createdAt: number
}

// RandomModeClue
{
  pokemonId: string (clé du Pokémon random dans la partie)
  clues: Array<{
    type: 'attackTested' | 'abilityRevealed' | 'moveObserved'
    value: string
    timestamp: number
  }>
}

// SharedTeam (lien de partage via URL)
{
  // Directement encodé en URL, pas de structure stockée
  // Paramètres : ?team=BASE64_COMPRESSED&showTypes=true&showLevels=true&showStats=false
  // Le décodage se fait côté client au chargement de la page
}
```

---

## 🎨 **Workflows Utilisateur**

### **Workflow 1 : Tracker une partie standard**

1. Créer une nouvelle partie (jeu + région + difficulté)
2. Sélectionner la région sur la carte
3. Marquer zones visitées dans la to-do list
4. Ajouter captures par zone
5. Voir l'équipe se former avec analyse des types
6. Exporter asset pour stream si souhaité

### **Workflow 2 : Jouer en mode Shiny Hunt**

1. Créer une partie avec "Shiny Hunt Mode" activé
2. Même workflow que 1, mais possibilité d'ajouter plusieurs captures par zone
3. Visualiser les zones avec shiny via couleurs distinctes

### **Workflow 3 : Challenger en mode Random**

1. Créer une partie en "Random Mode"
2. Au combat, rencontrer un Pokémon avec attributs inconnus
3. Tester des attaques, révéler des infos
4. Ajouter des indices dans l'app
5. Voir l'app déduire progressivement les types/talents/mouvements
6. Débattre en communauté avec export de la timeline des déductions

---

## ✨ **Considérations UX**

### **Responsive Design :**

- Desktop first (cartes complexes)
- Adaptation tablet (split-screen possible)
- Mobile : View simplifiée (liste zones + équipe) avec accès map en modal

### **Accessibilité :**

- Code couleur + icônes pour différenciation sans dépendre uniquement des couleurs
- Contraste suffisant (WCAG AA minimum)
- Navigation au clavier

### **Performance :**

- Lazy loading des cartes régionales (SVG optimisé)
- Pagination de l'équipe si besoin
- Cache des images Pokémon

---

## 🚀 **Étapes de Développement Recommandées**

1. **Setup projet** : Next.js + TypeScript + Tailwind + GitHub Pages deployment
2. **UI de base** : Layout principal, to-do list zones
3. **SVG carte** : Intégration 1-2 régions (Kanto, Galar au choix)
4. **Gestion captures** : Ajout/suppression/édition + localStorage
5. **Équipe + types** : Affichage et analyse
6. **Assets streamers** : Export PNG + Export URL (compression gzip + base64)
7. **Page de partage** : Route `/share` qui décode l'URL et affiche l'équipe
8. **Mode Shiny** : Intégration des couleurs shiny et captures multiples
9. **Mode Random** : Système de déduction avec interface de clues
10. **Évolutions futures** : Import/export JSON, nouvelles régions

---

## 📌 **Priorités d'Implémentation**

- **Priorité 1 (MVP)** : Zones + Captures + Équipe + Types basique + Assets (PNG + lien HTML)
- **Priorité 2** : Shiny hunt mode + Mode random avec déduction
- **Priorité 3** : Évolutions UX, nouvelles régions, import/export de données