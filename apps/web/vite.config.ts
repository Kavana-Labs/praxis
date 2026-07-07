import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  // react-rnd's dependency (react-draggable) references `process.env.NODE_ENV`,
  // which the browser does not define. Derive it from Vite's own build mode so
  // a production build always ships React's production build — not from the
  // ambient shell env, which may be unset in CI and would silently ship dev
  // React (bigger + slower).
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      mode === "production" ? "production" : "development",
    ),
  },
}))
