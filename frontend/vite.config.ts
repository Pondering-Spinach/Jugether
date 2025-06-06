import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
    plugins: [tailwindcss(), preact(), tsconfigPaths()],
    server: {
        port: 3000,
    },
    build: {
        target: "esnext",
        sourcemap: process.env.VITE_SOURCE_MAP === "true" ? true : false,
        rollupOptions: {
            input: {
                guest: resolve(__dirname, "src/pages/guest/index.html"),
                host: resolve(__dirname, "src/pages/host/index.html"),
                portal: resolve(__dirname, "src/pages/portal/index.html"),
                public: resolve(__dirname, "src/pages/public/index.html"),
            },
        },
    },
});
