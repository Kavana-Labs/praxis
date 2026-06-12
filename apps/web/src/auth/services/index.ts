import type { AuthService } from "../types";
import {
  FirebaseAuthService,
  firebaseConfigFromEnv,
} from "./firebaseAuthService";
import { LocalAuthService } from "./localAuthService";

/**
 * Adapter selection: Firebase when configured, otherwise the browser-local
 * fallback. Resolved once per session.
 */
let instance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (instance) return instance;
  const config = firebaseConfigFromEnv();
  instance = config ? new FirebaseAuthService(config) : new LocalAuthService();
  return instance;
}

/** Test hook: replace the active service (unit/e2e setups only). */
export function setAuthServiceForTesting(service: AuthService | null): void {
  instance = service;
}
