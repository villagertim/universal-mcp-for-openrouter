# Exposing Image & Vision Capabilities to Text-Only Platforms

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Visual Asset Analysis Protocol (Non-Visual Platforms)

As a terminal-based or text-only AI agent, you do not have native UI support to "see" image formats directly. However, the OpenRouter MCP server exposes a dedicated `vision_analyze` tool. Follow this protocol when working with visual files:

1. **Detection of Visual References:**
   - If the user references a mockup, UI layout, design file, screenshot, or chart (e.g., `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`) in the workspace, do not assume you cannot process it.
   - Do not request the user to manually extract text or explain the image for you.

2. **Triggering Vision Support:**
   - Use the `vision_analyze` tool to parse the image.
   - Set the `image_path` to the absolute path of the workspace image.
   - Provide a highly specific `prompt` for the analysis (e.g., "Extract the layout details, color palette, responsive design anomalies, or exact text overlays from this dashboard mockup").

3. **Context Enrichment:**
   - Incorporate the textual description and design specs returned by `vision_analyze` directly into your working memory to solve frontend layout changes, align styling, or debug rendering issues.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Place this in the system prompt of terminal-only coding bots (like Claude Code or Aider). 
* **Execution:** When you ask the bot to *"fix the alignment issues on the login page, here is a screenshot of the bug: assets/login-error.png"*, the bot will read this instruction, recognize that it has access to a vision tool, run `vision_analyze` on `assets/login-error.png`, and use the returned feedback to write the correct CSS styling.

### Why It Is Useful:
* **Bridges the Visual Gap:** Terminal-only coding assistants are highly capable but historically crippled when dealing with CSS, design mockups, and UI bugs. This instruction teaches the bot that it has "eyes" through the MCP server, enabling it to solve complex styling alignment tasks completely on its own.
* **Streamlines UX:** Avoids tedious back-and-forth where you have to manually describe layout glitches to the AI.
