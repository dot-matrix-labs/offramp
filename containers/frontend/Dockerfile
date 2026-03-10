FROM oven/bun:1-alpine

LABEL org.opencontainers.image.source="https://github.com/dot-matrix-labs/calypso"
LABEL org.opencontainers.image.description="Calypso frontend container — fetches release bundle from GitHub on startup"
LABEL org.opencontainers.image.licenses="MIT"

# wget is needed by the entrypoint to fetch the release bundle at startup.
RUN apk add --no-cache wget

WORKDIR /app

# server.ts is stable runtime code — lives in the base image.
# dist/ is fetched from GitHub Releases at startup via entrypoint.sh.
COPY server.ts ./server.ts
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /app/dist

RUN addgroup -S frontend && adduser -S -G frontend frontend \
    && chown -R frontend:frontend /app

USER frontend

EXPOSE 8080

# start-period covers the GitHub download on a cold start
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
