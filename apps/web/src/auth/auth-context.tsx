import React, { useEffect, useMemo, useState } from "react";
import { AuthContext, type AuthContextValue } from "./auth-store";
import { getAuthService } from "./services";
import type { AuthUser } from "./types";

/**
 * Provides the live auth session. `status` stays "loading" until the backend
 * has restored any persisted session, so guards never flash a redirect.
 */
export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const service = getAuthService();
  const [user, setUser] = useState<AuthUser | null>(service.getCurrentUser());
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    const unsubscribe = service.subscribe(setUser);
    let cancelled = false;
    void service.ready().then(() => {
      if (!cancelled) setStatus("ready");
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: Boolean(user),
      isAdmin: false,
      roles: [],
      permissions: [],
      hasRole: () => false,
      hasPermission: () => false,
      service,
    }),
    [user, status, service],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
