import React, { createContext, useContext, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  roles: string[];
  permissions: string[];
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  setUser: (user: AuthUser | null) => void;
};

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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
