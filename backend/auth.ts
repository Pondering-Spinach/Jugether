import { existsSync, readFileSync } from "node:fs";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins";
import { db } from "./db";

const secretFile = process.env["BETTER_AUTH_SECRET_FILE"];
const secret =
    secretFile && existsSync(secretFile)
        ? readFileSync(secretFile, "utf8").trim()
        : undefined;

if (process.env["NODE_ENV"] === "production" && !secret)
    console.warn(
        "Better Auth secret file is unavailable; using the built-in fallback secret",
    );

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite" }),
    // The persistent mounted file takes precedence; the fallback keeps local
    // development usable if the deployment bootstrap step was skipped.
    secret: secret || "development-only-secret-change-before-production",
    ...(process.env["BETTER_AUTH_URL"]
        ? { baseURL: process.env["BETTER_AUTH_URL"] }
        : {}),
    trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    emailAndPassword: { enabled: true },
    plugins: [username({ displayUsername: false, immutableUsername: true })],
});
