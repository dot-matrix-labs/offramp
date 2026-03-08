#!/bin/bash
set -e

# Create standards directory
mkdir -p docs/standards

# List of standard files to download
FILES=(
  "calypso-blueprint.md"
  "development-standards.md"
  "documentation-standard.md"
  "git-standards.md"
  "product-owner-interview.md"
  "scaffold-task.md"
  "security-standards.md"
  "multi-agent-protocol.md"
  "telemetry-feedback-loop.md"
)

# Pin to a specific commit for reproducibility. Update this hash deliberately
# when upgrading standards — do not track main blindly.
COMMIT="main"
BASE_URL="https://raw.githubusercontent.com/dot-matrix-labs/calypso/${COMMIT}/prompts"

echo "Downloading Calypso standards (ref: ${COMMIT})..."

for FILE in "${FILES[@]}"; do
  echo "  - $FILE"
  curl -sSL "$BASE_URL/$FILE" -o "docs/standards/$FILE"
done

echo "Done. Standards saved to ./docs/standards/"

echo ""
echo "================================================================================"
echo "IMPORTANT: Once bootstrapped, your local docs/standards/ files are the source"
echo "of truth. Update them deliberately — do not re-run this script on every session."
echo ""
echo "To pin to a specific version, edit COMMIT in this script to a commit hash."
echo "================================================================================"
echo ""
echo "AGENT INSTRUCTION:"
echo "Read all files in ./docs/standards/ before proceeding with any development or"
echo "documentation tasks. Start with calypso-blueprint.md."
echo "================================================================================"
