/* @refresh reload */
import { render } from "preact";
import { Login } from "./Login";
import { Register } from "./Register";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(
        "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
    );
}

function App() {
    return (
        <>
            <Login />
            <Register />
        </>
    );
}

render(<App />, root!);
