# jugether frontend

## Development

Run the frontend and backend in separate terminals from the Node.js 24 flake shell:

```sh
nix develop
cd backend && npm run dev
```

```sh
nix develop
cd frontend && npm run dev
```

Vite provides Hot Module Replacement. Open one of its HTML entries directly:

- `http://localhost:3000/src/pages/public/index.html`
- `http://localhost:3000/src/pages/guest/index.html`
- `http://localhost:3000/src/pages/host/index.html`
- `http://localhost:3000/src/pages/portal/index.html`

Vite proxies application API routes to the backend at port 5222, while retaining
control of HTML, transformed modules, and the HMR WebSocket. Browser DevTools
maps errors to TypeScript source during development.
