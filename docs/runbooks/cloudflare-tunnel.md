# Runbook — `PH-0.8` Cloudflare Tunnel & Origin Firewall

| Field         | Value                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| **Task**      | `PH-0.8` — Cloudflare Tunnel for the Coolify dashboard, then the provider firewall            |
| **Type**      | **B** — authored here, executed by the founder                                                |
| **Authority** | `BR-1702`, `BR-1704`, `14 §12`, `08 §12`, `SB-22`, and `PH-0.7 §5` (why `ufw` cannot do this) |
| **Closes**    | `SB-22` — the Coolify dashboard is reachable from the internet on port 8000                   |
| **Status**    | ⬜ Not executed. Not done until the founder pastes back the verification output (`BR-1768`).  |

---

## 0. Read this first

### What this task is

Port 8000 is open to the internet. It is password-protected, not unprotected — but it is an
administrative panel for **five live client applications** on a shared box, and it is reachable by
anyone who scans the address.

`ufw` cannot close it. Docker publishes the port and its rules are traversed **before** the `INPUT`
chain `ufw` manages, so `ufw` reports `active`, default-deny, and the port stays open
(`PH-0.7 §5`). This task closes it from **outside** the machine, at the provider's network firewall,
and replaces it with an outbound-only tunnel.

An IP allow-list was rejected: the founder's address is dynamic, so an allow-list locks them out of
their clients' control panel on the next reconnection.

### The one rule that prevents a lockout

> **The tunnel is added alongside the existing access, proven working, and only then is port 8000
> closed. Never the other way round.**

This tunnel becomes the access path to the founder's **clients'** control panel. If it breaks, the
ability to manage other people's production projects goes with it. Every gate in this file exists
to make sure that cannot happen in one step.

Two consequences, both binding:

- **§7 is a hard gate.** If any part of it fails, **stop and leave port 8000 open.** A tunnel that
  half-works is worse than no tunnel, because the failure is discovered at the moment it is needed.
- **The provider web console is the documented fallback** and is never removed. §10 states exactly
  how to restore direct port 8000 access from it.

### What "proven" means here, and why the obvious test is not enough

The Coolify dashboard is **not one port**. The panel is served on 8000, but live deployment logs
and the in-browser terminal are separate WebSocket services on **6001** and **6002**. A tunnel that
routes only 8000 gives a dashboard that logs in, renders, looks entirely correct — and then never
streams a deployment log and never opens a terminal.

If port 8000 has already been closed by the time that is discovered, there is no working panel to
go back to.

> **The acceptance test is not "the login page loads". It is "a deployment log streams and a
> terminal opens".** §7 tests those explicitly.

### Placeholders

Substitute your own values. **Nothing real is written in this file, and nothing real is pasted back
into it or into the repository.**

| Placeholder        | Meaning                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `<SERVER_IP>`      | The server's public address                                         |
| `<ADMIN_USER>`     | The non-root administrative user from `PH-0.7`                      |
| `<PANEL_HOSTNAME>` | The hostname the dashboard will answer on, e.g. `panel.example.com` |
| `<ZONE>`           | The Cloudflare zone (domain) the hostname lives in                  |
| `<TUNNEL_NAME>`    | A name for the tunnel, e.g. `coolify-panel`                         |
| `<TUNNEL_ID>`      | The UUID Cloudflare assigns when the tunnel is created              |
| `<FOUNDER_EMAIL>`  | The single identity allowed through Cloudflare Access               |

**Never** paste a token, a tunnel UUID, an email, a hostname or an IP into a commit, an issue, or a
chat. `cloudflared` writes a **credentials file containing a secret** — §4 says where it lives and
that it never leaves the server.

---

## 1. Before you touch anything

### Step 1.1 — ✅ **GATE: the provider web console works**

Exactly as `PH-0.7 §1.1`. Open the provider's browser console and log in. **Do not continue until a
shell prompt is on screen.** Every recovery path in §10 begins here, and none of them uses SSH or
the tunnel.

### Step 1.2 — Open two SSH sessions and keep both

```bash
ssh <ADMIN_USER>@<SERVER_IP>
```

One to work in, one untouched as a rescue. Close neither until §9 is complete.

### Step 1.3 — Confirm the dashboard works **now**, the way you will test it later

Open `http://<SERVER_IP>:8000` in a browser and log in. Then, in the panel:

