# Linux VM as VPS — Setup Guide

A complete walkthrough for setting up a headless Ubuntu Server VM in VirtualBox and accessing it via SSH. **Part 3** covers initial local SSH access via VirtualBox port-forwarding. **Part 4** covers the production access method: SSH via the permanent Cloudflare Tunnel domain (`ssh.pson02.io.vn`).

---

## Prerequisites

- Ubuntu desktop (host machine)
- VirtualBox installed (`sudo apt install -y virtualbox`)
- Ubuntu Server ISO downloaded ([ubuntu.com/download/server](https://ubuntu.com/download/server))

---

## Part 1 — Create the VM in VirtualBox GUI

### Step 1.1 — Create a new VM

**Purpose:** Define the VM's hardware profile before installing the OS.

**Action:**
1. Open VirtualBox and click **New**
2. Set the following:
   - **Name:** `myvps` (or any name you prefer)
   - **Type:** Linux
   - **Version:** Ubuntu (64-bit)
3. Set **RAM** to at least 3072 MB (3 GB)
4. Create a new virtual hard disk — VDI format, dynamically allocated, 20 GB minimum
5. Click **Create**

---

### Step 1.2 — Attach the ISO

**Purpose:** Mount the Ubuntu Server ISO so the VM boots into the installer.

**Action:**
1. Select the VM and click **Settings → Storage**
2. Under **Controller: IDE**, click the empty optical drive
3. Click the disc icon on the right → **Choose a disk file**
4. Select your downloaded Ubuntu Server ISO
5. Click **OK**

---

### Step 1.3 — Verify network mode

**Purpose:** Confirm the VM uses NAT (the default), which routes traffic through the host.

**Action:**
1. Go to **Settings → Network**
2. Confirm **Adapter 1** is set to **NAT**
3. Click **OK**

---

## Part 2 — Install Ubuntu Server (CLI only)

### Step 2.1 — Boot the installer

**Purpose:** Start the OS installation process.

**Action:**
1. Click **Start** in VirtualBox to boot the VM
2. Select **Try or Install Ubuntu Server** from the boot menu
3. Wait for the installer to load

---

### Step 2.2 — Follow the installer prompts

**Purpose:** Configure the base OS.

**Action:** Work through each screen:

| Screen | Recommended setting |
|---|---|
| Language | English |
| Keyboard | Match your layout |
| Install type | Ubuntu Server (not minimized) |
| Network | Leave default (DHCP) |
| Storage | Use entire disk, default LVM |
| Profile | Set your username, hostname, password |
| **SSH Setup** | **Enable — tick "Install OpenSSH server"** |
| Snaps | Skip |

> **Important:** Enabling OpenSSH during install saves a manual step later.

---

### Step 2.3 — Reboot and eject ISO

**Purpose:** Boot into the freshly installed OS.

**Action:**
1. When install completes, select **Reboot Now**
2. VirtualBox will prompt to remove the installation medium — press **Enter**
3. Wait for the login prompt to appear

---

## Part 3 — Configure Initial SSH Access from Host (Local Only)

### Step 3.1 — Power off the VM

**Purpose:** VirtualBox requires the VM to be off before changing network settings.

**Action (inside the VM):**
```bash
sudo poweroff
```

**Confirm (on host):**
```bash
VBoxManage list runningvms
# myvps should not appear
```

---

### Step 3.2 — Add a port-forward rule

**Purpose:** Forward traffic from host port `2222` to VM port `22` (SSH), since NAT blocks direct access to the VM.

**Action (on host):**
```bash
VBoxManage modifyvm "myvps" \
  --natpf1 "ssh,tcp,,2222,,22"
```

> Replace `myvps` with your VM name. Verify the exact name with `VBoxManage list vms`.

---

### Step 3.3 — Start the VM headless

**Purpose:** Run the VM in the background with no GUI window — exactly like a remote VPS.

**Action (on host):**
```bash
VBoxManage startvm "myvps" --type headless
```

Wait 10–15 seconds for the VM to fully boot.

---

### Step 3.4 — Test SSH connection

**Purpose:** Confirm the port-forward rule is working and SSH is reachable.

**Action (on host):**
```bash
ssh -p 2222 youruser@127.0.0.1
```

Enter your password when prompted. A successful login confirms SSH is working.

---

### Step 3.5 — Generate an SSH key pair (if needed)

**Purpose:** Create a key pair for passwordless authentication — more secure than passwords.

**Check if a key already exists (on host):**
```bash
ls ~/.ssh/id_ed25519
```

**If no key exists, generate one:**
```bash
ssh-keygen -t ed25519 -C "myvps"
```

Accept the default path. Set a passphrase or leave empty.

---

### Step 3.6 — Copy public key to the VM

**Purpose:** Install your public key on the VM so it can authenticate you without a password.

**Action (on host):**
```bash
ssh-copy-id -p 2222 youruser@127.0.0.1
```

**Confirm (on host):**
```bash
ssh -p 2222 youruser@127.0.0.1
# Should log in with no password prompt
```

---

### Step 3.7 — Add SSH config shortcut

**Purpose:** Replace the long `ssh -p 2222 youruser@127.0.0.1` command with a simple alias.

**Action — add to `~/.ssh/config` on host:**
```
Host myvps
  HostName 127.0.0.1
  Port 2222
  User youruser
  IdentityFile ~/.ssh/id_ed25519
```

**Confirm:**
```bash
ssh myvps
# Should connect immediately with no password
```

---

### Step 3.8 — Disable password authentication

**Purpose:** Harden the VM so only your SSH key can log in — no passwords, no root login.

**Action (inside the VM via SSH):**
```bash
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
```

**Confirm the changes:**
```bash
grep -E 'PasswordAuthentication|PermitRootLogin' /etc/ssh/sshd_config
```

Expected output:
```
PasswordAuthentication no
PermitRootLogin no
```

**Apply the changes:**
```bash
sudo systemctl restart ssh
```

**Final confirm (on host):**
```bash
ssh myvps
# Key-only login, no password prompt
```

---

## Part 4 — SSH Access via Cloudflare Tunnel Domain

Once the Cloudflare Tunnel is set up (see `2-Cloudflare Tunnel setup.md`) with an SSH public hostname (`ssh.pson02.io.vn` → `tcp://localhost:22`), you can SSH into the VM from *any machine on the internet* — no VirtualBox port-forwarding required.

### Step 4.1 — Install cloudflared on your local machine

**Purpose:** The `cloudflared` binary acts as a local proxy, bridging your SSH client to the Cloudflare Tunnel.

**Action (on your local machine):**
```bash
# Linux (Debian/Ubuntu)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb
```

### Step 4.2 — Add the Cloudflare SSH config shortcut

**Purpose:** Tell your SSH client to route all connections to `ssh.pson02.io.vn` through `cloudflared` automatically.

**Action — add to `~/.ssh/config` on your local machine:**
```
Host ssh.pson02.io.vn
  ProxyCommand cloudflared access ssh --hostname %h
  User youruser
  IdentityFile ~/.ssh/id_ed25519
```

> Replace `youruser` with your VM username and `~/.ssh/id_ed25519` with the path to your private key.

### Step 4.3 — Connect

**Action:**
```bash
ssh ssh.pson02.io.vn
```

This is the **primary access method** going forward — both for manual administration and for the automated GitHub Actions deployment pipeline. Password login remains disabled; only key-based authentication is accepted.

---

## Summary

| What was set up | How it works |
|---|---|
| Ubuntu Server VM | Headless, CLI-only, no desktop environment |
| VirtualBox NAT + port-forward | Host port `2222` tunnels to VM port `22` — for initial local access only |
| SSH key auth | Ed25519 key pair, password login permanently disabled |
| `~/.ssh/config` (local shortcut) | `ssh myvps` connects via local port-forward |
| Cloudflare Tunnel SSH hostname | `ssh ssh.pson02.io.vn` — primary remote access method via `cloudflared` ProxyCommand |

The VM is accessible from anywhere over the internet exclusively via SSH key authentication through the Cloudflare Tunnel. There is no open port, no password, and no direct exposure to the public internet.