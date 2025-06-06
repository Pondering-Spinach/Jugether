/* @refresh reload */
import { render } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { GiFireBomb, GiMineExplosion } from "react-icons/gi";
import {
    IoAddOutline,
    IoArrowBackOutline,
    IoQrCode,
    IoTrashBinOutline,
} from "react-icons/io5";
import QRCode from "src/components/QRCode/QRCode";
import QRModal from "src/components/QRCode/QRModal";
import { List } from "src/components/Queue/List";
import { Player } from "src/components/Queue/Player";
import VideoSearch from "src/components/Queue/VideoSearch";
import { useQueue } from "../../components/Queue/useQueue";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(
        "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
    );
}

function App() {
    const [overlaySearch, setOverlaySearch] = useState(false);

    const qrDialogRef = useRef<HTMLDialogElement>(null);
    const deletionDialogRef = useRef<HTMLDialogElement>(null);

    const closeQRModal = useCallback(() => {
        if (qrDialogRef.current?.open) {
            qrDialogRef.current.close();
            removeEventListener("click", closeQRModal);
        }
    }, []);

    const closeDeletionModal = useCallback(() => {
        if (deletionDialogRef.current?.open) {
            deletionDialogRef.current.close();
            removeEventListener("click", closeDeletionModal);
        }
    }, []);

    useEffect(() => {
        addEventListener("popstate", () => {
            qrDialogRef.current?.close();
            deletionDialogRef.current?.close();
            removeEventListener("click", closeQRModal);
            removeEventListener("click", closeDeletionModal);
        });

        //hack to keep QR code data in sync
        const targetNode = document.getElementById("qrcode");
        const config = { attributes: true, childList: false, subtree: false };
        const callback = (mutationList) => {
            for (const mutation of mutationList) {
                if (mutation.attributeName === "src") {
                    const src = targetNode?.getAttribute("src");
                    const otherTarget =
                        document.querySelector("#qrcode:not([src])");
                    otherTarget?.setAttribute("src", src);
                }
            }
        };
        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
        return () => observer.disconnect();
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
                    class="btn btn-circle btn-info fixed size-12 right-8 bottom-8 md:top-8 z-40 lg:hidden"
                    onClick={() => {
                        qrDialogRef.current?.showModal();
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
            <div class="flex flex-wrap md:p-16 lg:p-4 xl:p-8 lg:gap-4 xl:gap-8 lg:flex-nowrap lg:flex-row-reverse justify-around">
                <QRCode
                    class="hidden lg:block h-full max-h-80 lg:sticky lg:top-4"
                    options={{
                        content:
                            window.location.origin +
                            "/party?id=" +
                            new URL(
                                window.location.toString(),
                            ).searchParams.get("id"),
                    }}
                />
                <div
                    class={
                        "flex flex-col w-full pb-24 md:pb-0 md:gap-8" +
                        (overlaySearch ? " hidden" : "")
                    }
                >
                    <Player enableControls />
                    <List enableDelete />
                    <button
                        class="btn btn-circle btn-outline btn-error self-center mt-6 md:mt-0"
                        onClick={() => {
                            deletionDialogRef.current?.showModal();
                            history.pushState({}, "");
                            setTimeout(
                                () =>
                                    addEventListener(
                                        "click",
                                        closeDeletionModal,
                                    ),
                                100,
                            );
                        }}
                    >
                        <IoTrashBinOutline class="w-6 h-6" />
                    </button>
                </div>
                <div
                    class={
                        overlaySearch
                            ? "w-full md:-m-16 lg:-m-4 xl:-m-8"
                            : "hidden"
                    }
                >
                    <VideoSearch focusInput={overlaySearch} />
                </div>
            </div>
            <QRModal dialogRef={qrDialogRef} />
            <dialog
                class="m-auto p-4 rounded-2xl backdrop:backdrop-blur-md"
                ref={deletionDialogRef}
            >
                <button
                    class="btn btn-error"
                    onClick={() =>
                        fetch(
                            "/party?id=" +
                                new URL(
                                    window.location.toString(),
                                ).searchParams.get("id"),
                            { method: "DELETE" },
                        )
                            .then((res) => res.text())
                            .then(
                                (newPartyId) =>
                                    (window.location.href =
                                        "host?id=" + newPartyId),
                            )
                    }
                >
                    <IoTrashBinOutline class="w-8 h-8" />
                    <GiFireBomb class="w-8 h-8" />
                    <GiMineExplosion class="w-8 h-8" />
                </button>
            </dialog>
        </>
    );
}

render(<App />, root!);
