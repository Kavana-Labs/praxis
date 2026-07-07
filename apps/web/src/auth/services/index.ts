import type { AuthService } from "../types";
import { firebaseConfigFromEnv } from "./firebaseConfig";
import { LazyFirebaseAuthService } from "./lazyFirebaseAuthService";
import { LocalAuthService } from "./localAuthService";

/**
 * Adapter selection: Firebase when configured, otherwise the browser-local
 * fallback. Resolved once per session.
 *
 * The Firebase path uses a lazy facade that dynamic-imports the Firebase SDK,
 * so when Firebase is NOT configured (dev/test and the static local-first
 * deploy) the SDK is never pulled into the bundle — keeping it off the
 * landing page and every other route.
 */
let instance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (instance) return instance;
  const config = firebaseConfigFromEnv();
  instance = config
    ? new LazyFirebaseAuthService(config)
    : new LocalAuthService();
  return instance;
}

/** Test hook: replace the active service (unit/e2e setups only). */
export function setAuthServiceForTesting(service: AuthService | null): void {
  instance = service;
}