1. Open any application and start or view a deployment — **confirm the log streams live.**
2. Open a container terminal — **confirm it connects and accepts a keystroke.**

This is the same test §7 runs through the tunnel. Establishing that it passes **now** means a
failure later is the tunnel's fault and not a pre-existing condition.

### Step 1.4 — Record the current state

```bash
# What is actually listening, and which container owns it
sudo ss -tulpn | grep -E ':(80|443|8000|6001|6002|8080)\b'

# The published ports, per container
sudo docker ps --format '{{.Names}}\t{{.Ports}}'

# Whether a provider firewall already has rules (PH-0.7 found it empty)
# — read this in the provider's web console, not on the box.
```

Keep the output. §2 uses it, and §8 needs to know what was there before.

---

## 2. What each port is — decide **after** looking, not before

The founder's instruction was explicit: state what each port is for before deciding, and do not
close a port Coolify needs to function. The table below is what these ports are **on a default
Coolify v4 install**. Step 1.4's output is the authority for this box.

| Port         | Normally                                                                                                                               | Decision                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `22`         | SSH                                                                                                                                    | **Stays open.** `PH-0.7` decision — non-default port declined, fail2ban covers noise.          |
| `80` / `443` | `coolify-proxy` — client apps and, later, `josamacademy.com`                                                                           | **Restricted to Cloudflare ranges** (`BR-1702`). Not closed: this is how the sites are served. |
| `8000`       | The Coolify dashboard                                                                                                                  | **Closed** once §7 passes.                                                                     |
| `6001`       | Coolify **realtime** — deployment log streaming (WebSocket)                                                                            | Closed **only if** §7 proves logs stream through the tunnel.                                   |
| `6002`       | Coolify **terminal** — in-browser container shell (WebSocket)                                                                          | Closed **only if** §7 proves the terminal opens through the tunnel.                            |
| `8080`       | **Determine before deciding.** Commonly the proxy's own dashboard/API, but on a shared box it may equally be a **client application**. | See Step 2.1.                                                                                  |

### Step 2.1 — Identify `8080` before touching it

```bash
sudo ss -tulpn | grep ':8080'
sudo docker ps --format '{{.Names}}\t{{.Ports}}' | grep 8080
```

Then decide from what it actually is:

- **A client application** → **leave it alone.** It is not this project's to close (`PH-0.7`, the
  shared-box constraint). Note it in the paste-back so it is a known, deliberate exposure rather
  than an oversight.
- **The proxy's dashboard/API** → close it. Nothing needs it from the internet; it is reachable
  from the host and, if wanted, through the tunnel later.
- **Nothing listening** → nothing to do. Record that.

> **If Step 2.1 cannot identify the owner with confidence, leave the port open and say so.** An
> unexplained open port recorded as unexplained is a smaller problem than a client outage caused by
> closing something that turned out to matter.

---

## 3. Cloudflare — DNS and the zone

The account and R2 are ready. This section assumes the zone `<ZONE>` is already active on
Cloudflare and nothing else.

### Step 3.1 — Confirm the zone is active and proxied

In the Cloudflare dashboard, `<ZONE>` → **DNS**. Confirm the zone status is **Active**.

**Do not create a DNS record for `<PANEL_HOSTNAME>` by hand.** §5 creates it as a tunnel route,
which produces the correct proxied `CNAME` to the tunnel automatically. A manually created `A`
record pointing at `<SERVER_IP>` would defeat the entire task — it publishes the origin address,
which is what `BR-1702` forbids.

### Step 3.2 — If a record for `<PANEL_HOSTNAME>` already exists

Branch, as `PH-0.7` does for every step:

- **It exists as a proxied `CNAME` to a tunnel** → a tunnel may already be configured. Stop and
  read §4.1 before creating a second one.
- **It exists as an `A` record to `<SERVER_IP>`** → note it. §5 replaces it. Do **not** delete it
  yet — deleting it before the tunnel works removes an access path.
- **It does not exist** → normal case, continue.

---

## 4. `cloudflared` on the host — outbound only

The daemon dials **out** to Cloudflare and holds the connection open. **No inbound port is opened,
and no firewall rule is added for it.** That property is the reason this approach was chosen over
an allow-list.

### Step 4.1 — Is `cloudflared` already installed?

```bash
which cloudflared && cloudflared --version
sudo systemctl status cloudflared --no-pager 2>/dev/null | head -5
```

