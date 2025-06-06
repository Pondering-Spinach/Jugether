import type { JSXInternal } from "node_modules/preact/src/jsx";
import { useEffect, useRef, useState } from "preact/hooks";
import {
    IoPause,
    IoPauseOutline,
    IoPlay,
    IoPlayOutline,
    IoPlaySkipForwardOutline,
} from "react-icons/io5";
import { useShallow } from "zustand/shallow";
import { queueStore } from "./store";

export function Player({
    class: _class,
    enableControls,
}: {
    class?: JSXInternal.Signalish<string | undefined>;
    enableControls?: boolean;
}) {
    const [paused, setPaused] = useState<boolean>(true);
    const [audioSources, setAudioSources] = useState<Record<string, string>>(
        {},
    );

    const { playing, start, end } = queueStore(
        useShallow((store) => ({
            playing: store.playing,
            start: store.start,
            end: store.end,
        })),
    );
    const firstInQueue = queueStore((store) => store.entries[0]?.id);

    const playerRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (playerRef.current?.paused && !paused) playerRef.current?.play();
        else if (!playerRef.current?.paused && paused)
            playerRef.current?.pause();
    }, [paused]);

    useEffect(() => {
        if (!paused) playerRef.current?.play();

        if (!playing?.id || audioSources[playing?.id]) return;

        //TODO: maybe debounce
        enableControls &&
            fetch("/audioUrl?id=" + encodeURIComponent(playing.id))
                .then((resp) => resp.text())
                .then((audioLink) =>
                    setAudioSources((sources) => ({
                        ...sources,
                        [playing.id]: audioLink,
                    })),
                );
    }, [playing?.id]);

    useEffect(() => {
        if (audioSources[firstInQueue]) return;

        //TODO: maybe debounce
        enableControls &&
            fetch("/audioUrl?id=" + encodeURIComponent(firstInQueue))
                .then((resp) => resp.text())
                .then((audioLink) =>
                    setAudioSources((sources) => ({
                        ...sources,
                        [firstInQueue]: audioLink,
                    })),
                );
    }, [firstInQueue]);

    function nextSong() {
        if (playing) {
            fetch("/queue/played", {
                method: "PUT",
                body: playing.id,
            });
            end(playing?.id);
        }

        if (firstInQueue) {
            fetch("/queue/start", {
                method: "PUT",
                body: firstInQueue,
            });
            start(firstInQueue);
            return;
        } else setPaused(true);
    }

    return (
        <div class={_class}>
            {enableControls && (
                <audio
                    ref={playerRef}
                    controls={false}
                    src={audioSources[playing?.id]}
                    onPlay={() => {
                        fetch("/queue/start", {
                            method: "PUT",
                            body: playing.id,
                        });
                    }}
                    onEnded={nextSong}
                />
            )}
            <div
                class={`card md:card-side ${
                    enableControls ? "" : "md:max-h-48"
                } bg-base-100 shadow-sm`}
            >
                {playing && (
                    <figure>
                        <img
                            src={
                                playing?.thumbnails?.reduce((acc, curr) =>
                                    curr.width > acc.width ? curr : acc,
                                )?.url
                            }
                            alt="now playing"
                        />
                    </figure>
                )}
                <div class="card-body gap-4 md:gap-8 justify-between min-w-96">
                    <h2 class="card-title">{playing?.title}</h2>
                    {enableControls && (
                        <div class="flex flex-col gap-4 md:gap-8">
                            <div class="card-actions self-center">
                                <button
                                    class={
                                        "btn btn-primary" +
                                        (paused ? "" : " btn-soft") +
                                        (audioSources[playing?.id!] ||
                                        (!playing && audioSources[firstInQueue])
                                            ? ""
                                            : " btn-disabled")
                                    }
                                    onClick={() => {
                                        if (!playing) nextSong();
                                        setPaused(false);
                                    }}
                                >
                                    {paused ? (
                                        <IoPlayOutline class="h-8 w-8" />
                                    ) : (
                                        <IoPlay class="h-8 w-8" />
                                    )}
                                </button>
                                <button
                                    class={
                                        "btn btn-primary " +
                                        (paused ? "btn-soft" : "")
                                    }
                                    onClick={() => {
                                        setPaused(true);
                                    }}
                                >
                                    {paused ? (
                                        <IoPause class="h-8 w-8" />
                                    ) : (
                                        <IoPauseOutline class="h-8 w-8" />
                                    )}
                                </button>
                                <button
                                    class={
                                        "btn btn-primary" +
                                        (audioSources[firstInQueue]
                                            ? ""
                                            : " btn-disabled")
                                    }
                                    onClick={nextSong}
                                >
                                    <IoPlaySkipForwardOutline class="h-8 w-8" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
