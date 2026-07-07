/**
 * Firebase configuration, resolved from Vite env. Kept in its own module — with
 * NO `firebase` import — so `getAuthService()` can decide whether Firebase is
 * even configured without pulling the Firebase SDK into the main bundle. The
 * SDK is loaded lazily (see lazyFirebaseAuthService.ts) only when it is.
 */

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId?: string;
};

export function firebaseConfigFromEnv(): FirebaseConfig | null {
  const env = import.meta.env ?? {};
  const apiKey = env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  if (!apiKey || !authDomain || !projectId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  };
}
