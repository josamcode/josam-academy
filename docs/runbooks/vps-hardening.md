# Runbook — `PH-0.7` VPS Hardening

| Field                | Value                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- |
| **Task**             | `PH-0.7` — SSH keys, disable root, fail2ban, ufw, unattended-upgrades                        |
| **Type**             | **B** — authored here, executed by the founder                                               |
| **Authority**        | `14 §12`, `BR-1700` – `BR-1704`                                                              |
| **Server**           | Ubuntu 24.04 · 2 vCPU / 8 GB / 100 GB · Frankfurt                                            |
| **Critical context** | **Live box, ~90 days uptime.** Root password login enabled. No firewall.                     |
| **Also running**     | **Coolify**, pre-installed from a provider template, currently serving                       |
| **Written**          | 2026-07-29                                                                                   |
| **Executed**         | **2026-07-29 by the founder.** Verification output pasted back; `PH-0.7` closed.             |
| **Deviations**       | Three, all deliberate: §3 (port), §5.6 (port 8000), §6 (fail2ban filter). Recorded in place. |

---

## 0. Read this first

**This is not a fresh install.** The server has been running for about ninety days with root
password authentication enabled and no firewall. Two consequences shape every step below:

1. **No step may assume a clean state.** Each one begins by reading what is actually there. Where
   the answer can reasonably differ, the step has an explicit **↳ If it is already different**
   branch. Running a "set it up" command against an existing configuration is at best a no-op and
   at worst destructive.

2. **Assume the box may already have been touched.** Ninety days of root-with-password on a public
   IP is long enough for a successful login to have happened. Hardening closes the door; it does
   not prove nobody came in. §9 covers what to check and what is out of scope for this task.

**Coolify is running and must stay running.** It is serving whatever the provider template
deployed. Nothing in this runbook stops, restarts or reconfigures Coolify. §5 explains exactly
what `ufw` does and does not do to it — the answer is surprising and matters.

### The one rule that prevents a lockout

> **Never close the session you are working in.** Every dangerous step is proven from a **second,
> independent session** while the first stays open as a live rescue line. If the second session
> fails, you fix it from the first. Only close the first once the second is proven.

### Placeholders

Substitute your own values. **Nothing real is written in this file, and nothing real should be
pasted back into it or into the repository.**

| Placeholder    | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `<SERVER_IP>`  | The server's public address                      |
| `<ADMIN_USER>` | The non-root administrative user                 |
| `<SSH_PORT>`   | The chosen non-default SSH port (`14 §12`)       |
| `<OLD_PORT>`   | The SSH port currently in use                    |
| `<KEY_PATH>`   | Path to your **private** key on your own machine |

**Never** paste a key, a password, an IP or a port into a commit, an issue, or a chat.

---

## 1. Before you touch anything

### Step 1.1 — Confirm the provider web console works

This is the recovery path for **every** lockout mode in this runbook. It reaches the machine
without SSH and without the network stack, so it survives a wrong firewall rule, a broken `sshd`
config and a wrong port.

- [ ] Open the provider control panel and launch the web console for this server.
- [ ] Log in at the console prompt.
- [ ] Run `whoami` and see a result.

> **Do not continue until this works.** Every recovery procedure below begins with it. Discovering
> at 02:00 that the console needs a password reset is the difference between a five-minute fix and
> a rebuild.

### Step 1.2 — Open two sessions and keep both

```bash
# Terminal A — the RESCUE session. Open it, and do not close it until §8.
ssh root@<SERVER_IP>

# Terminal B — the WORKING session. All changes happen here.
ssh root@<SERVER_IP>
```

- [ ] Both sessions are connected.
- [ ] Terminal A is labelled, in your own head or in the tab title, as the one you must not close.

### Step 1.3 — Record the current state

Run in **Terminal B**. This is read-only. Keep the output — several later steps compare against it.

