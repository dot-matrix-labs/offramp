#!/bin/bash

# setup-ai-hooks.sh
# Installs Calypso AI Agent git hooks.

HOOKS_DIR=".git/hooks"
SOURCE_DIR="scripts/git-hooks"

if [ ! -d "$HOOKS_DIR" ]; then
    echo "Error: .git/hooks directory not found. Are you in the root of the Calypso repository?"
    exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory $SOURCE_DIR not found."
    exit 1
fi

echo "Installing AI Agent Git Hooks..."

for hook in prepare-commit-msg post-checkout pre-commit commit-msg pre-push; do
    if [ -f "$SOURCE_DIR/$hook" ]; then
        echo "Installing $hook..."
        cp "$SOURCE_DIR/$hook" "$HOOKS_DIR/"
        chmod +x "$HOOKS_DIR/$hook"
    else
        echo "Warning: Source hook $hook not found in $SOURCE_DIR, skipping."
    fi
done

echo "Done! Calypso AI Agent hooks are now active."
echo "Note: The 'prepare-commit-msg' hook will now inject context into your commit templates."
