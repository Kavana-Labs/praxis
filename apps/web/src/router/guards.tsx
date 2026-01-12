import type { FC } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth-context";
import { ROUTES } from "./paths";

export const AuthGuard = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export const AdminGuard = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to={ROUTES.unauthorized} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export const RoleGuard: FC<{ allowedRoles: string[] }> = ({ allowedRoles }) => {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (!allowedRoles.some((role) => hasRole(role))) {
    return <Navigate to={ROUTES.unauthorized} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export const PermissionGuard: FC<{ allowedPermissions: string[] }> = ({ allowedPermissions }) => {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (!allowedPermissions.some((permission) => hasPermission(permission))) {
    return <Navigate to={ROUTES.unauthorized} replace state={{ from: location }} />;
  }

  return <Outlet />;
};