```bash
# What sshd is actually configured to do right now, including any drop-in overrides.
sudo sshd -T | grep -Ei '^(port|permitrootlogin|passwordauthentication|pubkeyauthentication)'

# Which config files are in play. Ubuntu 24.04 ships a drop-in directory that OVERRIDES
# sshd_config, and editing the main file while a drop-in contradicts it is the classic way to
# make a change that appears to work and does nothing.
ls -la /etc/ssh/sshd_config.d/ 2>/dev/null

# Everything currently listening, with the owning process.
sudo ss -tulpn

# Firewall state.
sudo ufw status verbose 2>/dev/null || echo 'ufw not installed'

# Containers, and the ports they publish.
sudo docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}' 2>/dev/null

# Who can already log in, and who has a key installed.
awk -F: '$3 >= 1000 && $1 != "nobody" { print $1 }' /etc/passwd
sudo ls -la /root/.ssh/ 2>/dev/null

# Has anything already been hardened?
systemctl is-enabled fail2ban 2>/dev/null || echo 'fail2ban: not installed'
systemctl is-enabled unattended-upgrades 2>/dev/null || echo 'unattended-upgrades: not installed'
```

- [ ] Output captured somewhere you can read it while working.
- [ ] **Note the exact SSH port in use** — this is `<OLD_PORT>`.
- [ ] **Note every listening port and what owns it.** §5 needs this list.

> **↳ If any of it is already configured:** good. Each step below detects its own starting state
> and tells you what to do instead. Nothing here needs a virgin machine.

---

## 2. The administrative user

`BR-1700` — root SSH login is disabled. That requires a non-root user who can reach the machine
and escalate, **proven working**, before root is closed off.

### Step 2.1 — Does the user already exist?

```bash
id <ADMIN_USER> 2>/dev/null && echo 'EXISTS' || echo 'ABSENT'
```

**↳ If ABSENT — create it:**

```bash
sudo adduser --disabled-password --gecos '' <ADMIN_USER>
sudo usermod -aG sudo <ADMIN_USER>

# Docker access, so Coolify and the stack can be inspected without root.
# NOTE: membership of `docker` is equivalent to root on this host — the socket can start a
# privileged container. It is granted deliberately, not casually, and is the reason `BR-1703`
# insists containers themselves run as non-root.
sudo usermod -aG docker <ADMIN_USER>
```

**↳ If EXISTS — verify rather than recreate:**

```bash
groups <ADMIN_USER>            # expect: sudo, docker
sudo passwd -S <ADMIN_USER>    # expect the second field to be L (locked) or NP
```

> **↳ If the existing account has a usable password** (second field `P`), leave it for now and
> lock it at Step 4.3, **after** key access is proven. Locking it first removes your fallback
> before the replacement exists.

- [ ] `<ADMIN_USER>` exists, is in `sudo` and `docker`.

### Step 2.2 — Install the public key

Run **on your own machine**, not on the server:

```bash
# If you do not already have a key for this server:
ssh-keygen -t ed25519 -C 'josam-academy-admin' -f <KEY_PATH>

ssh-copy-id -i <KEY_PATH>.pub <ADMIN_USER>@<SERVER_IP>
```

**↳ If `ssh-copy-id` is unavailable or password auth for `<ADMIN_USER>` is already off**, install
it from Terminal B instead:

```bash
sudo install -d -m 700 -o <ADMIN_USER> -g <ADMIN_USER> /home/<ADMIN_USER>/.ssh
sudo tee -a /home/<ADMIN_USER>/.ssh/authorized_keys > /dev/null    # paste the PUBLIC key, then Ctrl-D
sudo chown <ADMIN_USER>:<ADMIN_USER> /home/<ADMIN_USER>/.ssh/authorized_keys
sudo chmod 600 /home/<ADMIN_USER>/.ssh/authorized_keys
```

- [ ] `sudo wc -l /home/<ADMIN_USER>/.ssh/authorized_keys` shows at least 1.
- [ ] Permissions are exactly `700` on `.ssh` and `600` on `authorized_keys`.

> `sshd` silently refuses keys from a group- or world-writable directory and logs it only at debug
> level. A wrong mode here looks exactly like a wrong key.

### Step 2.3 — ✅ **GATE: prove key login in a THIRD session**

**Open a new terminal.** Do not reuse A or B.

```bash
ssh -i <KEY_PATH> <ADMIN_USER>@<SERVER_IP>
```

Then, in that new session:

```bash
whoami          # expect: <ADMIN_USER>
sudo whoami     # expect: root
```

- [ ] Logged in **without being asked for a password**.
- [ ] `sudo` works.

> ### 🚦 STOP
>
> **If this gate does not pass, go no further.** Every remaining step depends on this account
> being able to reach the machine and escalate. Fix it from Terminal A or B — both are still open —
> and retry. Disabling root before this works is the single most common way to lose a server.

---

