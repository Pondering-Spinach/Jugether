export function Login() {
    async function onSubmit(
        e: SubmitEvent & {
            currentTarget: HTMLFormElement;
            target: HTMLFormElement;
        },
    ) {
        e.preventDefault();
        const form = new FormData(e.target);
        const res = await fetch("/api/auth/sign-in/username", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                username: form.get("username"),
                password: form.get("password"),
            }),
        });
        if (res.ok) window.location.href = "/";
        else e.target.reset();
    }

    return (
        <form class="flex gap-4 m-4" onSubmit={onSubmit}>
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
