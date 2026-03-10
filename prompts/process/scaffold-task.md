# Calypso Scaffold Task (Agent Entrypoint)

**Role:** You are an autonomous agent bootstrapping a new Calypso project from scratch. Handle all steps autonomously. Only pause for human input when credentials or decisions are genuinely required.

---

## Step 1: Provision Linux Host

- [ ] **Linux host is available.** If the current machine is Linux, proceed. If not, provision a remote Linux host (Ubuntu 22.04+ recommended) using whatever cloud provider API or credentials you have access to (DigitalOcean, AWS, GCP, Hetzner, etc.).
- [ ] All subsequent steps execute on that host — SSH in and run commands there.

---

## Step 2: Set Up Kubernetes Cluster

Run `scripts/provision-cluster.sh` to install k3s, apply all manifests, create secrets, and confirm health in one step.

**Required environment variables:**
- `PROJECT` — lowercase project name (e.g. `invoice-processor`)
- `GITHUB_USER` — GitHub username or org
- `GITHUB_TOKEN` — GitHub PAT with `repo` + `packages:write` scopes
- One of: `DIGITALOCEAN_TOKEN` (creates a new Droplet) or `HOST_IP` + `SSH_KEY` (existing host)

```bash
# New DigitalOcean Droplet:
DIGITALOCEAN_TOKEN=<tok> PROJECT=<name> GITHUB_USER=<user> GITHUB_TOKEN=<pat> \
  ./scripts/provision-cluster.sh

# Existing Linux host:
HOST_IP=<ip> SSH_KEY=~/.ssh/id_ed25519 PROJECT=<name> GITHUB_USER=<user> GITHUB_TOKEN=<pat> \
  ./scripts/provision-cluster.sh
```

The script handles:
- [ ] k3s installed and `kubectl` configured
- [ ] All `k8s/` manifests applied
- [ ] All secrets created (GHCR credentials, SSH keys, Postgres, worker)
- [ ] All four containers running and healthy: `dev`, `frontend`, `worker`, `db`
- [ ] Frontend responds HTTP 200 at `http://<host-ip>:<frontend-nodeport>/health`
- [ ] `.calypso-connect` written to the current directory with SSH connection details

If the script fails, diagnose from the error output and fix before continuing.

---

## Step 3: Hand Off SSH to User

- [ ] Show the user the SSH connection details from `.calypso-connect`.
- [ ] Instruct the user to connect via terminal or an IDE with SSH remote support (VS Code Remote-SSH, JetBrains Gateway) for live file editing.
- [ ] Wait for the user to confirm they are connected before continuing.

---

## Step 4: Establish GitHub Credentials (inside dev container)

SSH into the dev container. All remaining steps run there.

Ask the operator for a GitHub PAT with `repo` + `packages:write` scopes if not already available, then authenticate:

```bash
echo "${GITHUB_TOKEN}" | gh auth login --with-token
gh auth status  # expected: Logged in to github.com as <username>

git config --global credential.helper store
git config --global user.name "$(gh api user --jq .login)"
git config --global user.email "$(gh api user --jq .email)"
```

---

## Step 5: Create Project Repo

Ask the operator for the project name (lowercase, hyphens only) and GitHub owner (username or org) if not already set. Then:

```bash
export PROJECT_NAME=<project-name>
export GITHUB_OWNER=<owner>

gh repo create "${GITHUB_OWNER}/${PROJECT_NAME}" --private --description "Built with Calypso" --confirm
gh repo view "${GITHUB_OWNER}/${PROJECT_NAME}"  # verify
```

---

## Step 6: Clone the Calypso Template

```bash
cd /workspace

git clone --depth=1 --branch=main --single-branch \
  https://github.com/dot-matrix-labs/calypso.git "${PROJECT_NAME}"

cd "${PROJECT_NAME}"

# Detach from template history and point at the new private repo
rm -rf .git
git init -b main
git remote add origin "https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${PROJECT_NAME}.git"
```

Copy in the connection info:
```bash
[[ -f "/tmp/.calypso-connect" ]] && cp /tmp/.calypso-connect .calypso-connect
```

---

## Step 7: Initial Commit and Push

```bash
git add -A
git commit -m "init: bootstrap from calypso template"
git push -u origin main
```

---

## Step 8: Set KUBE_CONFIG Secret

Extract the kubeconfig with the cluster's public IP and set it as a GitHub Actions secret so CI can deploy:

