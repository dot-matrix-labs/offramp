# Calypso FAQ

# For humans: Why do I need a blueprint
The Calypso Method exists because software rarely fails due to code quality—it fails because of unclear requirements, chaotic architecture, and hype-driven choices. Human engineers need a disciplined, repeatable process that survives tool churn, framework fads, and AI-assisted coding. Calypso enforces architecture-first design, staged product maturity, and stack consistency, ensuring that every feature is deliberately scoped, every dependency justified, and every AI agent constrained. It allows humans to focus on real problems and decisions while leveraging AI for repetitive work. The result: maintainable, predictable systems that scale from prototype to production without collapsing under complexity or hype.


## Development Environment

### "Why not on my Mac?"

Because you don't deploy on a Mac server. Trying to build code that works for development and testing on a Mac, only to later deploy it on Ubuntu, is an anti-pattern. 

The Calypso Blueprint mandates that all development occurs natively on a bare-metal Linux host in the cloud (using `tmux` and an AI agent like Claude/Gemini/Codex). This guarantees that the execution context exactly mirrors the deployment and testing environments.

### "Why exclusively use containers and Kubernetes?"

Instead of relying on human conveniences like hot-reloading `vite dev` servers that cause hybrid environment drift, we enforce strict environment parity by deploying exclusively to containers (even for local dev previews). While a strict build-and-deploy cycle in the background for local development might be annoying for human developers, AI agents do not care. A single `Dockerfile` and declarative Kubernetes manifests vastly reduce the amount of toolchain maintenance needed for multiple environments and create sane, exact reproductions across dev, test, and production.

## Architecture & Testing

### "Why Bun instead of Node or Deno?"

Bun is chosen for its significantly faster start times, built-in TypeScript execution (no `ts-node` or compilation steps required for server code), and built-in testing (`bun test`). It drastically reduces the number of toolchain dependencies needed to get a project running.

### "Why never mock APIs? Isn't that standard practice?"

Mocking is a leading cause of false confidence. You end up testing that your code works against your *imagination* of how an external API behaves, not how it *actually* behaves. The Calypso Blueprint requires generating "golden fixtures" via actual network requests. While harder to set up initially, it ensures your code survives real-world API drift and eliminates a massive source of production bugs.

### "Why no heavy state-management libraries (Redux, MobX, etc.)?"

Heavy state libraries encourage putting everything into global state, leading to tight coupling and complex rendering cycles. For 90% of web web applications, React hooks (`useState`, `useContext`) combined with simple prop-drilling or a data-fetching library (like React Query or SWR) are more than sufficient and much easier for AI agents to reason about without hallucinating massive boilerplate.

### "Why is dependency 'cloning' (DIY) encouraged over just doing `npm install`?"

Every `npm` dependency is a liability—it's code you don't control, bringing its own transitive dependencies, potential security flaws, and breaking changes. For trivial utilities (like date formatting or tiny UI components), having an AI agent generate a clean, tree-shaken, tested implementation directly in your codebase takes seconds and removes a permanent supply-chain risk. We explicitly reserve "Buy" (`npm install`) for complex, high-liability features like payment processing (Stripe) or dense specifications (PDF generation).

### Why no ORMs or Query Builders?
ORM's abstract away SQL performance and add massive generated footprint, for humans. AI engineering agents don't mind this, and can generate performant, type-safe queries directly in your codebase. Less dependencies to manage, and no assumptions of workflows or deployment strategies.