## 3. SSH port — **not changed. Decision, not omission.**

> ### ✅ Executed 2026-07-29: **the port stays 22.** This section was skipped deliberately.
>
> **Why the runbook originally called for a change.** `14 §12` lists a non-default port, and §3's
> own justification was noise reduction — keeping the fail2ban log small enough that a real
> intrusion attempt is visible among the bot traffic.
>
> **Why it was not done.** This box serves **live client projects** — five application containers
> with their own Postgres and Redis, deployed through Coolify. A port change on a machine carrying
> other people's traffic is real operational risk against no security return: an unfamiliar port
> is found by a scan in seconds and stops nothing that matters. `14 §12`'s intent is a hardened
> SSH surface, and that is delivered by key-only authentication, `PermitRootLogin no` and
> `AuthenticationMethods publickey` — §4, which was executed in full.
>
> **What covers the original justification.** fail2ban (§6) does the noise reduction the port
> change was there for, and does it by banning the source rather than by hiding the door.
>
> **Consequence for the rest of this runbook.** `<SSH_PORT>` is `22` throughout. §5.2's SSH allow
> rule is `22/tcp`, and §6's jail watches `22`. Nothing else changes.
>
> **If a port change is ever revisited**, the procedure below is correct and was written to be
> safe on a live box — keep it. It is retained rather than deleted so a future decision has the
> steps rather than having to reconstruct them.

<details>
<summary>Retained procedure, should the port ever be changed</summary>

The original §3 required: choose a port outside the list recorded in Step 1.3; detect whether
`ssh.socket` is socket-activated (Ubuntu 24.04 is, so `Port` in `sshd_config` alone changes
nothing) and write the matching override; validate with `sshd -t` **before** applying; then prove
a session on the new port from a fresh terminal **before** §5 narrows the firewall to it.

The gate mattered more than the change: never let the firewall allow only a port you have not yet
proven you can reach.

</details>

---

## 4. Close root and password login

`BR-1700`. **Only after §2's gate and §3's gate have both passed.**

### Step 4.1 — Write the hardening drop-in

```bash
sudo tee /etc/ssh/sshd_config.d/20-josam-hardening.conf > /dev/null <<'EOF'
# PH-0.7 — 14 §12, BR-1700.
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
EOF
```

> **`KbdInteractiveAuthentication no` is not redundant.** With only `PasswordAuthentication no`,
> PAM keyboard-interactive can still accept a password on many builds — the config reads as closed
> and the door is open. `AuthenticationMethods publickey` closes it regardless.

### Step 4.2 — Validate, apply, prove

```bash
sudo sshd -t && echo 'CONFIG OK'
sudo sshd -T | grep -Ei '^(permitrootlogin|passwordauthentication|kbdinteractive)'
sudo systemctl reload ssh
```

`reload`, not `restart`: existing sessions survive a reload. Terminals A and B stay alive even if
the new configuration is wrong.

**Open a fifth terminal and prove all three:**

```bash
# 1. The admin user still gets in by key.
ssh -i <KEY_PATH> -p <SSH_PORT> <ADMIN_USER>@<SERVER_IP>          # expect: success

# 2. Root is refused.
ssh -p <SSH_PORT> root@<SERVER_IP>                                 # expect: Permission denied (publickey)

# 3. Password authentication is not offered at all.
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    -p <SSH_PORT> <ADMIN_USER>@<SERVER_IP>                         # expect: Permission denied (publickey)
```

- [ ] Admin key login works.
- [ ] Root is refused.
- [ ] Password authentication is refused — **the third test is the one that matters**; the other
      two can both pass while passwords still work.

### Step 4.3 — Lock any remaining password

```bash
sudo passwd -l root
sudo passwd -S root <ADMIN_USER>     # expect L in the second field for both
```

---

## 5. Firewall — and what it does **not** do to Coolify

