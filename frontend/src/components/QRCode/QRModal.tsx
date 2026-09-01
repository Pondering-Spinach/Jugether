import type { RefObject } from "preact";
import QRCode from "./QRCode";

function QRModal({
    dialogRef,
    content,
}: {
    dialogRef: RefObject<HTMLDialogElement>;
    content: string;
}) {
    return (
        <dialog
            class="m-auto backdrop:backdrop-blur-md"
            ref={dialogRef}
            onClick={(event) => {
                if (event.target === event.currentTarget)
                    dialogRef.current?.close();
            }}
        >
            <QRCode class="max-h-80" content={content} />
        </dialog>
    );
}

export default QRModal;
