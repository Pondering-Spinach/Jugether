export const getSessionId = (req: Request) =>
    req.headers.get("Cookie")?.match(/(?:sessionId=)([^;]*)(?:$|;)/)?.[1];
