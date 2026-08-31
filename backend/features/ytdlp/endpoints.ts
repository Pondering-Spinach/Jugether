import { $ } from "bun";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import type { App } from "../../routing/app";
import { Guest, User } from "../user/services";
import { searchResultCount, ytdlpExec } from "./const";
import { thumbnails, videos } from "./db";

export const registerYtdlpRoutes = (app: App) => {
    app.get("/search", async (c) => {
        const req = c.req.raw;
            if (!(await Guest.getPartyId(req)))
                return new Response(undefined, { status: 401 });

            const query = c.req.query("query");
            let links = "[";
            let firstEntry = true;
            for await (const line of $`${ytdlpExec} ytsearch${searchResultCount}:${query} --dump-json --default-search ytsearch --no-playlist --no-check-certificate --geo-bypass --flat-playlist --skip-download --quiet --ignore-errors`.lines()) {
                if (!line) continue;
                links += firstEntry ? line : "," + line;
                firstEntry = false;
            }
            links += "]";
            //TODO: secure with try catch
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
            return new Response(links, {
                headers: { "content-type": "application/json" },
            });
    });

    app.get("/searchChannel", async (c) => {
        const req = c.req.raw;
            if (!(await Guest.getPartyId(req)))
                return new Response(undefined, { status: 401 });

            const query = c.req.query("query");
            let links = "[";
            let firstEntry = true;
            for await (const line of $`${ytdlpExec} --dump-json --playlist-end ${searchResultCount} --no-check-certificate --geo-bypass --flat-playlist --skip-download --quiet --ignore-errors "youtube.com/${query}"`.lines()) {
                if (!line) continue;
                links += firstEntry ? line : "," + line;
                firstEntry = false;
            }
            links += "]";
            //TODO: secure with try catch
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
            //TODO: filter shorts
            return new Response(links, {
                headers: { "content-type": "application/json" },
            });
    });

    app.get("/audioUrl", async (c) => {
        const req = c.req.raw;
            if (!User.getUserId(req))
                return new Response(undefined, { status: 401 });
            //TODO: validate party

            const videoId = c.req.query("id");
            if (!videoId) return new Response(undefined, { status: 400 });
            const res = await db.query.videos.findFirst({
                where: eq(videos.id, videoId),
                columns: { url: true },
            });
            const videoLink = res?.url;
            if (!videoLink) return new Response(undefined, { status: 400 });
            const videoUrl = //TODO: make cookies configurable
                (
                    await $`${ytdlpExec} -f "bestaudio/best" --hls-use-mpegts --get-url --cookies /var/home/sebastian/.jails/tmp/Downloads/cookies.txt "${videoLink}"`.text()
                ).trim();
            return new Response(videoUrl);
    });
};