- **Installed and running a tunnel** → do not install a second one. Read its config
  (`/etc/cloudflared/config.yml`) and decide whether to add a hostname to the existing tunnel
  rather than create a new one. The rest of this file still applies; skip Step 4.2.
- **Installed, not running** → continue from Step 4.3.
- **Not installed** → Step 4.2.

### Step 4.2 — Install

```bash
# Cloudflare's repository, so `apt upgrade` keeps it current alongside everything else.
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt-get update && sudo apt-get install -y cloudflared
cloudflared --version
```

> Installed from the repository rather than a one-off `.deb` deliberately. `PH-0.7` enabled
> `unattended-upgrades`; a package installed outside apt is a package that silently stops receiving
> security updates, and this one terminates an authenticated path into the box.

### Step 4.3 — Authenticate

```bash
cloudflared tunnel login
```

Prints a URL. Open it in a browser, sign in, and authorise `<ZONE>`. Writes a certificate to
`~/.cloudflared/cert.pem`.

### Step 4.4 — Create the tunnel

```bash
cloudflared tunnel create <TUNNEL_NAME>
cloudflared tunnel list
```

This writes **`~/.cloudflared/<TUNNEL_ID>.json`, which contains a secret.**

```bash
# Move it somewhere the service account can read and nothing else can.
sudo mkdir -p /etc/cloudflared
sudo mv ~/.cloudflared/<TUNNEL_ID>.json /etc/cloudflared/
sudo chmod 600 /etc/cloudflared/<TUNNEL_ID>.json
sudo chown root:root /etc/cloudflared/<TUNNEL_ID>.json
```

> **This file is a credential.** It never leaves the server, is never committed, and is never
> pasted back. Anyone holding it can serve traffic as this tunnel.

---

## 5. Routing — and the decision that decides how fragile this is

There are two ways to point the tunnel at the dashboard, and they fail differently. **Pick
deliberately.**

### Option A — direct to the dashboard (`http://localhost:8000`) — **recommended**

The tunnel reaches the Coolify container directly and does **not** traverse `coolify-proxy`.

- **Independent of the proxy.** The most likely reason you urgently need the dashboard is that the
  proxy or an application is broken. Routing the dashboard _through_ the thing that is broken is
  how an outage becomes an outage you cannot fix.
- **Cost:** the realtime and terminal services are separate ports, so they need their own ingress
  rules and Coolify must be told the hostname to use for them. §7 proves whether this worked.

### Option B — through Coolify's own proxy (`http://localhost:80`)

Set the Coolify instance FQDN in **Settings → Instance Domain** and let its proxy route the
dashboard and realtime under one hostname.

- **Simpler:** one ingress rule, realtime handled by Coolify, nothing to configure per service.
- **Cost:** the dashboard's availability now depends on `coolify-proxy`, which also serves five
  clients' applications.

> **Recommendation: Option A.** The independence is worth the extra configuration, precisely
> because of the constraint that motivated this task — this is the panel for other people's
> production systems, and it must work on the day something else does not.
>
> If Option A's realtime cannot be made to work in this session, **switch to Option B rather than
> closing port 8000 with a half-working panel.** A working dashboard that depends on the proxy
> beats a broken one that does not.

### Step 5.1 — Write the config (Option A)

```yaml
# /etc/cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json

# Keep the connection healthy through NAT and idle periods.
protocol: quic

ingress:
  - hostname: <PANEL_HOSTNAME>
    service: http://localhost:8000
    originRequest:
      # Coolify's realtime and terminal are long-lived WebSockets. Without a generous idle
      # timeout the tunnel closes them mid-stream and a deployment log stops halfway with no
      # error — which reads as "the deployment hung".
      connectTimeout: 30s
      noTLSVerify: false

  # Required, and must be last: anything not matched above is refused rather than forwarded.
  - service: http_status:404
```

Validate before doing anything else:

```bash
sudo cloudflared tunnel ingress validate
```

> If §7 shows realtime failing, the fix is either additional ingress rules for the realtime and
> terminal hostnames, with Coolify's realtime host settings updated to match, or a switch to
> Option B. **Do not close port 8000 while this is unresolved.**

### Step 5.2 — Route DNS to the tunnel

```bash
cloudflared tunnel route dns <TUNNEL_NAME> <PANEL_HOSTNAME>
```

