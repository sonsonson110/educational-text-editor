# Cloudflare Tunnel — Setup Guide

A complete walkthrough for securely exposing your local Virtual Machine to the public internet using Cloudflare Tunnel, eliminating the need to configure port forwarding or dynamic DNS on your home router.

Reference: [Cloudflare docs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)

---

## Prerequisites

- SSH access to your VM
- A registered domain name (e.g., `yourdomain.com`)

---

## Step 1 — Add your domain to Cloudflare

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Add a site** and enter your domain name.
3. Select the Free plan.
4. Cloudflare will scan your existing DNS records and then provide you with two nameservers.
5. Log in to your domain registrar (e.g., Namecheap, GoDaddy) and replace the default nameservers with the ones Cloudflare provided.
6. Wait for propagation. This usually takes a few minutes but can occasionally take longer.

---

## Step 2 — Create the Tunnel via Dashboard

1. In the Cloudflare dashboard, go to **Zero Trust** (left sidebar).
2. Navigate to **Networks → Connectors → Tunnels**.
3. Click the **Add a tunnel** button.
4. Select **Cloudflared** as the connector type and click Next.
5. Name your tunnel (e.g., `vm-production-tunnel`).
6. Click **Save tunnel**.

---

## Step 3 — Install and Authenticate on the VM

1. On the "Install and run a connector" screen, select your environment (Debian / 64-bit).
2. Copy the provided installation command. It will look similar to:
   ```bash
   curl -L --output cloudflared.deb ... && sudo dpkg -i cloudflared.deb && sudo cloudflared service install eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. SSH into your VM and run the command.
4. Wait for the installation to finish. You can confirm it's running as a background service with `sudo systemctl status cloudflared`.

---

## Step 4 — Route Traffic

Once the tunnel is connected, you need to map public hostnames to local ports on the VM.

1. In the Cloudflare Zero Trust dashboard, under the **Public Hostname** tab for your tunnel, click **Add a public hostname**.

### 4.1 Route the Web Application (HTTP)
This allows users to access the collaborative editor.
- **Subdomain:** `collab-text-editor` (or whatever you prefer)
- **Domain:** Select your domain from the dropdown
- **Path:** Leave blank
- **Service Type:** `HTTP`
- **Service URL:** `localhost:80`
- Click **Save hostname**.

### 4.2 Route SSH for CI/CD (TCP)
This allows GitHub Actions to securely SSH into the VM without opening port 22 to the public internet.
- Click **Add a public hostname** again.
- **Subdomain:** `ssh`
- **Domain:** Select your domain from the dropdown
- **Service Type:** `SSH`
- **Service URL:** `localhost:22`
- Click **Save hostname**.

---

## Summary

| Component | Function |
|---|---|
| `cloudflared` Service | Runs automatically on your VM, establishing an outbound secure connection to Cloudflare. No manual SSH sessions required to start it. |
| Web Routing | `https://collab-text-editor.yourdomain.com` securely forwards to `localhost:80` on the VM. |
| SSH Routing | `ssh.yourdomain.com` securely forwards to `localhost:22`, enabling automated GitHub Actions deployments. |

Your VM is now securely wired to the public internet with stable, permanent URLs. The next step is setting up Docker Swarm to host the application.
