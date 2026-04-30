# 🎨 Ticket : Redesign UI/UX - Rendre le site sobre et moderne

**Status** : À faire  
**Priorité** : Haute  
**Effort** : XL (2-3 sprints)

---

## 📋 Objectif

Transformer le NuzTracker d'une interface basique gris/jaune en une application moderne, sobre et élégante avec une meilleure hiérarchie visuelle, une expérience utilisateur fluide et une esthétique cohérente.

---

## 🎯 Principes de Design

- **Minimaliste** : Supprimer le superflu, garder l'essentiel visible
- **Modern** : Utiliser des couleurs subtiles, dégradés doux, espacements généreux
- **Cohérent** : System de design unifié (couleurs, typographie, composants)
- **Accessible** : Bonne lisibilité, contraste suffisant, navigation intuitive
- **Mobile-first** : Responsive sur tous les appareils

---

## 🎨 Palette Coloriée

### Couleurs Primaires

- **Bleu profond** : `#1e293b` (fond principal)
- **Bleu foncé** : `#0f172a` (arrière-plan secondaire)
- **Bleu accentué** : `#3b82f6` (CTA, hover states)
- **Bleu léger** : `#e0e7ff` (accents subtils)

### Couleurs Secondaires

- **Indigo** : `#6366f1` (variante d'accentuation)
- **Cyan** : `#06b6d4` (accents supplémentaires)

### Couleurs Utilitaires

- **Blanc** : `#ffffff` (texte principal)
- **Gris clair** : `#f1f5f9` (bordures, séparations légères)
- **Gris moyen** : `#94a3b8` (texte secondaire)
- **Gris foncé** : `#475569` (texte tertiaire)
- **Succès** : `#10b981` (status vert)
- **Danger** : `#ef4444` (delete, danger)

### Dégradés

- **Fond header** : `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`
- **CTA gradient** : `linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)`

---

## 📐 Système de Design

### Typographie

- **Font principale** : Inter, sans-serif (ou Geist comme Next.js)
- **Tailles** :
  - H1 : 32px, font-weight: 700
  - H2 : 24px, font-weight: 600
  - H3 : 18px, font-weight: 600
  - Body : 14px, font-weight: 400
  - Small : 12px, font-weight: 400
  - Label : 12px, font-weight: 500, uppercase, letter-spacing: 0.5px

### Espacements (8px grid)

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### Coins arrondis

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px

### Ombres

- sm: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- md: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`
- lg: `0 10px 15px -3px rgba(0, 0, 0, 0.15)`
- xl: `0 20px 25px -5px rgba(0, 0, 0, 0.2)`

---

## 🔧 Améliorations par Zone

### 1️⃣ **Header/Navigation**

**Problème** : Manque de clarté, pas de navigation cohérente

**Solutions** :

- [ ] Header avec gradient subtil (bleu foncé)
- [ ] Logo + titre centré ou à gauche
- [ ] Navigation sticky en haut
- [ ] Zone utilisateur (future)
- [ ] Ombrage doux sous le header

**Composant** : Créer `Header.tsx`

---

### 2️⃣ **Page d'accueil (Home)**

**Problème** : Bouton seul au milieu, pas d'explication

**Solutions** :

- [ ] Hero section avec explication courte du service
- [ ] Titre accrocheur + sous-titre descriptif
- [ ] CTA primaire (New Run) en gradient bleu
- [ ] Brève présentation en cards (3-4 features)
- [ ] Meilleure hiérarchie visuelle
- [ ] Possibilité de voir les runs récents en bas

**Layout** :

```
┌─────────────────────────────┐
│        Header               │
├─────────────────────────────┤
│    Hero Section             │
│  "NuzTracker - Suivi de     │
│  votre aventure Pokémon"    │
│  [➕ New Run]               │
├─────────────────────────────┤
│  Features (3-4 cards)       │
├─────────────────────────────┤
│  Recent Runs                │
└─────────────────────────────┘
```

**Composants** : `HeroSection.tsx`, `FeatureCard.tsx`

---

### 3️⃣ **Modale de Création de Run**

**Problème** : Formulaire basique, peu invitant

**Solutions** :

- [ ] Meilleure typographie (titre plus grand, plus clair)
- [ ] Champs avec meilleur focus state (bordure bleu clair + ombre)
- [ ] Select region avec icons/emojis Pokemon
- [ ] Checkboxes redesignées (custom style avec bleu)
- [ ] Boutons CTA/Cancel avec meilleur contraste
- [ ] Petite animation d'entrée (fade + slide)
- [ ] Fond modal semi-transparent (plus clair)

**Couleurs** :

- Fond : `#1e293b`
- Bordure : `#334155` (gris clair)
- Focus : `#3b82f6` avec une ombre bleu légère
- CTA : Gradient bleu → cyan

---

### 4️⃣ **Liste des Runs**

**Problème** : Cards basiques, peu visuelles

**Solutions** :

- [ ] Cards avec bordures subtiles et hover effect
- [ ] Icônes Pokemon simplifiées au lieu de simples emojis
- [ ] Meilleur affichage des stats (layout en grid subtle)
- [ ] Zone de statut en haut à droite (badge)
- [ ] Meilleur hover : changement de couleur + léger déplacement
- [ ] Petites images Pokemon si possible (via API)

**Card Layout** :

```
┌─────────────────────────────────┐
│ 🎮 FireRed Nuzlocke    [Active] │
│                                 │
│ 🗺 5/12 zones | 🔴 3 captures   │
│ ✨ Shiny Hunt | 🎲 Randomizer   │
│                                 │
│ Created: 2 days ago | [Delete] │
└─────────────────────────────────┘
```

---

### 5️⃣ **Page Run (Main View)**

**Problème** : Split view basique, pas de hiérarchie

**Solutions** :

- [ ] Header de run avec breadcrumbs
- [ ] Layout : Gauche (Map/Zones) + Droite (Infos + Team)
- [ ] Zone list avec meilleur style (highlight au hover/select)
- [ ] Statut zones en couleur (grey, blue, green, orange)
- [ ] Team section avec cartes Pokémon améliorées
- [ ] Progress bar pour zones visitées/capturées
- [ ] Stats dashboard en haut (summary)

---

### 6️⃣ **Zone List Sidebar**

**Problème** : Liste plain text, pas de visual feedback

**Solutions** :

- [ ] Zones avec bouton status (checkbox ou toggle)
- [ ] Icône status à gauche (gris, bleu, vert, orange)
- [ ] Nombre de captures par zone
- [ ] Hover effect subtil
- [ ] Bouton "Add capture" discret
- [ ] Section collapsible par région si nécessaire

---

### 7️⃣ **Modale Add Capture**

**Problème** : Formulaire basique

**Solutions** :

- [ ] Meilleur titre (zone name + icône)
- [ ] Recherche Pokémon avec autocomplete amélioré
- [ ] Affichage sprite Pokémon lors de la sélection
- [ ] Champs mieux organisés (2 colonnes sur desktop)
- [ ] Toggle shiny avec icône ✨
- [ ] Focus states cohérents avec header
- [ ] Boutons d'action clairs

---

### 8️⃣ **Pokemon Card & Detail Modal**

**Problème** : Affichage basique, pas assez d'informations visuelles

**Solutions** :

- [ ] Sprite Pokémon plus grand et centré
- [ ] Types avec couleurs réelles Pokemon (rouge feu, bleu eau, etc.)
- [ ] Stats bar avec dégradé subtil
- [ ] Meilleur affichage du niveau et du statut
- [ ] Information sur le genre avec symbole cohérent
- [ ] Icône shiny ✨ si applicable
- [ ] Meilleur modal de détail avec shadow et animation

**Card Layout** :

```
┌──────────────────────┐
│  ✨ Pikachu #25     │
│  [Sprite 80x80]      │
│  Lv.15 | Nickname    │
│  ⚡ ✨               │
└──────────────────────┘
```

---

## 🛠️ Tâches Détaillées

### Phase 1 : Fondations (Semaine 1)

- [ ] Créer système de couleurs Tailwind config
- [ ] Créer composant `Header.tsx`
- [ ] Créer composant `Card.tsx` (réutilisable)
- [ ] Créer composant `Button.tsx` (primaire, secondaire, danger)
- [ ] Créer composant `Input.tsx` avec meilleur focus state
- [ ] Créer composant `Select.tsx` avec meilleur style

### Phase 2 : Pages principales (Semaine 2)

- [ ] Redesigner home page (HeroSection + FeatureCards)
- [ ] Redesigner CreateRunModal
- [ ] Redesigner RunList
- [ ] Améliorer transitions/animations

### Phase 3 : Détails (Semaine 3)

- [ ] Redesigner Page Run
- [ ] Redesigner Zone List Sidebar
- [ ] Redesigner Add Capture Modal
- [ ] Améliorer Pokemon Cards & Detail Modal
- [ ] Tester responsive (mobile, tablet, desktop)
- [ ] Polish & animations finales

---

## 📱 Responsive Design

- **Mobile** : < 768px
  - Layout single column
  - Navigation mobile-friendly
  - Cards empilées
- **Tablet** : 768px - 1024px
  - Layout 2 colonnes
  - Sidebar réduite
- **Desktop** : > 1024px
  - Layout complet
  - Sidebar fixe

---

## ✨ Animations & Micro-interactions

- Transition au click : 200ms ease-in-out
- Hover effects : 150ms ease
- Modal fade-in : 300ms ease-out
- Cards lift on hover : translateY(-2px)
- Fade + slide on mount : 250ms ease-out

---

## 🎯 Checklist de Validation

- [ ] Cohérence des couleurs partout
- [ ] Tous les composants responsive
- [ ] Pas de texte en dur (i18n si multilangue)
- [ ] Contraste WCAG AA minimum
- [ ] Animations fluides (60fps)
- [ ] Pas de layout shift (cumulative layout shift = 0)
- [ ] Performance bundle CSS optimisée
- [ ] Test sur Chrome, Firefox, Safari, Mobile

---

## 📚 Références Inspirantes

- Vercel Dashboard
- Linear (app.linear.app)
- Figma design tokens
- Radix UI color system

---

**Created** : 30/04/2026  
**Updated** : 30/04/2026
