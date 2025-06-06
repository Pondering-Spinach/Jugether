import type { Server } from "bun";

export type RouteDeclaration = [
    (url: URL, method: string) => boolean,
    (req: Request, url: URL, server: Server) => Response | Promise<Response>,
];
