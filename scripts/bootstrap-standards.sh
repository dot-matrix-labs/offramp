#!/bin/bash
set -e

REPO="https://github.com/dot-matrix-labs/calypso.git"

echo "Downloading Calypso prompts..."

git clone --depth=1 --filter=blob:none --sparse "$REPO" .calypso-bootstrap
cd .calypso-bootstrap
git sparse-checkout set prompts
cd ..

cp -r .calypso-bootstrap/prompts ./prompts
rm -rf .calypso-bootstrap

echo ""
echo "Done. Prompts saved to ./prompts/"
echo ""
echo "================================================================================"
echo "AGENT INSTRUCTION:"
echo "The agent MUST read the files in ./prompts/ as the first action of the session."
echo "Do NOT proceed with any development or documentation tasks until these are read;"
echo "otherwise, you may fabricate conventions that violate the Calypso architecture."
echo "================================================================================"
