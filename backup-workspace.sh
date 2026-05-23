#!/bin/bash
# SPDX-License-Identifier: MIT

# ==============================================================================
# Universal MCP for OpenRouter — Workspace Backup Script
# Creates a clean, highly compressed tarball of the current workspace.
# Excludes platform-specific dependencies, compiled builds, and local API keys.
# ==============================================================================

set -euo pipefail

# Text formatting helper constants
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
NC="\033[0m" # No Color

DATE=$(date +%Y-%m-%d)
BACKUP_FILE="openrouter-mcp-workspace-${DATE}.tar.gz"

echo -e "${BOLD}${CYAN}====================================================${NC}"
echo -e "${BOLD}${CYAN}📦 Universal MCP for OpenRouter — Workspace Backup${NC}"
echo -e "${BOLD}${CYAN}====================================================${NC}"

# Check that we are running this in the project root
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ Error: This script must be executed from the project root directory.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}🔍 Preparing clean workspace backup...${NC}"
echo -e "   - Excluding platform-specific dependencies (${BOLD}node_modules/${NC})"
echo -e "   - Excluding compiled builds (${BOLD}build/${NC})"
echo -e "   - Excluding local environment credentials (${BOLD}.env${NC})"
echo -e "   - Excluding dynamic runtime databases (${BOLD}*.json${NC} state caches)"
echo -e "   - Excluding pre-packaged release distributions (${BOLD}*.tgz${NC})"

# Generate the tarball using standard portable exclusions
# Note: We retain .git/ so the full version control history is preserved.
tar \
  --exclude='node_modules' \
  --exclude='build' \
  --exclude='.env' \
  --exclude='context_store.json' \
  --exclude='symbol_index.json' \
  --exclude='rate_config.json' \
  --exclude='pricing_cache.json' \
  --exclude='.DS_Store' \
  --exclude="universal-mcp-for-openrouter-1.2.0.tgz" \
  -czf "../$BACKUP_FILE" .

if [ $? -eq 0 ] && [ -f "../$BACKUP_FILE" ]; then
    SIZE_KB=$(du -k "../$BACKUP_FILE" | cut -f1)
    SIZE_MB=$(echo "scale=2; $SIZE_KB / 1024" | bc 2>/dev/null || echo "$SIZE_KB KB")
    
    echo -e "\n${GREEN}✅ Workspace successfully backed up!${NC}"
    echo -e "   - Backup Archive: ${BOLD}${GREEN}../$BACKUP_FILE${NC}"
    echo -e "   - Archive Size  : ${BOLD}$SIZE_MB MB${NC}"
    echo -e "\n${YELLOW}👉 Next Steps:${NC}"
    echo -e "   1. Transfer ${CYAN}../$BACKUP_FILE${NC} and ${CYAN}restore-workspace.sh${NC} to your target system."
    echo -e "   2. Place them in the same directory on the target system and run:${NC}"
    echo -e "      ${BOLD}./restore-workspace.sh${NC}"
else
    echo -e "\n${RED}❌ Backup failed. Please check folder permissions.${NC}"
    exit 1
fi
