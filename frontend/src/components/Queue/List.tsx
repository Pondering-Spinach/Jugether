import type { JSX } from "preact/jsx-runtime";
import {
    IoHeart,
    IoHeartDislike,
    IoHeartDislikeOutline,
    IoHeartOutline,
    IoTrashBinOutline,
} from "react-icons/io5";
import { useShallow } from "zustand/react/shallow";
import { queueStore } from "./store";
import { updateVote } from "./useQueue";

function deleteVideo(videoId: string) {
    return fetch("/queue", { method: "DELETE", body: videoId });
}

export function List({
    class: _class,
    enableDelete,
}: {
    class?: JSX.HTMLAttributes<HTMLUListElement>["class"];
    enableDelete?: boolean;
}) {
    const videos = queueStore(useShallow((store) => store.entries));
    const votes = queueStore(useShallow((store) => store.votes));

    return (
        <ul class={_class + " list w-full bg-base-100 rounded-box shadow-md"}>
            {videos.map((video) => (
                <li key={video.id} class="list-row items-center">
                    <div class="flex items-center">
                        <img
                            class="w-16 md:w-24 rounded-box"
                            src={
                                video.thumbnails?.reduce((acc, curr) =>
                                    curr.width > acc.width ? curr : acc,
                                )?.url
                            }
                        />
                    </div>
                    <div class="flex items-center">
                        <p class="max-h-12 leading-6 md:leading-12 overflow-hidden text-ellipsis">
                            {video.title}
                        </p>
                    </div>
                    <div class="flex justify-between items-center gap-2 h-12 border-0 rounded-2xl">
                        <button
                            class="btn btn-circle btn-ghost p-1"
                            disabled={votes[video.id] === "down"}
                            onClick={updateVote(video.id, "up")}
                        >
                            {votes[video.id] ? (
                                votes[video.id] === "up" ? (
                                    <IoHeart class="h-full w-full fill-green-300" />
                                ) : (
                                    <IoHeartOutline class="h-full w-full" />
                                )
                            ) : (
                                <IoHeartOutline class="h-full w-full" />
                            )}
                        </button>
                        <p class="w-4 text-center whitespace-nowrap">
                            {video.votes ?? 0}
                        </p>
                        <button
                            class="btn btn-circle btn-ghost p-1"
                            disabled={votes[video.id] === "up"}
                            onClick={updateVote(video.id, "down")}
                        >
                            {votes[video.id] ? (
                                votes[video.id] === "down" ? (
                                    <IoHeartDislike class="h-full w-full fill-red-300" />
                                ) : (
                                    <IoHeartDislikeOutline class="h-full w-full" />
                                )
                            ) : (
                                <IoHeartDislikeOutline class="h-full w-full" />
                            )}
                        </button>
                    </div>
                    {enableDelete && (
                        <div class="flex items-center">
                            <button
                                class="btn btn-circle btn-ghost p-1"
                                onClick={() => deleteVideo(video.id)}
                            >
                                <IoTrashBinOutline class="h-full w-full" />
                            </button>
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}
