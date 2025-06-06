export type Video = {
    id: string;
    url: string | null;
    duration: number | null;
    channel: string | null;
    channel_id: string | null;
    channel_url: string | null;
    title: string | null;
    channel_is_verified: boolean | null;
    thumbnails: {
        url: string | null;
        width: number | null;
    }[];
};
