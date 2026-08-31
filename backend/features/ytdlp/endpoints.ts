import { eq } from "drizzle-orm";
import { db } from "../../db";
import type { App } from "../../routing/app";
import { Guest, User } from "../user/services";
import { searchResultCount } from "./const";
import { thumbnails, videos } from "./db";
import { runYtdlp } from "./services";

const searchArguments = (query: string) => [
    `ytsearch${searchResultCount}:${query}`,
    "--dump-json",
    "--default-search",
    "ytsearch",
    "--no-playlist",
    "--no-check-certificate",
    "--geo-bypass",
    "--flat-playlist",
    "--skip-download",
    "--quiet",
    "--ignore-errors",
];

async function searchAndCache(args: string[]) {
    const output = await runYtdlp(args);
    const links = `[${output.trim().split("\n").filter(Boolean).join(",")}]`;
    const videoInfos: any[] = JSON.parse(links);
    await db.insert(videos).values(videoInfos).onConflictDoNothing();
    await db
        .insert(thumbnails)
        .values(
            videoInfos.flatMap((info) =>
                info.thumbnails.map((thumb: any) => ({
                    video: info.id,
                    ...thumb,
                })),
            ),
        )
        .onConflictDoNothing();
    return links;
}

export const registerYtdlpRoutes = (app: App) => {
    app.get("/search", async (c) => {
        if (!(await Guest.getPartyId(c.req.raw)))
            return new Response(undefined, { status: 401 });
        const query = c.req.query("query");
        if (!query) return new Response(undefined, { status: 400 });
        const links = await searchAndCache(searchArguments(query));
        return new Response(links, {
            headers: { "content-type": "application/json" },
        });
    });

    app.get("/searchChannel", async (c) => {
        if (!(await Guest.getPartyId(c.req.raw)))
            return new Response(undefined, { status: 401 });
        const query = c.req.query("query");
        if (!query) return new Response(undefined, { status: 400 });
        const links = await searchAndCache([
            "--dump-json",
            "--playlist-end",
            String(searchResultCount),
            "--no-check-certificate",
            "--geo-bypass",
            "--flat-playlist",
            "--skip-download",
            "--quiet",
            "--ignore-errors",
            `youtube.com/${query}`,
        ]);
        return new Response(links, {
            headers: { "content-type": "application/json" },
        });
    });

    app.get("/audioUrl", async (c) => {
        const req = c.req.raw;
        if (!(await User.getUserId(req)))
            return new Response(undefined, { status: 401 });
        //TODO: validate party
        const videoId = c.req.query("id");
        if (!videoId) return new Response(undefined, { status: 400 });
        const res = await db.query.videos.findFirst({
            where: eq(videos.id, videoId),
            columns: { url: true },
        });
        if (!res?.url) return new Response(undefined, { status: 400 });
        const videoUrl = (
            await runYtdlp([
                "-f",
                "bestaudio/best",
                "--hls-use-mpegts",
                "--get-url",
                "--cookies",
                "/var/home/sebastian/.jails/tmp/Downloads/cookies.txt",
                res.url,
            ])
        ).trim();
        return new Response(videoUrl);
    });
};
