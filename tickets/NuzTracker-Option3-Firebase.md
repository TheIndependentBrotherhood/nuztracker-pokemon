# **NuzTracker – Ticket Phase 3+ : Option 3 – Firebase Realtime Sync**

## 🎯 **Objectif**

Implémenter une synchronisation en temps réel des équipes streamers via Firebase Realtime Database, permettant un lien stable (`/team/:runId`) qui se met à jour automatiquement sans export/import manuel.

---

## 📋 **Contexte**

**MVP (Phase 1)** utilise l'Option 1 : export/import manuel avec lien URL-encodé.

**Phase 3+** : Upgrade vers la vraie synchronisation temps réel pour une meilleure UX streaming.

---

## ✨ **Fonctionnalités**

### **A) Architecture Firebase**

- **Firebase Realtime Database** (gratuit jusqu'à 100 connexions simultanées)
- Structure : `/runs/{runId}/team/{pokemonSlot}`
- Authentification anonyme (pas de compte utilisateur requis)
- Rules sécurisées : chaque utilisateur peut voir/modifier son propre run

### **B) Lien Stable**

- **Avant** : `nuztracker.github.io/share?team=BASE64_LONG_DATA` (change à chaque update)
- **Après** : `nuztracker.github.io/team/abc123xyz` (UUID court stable)
- Le streamer garde le même lien toute la partie
- Mises à jour en temps réel (~500ms latence max)

### **C) Workflow**

1. **Créer une partie** → Génère UUID court (ex: `abc123xyz`)
2. **Ouvrir page streamer** → `nuztracker.github.io/team/abc123xyz`
3. **Le streamer partage le lien** (ne change jamais)
4. **Mises à jour en temps réel** → Pas besoin de rafraîchir

### **D) Synchronisation en arrière-plan**

- L'app principale fait `POST` vers Firebase à chaque changement
- La page streamer écoute les changements en temps réel
- Pas de polling, juste des websockets Firebase
- Fonctionne en offline (sync quand retour online)

---

## 🔧 **Implémentation Technique**

### **Setup Firebase**

```typescript
// firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { signInAnonymously, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "nuztracker.firebaseapp.com",
  databaseURL: "https://nuztracker.firebaseio.com",
  projectId: "nuztracker",
  storageBucket: "nuztracker.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Auth anonyme
await signInAnonymously(auth);

export { db, auth };
```

### **Structure Données Firebase**

```
/runs/{runId}/
  ├── team/
  │   ├── 0/
  │   │   ├── pokemonId: 25
  │   │   ├── pokemonName: "Pikachu"
  │   │   ├── nickname: "Sparky"
  │   │   ├── level: 42
  │   │   ├── gender: "male"
  │   │   ├── isShiny: false
  │   │   └── updatedAt: 1714412345678
  │   ├── 1/ { ... }
  │   └── ...
  ├── metadata/
  │   ├── gameName: "Pokémon Red"
  │   ├── region: "Kanto"
  │   ├── createdAt: 1714412345678
  │   └── updatedAt: 1714412345678
```

### **Sync depuis l'app principale**

```typescript
// hooks/useFirebaseSync.ts
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";

export function useSyncTeamToFirebase(runId: string) {
  const syncTeam = async (team: Capture[]) => {
    try {
      await set(ref(db, `runs/${runId}/team`), {
        ...team.reduce((acc, pokemon, idx) => {
          acc[idx] = {
            pokemonId: pokemon.pokemonId,
            pokemonName: pokemon.pokemonName,
            nickname: pokemon.nickname,
            level: pokemon.level,
            gender: pokemon.gender,
            isShiny: pokemon.isShiny,
            updatedAt: Date.now(),
          };
          return acc;
        }, {}),
      });
    } catch (error) {
      console.error("Firebase sync failed:", error);
    }
  };

  return { syncTeam };
}
```

### **Écoute côté streamer**

```typescript
// hooks/useTeamListener.ts
import { ref, onValue } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

export function useTeamListener(runId: string) {
  const [team, setTeam] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const teamRef = ref(db, `runs/${runId}/team`);

    const unsubscribe = onValue(
      teamRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Convertir objet en array
          const teamArray = Object.values(data) as Capture[];
          setTeam(teamArray);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to team:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [runId]);

  return { team, loading };
}
```

### **Page Streamer**

```typescript
// app/team/[runId]/page.tsx
'use client';

import { useTeamListener } from '@/hooks/useTeamListener';
import TeamDisplay from '@/components/TeamDisplay';

export default function TeamPage({ params }: { params: { runId: string } }) {
  const { team, loading } = useTeamListener(params.runId);

  if (loading) return <div>Chargement...</div>;
  if (!team.length) return <div>Équipe non trouvée</div>;

  return <TeamDisplay team={team} readOnly={true} />;
}
```

---

## 🔐 **Sécurité Firebase**

### **Règles recommandées**

```json
{
  "rules": {
    "runs": {
      "$runId": {
        ".read": true,
        ".write": "auth != null",
        "team": {
          ".validate": "newData.hasChildren(['0', '1', '2', '3', '4', '5']) && newData.numChildren() <= 6"
        }
      }
    }
  }
}
```

---

## 💾 **Cohabitation avec localStorage**

- **localStorage** : Données locales (zones, captures pour l'app principale)
- **Firebase** : Uniquement l'équipe actuelle (pour streaming)
- Sync unidirectionnelle : localStorage → Firebase (quand équipe change)
- Lisible par tout le monde : Firebase → streamer (lecture publique)

---

## 📊 **Coûts Firebase (gratuit tier)**

- **Realtime Database** : 1 GB stockage, 100 connexions simultanées
- **Suffisant pour** : Jusqu'à 1000+ utilisateurs en même temps (6 pokémons = ~2KB par run)
- **Upgrade** : Modèle pay-as-you-go si dépassement

---

## 🚀 **Étapes d'implémentation**

1. **Setup Firebase projet** : Créer compte/projet Firebase
2. **Intégration dans Next.js** : Installer packages, config
3. **Hooks Realtime** : `useSyncTeamToFirebase`, `useTeamListener`
4. **Page `/team/:runId`** : Créer la route streamer
5. **Mise à jour MVP** : Ajouter bouton "Générer lien streamer"
6. **Tests** : Vérifier sync temps réel

---

## ⚖️ **Comparaison Option 1 vs Option 3**

| Aspect            | Option 1 (URL-encoded) | Option 3 (Firebase)   |
| ----------------- | ---------------------- | --------------------- |
| **Lien**          | Change à chaque update | Stable (UUID)         |
| **Temps réel**    | ❌ Refresh manuel      | ✅ Automatique        |
| **Export manuel** | ✅ À chaque fois       | ❌ Une seule fois     |
| **Backend**       | ❌ Non                 | ✅ Firebase (gratuit) |
| **Complexité**    | ⭐ Simple              | ⭐⭐ Moyen            |
| **MVP friendly**  | ✅ Oui                 | ❌ Phase 3+           |

---

## 📌 **Notes**

- **Pas obligatoire pour MVP** : Option 1 fonctionne parfaitement pour commencer
- **Facile à ajouter après** : Peut être implémenté sans refactoring majeur
- **Zéro serveur** : Firebase est serverless (pas de gestion d'infra)
- **Migration douce** : Les deux options peuvent cohabiter

---

## 🎯 **Priorité**

- **MVP** : Option 1 uniquement
- **Phase 3** : Évaluer temps réel nécessaire, implémenter Option 3 si demande utilisateur

---

Ticket prêt pour implémentation future ! 🚀
