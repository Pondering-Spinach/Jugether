/** Runtime details that routes need without depending on a server implementation. */
export type RuntimeBindings = {
    clientIp?: string;
};

export const getRuntimeBindings = (incoming: { socket: { remoteAddress?: string } }): RuntimeBindings => ({
    clientIp: incoming.socket.remoteAddress,
});
