#!/bin/sh
set -e

if [ -z "$APP_VERSION" ]; then
  echo "[worker] APP_VERSION is not set — cannot fetch release"
  exit 1
fi

MAX_ATTEMPTS=8
DELAY=5

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
  echo "[worker] downloading release ${APP_VERSION} (attempt ${attempt}/${MAX_ATTEMPTS})..."
  if wget -qO /tmp/worker.tar.gz \
    "https://github.com/dot-matrix-labs/calypso/releases/download/${APP_VERSION}/worker-dist.tar.gz"; then
    break
  fi
  if [ $attempt -eq $MAX_ATTEMPTS ]; then
    echo "[worker] all attempts exhausted — exiting"
    exit 1
  fi
  echo "[worker] retrying in ${DELAY}s..."
  sleep "$DELAY"
  DELAY=$((DELAY * 2))
  attempt=$((attempt + 1))
done

tar -xzf /tmp/worker.tar.gz -C /app
rm /tmp/worker.tar.gz

exec bun run /app/dist/worker.js
