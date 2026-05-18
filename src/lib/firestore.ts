import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { getFirebaseApp } from "./firebase";
import { Run } from "./types";

function db() {
  return getFirestore(getFirebaseApp());
}

/** Upserts the full run document to Firestore under /runs/{runId}. */
export async function saveRunToCloud(run: Run): Promise<void> {
  await setDoc(doc(db(), "runs", run.id), run);
}

/**
 * Fetches a run by ID from Firestore.
 * Returns null if the document does not exist.
 */
export async function getRunFromCloud(runId: string): Promise<Run | null> {
  const snapshot = await getDoc(doc(db(), "runs", runId));
  if (!snapshot.exists()) return null;
  return snapshot.data() as Run;
}

/** Removes the run document from Firestore. */
export async function deleteRunFromCloud(runId: string): Promise<void> {
  await deleteDoc(doc(db(), "runs", runId));
}