> ### ⚠️ Read this section before running any `ufw` command
>
> **`ufw` does not filter Docker-published ports.** Docker inserts its own rules into the `nat`
> and `FORWARD` chains, which are traversed **before** the `INPUT` chain `ufw` manages. A container
> started with `-p 8000:8000` is reachable from the internet with `ufw` enabled, default-deny, and
> reporting `Status: active`.
>
> Two consequences, both important here:
>
> - **Good news for availability:** enabling `ufw` will **not** cut Coolify off. Its published
>   ports keep working because `ufw` never sees that traffic.
> - **Bad news for security:** `ufw` therefore does **not** protect Coolify's dashboard or any
>   other published container port. Anything you needed the firewall to close on a container is
>   still open.
>
> **This is why `PH-0.8`'s provider-level firewall matters.** It sits outside the host, in front
> of the network interface, where Docker's rules cannot reach. It is the layer that actually
> closes container ports. `ufw` here protects **host** services — `sshd` and anything else bound
> to the host directly — which is a real and separate job.
>
> A `DOCKER-USER` chain rule can also restrict container traffic on the host. It is **out of scope
> for this task**: getting it wrong takes Coolify off the internet, and `PH-0.8` achieves the same
> restriction from outside the box with no risk to a running service. Recorded as a decision for
> `PH-0.8`, not skipped.

### Step 5.1 — Confirm what would be affected

```bash
sudo ufw status verbose 2>/dev/null || echo 'ufw not installed'
sudo ss -tulpn | grep -v '127.0.0.1\|::1'      # anything NOT bound to loopback
sudo docker ps --format '{{.Names}}\t{{.Ports}}'
```

- [ ] You have a list of host-bound services that are not on loopback.
- [ ] You have a list of container-published ports (these are the `PH-0.8` ones).

> **↳ If `ufw status` is already `active`:** do not run `ufw --force reset` — it drops every rule
> including the SSH allow, and on a remote session that is an immediate lockout. Add the rules in
> Step 5.2, which are idempotent, and verify the result in Step 5.4.

### Step 5.2 — Add rules **before** enabling

```bash
sudo apt-get update && sudo apt-get install -y ufw

# Defaults. These do not take effect until `ufw enable`.
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH on the new port. THIS RULE FIRST, ALWAYS.
sudo ufw allow <SSH_PORT>/tcp comment 'SSH (PH-0.7)'

# Web. Coolify's proxy terminates here; PH-0.8 narrows these to Cloudflare ranges (BR-1702).
sudo ufw allow 80/tcp  comment 'HTTP - narrowed to Cloudflare at PH-0.8'
sudo ufw allow 443/tcp comment 'HTTPS - narrowed to Cloudflare at PH-0.8'

# Review before enabling.
sudo ufw show added
```

- [ ] `<SSH_PORT>/tcp` appears in the added rules. **Check this by reading it, not by assuming.**

> **↳ Do you need a rule for any other host service you found in Step 5.1?** Add it now. Anything
> host-bound and not allowed stops working the moment `ufw` is enabled. Container-published ports
> need nothing — see the box above.

> **↳ `<OLD_PORT>` is deliberately not allowed.** Terminals A and B are still connected on it, and
> `ufw` does not drop established connections. They survive; new connections on the old port do
> not. That is the intent.

### Step 5.3 — Enable

```bash
sudo ufw enable        # answer y; it warns that it may disrupt existing ssh connections
```

- [ ] Terminals A and B are still alive. (They will be — established connections persist.)

### Step 5.4 — ✅ **GATE: prove a NEW session survives the firewall**

**Open a new terminal.**

```bash
ssh -i <KEY_PATH> -p <SSH_PORT> <ADMIN_USER>@<SERVER_IP>
```

- [ ] Connects.
- [ ] `sudo ufw status verbose` shows `Status: active`, default deny incoming, and the three rules.

> ### 🚦 If this fails
>
> Terminals A and B are still open. Run `sudo ufw disable` in either one, then fix the rule and
> retry. Do not close them until a new session is proven.

### Step 5.5 — `BR-1701`: databases are not publicly reachable

```bash
# On the server — expect 127.0.0.1 only, never 0.0.0.0 or ::
sudo ss -tulpn | grep -E ':5432|:6379'
```

Then **from your own machine**, which is the test that actually matters:

```bash
nc -zv -w 5 <SERVER_IP> 5432    # expect: timed out / refused
nc -zv -w 5 <SERVER_IP> 6379    # expect: timed out / refused
```

- [ ] Both refused or timed out **from outside the host**.

> The local `ss` check and the remote `nc` check are not the same claim. A container published on
> `0.0.0.0:5432` shows as `0.0.0.0` locally _and_ answers remotely; a service bound to `127.0.0.1`
> does neither. Only the remote test proves `BR-1701`. **↳ If either answers, stop and report it** —
> that is a live exposure, not a hardening step.

---

