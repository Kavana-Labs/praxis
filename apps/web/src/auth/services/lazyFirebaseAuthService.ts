import type { AuthResult, AuthService, AuthUser } from "../types";
import type { FirebaseConfig } from "./firebaseConfig";

/**
 * A synchronous facade over the Firebase adapter that loads the Firebase SDK
 * lazily. `getAuthService()` needs to return an AuthService synchronously (the
 * AuthProvider reads it during render), but Firebase is a large dependency we
 * don't want in the initial/landing bundle. This facade satisfies the sync
 * interface immediately, dynamically imports the real adapter in the
 * background, and forwards everything to it once loaded. Until then
 * `getCurrentUser()` reports "signed out", which is the correct pre-restore
 * state anyway (the AuthProvider keeps `status: "loading"` until `ready()`).
 */
export class LazyFirebaseAuthService implements AuthService {
  readonly kind = "firebase" as const;

  private real: AuthService | null = null;
  private readonly realPromise: Promise<AuthService>;
  private current: AuthUser | null = null;
  private readonly listeners = new Set<(user: AuthUser | null) => void>();

  constructor(config: FirebaseConfig) {
    this.realPromise = import("./firebaseAuthService").then((mod) => {
      const svc = new mod.FirebaseAuthService(config);
      this.real = svc;
      // Bridge the real service's updates to our own subscribers.
      svc.subscribe((user) => {
        this.current = user;
        for (const listener of this.listeners) listener(user);
      });
      return svc;
    });
  }

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }

  getCurrentUser(): AuthUser | null {
    return this.real?.getCurrentUser() ?? this.current;
  }

  ready(): Promise<void> {
    return this.realPromise.then((svc) => svc.ready());
  }

  signUp(input: { name: string; email: string; password: string }): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.signUp(input));
  }

  signIn(email: string, password: string): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.signIn(email, password));
  }

  signInWithGoogle(): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.signInWithGoogle());
  }

  signOut(): Promise<void> {
    return this.realPromise.then((svc) => svc.signOut());
  }

  sendPasswordReset(email: string): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.sendPasswordReset(email));
  }

  confirmPasswordReset(code: string, newPassword: string): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.confirmPasswordReset(code, newPassword));
  }

  verifyEmail(code: string): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.verifyEmail(code));
  }

  resendVerification(): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.resendVerification());
  }

  updateDisplayName(name: string): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.updateDisplayName(name));
  }

  changeEmail(newEmail: string): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.changeEmail(newEmail));
  }

  changePassword(newPassword: string): Promise<AuthResult> {
    return this.realPromise.then((svc) => svc.changePassword(newPassword));
  }
}
