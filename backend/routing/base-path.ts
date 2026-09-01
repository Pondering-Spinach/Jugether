export const appPath = (path = "") =>
    `${process.env["APP_BASE_PATH"] ?? ""}${path}`;
