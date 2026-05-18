# Guide de mise en place Firebase

Ce document explique comment configurer un projet Firebase pour activer le **sync cloud** dans NuzTracker.

---

## 1. Créer un projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com/)
2. Cliquer **"Ajouter un projet"**
3. Donner un nom (ex. `nuztracker-prod`), désactiver Google Analytics si non nécessaire
4. Cliquer **"Créer le projet"**

---

## 2. Activer l'authentification anonyme

L'app utilise **Anonymous Auth** : chaque visiteur reçoit un UID unique sans créer de compte.

1. Dans la console Firebase → **Build → Authentication**
2. Cliquer **"Commencer"**
3. Onglet **"Sign-in method"** → activer **Anonyme**
4. Sauvegarder

---

## 3. Créer la base Firestore

1. Dans la console → **Build → Firestore Database**
2. Cliquer **"Créer une base de données"**
3. Choisir le mode **Production** (règles sécurisées, voir section suivante)
4. Choisir la région la plus proche (ex. `eur3` pour l'Europe)

### Règles de sécurité Firestore

Les runs sont stockés sous `/runs/{runId}`. Coller ces règles dans l'onglet **Règles** :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /runs/{runId} {
      // Lecture : le document doit appartenir à l'utilisateur connecté
      allow read: if request.auth != null
                  && resource.data.ownerUid == request.auth.uid;

      // Écriture : l'utilisateur doit être connecté,
      // ne peut écrire que son propre UID dans ownerUid
      // et ne peut pas modifier l'ownerUid d'un document existant
      allow create: if request.auth != null
                    && request.resource.data.ownerUid == request.auth.uid;

      allow update: if request.auth != null
                    && resource.data.ownerUid == request.auth.uid
                    && request.resource.data.ownerUid == request.auth.uid;

      allow delete: if request.auth != null
                    && resource.data.ownerUid == request.auth.uid;
    }
  }
}
```

> **Note** : si tu veux aussi permettre le partage par lien (lecture publique par runId), remplace la règle `read` par `allow read: if true;` — les runs ne contiennent aucune donnée personnelle sensible.

---

## 4. Récupérer les clés de configuration

1. Dans la console → icône ⚙️ → **Paramètres du projet**
2. Onglet **"Général"** → section **"Vos applications"**
3. Cliquer **"</>  Web"**, enregistrer l'app (nom au choix), pas besoin de Firebase Hosting
4. Firebase affiche un objet `firebaseConfig` :

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "mon-projet.firebaseapp.com",
  projectId: "mon-projet",
  storageBucket: "mon-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

---

## 5. Configurer les variables d'environnement

Créer un fichier **`.env.local`** à la racine du projet (jamais commité) :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mon-projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mon-projet
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mon-projet.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...
```

> Les variables **`NEXT_PUBLIC_`** sont exposées côté client (navigateur). C'est voulu : les clés Firebase Web sont publiques par conception — la sécurité repose sur les **Règles Firestore** ci-dessus.

---

## 6. Vérifier que ça marche en local

```bash
npm run dev
```

Ouvrir un run → le bouton **"☁️ Sync cloud"** doit être cliquable (et non grisé/désactivé).

Si le bouton est grisé, `isFirebaseConfigured()` (`src/lib/firebase.ts`) retourne `false` : vérifier que les 3 variables minimales sont présentes dans `.env.local` :
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

---

## 7. Déploiement (GitHub Pages / Vercel / autre)

Les variables doivent être renseignées dans l'interface de déploiement :

### GitHub Pages (via Actions)

Dans **Settings → Secrets and variables → Actions → Variables** (pas Secrets, car `NEXT_PUBLIC_` doit être inlinée à la compilation), ajouter chaque variable :

| Nom de la variable | Valeur |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `mon-projet.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mon-projet` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `mon-projet.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:123456789:web:abc...` |

Puis dans le workflow `.github/workflows/*.yml`, ajouter dans l'étape de build :

```yaml
env:
  NEXT_PUBLIC_FIREBASE_API_KEY: ${{ vars.NEXT_PUBLIC_FIREBASE_API_KEY }}
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ vars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ vars.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ vars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ vars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
  NEXT_PUBLIC_FIREBASE_APP_ID: ${{ vars.NEXT_PUBLIC_FIREBASE_APP_ID }}
```

### Vercel

Dans **Settings → Environment Variables**, ajouter les 6 variables avec la valeur correspondante.

---

## 8. Architecture résumée

```
Navigateur
  │
  ├── src/lib/firebase.ts   → initialise l'app Firebase (singleton)
  │                            isFirebaseConfigured() = les 3 vars minimales présentes
  │
  ├── src/lib/auth.ts       → signInAnonymously() → retourne un UID stable par session
  │
  └── src/lib/firestore.ts  → CRUD Firestore
        saveRunToCloud(run)       → /runs/{run.id}  (upsert)
        getRunFromCloud(runId)    → lit /runs/{runId}
        deleteRunFromCloud(runId) → supprime /runs/{runId}
```

Les données d'un run sont stockées dans un seul document Firestore sous `/runs/{runId}` (document complet, pas de sous-collections).

---

## Sans Firebase

Si les variables d'environnement sont absentes, `isFirebaseConfigured()` retourne `false` :
- Le bouton sync est grisé et non cliquable
- Aucune erreur n'est levée
- L'app fonctionne entièrement en mode **localStorage uniquement**

Firebase est donc **optionnel** : l'app est pleinement utilisable sans lui.