Creates a **proxied `CNAME`** to `<TUNNEL_ID>.cfargotunnel.com`. Confirm in the Cloudflare DNS tab
that it is proxied (orange cloud) and that **no `A` record for `<PANEL_HOSTNAME>` points at
`<SERVER_IP>`**.

### Step 5.3 — Run it as a service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared --no-pager | head -15
sudo journalctl -u cloudflared -n 30 --no-pager
```

Expect registered connections to several Cloudflare edge locations. **Four is normal, not a
duplicate.**

---

## 6. Cloudflare Access — one identity

Without this, the tunnel has published the dashboard to the entire internet on a friendlier
hostname. The panel's own password is not the boundary being relied on.

### Step 6.1 — Create the application

**Zero Trust → Access → Applications → Add an application → Self-hosted**

- Application domain: `<PANEL_HOSTNAME>`
- Session duration: **24 hours** — long enough not to be a nuisance, short enough that a stolen
  session cookie has a horizon.

### Step 6.2 — The policy

- Action: **Allow**
- Rule: **Emails** → `<FOUNDER_EMAIL>`

**One rule, one address.** Not "Emails ending in" — a domain rule grants access to every future
address on that domain, including ones created by somebody else.

### Step 6.3 — Confirm one-time-PIN login is available

Zero Trust → Settings → Authentication. With no identity provider configured, Cloudflare's
**One-time PIN** is the login method and it is sufficient here. If a provider is added later, the
policy above continues to work unchanged.

---

## 7. ✅ **GATE — prove the tunnel completely, with port 8000 still open**

> **Nothing in §8 happens until every line below passes.** This is the section that makes closing
> port 8000 safe.

### Step 7.1 — Reach the panel

From a browser **not** on the server:

1. `https://<PANEL_HOSTNAME>` → Cloudflare Access challenges for an identity.
2. Log in as `<FOUNDER_EMAIL>` → the Coolify login page appears.
3. Log in to Coolify → the dashboard renders.

### Step 7.2 — Prove Access actually denies

In a private window, attempt `https://<PANEL_HOSTNAME>` and enter **a different address**.

**Expected: refused.** An Access policy nobody has watched refuse is not a policy — it is a
configuration that has only ever been asked to say yes (`BR-1830`).

### Step 7.3 — ✅ Prove **realtime**, not just rendering

Through the tunnel hostname:

1. Open an application → trigger or view a deployment → **the log must stream live.**
2. Open a container terminal → **it must connect and accept a keystroke.**

