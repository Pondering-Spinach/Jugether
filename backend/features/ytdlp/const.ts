import { existsSync } from "node:fs";

// A deployment may provide a mutable, verified nightly binary from a mounted
// volume. Check it for every spawn: an atomic replacement takes effect without
// restarting this server. The packaged yt-dlp remains a safe bootstrap fallback.
const configuredYtdlpExec = process.env["YTDLP_EXEC"];
export const ytdlpCookiesPath = process.env["YTDLP_COOKIES_PATH"];
export const ytdlpExec = () =>
    configuredYtdlpExec && existsSync(configuredYtdlpExec)
        ? configuredYtdlpExec
        : "yt-dlp";
export const searchResultCount = 50;
