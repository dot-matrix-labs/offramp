# New Project Bootstrap

> [!IMPORTANT]
> This is an agent entrypoint. You are an AI coding assistant (Claude Code, Gemini CLI, or equivalent) running inside the Calypso developer container on a remote cluster. Follow every step in order. Do not skip steps. Do not ask the user to do anything that this document says you can do yourself.

---

## Context

You have just been connected to a fresh Calypso developer container. The cluster was provisioned by `scripts/provision-cluster.sh` and the operator has SSH'd into this container via the instructions in `.calypso-connect`.

Your job is to:
1. Establish GitHub credentials and create the project's private repository
2. Shallow-clone the Calypso template into that repository
3. Push the initial state to GitHub
4. Bootstrap the project scaffold and push again

At the end of this process, the operator will have a running private GitHub repository seeded from the Calypso template, a local workspace on the dev container, and the project scaffold committed and ready for development.

---

## Pre-flight: Read your environment

Before doing anything else, confirm you are in the right environment.

```bash
# You should see: Linux, inside a container, as user 'agent'
uname -a
whoami
hostname
```

If you are not on Linux or not running as `agent`, stop and tell the operator — something went wrong in provisioning.

---

## Step 1: Establish GitHub credentials

You need a GitHub Personal Access Token (PAT) with the following scopes:
- `repo` (full repository access — read, write, admin)
- `packages:write` (to push images to GHCR)
- `delete_repo` (optional but useful)

Ask the operator: **"Please provide your GitHub PAT. It should have `repo` and `packages:write` scopes."**

Once you have it, authenticate the GitHub CLI:

```bash
# Set the token in the environment (do not write it to a file)
export GITHUB_TOKEN=<the-token-the-operator-provided>

# Authenticate gh CLI using the token
echo "${GITHUB_TOKEN}" | gh auth login --with-token

# Verify
gh auth status
```

Expected output: `Logged in to github.com as <username>`.

Also configure git to use the token for HTTPS operations:

```bash
git config --global credential.helper store
git config --global user.name "$(gh api user --jq .login)"
git config --global user.email "$(gh api user --jq .email)"
```

---

## Step 2: Establish the project name and GitHub owner

Ask the operator:
1. **Project name** — lowercase, hyphens only, no spaces. Example: `invoice-processor`
2. **GitHub owner** — their username or org where the private repo will be created. Example: `acme-corp`

Set these for the rest of this session:

```bash
export PROJECT_NAME=<project-name>
export GITHUB_OWNER=<owner>
export REPO_URL="https://github.com/${GITHUB_OWNER}/${PROJECT_NAME}"
```

---

## Step 3: Create the private GitHub repository

```bash
gh repo create "${GITHUB_OWNER}/${PROJECT_NAME}" \
  --private \
  --description "Built with Calypso" \
  --confirm
```

Verify it exists:

```bash
gh repo view "${GITHUB_OWNER}/${PROJECT_NAME}"
```

---

## Step 4: Shallow-clone the Calypso template

Calypso is the template repository. You clone it with `--depth=1` (one commit of history only — you do not need the full git history) and `--branch=main`.

```bash
cd /workspace

git clone \
  --depth=1 \
  --branch=main \
  --single-branch \
  https://github.com/dot-matrix-labs/calypso.git \
  "${PROJECT_NAME}"

cd "${PROJECT_NAME}"
```

Confirm the clone:

```bash
ls -la
# You should see: prompts/, scripts/, containers/, k8s/, .github/, etc.
```

---

## Step 5: Rewire the repository to the new private origin

The cloned repo points at `dot-matrix-labs/calypso`. Replace the origin with the project's private repo.

```bash
# Remove the shallow clone's git history and start fresh
# (We keep the files, not the template's commit history)
rm -rf .git
git init -b main
git remote add origin "https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${PROJECT_NAME}.git"
```

Set up the `.calypso-connect` file in the repo root so the operator and IDE always have connection info:

```bash
# Copy the connection file into the project workspace if it exists at /tmp
if [[ -f "/tmp/.calypso-connect" ]]; then
  cp /tmp/.calypso-connect .calypso-connect
fi
```

---

## Step 6: Make the initial commit and push

```bash
git add -A
git commit -m "init: bootstrap from calypso template"
git push -u origin main
```

Verify on GitHub:

```bash
gh repo view "${GITHUB_OWNER}/${PROJECT_NAME}" --web 2>/dev/null || \
  echo "Repo URL: ${REPO_URL}"
```

The operator can now see the repository on GitHub.

---

## Step 7: Bootstrap project standards

Download the current Calypso standards into the project's `docs/standards/` directory. This is the same command that starts every future development session.

```bash
bash scripts/bootstrap-standards.sh
```

Expected: `docs/standards/` created with all blueprint and process files.

