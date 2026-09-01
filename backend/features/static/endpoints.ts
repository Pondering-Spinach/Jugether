import { serveStatic } from "@hono/node-server/serve-static";
import { parties } from "db/schema";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import type { App } from "../../routing/app";
import { appPath } from "../../routing/base-path";
import { frontendDist } from "../../routing/static";
import { User } from "../user/services";

const publicPage = serveStatic({ root: frontendDist, path: "index.html" });
const asset = serveStatic({
    root: frontendDist,
    // Hono matches the prefixed route, but the files themselves stay at the
    // root of the frontend output directory.
    rewriteRequestPath: (path) =>
        appPath() ? path.slice(appPath().length) : path,
});

export const registerStaticRoutes = (app: App) => {
    app.get("/api/registration", async () => {
        const existingUser = await db.query.user.findFirst({
            columns: { id: true },
        });
        return Response.json({ registrationOpen: !existingUser });
    });

    app.get("/", async (c) => {
        if (!(await User.getUserId(c.req.raw)))
            return publicPage(c, async () => undefined);
        let partyId = (
            await db.query.parties.findFirst({
                where: eq(parties.active, true),
                columns: { id: true },
            })
        )?.id;
        if (!partyId) {
            partyId = crypto.randomUUID();
            await db.insert(parties).values({ id: partyId });
        }
        return c.redirect(appPath("/host?id=" + partyId));
    });

    app.get(
        "/assets/*",
        async (c) => (await asset(c, async () => undefined)) ?? c.notFound(),
    );
};
