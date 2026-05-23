#!/bin/bash
# SPDX-License-Identifier: MIT

# ==============================================================================
# Universal MCP for OpenRouter — Workspace Direct Deployment Script
# Uses rsync to securely transfer the clean source workspace to a remote system,
# showing real-time file transfer progress and comprehensive final status.
# ==============================================================================

set -euo pipefail

# Text formatting helper constants
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
NC="\033[0m" # No Color

echo -e "${BOLD}${CYAN}====================================================${NC}"
echo -e "${BOLD}${CYAN}🚀 Universal MCP for OpenRouter — Workspace Deploy${NC}"
echo -e "${BOLD}${CYAN}====================================================${NC}"

# Check that we are running this in the project root
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo -e "${RED}❌ Error: This script must be executed from the project root directory.${NC}"
    exit 1
fi

# Verify rsync is installed
if ! command -v rsync &> /dev/null; then
    echo -e "${RED}❌ Error: 'rsync' is not installed or not in PATH on this system.${NC}"
    echo -e "Please install rsync to proceed (e.g. 'sudo apt install rsync')."
    exit 1
fi

# Determine deployment variables (CLI arguments first, fallback to interactive prompts)
TARGET_USER="${1:-}"
TARGET_HOST="${2:-}"
TARGET_FOLDER="${3:-}"

# 1. SSH Username
if [ -z "$TARGET_USER" ]; then
    read -p "👤 Enter remote SSH Username (default: $USER): " INPUT_USER
    TARGET_USER="${INPUT_USER:-$USER}"
fi

# 2. SSH Host / IP
if [ -z "$TARGET_HOST" ]; then
    read -p "🖥️  Enter remote Host name or IP Address: " TARGET_HOST
    if [ -z "$TARGET_HOST" ]; then
        echo -e "${RED}❌ Error: Remote Host or IP Address is required.${NC}"
        exit 1
    fi
fi

# 3. Target Directory
if [ -z "$TARGET_FOLDER" ]; then
    read -p "📁 Enter remote Destination Folder path: " TARGET_FOLDER
    if [ -z "$TARGET_FOLDER" ]; then
        echo -e "${RED}❌ Error: Remote destination folder is required.${NC}"
        exit 1
    fi
fi

echo -e "\n${YELLOW}📡 Commencing deployment to: ${BOLD}${CYAN}${TARGET_USER}@${TARGET_HOST}:${TARGET_FOLDER}/${NC}"
echo -e "${YELLOW}🔍 Syncing workspace files (excluding binaries, dependencies, and credentials)...${NC}"

# Execute rsync with clean portable exclusions, compression (-z), verbose file lists (-v), 
# archive preserving links/times (-a), and real-time progress output (--progress)
# Double quotes are preserved in case folder paths contain spaces.
rsync -avz --progress \
  --exclude='node_modules/' \
  --exclude='build/' \
  --exclude='.env' \
  --exclude='context_store.json' \
  --exclude='symbol_index.json' \
  --exclude='rate_config.json' \
  --exclude='pricing_cache.json' \
  --exclude='.DS_Store' \
  --exclude='*.tgz' \
  --exclude='openrouter-mcp-workspace-*.tar.gz' \
  ./ "$TARGET_USER@$TARGET_HOST:$TARGET_FOLDER/"

# Capture final execution status
if [ $? -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}✅ Deployment Completed Successfully!${NC}"
    echo -e "----------------------------------------------------"
    echo -e "👉 ${BOLD}Next Steps on the Target Machine:${NC}"
    echo -e "   1. SSH into the remote machine:"
    echo -e "      ${BOLD}ssh ${TARGET_USER}@${TARGET_HOST}${NC}"
    echo -e "   2. Navigate to the folder:"
    echo -e "      ${BOLD}cd ${TARGET_FOLDER}${NC}"
    echo -e "   3. Set up credentials and build the project:"
    echo -e "      ${BOLD}echo \"OPENROUTER_API_KEY=your-api-key\" > .env${NC}"
    echo -e "      ${BOLD}npm install && npm run build${NC}"
    echo -e "----------------------------------------------------"
else
    echo -e "\n${RED}❌ Deployment failed. Please verify SSH connectivity, remote folder existence, and write permissions.${NC}"
    exit 1
fi
