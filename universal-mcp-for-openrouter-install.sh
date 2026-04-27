#!/bin/bash

# Installation script for Universal MCP for OpenRouter (Local Beta)
# This script installs the local Release Candidate tarball globally via npm.

TARBALL="universal-mcp-for-openrouter-1.2.0.tgz"

if [ -f "$TARBALL" ]; then
    echo "📦 Installing Universal MCP for OpenRouter ($TARBALL)..."
    npm install -g "./$TARBALL"
    
    if [ $? -eq 0 ]; then
        echo "✅ Installation successful!"
        echo "🚀 Run 'universal-mcp-for-openrouter --version' to verify."
        echo "📖 Refer to USER_MANUAL.md to configure your AI platform (Antigravity, Claude Code, Codex, or Opencode)."
    else
        echo "❌ Installation failed. Please ensure Node.js and npm are installed."
    fi
else
    echo "❌ Error: $TARBALL not found in the current directory."
    echo "Please ensure you are running this script from the project root."
fi
