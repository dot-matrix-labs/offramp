/**
 * Calypso Web Server
 *
 * Serves a pre-built release bundle fetched from GitHub Releases.
 * Accepts authenticated webhook requests to update to a new release tag.
 * Has no build capability and no access to source code.
 */

import { createHmac, timingSafeEqual } from "crypto";

const PORT = parseInt(process.env.PORT ?? "8080");
const UPDATE_SECRET = process.env.UPDATE_SECRET ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO ?? ""; // e.g. "dot-matrix-labs/my-app"

let currentTag = process.env.RELEASE_TAG ?? "";
let releaseDir = "/app/release";

interface UpdatePayload {
  tag: string;
  artifactUrl: string;
  sha256: string;
}

function verifySignature(body: string, signature: string): boolean {
  if (!UPDATE_SECRET) return false;
  const expected = createHmac("sha256", UPDATE_SECRET)
    .update(body)
    .digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

async function fetchAndInstallRelease(payload: UpdatePayload): Promise<void> {
  const response = await fetch(payload.artifactUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch artifact: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const hashBuf = new Uint8Array(
    await crypto.subtle.digest("SHA-256", buffer)
  );
  const actual = Array.from(hashBuf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (actual !== payload.sha256) {
    throw new Error(`Checksum mismatch: expected ${payload.sha256}, got ${actual}`);
  }

  // Write bundle — atomic swap via temp file
  const tmpPath = `${releaseDir}/.bundle.tmp`;
  const finalPath = `${releaseDir}/bundle.js`;
  await Bun.write(tmpPath, buffer);
  await Bun.file(tmpPath).arrayBuffer(); // flush
  const { execa } = await import("bun");
  await execa`mv ${tmpPath} ${finalPath}`;

  currentTag = payload.tag;
  console.log(`[webserver] updated to release ${currentTag}`);
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", tag: currentTag });
    }

    // Release update webhook
    if (url.pathname === "/update" && req.method === "POST") {
      const signature = req.headers.get("x-hub-signature-256") ?? "";
      const body = await req.text();

      if (!verifySignature(body, signature)) {
        return new Response("Forbidden", { status: 403 });
      }

      let payload: UpdatePayload;
      try {
        payload = JSON.parse(body);
      } catch {
        return new Response("Bad Request", { status: 400 });
      }

      try {
        await fetchAndInstallRelease(payload);
        return Response.json({ ok: true, tag: currentTag });
      } catch (err) {
        console.error("[webserver] update failed:", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // Serve the release bundle for all other routes
    const bundlePath = `${releaseDir}/bundle.js`;
    const file = Bun.file(bundlePath);
    if (!(await file.exists())) {
      return new Response("No release installed", { status: 503 });
    }

    return new Response(file, {
      headers: {
        "content-type": "application/javascript",
        "x-release-tag": currentTag,
      },
    });
  },
});

console.log(`[webserver] listening on :${PORT} — release: ${currentTag || "(none)"}`);
