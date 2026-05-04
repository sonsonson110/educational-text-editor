# Educational Text Editor

A monorepo for building a text editor from scratch — for learning purposes.

Live demo: <https://collab-text-editor.pson02.io.vn/>
> Server might only be available around 9 PM – 11 PM (GMT+7) — it's a VM running on a laptop.

## Packages

| Package | Description |
|---|---|
| [`@myapp/client`](./packages/client) | Vite + React editor frontend |
| [`@myapp/sync-server`](./packages/sync-server) | Collaboration server (Yjs WebSocket) |

## Getting Started

```bash
npm install          # install all workspace dependencies
npm run dev          # start the client
npm run dev:sync-server   # start the collaboration WebSocket server
npm run test:run     # run all tests across workspaces
npm run lint         # lint all workspaces
```

## Deployment

Pushing to `main` triggers the [GitHub Actions workflow](.github/workflows/deploy.yml) which:

1. Builds both Docker images and publishes them to GitHub Container Registry (GHCR).
2. SSHs into the VM via the Cloudflare Tunnel (`ssh.pson02.io.vn`) and runs a Docker Swarm rolling update.

### GitHub Actions Secrets

All secrets must be set in **Repository Settings → Secrets and Variables → Actions**.

| Secret | Description | Example |
|---|---|---|
| `VITE_WS_URL` | WebSocket URL baked into the client at build time | `wss://collab-text-editor.pson02.io.vn/ws` |
| `VM_SSH_HOST` | Cloudflare SSH hostname for the VM | `ssh.pson02.io.vn` |
| `VM_USER` | SSH username on the VM | `ubuntu` |
| `VM_SSH_KEY` | Private Ed25519 key for CI authentication (generate a dedicated key pair; add the public key to `~/.ssh/authorized_keys` on the VM) | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |

## Documentation

See [`docs/`](./docs) for architecture documentation, collaboration integration guides, and the demo server setup walkthrough.
