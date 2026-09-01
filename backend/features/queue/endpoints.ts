import type {
    Events,
    OwnVote,
    PlacedVote,
    QueueVideo,
} from "communication/queue";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../../db";
import type { App } from "../../routing/app";
import { getSessionId } from "../../routing/utils";
import { getAccessiblePartyId, requireHost } from "../party/access";
import { getActivePartyId } from "../party/services";
import { Guest } from "../user/services";
import { videos } from "../ytdlp/db";
import { queues, votes } from "./db";
import { broadcast, streamControllers } from "./state";

type VoteIdentity = { partyId: string; voterId: string };

const getVoteIdentity = async (req: Request): Promise<VoteIdentity | null> => {
    const userId = await requireHost(req);
    if (userId) {
        const partyId = await getActivePartyId();
        return partyId ? { partyId, voterId: `host:${userId}` } : null;
    }
    const partyId = await Guest.getPartyId(req);
    const sessionId = getSessionId(req);
    return partyId && sessionId ? { partyId, voterId: sessionId } : null;
};

export const registerQueueRoutes = (app: App) => {
    app.get("/queue", async (c) => {
        const partyId = await getAccessiblePartyId(c.req.raw);
        if (!partyId) return new Response(undefined, { status: 401 });
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
        const entries: QueueVideo[] = queuedVideos.map((entry) => ({
            ...entry.video,
            startedAt: entry.startedAt,
            queuedAt: entry.queuedAt,
            votes: entry.votes.reduce(
                (total, vote) => total + (vote.positive ? 1 : -1),
                0,
            ),
        }));
        entries.sort(
            (a, b) =>
                (a.startedAt ?? Infinity) - (b.startedAt ?? Infinity) ||
                (b.votes ?? 0) - (a.votes ?? 0) ||
                (a.queuedAt ?? Infinity) - (b.queuedAt ?? Infinity),
        );
        return Response.json(entries);
    });

    app.get("/queue/updates", async (c) => {
        if (!(await getAccessiblePartyId(c.req.raw)))
            return new Response(undefined, { status: 401 });
        let controller: ReadableStreamDefaultController;
        const stream = new ReadableStream({
            start(value) {
                controller = value;
                streamControllers.add(controller);
            },
            cancel() {
                streamControllers.delete(controller);
            },
        });
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream;charset=utf-8",
                Connection: "keep-alive",
            },
        });
    });

    app.put("/queue/start", async (c) => {
        const partyId = await getActivePartyId();
        if (!(await requireHost(c.req.raw)) || !partyId)
            return new Response(undefined, { status: 401 });
        const videoId = await c.req.raw.text();
        if (!videoId) return new Response(undefined, { status: 400 });
        await db
            .update(queues)
            .set({ startedAt: Date.now() })
            .where(
                and(
                    eq(queues.partyId, partyId),
                    eq(queues.videoId, videoId),
                    isNull(queues.startedAt),
                    isNull(queues.playedAt),
                    isNull(queues.skippedAt),
                ),
            );
        broadcast({ started: videoId } satisfies Events);
        return new Response();
    });

    app.put("/queue/played", async (c) => {
        const partyId = await getActivePartyId();
        if (!(await requireHost(c.req.raw)) || !partyId)
            return new Response(undefined, { status: 401 });
        const videoId = await c.req.raw.text();
        if (!videoId) return new Response(undefined, { status: 400 });
        await db
            .update(queues)
            .set({ playedAt: Date.now() })
            .where(
                and(
                    eq(queues.partyId, partyId),
                    eq(queues.videoId, videoId),
                    isNull(queues.playedAt),
                    isNull(queues.skippedAt),
                ),
            );
        broadcast({ played: videoId } satisfies Events);
        return new Response();
    });

    app.delete("/queue", async (c) => {
        const partyId = await getActivePartyId();
        if (!(await requireHost(c.req.raw)) || !partyId)
            return new Response(undefined, { status: 401 });
        const videoId = await c.req.raw.text();
        if (!videoId) return new Response(undefined, { status: 400 });
        await db
            .update(queues)
            .set({ skippedAt: Date.now() })
            .where(
                and(
                    eq(queues.partyId, partyId),
                    eq(queues.videoId, videoId),
                    isNull(queues.playedAt),
                    isNull(queues.skippedAt),
                ),
            );
        broadcast({ deleted: videoId } satisfies Events);
        return new Response();
    });

    app.post("/queue", async (c) => {
        const partyId = await getAccessiblePartyId(c.req.raw);
        if (!partyId) return new Response(undefined, { status: 401 });
        const videoId = await c.req.raw.text();
        if (!videoId) return new Response(undefined, { status: 400 });
        const videoInfo = await db.query.videos.findFirst({
            where: eq(videos.id, videoId),
            with: { thumbnails: { columns: { width: true, url: true } } },
        });
        if (!videoInfo) return new Response(undefined, { status: 400 });
        const queuedAt = Date.now();
        await db.insert(queues).values({ partyId, videoId, queuedAt });
        broadcast({
            ...videoInfo,
            queuedAt,
            startedAt: null,
            votes: 0,
        } satisfies Events);
        return new Response();
    });

    app.get("/queue/vote", async (c) => {
        const identity = await getVoteIdentity(c.req.raw);
        if (!identity) return new Response(undefined, { status: 401 });
        const ownVotes: OwnVote[] = await db
            .select({ video: queues.videoId, positive: votes.positive })
            .from(votes)
            .innerJoin(queues, eq(votes.queueEntry, queues.id))
            .where(
                and(
                    eq(votes.sessionId, identity.voterId),
                    eq(queues.partyId, identity.partyId),
                    or(isNull(queues.playedAt), eq(queues.playedAt, 0)),
                ),
            );
        return Response.json(ownVotes);
    });

    app.post("/queue/vote", async (c) => {
        const identity = await getVoteIdentity(c.req.raw);
        if (!identity) return new Response(undefined, { status: 401 });
        const { videoId, vote } = await c.req.json<PlacedVote>();
        const queueEntry = await db.query.queues.findFirst({
            where: and(
                eq(queues.partyId, identity.partyId),
                eq(queues.videoId, videoId),
                isNull(queues.playedAt),
                isNull(queues.skippedAt),
            ),
            columns: { id: true },
        });
        if (!queueEntry) return new Response(undefined, { status: 400 });
        if (vote === "0")
            await db
                .delete(votes)
                .where(
                    and(
                        eq(votes.queueEntry, queueEntry.id),
                        eq(votes.sessionId, identity.voterId),
                    ),
                );
        else
            await db
                .insert(votes)
                .values({
                    queueEntry: queueEntry.id,
                    sessionId: identity.voterId,
                    positive: vote === "1",
                })
                .onConflictDoUpdate({
                    target: [votes.queueEntry, votes.sessionId],
                    set: { positive: vote === "1" },
                });
        const videoVotes = await db.query.queues.findFirst({
            where: eq(queues.id, queueEntry.id),
            with: { votes: { columns: { positive: true } } },
        });
        const voteTotal = videoVotes?.votes.reduce(
            (total, item) => total + (item.positive ? 1 : -1),
            0,
        );
        if (voteTotal === undefined)
            return new Response(undefined, { status: 404 });
        broadcast({ videoId, votes: voteTotal } satisfies Events);
        return new Response();
    });
};
