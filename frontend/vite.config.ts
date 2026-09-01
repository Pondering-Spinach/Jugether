import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const pageOutputPaths = {
    "src/pages/public/index.html": "index.html",
    "src/pages/host/index.html": "host.html",
    "src/pages/guest/index.html": "guest.html",
} as const;

// Vite intentionally preserves an HTML entry's source path in dist. Flatten only
// the generated HTML files while keeping the source pages organized by feature.
const flatPageOutputs = (): Plugin => ({
    name: "flat-page-outputs",
    enforce: "post",
    generateBundle(_, bundle) {
        for (const [sourcePath, outputPath] of Object.entries(
            pageOutputPaths,
        )) {
            const output = bundle[sourcePath];
            if (!output || output.type !== "asset")
                throw new Error(`Missing HTML build output: ${sourcePath}`);
            delete bundle[sourcePath];
            this.emitFile({
                type: "asset",
                fileName: outputPath,
                source: output.source,
            });
        }
    },
});

// https://vite.dev/config/
export default defineConfig({
    plugins: [tailwindcss(), preact(), flatPageOutputs()],
    resolve: {
        tsconfigPaths: true,
    },
    build: {
        target: "esnext",
        // Keep the deployable frontend beside the Node server.
        // Deployment builds set this to an output directory; development keeps
        // the frontend colocated with the backend's static files.
        outDir:
            process.env.FRONTEND_OUT_DIR ??
            resolve(import.meta.dirname, "../backend/public"),
        emptyOutDir: true,
        sourcemap: process.env.VITE_SOURCE_MAP === "true" ? true : false,
        rollupOptions: {
            input: {
                guest: resolve(
                    import.meta.dirname,
                    "src/pages/guest/index.html",
                ),
                host: resolve(import.meta.dirname, "src/pages/host/index.html"),
                public: resolve(
                    import.meta.dirname,
                    "src/pages/public/index.html",
                ),
            },
        },
    },
});
