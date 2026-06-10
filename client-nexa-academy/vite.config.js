import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      dedupe: ["react", "react-dom"],
    },
    define: {
      // Sanity Studio requires process.env to exist in the browser
      "process.env": {},
    },
    optimizeDeps: {
      include: ["sanity", "@sanity/vision", "react-i18next"],
    },

    plugins: [react(), tailwindcss(), cloudflare()],
    base: "/",
    build: {
      outDir: "dist",
      sourcemap: false,
      rollupOptions: {
        output: {
          // Add a small banner in production that no-ops console methods at runtime
          ...(isProd
            ? {
                banner:
                  "(function(){if(typeof window!=='undefined'){var c=window.console||{};['log','info','debug','warn','error'].forEach(function(k){c[k]=function(){}});window.console=c;}})();",
              }
            : {}),
        },
      },
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          // also treat console.* as pure to remove remaining calls
          pure_funcs: isProd
            ? [
                "console.log",
                "console.info",
                "console.debug",
                "console.warn",
                "console.error",
              ]
            : [],
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
    },
    preview: {
      port: 4173,
    },
  };
});
