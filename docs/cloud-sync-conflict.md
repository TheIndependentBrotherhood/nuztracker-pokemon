# Synchronisation cloud — gestion des conflits de sauvegarde

> Fonctionnalité livrée dans la branche `copilot/add-firebase-backup-logic`.

---

## Principe général

Quand le sync cloud est activé pour un run, deux sources de vérité peuvent diverger :
- **localStorage** (sauvegarde locale, toujours conservée comme fallback)
- **Firestore** (sauvegarde cloud)

À chaque premier chargement de la page d'un run, l'application compare les `updatedAt` des deux versions et prend la décision appropriée.

```
                  ┌─────────────────────────┐
                  │  Chargement page /run    │
                  └──────────┬──────────────┘
                             │
                    cloudSyncEnabled && Firebase configuré ?
                         │                │
                        Non              Oui
                         │                │
                    (rien)         Fetch cloud run
                                         │
                           ┌─────────────┴─────────────┐
                           │                           │
                   cloud.updatedAt              local.updatedAt
                   > local.updatedAt            > cloud.updatedAt
                           │                           │
               Màj silencieuse du            Affichage du dialog
               localStorage (pull cloud)     SyncConflictDialog
               + rechargement du store
```

---

## Fichiers modifiés / créés

| Fichier | Rôle |
|---|---|
| `src/app/run/RunPageContent.tsx` | Logique de détection + rendu du dialog |
| `src/components/run/SyncConflictDialog.tsx` | Composant dialog UI |
| `src/i18n/translations.ts` | Clés FR/EN pour le dialog |

---

## Détail de la logique (`RunPageContent.tsx`)

### State ajouté

```tsx
const [conflictLocal, setConflictLocal] = useState<Run | null>(null);
const [conflictCloud, setConflictCloud] = useState<Run | null>(null);
```

### Effect de détection (déclenché une seule fois au montage)

```tsx
useEffect(() => {
  if (!mounted || !effectiveRunId || !isFirebaseConfigured()) return;

  const localRun = getRun(effectiveRunId);           // lit le localStorage
  if (!localRun?.cloudSyncEnabled) return;           // sync désactivé → on sort

  getRunFromCloud(effectiveRunId)
    .then((cloudRun) => {
      if (!cloudRun) return;                         // aucun doc cloud → rien

      if (cloudRun.updatedAt > localRun.updatedAt) {
        // Cloud plus récent → màj silencieuse
        saveRun(cloudRun);   // écrit dans localStorage
        loadRuns();          // rafraîchit le store Zustand
      } else if (localRun.updatedAt > cloudRun.updatedAt) {
        // Local plus récent → dialog de conflit
        setConflictLocal(localRun);
        setConflictCloud(cloudRun);
      }
      // Timestamps égaux → rien à faire
    })
    .catch(() => {
      // Cloud inaccessible → on garde le local sans interruption
    });
}, [mounted, effectiveRunId]);
```

> **Dépendances** : `mounted` (hydratation SSR safe) et `effectiveRunId` (id du run). `loadRuns` est intentionnellement exclu des dépendances (commentaire eslint-disable) pour que l'effect ne se redéclenche pas après le rechargement du store.

### Handlers de résolution

```tsx
// L'utilisateur choisit de garder le local → on pousse vers Firestore
const handleKeepLocal = () => {
  if (!conflictLocal) return;
  saveRunToCloud(conflictLocal).catch(() => {}); // fire-and-forget
  setConflictLocal(null);
  setConflictCloud(null);
};

// L'utilisateur choisit le cloud → on écrase le localStorage
const handleKeepCloud = () => {
  if (!conflictCloud) return;
  saveRun(conflictCloud);  // écrit dans localStorage
  loadRuns();              // rafraîchit le store
  setConflictLocal(null);
  setConflictCloud(null);
};
```

### Rendu du dialog (en bas du JSX)

```tsx
{conflictLocal && conflictCloud && (
  <SyncConflictDialog
    localRun={conflictLocal}
    cloudRun={conflictCloud}
    onKeepLocal={handleKeepLocal}
    onKeepCloud={handleKeepCloud}
  />
)}
```

---

## Composant `SyncConflictDialog`

Reçoit en props :

| Prop | Type | Description |
|---|---|---|
| `localRun` | `Run` | Version locale |
| `cloudRun` | `Run` | Version cloud |
| `onKeepLocal` | `() => void` | Callback "garder le local" |
| `onKeepCloud` | `() => void` | Callback "garder le cloud" |

Le dialog :
1. Affiche un **backdrop plein écran** (z-index 2000, bloque l'interaction)
2. Montre **deux cartes côte à côte** (locale en bleu, cloud en vert) avec la date `updatedAt` formatée via `Intl.DateTimeFormat` (locale FR ou EN selon la langue choisie)
3. Propose deux boutons :
   - **Garder le local → écraser le cloud** (`variant="secondary"`)
   - **Garder le cloud → écraser le local** (`variant="primary"`)

---

## Clés de traduction ajoutées (`src/i18n/translations.ts`)

Toutes dans `translations.cloudSync.*` :

| Clé | FR | EN |
|---|---|---|
| `conflictTitle` | ⚠️ Conflit de sauvegarde détecté | ⚠️ Save conflict detected |
| `conflictDescription` | Votre sauvegarde locale est plus récente… | Your local save is more recent… |
| `conflictLocalLabel` | 💾 Sauvegarde locale | 💾 Local save |
| `conflictCloudLabel` | ☁️ Sauvegarde cloud | ☁️ Cloud save |
| `conflictLastUpdated` | Dernière mise à jour : | Last updated: |
| `conflictKeepLocal` | Garder le local → écraser le cloud | Keep local → overwrite cloud |
| `conflictKeepCloud` | Garder le cloud → écraser le local | Keep cloud → overwrite local |

---

## Fonctions Firestore utilisées (`src/lib/firestore.ts`)

```ts
// Lit le run depuis Firestore (retourne null si absent)
getRunFromCloud(runId: string): Promise<Run | null>

// Écrit/met à jour le run dans Firestore
saveRunToCloud(run: Run): Promise<void>
```

---

## Garantie du fallback localStorage

Dans **tous les cas**, le localStorage conserve une copie :

| Scénario | localStorage après | Cloud après |
|---|---|---|
| Cloud plus récent | ✅ Mis à jour avec version cloud | Inchangé |
| Conflit → choix local | Inchangé | ✅ Mis à jour avec version locale |
| Conflit → choix cloud | ✅ Mis à jour avec version cloud | Inchangé |
| Cloud inaccessible | Inchangé | Inchangé |
| Timestamps égaux | Inchangé | Inchangé |
