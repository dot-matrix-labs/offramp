
# Deployment Blueprint

> [!IMPORTANT]
> This blueprint defines how AI-agent-built software is deployed, kept alive, observed, and recovered — from the first demo through production.

---

## Vision

Deployment is the moment a codebase becomes a system. Code that passes every test and satisfies every requirement is worthless if it cannot be started, kept running, observed when it misbehaves, and recovered when it fails. Most deployment complexity exists to manage the gap between the development environment and the production environment. When that gap is eliminated — when the development host and the deployment target are the same operating system, the same runtime, the same process model — deployment reduces to its essential operations: build, start, supervise, observe.

The deployment strategy for agent-built software has one additional requirement that traditional deployments lack: an AI agent must be able to diagnose a production issue by reading logs, not by watching dashboards or receiving pages. Every log, trace, and error report must be structured for machine consumption first and human consumption second. A log file that requires a human to scroll through thousands of identical timeout errors to find the one meaningful exception is a log file that wastes an agent's context window and hides the signal in noise.

The cost of ignoring this blueprint is a system that works in development and fails in production in ways no one can diagnose. Processes that die silently and are not restarted. Errors that repeat ten thousand times and fill the disk while the root cause remains invisible. Deployments that require manual SSH sessions, custom scripts, and tribal knowledge that no agent can access. Simple deployment is not a shortcut — it is a discipline that makes the system operable by any agent in any session.

---

## Threat Model

| Scenario | What must be protected |
|---|---|
| Application process crashes and is not restarted | Service availability — the process supervisor must restart crashed processes automatically |
| Server runs out of disk space due to unrotated logs | Host stability — log retention policies must prevent disk exhaustion |
| Error occurs in the browser and is never reported to the server | Observability completeness — browser errors must be captured and forwarded to the server |
| Agent reads logs to diagnose an issue but context window fills with duplicate errors | Diagnostic efficiency — deduplicated error summaries must exist alongside chronological logs |
| Deployment requires manual steps that an agent cannot perform | Deployment autonomy — the full deploy process must be scriptable and non-interactive |
| Environment variables containing secrets are committed to the repository | Secret protection — production secrets must never be in version control |
| A deploy happens with failing tests | Deployment safety — CI must gate all deployments |
| The server is unreachable and no one knows why | Network observability — the process supervisor and health checks must report status |
| A rollback is needed but the previous version is not available | Rollback capability — previous builds must be recoverable from version control |

---

## Core Principles

### The process supervisor is not optional

An application process that is started manually and dies when the SSH session ends is not deployed — it is running. Deployment means the process starts at boot, restarts on crash, and reports its status to the operating system's service manager. The supervisor is the operating system's native process manager, not a custom script, not a Node process manager, not a container orchestrator.

### Logs are for machines first

Every log entry must be structured, timestamped, and traceable. A chronological log file serves as the complete record. A deduplicated summary file serves as the diagnostic entry point — an agent reads the summary to understand what categories of errors exist, then dives into the chronological log for specifics. Log formats are designed for parsing, not for reading in a terminal.

### Traces span the full stack

A single user action — clicking a button, submitting a form — generates a trace that follows the request from the browser through the API server to the database and back. Every component in the chain tags its work with the same trace ID. Reconstructing any user workflow is a matter of filtering by trace ID, not correlating timestamps across multiple log files.

### Deployment is a build, not a ceremony

Deploying a new version means building the code, stopping the old process, starting the new process, and verifying it is healthy. These steps are scripted, idempotent, and non-interactive. No SSH session, no manual file copy, no "run these five commands in this order." An agent or a CI pipeline can deploy without human assistance.

### Secrets are runtime configuration, not build artifacts

Environment variables containing secrets (API keys, database passwords, signing keys) are injected at runtime from files on the host that are not in version control. Test-only environment variables may be committed (they contain no production secrets). The boundary is clear: if it would be dangerous in a public repository, it does not go in version control.

---

## Design Patterns

### Pattern 1: Native Process Supervision

**Problem:** Application processes crash, and in development-to-production transitions the most common failure mode is a process that dies and no one restarts it. Custom restart scripts are fragile, inconsistent, and invisible to the operating system.

**Solution:** Register the application as a service with the operating system's native process supervisor. The supervisor starts the process at boot, restarts it on crash with configurable backoff, captures stdout/stderr to the system journal, and exposes status through standard tooling. No custom PID files, no wrapper scripts, no third-party process managers.

**Trade-offs:** Ties deployment to a specific init system. Acceptable because the deployment target is always Linux with a known init system. If the target changes, the supervisor configuration changes — the pattern remains the same.

### Pattern 2: Dual-Log Architecture

**Problem:** A chronological log file is complete but overwhelming. An agent diagnosing an issue must read potentially thousands of lines, most of which are duplicates of the same error. The signal-to-noise ratio makes log-based diagnosis expensive in tokens and time.

**Solution:** Maintain two log outputs:
- **Chronological log:** Every event, in order, with full detail. The complete record.
- **Unique error log:** A deduplicated set of error categories currently affecting the system. Each entry appears once regardless of how many times it occurred. Includes a count and the most recent timestamp.

