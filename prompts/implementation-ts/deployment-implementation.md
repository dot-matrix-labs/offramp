
# Deployment — Calypso TypeScript Implementation

> This document is the Calypso TypeScript reference implementation for the [Deployment Blueprint](../blueprints/deployment-blueprint.md). The principles, threat model, and patterns in that document apply equally to other stacks. This document covers the concrete realization using Bun, systemd, and GitHub Actions.

---

## Process Supervision

Applications are managed as `systemd` services:

```ini
# /etc/systemd/system/calypso-server.service
[Unit]
Description=Calypso Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/calypso
ExecStart=/usr/local/bin/bun run apps/server/index.ts
Restart=always
RestartSec=5
EnvironmentFile=/opt/calypso/.env

[Install]
WantedBy=multi-user.target
```

No Docker, no PM2, no custom restart scripts.

## Environment Variables

| File | Contents | In version control? |
|---|---|---|
| `.env` | Production secrets (API keys, DB passwords, signing keys) | No — `.gitignore`d |
| `.env.test` | Test-only credentials, fixture paths | Yes — committed |

## Logging

- **Chronological log:** stdout captured by `systemd` journal + rotated file at `/var/log/calypso/app.log`
- **Unique error log:** `/var/log/calypso/uniques.log` — deduplicated error categories with count and last-seen timestamp
- **Rotation:** Daily, 14-day retention. Managed by the OS log rotation facility.

## Browser Error Forwarding

Browser errors are caught via:
- `window.onerror` for synchronous errors
- `window.onunhandledrejection` for promise rejections
- React error boundaries for component tree crashes

All errors POST to `/api/logs` with `{ traceId, error, stack, url, timestamp }`.

## Trace ID

- Generated in the browser at the start of each user action (UUID v4)
- Sent as `X-Trace-Id` request header
- Server middleware extracts and attaches to all log entries for that request
- Returned as `X-Trace-Id` response header

## Build and Deploy

- Browser: `bun build apps/web/index.tsx --outdir dist/web`
- Server: runs directly via Bun (no build step required for TypeScript)
- Deploy: `git pull && bun install && bun build && systemctl restart calypso-server`

## Dependency Justification

| Package | Reason | Buy or DIY |
|---|---|---|
| `systemd` | OS-native process supervisor; no alternative on Linux | Buy (system package) |
| `logrotate` | OS-native log rotation; battle-tested, zero dependencies | Buy (system package) |
| UUID generation | Single function; agent generates internal implementation | DIY |
| Error forwarding client | Thin wrapper around fetch; no library needed | DIY |

---

## Antipatterns (TypeScript/Bun-Specific)

- **Container theater.** Wrapping a single Bun process in a Docker container for "consistency" when the development host and the production host are the same Linux distribution with the same runtime. The container adds a build step, a layer of indirection, and a new category of debugging (container networking, volume mounts, image versioning) — all to solve a problem that does not exist.
