import type { RefObject } from "preact";
import QRCode from "./QRCode";

function QRModal({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement> }) {
    return (
        <dialog class="m-auto backdrop:backdrop-blur-md" ref={dialogRef}>
            <QRCode
                class="max-h-80"
                options={{
                    content:
                        window.location.origin +
                        "/party?id=" +
                        new URL(window.location.toString()).searchParams.get(
                            "id",
                        ),
                }}
            />
        </dialog>
    );
}

export default QRModal;
