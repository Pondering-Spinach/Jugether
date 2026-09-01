import type { Events, OwnVote, QueueVideo } from "communication/queue";
import { useEffect } from "preact/hooks";
import { queueStore } from "./store";

const voteDirectionMap = { undefined: "0", up: "1", down: "-1" };

export function updateVote(videoId: string, direction: "up" | "down") {
    return function () {
        queueStore.getState().vote(videoId, direction);
        const voteDirection = queueStore.getState().votes[videoId];
        const voteAPIDirection = voteDirectionMap[voteDirection];
        fetch("/queue/vote", {
            method: "post",
            body: JSON.stringify({ videoId, vote: voteAPIDirection }),
        });
    };
}

export function useQueue() {
    const start = queueStore((store) => store.start);
    const end = queueStore((store) => store.end);
    const add = queueStore((store) => store.add);
    const delete_ = queueStore((store) => store.delete);
    const updateVotes = queueStore((store) => store.updateVotes);

    useEffect(() => {
        fetch("/queue")
            .then((resp) => resp.json())
            .then((entries: QueueVideo[]) => {
                if (entries[0]?.startedAt) {
                    queueStore.setState({
                        playing: entries[0],
                        entries: entries.slice(1),
                    });
                } else queueStore.setState({ entries });
            });

        fetch("/queue/vote")
            .then((resp) => resp.json())
            .then((votes: OwnVote[]) =>
                queueStore.setState({
                    votes: Object.fromEntries(
                        votes.map((vote) => [
                            vote.video,
                            vote.positive ? "up" : "down",
                        ]),
                    ),
                }),
            );

        //TODO: reconnect
        const events = new EventSource("/queue/updates");

        //TODO: handle messages properly
        events.addEventListener("message", (message) => {
            const parsedMessage = JSON.parse(message.data) as Events;
            if ("started" in parsedMessage) start(parsedMessage.started);
            else if ("played" in parsedMessage) end(parsedMessage.played);
            else if ("videoId" in parsedMessage)
                updateVotes(parsedMessage.videoId, parsedMessage.votes);
            else if ("deleted" in parsedMessage) delete_(parsedMessage.deleted);
            else add(parsedMessage);
        });
    }, []);
}
