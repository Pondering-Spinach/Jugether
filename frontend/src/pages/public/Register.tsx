import { appUrl } from "../../app-url";

export function Register() {
    async function onSubmit(
        e: SubmitEvent & {
            currentTarget: HTMLFormElement;
            target: HTMLFormElement;
        },
    ) {
        e.preventDefault();
        const form = new FormData(e.target);
        const username = String(form.get("username"));
        // Better Auth's username plugin is built on email/password. Local-only
        // accounts do not collect an email address, so use a stable internal one.
        const email = `${btoa(username).replaceAll("=", "")}@local.test`;
        const res = await fetch(appUrl("/api/auth/sign-up/email"), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email,
                name: username,
                username,
                password: form.get("password"),
            }),
        });
        if (res.ok) window.location.href = appUrl();
        else e.target.reset();
    }

    return (
        <form class="flex gap-4 m-4" onSubmit={onSubmit}>
            <input
                class="input input-bordered"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_.]+"
                placeholder="username"
            />
            <input
                class="input input-bordered"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="password (8+ characters)"
            />
            <button class="btn btn-primary">Register</button>
        </form>
    );
}
