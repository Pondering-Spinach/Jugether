/* @refresh reload */
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Login } from "./Login";
import { Register } from "./Register";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(
        "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
    );
}

function App() {
    const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(
        null,
    );

    useEffect(() => {
        let cancelled = false;
        void fetch("/api/registration")
            .then(async (res) => {
                if (!res.ok) throw new Error("Unable to check registration");
                return (await res.json()) as { registrationOpen: boolean };
            })
            .then(({ registrationOpen }) => {
                if (!cancelled) setRegistrationOpen(registrationOpen);
            })
            // Fail closed: do not offer account creation if its status is unknown.
            .catch(() => {
                if (!cancelled) setRegistrationOpen(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (registrationOpen === null) return null;
    return (
        <main class="flex min-h-screen items-center justify-center">
            {registrationOpen ? <Register /> : <Login />}
        </main>
    );
}

render(<App />, root!);
