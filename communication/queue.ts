import type { Video } from "./common";

export type QueueVideo = Video & {
    queuedAt: number;
    startedAt: number | null;
    votes: number;
};

export type PlacedVote = { videoId: string; vote: "0" | "1" | "-1" };

export type OwnVote = { video: string; positive: boolean };

export type Events =
    | { started: string }
    | {
          played: string;
      }
    | QueueVideo
    | {
          videoId: string;
          votes: number;
      }
    | { deleted: string };
