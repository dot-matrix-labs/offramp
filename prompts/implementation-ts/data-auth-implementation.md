
# Data & Auth — Calypso TypeScript Implementation

> This document is the Calypso TypeScript reference implementation for the [Data & Auth Blueprint](../blueprints/data-auth-blueprint.md). The principles, threat model, and patterns in that document apply equally to other stacks. This document covers the concrete realization using Bun, SQLite, PostgreSQL, and Web Crypto.

---

## Database: Early Stage (SQLite)

- Engine: `bun:sqlite` (built into Bun runtime, zero dependencies)
- File location: `./data/app.db` (gitignored)
- Queries: parameterized SQL via `db.prepare(sql).all(params)`
- Migrations: numbered `.sql` files in `/apps/server/migrations/`, applied in order at startup

## Database: Production Stage (PostgreSQL)

- Engine: PostgreSQL (locally installed or cloud-hosted, e.g., Supabase)
- Connection: standard connection string in `.env`
- Queries: same parameterized SQL pattern; dialect differences handled in migration files
- Backups: automated via PostgreSQL's native tooling or provider's backup service

## Authentication

- **Signing:** HMAC-SHA256 via Web Crypto API (`crypto.subtle.sign`)
- **Algorithm pinning:** JWT header `alg` is verified to be `HS256` before validation; any other value is rejected
- **Token storage:** HTTP-only, Secure, SameSite=Strict cookie
- **Expiry:** Configurable; default 24 hours; enforced server-side on every request
- **Middleware:** Single function that extracts the cookie, verifies the JWT, and attaches the user to the request context; applied to all protected routes

## Package Structure

```
/apps/server
  /middleware/auth.ts       # JWT verify middleware
  /routes/auth.ts           # Login, logout, token refresh
  /migrations/              # Numbered SQL migration files
  /db.ts                    # Database connection and typed query functions
/packages/core
  /types/user.ts            # User type, shared between server and client
  /types/auth.ts            # Auth-related types (login request, token payload)
```

## Dependency Justification

| Package | Reason | Buy or DIY |
|---|---|---|
| `bun:sqlite` | Built into runtime; zero-dependency embedded database | Buy (runtime built-in) |
| PostgreSQL client | Database wire protocol; infeasible to implement | Buy |
| JWT library | Standard JWT sign/verify is ~50 lines with Web Crypto; no library needed | DIY |
| ORM (Prisma, TypeORM, Drizzle) | Adds abstraction, generated code, and runtime overhead; agent writes SQL directly | Do not buy |
| Auth SaaS (Auth0, Clerk) | Adds latency, cost, vendor lock-in for functionality the agent builds in minutes | Do not buy (unless mandated) |

---

## Antipatterns (TypeScript/Web-Specific)

- **ORM as safety blanket.** Using Prisma, TypeORM, or Drizzle because "ORMs prevent SQL injection." Parameterized queries prevent SQL injection. The ORM adds a schema file, a generation step, a runtime library, and a layer of abstraction between the agent and the database. The agent pays the cost in every session but gets no capability it cannot provide itself with typed query functions.

- **Auth SaaS by default.** Reaching for Auth0 or Clerk because "authentication is hard." For a standard username/password/JWT flow, authentication is roughly 200 lines of code using standard Web Crypto. The SaaS provider charges per user, adds an external dependency to the login path, and makes debugging auth failures require reading a third-party dashboard.

- **Tokens in localStorage.** Storing JWTs in `localStorage` because it is easier to access from JavaScript. Every script on the page can read `localStorage` — including injected scripts from XSS vulnerabilities. HTTP-only cookies are invisible to JavaScript by browser specification. Use them.

- **Shared database module in the browser.** Importing a database utility into the browser bundle "just for the types." The bundler pulls in the module and its dependencies. Even if the database code is tree-shaken away, the import path exists and a future developer or agent may follow it to add runtime database calls from the browser.
