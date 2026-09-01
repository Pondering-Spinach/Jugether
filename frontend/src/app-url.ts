export const appUrl = (path = "") =>
    `${import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL}${path}`;