Read every file in `docs/standards/` before proceeding:

```bash
for f in docs/standards/*.md; do
  echo "=== $f ===" && cat "$f"
done
```

Do not skip this. The standards files are your operating instructions for the project.

---

## Step 8: Scaffold the project structure

Create the project's monorepo scaffold. This establishes the directory layout, base package.json files, and empty entrypoints that all future development builds on.

```bash
mkdir -p \
  apps/frontend/src \
  apps/server/src \
  apps/worker/src \
  packages/ui/src \
  packages/db/src \
  packages/shared/src \
  docs/standards \
  docs/decisions
```

Create the root `package.json`:

```bash
cat > package.json <<EOF
{
  "name": "${PROJECT_NAME}",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun run --filter '*' test",
    "typecheck": "bun run --filter '*' typecheck"
  }
}
EOF
```

Create stub `package.json` files for each workspace:

```bash
for app in frontend server worker; do
  cat > "apps/${app}/package.json" <<EOF
{
  "name": "@${PROJECT_NAME}/${app}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist",
    "test": "bunx vitest run",
    "typecheck": "bunx tsc --noEmit"
  }
}
EOF
  touch "apps/${app}/src/index.ts"
done

for pkg in ui db shared; do
  cat > "packages/${pkg}/package.json" <<EOF
{
  "name": "@${PROJECT_NAME}/${pkg}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist",
    "typecheck": "bunx tsc --noEmit"
  },
  "exports": {
    ".": "./dist/index.js"
  }
}
EOF
  touch "packages/${pkg}/src/index.ts"
done
```

Create a root `tsconfig.json`:

```bash
cat > tsconfig.json <<EOF
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  }
}
EOF
```

Create the `.gitignore`:

```bash
cat > .gitignore <<EOF
node_modules/
dist/
.env
.env.*
!.env.test
*.local
.DS_Store
EOF
```

---

## Step 9: Run the scaffold checklist

Verify the scaffold is correct before committing:

```bash
# All workspaces visible
bun install 2>/dev/null || true
bun run build 2>/dev/null || echo "(no source yet — expected)"

# No secrets in git staging
git status | grep -v "\.env" | head -20
```

Now commit the scaffold:

```bash
git add -A
git commit -m "feat: project scaffold — monorepo structure, workspace packages"
git push
```

---

## Step 10: Start a tmux session and confirm IDE connection

Start a named tmux session so the operator can always reattach and the session survives disconnects:

```bash
tmux new-session -A -s main
```

From inside tmux, confirm the workspace:

```bash
pwd        # should be /workspace/<project-name>
gh repo view   # should show the private repo
claude --version 2>/dev/null || echo "claude: ready"
```

Tell the operator:

> **Bootstrap complete.**
>
> Your project repository is at: `https://github.com/<owner>/<project-name>`
> SSH connection details are in `.calypso-connect` at the project root.
>
> To connect your IDE:
> Add the SSH config block from `.calypso-connect` to your local `~/.ssh/config`,
> then connect via Remote-SSH to `calypso-<project-name>` and open `/workspace/<project-name>`.
>
> You will see all files I create in real time. I am running in the tmux session named `main`.
> To watch me work: `ssh calypso-<project-name>` then `tmux attach -t main`.
>
> Next step: run the product owner interview to define what we are building.
> See `docs/standards/product-owner-interview.md`.

---

## What the operator sees from their IDE

When connected via Remote-SSH:

```
/workspace/<project-name>/
  apps/
    frontend/src/
    server/src/
    worker/src/
  packages/
    ui/src/
    db/src/
    shared/src/
  docs/
    standards/      ← all calypso blueprints, synced at session start
    decisions/      ← architecture decision records
  containers/       ← docker images
  k8s/              ← cluster manifests
  .calypso-connect  ← connection info (no secrets)
  package.json
  tsconfig.json
```

Files appear and update in real time as the agent writes them. The operator can open any file, read the agent's work, navigate the project, and use their IDE's git integration to see diffs — all without interfering with the agent's session.

---

## Troubleshooting

**Dev container SSH connection refused**
- Check the NodePort is still assigned: `kubectl get svc dev -n calypso` (run on the host, not in the container)
- Check the pod is running: `kubectl get pods -n calypso`
- Restart the dev deployment: `kubectl rollout restart deployment/dev -n calypso`

**`gh auth status` shows not authenticated**
- The `GITHUB_TOKEN` env var is not persisted across sessions. Re-run Step 1 at the start of every new tmux session.

**`git push` asks for credentials**
- Confirm `git remote -v` shows `https://<token>@github.com/...` not plain HTTPS. Re-run Step 5's `git remote set-url` with the token embedded.

**tmux session not found after reconnect**
- SSH back in and run `tmux new-session -A -s main` — this creates a new session if none exists, or reattaches to `main` if it does.
