#!/usr/bin/env bash
set -euo pipefail

WORKTREES_ROOT="${CALYPSO_WORKTREES_ROOT:-}"
WORKTREE_GLOB="${CALYPSO_WORKTREE_GLOB:-}"
SLEEP_SECONDS="${CALYPSO_LOOP_SLEEP_SECONDS:-30}"
CODEX_BIN="${CALYPSO_CODEX_BIN:-codex}"
CODEX_PROMPT="${CALYPSO_CODEX_PROMPT:-You are the sole agent assigned to this Calypso feature worktree. This worktree maps to exactly one pull request. Your job is to keep advancing the PR until it is complete, then exit. Do not merge the PR. Do not stop early unless the PR is already closed or merged.

Execute this exact loop in order on every pass:

Step 1: Inspect the pull request.
- Read the current PR description.
- Read the current PR checklist.
- Identify the remaining unchecked items, open review issues, known CI failures, and any stated blockers.

Step 2: Read the planning documents.
- Find and read the relevant PRD file for this feature.
- Read the local implementation plan for this worktree.
- Build a concrete list of remaining tasks from the PR description, PRD, implementation plan, and any failing CI or tests.

Step 3: Resolve validation failures first.
- If there are known CI failures, failing tests, lint errors, type errors, build errors, or merge conflicts with main, work on those before starting new feature development.
- Stay on validation and merge-conflict resolution until those problems are gone.

Step 4: If validation is green, continue feature development with TDD.
- Pick exactly one small incomplete feature or checklist item.
- Write or update a failing test for that item first.
- Run the relevant test to confirm it fails.
- Implement the minimum code needed to make that test pass.
- Refactor only if needed to keep the code clear and maintainable.
- Run the relevant tests again after the change.

Step 5: Commit small increments.
- When a small coherent unit of work is complete and tests for that unit pass, create a small commit.
- Prefer multiple small commits over large commits.
- Do not batch unrelated changes into one commit.

Step 6: Update project tracking only after validation passes.
- When the current increment is implemented and the relevant tests pass, update the PR checklist.
- Update the local implementation plan to reflect exactly what is now complete and what remains.
- Keep both documents synchronized with the actual code and test status.

Step 7: Re-evaluate completion.
- Check whether all planned features are implemented.
- Check whether all required tests have been written.
- Check whether all relevant tests now pass.
- Check whether the PR checklist is fully complete.
- Check whether the local implementation plan is fully updated.
- Check whether the branch is free of merge conflicts with main.

If any completion condition is not satisfied, repeat the loop from Step 1.

Exit only when all of the following are true:
- every planned feature is implemented
- all required tests exist
- all relevant tests pass
- there are no known CI or validation failures
- the PR checklist is fully updated and complete
- the local implementation plan is fully updated
- the branch has no merge conflicts with main

Final rule:
- Do not merge the PR.
- If the PR is already merged or closed, exit without making changes.
- Otherwise continue until all exit conditions are satisfied, then exit.}"
MAX_PARALLEL="${CALYPSO_MAX_PARALLEL:-0}"
LOG_ROOT="${CALYPSO_CODEX_LOG_ROOT:-${WORKTREES_ROOT}/.codex-loop-logs}"
RUN_ONCE=0
WORKTREES_ROOT_SET=0
WORKTREE_GLOB_SET=0
declare -a DISCOVERED_WORKTREES=()

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Continuously runs Codex once per Calypso worktree until every discovered PR is merged or closed.

Options:
  --once                 Run a single pass and exit.
  --root PATH            Override the worktrees root.
  --glob PATTERN         Override the worktree glob under the root.
  --sleep SECONDS        Delay between passes. Default: ${SLEEP_SECONDS}
  --prompt TEXT          Override the default Codex prompt.
  --max-parallel N       Limit concurrent Codex runs. Default: all active worktrees.
  --log-root PATH        Directory for persistent stdout/stderr logs.
  -h, --help             Show this help.

Environment:
  CALYPSO_WORKTREES_ROOT
  CALYPSO_WORKTREE_GLOB
  CALYPSO_LOOP_SLEEP_SECONDS
  CALYPSO_CODEX_BIN
  CALYPSO_CODEX_PROMPT
  CALYPSO_MAX_PARALLEL
  CALYPSO_CODEX_LOG_ROOT
EOF
}

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

discover_worktrees() {
  local git_output
  local line
  local path
  local branch

  DISCOVERED_WORKTREES=()

  if [[ -n "$WORKTREES_ROOT" ]]; then
    if [[ ! -d "$WORKTREES_ROOT" ]]; then
      printf 'worktrees root does not exist: %s\n' "$WORKTREES_ROOT" >&2
      exit 1
    fi

    shopt -s nullglob
    for path in "$WORKTREES_ROOT"/${WORKTREE_GLOB:-*}; do
      [[ -d "$path" ]] || continue
      DISCOVERED_WORKTREES+=("$path")
    done
    shopt -u nullglob
    return 0
  fi

  git_output="$(git worktree list --porcelain 2>/dev/null || true)"
  if [[ -z "$git_output" ]]; then
    printf 'unable to discover git worktrees from the current repository\n' >&2
    exit 1
  fi

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    if [[ "$line" != worktree\ * ]]; then
      continue
    fi

    path="${line#worktree }"
    [[ "$path" != "$(pwd)" ]] || continue
    [[ -d "$path" ]] || continue

    if [[ -n "$WORKTREE_GLOB" ]]; then
      branch="$(basename "$path")"
      [[ "$branch" == $WORKTREE_GLOB ]] || continue
    fi

    DISCOVERED_WORKTREES+=("$path")
  done <<<"$git_output"
}

