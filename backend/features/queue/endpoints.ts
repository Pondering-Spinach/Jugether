import type {
    Events,
    OwnVote,
    PlacedVote,
    QueueVideo,
} from "communication/queue";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import type { App } from "../../routing/app";
import { getSessionId } from "../../routing/utils";
import { userHostsParty } from "../party/services";
import { Guest, User } from "../user/services";
import { videos } from "../ytdlp/db";
import { queues, votes } from "./db";
import { streamSessions } from "./state";
import { getPartyIdFromHeader } from "./utils";

export const registerQueueRoutes = (app: App) => {
    app.get("/queue", async (c) => {
        const req = c.req.raw;
            let partyId = await Guest.getPartyId(req);
            if (!partyId) {
                partyId = getPartyIdFromHeader(req);
                if (!partyId) return new Response(undefined, { status: 400 });
                const userId = await User.getUserId(req);
                if (!userId) return new Response(undefined, { status: 400 });
                if (!(await userHostsParty(userId, partyId)))
                    return new Response(undefined, { status: 401 });
            }

            const queuedVideos = await db.query.queues.findMany({
                where: and(
                    eq(queues.partyId, partyId),
                    isNull(queues.playedAt),
                    isNull(queues.skippedAt),
                ),
                columns: { queuedAt: true, startedAt: true },
                with: {
                    votes: { columns: { positive: true } },
                    video: {
                        with: {
                            thumbnails: { columns: { width: true, url: true } },
                        },
                    },
                },
            });

            //TODO: sort queue via db query or share code
            const videos: QueueVideo[] = queuedVideos.map((video) => ({
                ...video.video,
                startedAt: video.startedAt,
                queuedAt: video.queuedAt,
                votes: video.votes.reduce(
                    (acc, curr) => (curr.positive ? acc + 1 : acc - 1),
                    0,
                ),
            }));
            return new Response(
                JSON.stringify(
                    videos.sort(
                        (entryA, entryB) =>
                            (entryA.startedAt ?? Infinity) -
                                (entryB.startedAt ?? Infinity) ||
                            (entryB.votes ?? 0) - (entryA.votes ?? 0) ||
                            (entryA.queuedAt ?? Infinity) -
                                (entryB.queuedAt ?? Infinity),
                    ),
                ),
            );
    });

    app.get("/queue/updates", async (c) => {
        const req = c.req.raw;
            let partyId = await Guest.getPartyId(req);
            if (!partyId) {
                partyId = getPartyIdFromHeader(req);
                if (!partyId) return new Response(undefined, { status: 400 });
                const userId = await User.getUserId(req);
                if (!userId) return new Response(undefined, { status: 400 });
                if (!(await userHostsParty(userId, partyId)))
                    return new Response(undefined, { status: 401 });
            }

            const sessionId = getSessionId(req)!;

            const stream = new ReadableStream({
                start(controller) {
                    if (!streamSessions[partyId]) streamSessions[partyId] = {};
                    streamSessions[partyId]![sessionId] = controller;
                },
                cancel() {
                    delete streamSessions[partyId]![sessionId];
                    if (!Object.keys(streamSessions[partyId]!).length)
                        delete streamSessions[partyId];
                },
            });

            return new Response(stream, {
                status: 200,
                headers: {
                    "Content-Type": "text/event-stream;charset=utf-8",
                    Connection: "keep-alive",
                },
            });
    });

    app.put("/queue/start", async (c) => {
        const req = c.req.raw;
            const partyId = getPartyIdFromHeader(req);
            if (!partyId) return new Response(undefined, { status: 400 });
            const userId = await User.getUserId(req);
            if (!userId) return new Response(undefined, { status: 401 });
            if (!(await userHostsParty(userId, partyId)))
                return new Response(undefined, { status: 401 });
            const videoId = await req.text();
            if (!videoId) return new Response(undefined, { status: 400 });

            await db
                .update(queues)
                .set({ startedAt: new Date().getTime() })
                .where(
                    and(
                        eq(queues.partyId, partyId),
                        eq(queues.videoId, videoId),
                        isNull(queues.startedAt),
                        isNull(queues.playedAt),
                        isNull(queues.skippedAt),
                    ),
                );

            const message: Events = { started: videoId };
            for (const controllerId in streamSessions[partyId])
                streamSessions[partyId][controllerId]?.enqueue(
                    `data: ${JSON.stringify(message)}\n\n`,
                );
            return new Response();
    });

    app.put("/queue/played", async (c) => {
        const req = c.req.raw;
            const partyId = getPartyIdFromHeader(req);
            if (!partyId) return new Response(undefined, { status: 400 });
            const userId = await User.getUserId(req);
            if (!userId) return new Response(undefined, { status: 401 });
            if (!(await userHostsParty(userId, partyId)))
                return new Response(undefined, { status: 401 });
            const videoId = await req.text();
            if (!videoId) return new Response(undefined, { status: 400 });

            await db
                .update(queues)
                .set({ playedAt: new Date().getTime() })
                .where(
                    and(
                        eq(queues.partyId, partyId),
                        eq(queues.videoId, videoId),
                        isNull(queues.playedAt),
                        isNull(queues.skippedAt),
                    ),
                );

            const message: Events = { played: videoId };
            for (const controllerId in streamSessions[partyId])
                streamSessions[partyId][controllerId]?.enqueue(
                    `data: ${JSON.stringify(message)}\n\n`,
                );
            return new Response();
    });

    app.delete("/queue", async (c) => {
        const req = c.req.raw;
            const sessionId = getSessionId(req);
            if (!sessionId) return new Response(undefined, { status: 400 });
            const partyId = getPartyIdFromHeader(req);
            if (!partyId) return new Response(undefined, { status: 400 });
            const userId = await User.getUserId(req);
            if (!userId) return new Response(undefined, { status: 401 });
            if (!(await userHostsParty(userId, partyId)))
                return new Response(undefined, { status: 401 });
            const videoId = await req.text();
            if (!videoId) return new Response(undefined, { status: 400 });

            await db
                .update(queues)
                .set({ skippedAt: new Date().getTime() })
                .where(
                    and(
                        eq(queues.partyId, partyId),
                        eq(queues.videoId, videoId),
                        isNull(queues.playedAt),
                        isNull(queues.skippedAt),
                    ),
                );
            const message: Events = { deleted: videoId };
            for (const controllerId in streamSessions[partyId])
                streamSessions[partyId][controllerId]?.enqueue(
                    `data: ${JSON.stringify(message)}\n\n`,
                );
            return new Response();
    });

    app.post("/queue", async (c) => {
        const req = c.req.raw;
            const sessionId = getSessionId(req);
            if (!sessionId) return new Response(undefined, { status: 400 });
            const partyId = await Guest.getPartyId(req);
            if (!partyId) return new Response(undefined, { status: 400 });
            const videoId = await req.text();
            if (!videoId) return new Response(undefined, { status: 400 });

            //TODO: don't double insert (neither same user twice in a row, nor same video twice at all)

            const queuedAt = new Date().getTime();

            const videoInfo = await db.query.videos.findFirst({
                where: eq(videos.id, videoId),
                with: { thumbnails: { columns: { width: true, url: true } } },
            });
            if (!videoInfo) return new Response(undefined, { status: 400 });

            await db.insert(queues).values({
                partyId,
                videoId,
                queuedBy: sessionId,
                queuedAt,
            });
            const message: Events = { ...videoInfo, queuedAt };
            for (const controllerId in streamSessions[partyId])
                streamSessions[partyId][controllerId]?.enqueue(
                    `data: ${JSON.stringify(message)}\n\n`,
                );
            return new Response();
    });

    app.get("/queue/vote", async (c) => {
        const req = c.req.raw;
            const sessionId = getSessionId(req);
            if (!sessionId) return new Response(undefined, { status: 400 });
            const partyId = getPartyIdFromHeader(req);
            if (!partyId) return new Response(undefined, { status: 400 });

            const guestVotes = await db.query.votes.findMany({
                where: eq(votes.sessionId, sessionId),
                with: {
                    queueEntry: {
                        columns: {
                            videoId: true,
                            partyId: true,
                            playedAt: true,
                        },
                    },
                },
            });

            const ownVotes: OwnVote[] = guestVotes
                //TODO: maybe don't filter in memory?
                .filter(
                    (vote) =>
                        vote.queueEntry.partyId === partyId &&
                        !vote.queueEntry.playedAt,
                )
                .map((vote) => ({
                    video: vote.queueEntry.videoId,
                    positive: vote.positive,
                }));
            return new Response(JSON.stringify(ownVotes));
    });

    app.post("/queue/vote", async (c) => {
        const req = c.req.raw;
            const sessionId = getSessionId(req);
            if (!sessionId) return new Response(undefined, { status: 400 });
            const partyId = await Guest.getPartyId(req);
            if (!partyId) return new Response(undefined, { status: 400 });
            const { videoId, vote } = (await req.json()) as PlacedVote;

            const queueEntry = await db.query.queues.findFirst({
                where: and(
                    eq(queues.partyId, partyId),
                    eq(queues.videoId, videoId),
                    isNull(queues.playedAt),
                    isNull(queues.skippedAt),
                ),
                columns: { id: true },
            });
            if (!queueEntry?.id)
                return new Response(undefined, { status: 400 });

            if (vote === "0")
                await db
                    .delete(votes)
                    .where(
                        and(
                            eq(votes.queueEntry, queueEntry.id),
                            eq(votes.sessionId, sessionId),
                        ),
                    );
            else
                await db
                    .insert(votes)
                    .values({
                        queueEntry: queueEntry.id,
                        sessionId,
                        positive: vote === "1" ? true : false,
                    })
                    .onConflictDoUpdate({
                        target: [votes.queueEntry, votes.sessionId],
                        set: {
                            positive: vote === "1" ? true : false,
                        },
                    });
            const videoVotes = await db.query.queues.findFirst({
                where: and(
                    eq(queues.id, queueEntry.id),
                    eq(queues.videoId, videoId),
                    isNull(queues.playedAt),
                    isNull(queues.skippedAt),
                ),
                columns: { videoId: true },
                with: { votes: { columns: { positive: true } } },
            });

            const accumulatedVotes: Events = {
                videoId,
                votes: videoVotes?.votes.reduce(
                    (acc, curr) => (curr.positive ? acc + 1 : acc - 1),
                    0,
                ),
            };

            for (const controllerId in streamSessions[partyId])
                streamSessions[partyId][controllerId]?.enqueue(
                    `data: ${JSON.stringify(accumulatedVotes)}\n\n`,
                );
            return new Response();
    });
};
