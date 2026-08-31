# jugether frontend

## Development

Use the repository's Node.js 24 flake shell, then start the backend:

```sh
nix develop
cd backend
npm run dev
```

The backend development command first builds the frontend into `backend/public`,
then watches both backend TypeScript and frontend files. Open
`http://localhost:5222/`.

Frontend changes trigger a fresh production-equivalent Vite build; reload the
browser to see them. This intentionally does not use Vite's development server
or HMR, so routing, cookies, assets, and HTML are served exactly as they are in
deployment. The watcher emits source maps for browser debugging, and `tsx`
enables backend source maps.

To run only the frontend rebuild watcher, use `cd frontend && npm run dev`.
