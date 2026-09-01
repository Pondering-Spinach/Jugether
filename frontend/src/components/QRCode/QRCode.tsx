import { useEffect, useRef } from "preact/hooks";
import type { JSX } from "preact/jsx-runtime";
import QrCodeWithLogo from "qrcode-with-logos";

function QRCode({
    class: classNames,
    content,
}: {
    class: JSX.HTMLAttributes<HTMLImageElement>["class"];
    content: string;
}) {
    const image = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (image.current)
            new QrCodeWithLogo({ content, image: image.current });
    }, [content]);

    return (
        <img
            class={classNames}
            style={{ "image-rendering": "crisp-edges" }}
            ref={image}
        />
    );
}

export default QRCode;
