# Commit Messages

In traditional software development, the "why" behind a code change is often lost. Git commit messages provide a summary of _what_ changed, but rarely capture the full reasoning, the alternative approaches considered, or the specific prompt that led to the solution.

For autonomous agents, this context loss is critical. An agent entering an existing project needs to understand not just the current state of the code, but the _trajectory_ of decisions that led there.

**Git-Brain** transforms the version control system from a simple state tracker into a **Reasoning Ledger**. By embedding structured metadata into every commit, we create a searchable, replayable history of the agent's thought process.

### Goals

- **Context Preservation**: Enable agents to "remember" why a decision was made months ago.
- **Replayability**: Allow an agent to reconstruct a coding session by re-executing the stored prompts.
- **Auditability**: Provide a transparent log of autonomous decision-making.
- **Knowledge Transfer**: specific "Diff Reconstruction Hints" help new agents understand the architectural constraints without reading every line of code.

## 2. Specification

### 2.1 The Metadata Schema

Every automated commit must include a structured metadata block, invisible to casual human inspection (using HTML comments) but machine-readable.

```typescript
interface CommitMetadata {
    // The "trigger": A retroactive instruction that, if run now, would produce this result.
    // MUST reference specific existing .md files (templates, nags, methods) present BEFORE this commit.
    retroactive_prompt: string;

    // The "goal": Functional verification criteria
    expectedOutcome: string;

    // The "map": High-level architectural context or constraints
    contextSummary: string;

    // Identity
    agentId: string;
    sessionId: string;

    // The "Recipe": Implementation constraints/hints (Diff Reconstruction)
    diffHints?: string[];
}
```

### 2.2 Storage Format

The metadata is serialized as a JSON object and wrapped in an HTML comment block at the very end of the commit message.

**Example Commit Message:**

```text
feat(auth): implement jwt validation middleware

Adds a new middleware function to verify JWT tokens on protected routes.
Uses the 'jsonwebtoken' library.

<!--
GIT_BRAIN_METADATA:
{
  "retroactive_prompt": "Implement JWT middleware using templates/agents/engineer.md and enforcing templates/nags/commit-discipline-nag.md",
  "expectedOutcome": "Requests without valid tokens should return 401",
  "contextSummary": "Securing API endpoints for phase 2",
  "agentId": "coder-alpha-1",
  "sessionId": "sess_12345",
  "diffHints": ["Use req.headers.authorization", "Handle TokenExpiredError"]
}
-->
```

# Pre-flight

### Pre-commit Stage

Pre-commit nags run before a commit is finalized. They are designed to:

- **Auto-fix issues** where possible (formatting, simple linting)
- **Not block** the commit on non-critical issues
- **Run quickly** to not interrupt developer flow

**Default pre-commit nags by project type:**

| Project Type | Tool Nags                            |
| ------------ | ------------------------------------ |
| Node.js/Bun  | `prettier --write`, `eslint --fix`   |

### Implementation Plan Gate (blocking)

Every commit must include an update to `docs/plans/implementation-plan.md`. This is a hard block — the commit will not proceed if the file is not staged.

Add the following check to `.git/hooks/pre-commit` (or the project's shared hooks directory):

```bash
#!/usr/bin/env bash
# Implementation plan gate — every commit must update the plan.

if ! git diff --cached --name-only | grep -q "^docs/plans/implementation-plan\.md$"; then
  echo ""
  echo "COMMIT BLOCKED: docs/plans/implementation-plan.md has not been updated."
  echo ""
  echo "At every commit the implementation plan must be updated. Updates are twofold:"
  echo "  1) You learned something new and there are tasks that need to be added"
  echo "     or re-ordered — update the plan to reflect current understanding."
  echo "  2) Tasks that are now complete must be checked off (- [x])."
  echo ""
  echo "Update docs/plans/implementation-plan.md, stage it, and commit again."
  echo ""
  exit 1
fi
```

**Bootstrapping the hook:** The scaffold step must install this hook automatically so it is active from the first commit:

```bash
mkdir -p .git/hooks
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Store the canonical hook source in `scripts/hooks/pre-commit` so it is version-controlled and re-installable by any agent or developer who clones the repository.

### Pre-push Stage

Pre-push nags run before code is pushed to remote. They are designed to:

- **Strictly validate** all code quality standards
- **Block push** if any check fails
- **Include slow checks** that aren't appropriate for pre-commit

**Default pre-push nags by project type:**

| Project Type | Tool Nags                                          |
| ------------ | -------------------------------------------------- |
| Node.js/Bun  | `tsc --noEmit`, `eslint`, `prettier --check`       |