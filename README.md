# Calypso

A method, git-native tools, and a TypeScript reference implementation for building **supergreen** software:

- **Fused AI** — one AI over coherent, owned data
- **Tree-shaken** — no bloat, no unnecessary dependencies
- **Correct by construction** — architecture that enforces its own constraints
- **Self-improving** — each commit advances the plan and writes the next prompt

---

## Quickstart

Paste into your AI agent (Claude Code, Gemini CLI, Codex, etc.):

```
Agent, bootstrap a new Calypso project.

First, run:
curl -sSL https://raw.githubusercontent.com/dot-matrix-labs/calypso/main/scripts/bootstrap-standards.sh | bash

Then read docs/standards/calypso-blueprint.md before doing anything else.

Context: I am replacing GitHub Projects for a software team of 3.
```

---

## The Vision

AI lets every fruit stand build NASA-quality software, if you let it. A solo operator can now produce applications that would have taken a 20-person engineering team two years to ship. That is not an exaggeration — it is the current state of the art.

But there is a catch.

**To unlock AI's full capability, you need to go supergreen.** Orchestrating your existing SaaS stack with AI wrappers is a local maximum — you are routing around the constraints of software that was never designed for this environment. Supergreen software is fused AI-native from the start: tree-shaken to carry only what it needs, correct by construction through architecture that enforces its own constraints, and self-improving — each agent commit advances the plan and writes the next prompt. That is what Calypso is for.

There is a second, deeper problem with the fragmented SaaS model: *N* smart AIs deployed across *N* vendor data silos will always produce worse outcomes than a single AI — even a less capable one — operating over fused, coherent data. Fragmentation is not just an operational cost. It is a fundamental cap on the quality of every AI-assisted decision your organization can make. You cannot reason well across data you do not hold.

This vision has always required superhuman implementation capacity. We have arrived at the moment that exists.

---

## Reference Implementation

The quickstart uses **Calypso TS** — the TypeScript reference implementation:

| Layer | Choice |
|---|---|
| Language | TypeScript only |
| Runtime | Bun |
| UI | React + Tailwind CSS |
| Testing | Vitest (unit) + Playwright (headless E2E) |
| CI/CD | GitHub Actions |
| Database | SQLite → PostgreSQL |
| Auth | Self-hosted JWT (HTTP-only cookies) |
| Deploy | Bare metal Linux, systemd |

No Docker. No ORMs. No SaaS auth vendors. No mocks in tests.

A second reference implementation, **Calypso RS**, is in development: a minimalist Rust stack end-to-end, with a fully WASM client for both state management and DOM rendering. No React.

---

## Documentation

- [Calypso Blueprint](prompts/calypso-blueprint.md) — full architecture and process standard
- [UX Blueprint](prompts/ux-blueprint.md) — UX posture, agent UX, beauty as a gate condition
- [Data Security Blueprint](prompts/data-security-blueprint.md) — agent auth, scopes, and security posture
- [Scaffold Task Entrypoint](prompts/scaffold-task.md) — the agent's first action on a new project
- [Blueprint Authoring Standard](prompts/blueprint-standard.md) — how blueprints are written and structured
