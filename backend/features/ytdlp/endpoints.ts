import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import type { App } from "../../routing/app";
import { getAccessiblePartyId } from "../party/access";
import { User } from "../user/services";
import { searchResultCount, ytdlpCookiesPath } from "./const";
import { videos } from "./db";
import { runYtdlp } from "./services";

type MusicMetadata = {
    id: string | null;
    artist: string | null;
    artists: string[];
    song: string | null;
    title: string | null;
};

const lines = (output: string) =>
    output.split("\n").filter((line) => line.trim());

async function searchAndCache(query: string) {
    // A flat Music search returns IDs without opening each video. Use those IDs
    // to serve cached metadata, and resolve only cache misses.
    const ids = [
        ...new Set(
            lines(
                await runYtdlp([
                    "--flat-playlist",
                    "--print",
                    "%(id)s",
                    "--playlist-end",
                    String(searchResultCount),
                    "--ignore-errors",
                    `https://music.youtube.com/search?q=${encodeURIComponent(query)}#songs`,
                ]),
            ),
        ),
    ];
    if (!ids.length) return "[]";

    const cachedVideos = await db.query.videos.findMany({
        where: inArray(videos.id, ids),
    });
    const videosById = new Map(cachedVideos.map((video) => [video.id, video]));
    const missingIds = ids.filter((id) => !videosById.has(id));

    if (missingIds.length) {
        const fetchedVideos = lines(
            await runYtdlp([
                "--no-playlist",
                "--print",
                '{"id":%(id|null)j,"artist":%(artist|null)j,"artists":%(artists|[])j,"song":%(track|null)j,"title":%(title|null)j}',
                "--ignore-errors",
                ...missingIds.map(
                    (id) =>
                        `https://music.youtube.com/watch?v=${encodeURIComponent(id)}`,
                ),
            ]),
        )
            .map((line) => JSON.parse(line) as MusicMetadata)
            .filter((info) => info.id)
            .map((info) => ({
                id: info.id!,
                artist:
                    info.artist ??
                    (info.artists.join(", ") || "Unknown artist"),
                song: info.song ?? info.title ?? "Unknown song",
            }));
        if (fetchedVideos.length) {
            await db.insert(videos).values(fetchedVideos).onConflictDoNothing();
            for (const video of fetchedVideos) videosById.set(video.id, video);
        }
    }

    // Preserve YouTube Music's search order across cached and fresh entries.
    return JSON.stringify(
        ids.flatMap((id) => {
            const video = videosById.get(id);
            return video ? [video] : [];
        }),
    );
}

export const registerYtdlpRoutes = (app: App) => {
    app.get("/search", async (c) => {
        if (!(await getAccessiblePartyId(c.req.raw)))
            return new Response(undefined, { status: 401 });
        const query = c.req.query("query");
        if (!query) return new Response(undefined, { status: 400 });
        return new Response(await searchAndCache(query), {
            headers: { "content-type": "application/json" },
        });
    });

    app.get("/audioUrl", async (c) => {
        const req = c.req.raw;
        if (!(await User.getUserId(req)) || !(await getAccessiblePartyId(req)))
            return new Response(undefined, { status: 401 });
        const videoId = c.req.query("id");
        if (!videoId) return new Response(undefined, { status: 400 });
        const video = await db.query.videos.findFirst({
            where: eq(videos.id, videoId),
            columns: { id: true },
        });
        if (!video) return new Response(undefined, { status: 400 });
        const videoUrl = (
            await runYtdlp([
                "-f",
                "bestaudio/best",
                "--get-url",
                ...(ytdlpCookiesPath ? ["--cookies", ytdlpCookiesPath] : []),
                // A canonical URL avoids the Music client's authenticated
                // po_token requirement for a cached Music search result.
                `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
            ])
        ).trim();
        return new Response(videoUrl);
    });
};
