import { fileURLToPath } from "node:url";

// Frontend build output is colocated with the backend deployment artifact.
// Resolve it from this module rather than process.cwd().
export const frontendDist = fileURLToPath(
    new URL("../public/", import.meta.url),
);
