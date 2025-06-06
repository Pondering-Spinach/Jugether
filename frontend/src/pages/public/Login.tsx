export function Login() {
    async function onSubmit(
        e: SubmitEvent & {
            currentTarget: HTMLFormElement;
            target: HTMLFormElement;
        },
    ) {
        e.preventDefault();
        const res = await fetch("/login", {
            method: "POST",
            body: new FormData(e.target),
        });
        if (res.status === 200) {
            window.location.href = "/host?id=" + (await res.text());
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
            <button class="btn btn-primary">Login</button>
        </form>
    );
}