**If either fails, stop.** Leave port 8000 open, resolve the routing (§5.1's note), and re-run this
step. This is the failure mode that closing 8000 would make unrecoverable.

### Step 7.4 — Prove it survives a restart

```bash
sudo systemctl restart cloudflared
sleep 10
sudo systemctl is-active cloudflared
```

Reload the panel. A tunnel that works until the first reboot is a tunnel that fails at 3 a.m.

```bash
sudo reboot
```

Wait, reconnect, and confirm `cloudflared` came back **on its own** and the panel answers. Then
repeat §7.3 — the WebSocket path is the part most likely to be forgotten in a service unit.

### Step 7.5 — Paste back before continuing

```bash
cloudflared --version
sudo systemctl is-enabled cloudflared
sudo systemctl is-active cloudflared
sudo cloudflared tunnel ingress validate
```

Plus, in words: the panel loads · a wrong identity is refused · **logs stream** · **the terminal
opens** · all four survived a reboot.

---

## 8. The provider firewall — the layer that actually closes container ports

This is done in the **provider's web console**, not on the box. `ufw` cannot do this
(`PH-0.7 §5`), and this firewall sits outside the network interface where Docker's rules cannot
reach.

> Both layers now exist and neither is complete on its own. `ufw` protects **host** services;
> the provider firewall protects **container-published** ports. `PH-0.7 §5` states the same from
> the other side.

### Step 8.1 — Restrict 80 and 443 to Cloudflare (`BR-1702`)

Replace "allow from anywhere" on 80 and 443 with rules allowing **only Cloudflare's ranges**:

- IPv4: <https://www.cloudflare.com/ips-v4>
- IPv6: <https://www.cloudflare.com/ips-v6>

Add **both** families. If the provider firewall supports IPv6 and it is left open, the restriction
has been applied to half the internet.

> **Verify a client site still loads before continuing.** These ports serve five live client
> applications. A typo here is a customer-visible outage for somebody else's business.

### Step 8.2 — Close 8000

Only now, and only if §7 passed completely.

Remove the rule permitting 8000, or add an explicit deny. Then, from **outside**:

```bash
curl -sS --max-time 10 http://<SERVER_IP>:8000 ; echo "exit=$?"
```

**Expected: a timeout, not a refusal.** A refusal means something answered; a timeout means the
packet was dropped before reaching the host.

Then reload `https://<PANEL_HOSTNAME>` and **repeat §7.3** — logs and terminal. That is the moment
the whole design is proven.

### Step 8.3 — 6001 and 6002

- **§7.3 passed through the tunnel** → close both. The dashboard no longer needs them publicly.
- **§7.3 needed them open** → Option A's routing is incomplete. Do not paper over it by leaving
  them open; either finish the routing or move to Option B, then close them.

### Step 8.4 — 8080

Per Step 2.1's finding. Close it, leave it, or record it as unidentified — but record which.

### Step 8.5 — Confirm what remains

From outside the box:

```bash
for p in 22 80 443 8000 6001 6002 8080; do
  printf '%-6s ' "$p"
  curl -sS --max-time 6 -o /dev/null "http://<SERVER_IP>:$p" 2>&1 | head -1 || true
  echo
done
```

Expected: 22 answers · 80/443 answer **only from Cloudflare**, so a direct request from your own
machine should now fail · 8000 times out · 6001/6002 per Step 8.3 · 8080 per Step 8.4.

---

## 9. `BR-1702` — the origin must not be publicly resolvable

```bash
dig +short <PANEL_HOSTNAME>
dig +short <ZONE>
```

**Neither may return `<SERVER_IP>`.** Both should return Cloudflare addresses.

Check the whole zone for records that leak the origin — a forgotten `mail`, `direct`, `staging` or
`www` `A` record undoes this entirely, because the tunnel protects one hostname and the DNS zone
publishes the address for anyone who looks.

**Close the rescue SSH sessions only after this passes.**

---

## 10. Recovery

**Every procedure starts at the provider web console.** It uses neither SSH nor the tunnel.

| Failure                                       | Symptom                                              | Recovery                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tunnel down, panel unreachable**            | `<PANEL_HOSTNAME>` errors; clients' sites still fine | Console → `sudo systemctl restart cloudflared` → `sudo journalctl -u cloudflared -n 50`                                                                                                                                                                                               |
| **Tunnel will not recover, panel needed now** | Above, and the restart does not help                 | **Provider firewall → re-open port 8000 → use `http://<SERVER_IP>:8000` directly.** This is the documented fallback and the reason the provider firewall is the mechanism: it is reversible from a browser in under a minute, with no shell. Close it again once the tunnel is fixed. |
| **Locked out by Cloudflare Access**           | Challenge refuses your own address                   | Zero Trust → Access → Applications → edit the policy. If the Cloudflare account itself is unreachable, use the fallback above.                                                                                                                                                        |
| **Cloudflare account or Zero Trust down**     | Challenge never loads                                | Fallback above. The dependency is real and is the trade for removing the open port.                                                                                                                                                                                                   |
| **80/443 rule wrong — client sites down**     | Clients' applications unreachable                    | Console → provider firewall → restore "allow from anywhere" on 80/443 → verify a client site → then re-apply the Cloudflare ranges carefully. **Client uptime outranks this task.**                                                                                                   |
| **`cloudflared` fails after a reboot**        | Panel down after maintenance                         | Console → `sudo systemctl enable --now cloudflared`. If it was never enabled, §7.4 was not completed.                                                                                                                                                                                 |
| **Credentials file lost**                     | Tunnel cannot start                                  | Console → `cloudflared tunnel delete <TUNNEL_NAME>` → recreate from §4.4. The DNS route is rewritten by §5.2.                                                                                                                                                                         |
| **Console itself unavailable**                | No path in at all                                    | Provider support. As at `PH-0.7`, no production data exists yet.                                                                                                                                                                                                                      |

---

## 11. Decision — does `josamacademy.com` go through the tunnel at `PH-0.11`?

The founder asked for a decision with reasoning rather than a question.

### **Recommendation: no. Application traffic stays on the proxied `A` record through `coolify-proxy`.**

The tunnel carries the **administrative** path only.

**1. Failure independence, which is the whole point of this task.** If application traffic shares
the tunnel, a `cloudflared` outage takes down the site _and_ the ability to log in and fix it. The
one property worth protecting is that the panel works on the day something else does not — routing
the product through the same process destroys it.

**2. `cloudflared` becomes a single process in front of paying learners.** A proxied `A` record
terminates at Cloudflare's edge and reaches the origin over ordinary HTTPS; the origin's own
service is the only thing that must be up. A tunnel adds a userspace daemon whose death is a total
outage. That is an acceptable risk for a panel one person uses, and a poor one for the product.

**3. Video.** The stack serves lesson video (`hls.js`). Sustained media throughput through a
tunnel is a worse path than the edge-to-origin one, and this audience is on mid-range Android over
4G (`02 §7`) — the connection least able to absorb an extra hop.

**4. Coolify already does this job.** Its proxy terminates TLS and routes per application,
including certificate issuance. Putting a tunnel in front duplicates routing that already exists
and that `PH-0.11` will configure anyway.

**5. The security requirements are opposite.** The panel must sit behind Cloudflare Access with one
identity. The public site must have **no** Access in front of it. One tunnel serving both means
Access policies scoped per hostname, where a mistake locks learners out of the product they paid
for. Separation makes that misconfiguration impossible rather than unlikely.

**The honest counter-argument:** a tunnel would let 80 and 443 be closed _entirely_ at the provider
firewall, removing origin exposure completely rather than restricting it. That is a real gain.
`BR-1702` is satisfied by Step 8.1's Cloudflare-range restriction, which captures most of it, and
the failure-independence argument outweighs the remainder.

**Revisit if** the origin address leaks despite §9 and is actively abused. That is a measurable
trigger, not a preference — and it would be a `PH-1.x` decision with the site already live.

---

## 12. What this task does **not** do

- **It does not touch `ufw`.** `PH-0.7` configured it; it cannot filter container ports and is not
  the tool for this.
- **It does not add a `DOCKER-USER` chain rule.** `PH-0.7 §5` recorded it as a `PH-0.8` decision:
  the provider firewall achieves the same restriction from outside the box with no risk to a
  running service, so the in-host rule is unnecessary complexity on a machine serving five clients.
- **It does not configure `josamacademy.com`.** DNS for the product is `PH-0.11`'s, per §11.
- **It does not change anything about the client applications** beyond restricting 80/443 to
  Cloudflare — which is a restriction on _who may reach them_, not on how they run.
- **It does not close SSH.** `PH-0.7`'s decision stands.

---

## 13. Founder checklist

| #   | Step                                                                                            | Evidence to paste back                                      |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | §1.1 provider console reachable                                                                 | "console gives a prompt"                                    |
| 2   | §1.3 dashboard, logs and terminal work **now**, on port 8000                                    | "all three work before any change"                          |
| 3   | §1.4 / §2.1 what is listening, and what `8080` is                                               | `ss` and `docker ps` output, **redacted**                   |
| 4   | §4 `cloudflared` installed, tunnel created                                                      | `cloudflared --version`, `tunnel list` with the ID redacted |
| 5   | §5 config validates, DNS route is a proxied `CNAME`                                             | `ingress validate` output                                   |
| 6   | §6 Access application with one email                                                            | "one Allow rule, one address"                               |
| 7   | **§7.1–7.3 GATE** — panel loads · wrong identity refused · **logs stream** · **terminal opens** | all four, in words                                          |
| 8   | §7.4 survives restart **and** reboot                                                            | `is-enabled`, `is-active`, and §7.3 repeated                |
| 9   | §8.1 80/443 restricted — **client site still loads**                                            | "client site verified after the rule"                       |
| 10  | §8.2 port 8000 closed                                                                           | `curl` **times out**, and §7.3 still passes                 |
| 11  | §8.3 / §8.4 decisions on 6001, 6002, 8080                                                       | which were closed, which left, and why                      |
| 12  | §9 origin not resolvable                                                                        | `dig` output showing Cloudflare addresses                   |

**Do not mark `PH-0.8` done until rows 7, 10 and 12 are all satisfied.** Row 7 is the gate, row 10
is the outcome the task exists for, and row 12 is `BR-1702`.

If any step is skipped or diverges, say which and why — `PH-0.7` produced three deliberate
deviations and recording them was more useful than the steps that went to plan.
