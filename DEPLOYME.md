# Deploy Jugether

[Jugether](README.md) runs as a **rootless Podman Kube Quadlet**: one backend container and one sidecar that updates yt-dlp. Podman runs the pod under your user's systemd service; you do **not** need a Kubernetes cluster. The host browser plays the audio, while guests join through the public HTTPS URL to manage the queue.

This guide targets a NixOS host with a TLS reverse proxy (the example uses Caddy running in a Podman container). The build can run on a separate machine with the same CPU architecture. Set up the host and proxy **before** exposing the service.

## 1. Prepare the host

Enable Podman and provide OpenSSL on the NixOS host, then apply your host configuration:

```nix
virtualisation.podman.enable = true;
environment.systemPackages = [ pkgs.openssl ];
```

Use an unprivileged deployment account with **UID/GID 1000**, matching the users inside the images. If you choose a different UID/GID, adjust the image users before building. Podman's `keep-id` mapping lets the backend write its bind-mounted SQLite data as the host account. Run these commands as that account:

```bash
sudo loginctl enable-linger "$USER"
sudo install -d -m 0700 -o "$(id -u)" -g "$(id -g)" \
  /var/lib/jugether /var/lib/jugether/secrets /var/lib/jugether/yt-dlp
mkdir -p ~/.config/containers/systemd
```

Keep `/var/lib/jugether` on **local persistent storage**, not NFS/SMB. The Better Auth secret and optional YouTube cookies live under `/var/lib/jugether/secrets`, mounted read-only in the backend at `/run/secrets`. Never commit them or add them to an image or Nix input.

If YouTube playback needs cookies, provision a yt-dlp-compatible cookie file on the host (otherwise skip this step):

```bash
sudo install -m 0600 -o "$(id -u)" -g "$(id -g)" \
  /path/to/cookies.txt /var/lib/jugether/secrets/yt-dlp-cookies.txt
```

Cookies may expire; keep this file private and refresh it when needed. Search and playback also depend on YouTube availability.

## 2. Build a release

On the build machine, install `podman`, `bash`, and `gzip`. Nix is **not** required for building or deploying; the flake is for local development. Set `PUBLIC_ORIGIN` to your public HTTPS origin **without a path**. For a subpath, set `APP_BASE_PATH` to an absolute path without a trailing slash; otherwise leave it unset:

```bash
# https://music.example.com/
PUBLIC_ORIGIN=https://music.example.com ./deploy/build

# Or https://example.com/jugether/
APP_BASE_PATH=/jugether PUBLIC_ORIGIN=https://example.com ./deploy/build
```

The build writes a Git-ignored `dist/` containing two compressed Podman image archives (tagged `latest`), a matching pod manifest, a Quadlet, and `jugether-init`. The multi-stage backend build uses Node.js 24 on Debian slim and includes the built frontend, production npm dependencies, Python, ffmpeg, and Deno. The updater has its own Python slim image. Both runtime containers run as non-root users. Builds download npm and Debian packages; consider pinning base image digests for reproducible CI builds.

Copy the **whole** `dist/` directory to the deployment host:

```bash
scp -r dist deploy-user@host:/tmp/jugether-release
```

## 3. Install and start

On the host, as the **same deployment user** that prepared the directories, run:

```bash
cd /tmp/jugether-release
./jugether-init
podman load -i jugether.tar.gz
podman load -i jugether-ytdlp-updater.tar.gz
install -Dm0644 jugether.{kube,yaml} -t ~/.config/containers/systemd/
systemctl --user daemon-reload
systemctl --user start jugether.service
```

`jugether-init` creates `/var/lib/jugether/secrets/better-auth-secret` once. Preserve and back up this file along with the database: changing or losing the secret invalidates signed sessions. If the file is absent, the backend currently **falls back to a fixed development secret** with a warning; do not rely on this for production. The backend runs the checked-in database migrations on startup.

The pod manifest sets `imagePullPolicy: Never`. Load **both** images under the account that runs `systemctl --user`; service startup will not fetch missing images from a registry. The app listens on port `5222`.

## 4. Put a TLS proxy in front

The pod publishes `5222` on all host IPv4 interfaces so a proxy container can reach `host.containers.internal:5222`. **Block direct external access to TCP 5222 in the host firewall**; only the HTTPS proxy should be publicly reachable. Podman normally makes `host.containers.internal` available inside containers—check from your proxy container with `getent hosts host.containers.internal`.

For a subpath deployment, a Caddy route must **preserve** the `/jugether` prefix; `handle_path` would strip it:

```caddyfile
example.com {
    @jugether path /jugether /jugether/*
    handle @jugether {
        reverse_proxy host.containers.internal:5222
    }
}
```

For a dedicated domain deployed at `/`, proxy the full site to the same upstream instead. The public proxy route, build-time `APP_BASE_PATH`, generated frontend, backend path, and Better Auth URL must all agree. The release's `BUILD-INFO` records the selected origin, path, and auth URL. Local development defaults to `http://localhost:5222/` and does not use `APP_BASE_PATH`.

## 5. Check and update

After starting, check `systemctl --user status jugether.service` and open your HTTPS URL. The first visitor registers the host account; subsequent visitors need the host's party invitation link or QR code to join as guests. If search or playback fails on a new installation, check the service logs (`journalctl --user -u jugether.service`) and the yt-dlp updater's network access.

The updater fetches the official yt-dlp nightly at startup and every **30 minutes**, verifies its published SHA-256 checksum, and atomically replaces the executable in `/var/lib/jugether/yt-dlp`. The backend reads it without a restart. The last verified version persists across pod recreation and network outages; on a fresh install, yt-dlp-dependent features are unavailable until the first successful download from GitHub. There is no bundled fallback.

For application updates, build and copy a new `dist/` as above. On the host, repeat `podman load` for **both** archives and install the updated `jugether.kube` and `jugether.yaml`, then restart:

```bash
systemctl --user daemon-reload
systemctl --user restart jugether.service
```

Do not delete `/var/lib/jugether` during an update: it holds the SQLite database, auth secret, optional cookies, and last verified yt-dlp executable.

## Further reading

- [Podman Kube Quadlet](https://docs.podman.io/en/latest/markdown/podman-kube.unit.5.html) and [Podman Kube play](https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html)
- [yt-dlp update channels](https://github.com/yt-dlp/yt-dlp#update)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/) and [build best practices](https://docs.docker.com/build/building/best-practices/)
- [Node image best practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci), and [Podman build](https://docs.podman.io/en/latest/markdown/podman-build.1.html)
