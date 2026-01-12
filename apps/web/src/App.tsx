import "./App.css";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/auth/auth-context";
import { router } from "@/router/router";
import RouteLoading from "@/router/route-loading";

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} fallbackElement={<RouteLoading />} />
    </AuthProvider>
  );
}

export default App;
