FROM oven/bun:1-alpine

LABEL org.opencontainers.image.source="https://github.com/dot-matrix-labs/calypso"
LABEL org.opencontainers.image.description="Calypso worker container — headless agent runtime"
LABEL org.opencontainers.image.licenses="MIT"

# wget is needed by the entrypoint to fetch the release bundle at startup.
# Sentinel files (/tmp/ready, /tmp/alive) are written by the worker process
# and checked by the Kubernetes liveness and readiness probes.
RUN apk add --no-cache wget

WORKDIR /app

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /app/dist

RUN addgroup -S worker && adduser -S -G worker worker \
    && chown -R worker:worker /app

USER worker

ENTRYPOINT ["./entrypoint.sh"]
