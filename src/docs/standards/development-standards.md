# Development Standard

1. **Architecture:** Monorepo using TypeScript, Bun, React, and Tailwind CSS.
2. **Environment:** Continuous development, testing, and operation must occur natively on a bare-metal Linux host. Local development is only for initial scaffolding.
3. **Dependency Policy:** Hyper minimalism ("Buy vs DIY"). Do not add dependencies unless absolutely necessary.
4. **Testing:** No mocking libraries. Use recorded "golden" fixtures for API tests. Vitest for unit/integration, Playwright for browser/E2E. Tests must run on the target Linux environment.
5. **Types:** Define universal application types. Avoid Any.
