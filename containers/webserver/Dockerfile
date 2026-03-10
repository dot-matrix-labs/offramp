FROM oven/bun:1-alpine

LABEL org.opencontainers.image.source="https://github.com/dot-matrix-labs/calypso"
LABEL org.opencontainers.image.description="Calypso web server container — serves tagged release bundles only, no build capability"
LABEL org.opencontainers.image.licenses="MIT"

# No package manager. No git. No build tools.
# This image receives pre-built release artifacts via webhook and serves them.

WORKDIR /app

# Copy the server that handles release serving and webhook-triggered updates
COPY server.ts ./server.ts

# Pre-install only the runtime dependency the server needs
# (no devDependencies, no build step — server.ts uses Bun built-ins only)

RUN addgroup -S webserver && adduser -S -G webserver webserver

# Release artifacts land here at runtime (fetched by the update handler)
RUN mkdir -p /app/release && chown -R webserver:webserver /app

USER webserver

EXPOSE 8080

# RELEASE_TAG and UPDATE_SECRET must be set at runtime via environment
ENV RELEASE_TAG=""
ENV UPDATE_SECRET=""
ENV GITHUB_REPO=""

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["bun", "run", "server.ts"]
