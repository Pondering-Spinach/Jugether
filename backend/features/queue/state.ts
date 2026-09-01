export const streamControllers = new Set<ReadableStreamDefaultController>();

export function broadcast(message: unknown) {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    for (const controller of streamControllers) controller.enqueue(data);
}
