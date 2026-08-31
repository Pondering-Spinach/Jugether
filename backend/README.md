# jugether backend

## Development

Enter the repository's Node.js 24 development shell and run the backend from this directory:

```bash
nix develop
cd backend
npm install
npm run dev
```

`npm run dev` watches backend TypeScript files. Use `npm run debug` to run the
same watcher with the Node inspector on `127.0.0.1:9229`; source maps are
enabled for both commands.

The server listens on port `5222` by default. Set `PORT` to override it.

SQLite uses `test.db` in the backend working directory by default. Set
`DATABASE_PATH` to an absolute path on local persistent storage for deployments.

```bash
npm run build
npm start
```

`npm run build` builds the frontend into `backend/public` and type-checks the
backend. `tsx` executes the backend directly on Node.js.
