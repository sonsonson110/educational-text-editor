# CI/CD Roadmap — Production-Ready Deployment

A phased roadmap to fully automate the build and deployment pipeline so that a `git push` to `main` is the only manual step.

---

## Current Pain Points

| # | Issue | Root Cause | Status |
|---|---|---|---|
| 1 | Images must be built manually on the local machine | No automated build pipeline | ⏳ Phase 2 |
| 2 | Must SSH into the VM to start the Cloudflare Quick Tunnel, copy the random URL, then hardcode it in the build command | Quick Tunnels produce ephemeral, random URLs that can't be known ahead of time | ✅ Resolved — permanent named tunnel live at `collab-text-editor.pson02.io.vn` |
| 3 | Must SSH into the VM a second time to pull new images and re-deploy the stack | No automated deployment trigger | ⏳ Phase 3 |
| 4 | Relies on Firebase Hosting, a separate third-party service with its own CI/CD integration | Unnecessary dependency since the VM now serves the client container directly | ✅ Resolved — Firebase workflows and config removed |

---

## ✅ Phase 1 — Replace the Random Quick Tunnel with a Permanent Tunnel (Complete)

> **This was the critical prerequisite that unlocked everything else.** The fundamental blocker for a fully automated pipeline was the ephemeral Quick Tunnel URL. It changed every time the VM restarted, making it impossible to bake a stable WebSocket URL into a Docker image at build time.

### Goal
Replace `cloudflared tunnel --url http://localhost:80` with a **named, permanent Cloudflare Tunnel** that produces stable, user-defined URLs. These URLs never change, so they can be stored as secrets and used in the CI pipeline.

### Outcome — Live URLs
| Route | Public URL | Routes to |
|---|---|---|
| Web App | `https://collab-text-editor.pson02.io.vn` | `http://localhost:80` on VM |
| SSH (CI/CD) | `ssh.pson02.io.vn` | `tcp://localhost:22` on VM |

### Secrets Stored in GitHub

| Secret | Value |
|---|---|
| `VITE_WS_URL` | `wss://collab-text-editor.pson02.io.vn/ws` |
| `VM_SSH_HOST` | `ssh.pson02.io.vn` |

---

## Phase 2 — Automate Image Building with GitHub Actions (Replace Firebase Workflows)

> **Replaces `firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml`.**

### Goal
Create a new GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and pushes both Docker images to **GitHub Container Registry (GHCR)** on every push to `main`.

### New Workflow: `.github/workflows/deploy.yml`

```
Trigger: push to main
└─ Job: build-and-push
   ├─ Checkout repository
   ├─ Log in to GHCR using built-in GITHUB_TOKEN (no extra secrets needed)
   ├─ Build server image → ghcr.io/<owner>/collab-editor-server:latest
   └─ Build client image with VITE_WS_URL build arg → ghcr.io/<owner>/collab-editor-client:latest
```

### Secrets Required in GitHub

| Secret | Description | Example |
|---|---|---|
| `VITE_WS_URL` | WebSocket URL baked into the client bundle at build time | `wss://collab-text-editor.pson02.io.vn/ws` |

> **No Docker Hub credentials needed.** GHCR authentication uses the automatic `GITHUB_TOKEN` provided by every GitHub Actions run.

### Files Removed

- `.github/workflows/firebase-hosting-merge.yml` ✅
- `.github/workflows/firebase-hosting-pull-request.yml` ✅
- `firebase.json` ✅
- `.firebaserc` ✅

### Outcome
- Every `git push main` automatically produces fresh, correctly-tagged Docker images in GHCR.
- Firebase Hosting dependency is fully eliminated.

---

## Phase 3 — Automate VM Deployment via SSH over Cloudflare Tunnel

### Goal
Extend the `deploy.yml` workflow to SSH into the VM after images are pushed and trigger a `docker stack deploy` automatically, securely traversing the NAT via Cloudflare Tunnel.

### Mechanism
Since the VM is not exposed directly to the public internet, we route SSH traffic through a Cloudflare Tunnel. The GitHub Action runner will install `cloudflared` to proxy the connection, then use standard SSH commands.

```
(continuing deploy.yml after image push)
└─ Job: deploy-to-vm (depends on: build-and-push)
   ├─ Install `cloudflared` binary on runner
   ├─ Configure SSH `ProxyCommand` to use `cloudflared`
   └─ SSH into VM and run:
      docker stack deploy -c docker-stack.yml collab-editor
      (Docker Swarm pulls new images and performs a rolling update)
```

### Secrets Required in GitHub

| Secret | Description | Example |
|---|---|---|
| `VM_SSH_HOST` | Cloudflare SSH public hostname for the VM | `ssh.pson02.io.vn` |
| `VM_USER` | SSH username on the VM | `ubuntu` |
| `VM_SSH_KEY` | Full contents of the **private** Ed25519 key used to authenticate to the VM. Generate a dedicated key pair for CI; add its public key to `~/.ssh/authorized_keys` on the VM. | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |

### One-Time VM Preparation
- **Cloudflare Tunnel Configuration:** Add a new "Public Hostname" to your existing tunnel in the Zero Trust dashboard (e.g., `ssh.yourdomain.com`) that routes to `tcp://localhost:22`.
- **Docker Stack Configuration:** `docker-stack.yml` must be present on the VM (it only needs to be updated manually when the stack architecture changes).
- The `IMAGE_PREFIX` variable should be set in the deploy command so Swarm pulls from the right registry.

### Outcome
- Full end-to-end automation without exposing port 22 to the public internet: `git push main` → build images → push to registry → SSH via Tunnel → rolling-update the running stack.
- Zero manual steps required after the one-time setup.

---

## Phase 4 (Optional) — Quality Gates

### Goal
Add CI checks that run *before* the deployment, ensuring only passing code reaches the VM.

```
Trigger: push to main
├─ Job: quality-gate (runs first)
│  ├─ Run linter (eslint)
│  └─ Run test suite (vitest)
│
└─ Job: build-and-push (depends on: quality-gate)
   └─ (Phase 2 and 3 pipeline)
```

### Outcome
- Broken code cannot be deployed.
- Provides a fast feedback loop for PRs via the `pull_request` trigger.

---

## Implementation Order Summary

```
Phase 1 (Prerequisite) → Permanent Cloudflare Tunnel + domain
         |
Phase 2  →  GitHub Actions: build & push images, retire Firebase
         |
Phase 3  →  GitHub Actions: SSH deploy to VM
         |
Phase 4  →  (Optional) Linting & test gates in CI
```

## Key Resources
- [Cloudflare Zero Trust Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [cloudflared SSH Access](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/use-cases/ssh/)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Container Registry (GHCR)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
