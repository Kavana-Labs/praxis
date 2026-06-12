import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardShell } from "@/features/dashboard/DashboardShell";
import {
  DashboardHomeView,
  PresentationsView,
  TemplatesView,
  TrashView,
} from "@/features/dashboard/views";
import { ProfileView } from "@/features/dashboard/ProfileView";

/**
 * The /app dashboard (Platform Figma): one lazy chunk containing the shell
 * and its four views. Praxis is local-first — no sign-in is required to reach
 * your own documents.
 */
export function Component() {
  return (
    <Routes>
      <Route element={<DashboardShell />}>
        <Route index element={<DashboardHomeView />} />
        <Route path="templates" element={<TemplatesView />} />
        <Route path="presentations" element={<PresentationsView />} />
        <Route path="trash" element={<TrashView />} />
        <Route path="profile" element={<ProfileView />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
    </Routes>
  );
}

export default Component;
