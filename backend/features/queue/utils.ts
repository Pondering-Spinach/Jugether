export const getPartyIdFromHeader = (req: Request) =>
    new URL(req.headers.get("referer") ?? "").searchParams.get("id");
