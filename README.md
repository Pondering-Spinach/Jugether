# Jugether

**A self-hosted, Spotify Jam–style listening party for YouTube Music.** One person hosts the music; everyone with the party link can search for songs, add them to a shared queue, and vote on what plays next. Jugether uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) to find tracks and resolve audio from YouTube Music/YouTube—no Spotify account or Spotify API required.

> Jugether is an independent project, not affiliated with Spotify, YouTube, or Google. The host's browser plays the audio; guests see the queue and now-playing track, but **audio is not streamed to their devices**. Playback depends on YouTube availability and may require YouTube cookies.

## How it works

- The first visitor creates a local username/password **host** account. Registration closes after that first account; there is one active party at a time.
- The host opens the host page, starts playback, and shares the party link or QR code.
- Guests join via that link without an account. Anyone in the party can search YouTube Music songs and add tracks; votes move songs up or down the queue.
- The host can pause, skip, remove tracks, or reset the party. Queue changes are pushed live to participants.

## Run locally (development)

You'll need Node.js 24, npm, and yt-dlp on your `PATH`. The repository's Nix flake provides these tools (`nix develop`); without Nix, install them yourself.

```sh
git clone https://github.com/Pondering-Spinach/Jugether.git
cd Jugether
nix develop                        # optional if the tools are installed already
npm --prefix frontend ci --legacy-peer-deps
npm --prefix backend ci --legacy-peer-deps
cd backend
npm run db:migrate
npm run dev
```

Open **http://localhost:5222/** and register the host account. The backend builds and watches the frontend; reload the browser after frontend edits. Development data is stored in `backend/test.db`. For a standalone development run, `npm run build && npm start` from `backend` builds the frontend and starts the server. See [backend development notes](backend/README.md) and [frontend development notes](frontend/README.md).

## Self-hosting

**Start with the [self-hosting deployment guide](DEPLOYME.md).** It has the complete host, build, proxy, and update steps; the commands below are only a preview.

The documented production setup uses **rootless Podman + systemd Quadlet** with a backend container and a sidecar that downloads verified yt-dlp nightly updates. It needs a TLS reverse proxy, persistent local SQLite storage, a persistent Better Auth secret, and host access to port 5222 from the proxy (not from the public internet). You can deploy at a domain root or under a subpath.

On a build machine with Podman, build a release for your HTTPS origin:

```sh
PUBLIC_ORIGIN=https://music.example.com ./deploy/build
# Or for a subpath: APP_BASE_PATH=/jugether PUBLIC_ORIGIN=https://example.com ./deploy/build
```

Follow the deployment guide before starting the service: the build alone does not deploy the app. The yt-dlp updater needs network access to GitHub before search/playback will work on a fresh install; YouTube may require exported cookies for playback. Keep cookies and secrets out of Git.

## Stack

Preact + Vite frontend; Hono + Node.js backend; SQLite with Drizzle and Better Auth; yt-dlp for search/metadata and playback URL resolution. The host browser fetches and plays the resolved audio URL. This is not a music hosting or download service.

## License and contributions

Jugether is **source-available under the [PolyForm Noncommercial 1.0.0 license](LICENSE.md)**. You can use, change, and share it for permitted noncommercial purposes, but commercial use requires separate permission from the relevant copyright holders. Because of that restriction, it is **not OSI-approved open source**. Third-party dependencies retain their own licenses. Contributions are welcome—see [CONTRIBUTING.md](CONTRIBUTING.md) for how to help.

## Credits

Many thanks to the **[yt-dlp team and contributors](https://github.com/yt-dlp/yt-dlp)** for the tool that makes YouTube Music discovery and playback possible. Thanks also to **[GPT from OpenAI](https://openai.com/)** for assistance with the deployment and this README.

For development plans, see [TODO.md](TODO.md). Questions or bugs? Open an issue on [GitHub](https://github.com/Pondering-Spinach/Jugether/issues).
