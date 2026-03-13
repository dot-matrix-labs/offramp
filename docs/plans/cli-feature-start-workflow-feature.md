# CLI Feature Start Workflow Feature

## Summary

Implement the feature-start workflow that creates the standard Calypso feature unit from `main`: semantic branch, dedicated worktree, early draft pull request, and persisted repository state binding all four together.

## Problem

The product model depends on the invariant `feature = branch = worktree = pull request`, but the prototype currently assumes the current branch already exists. Until the CLI can create and bind that feature unit itself, operators must perform the most important orchestration step manually and the tool cannot guarantee its own lifecycle rules.

## User Outcome

An operator can start a new feature from `main` with one command and receive:

- a semantic feature branch
- a dedicated worktree path
- an early draft pull request
- persisted local state binding the feature to that branch, worktree, and PR

## Scope

- Add a feature-start command that validates the repository is on a valid base state.
- Create a new branch from `main`.
- Create a new worktree in a caller-configurable base directory.
- Open a draft pull request through `gh`.
- Persist the resulting feature binding into repository-local orchestration state.

## Non-Goals

- No release/deployment workflow creation.
- No multi-repository orchestration.
- No support for stacked PRs in this slice.

## Functional Requirements

1. The command must refuse to start from a dirty or non-`main` base state unless policy explicitly allows it.
2. Branch naming must be semantic and deterministic from the user-provided feature identifier.
3. Worktree creation and PR creation failures must roll back or report partial state safely.
4. Persisted state must reflect the new feature unit immediately after success.
5. The command must be usable both non-interactively and from future TUI flows.

## Acceptance Criteria

- Starting a feature from a clean `main` checkout creates a branch, worktree, and draft PR and records them in local state.
- Attempting to start from a dirty base checkout fails before mutating git state.
- Partial failures surface explicit recovery instructions and do not leave an ambiguous feature record behind.
- The worktree path recorded in state matches the path actually created on disk.

## Implementation Notes

- Keep git mutations and state persistence in a single orchestration boundary so cleanup is straightforward.
- Prefer explicit rollback for failures that happen after branch or worktree creation.
- Reuse the existing repository state bootstrap path to seed the new feature record.

## Test Plan

### Unit Tests

- semantic branch-name derivation from feature identifiers
- invalid base-state rejection
- rollback decisions for branch-created/worktree-failed and PR-failed cases

### Integration Tests

- create a temporary git repository and verify branch plus worktree creation from `main`
- exercise PR creation through a stubbed GitHub adapter boundary
- confirm the persisted feature unit matches the on-disk git state after success

### Failure-Mode Tests

- dirty working tree
- `main` missing locally
- target worktree path already exists
- `gh pr create` fails after branch push
