export function TrackName({
    artist,
    song,
    class: className,
}: {
    artist: string;
    song: string;
    class?: string;
}) {
    const text = `${artist} - ${song}`;
    const breakAfterSeparator = text.length > 36;

    return (
        <span class={className} title={text}>
            {artist} -{breakAfterSeparator ? <br /> : " "}
            {song}
        </span>
    );
}
