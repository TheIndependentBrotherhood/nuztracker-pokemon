import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirebaseApp } from "./firebase";

let _uid: string | null = null;

/**
 * Returns the current anonymous user UID, signing in anonymously if needed.
 * The UID is cached in memory for the lifetime of the page.
 */
export async function getOrCreateAnonUser(): Promise<string> {
  if (_uid) return _uid;

  const auth = getAuth(getFirebaseApp());

  // Reuse an existing session if present
  if (auth.currentUser) {
    _uid = auth.currentUser.uid;
    return _uid;
  }

  const credential = await signInAnonymously(auth);
  _uid = credential.user.uid;
  return _uid;
}
