import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins";
import { db } from "./db";

const isProduction = process.env["NODE_ENV"] === "production";
const secret = process.env["BETTER_AUTH_SECRET"];

if (isProduction && !secret)
    throw new Error("BETTER_AUTH_SECRET must be set in production");

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "sqlite" }),
    // A fixed development secret keeps local sessions valid across restarts.
    secret: secret ?? "development-only-secret-change-before-production",
    ...(process.env["BETTER_AUTH_URL"]
        ? { baseURL: process.env["BETTER_AUTH_URL"] }
        : {}),
    trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
    emailAndPassword: { enabled: true },
    plugins: [username({ displayUsername: false, immutableUsername: true })],
});
