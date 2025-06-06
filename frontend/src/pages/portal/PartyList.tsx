import { useEffect, useState } from "preact/hooks";

function PartyList() {
    //TODO: type
    const [parties, setParties] = useState<any[]>();

    async function onSubmit(
        e: SubmitEvent & {
            currentTarget: HTMLFormElement;
            target: HTMLFormElement;
        },
    ) {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.set(
            "start",
            new Date(formData.get("start") as string).getTime().toString(),
        );
        const res = await fetch("/party", {
            method: "POST",
            body: formData,
        });
        if (res.status === 200) {
            //TODO: reset to now
            e.target.reset();
            fetchParties();
        }
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    const timestamp = now.toISOString();
    const localtimeString = timestamp.substring(0, timestamp.indexOf("T") + 6);

    function fetchParties() {
        fetch("/parties")
            .then((res) => res.json())
            .then(setParties);
    }

    useEffect(fetchParties, []);

    return (
        <>
            <div class="m-4 flex flex-col gap-4">
                {parties?.map((party) => (
                    <div key={party.id} class="flex">
                        <div>{new Date(party.begins).toString()}</div>
                        <div>{new Date(party.ends).toString()}</div>
                        <button
                            class="btn btn-primary"
                            onClick={() => window.open("/host?id=" + party.id)}
                        >
                            Host
                        </button>
                    </div>
                ))}
            </div>
            <form
                class="flex gap-4 m-4"
                action=""
                method="post"
                onSubmit={onSubmit}
            >
                {/* //TODO: enable "now" vs "custom" */}
                <input
                    class="input"
                    type="datetime-local"
                    name="start"
                    min={localtimeString}
                    value={localtimeString}
                    required
                />
                <input
                    class="input"
                    type="number"
                    name="duration"
                    min={1}
                    step={1}
                    value={1}
                    required
                />
                <button class="btn btn-primary">Create</button>
            </form>
        </>
    );
}

export default PartyList;
