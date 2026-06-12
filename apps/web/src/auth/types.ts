/**
 * The authentication port. Praxis ships two adapters:
 *
 *  - FirebaseAuthService — real accounts on Firebase Authentication (email/
 *    password with verification + reset emails, optional Google SSO). Active
 *    when the VITE_FIREBASE_* env vars are present.
 *  - LocalAuthService — a fully functional in-browser fallback (accounts in
 *    localStorage, hashed passwords, verification/reset links surfaced
 *    in-app). Active in dev/test or unconfigured deployments, and clearly
 *    labelled as browser-local in the UI.
 *
 * Screens talk only to this interface; swapping backends never touches UI.
 */

export type AuthProviderKind = "password" | "google.com" | "local";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  provider: AuthProviderKind;
};

/**
 * Action results carry calm, user-facing error copy — never raw SDK errors.
 * `localActionCode` is set by the local adapter where a hosted backend would
 * have sent an email: the UI turns it into an in-app "open link" action.
 */
export type AuthResult = {
  ok: boolean;
  error?: string;
  localActionCode?: string;
};

export interface AuthService {
  readonly kind: "firebase" | "local";
  /** Subscribe to user changes; fires immediately with the current state. */
  subscribe(listener: (user: AuthUser | null) => void): () => void;
  getCurrentUser(): AuthUser | null;
  /** Resolves once the initial session restore has completed. */
  ready(): Promise<void>;

  signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<AuthResult>;
  signOut(): Promise<void>;

  sendPasswordReset(email: string): Promise<AuthResult>;
  confirmPasswordReset(code: string, newPassword: string): Promise<AuthResult>;
  verifyEmail(code: string): Promise<AuthResult>;
  resendVerification(): Promise<AuthResult>;

  updateDisplayName(name: string): Promise<AuthResult>;
  changeEmail(newEmail: string): Promise<AuthResult>;
  changePassword(newPassword: string): Promise<AuthResult>;
}

// ---------------------------------------------------------------------------
// Shared validation (used by every screen)
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Enter a password.";
  if (password.length < 8) return "Use at least 8 characters.";
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return "Enter your name.";
  if (name.trim().length < 2) return "Enter your full name.";
  return null;
}
