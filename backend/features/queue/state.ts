type partyId = string;
type sessionId = string;

export const streamSessions: Record<
    partyId,
    Record<sessionId, ReadableStreamDefaultController>
> = {};
