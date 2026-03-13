# Worktree Implementation Plan

## PR: `feat: build codex session runtime`

- [x] Read the PR description, current branch state, and the Phase 5 Codex adapter requirements in [cli/calypso-cli-implementation-plan.md](/Users/lucas/code/ts/calypso-worktrees/cli-codex-session-runtime/cli/calypso-cli-implementation-plan.md).
- [x] Extend persisted runtime state to capture provider session IDs, streamed output, and normalized terminal outcomes.
- [x] Implement a Codex runtime that launches subprocesses, streams stdout and stderr, accepts follow-up input, and normalizes terminal states.
- [x] Add a first-class interactive Codex command constructor for launching against a specific worktree.
- [x] Cover the runtime with tests for streaming, provider session-id extraction, follow-up input routing, waiting-for-human detection, failed or aborted processes, persisted snapshots, and command construction.
- [x] Validate the slice with `cargo fmt --check` and `cargo test -p calypso-cli`.

## Remaining Work

- [x] None. This PR slice is complete and ready for review.
