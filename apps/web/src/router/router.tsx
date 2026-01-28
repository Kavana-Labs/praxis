import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layout";
import { AdminGuard, AuthGuard } from "./guards";
import { ROUTES } from "./paths";
import ErrorPage from "@/pages/errors/error";

const toRoutePath = (path: string) => path.replace(/^\//, "");

export const router = createBrowserRouter([
  {
    path: ROUTES.home,
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        lazy: () => import("@/pages/landing/route"),
      },
      {
            path: "new",
            lazy: () => import("@/pages/app/slide/route"),
      },
      {
        path: toRoutePath(ROUTES.login),
        lazy: () => import("@/pages/auth/route"),
      },
      {
        path: toRoutePath(ROUTES.app),
        element: <AuthGuard />,
        children: [
          {
            index: true,
            lazy: () => import("@/pages/app/route"),
          },
        ],
      },
      {
        path: toRoutePath(ROUTES.admin),
        element: <AdminGuard />,
        children: [
          {
            index: true,
            lazy: () => import("@/pages/admin/route"),
          },
        ],
      },
      {
        path: toRoutePath(ROUTES.unauthorized),
        lazy: () => import("@/pages/errors/unauthorized-route"),
      },
      {
        path: "*",
        lazy: () => import("@/pages/errors/not-found-route"),
      },
    ],
  },
]);