### Step 5.6 — ⚠️ **Port 8000 (Coolify dashboard) is reachable from the internet. This is a live gap.**

> **Status: OPEN. Owner: `PH-0.8`. Not covered by this task.**
>
> The Coolify dashboard is published by Docker, so — per the box at the top of §5 — `ufw` does not
> filter it and never did. It is password-protected, not open, but a password-protected admin panel
> on a public port is not an acceptable long-term posture for a machine holding client projects.
>
> **Why it was not closed here.** The obvious fix is a `ufw`/provider allow-list restricted to the
> founder's address. That address is **dynamic**. An allow-list would lock the founder out of their
> own clients' control panel at the next reconnection — trading a security gap for an availability
> failure on someone else's production systems, which is a worse trade.
>
> **What `PH-0.8` must therefore do.** Close port 8000 **without an IP allow-list**. Cloudflare
> Tunnel (or an equivalent identity-based reverse proxy) removes the public listener entirely
> rather than filtering who reaches it, and survives a changing client address by design. `PH-0.8`
> must not "solve" this with an allow-list; that is the approach already rejected here.
>
> Until `PH-0.8` executes, this port is exposed and known to be exposed. It is recorded in
> `STATUS.md §5` as an open blocker rather than left inside a runbook nobody re-reads.

---

## 6. fail2ban

> ### ⚠️ Executed 2026-07-29 — **the default filter matched nothing, and this is the important finding of the task.**
>
> **What happened.** fail2ban was installed and reported the `sshd` jail active. Eight deliberate
> failed logins moved the counter by **zero**. The jail was running, healthy, and watching for an
> event that this server no longer produces.
>
> **Why.** §4 set `AuthenticationMethods publickey`, so `sshd` now rejects at **preauth** and logs
>
> ```
> Connection reset by authenticating user <user> <addr> port <port> [preauth]
> ```
>
> The stock filter looks for `Failed password`. That line is never emitted once password
> authentication is gone — so **the hardening in §4 silenced the monitoring in §6.** Each step was
> individually correct and the combination was inert.
>
> **This is the shape recorded in `12 §19.1`.** It is the same failure as the three dead fitness
> functions at `PH-0.16` and the stylelint rewrite at `PH-0.17`: a mechanism that loads, reports
> healthy, and enforces nothing. Recorded there as **`BR-1836`** — hardening a system can silence
> the monitoring that watches it, and the two must be verified **together**, after both are in
> place, never separately.
>
> **The fix:** `mode = aggressive`, which includes the preauth patterns.
>
> **Proven the hard way.** After the fix, five attempts produced a **real ban that locked the
> founder out**, recovered through the provider web console (§10). That is the only evidence that
> counts — a jail reporting `active` is not evidence it bans anything.

```bash
systemctl is-enabled fail2ban 2>/dev/null || echo 'ABSENT'
```

**↳ If ABSENT:**

```bash
sudo apt-get install -y fail2ban

sudo tee /etc/fail2ban/jail.d/josam-sshd.local > /dev/null <<'EOF'
[sshd]
enabled  = true
port     = <SSH_PORT>
backend  = systemd

# REQUIRED. The default filter matches `Failed password`, which sshd never emits once
# AuthenticationMethods is publickey — rejection happens at preauth. `aggressive` includes the
# preauth patterns. Without this the jail runs, reports active, and bans nobody. See BR-1836.
mode     = aggressive

# Tuned for a DYNAMIC founder address. A low threshold plus an escalating ban is a self-inflicted
# outage: one fat-fingered session, and the address that is about to change is banned for hours.
# 6 attempts is still far below what a bot needs, and 15 minutes still breaks any useful rate.
maxretry = 6
findtime = 10m
bantime  = 15m
# Deliberately OFF, for the same reason. Escalation punishes the operator, not the bot, when the
# operator's address is not stable.
bantime.increment = false
EOF

sudo systemctl enable --now fail2ban
```

**↳ If already enabled:** check both the port **and the mode**, since a pre-existing jail will be
watching `<OLD_PORT>` with the default filter:

```bash
sudo fail2ban-client get sshd port
sudo fail2ban-client get sshd logpath
```

### Verify — the jail must be shown to BAN, not merely to run

```bash
sudo fail2ban-client status sshd
```

- [ ] Status prints and the jail is active on `<SSH_PORT>`.
- [ ] **The filter matches the log lines this server actually produces:**