```bash
PUBLIC_IP=$(curl -s ifconfig.me)
kubectl config view --raw \
  | sed "s|https://127.0.0.1:6443|https://${PUBLIC_IP}:6443|g" \
  | base64 -w0 \
  | gh secret set KUBE_CONFIG -R "${GITHUB_OWNER}/${PROJECT_NAME}" --body -
```

- [ ] `KUBE_CONFIG` secret confirmed set. `GITHUB_TOKEN` is provided automatically by GitHub Actions.

---

## Step 9: Read All Prompts

Read every file in the `prompts/` directory before proceeding. These define architecture, process, security, UX, and implementation conventions for the entire project.

```
prompts/blueprints/
prompts/development/
prompts/implementation-ts/
prompts/process/
```

---

## Step 10: Product Owner Interview

Conduct the product owner interview per `prompts/process/product-owner-interview.md`. Do not skip or abbreviate it.

- [ ] Interview completed.
- [ ] Canonical PRD written to `docs/prd.md`.
- [ ] External API test credentials collected and stored in `.env.test` (not committed).

---

## Step 11: Scaffold

Verify all foundational elements are present before moving to prototyping. Fix anything missing yourself before proceeding.

### Architecture
- [ ] Monorepo structure established (`/apps/web`, `/apps/server`, `/packages/*`).
- [ ] All modules use TypeScript, Bun, React, and Tailwind CSS exclusively.
- [ ] `package.json` scripts use `bunx`, not globally installed binaries.
- [ ] Local monorepo dependencies are built in correct order before dependent modules.
- [ ] All modules pass `bun run build`.
- [ ] Linting and formatting are configured and pass cleanly.

### Documentation
- [ ] `docs/` directory exists at repo root. No docs outside it except per-directory `README.md` files.
- [ ] Code comments on every source file: module purpose, key types, and function definitions.
- [ ] `.git/hooks/pre-push` installed per `prompts/process/documentation-standard.md`.

### Testing
- [ ] Vitest and Playwright configured.
- [ ] No mocking libraries present (`jest.mock`, `msw`, etc.).
- [ ] Stub test files exist for all categories: server (unit, module, integration) and browser (unit, component, e2e).
- [ ] Full test suite passes.
- [ ] No lint or format warnings.
- [ ] E2e test starts the production `bun` server, which serves a stub HTML page, and Playwright drives it successfully.
- [ ] Playwright HTML reporter set to `open: 'never'`.

### Deployment
- [ ] `.env` template files present.
- [ ] `k8s/` manifests updated to reference the project's own registry (`ghcr.io/<your-org>/<your-project>/*`). Once CI runs, it replaces the upstream base images via `kubectl set image`.
- [ ] GitHub Actions workflows adapted from `.github/workflows/` in the Calypso repo: build images on push to `main`, push to `ghcr.io/<your-org>/<your-project>`, deploy to cluster via `kubectl set image`.
- [ ] A test CI run completes successfully: image built, pushed to registry, and deployed to the cluster.

### Final Check
- [ ] **No JS configs** — delete any `.js`/`.mjs` config files generated by scaffolding tools and rewrite in `.ts`.
- [ ] **No emit** — `"noEmit": true` in `tsconfig.json` for all `/packages/*`.
- [ ] **SPA routing** — Bun server checks `Bun.file.exists()` before falling back to `index.html`.
- [ ] **Blueprint compliance** — review all blueprint documents and confirm nothing was violated or skipped.

---

## Step 12: Start tmux Session and Confirm IDE Connection

```bash
tmux new-session -A -s main
```

From inside tmux, confirm the workspace:

```bash
pwd        # /workspace/<project-name>
gh repo view   # the new private repo
```

Tell the operator:

> **Bootstrap complete.**
>
> Repository: `https://github.com/<owner>/<project-name>`
> SSH details: see `.calypso-connect` at the project root.
>
> Add the SSH config block from `.calypso-connect` to your local `~/.ssh/config`,
> then connect via Remote-SSH and open `/workspace/<project-name>`.
>
> I am running in the tmux session named `main`. To watch: `ssh calypso-<project-name>` then `tmux attach -t main`.
>
> Next: awaiting your command to begin the Prototype phase.

---

**Action Required:**
If all items above are verified, output:
`[VERIFIED] Scaffold successful. Awaiting command to begin Prototype phase.`

If anything fails, output the failing items, plan the fixes, and execute them immediately.
