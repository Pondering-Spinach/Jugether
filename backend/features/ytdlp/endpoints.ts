import { $ } from "bun";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import type { RouteDeclaration } from "../../routing/types";
import { endpoint } from "../../routing/utils";
import { Guest, User } from "../user/services";
import { searchResultCount, ytdlpExec } from "./const";
import { thumbnails, videos } from "./db";

export const routes: RouteDeclaration[] = [
    [
        endpoint("GET", "/search"),
        async (req, url) => {
            if (!(await Guest.getPartyId(req)))
                return new Response(undefined, { status: 401 });

            const query = url.searchParams.get("query");
            let links = "[";
            let firstEntry = true;
            for await (const line of $`${ytdlpExec} ytsearch${searchResultCount}:${query} --dump-json --default-search ytsearch --no-playlist --no-check-certificate --geo-bypass --flat-playlist --skip-download --quiet --ignore-errors`.lines()) {
                if (!line) continue;
                links += firstEntry ? line : "," + line;
                firstEntry = false;
            }
            links += "]";
            //TODO: secure with try catch
            const videoInfos = JSON.parse(links);
            await db.insert(videos).values(videoInfos).onConflictDoNothing();
            await db
                .insert(thumbnails)
                .values(
                    videoInfos.flatMap((info) =>
                        info.thumbnails.map((thumb) => ({
                            video: info.id,
                            ...thumb,
                        })),
                    ),
                )
                .onConflictDoNothing();
            return new Response(links, {
                headers: { "content-type": "application/json" },
            });
        },
    ],

    [
        endpoint("GET", "/searchChannel"),
        async (req, url) => {
            if (!(await Guest.getPartyId(req)))
                return new Response(undefined, { status: 401 });

            const query = url.searchParams.get("query");
            let links = "[";
            let firstEntry = true;
            for await (const line of $`${ytdlpExec} --dump-json --playlist-end ${searchResultCount} --no-check-certificate --geo-bypass --flat-playlist --skip-download --quiet --ignore-errors "youtube.com/${query}"`.lines()) {
                if (!line) continue;
                links += firstEntry ? line : "," + line;
                firstEntry = false;
            }
            links += "]";
            //TODO: secure with try catch
            const videoInfos = JSON.parse(links);
            await db.insert(videos).values(videoInfos).onConflictDoNothing();
            await db
                .insert(thumbnails)
                .values(
                    videoInfos.flatMap((info) =>
                        info.thumbnails.map((thumb) => ({
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
        },
    ],

    [
        endpoint("GET", "/audioUrl"),
        async (req, url) => {
            if (!User.getUserId(req))
                return new Response(undefined, { status: 401 });
            //TODO: validate party

            const videoId = url.searchParams.get("id");
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
        },
    ],
];
