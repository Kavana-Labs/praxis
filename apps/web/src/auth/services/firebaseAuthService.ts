import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  applyActionCode,
  confirmPasswordReset as fbConfirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type Auth,
  type User,
} from "firebase/auth";
import type { AuthResult, AuthService, AuthUser } from "../types";
import type { FirebaseConfig } from "./firebaseConfig";

/**
 * Firebase Authentication adapter. Verification and password-reset emails are
 * sent by Firebase with a continue-URL back into the app; the in-app
 * /auth/action route also handles direct action links (mode + oobCode).
 *
 * This module statically imports the Firebase SDK, so it must only ever be
 * loaded via dynamic `import()` (see lazyFirebaseAuthService.ts) — never from
 * the app entry graph — to keep Firebase out of the initial/landing bundle.
 */

// FirebaseConfig + firebaseConfigFromEnv now live in ./firebaseConfig (a
// Firebase-free module) so the adapter can be selected without loading the SDK.
export type { FirebaseConfig } from "./firebaseConfig";

/** Calm copy for the Firebase error codes users can actually hit. */
function messageFor(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email and password combination doesn't match an account.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Use a stronger password (at least 8 characters).";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/requires-recent-login":
      return "For security, sign in again before making this change.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled for this deployment.";
    case "auth/expired-action-code":
      return "This link has expired. Request a new one and try again.";
    case "auth/invalid-action-code":
      return "This link is invalid or has already been used.";
    case "auth/network-request-failed":
      return "The authentication service could not be reached. Check your connection.";
    default:
      console.error("Auth error", error);
      return "Something went wrong. Try again in a moment.";
  }
}

function mapUser(user: User | null): AuthUser | null {
  if (!user || !user.email) return null;
  const provider =
    user.providerData[0]?.providerId === "google.com" ? "google.com" : "password";
  return {
    id: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    provider,
  };
}

export class FirebaseAuthService implements AuthService {
  readonly kind = "firebase" as const;
  private auth: Auth;
  private listeners = new Set<(user: AuthUser | null) => void>();
  private current: AuthUser | null = null;
  private readyPromise: Promise<void>;

  constructor(config: FirebaseConfig) {
    const app: FirebaseApp =
      getApps()[0] ?? initializeApp(config as Record<string, string>);
    this.auth = getAuth(app);
    this.readyPromise = new Promise((resolve) => {
      const unsub = onAuthStateChanged(this.auth, () => {
        resolve();
        unsub();
      });
    });
    onAuthStateChanged(this.auth, (user) => {
      this.current = mapUser(user);
      this.emit();
    });
  }

  private emit() {
    for (const listener of this.listeners) listener(this.current);
  }

  private continueSettings() {
    return { url: `${window.location.origin}/auth/login` };
  }

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }

  getCurrentUser(): AuthUser | null {
    return this.current;
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  async signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    try {
      const cred = await createUserWithEmailAndPassword(
        this.auth,
        input.email.trim(),
        input.password,
      );
      await updateProfile(cred.user, { displayName: input.name.trim() });
      await sendEmailVerification(cred.user, this.continueSettings());
      this.current = mapUser(this.auth.currentUser);
      this.emit();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      await signInWithEmailAndPassword(this.auth, email.trim(), password);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }

  async signInWithGoogle(): Promise<AuthResult> {
    try {
      await signInWithPopup(this.auth, new GoogleAuthProvider());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.auth);
  }

  async sendPasswordReset(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(this.auth, email.trim(), this.continueSettings());
      return { ok: true };
    } catch (error) {
      // Don't reveal whether an email is registered (user-not-found → ok).
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (code === "auth/user-not-found") return { ok: true };
      return { ok: false, error: messageFor(error) };
    }
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<AuthResult> {
    try {
      await fbConfirmPasswordReset(this.auth, code, newPassword);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }

  async verifyEmail(code: string): Promise<AuthResult> {
    try {
      await applyActionCode(this.auth, code);
      // Refresh the local user so emailVerified updates immediately.
      await this.auth.currentUser?.reload();
      this.current = mapUser(this.auth.currentUser);
      this.emit();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }

  async resendVerification(): Promise<AuthResult> {
    const user = this.auth.currentUser;
    if (!user) return { ok: false, error: "Sign in to resend the verification email." };
    try {
      await sendEmailVerification(user, this.continueSettings());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }

  async updateDisplayName(name: string): Promise<AuthResult> {
    const user = this.auth.currentUser;
    if (!user) return { ok: false, error: "You're not signed in." };
    try {
      await updateProfile(user, { displayName: name.trim() });
      this.current = mapUser(this.auth.currentUser);
      this.emit();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }

  async changeEmail(newEmail: string): Promise<AuthResult> {
    const user = this.auth.currentUser;
    if (!user) return { ok: false, error: "You're not signed in." };
    try {
      await verifyBeforeUpdateEmail(user, newEmail.trim(), this.continueSettings());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }

  async changePassword(newPassword: string): Promise<AuthResult> {
    const user = this.auth.currentUser;
    if (!user) return { ok: false, error: "You're not signed in." };
    try {
      await updatePassword(user, newPassword);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFor(error) };
    }
  }
}
