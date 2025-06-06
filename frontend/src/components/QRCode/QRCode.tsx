import { useEffect } from "preact/hooks";
import type { JSX } from "preact/jsx-runtime";
import QrCodeWithLogo from "qrcode-with-logos";
import type { BaseOptions } from "qrcode-with-logos/types/src/core/types";

function QRCode({
    class: classNames,
    options,
}: {
    class: JSX.HTMLAttributes<HTMLImageElement>["class"];
    options: Omit<BaseOptions, "image">;
}) {
    useEffect(() => {
        new QrCodeWithLogo({
            ...options,
            image: document.getElementById("qrcode"),
        });
    }, []);

    return (
        <img
            class={classNames}
            style={{ "image-rendering": "crisp-edges" }}
            id="qrcode"
        />
    );
}

export default QRCode;
