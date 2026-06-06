import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // …
  define: {
    // le dice a Vite que reemplace todas las referencias a `global` por `window`
    global: "window"
  }
});