The agent reads the unique log first to understand the error landscape, then consults the chronological log for specific trace IDs or time ranges.

**Trade-offs:** Two log files to manage and rotate. The unique log requires deduplication logic (hashing error signatures). The implementation cost is low; the diagnostic benefit is high.

### Pattern 3: Browser-to-Server Error Forwarding

**Problem:** Errors that occur in the browser — unhandled promise rejections, React error boundaries, DOM exceptions — are invisible to the server. The server logs show a healthy system while users experience failures.

**Solution:** The browser application catches all unhandled errors and forwards them to a server endpoint via HTTP POST. The error payload includes the error message, stack trace, user context, and the current trace ID. The server logs these browser errors alongside its own errors, creating a unified view of system health.

**Trade-offs:** Adds network traffic for error reporting. Errors that occur when the network is down cannot be forwarded (acceptable — the network being down is itself a detectable condition). The error endpoint must be protected against abuse (rate limiting, payload size limits).

### Pattern 4: Trace-ID Propagation

**Problem:** A user reports "it did not work." The developer must reconstruct what happened: which API calls were made, what the server did, what the database returned. Without a shared identifier across all components, reconstruction requires timestamp correlation across multiple log files — which is slow, imprecise, and sometimes impossible.

**Solution:** Generate a unique trace ID at the start of every user-initiated action (page load, form submission, API call). Pass this ID through every layer: browser → API request header → server handler → database query tag → response header → browser. Every log entry includes the trace ID. Reconstructing a workflow is a single filter operation.

**Trade-offs:** Requires discipline to propagate the trace ID through every layer. Missing propagation in one component breaks the chain. Mitigation: the trace ID middleware is implemented once in the server framework and once in the browser HTTP client — individual handlers do not need to manage it.

---

## Plausible Architectures

### Architecture A: Single-Binary Direct Serve (solo app, early-stage)

```
┌─────────────────────────────────────────────┐
│  Linux Host                                 │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  Process Supervisor                   │  │
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  Application Runtime            │  │  │
│  │  │  - Serves API routes            │  │  │
│  │  │  - Serves static assets (built) │  │  │
│  │  │  - Writes chronological log     │  │  │
│  │  │  - Writes unique error log      │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  .env        ← runtime secrets              │
│  .env.test   ← test credentials (committed) │
│  /var/log/app/ ← log rotation               │
└─────────────────────────────────────────────┘
```

**When appropriate:** Single application, single host, early through mid-stage. The runtime serves both API and static assets directly. No reverse proxy, no CDN, no container layer.

**Trade-offs:** No TLS termination (add a reverse proxy when needed). No horizontal scaling. No asset caching beyond browser defaults. Acceptable for development, demos, and low-traffic production.

### Architecture B: Reverse Proxy + Application (TLS, multiple apps)

```
┌──────────────────────────────────────────────────┐
│  Linux Host                                      │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Process Supervisor                        │  │
│  │                                            │  │
│  │  ┌──────────────┐  ┌───────────────────┐  │  │
│  │  │ Reverse Proxy │  │ App A (port X)    │  │  │
│  │  │ (port 443)    │──│ App B (port Y)    │  │  │
│  │  │ TLS, routing  │  │ ...               │  │  │
│  │  └──────────────┘  └───────────────────┘  │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Each app: own service, own logs, own .env       │
└──────────────────────────────────────────────────┘
```

**When appropriate:** Multiple applications on one host, or any application that needs TLS. The reverse proxy handles TLS termination and routes requests to the correct application by domain or path.

**Trade-offs:** Adds a reverse proxy component to configure and maintain. Justified when TLS or multi-app routing is required. Overkill for a single HTTP-only dev preview.

### Architecture C: CI-Driven Deploy Pipeline (automated, gated)

```
┌────────────────────────────────────────────────────┐
│  CI Platform                                       │
│                                                    │
│  Push to main                                      │
│       │                                            │
│       ▼                                            │
│  All test workflows pass                           │
│       │                                            │
│       ▼                                            │
│  Deploy workflow:                                  │
│    1. SSH to production host                       │
│    2. Pull latest code                             │
│    3. Build (browser + server)                     │
│    4. Restart service via process supervisor        │
│    5. Health check (HTTP 200 from /health)         │
│    6. Report success or rollback                   │
│       │                                            │
│       ▼                                            │
│  Deployment complete                               │
└────────────────────────────────────────────────────┘
```

**When appropriate:** Production deployments where every deploy must be gated by passing tests. The CI platform handles the deploy, not a human SSH session. Rollback is pulling the previous commit and restarting.

**Trade-offs:** Requires SSH access from CI to production host (key management). Deploy is sequential (not blue/green). Acceptable for single-host deployments; add a load balancer for zero-downtime when scale demands it.

---

## Reference Implementation — Calypso TypeScript

> The following is the Calypso TypeScript reference implementation. The principles and patterns above apply equally to other stacks; this section illustrates one concrete realization using Bun, systemd, and GitHub Actions.

