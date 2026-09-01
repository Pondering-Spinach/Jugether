export const thumbnailUrl = (
    videoId: string,
    quality: "hqdefault" | "hq720" = "hqdefault",
) => `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${quality}.jpg`;
