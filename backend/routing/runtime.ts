import type { Server } from "bun";

/** Runtime details that routes need without depending on Bun's Server API. */
export type RuntimeBindings = {
    clientIp?: string;
};

export const getRuntimeBindings = (
    request: Request,
    server: Server<unknown>,
): RuntimeBindings => ({
    clientIp: server.requestIP(request)?.address,
});
