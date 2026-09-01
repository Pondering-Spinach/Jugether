import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { GiFireBomb, GiMineExplosion } from "react-icons/gi";
import {
    IoAddOutline,
    IoArrowBackOutline,
    IoQrCode,
    IoTrashBinOutline,
} from "react-icons/io5";
import { appUrl } from "../app-url";
import QRCode from "./QRCode/QRCode";
import QRModal from "./QRCode/QRModal";
import { List } from "./Queue/List";
import { Player } from "./Queue/Player";
import VideoSearch from "./Queue/VideoSearch";
import { useQueue } from "./Queue/useQueue";

export function PartyPage({ host = false }: { host?: boolean }) {
    const [overlaySearch, setOverlaySearch] = useState(false);
    const qrDialogRef = useRef<HTMLDialogElement>(null);
    const deletionDialogRef = useRef<HTMLDialogElement>(null);
    const invitation = `${location.origin}${appUrl("/party?id=" + new URL(location.href).searchParams.get("id"))}`;

    const closeQRModal = useCallback(() => qrDialogRef.current?.close(), []);
    const closeDeletionModal = useCallback(
        () => deletionDialogRef.current?.close(),
        [],
    );

    useEffect(() => {
        const closeDialogs = () => {
            setOverlaySearch(false);
            closeQRModal();
            closeDeletionModal();
        };
        addEventListener("popstate", closeDialogs);
        return () => removeEventListener("popstate", closeDialogs);
    }, [closeDeletionModal, closeQRModal]);

    useQueue();

    return (
        <>
            <button
                class={`btn btn-circle btn-accent fixed md:left-7 md:right-auto bottom-8 md:top-7 z-40 ${overlaySearch ? "left-4 top-9 size-8 md:size-12" : "inset-x-0 mx-auto size-12"}`}
                onClick={() => {
                    setOverlaySearch((visible) => !visible);
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
                    class={`btn btn-circle btn-info fixed size-12 right-8 bottom-8 md:top-8 z-40 ${host ? "lg:hidden" : ""}`}
                    onClick={() => {
                        qrDialogRef.current?.showModal();
                        history.pushState({}, "");
                    }}
                >
                    <IoQrCode class="h-8 w-8" />
                </button>
            )}
            <div
                class={
                    host
                        ? "flex flex-wrap md:p-16 lg:p-4 xl:p-8 lg:gap-4 xl:gap-8 lg:flex-nowrap lg:flex-row-reverse justify-around"
                        : `pb-24 md:p-16 flex flex-col md:gap-8${overlaySearch ? " hidden" : ""}`
                }
            >
                {host && (
                    <QRCode
                        class="hidden lg:block h-full max-h-80 lg:sticky lg:top-4"
                        content={invitation}
                    />
                )}
                <div
                    class={
                        host
                            ? `flex flex-col w-full pb-24 md:pb-0 md:gap-8${overlaySearch ? " hidden" : ""}`
                            : ""
                    }
                >
                    <Player enableControls={host} />
                    <List enableDelete={host} />
                    {host && (
                        <button
                            class="btn btn-circle btn-outline btn-error self-center mt-6 md:mt-0"
                            onClick={() => {
                                deletionDialogRef.current?.showModal();
                                history.pushState({}, "");
                            }}
                        >
                            <IoTrashBinOutline class="w-6 h-6" />
                        </button>
                    )}
                </div>
                <div
                    class={
                        host
                            ? overlaySearch
                                ? "w-full md:-m-16 lg:-m-4 xl:-m-8"
                                : "hidden"
                            : "hidden"
                    }
                >
                    <VideoSearch focusInput={overlaySearch} />
                </div>
            </div>
            {!host && (
                <div class={overlaySearch ? "" : "hidden"}>
                    <VideoSearch focusInput={overlaySearch} />
                </div>
            )}
            <QRModal dialogRef={qrDialogRef} content={invitation} />
            {host && (
                <dialog
                    class="m-auto p-4 rounded-2xl backdrop:backdrop-blur-md"
                    ref={deletionDialogRef}
                    onClick={(event) => {
                        if (event.target === event.currentTarget)
                            deletionDialogRef.current?.close();
                    }}
                >
                    <button
                        class="btn btn-error"
                        onClick={() =>
                            fetch(appUrl("/party"), { method: "DELETE" })
                                .then((response) => response.text())
                                .then((partyId) => {
                                    location.href = appUrl(
                                        `/host?id=${partyId}`,
                                    );
                                })
                        }
                    >
                        <IoTrashBinOutline class="w-8 h-8" />
                        <GiFireBomb class="w-8 h-8" />
                        <GiMineExplosion class="w-8 h-8" />
                    </button>
                </dialog>
            )}
        </>
    );
}
