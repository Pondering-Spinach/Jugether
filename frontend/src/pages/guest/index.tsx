/* @refresh reload */
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useQueue } from "../../components/Queue/useQueue";
import VideoSearch from "../../components/Queue/VideoSearch";

import { render } from "preact";
import { IoAddOutline, IoArrowBackOutline, IoQrCode } from "react-icons/io5";
import QRModal from "src/components/QRCode/QRModal";
import { List } from "src/components/Queue/List";
import { Player } from "src/components/Queue/Player";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(
        "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
    );
}

function App() {
    const [overlaySearch, setOverlaySearch] = useState(false);

    const dialogRef = useRef<HTMLDialogElement>(null);

    const closeQRModal = useCallback(() => {
        if (dialogRef.current?.open) {
            dialogRef.current.close();
            removeEventListener("click", closeQRModal);
        }
    }, []);

    useEffect(() => {
        addEventListener("popstate", () => {
            setOverlaySearch(false);
            dialogRef.current?.close();
            removeEventListener("click", closeQRModal);
        });
    }, []);

    useQueue();

    return (
        <>
            <button
                class={`btn btn-circle btn-accent fixed md:left-7 md:right-auto bottom-8 md:top-7 z-40 ${
                    overlaySearch
                        ? "left-4 top-9 size-8 md:size-12"
                        : "inset-x-0 mx-auto size-12 "
                }`}
                onClick={() => {
                    setOverlaySearch((x) => !x);
                    history.pushState({}, "");
                    scrollTo(0, 0);
                }}
            >
                {overlaySearch ? (
                    <IoArrowBackOutline class="h-full w-full" />
                ) : (
                    <IoAddOutline class="h-full w-full" />
                )}
            </button>
            {!overlaySearch && (
                <button
                    class="btn btn-circle btn-info fixed size-12 right-8 bottom-8 md:top-8 z-40"
                    onClick={() => {
                        dialogRef.current?.showModal();
                        history.pushState({}, "");
                        setTimeout(
                            () => addEventListener("click", closeQRModal),
                            100,
                        );
                    }}
                >
                    <IoQrCode class="h-8 w-8" />
                </button>
            )}
            <div
                class={
                    "pb-24 md:p-16 flex flex-col md:gap-8" +
                    (overlaySearch ? " hidden" : "")
                }
            >
                <Player />
                <List />
            </div>
            <div class={overlaySearch ? "" : "hidden"}>
                <VideoSearch focusInput={overlaySearch} />
            </div>
            <QRModal dialogRef={dialogRef} />
        </>
    );
}

render(<App />, root!);
