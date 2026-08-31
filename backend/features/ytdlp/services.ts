import { spawn } from "node:child_process";
import { ytdlpExec } from "./const";

const maxConcurrentYtdlpProcesses = 2;
let activeProcesses = 0;
const waitingProcesses: Array<() => void> = [];

const acquireProcessSlot = () =>
    new Promise<void>((resolve) => {
        const start = () => {
            activeProcesses++;
            resolve();
        };
        if (activeProcesses < maxConcurrentYtdlpProcesses) start();
        else waitingProcesses.push(start);
    });

const releaseProcessSlot = () => {
    activeProcesses--;
    waitingProcesses.shift()?.();
};

/** Run yt-dlp without invoking a shell; each value is a single argument. */
export async function runYtdlp(args: string[]) {
    await acquireProcessSlot();
    try {
        return await new Promise<string>((resolve, reject) => {
            const child = spawn(ytdlpExec(), args, {
                stdio: ["ignore", "pipe", "pipe"],
            });
            const stdout: Buffer[] = [];
            const stderr: Buffer[] = [];

            child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
            child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
            child.once("error", reject);
            child.once("close", (code) => {
                if (code === 0) resolve(Buffer.concat(stdout).toString("utf8"));
                else
                    reject(
                        new Error(
                            `yt-dlp exited with code ${code}: ${Buffer.concat(stderr).toString("utf8")}`,
                        ),
                    );
            });
        });
    } finally {
        releaseProcessSlot();
    }
}
