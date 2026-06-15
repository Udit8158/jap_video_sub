import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Renderer-only Vite config. The Electron main/preload are plain JS and are not
// bundled by Vite. `base: "./"` makes the built assets load from file:// in the
// packaged app.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 5173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