```bash
# The real test. Zero matches means the jail is inert, however healthy it reports.
sudo fail2ban-regex systemd-journal   /etc/fail2ban/filter.d/sshd.conf --journalmatch '_SYSTEMD_UNIT=ssh.service' | tail -20
```

- [ ] **Matched lines is greater than zero.**

> **↳ If matched lines is zero**, the jail is watching for an event that does not occur. Set
> `mode = aggressive` and re-run. Do not proceed on the strength of `status` alone — that is
> exactly the trap this section documents.

> **Do not add your address to `ignoreip` if it is dynamic.** It eventually belongs to someone
> else, and you would be permanently allowing an address you no longer hold. Being banned by your
> own fail2ban is survivable — §10 — and the founder did exactly that during execution and
> recovered through the console in minutes.

---

## 7. Unattended upgrades

```bash
systemctl is-enabled unattended-upgrades 2>/dev/null || echo 'ABSENT'
```

**↳ If ABSENT:**

```bash
sudo apt-get install -y unattended-upgrades apt-listchanges

sudo tee /etc/apt/apt.conf.d/51-josam-unattended > /dev/null <<'EOF'
// PH-0.7 — 14 §12. Security patches only.
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Deliberately FALSE. An automatic reboot on 2 vCPU running Coolify and the whole stack means an
// unannounced outage at 06:00. Kernel updates are applied on a reboot you choose; §7 verify shows
// you when one is pending.
Unattended-Upgrade::Automatic-Reboot "false";
EOF

sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
```

### Verify

```bash
sudo unattended-upgrade --dry-run --debug 2>&1 | tail -20
systemctl is-enabled unattended-upgrades       # expect: enabled

# Is a reboot pending from an already-applied kernel update?
[ -f /var/run/reboot-required ] && cat /var/run/reboot-required || echo 'no reboot pending'
```

- [ ] Dry run completes without error.
- [ ] Service is enabled.

---

## 8. Close out

### Step 8.1 — Final verification, all at once

Run in a **freshly opened** session, so nothing depends on a connection made before the changes:

```bash
sudo sshd -T | grep -Ei '^(port|permitrootlogin|passwordauthentication|kbdinteractive)'
sudo ufw status verbose
sudo fail2ban-client status sshd
systemctl is-enabled unattended-upgrades
sudo ss -tulpn | grep -E ':5432|:6379'
sudo docker ps --format 'table {{.Names}}\t{{.Status}}'
```

Expected:

| Check                          | Expected                                                 |
| ------------------------------ | -------------------------------------------------------- |
| `port`                         | `<SSH_PORT>`                                             |
| `permitrootlogin`              | `no`                                                     |
| `passwordauthentication`       | `no`                                                     |
| `kbdinteractiveauthentication` | `no`                                                     |
| `ufw`                          | `Status: active`, `deny (incoming)`, 3 rules             |
| `fail2ban`                     | jail `sshd` active on `<SSH_PORT>`                       |
| `unattended-upgrades`          | `enabled`                                                |
| Postgres / Redis               | `127.0.0.1` only, and **refused from outside**           |
| **Coolify**                    | **containers still `Up`** — this is the regression check |

### Step 8.2 — Coolify is still serving

- [ ] The Coolify dashboard still loads for you.
- [ ] Whatever the template deployed still responds.
- [ ] `sudo docker ps` shows the same containers `Up` as in Step 1.3.

> **↳ If Coolify became unreachable**, the cause is almost certainly a host-bound port you did not
> allow in Step 5.2 rather than a container port. Compare `sudo ss -tulpn` against Step 1.3's
> output, add the missing `ufw allow`, and re-verify. `sudo ufw disable` restores service
> immediately while you work it out.

### Step 8.3 — Only now, close the rescue sessions

- [ ] A brand-new session connects by key on `<SSH_PORT>`.
- [ ] Terminals A and B closed.

### Step 8.4 — Paste back

`PH-0.7` is **not done** until the output of Step 8.1 is pasted back. `BR-1768` — a task is never
marked done on a claim.

**Redact before pasting:** replace the real IP with `<SERVER_IP>` and the real port with
`<SSH_PORT>`. The command output contains both. Nothing else in it is sensitive.

---

## 9. Because this box was exposed for ninety days

