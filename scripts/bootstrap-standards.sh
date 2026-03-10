#!/bin/bash
set -e

# Create standards directory
mkdir -p docs/standards

# List of standard files to download (path:localname)
FILES=(
  "blueprints/calypso-blueprint.md:calypso-blueprint.md"
  "development/development-standards.md:development-standards.md"
  "process/documentation-standard.md:documentation-standard.md"
  "process/git-standards.md:git-standards.md"
  "process/product-owner-interview.md:product-owner-interview.md"
  "process/scaffold-task.md:scaffold-task.md"
  "blueprints/environment-blueprint.md:environment-blueprint.md"
  "blueprints/worker-blueprint.md:worker-blueprint.md"
)

BASE_URL="https://raw.githubusercontent.com/dot-matrix-labs/calypso/main/prompts"

echo "Downloading Calypso standards..."

for ENTRY in "${FILES[@]}"; do
  REMOTE_PATH="${ENTRY%%:*}"
  LOCAL_NAME="${ENTRY##*:}"
  echo "  - $LOCAL_NAME"
  curl -sSL "$BASE_URL/$REMOTE_PATH" -o "docs/standards/$LOCAL_NAME"
done

echo "Done. Standards saved to ./docs/standards/"

echo ""
echo "================================================================================"
echo "AGENT INSTRUCTION:"
echo "The agent MUST now read these local files in ./docs/standards/ as the first"
echo "action of the session. Do NOT proceed with any development or documentation"
echo "tasks until these standards are read; otherwise, you may fabricate"
echo "conventions that violate the Calypso architecture."
echo "================================================================================"
