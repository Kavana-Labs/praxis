import "./App.css";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/auth/auth-context";
import { router } from "@/router/router";

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