pr_state_for_worktree() {
  local worktree="$1"
  local branch
  local state

  if ! git -C "$worktree" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf 'NOT_GIT\n'
    return 0
  fi

  branch="$(git -C "$worktree" branch --show-current 2>/dev/null || true)"
  if [[ -z "$branch" ]]; then
    printf 'UNKNOWN\n'
    return 0
  fi

  state="$(gh pr view "$branch" --json state --jq .state 2>/dev/null || true)"
  if [[ -z "$state" ]]; then
    printf 'NO_PR\n'
    return 0
  fi

  printf '%s\n' "$state"
}

run_codex_for_worktree() {
  local worktree="$1"
  local worktree_name
  local stdout_log
  local stderr_log
  local run_stamp

  worktree_name="$(basename "$worktree")"
  run_stamp="$(date '+%Y%m%d-%H%M%S')"
  stdout_log="${LOG_ROOT}/${worktree_name}.${run_stamp}.stdout.log"
  stderr_log="${LOG_ROOT}/${worktree_name}.${run_stamp}.stderr.log"

  log "running codex in $worktree"
  log "stdout: $stdout_log"
  log "stderr: $stderr_log"
  "$CODEX_BIN" exec --full-auto -C "$worktree" "$CODEX_PROMPT" \
    >"$stdout_log" \
    2> >(tee "$stderr_log" >&2)
}

wait_for_available_slot() {
  if [[ "$MAX_PARALLEL" -le 0 ]]; then
    return 0
  fi

  while [[ "${#PASS_PIDS[@]}" -ge "$MAX_PARALLEL" ]]; do
    wait_for_batch_slot
  done
}

wait_for_batch_slot() {
  local remaining_pids=()
  local remaining_worktrees=()
  local pid
  local worktree
  local i
  local completed=0

  for i in "${!PASS_PIDS[@]}"; do
    pid="${PASS_PIDS[$i]}"
    worktree="${PASS_WORKTREES[$i]}"

    if kill -0 "$pid" 2>/dev/null; then
      remaining_pids+=("$pid")
      remaining_worktrees+=("$worktree")
      continue
    fi

    completed=1
    if wait "$pid"; then
      log "codex finished for $worktree"
    else
      log "codex failed for $worktree"
      PASS_FAILURES=$((PASS_FAILURES + 1))
    fi
  done

  PASS_PIDS=("${remaining_pids[@]}")
  PASS_WORKTREES=("${remaining_worktrees[@]}")

  if [[ "$completed" -eq 0 ]]; then
    sleep 1
  fi
}

wait_for_batch_completion() {
  while [[ "${#PASS_PIDS[@]}" -gt 0 ]]; do
    wait_for_batch_slot
  done
}

run_pass() {
  local worktree
  local state
  local active_count=0

  PASS_PIDS=()
  PASS_WORKTREES=()
  PASS_FAILURES=0

  discover_worktrees
  for worktree in "${DISCOVERED_WORKTREES[@]}"; do

    state="$(pr_state_for_worktree "$worktree")"
    case "$state" in
      MERGED|CLOSED)
        log "skipping $worktree because PR state is $state"
        ;;
      NOT_GIT)
        log "skipping $worktree because it is not a git worktree"
        ;;
      *)
        active_count=$((active_count + 1))
        log "processing $worktree with PR state $state"
        wait_for_available_slot
        run_codex_for_worktree "$worktree" &
        PASS_PIDS+=("$!")
        PASS_WORKTREES+=("$worktree")
        ;;
    esac
  done

  wait_for_batch_completion

  PASS_ACTIVE_COUNT="$active_count"
  PASS_FAILURE_COUNT="$PASS_FAILURES"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --once)
      RUN_ONCE=1
      ;;
    --root)
      WORKTREES_ROOT="$2"
      WORKTREES_ROOT_SET=1
      shift
      ;;
    --glob)
      WORKTREE_GLOB="$2"
      WORKTREE_GLOB_SET=1
      shift
      ;;
    --sleep)
      SLEEP_SECONDS="$2"
      shift
      ;;
    --prompt)
      CODEX_PROMPT="$2"
      shift
      ;;
    --max-parallel)
      MAX_PARALLEL="$2"
      shift
      ;;
    --log-root)
      LOG_ROOT="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'unknown argument: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ "$WORKTREES_ROOT_SET" -eq 1 && "$WORKTREE_GLOB_SET" -eq 0 ]]; then
  WORKTREE_GLOB="*"
fi

if [[ -z "$WORKTREES_ROOT" && -z "$WORKTREE_GLOB" ]]; then
  LOG_ROOT="${CALYPSO_CODEX_LOG_ROOT:-$(pwd)/.codex-loop-logs}"
fi

mkdir -p "$LOG_ROOT"

while true; do
  PASS_ACTIVE_COUNT=0
  PASS_FAILURE_COUNT=0
  run_pass

  if [[ "$PASS_ACTIVE_COUNT" -eq 0 ]]; then
    if [[ -n "$WORKTREES_ROOT" ]]; then
      log "no active worktrees remain under $WORKTREES_ROOT"
    else
      log "no active worktrees remain in git worktree discovery"
    fi
    exit 0
  fi

  if [[ "$PASS_FAILURE_COUNT" -gt 0 ]]; then
    log "${PASS_FAILURE_COUNT} codex run(s) failed in the last pass"
  fi

  if [[ "$RUN_ONCE" -eq 1 ]]; then
    exit 0
  fi

  log "sleeping ${SLEEP_SECONDS}s before the next pass"
  sleep "$SLEEP_SECONDS"
done
