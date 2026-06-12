import React, { useMemo, useState } from "react";
import {
  AuthContext,
  type AuthContextValue,
  type AuthUser,
} from "./auth-store";

const STORAGE_KEY = "praxis_auth_user";

const readStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const value = useMemo<AuthContextValue>(() => {
    const roles = user?.roles ?? [];
    const permissions = user?.permissions ?? [];
    return {
      user,
      isAuthenticated: Boolean(user),
      isAdmin: roles.includes("admin"),
      roles,
      permissions,
      hasRole: (role) => roles.includes(role),
      hasPermission: (permission) => permissions.includes(permission),
      setUser: (nextUser) => {
        setUser(nextUser);
        if (typeof window === "undefined") {
          return;
        }
        if (nextUser) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

