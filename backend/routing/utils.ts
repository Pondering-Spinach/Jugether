import type { RouteDeclaration } from "./types";

export const endpoint =
    (method: string, pathname: string): RouteDeclaration[0] =>
    (url, reqMethod) =>
        reqMethod === method && url.pathname === pathname;

export const getSessionId = (req: Request) =>
    req.headers.get("Cookie")?.match(/(?:sessionId=)([^;]*)(?:$|;)/)?.[1];
