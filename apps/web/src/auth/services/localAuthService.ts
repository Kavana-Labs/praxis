import { newId } from "@/domain/ids";
import type { AuthResult, AuthService, AuthUser } from "../types";

/**
 * Browser-local authentication adapter: a fully working account system for
 * deployments without a configured backend (and for dev/test). Accounts live
 * in localStorage with salted SHA-256 password digests; where a hosted
 * backend would send an email, this adapter returns a `localActionCode` that
 * the UI renders as an in-app link. The UI labels this mode clearly —
 * accounts exist only in this browser.
 */

const USERS_KEY = "praxis:auth:users";
const SESSION_KEY = "praxis:auth:session";
const ACTIONS_KEY = "praxis:auth:actions";
const ACTION_TTL_MS = 60 * 60 * 1000;

type StoredUser = {
  id: string;
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  emailVerified: boolean;
};

type StoredAction = {
  code: string;
  type: "verify" | "reset";
  userId: string;
  expiresAt: number;
};

async function digest(salt: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class LocalAuthService implements AuthService {
  readonly kind = "local" as const;
  private listeners = new Set<(user: AuthUser | null) => void>();
  private storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  // --- storage helpers -------------------------------------------------------

  private readUsers(): StoredUser[] {
    try {
      const parsed = JSON.parse(this.storage.getItem(USERS_KEY) ?? "[]");
      return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
    } catch {
      return [];
    }
  }

  private writeUsers(users: StoredUser[]): void {
    this.storage.setItem(USERS_KEY, JSON.stringify(users));
  }

  private readActions(): StoredAction[] {
    try {
      const parsed = JSON.parse(this.storage.getItem(ACTIONS_KEY) ?? "[]");
      const actions = Array.isArray(parsed) ? (parsed as StoredAction[]) : [];
      return actions.filter((a) => a.expiresAt > Date.now());
    } catch {
      return [];
    }
  }

  private writeActions(actions: StoredAction[]): void {
    this.storage.setItem(ACTIONS_KEY, JSON.stringify(actions));
  }

  private createAction(type: StoredAction["type"], userId: string): string {
    const code = randomToken();
    this.writeActions([
      ...this.readActions(),
      { code, type, userId, expiresAt: Date.now() + ACTION_TTL_MS },
    ]);
    return code;
  }

  private sessionUser(): StoredUser | null {
    const id = this.storage.getItem(SESSION_KEY);
    if (!id) return null;
    return this.readUsers().find((u) => u.id === id) ?? null;
  }

  private toAuthUser(user: StoredUser | null): AuthUser | null {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.name,
      emailVerified: user.emailVerified,
      provider: "local",
    };
  }

  private emit(): void {
    const user = this.toAuthUser(this.sessionUser());
    for (const listener of this.listeners) listener(user);
  }

  // --- AuthService -----------------------------------------------------------

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.getCurrentUser());
    return () => this.listeners.delete(listener);
  }

  getCurrentUser(): AuthUser | null {
    return this.toAuthUser(this.sessionUser());
  }

  ready(): Promise<void> {
    return Promise.resolve();
  }

  async signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const users = this.readUsers();
    if (users.some((u) => u.email === email)) {
      return {
        ok: false,
        error: "An account with this email already exists. Try signing in instead.",
      };
    }
    const salt = randomToken();
    const user: StoredUser = {
      id: newId("user"),
      email,
      name: input.name.trim(),
      salt,
      passwordHash: await digest(salt, input.password),
      emailVerified: false,
    };
    this.writeUsers([...users, user]);
    this.storage.setItem(SESSION_KEY, user.id);
    const code = this.createAction("verify", user.id);
    this.emit();
    return { ok: true, localActionCode: code };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const user = this.readUsers().find(
      (u) => u.email === email.trim().toLowerCase(),
    );
    if (!user || user.passwordHash !== (await digest(user.salt, password))) {
      return {
        ok: false,
        error: "That email and password combination doesn't match an account.",
      };
    }
    this.storage.setItem(SESSION_KEY, user.id);
    this.emit();
    return { ok: true };
  }

  async signInWithGoogle(): Promise<AuthResult> {
    return {
      ok: false,
      error:
        "Google sign-in isn't available with browser-local accounts. Use email and password instead.",
    };
  }

  async signOut(): Promise<void> {
    this.storage.removeItem(SESSION_KEY);
    this.emit();
  }

  async sendPasswordReset(email: string): Promise<AuthResult> {
    const user = this.readUsers().find(
      (u) => u.email === email.trim().toLowerCase(),
    );
    // Never reveal whether an email is registered.
    if (!user) return { ok: true };
    return { ok: true, localActionCode: this.createAction("reset", user.id) };
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<AuthResult> {
    const actions = this.readActions();
    const action = actions.find((a) => a.code === code && a.type === "reset");
    if (!action) {
      return { ok: false, error: "This link is invalid or has already been used." };
    }
    const users = this.readUsers();
    const user = users.find((u) => u.id === action.userId);
    if (!user) return { ok: false, error: "This account no longer exists." };
    user.salt = randomToken();
    user.passwordHash = await digest(user.salt, newPassword);
    this.writeUsers(users);
    this.writeActions(actions.filter((a) => a.code !== code));
    return { ok: true };
  }

  async verifyEmail(code: string): Promise<AuthResult> {
    const actions = this.readActions();
    const action = actions.find((a) => a.code === code && a.type === "verify");
    if (!action) {
      return { ok: false, error: "This link is invalid or has already been used." };
    }
    const users = this.readUsers();
    const user = users.find((u) => u.id === action.userId);
    if (!user) return { ok: false, error: "This account no longer exists." };
    user.emailVerified = true;
    this.writeUsers(users);
    this.writeActions(actions.filter((a) => a.code !== code));
    this.emit();
    return { ok: true };
  }

  async resendVerification(): Promise<AuthResult> {
    const user = this.sessionUser();
    if (!user) return { ok: false, error: "Sign in to resend the verification email." };
    return { ok: true, localActionCode: this.createAction("verify", user.id) };
  }

  async updateDisplayName(name: string): Promise<AuthResult> {
    const users = this.readUsers();
    const user = this.sessionUser();
    if (!user) return { ok: false, error: "You're not signed in." };
    const stored = users.find((u) => u.id === user.id);
    if (!stored) return { ok: false, error: "You're not signed in." };
    stored.name = name.trim();
    this.writeUsers(users);
    this.emit();
    return { ok: true };
  }

  async changeEmail(newEmail: string): Promise<AuthResult> {
    const email = newEmail.trim().toLowerCase();
    const users = this.readUsers();
    const user = this.sessionUser();
    if (!user) return { ok: false, error: "You're not signed in." };
    if (users.some((u) => u.email === email && u.id !== user.id)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const stored = users.find((u) => u.id === user.id);
    if (!stored) return { ok: false, error: "You're not signed in." };
    stored.email = email;
    stored.emailVerified = false;
    this.writeUsers(users);
    const code = this.createAction("verify", stored.id);
    this.emit();
    return { ok: true, localActionCode: code };
  }

  async changePassword(newPassword: string): Promise<AuthResult> {
    const users = this.readUsers();
    const user = this.sessionUser();
    if (!user) return { ok: false, error: "You're not signed in." };
    const stored = users.find((u) => u.id === user.id);
    if (!stored) return { ok: false, error: "You're not signed in." };
    stored.salt = randomToken();
    stored.passwordHash = await digest(stored.salt, newPassword);
    this.writeUsers(users);
    return { ok: true };
  }
}