> ### ✅ Executed 2026-07-29 — **clean. The question is closed.**
>
> - Exactly **one** uid-0 account (`root`).
> - **Two** `authorized_keys` entries, both known to the founder.
> - Every recorded login from the founder's own addresses.
> - No unexplained cron entry, timer or listener.
>
> No rebuild needed. This does not make the ninety-day exposure retroactively safe — it makes it
> _checked_, which is the most that can be claimed. Recorded in `STATUS.md §7` so the question is
> not reopened from memory later.

Hardening closes the door. It does not establish that nobody came in. These checks are cheap, and
running them now is the only chance to see anything before the logs rotate.

```bash
# Successful logins, and where from.
last -F -n 50
sudo lastb -F -n 30 2>/dev/null | head -30      # failed attempts; expect MANY on a public box

# Authorized keys anywhere they should not be — the commonest persistence mechanism.
sudo find /root /home -name authorized_keys -exec ls -la {} \; -exec cat {} \;

# Accounts with a login shell, and anything with uid 0 other than root.
awk -F: '$7 !~ /(nologin|false)$/ { print $1, $3, $7 }' /etc/passwd
awk -F: '$3 == 0 { print $1 }' /etc/passwd        # expect exactly: root

# Scheduled persistence.
sudo crontab -l 2>/dev/null; sudo ls -la /etc/cron.d/
sudo systemctl list-timers --all | head -20

# Anything listening that you cannot account for.
sudo ss -tulpn
```

- [ ] No `authorized_keys` entry you do not recognise.
- [ ] Exactly one uid-0 account.
- [ ] No unexplained cron entry, timer, or listener.

> **↳ If anything here looks wrong, stop and report it.** Investigating a suspected compromise is
> not part of `PH-0.7`, and continuing to harden a machine that is already controlled by someone
> else accomplishes nothing. The honest response to a real finding is to rebuild, not to patch —
> and rebuilding is cheap right now, because no production data exists yet.

---

## 10. Recovery

**Every procedure starts at the provider web console (Step 1.1).** It does not use SSH and is
unaffected by anything below.

| Lockout mode                        | Symptom                                      | Recovery                                                                                                                                                         |
| ----------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wrong `ufw` rule**                | New SSH connections time out                 | Console → `sudo ufw disable` → fix the rule → `sudo ufw enable` → prove a new session **before** closing the console                                             |
| **`sshd` refuses to start**         | `Connection refused` immediately             | Console → `sudo sshd -t` names the file and line → fix → `sudo systemctl restart ssh`                                                                            |
| **Wrong port**                      | Connection times out                         | Console → `sudo ss -tulpn \| grep ssh` shows the real port                                                                                                       |
| **Key rejected**                    | `Permission denied (publickey)`              | Console → check `/home/<ADMIN_USER>/.ssh` is `700` and `authorized_keys` is `600` and owned by the user → `sudo journalctl -u ssh -n 50` gives the actual reason |
| **Locked out by your own fail2ban** | Was working, now times out from your address | Console → `sudo fail2ban-client set sshd unbanip <YOUR_IP>`                                                                                                      |
| **Root disabled, admin key broken** | Neither account can log in                   | Console → log in as `<ADMIN_USER>` at the console prompt (the console is not SSH, so `PermitRootLogin no` does not apply to it) → repair the key                 |
| **Console itself unavailable**      | No path in at all                            | Provider support, or rebuild. **This is why Step 1.1 is a gate.** No production data exists yet, so a rebuild costs an afternoon.                                |

---

## 11. What this task does **not** do

Recorded so the gaps are not mistaken for coverage. **Updated after execution.**

| Not done here                                         | Where it belongs                                                                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Port 8000 — Coolify dashboard, publicly reachable** | **`PH-0.8`**, and it must be closed **without an IP allow-list** — the founder's address is dynamic (§5.6). **LIVE GAP.**          |
| Provider network firewall (currently zero rules)      | **`PH-0.8`** — the layer that actually closes container ports (§5)                                                                 |
| Restricting 80/443 to Cloudflare ranges               | **`PH-0.8`**, `BR-1702`                                                                                                            |
| `DOCKER-USER` chain restrictions                      | **`PH-0.8`** — decision recorded in §5, deliberately not risked here                                                               |
| SSH port change                                       | **Not planned.** Decided against at execution; see §3.                                                                             |
| Coolify credential rotation, dashboard binding        | **`PH-0.9`** — Coolify is verified running here, not reconfigured                                                                  |
| Container memory limits (`BR-878`)                    | **`PH-0.9`** — and `08 §11.1`'s figures **no longer apply**; see §12                                                               |
| Memory limits on the **client** containers            | **Out of scope permanently.** They are not Josam Academy's to constrain (§12).                                                     |
| Container non-root / read-only fs (`BR-1703`)         | **`PH-0.9`** / `PH-0.11`                                                                                                           |
| 26 pending package updates, one unappliable           | **Deferred** — needs a reboot window on a box serving client traffic. `STATUS.md §8`.                                              |
| Backups and restore verification                      | **`PH-0.28`** — and its scope is **Josam Academy's database only**; see §12. Provider VM snapshots are **not** coverage (`SB-17`). |

