export function Register() {
    async function onSubmit(
        e: SubmitEvent & {
            currentTarget: HTMLFormElement;
            target: HTMLFormElement;
        },
    ) {
        e.preventDefault();
        const res = await fetch("/register", {
            method: "POST",
            body: new FormData(e.target),
        });
        if (res.status === 200) {
            window.open("/portal");
        } else {
            e.target.reset();
        }
    }

    return (
        <form
            class="flex gap-4 m-4"
            action="/login"
            method="post"
            onSubmit={onSubmit}
        >
            <input
                class="input input-bordered"
                name="username"
                type="text"
                required
                placeholder="username"
            />
            <input
                class="input input-bordered"
                name="password"
                type="password"
                required
                placeholder="password"
            />
            <button class="btn btn-primary">Register</button>
        </form>
    );
}
