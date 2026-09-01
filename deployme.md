# Jugether deployment

Jugether runs rootlessly as one Podman Kube Quadlet: a backend and a yt-dlp
nightly-updater sidecar. This is local Podman/systemd management, not
Kubernetes.

## Host setup

Enable Podman and make `openssl` available on the NixOS host:

```nix
virtualisation.podman.enable = true;
environment.systemPackages = [ pkgs.openssl ];
```

Run the following as the unprivileged account that will own this deployment.
The images run as UID/GID 1000; use a deployment account with UID/GID 1000
(or adjust the image users to match the account before building). Podman's
`keep-id` user namespace maps that UID to the owner of the bind-mounted data:

```bash
sudo loginctl enable-linger "$USER"
sudo install -d -m 0700 -o "$(id -u)" -g "$(id -g)" \
  /var/lib/jugether /var/lib/jugether/secrets /var/lib/jugether/yt-dlp
sudo install -m 0600 -o "$(id -u)" -g "$(id -g)" \
  /path/to/cookies.txt /var/lib/jugether/secrets/cookies.txt
mkdir -p ~/.config/containers/systemd
```

`/var/lib/jugether` is application state, bind-mounted into the backend. Keep
it on local storage, not NFS/SMB. `cookies.txt` and the generated Better Auth
secret are host runtime secrets: they are excluded from Git, Nix inputs, and
images. The backend mounts them read-only at `/run/secrets`.

## Build and deploy

`PUBLIC_ORIGIN` is a build input. `APP_BASE_PATH` is optional: leave it unset
for the root path, or set an absolute subpath without a trailing slash.
`PUBLIC_ORIGIN` must be an HTTPS origin without a path.

`deploy/build` uses Podman multi-stage builds (Node 24 on Debian slim) and
writes a Git-ignored `dist/` directory. The host needs `podman`, `bash`, and `gzip`. Nix is only used for the optional local
development shell; neither build nor runtime requires it. The final backend
image includes production npm dependencies, the built frontend, Python,
ffmpeg and Deno for yt-dlp. The updater uses a separate Python slim image.
Both images run as non-root users. Builds fetch npm packages and Debian
packages over the network; pin base image digests in CI if needed.

```bash
# Root-domain deployment: https://jugether.com/
PUBLIC_ORIGIN=https://jugether.com ./deploy/build

# Subpath deployment: https://example.com/jugether/
APP_BASE_PATH=/jugether PUBLIC_ORIGIN=https://example.com ./deploy/build
```

`dist` contains two compressed Podman-loadable image archives, both tagged `latest`, a matching Kube
YAML manifest, the Quadlet, and an initialization helper. Build on the same
CPU architecture as the deployment host. Copy that complete directory to the
deployment host:

```bash
scp -r dist deploy-user@host:/tmp/jugether-release
```

On the host, as the deployment user:

```bash
cd /tmp/jugether-release
./jugether-init
podman load -i jugether.tar.gz
podman load -i jugether-ytdlp-updater.tar.gz
install -Dm0644 jugether.{kube,yaml} -t ~/.config/containers/systemd/
systemctl --user daemon-reload
systemctl --user start jugether.service
```

The manifest uses `imagePullPolicy: Never`: both archives must be loaded by the
same user that runs `systemctl --user`, and startup fails instead of attempting
to pull `localhost/*:latest` from a registry.

`jugether-init` creates `/var/lib/jugether/secrets/better-auth-secret` only if
it does not exist. It never replaces an existing secret: changing or losing
that file invalidates signed user sessions. If it is missing, the backend logs
a warning and uses its fixed fallback secret instead of refusing to start.

For later application updates, build and load a new release as above, install
the new manifests, and restart the pod:

```bash
systemctl --user daemon-reload
systemctl --user restart jugether.service
```

## Reverse proxy

The pod publishes port `5222` on the host's IPv4 interfaces so a TLS reverse
proxy running in a Podman container can reach it at
`host.containers.internal:5222`. Podman normally adds that hostname to each
container's `/etc/hosts`; verify it from the proxy container with
`getent hosts host.containers.internal`.

The firewall must deny direct external access to TCP `5222`; Caddy is the only
public endpoint. For a subpath deployment, retain the `/jugether` request
prefix when forwarding it (do not use Caddy's `handle_path`, which strips the
prefix):

```caddyfile
example.com {
    @jugether path /jugether /jugether/*
    handle @jugether {
        reverse_proxy host.containers.internal:5222
    }
}
```

The generated frontend, backend `APP_BASE_PATH`, Better Auth URL, and proxy
route must describe the same public path. Local development leaves
`APP_BASE_PATH` unset and continues to run at `http://localhost:5222/`.

## yt-dlp updates

The updater checks the official yt-dlp nightly at startup and every 30 minutes,
verifies the published SHA-256 sum, and atomically replaces the executable in
`/var/lib/jugether/yt-dlp`. The backend reads that directory read-only.
The host directory retains the last verified update across pod recreation and
network outages; no backend restart is needed. On a fresh deployment, yt-dlp
features are unavailable until the updater's first successful download. If
GitHub remains unavailable before that first download, they remain unavailable;
there is no bundled fallback.

## References

- [Podman Kube Quadlet](https://docs.podman.io/en/latest/markdown/podman-kube.unit.5.html)
- [Podman Kube play](https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html)
- [yt-dlp update channels](https://github.com/yt-dlp/yt-dlp#update)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
- [Node image best practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci)
- [Podman build](https://docs.podman.io/en/latest/markdown/podman-build.1.html)
