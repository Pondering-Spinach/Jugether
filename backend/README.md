# jugether backend

## Development

Enter the repository's Node.js 24 development shell and run the backend from this directory:

```bash
nix develop
cd backend
npm install
npm run dev
```

`npm run dev` builds the frontend into `public` and watches both frontend and
backend files. Frontend changes are rebuilt with source maps; reload
`http://localhost:5222/` to use the new artifact. Use `npm run debug` to run
the same watchers with the Node inspector on `127.0.0.1:9229`; source maps are
enabled for both commands.

The server listens on port `5222` by default. Set `PORT` to override it.

SQLite uses `test.db` in the backend working directory by default. Set
`DATABASE_PATH` to an absolute path on local persistent storage for deployments.
This is a breaking development-schema reset. Remove an existing development
DB, then apply the checked-in Drizzle migrations before starting:

```bash
rm -f test.db test.db-shm test.db-wal
npm run db:migrate
npm run build
npm start
```

## Authentication

Authentication is provided by Better Auth at `/api/auth/*`, with its username
plugin for local username/password accounts. It owns the `user`, `account`,
`session`, and `verification` tables; the separate `guestSessions` table is
only for anonymous party participation.

Set `BETTER_AUTH_SECRET_FILE` to a read-only file containing a random,
persistent production secret, and set `BETTER_AUTH_URL` to the public
authentication endpoint (for example,
`https://jugether.example/jugether/api/auth` when deployed below
`/jugether`). If the file is unavailable, the backend logs a warning and uses
its fixed fallback secret so it remains available; deploy the file to preserve
production session security. Local registration creates an internal
`@local.test` email because Better Auth's username plugin is layered on its
email/password authenticator; users sign in only with their username.

`npm run build` builds the frontend into `backend/public` and type-checks the
backend. `tsx` executes the backend directly on Node.js.
