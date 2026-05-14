#!/usr/bin/env bash
# inkling — installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/MeetVys/inkling/main/install.sh | bash
#   ./install.sh   (when run from a local clone)

set -euo pipefail

SKILL_DEST="${HOME}/.claude/skills/doc"
SKILL_FILE="${SKILL_DEST}/SKILL.md"
REPO_RAW="https://raw.githubusercontent.com/MeetVys/inkling/main"

echo "→ inkling installer"

# Detect whether we're running from a local clone or from curl|bash
if [[ -f "$(dirname "")/skill/SKILL.md" ]]; then
  SRC="$(dirname "")/skill/SKILL.md"
  MODE="local clone"
elif [[ -f "./skill/SKILL.md" ]]; then
  SRC="./skill/SKILL.md"
  MODE="local clone"
else
  SRC=""
  MODE="curl"
fi

echo "  install mode: ${MODE}"
echo "  destination:  ${SKILL_FILE}"

# Warn if a previous install exists
if [[ -f "${SKILL_FILE}" ]]; then
  echo "  ⚠️  An existing /doc skill is installed."
  read -r -p "    Overwrite? [y/N] " response
  if [[ ! "${response}" =~ ^[Yy]$ ]]; then
    echo "  aborted."
    exit 1
  fi
fi

mkdir -p "${SKILL_DEST}"

if [[ "${MODE}" == "local clone" ]]; then
  cp "${SRC}" "${SKILL_FILE}"
else
  if ! command -v curl >/dev/null 2>&1; then
    echo "  ❌ curl is required for remote install."
    exit 1
  fi
  curl -fsSL "${REPO_RAW}/skill/SKILL.md" -o "${SKILL_FILE}"
fi

echo ""
echo "  ✓ installed inkling at ${SKILL_FILE}"
echo ""
echo "  Open Claude Code in any folder and try:"
echo "    \"Hey, create an HTML doc that captures my notes on [topic].\""
echo ""
echo "  Tutorial: https://meetvys.github.io/inkling/"
