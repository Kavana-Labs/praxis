import { createContext } from "react";
import type { AuthService, AuthUser } from "./types";

export type AuthStatus = "loading" | "ready";

export type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  /** Praxis has no role system yet; admin surfaces stay gated off. */
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  /** The active auth backend (Firebase or browser-local). */
  service: AuthService;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
