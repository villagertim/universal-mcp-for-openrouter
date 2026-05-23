#!/bin/bash
# SPDX-License-Identifier: MIT

# ==============================================================================
# Universal MCP for OpenRouter — Workspace Restore Script
# Extracts a workspace backup tarball, restores credentials, and rebuilds.
# ==============================================================================

set -euo pipefail

# Text formatting helper constants
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
NC="\033[0m" # No Color

BACKUP_FILE="openrouter-mcp-workspace.tar.gz"

echo -e "${BOLD}${CYAN}====================================================${NC}"
echo -e "${BOLD}${CYAN}🚀 Universal MCP for OpenRouter — Workspace Restore${NC}"
echo -e "${BOLD}${CYAN}====================================================${NC}"

# Check for the backup file
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup archive '$BACKUP_FILE' not found in current directory.${NC}"
    echo -e "Please ensure you copy both this restore script and the tarball into the same target directory."
    exit 1
fi

echo -e "\n${YELLOW}📦 Extracting workspace archive...${NC}"
tar -xzf "$BACKUP_FILE"
echo -e "   - Extracted all project resources."

# Restore environment credentials
echo -e "\n${YELLOW}🔑 Configure OpenRouter API Key${NC}"
read -p "Would you like to configure your OpenRouter API Key now? (y/n): " -r CONFIRM
if [[ $CONFIRM =~ ^[Yy]$ ]]; then
    read -sp "Enter your OpenRouter API Key (sk-or-v1-...): " API_KEY
    echo
    if [ -n "$API_KEY" ]; then
        echo "OPENROUTER_API_KEY=$API_KEY" > .env
        echo -e "   - ${GREEN}Created credentials file (.env) successfully.${NC}"
    else
        echo -e "   - ${RED}Empty key entered. Skipping credential setup.${NC}"
    fi
else
    echo -e "   - Skipping credential setup. Remember to create your .env manually later."
fi

# Install dependencies
echo -e "\n${YELLOW}⚡ Installing Node.js packages (npm install)...${NC}"
if command -v npm &> /dev/null; then
    npm install
    echo -e "   - ${GREEN}Dependencies installed successfully.${NC}"
else
    echo -e "   - ${RED}npm command not found. Please install Node.js and run 'npm install' manually.${NC}"
fi

# Rebuild project
echo -e "\n${YELLOW}🔨 Compiling TypeScript sources (npm run build)...${NC}"
if command -v npm &> /dev/null && [ -f "package.json" ]; then
    npm run build
    echo -e "   - ${GREEN}Project compiled cleanly.${NC}"
else
    echo -e "   - ${RED}Unable to compile. Please install dependencies and run 'npm run build' manually.${NC}"
fi

echo -e "\n${BOLD}${GREEN}🎉 Workspace Restore Completed Successfully!${NC}"
echo -e "----------------------------------------------------"
echo -e "👉 ${BOLD}Verify your installation:${NC}"
echo -e "   Run the built-in diagnostic tool to verify your setup:"
echo -e "   ${BOLD}node build/index.js --profile antigravity --verify${NC}"
echo -e "   (Or trigger the 'verify_setup' tool from your client agent)"
echo -e "----------------------------------------------------"