---

## 12. What execution revealed: this box is shared

> **Discovered during execution, and it changes two later tasks.**

The server does **not** host a provider template. It hosts **live client projects**: 13 containers
in total — 5 application containers, their own `postgres:18-alpine` and `redis:7.2`, plus the
Coolify stack. Memory at rest is roughly **22% of 8 GB**.

Every earlier document assumed the whole machine belongs to Josam Academy. It does not.

### `PH-0.9` — `08 §11.1`'s memory budget is invalid as written

`08 §11.1` allocates 6.9 GB of 8 GB to Josam Academy components with 1.1 GB of headroom. That
sums to the whole box and leaves nothing for the client stack, which is already running.

**`PH-0.9` must recalculate against actual free headroom and record the split.** It must **not**
apply limits to the existing client containers — they are not this project's to constrain.

There is a real risk to state plainly: **the client containers are unlimited.** Josam Academy's
containers will have declared limits and the client ones will not, so under memory pressure the
kernel's OOM killer is more likely to select a limited container than an unlimited one. Declaring
limits on our side is still correct (`BR-878`), but it does not protect us from growth on the
other side. Sizing `PH-0.9` conservatively is the mitigation available; constraining the client
containers is not.

### `PH-0.28` — backup scope must name what it does **not** cover

`PH-0.28` covers **Josam Academy's database only**. The client `postgres:18-alpine` instance is
**out of scope**. This must be stated in the backup runbook itself, not only here: a backup job
running on a box with two Postgres instances is exactly the situation in which someone later
assumes both are covered. Combined with `SB-17` — provider VM snapshots are not backup coverage —
the client database currently has **no verified backup**, and that is the client's arrangement to
make, not this project's to assume.

---

## 13. Founder checklist

Everything that must be run manually, in order. No step may be skipped, and the three gates may
not be passed on assumption.

- [x] **1.1** Provider web console proven working ← **gate**
- [x] **1.2** Two SSH sessions open, both staying open
- [x] **1.3** Current state recorded; `<OLD_PORT>` and the listening-port list noted
- [x] **2.1** `<ADMIN_USER>` exists, in `sudo` and `docker`
- [x] **2.2** Public key installed, permissions `700` / `600`
- [x] **2.3** Key login proven in a new session ← **gate**
- [x] **3** SSH port — **deliberately not changed**; decision recorded in §3
- [x] **4.1–4.3** Root disabled, passwords disabled, **all three login tests run**
- [x] **5.1–5.4** ufw rules added **before** enable; new session proven after ← **gate**
- [x] **5.5** Postgres and Redis refused **from outside the host**
- [x] **6** fail2ban active on `22` — **and proven to ban**, after `mode = aggressive` (see §6)
- [x] **7** unattended-upgrades enabled, dry run clean
- [x] **8.1** Final verification block run in a fresh session
- [x] **8.2** **Coolify still serving** ← regression check
- [x] **8.3** Rescue sessions closed only after a new session is proven
- [x] **9** Ninety-day exposure checks run — **clean**, no rebuild needed
- [x] **8.4** Output pasted back, IP and port redacted

**`PH-0.7` is marked done only when Step 8.1's output has been pasted back** (`BR-1761`,
`BR-1768`). Not when this file is committed.

> ### ✅ **Done — 2026-07-29.** Output pasted back and recorded in `STATUS.md §4`.
>
> Three deviations, all deliberate and all recorded in place: §3 (port unchanged), §5.6 (port 8000
> deferred to `PH-0.8` with a named constraint), §6 (fail2ban required `mode = aggressive`).
>
> One live gap remains and is tracked as an open blocker, not as covered: **port 8000**.
