import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import svgr from "vite-plugin-svgr";
import { cwd } from "node:process";

// https://vitejs.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, cwd(), "");
  return defineConfig({
    plugins: [react(), tailwindcss(), svgr()],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    //-- staging
    // preview: {
    //   proxy: {
    //     "/api": {
    //       target: env.VITE_API_BASE_URL,
    //       changeOrigin: true,
    //       rewrite: (path) => path.replace(/^\/api/, ""),
    //     },
    //   },
    // },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@ui": fileURLToPath(new URL("./src/components/ui", import.meta.url)),
      },
    },
    worker: {
      plugins: () => [],
      format: "es",
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
    build: {
      target: "esnext",
      modulePreload: true,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-ui": [
              "@radix-ui/react-checkbox",
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-label",
              "@radix-ui/react-popover",
              "@radix-ui/react-select",
              "@radix-ui/react-slot",
              "@radix-ui/react-toggle",
              "@mui/material",
              "@mui/x-data-grid",
            ],
            "vendor-utils": [
              "i18next",
              "react-i18next",
              "@tanstack/react-query",
              "axios",
              "dayjs",
              "uuid",
            ],
            "vendor-dnd": [
              "@dnd-kit/core",
              "@dnd-kit/sortable",
              "@xyflow/react",
            ],
          },
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name.includes("pages/")) {
              // Generate chunk names for pages based on their path
              const pagePath = chunkInfo.name.split("pages/")[1];
              return `assets/pages/${pagePath}-[hash].js`;
            }
            return "assets/[name]-[hash].js";
          },
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      assetsInlineLimit: 4096,
      chunkSizeWarningLimit: 1000,
      sourcemap: true,
    },
  });
};
