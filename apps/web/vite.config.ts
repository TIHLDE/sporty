import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Make server-side env vars from apps/web/.env available on process.env
  // (Bun's automatic env loading is disabled in bunfig.toml).
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    server: {
      port: 3001,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      tailwindcss(),
      tanstackStart(),
      nitro({ preset: "node-server" }),
      viteReact(),
    ],
  };
});
