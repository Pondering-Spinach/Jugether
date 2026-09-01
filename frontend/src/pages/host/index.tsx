/* @refresh reload */
import { render } from "preact";
import { PartyPage } from "../../components/PartyPage";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement))
    throw new Error("Root element not found");

render(<PartyPage host />, root!);
