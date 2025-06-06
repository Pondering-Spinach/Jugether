import type { Video } from "communication/common";
import { Duration } from "luxon";
import { useEffect, useRef, useState } from "preact/hooks";
import { IoAddOutline, IoHeart, IoHeartOutline } from "react-icons/io5";
import { useShallow } from "zustand/shallow";
import { queueStore } from "./store";
import { updateVote } from "./useQueue";

function VideoSearch({ focusInput }: { focusInput: boolean }) {
    const [searchResults, setSearchResults] = useState<Video[] | null>();

    const [isChannelView, setIsChannelView] = useState<string>();

    const playing = queueStore(useShallow((store) => store.playing));
    const entries = queueStore(useShallow((store) => store.entries));
    const votes = queueStore(useShallow((store) => store.votes));

    const searchInput = useRef<HTMLInputElement>(undefined!);
    const searchDebounce = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (focusInput) searchInput.current.focus();
    }, [focusInput]);

    async function triggerSearch(query: string) {
        if (!query) return;

        setSearchResults(null);
        const response = await fetch(
            "/search?query=" + encodeURIComponent(query),
        );
        setSearchResults(await response.json());
    }

    async function expandChannel(channelId: string) {
        if (!channelId) return;

        setSearchResults(null);
        const response = await fetch(
            "/searchChannel?query=" + encodeURIComponent(channelId),
        );
        setSearchResults(await response.json());
    }

    const queueVideo = (id: string) => () =>
        fetch("/queue", {
            method: "POST",
            body: id,
        });

    const viewCountFormatter = Intl.NumberFormat("en", {
        notation: "compact",
    });

    return (
        <div class="flex flex-col gap-12">
            <div class="w-full p-8 pl-16 md:pl-26 pb-6 backdrop-blur-md sticky top-0 z-30">
                <input
                    ref={searchInput}
                    autoFocus
                    onKeyPress={(e) => {
                        clearTimeout(searchDebounce.current);
                        searchDebounce.current = setTimeout(() => {
                            if (e.target.value.startsWith("@")) {
                                expandChannel(e.target.value);
                                setIsChannelView(e.target.value);
                            } else {
                                triggerSearch(e.target.value);
                                setIsChannelView(undefined);
                            }
                        }, 1_000) as unknown as number;
                    }}
                    type="text"
                    placeholder="look for videos to add"
                    class="input input-bordered w-full"
                />
            </div>
            <div class="p-8 pt-0 flex flex-wrap justify-evenly gap-12">
                {searchResults === null ? (
                    <p class="loading loading-spinner loading-xl" />
                ) : (
                    searchResults?.map((result) => {
                        const duration = Duration.fromObject({
                            hours: 0,
                            minutes: 0,
                            seconds: result.duration,
                        }).normalize();
                        const thumbnail = result.thumbnails.at(-1)?.url;
                        const queueEntry = entries.find(
                            (entry) => entry.id === result.id,
                        );
                        return (
                            <div
                                key={result.id}
                                class="card bg-base-100 w-96 shadow-xl"
                            >
                                <figure>
                                    <img
                                        loading="lazy"
                                        src={
                                            thumbnail?.startsWith("//")
                                                ? "https:" + thumbnail
                                                : thumbnail
                                        }
                                    />
                                </figure>
                                <div class="card-body">
                                    <h2 class="card-title">{result.title}</h2>
                                    <div>
                                        {result.is_live ? (
                                            <>
                                                live - {result.channel} (
                                                {viewCountFormatter.format(
                                                    result.concurrent_view_count,
                                                )}
                                                )
                                            </>
                                        ) : (
                                            <div class="flex">
                                                <p>
                                                    {duration.hours
                                                        ? duration.toFormat(
                                                              "hh:mm:ss",
                                                          )
                                                        : duration.toFormat(
                                                              "mm:ss",
                                                          )}
                                                </p>
                                                <p>
                                                    {viewCountFormatter.format(
                                                        result.view_count,
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div class="card-actions justify-between flex-e spa-even flex-nowrap overflow-hidden">
                                        <button
                                            class={`btn btn-secondary ${
                                                isChannelView
                                                    ? "btn-disabled"
                                                    : ""
                                            } ${
                                                result.channel
                                                    ? ""
                                                    : "invisible"
                                            }`}
                                            onClick={() => {
                                                searchInput.current.value =
                                                    result.uploader_id ??
                                                    result.channel;
                                                expandChannel(
                                                    result.uploader_id ??
                                                        "channel/" +
                                                            result.channel_id,
                                                );
                                                setIsChannelView(
                                                    result.uploader_id ??
                                                        "channel/" +
                                                            result.channel_id,
                                                );
                                            }}
                                        >
                                            {result.channel}
                                        </button>
                                        {queueEntry ? (
                                            <button
                                                class="btn btn-circle btn-ghost"
                                                disabled={
                                                    !!queueEntry.startedAt ||
                                                    votes[result.id] === "down"
                                                }
                                                onClick={updateVote(
                                                    result.id,
                                                    "up",
                                                )}
                                            >
                                                {votes[result.id] === "up" ? (
                                                    <IoHeart
                                                        class={
                                                            "h-full w-full fill-green-300"
                                                        }
                                                    />
                                                ) : (
                                                    <IoHeartOutline class="h-full w-full" />
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                class={`btn btn-circle btn-primary ${
                                                    !result.duration ||
                                                    playing?.id === result.id
                                                        ? "btn-disabled"
                                                        : ""
                                                }`}
                                                onClick={queueVideo(result.id)}
                                            >
                                                <IoAddOutline class="h-full w-full" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
export default VideoSearch;
