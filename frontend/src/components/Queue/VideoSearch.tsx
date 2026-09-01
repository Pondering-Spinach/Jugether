import type { Video } from "communication/common";
import { useEffect, useRef, useState } from "preact/hooks";
import { IoAddOutline, IoHeart, IoHeartOutline } from "react-icons/io5";
import { useShallow } from "zustand/shallow";
import { appUrl } from "../../app-url";
import { queueStore } from "./store";
import { thumbnailUrl } from "./thumbnail";
import { TrackName } from "./TrackName";
import { updateVote } from "./useQueue";

function VideoSearch({ focusInput }: { focusInput: boolean }) {
    const [searchResults, setSearchResults] = useState<Video[] | null>();
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
            appUrl("/search?query=" + encodeURIComponent(query)),
        );
        setSearchResults(await response.json());
    }

    const queueVideo = (id: string) => () =>
        fetch(appUrl("/queue"), { method: "POST", body: id });

    return (
        <div class="flex flex-col gap-8">
            <div class="w-full p-4 pl-16 pt-8 md:p-8 md:pl-16 md:pb-6 backdrop-blur-md sticky top-0 z-30">
                <input
                    ref={searchInput}
                    autoFocus
                    onInput={(e) => {
                        const query = (e.currentTarget as HTMLInputElement)
                            .value;
                        clearTimeout(searchDebounce.current);
                        searchDebounce.current = setTimeout(
                            () => triggerSearch(query),
                            1_000,
                        ) as unknown as number;
                    }}
                    type="text"
                    placeholder="search for songs to add"
                    class="input input-bordered w-full"
                />
            </div>
            <div class="px-4 pb-24 md:p-8 md:pt-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
                {searchResults === null ? (
                    <p class="loading loading-spinner loading-xl justify-self-center" />
                ) : (
                    searchResults?.map((result) => {
                        const queueEntry = entries.find(
                            (entry) => entry.id === result.id,
                        );
                        return (
                            <article
                                key={result.id}
                                class="card card-side bg-base-100 min-w-0 shadow-xl"
                            >
                                <figure class="w-28 shrink-0 self-stretch">
                                    <img
                                        loading="lazy"
                                        class="h-full w-full object-cover"
                                        src={thumbnailUrl(result.id)}
                                        alt=""
                                    />
                                </figure>
                                <div class="card-body min-w-0 p-4 justify-between gap-3">
                                    <h2 class="card-title leading-5 break-words">
                                        <TrackName
                                            artist={result.artist}
                                            song={result.song}
                                        />
                                    </h2>
                                    <div class="card-actions justify-end">
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
                                                    <IoHeart class="h-full w-full fill-green-300" />
                                                ) : (
                                                    <IoHeartOutline class="h-full w-full" />
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                class={`btn btn-circle btn-primary ${
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
                            </article>
                        );
                    })
                )}
            </div>
        </div>
    );
}
export default VideoSearch;
