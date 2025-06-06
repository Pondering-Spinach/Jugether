import type { QueueVideo } from "communication/queue";
import { create } from "zustand";

type QueueStore = {
    playing: QueueVideo | null;
    entries: QueueVideo[];
    votes: Record<string, "up" | "down">;
    start: (id: string) => void;
    end: (id: string) => void;
    delete: (id: string) => void;
    add: (entry: QueueVideo) => void;
    updateVotes: (id: string, votes: number) => void;
    vote: (id: string, direction: "up" | "down") => void;
};

const filterObject = <T extends Object>(object: T, key: keyof T) =>
    Object.fromEntries(
        Object.entries(object).filter(([entryId]) => entryId !== key),
    ) as T;

const sortQueue = (queue: QueueVideo[]) =>
    queue.toSorted(
        (entryA, entryB) =>
            (entryA.startedAt ?? Infinity) - (entryB.startedAt ?? Infinity) ||
            (entryB.votes ?? 0) - (entryA.votes ?? 0) ||
            (entryA.queuedAt ?? Infinity) - (entryB.queuedAt ?? Infinity),
    );

export const queueStore = create<QueueStore>()((set) => ({
    playing: null,
    entries: [],
    votes: {},
    start: (id) => {
        set(({ playing, entries, votes }) => ({
            playing:
                playing?.id === id
                    ? playing
                    : entries.find((entry) => entry.id === id),
            entries: entries.filter((entry) => entry.id !== id),
            votes: filterObject(votes, id),
        }));
    },
    end: (id) => {
        set(({ playing }) => ({
            playing: playing?.id === id ? null : playing,
        }));
    },
    delete: (id) => {
        set(({ playing, entries, votes }) => ({
            playing: playing?.id === id ? null : playing,
            entries: entries.filter((entry) => entry.id !== id),
            votes: filterObject(votes, id),
        }));
    },
    add: (entry: QueueVideo) => {
        set(({ entries }) => ({ entries: sortQueue(entries.concat(entry)) }));
    },
    updateVotes: (id, votes) => {
        set(({ entries }) => ({
            entries: sortQueue(
                entries.map((entry) =>
                    entry.id === id ? { ...entry, votes } : entry,
                ),
            ),
        }));
    },
    vote: (id, direction) => {
        set(({ votes }) => ({
            votes:
                votes[id] === direction
                    ? filterObject(votes, id)
                    : { ...votes, [id]: direction },
        }));
    },
}));
