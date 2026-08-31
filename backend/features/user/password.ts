import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

// Bun password hashes are intentionally not supported. Recreate development users
// after this runtime migration, as documented in target.md.
export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("base64url");
    const hash = await scrypt(password, salt, keyLength) as Buffer;
    return `scrypt$${salt}$${Buffer.from(hash).toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string) {
    const [algorithm, salt, expected] = encoded.split("$");
    if (algorithm !== "scrypt" || !salt || !expected) return false;
    const actual = Buffer.from(await scrypt(password, salt, keyLength) as Buffer);
    const expectedBuffer = Buffer.from(expected, "base64url");
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}