### Process Supervision

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

### Environment Variables

| File | Contents | In version control? |
|---|---|---|
| `.env` | Production secrets (API keys, DB passwords, signing keys) | No — `.gitignore`d |
| `.env.test` | Test-only credentials, fixture paths | Yes — committed |

### Logging

- **Chronological log:** stdout captured by `systemd` journal + rotated file at `/var/log/calypso/app.log`
- **Unique error log:** `/var/log/calypso/uniques.log` — deduplicated error categories with count and last-seen timestamp
- **Rotation:** Daily, 14-day retention. Managed by the OS log rotation facility.

### Browser Error Forwarding

Browser errors are caught via:
- `window.onerror` for synchronous errors
- `window.onunhandledrejection` for promise rejections
- React error boundaries for component tree crashes

All errors POST to `/api/logs` with `{ traceId, error, stack, url, timestamp }`.

### Trace ID

- Generated in the browser at the start of each user action (UUID v4)
- Sent as `X-Trace-Id` request header
- Server middleware extracts and attaches to all log entries for that request
- Returned as `X-Trace-Id` response header

### Build and Deploy

- Browser: `bun build apps/web/index.tsx --outdir dist/web`
- Server: runs directly via Bun (no build step required for TypeScript)
- Deploy: `git pull && bun install && bun build && systemctl restart calypso-server`

### Dependency Justification

| Package | Reason | Buy or DIY |
|---|---|---|
| `systemd` | OS-native process supervisor; no alternative on Linux | Buy (system package) |
| `logrotate` | OS-native log rotation; battle-tested, zero dependencies | Buy (system package) |
| UUID generation | Single function; agent generates internal implementation | DIY |
| Error forwarding client | Thin wrapper around fetch; no library needed | DIY |

---

## Implementation Checklist

### Alpha Gate

- [ ] `systemd` service file created and application starts on `systemctl start`
- [ ] Application restarts automatically after `kill -9`; verified by checking uptime
- [ ] `.env` file exists on host, is `.gitignore`d, and contains all required secrets
- [ ] `.env.test` committed with test-only credentials
- [ ] Stdout/stderr captured to journal; `journalctl -u calypso-server` shows output
- [ ] Log file written to `/var/log/calypso/app.log` with structured entries
- [ ] Trace ID generated and propagated browser → server → response header
- [ ] Browser error forwarding implemented; errors appear in server logs
- [ ] Health endpoint (`/health`) returns 200 when the application is running

### Beta Gate

- [ ] `uniques.log` implemented; deduplicated error categories with counts
- [ ] Log rotation configured; 14-day retention verified
- [ ] Deploy script exists and is idempotent (running twice has no side effects)
- [ ] CI deploy workflow created; deploys only after all test suites pass
- [ ] Rollback procedure tested: revert to previous commit, restart, verify health
- [ ] Disk usage monitoring; alert when log volume exceeds threshold
- [ ] All environment variables documented in `docs/` with descriptions (not values)

### V1 Gate

- [ ] Zero manual SSH steps required for a standard deploy
- [ ] Health check includes dependency status (database, external APIs reachable)
- [ ] Trace ID search: given a trace ID, all related log entries can be retrieved in one query
- [ ] Browser error rate tracked; anomalous spikes trigger alerts
- [ ] Backup strategy for application data (database dumps, uploaded files)
- [ ] Disaster recovery tested: fresh host provisioned and application deployed from scratch

---

## Antipatterns

- **Process babysitting.** Starting the application with `bun run` in a tmux pane and hoping it does not crash. When it does, no one notices until a user reports downtime. The process supervisor exists to eliminate this class of failure entirely.

- **Log and pray.** Writing logs to stdout and never configuring rotation, retention, or aggregation. The disk fills up. The application crashes because it cannot write. The logs that would explain the problem are the cause of the problem.

- **Dashboard-only observability.** Building a monitoring dashboard that a human must watch. An AI agent cannot watch a dashboard. Observability for agent-operated systems means structured logs and error summaries that an agent can read as text files.

- **Manual deploy rituals.** A deployment that requires SSHing into a server and running a sequence of commands from memory or a wiki page. The sequence is wrong. A step is skipped. The deploy fails in a way that is hard to diagnose and harder to roll back. Scripted deploys are repeatable, auditable, and agent-executable.

- **Secrets in version control.** Committing `.env` files with production API keys because "it is a private repository." Private repositories get cloned to CI runners, developer laptops, and agent sandboxes. Every copy is a potential leak vector. Production secrets exist only on the production host.

- **Container theater.** Wrapping a single Bun process in a Docker container for "consistency" when the development host and the production host are the same Linux distribution with the same runtime. The container adds a build step, a layer of indirection, and a new category of debugging (container networking, volume mounts, image versioning) — all to solve a problem that does not exist.

- **Silent browser errors.** Catching browser errors in `console.error` and assuming someone will see them. No one sees browser console output in production. Errors that are not forwarded to the server are errors that do not exist from the system's perspective.
