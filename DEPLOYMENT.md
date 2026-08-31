# Jugether deployment

Jugether runs rootlessly as one Podman Kube Quadlet: a backend and a yt-dlp
nightly-updater sidecar. This is local Podman/systemd management, not
Kubernetes.

## Host setup

Enable Podman in NixOS:

```nix
virtualisation.podman.enable = true;
```

Run the following as the unprivileged account that will own this deployment;
no particular host username is assumed:

```bash
sudo loginctl enable-linger "$USER"
sudo install -d -m 0700 -o "$(id -u)" -g "$(id -g)" \
  /var/lib/jugether /var/lib/jugether/secrets
sudo install -m 0600 -o "$(id -u)" -g "$(id -g)" \
  /path/to/cookies.txt /var/lib/jugether/secrets/cookies.txt
mkdir -p ~/.config/containers/systemd ~/backups
```

`/var/lib/jugether` is application state, bind-mounted into the backend. It is
not a Podman volume, so it is easy to inspect and back up. Keep it on local
storage, not NFS/SMB. `cookies.txt` is a host runtime secret: it is excluded
from Git, Nix inputs, images, and backups, and is mounted read-only only into
the backend at `/run/secrets/yt-dlp-cookies.txt`. Rotate it by atomically
renaming a replacement file in `/var/lib/jugether/secrets`; new yt-dlp
processes use it without a pod restart.

## Deploy

```bash
nix build .#image --out-link result-backend
nix build .#updater-image --out-link result-updater
podman load -i result-backend
podman load -i result-updater

install -Dm0644 deploy/jugether.{kube,yaml} -t ~/.config/containers/systemd/
systemctl --user daemon-reload
systemctl --user start jugether.service
```

`jugether.kube` has an `[Install]` section, so it starts on boot after the
next user-systemd reload. Do not enable the generated transient service.

```bash
systemctl --user status jugether.service
journalctl --user -fu jugether.service
```

The pod exposes port `5222`; use a TLS reverse proxy for public access.

## Updates and backups

The updater checks the official yt-dlp nightly daily, verifies the published
SHA-256 sum, and atomically replaces the shared executable. No backend restart
is needed. For an application update:

```bash
systemctl --user restart jugether.service
```

Back up SQLite using its online backup command, then back up that snapshot
with your normal backup tool:

```bash
sqlite3 /var/lib/jugether/jugether.db \
  ".backup $HOME/backups/jugether-$(date +%F).db"
```

Install `sqlite` on the host for this command. Do not copy a live database
file directly; SQLite recommends its backup API/command. Do not set
`KubeDownForce=true`, which removes PVC volumes.

## References

- [Podman Kube Quadlet](https://docs.podman.io/en/latest/markdown/podman-kube.unit.5.html)
- [Podman Kube play](https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html)
- [Podman secrets](https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html)
- [yt-dlp update channels](https://github.com/yt-dlp/yt-dlp#update)
- [SQLite backups](https://www.sqlite.org/backup.html)
