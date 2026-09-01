import { existsSync } from "node:fs";

// The deployment sets YTDLP_EXEC to the shared nightly binary. Development
// uses yt-dlp from PATH when the variable is unset. No alternate executable
// is tried if the configured binary is unavailable.
const configuredYtdlpCookiesPath = process.env["YTDLP_COOKIES_PATH"];
// Cookies are optional in a deployment. Do not pass a nonexistent path to
// yt-dlp, which treats that as an error when a download is requested.
export const ytdlpCookiesPath =
    configuredYtdlpCookiesPath && existsSync(configuredYtdlpCookiesPath)
        ? configuredYtdlpCookiesPath
        : undefined;
export const ytdlpExec = () => process.env["YTDLP_EXEC"] ?? "yt-dlp";
export const searchResultCount = 10;
