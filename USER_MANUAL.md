# OpenRouter MCP User's Manual

### Complete Reference for AI-Assisted Development

**Revision 0.9 — Pre-Release Draft**

---

> **How to read this manual:** If you are brand new to AI tools, start at Chapter 0. If you have used AI assistants before but not MCP tools, start at Chapter 1. If you just need to look something up, jump directly to Part 2.

---

## Table of Contents

**Part 1: Foundations**
- Chapter 0: Before You Begin — Key Concepts Explained
- Chapter 1: The Big Picture — What This System Does
- Chapter 2: The Intelligence Portfolio — Understanding Your AI Models
- Chapter 3: Setup and First Run

**Part 2: Tool Reference**
- Chapter 4: Chat Tools
- Chapter 5: Model and Account Tools
- Chapter 6: Memory and Context Tools
- Chapter 7: Code Intelligence Tools
- Chapter 8: Analysis Tools *(Advanced)*
- Chapter 9: Vision Tools
- Chapter 10: Budget Tools

**Part 3: Advanced Reference**
- Chapter 11: Budget Workflow and Cost Management
- Chapter 12: Error Handling and Troubleshooting
- Chapter 13: Sustainability and Responsible Use
- Chapter 14: Quick Reference Cheat Sheets

---

---

# PART 1: FOUNDATIONS

---

## Chapter 0: Before You Begin — Key Concepts Explained

This chapter defines every technical concept you will encounter in this manual. If a word appears in **bold** for the first time anywhere in this document, its definition lives here. You do not need to memorize this chapter — treat it as a dictionary you can return to whenever something is unclear.

---

### 0.1 What Is an AI Assistant?

An AI assistant is a computer program that understands and generates human language. When you type "summarize this document" or "write a function that sorts a list," the AI reads your words, figures out what you mean, and produces a useful response.

The AI assistant you are using (such as Claude, GPT-5, or similar) is the **front end** — the part you talk to. This manual describes a set of **tools** that extend what that assistant can do, connecting it to live data, external services, and your own codebase.

---

### 0.2 What Is "Agentic AI"?

Traditional software does exactly what you program it to do, step by step. **Agentic AI** is different: it can decide *which steps to take* in order to accomplish a goal you describe in plain language.

**Example of non-agentic behavior:**
You click a button labeled "Fetch weather." The program fetches weather.

**Example of agentic behavior:**
You say "Help me plan my week." The AI decides on its own to check the weather, look at your calendar, read your task list, and then synthesize a plan — choosing which tools to use and in what order.

The OpenRouter MCP server makes your AI assistant agentic by giving it a set of tools it can call on your behalf. You describe what you want; the AI figures out which tools to use.

---

### 0.3 What Is MCP?

**MCP** stands for **Model Context Protocol**. It is an open standard that defines how an AI assistant communicates with external tools and services.

Think of MCP as a universal plug adapter. Your AI assistant speaks one language; external services (like OpenRouter's API, your file system, or a code index) speak another. MCP is the adapter in the middle that lets them understand each other.

**Without MCP:** Your AI assistant can only work with text you paste into the conversation.

**With MCP:** Your AI assistant can call tools, read files, search your codebase, check your account balance, and much more — all while you continue talking to it in plain English.

The **OpenRouter MCP server** is a specific MCP implementation that connects your AI assistant to OpenRouter's network of AI models and to a set of code intelligence and memory tools.

---

### 0.4 What Is OpenRouter?

**OpenRouter** is a service that provides access to many different AI models through a single interface. Instead of signing up for OpenAI, Anthropic, Google, and a dozen other services separately, you sign up for OpenRouter once and gain access to all of them.

OpenRouter charges you based on how much you use each model. This manual will explain exactly how that pricing works.

---

### 0.5 What Is a Token?

This is one of the most important concepts in this manual. **Tokens** are the units AI models use to measure text — both the text you send in and the text they send back.

A token is roughly **¾ of a word** in English. Here is a visual breakdown:

```
Sentence: "The quick brown fox jumps over the lazy dog."
          |   |     |     |   |     |    |   |    |   |
Tokens:    The quick brown fox jumps over the lazy dog .
Count:      1    2     3    4    5     6    7    8   9  10
```

More examples:

| Text | Approximate Token Count |
|------|------------------------|
| "Hello" | 1 token |
| "Hello, how are you today?" | 6 tokens |
| A typical paragraph (50 words) | ~65 tokens |
| A full page of text (500 words) | ~650 tokens |
| A short function (20 lines of code) | ~100–200 tokens |
| An entire novel | ~100,000–200,000 tokens |

**Why tokens matter:** AI models charge you per token. When you send a message and receive a reply, you pay for the tokens in your message *plus* the tokens in the reply. This manual will show you how to monitor and control these costs.

**Input tokens vs. output tokens:** The tokens in your message (and any context the AI has) are called **input tokens**. The tokens in the AI's response are called **output tokens**. Output tokens are often priced higher than input tokens.

---

### 0.6 What Is JSON?

**JSON** (pronounced "JAY-son") stands for **JavaScript Object Notation**. It is a standard way of writing structured data that both humans and computers can read.

You will see JSON throughout this manual when we show what the AI sends to tools behind the scenes. You do not need to write JSON yourself — the AI does that for you. But understanding what it looks like will help you understand what is happening.

**JSON uses a simple structure:**

```json
{
  "key": "value",
  "another_key": 42,
  "a_list": ["item1", "item2", "item3"],
  "nested": {
    "inner_key": true
  }
}
```

**The rules:**
- Data is wrapped in curly braces `{ }`
- Each piece of data has a **key** (a name in quotes) and a **value** (the actual data)
- Keys and values are separated by a colon `:`
- Multiple items are separated by commas `,`
- Text values are in quotes `"like this"`
- Numbers are written without quotes `42`
- True/false values are written as `true` or `false`
- Lists are wrapped in square brackets `[ ]`

**A real example** — here is what the AI sends when you ask it to analyze an image:

```json
{
  "image_url": "https://example.com/photo.jpg",
  "prompt": "What objects are visible in this image?",
  "model": "google/gemini-flash-1.5"
}
```

This tells the tool: use this image URL, answer this question about it, and use this specific AI model to do it.

---

### 0.7 What Is an API Key?

An **API key** is a long string of characters that proves to a service that you are who you say you are. It works like a password, but instead of being used by a human logging into a website, it is used by software making automated requests.

**Example of what an API key looks like:**
```
sk-or-v1-PLACEHOLDER
```

Your OpenRouter API key is what allows the MCP server to make requests on your behalf. **Treat it like a password** — never share it, never put it in code you commit to a public repository.

---

### 0.8 What Is an Environment Variable?

An **environment variable** is a piece of information stored in your computer's operating system that programs can read. It is separate from your code and your files.

**The Secret Drawer Analogy:**

Imagine your computer has a secret drawer built into its desk. You put a note in the drawer that says:

```
OPENROUTER_API_KEY = sk-or-v1-PLACEHOLDER
```

When the MCP server starts up, it opens that drawer, reads the note, and uses the key. The key never appears in your code. If someone steals your code, they cannot find your key because it lives in the drawer, not in the code.

This is the correct and safe way to handle API keys.

---

### 0.9 How You Actually Interact With These Tools

This is perhaps the most important thing to understand before reading the rest of this manual:

**You never call these tools directly. You talk to your AI assistant in plain English, and the AI calls the tools for you.**

Here is the flow:

```
You type:  "What's the cheapest model available right now?"
              ↓
AI thinks:  "I should call list_models to find out."
              ↓
AI calls:   list_models tool (no parameters needed)
              ↓
Server returns: A list of all available models with pricing
              ↓
AI reads:   The list and identifies the cheapest option
              ↓
AI tells you: "The cheapest model currently available is..."
```

Every tool description in this manual follows this pattern:

1. **What you say** — the natural language request you type
2. **What the AI does** — which tool it calls and with what parameters
3. **What you get back** — the result in plain English

You are always in the driver's seat. The AI is your translator and executor.

---

### 0.10 Quick Glossary

| Term | Plain English Definition |
|------|--------------------------|
| **Agentic AI** | An AI that can decide which steps to take to accomplish your goal |
| **MCP** | The standard protocol that lets AI assistants talk to external tools |
| **OpenRouter** | A service providing access to many AI models through one account |
| **Token** | The unit AI models use to measure text (~¾ of a word) |
| **JSON** | A standard format for structured data, used internally by tools |
| **API Key** | A password-like string that identifies you to a service |
| **Environment Variable** | A value stored in your OS that programs can read safely |
| **Model** | A specific AI system (e.g., GPT-5.5, Claude Sonnet 4.6, Gemini 3.1) |
| **Prompt** | The text you send to an AI model |
| **Context** | The history and background information an AI has access to |
| **Inference** | The process of an AI generating a response |
| **Embedding** | A mathematical representation of text used for searching |

---

---

## Chapter 1: The Big Picture — What This System Does

### 1.1 The Problem This Solves

Modern software development involves juggling many different AI services, each with its own account, pricing, API, and quirks. A developer might use one service for code generation, another for image analysis, another for documentation, and yet another for answering questions. Each service requires its own integration, its own billing, and its own learning curve.

The OpenRouter MCP server solves this by providing a single, unified interface to:

- **Dozens of AI models** from different providers
- **Code intelligence tools** that understand your actual codebase
- **Memory tools** that remember context across conversations
- **Analysis tools** that can process logs, dependencies, and errors
- **Vision tools** that can understand images
- **Budget tools** that keep your spending under control

All of this is accessible through natural language. You describe what you want; the system figures out how to do it.

---

### 1.2 The Bucket vs. Tap Framework

Understanding how AI model access works will help you make better decisions about which models to use and when.

**The Tap Model (Traditional API Access):**

Most AI services work like a tap. You turn it on, water flows, you pay for what flows. Each request is independent. There is no concept of "running out" — you just keep paying.

**The Bucket Model (Prepaid Credits):**

OpenRouter also supports a bucket model. You put money into your account (fill the bucket). Each request draws from the bucket. When the bucket is empty, requests stop. You can see exactly how full your bucket is at any time.

**Why this matters:**

The bucket model gives you **predictability and control**. You can set a hard limit on spending, watch your balance decrease in real time, and never receive a surprise bill. This manual's budget tools (Chapter 10) are built around this model.

```
Your OpenRouter Account Balance
████████████████████░░░░░░░░░░  68% remaining
$6.80 of $10.00 remaining

Recent usage:
  Yesterday:  $0.42
  Today:      $0.78
  Projected:  $1.20/day
```

---

### 1.3 The 22 Tools at a Glance

The OpenRouter MCP server provides exactly 22 tools, organized into seven domains:

**Chat Tools (2)**
| Tool | What It Does |
|------|-------------|
| `chat_completion` | Send a message to any AI model |
| `chat_with_preset` | Use a pre-configured model profile |

**Model and Account Tools (4)**
| Tool | What It Does |
|------|-------------|
| `list_models` | See all available AI models |
| `recommend_model` | Get a model recommendation for your task |
| `get_balance` | Check your account balance |
| `get_key_info` | See details about your API key |

**Memory and Context Tools (3)**
| Tool | What It Does |
|------|-------------|
| `pin_context` | Save important information for later |
| `retrieve_context` | Find previously saved information |
| `clear_context` | Remove saved context |

**Code Intelligence Tools (4)**
| Tool | What It Does |
|------|-------------|
| `index_project` | Build a searchable index of your codebase |
| `search_symbols` | Find functions, classes, and variables |
| `reindex_project` | Update an existing code index |
| `semantic_code_search` | Search code by meaning, not just keywords |

**Analysis Tools (2)**
| Tool | What It Does |
|------|-------------|
| `correlate_errors` | Find patterns across multiple error logs |
| `dependency_graph` | Map your project's dependencies |

**Vision Tools (1)**
| Tool | What It Does |
|------|-------------|
| `vision_analyze` | Analyze images with AI |

**Budget Tools (4)**
| Tool | What It Does |
|------|-------------|
| `set_budget` | Configure spending limits and warnings |
| `get_budget_status` | Check current budget usage |
| `get_session_usage` | See costs for the current session |
| `optimize_prompt` | Reduce token usage without losing quality |

---

### 1.4 How the Tools Connect

These tools are designed to work together. Here is a typical workflow for a developer starting a new project:

```
Day 1: Setup
  index_project → builds searchable index of your codebase
  set_budget → establishes spending limits
  pin_context → saves key architectural decisions

Day 2: Development
  recommend_model → finds the best model for your task
  chat_with_preset → uses "coder" preset for code generation
  search_symbols → finds relevant functions in your codebase
  semantic_code_search → finds similar patterns

Day 3: Debugging
  correlate_errors → analyzes error logs across services
  dependency_graph → checks for dependency conflicts
  vision_analyze → analyzes screenshots of error states

Ongoing: Management
  get_budget_status → monitors spending
  get_session_usage → reviews current session costs
  optimize_prompt → reduces costs on expensive operations
```

---

### 1.5 Verification: How Do You Know It's Working?

After setup (covered in Chapter 3), you can verify the system is working by asking your AI assistant:

**Test 1 — Basic connectivity:**
> "List the available AI models."

If working, you will see a list of model names with pricing information.

**Test 2 — Account access:**
> "What is my current OpenRouter balance?"

If working, you will see your account balance in dollars.

**Test 3 — Code intelligence:**
> "Index my project at [path to your project]."

If working, you will see a confirmation that the index was built.

**Test 4 — Memory:**
> "Remember that this project uses PostgreSQL 15."

Then in a new conversation:
> "What database does this project use?"

If working, the AI will retrieve the saved context and answer correctly.

If any test fails, see Chapter 12: Error Handling and Troubleshooting.

---

---

## Chapter 2: The Intelligence Portfolio — Understanding Your AI Models

### 2.1 Why Multiple Models Exist

No single AI model is best at everything. Different models have different strengths, costs, context window sizes, and speed characteristics. Using the right model for each task is one of the most important skills in working with this system.

Think of your available models as a team of specialists:

- **The Generalist** — Good at everything, moderately priced
- **The Economist** — Fast and cheap, great for simple tasks
- **The Expert** — Expensive but exceptional for complex reasoning
- **The Coder** — Specialized for programming tasks
- **The Artist** — Specialized for creative and visual work

---

### 2.2 The Model Tier System

Models are organized into four tiers based on capability and cost:

**Tier 1: Frontier Models**
The most capable models available. Use for complex reasoning, nuanced writing, difficult code architecture, and tasks where quality is paramount.

*Examples: Claude Opus 4.7, GPT-5.5, Grok 4.20*
*Cost: Highest*
*Speed: Moderate*
*Best for: Architecture decisions, complex debugging, research synthesis*

**Tier 2: Balanced Models**
Strong capability at a reasonable price. The right choice for most everyday development tasks.

*Examples: Claude Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro*
*Cost: Moderate*
*Speed: Fast*
*Best for: Code generation, documentation, code review*

**Tier 3: Efficient Models**
Optimized for speed and cost. Excellent for high-volume tasks where you need quick answers.

*Examples: GPT-5.4-nano, Qwen 3.6-flash, Gemini 3.1 Flash Lite*
*Cost: Low*
*Speed: Very fast*
*Best for: Simple Q&A, formatting, classification, quick lookups*

**Tier 4: Specialized Models**
Purpose-built for specific domains. Use when you need domain expertise over general capability.

*Examples: DeepSeek V4 Pro, Qwen 3-coder-next, Google Gemini Flash (Vision)*
*Cost: Varies*
*Speed: Varies*
*Best for: Specific domains (code, vision, math)*

---

### 2.3 The Temperature Setting

**Temperature** controls how creative or predictable the AI's responses are. It is a number between 0 and 2.

```
TEMPERATURE VISUAL GUIDE

0.0  ──────────────────────────────────────────────────  2.0
│                                                          │
│  COLD                    WARM                       HOT  │
│  Precise                 Balanced               Creative │
│  Deterministic           Natural                  Wild   │
│  Repetitive              Varied                  Chaotic │
│                                                          │
│  Best for:               Best for:          Best for:   │
│  • Code generation       • Conversation     • Brainstorm │
│  • Data extraction       • Explanation      • Poetry     │
│  • Fact lookup           • Documentation    • Fiction    │
│  • Classification        • General tasks    • Ideation   │
│                                                          │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  0.0  0.2  0.4  0.6  0.8  1.0  1.2  1.4  1.6  1.8  2.0 │
│                          ↑                               │
│                     Default: 0.7                         │
```

**Practical guidance:**

| Task | Recommended Temperature |
|------|------------------------|
| Generating code that must compile | 0.0 – 0.2 |
| Extracting data from text | 0.0 – 0.3 |
| Writing technical documentation | 0.3 – 0.5 |
| General conversation and Q&A | 0.6 – 0.8 |
| Writing explanations and tutorials | 0.7 – 0.9 |
| Brainstorming ideas | 1.0 – 1.3 |
| Creative writing | 1.2 – 1.6 |

---

### 2.4 The 60-Second Decision Framework

When you need to choose a model quickly, ask yourself these questions in order:

```
START HERE
    │
    ▼
Does this task involve images?
    │
    ├─ YES → Use vision_analyze with google/gemini-flash-1.5
    │
    └─ NO
        │
        ▼
    Is this primarily code?
        │
        ├─ YES → Use chat_with_preset "coder"
        │         (uses deepseek/deepseek-v4-pro or similar)
        │
        └─ NO
            │
            ▼
        Does quality matter more than cost?
            │
            ├─ YES → Use chat_with_preset "smart"
            │         (uses a Tier 1 frontier model)
            │
            └─ NO
                │
                ▼
            Do you need creativity?
                │
                ├─ YES → Use chat_with_preset "creative"
                │         (uses high temperature + capable model)
                │
                └─ NO
                    │
                    ▼
                Is speed the priority?
                    │
                    ├─ YES → Use chat_with_preset "fast"
                    │         (uses a Tier 3 efficient model)
                    │
                    └─ NO → Use chat_with_preset "cheap"
                              (uses the most cost-effective option)
```

---

### 2.5 Understanding Model Pricing

OpenRouter pricing is expressed as a **string value per token** as returned by the server. The server returns raw pricing strings for each model.

**Important:** Pricing is per individual token, not per million tokens. When you see a price like `"0.000001"`, that means $0.000001 per token, or $1.00 per million tokens.

**The Cost Receipt:**

Every time you use a model, you can think of the cost as a receipt:

```
╔══════════════════════════════════════════════╗
║           OPENROUTER COST RECEIPT            ║
╠══════════════════════════════════════════════╣
║  Model:    anthropic/claude-sonnet-4.6               ║
║                                              ║
║  Input tokens:    1,247  × $0.000003  = $0.00374  ║
║  Output tokens:     389  × $0.000015  = $0.00584  ║
║                                    ─────────────  ║
║  Total this request:               = $0.00958  ║
╚══════════════════════════════════════════════╝
```

The actual pricing strings for each model are returned by the `list_models` tool and may change as providers update their rates.

---

---

## Chapter 3: Setup and First Run

### 3.1 Prerequisites

Before you begin, you need:

1. **An OpenRouter account** — Sign up at openrouter.ai
2. **An OpenRouter API key** — Generated in your account dashboard
3. **An MCP-compatible AI assistant** — Such as Google Antigravity, Claude Code, or another MCP-enabled client
4. **The OpenRouter MCP server** — Installed on your system
5. **Node.js** (version 18 or higher) — Required to run the server

---

### 3.2 Installing the Server

**Step 1: Install via npm**

Open your terminal and run:

```bash
npm install -g universal-mcp-for-openrouter
```

**Step 2: Verify installation**

```bash
universal-mcp-for-openrouter --version
```

You should see a version number. If you see an error, ensure Node.js is installed and your npm global directory is in your PATH.

---

### 3.3 Setting Your API Key (The Secret Drawer)

Your API key must be stored as an environment variable, not in any configuration file that might be shared or committed to version control.

**On macOS and Linux:**

Add this line to your shell configuration file (`~/.bashrc`, `~/.zshrc`, or `~/.bash_profile`):

```bash
export OPENROUTER_API_KEY="sk-or-v1-your-actual-key-here"
```

Then reload your shell:

```bash
source ~/.zshrc
```

**On Windows (Command Prompt):**

```cmd
setx OPENROUTER_API_KEY "sk-or-v1-your-actual-key-here"
```

**On Windows (PowerShell):**

```powershell
[System.Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "sk-or-v1-your-actual-key-here", "User")
```

**Verify the key is set:**

```bash
echo $OPENROUTER_API_KEY
```

You should see your key printed. If you see nothing, the variable was not set correctly.

---

### 3.4 Configuring Your MCP Client

The exact configuration depends on which MCP client you are using. The general pattern is to add the OpenRouter MCP server to your client's server list.

**For Google Antigravity** (edit your MCP configuration):

```json
{
  "mcpServers": {
    "openrouter": {
      "command": "universal-mcp-for-openrouter",
      "args": ["--profile", "antigravity"],
      "env": {
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
      }
    }
  }
}
```

**For Claude Code** (edit your MCP configuration file):

```json
{
  "mcpServers": {
    "openrouter": {
      "command": "universal-mcp-for-openrouter",
      "args": ["--profile", "claude-code"],
      "env": {
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
      }
    }
  }
}
```

**For Codex** (edit your MCP configuration):

```json
{
  "servers": {
    "openrouter": {
      "command": "universal-mcp-for-openrouter",
      "args": ["--profile", "codex"]
    }
  }
}
```

**For Opencode:**
```json
{
  "mcpServers": {
    "openrouter": {
      "command": "universal-mcp-for-openrouter",
      "args": ["--profile", "opencode"]
    }
  }
}
```

**For any other platform** (or if unsure):
```json
{
  "mcpServers": {
    "openrouter": {
      "command": "universal-mcp-for-openrouter",
      "args": ["--profile", "generic"]
    }
  }
}
```

After saving the configuration, restart your MCP client.

---

### 3.5 Platform Profiles — What They Are and Testing Status

The `--profile` flag in the configuration above tells the server which tools to enable or disable based on your platform's native capabilities. For example, if your platform already has built-in code search, the profile disables the MCP's code search tools to avoid redundancy.

> **⚠️ Testing Disclaimer**
>
> Only the **Antigravity** profile has been tested and verified by the project maintainer. All other profiles are community-contributed configurations based on publicly documented platform capabilities. They may need adjustment for your specific setup.

| Profile | Platform | Testing Status |
|---|---|---|
| `antigravity` | Google Antigravity | ✅ **Tested and verified** — all 9 test suites passing |
| `claude-code` | Claude Code | ⚠️ Community-contributed — **not yet tested** |
| `codex` | Codex | ⚠️ Community-contributed — **not yet tested** |
| `opencode` | Opencode | ⚠️ Community-contributed — **not yet tested** |
| `generic` | Any / Unknown | ⚠️ Community-contributed — **not yet tested** (all tools enabled) |

If you experience issues with an untested profile, you can:
1. Switch to `generic` (all tools enabled) as a safe fallback
2. Create a custom profile — see `PROFILES.md` in the project repository for a step-by-step guide
3. Report the issue or contribute a fix via pull request

---

### 3.6 Quick Start Path

If you want to get up and running in under five minutes, follow these steps in order:

**Minute 1: Verify connection**
Ask your AI assistant:
> "List the available AI models."

Expected result: A list of model names appears.

**Minute 2: Check your balance**
> "What is my current OpenRouter balance?"

Expected result: Your balance in dollars appears.

**Minute 3: Set a safety budget**
> "Set a budget limit of $5 and warn me when I've used 80%."

Expected result: Confirmation that the budget is set.

**Minute 4: Try a chat**
> "Using the cheap preset, explain what a binary search tree is in two sentences."

Expected result: A brief explanation appears.

**Minute 5: Index your project (optional)**
> "Index my project at /path/to/my/project with the name my-project."

Expected result: Confirmation that indexing is complete.

You are now ready to use all 22 tools.

---

### 3.7 Understanding What Happens at Startup

When your MCP client starts the OpenRouter MCP server, the following happens:

1. The server reads your `OPENROUTER_API_KEY` from the environment
2. The server registers all 22 tools with your MCP client
3. Your AI assistant becomes aware of these tools and can call them
4. No API calls are made yet — the server is just ready and waiting

The server does not make any network requests until you ask your AI assistant to do something that requires one.

---

---

# PART 2: TOOL REFERENCE

---

> **How to read Part 2:** Each tool is documented with the same structure:
> 1. **What it does** — plain English description
> 2. **When to use it** — practical scenarios
> 3. **Parameters** — what the tool accepts
> 4. **How to ask for it** — natural language examples
> 5. **What the AI sends** — the JSON the AI constructs (shown after the human intent)
> 6. **What you get back** — example output
> 7. **Tips and notes** — practical advice

---

## Chapter 4: Chat Tools

The chat tools are the core of the system. They let you send messages to AI models and receive responses. Everything else in the system supports these tools.

---

### Tool 1: `chat_completion`

**What it does:**
Sends a message to an AI model and returns the response. This is the fundamental building block of AI interaction — everything from answering a question to generating code to writing documentation flows through this tool.

**When to use it:**
- When you need to talk to a specific model by name
- When you need fine-grained control over temperature or token limits
- When you want to use a fallback list of models
- When you need a custom system prompt for a specific task

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `prompt` | **Yes** | string | — | The message you want to send to the model |
| `model` | No | string | `"openrouter/auto"` | The specific model to use |
| `models` | No | array of strings | — | Fallback list of models to try in order |
| `system_prompt` | No | string | — | Instructions that shape the model's behavior |
| `temperature` | No | number | `0.7` | Creativity level (0.0–2.0, see Chapter 2.3) |
| `max_tokens` | No | number | — | Maximum length of the response |

**Important note about `prompt` vs. `messages`:**
This tool uses a single `prompt` string, not a messages array. The AI assistant handles conversation history management; you provide the current message.

**How to ask for it — examples:**

*Basic question:*
> "Ask the AI what the difference is between a mutex and a semaphore."

Based on this, the server receives:
```json
{
  "prompt": "What is the difference between a mutex and a semaphore?"
}
```

*With a specific model:*
> "Using Claude Sonnet 4.6, explain the CAP theorem to me."

Based on this, the server receives:
```json
{
  "prompt": "Explain the CAP theorem.",
  "model": "anthropic/claude-sonnet-4.6"
}
```

*With temperature control for code generation:*
> "Generate a Python function to validate email addresses. Use low temperature for precision."

Based on this, the server receives:
```json
{
  "prompt": "Write a Python function that validates email addresses using regex. Return True if valid, False if not.",
  "model": "openrouter/auto",
  "temperature": 0.1
}
```

*With a system prompt for a specific role:*
> "Act as a senior security engineer and review this code for vulnerabilities: [code]"

Based on this, the server receives:
```json
{
  "prompt": "Review this code for security vulnerabilities:\n\ndef login(username, password):\n    query = f\"SELECT * FROM users WHERE username='{username}' AND password='{password}'\"\n    return db.execute(query)",
  "system_prompt": "You are a senior security engineer specializing in application security. Identify vulnerabilities, explain their severity, and provide remediation code.",
  "temperature": 0.3
}
```

*With model fallbacks:*
> "Try GPT-5.4 first, then fall back to Claude if it's unavailable. Ask: what are the SOLID principles?"

Based on this, the server receives:
```json
{
  "prompt": "What are the SOLID principles in software engineering?",
  "models": ["openai/gpt-5.4", "anthropic/claude-sonnet-4.6", "openrouter/auto"]
}
```

*With token limit:*
> "Summarize the history of the internet in exactly 100 words or fewer."

Based on this, the server receives:
```json
{
  "prompt": "Summarize the history of the internet in 100 words or fewer.",
  "max_tokens": 150,
  "temperature": 0.5
}
```

**What you get back:**
The model's response as text, along with metadata about which model was used and how many tokens were consumed.

**Tips:**
- When `model` is `"openrouter/auto"`, OpenRouter selects the best available model for your request automatically.
- The `models` array is tried in order — if the first model is unavailable or rate-limited, the next is tried.
- Setting `max_tokens` too low can cause responses to be cut off mid-sentence. Add a 20% buffer to your estimate.
- For code generation, use `temperature: 0.0` to `0.2` for the most reliable, compilable output.

---

### Tool 2: `chat_with_preset`

**What it does:**
Sends a message using a pre-configured model profile. Instead of specifying model names, temperatures, and other settings manually, you choose a preset that has been optimized for a particular use case.

**When to use it:**
- When you want a sensible default without thinking about model selection
- When you have a clear task type (coding, creative writing, quick answer)
- When you want consistent behavior across a project
- When you are new to the system and not yet familiar with individual models

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `preset` | **Yes** | enum | — | One of: `smart`, `cheap`, `creative`, `fast`, `coder` |
| `prompt` | **Yes** | string | — | The message to send |
| `system_prompt` | No | string | — | Additional instructions to shape the response |

**The Five Presets:**

```
┌─────────────┬──────────────────────────────────────────────────────────┐
│ PRESET      │ DESCRIPTION                                              │
├─────────────┼──────────────────────────────────────────────────────────┤
│ smart       │ Uses a frontier Tier 1 model. Best quality, higher cost. │
│             │ Use for: complex reasoning, architecture, research       │
├─────────────┼──────────────────────────────────────────────────────────┤
│ cheap       │ Uses the most cost-effective model available.            │
│             │ Use for: simple Q&A, formatting, quick lookups           │
├─────────────┼──────────────────────────────────────────────────────────┤
│ creative    │ Uses a capable model with higher temperature.            │
│             │ Use for: brainstorming, writing, ideation                │
├─────────────┼──────────────────────────────────────────────────────────┤
│ fast        │ Uses a Tier 3 efficient model optimized for speed.       │
│             │ Use for: high-volume tasks, quick answers, prototyping   │
├─────────────┼──────────────────────────────────────────────────────────┤
│ coder       │ Uses a code-specialized model with low temperature.      │
│             │ Use for: code generation, debugging, code review         │
└─────────────┴──────────────────────────────────────────────────────────┘
```

**How to ask for it — examples:**

*Using the smart preset for a complex question:*
> "Using the smart preset, analyze the trade-offs between microservices and monolithic architecture for a startup with 3 engineers."

Based on this, the server receives:
```json
{
  "preset": "smart",
  "prompt": "Analyze the trade-offs between microservices and monolithic architecture for a startup with 3 engineers."
}
```

*Using the coder preset for code generation:*
> "Using the coder preset, write a TypeScript function that debounces another function."

Based on this, the server receives:
```json
{
  "preset": "coder",
  "prompt": "Write a TypeScript function that debounces another function. Include the type signature and a usage example."
}
```

*Using the cheap preset for a simple task:*
> "Using the cheap preset, convert this list of names to title case: john smith, mary jones, bob wilson."

Based on this, the server receives:
```json
{
  "preset": "cheap",
  "prompt": "Convert these names to title case: john smith, mary jones, bob wilson."
}
```

*Using the creative preset with a system prompt:*
> "Using the creative preset, brainstorm 10 names for a developer productivity app. Make them memorable and tech-forward."

Based on this, the server receives:
```json
{
  "preset": "creative",
  "prompt": "Brainstorm 10 names for a developer productivity app. Make them memorable and tech-forward.",
  "system_prompt": "You are a brand naming expert specializing in tech products. Generate names that are short, memorable, and convey speed or clarity."
}
```

*Using the fast preset for quick classification:*
> "Using the fast preset, classify each of these bug reports as critical, major, or minor: [list of bugs]"

Based on this, the server receives:
```json
{
  "preset": "fast",
  "prompt": "Classify each bug report as critical, major, or minor:\n1. App crashes on login\n2. Button color is slightly off\n3. Data loss when saving large files\n4. Tooltip text has a typo"
}
```

**What you get back:**
The model's response, formatted according to the preset's configuration.

**Tips:**
- The `coder` preset automatically uses a low temperature, so you do not need to specify it.
- The `creative` preset uses a higher temperature — if you need more controlled creative output, use `chat_completion` directly with a custom temperature.
- Presets are the fastest way to get good results. Use `chat_completion` directly only when you need control that presets do not provide.

---

---

## Chapter 5: Model and Account Tools

These tools give you visibility into what models are available, what they cost, and the state of your account.

---

### Tool 3: `list_models`

**What it does:**
Returns a complete list of all AI models currently available through OpenRouter, including their names, identifiers, pricing, and capabilities.

**When to use it:**
- When you want to see what models are available
- When you need to find the exact identifier for a specific model
- When you want to compare pricing across models
- When you are looking for a model with specific capabilities

**Parameters:**
This tool has no parameters. It takes no input.

**How to ask for it:**

> "Show me all available AI models."

Based on this, the server receives:
```json
{}
```

That is the complete request — an empty object, because no parameters are needed.

Other ways to trigger this tool:
> "What models can I use?"
> "List all the AI models available to me."
> "What are my model options?"

**What you get back:**
A list of models, each with:
- Model name (human-readable)
- Model ID (the identifier used in other tools)
- Pricing strings (per-token costs for input and output)
- Context window size (maximum tokens the model can handle)
- Capabilities (e.g., vision support, function calling)

**Example output structure:**
```
Available Models (showing 5 of many):

anthropic/claude-opus-4.7
  Input:  "0.000005" per token
  Output: "0.000015" per token
  Context: 1,000,000 tokens

anthropic/claude-sonnet-4.6
  Input:  "0.000003" per token
  Output: "0.000015" per token
  Context: 1,000,000 tokens

openai/gpt-5.5
  Input:  "0.000005" per token
  Output: "0.000015" per token
  Context: 1,050,000 tokens

google/gemini-flash-1.5
  Input:  "0.00000025" per token
  Output: "0.0000015" per token
  Context: 1,048,576 tokens

deepseek/deepseek-v4-pro
  Input:  "0.000000435" per token
  Output: "0.00000087" per token
  Context: 1,048,576 tokens
```

**Tips:**
- Model availability and pricing change frequently. Run `list_models` before making cost-sensitive decisions.
- The pricing strings are returned exactly as the server provides them. The format is a decimal number representing cost per token.
- Use the model ID (e.g., `anthropic/claude-sonnet-4.6`) in other tools, not the human-readable name.

---

### Tool 3b: `filter_models`

**What it does:**
Filters the complete OpenRouter model catalog based on your specific requirements (such as keyword queries, minimum context window, maximum prompt price, and image/vision capability). Serves results instantly from local cache.

**When to use it:**
- When you want to find specific model variants (e.g., all `claude` or `gemini` models)
- When you need a model with a minimum context window (e.g., at least 32,000 tokens)
- When you want to restrict model options based on prompt price cap (e.g., less than $1.50 per 1 million prompt tokens)
- When you want to see only models that support vision inputs

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `query` | No | string | — | Fuzzy keyword to match in model ID or name (e.g., `gemini`, `llama`) |
| `min_context_length` | No | number | — | Minimum context window size in tokens (e.g., `32000`) |
| `max_price_per_1m_prompt` | No | number | — | Maximum prompt cost in USD per 1,000,000 tokens (e.g., `2.00`) |
| `supports_vision` | No | boolean | — | Filter for models that support or do not support vision inputs |
| `limit` | No | number | `10` | Maximum number of models to return (max 50) |

**How to ask for it:**

> "Find all Gemini models that support vision and have at least a 32k context limit."

Based on this, the server receives:
```json
{
  "query": "gemini",
  "min_context_length": 32000,
  "supports_vision": true
}
```

Other ways to trigger this tool:
> "Filter models matching claude under $1 per million prompt tokens."
> "Show me cheap models with at least a 100k context window."

**What you get back:**
A JSON-formatted list containing only the models that match all specified filtering criteria, matching the structure returned by `list_models` but filtered dynamically.

---

### Tool 4: `recommend_model`

**What it does:**
Analyzes your task description and recommends the most appropriate AI model for it, considering capability, cost, and speed.

**When to use it:**
- When you are unsure which model to use for a specific task
- When you want an expert recommendation rather than guessing
- When you are optimizing for cost, speed, or quality on a specific task type

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `task` | **Yes** | string | — | A description of what you want to accomplish |

**How to ask for it — examples:**

*For a coding task:*
> "What model should I use to generate a REST API in Python?"

Based on this, the server receives:
```json
{
  "task": "Generate a REST API in Python using FastAPI, including authentication, CRUD endpoints, and OpenAPI documentation."
}
```

*For a cost-sensitive task:*
> "I need to process 10,000 customer support emails and classify them by topic. What's the best model for this?"

Based on this, the server receives:
```json
{
  "task": "Process 10,000 customer support emails and classify each one into one of 8 topic categories. High volume, cost-sensitive, accuracy important but not perfect."
}
```

*For a complex reasoning task:*
> "What model is best for analyzing legal contracts and identifying unusual clauses?"

Based on this, the server receives:
```json
{
  "task": "Analyze legal contracts to identify unusual or potentially problematic clauses, compare against standard templates, and provide risk assessments."
}
```

**What you get back:**
A recommendation including:
- The recommended model name and ID
- Why this model was chosen
- Estimated cost range for typical requests
- Alternative models if your priorities differ

**Tips:**
- Be specific in your task description. "Write code" is less useful than "Write a Python async web scraper that handles rate limiting and retries."
- Mention constraints: "I need this to be fast," "cost is the priority," "I need the highest quality possible."
- The recommendation is advisory — you can always override it.

---

### Tool 5: `get_balance`

**What it does:**
Returns your current OpenRouter account balance in dollars.

**When to use it:**
- Before starting a large or expensive task
- When you want to verify your account is funded
- As part of a regular check-in on your spending

**Parameters:**
This tool has no parameters.

**How to ask for it:**

> "What is my current OpenRouter balance?"

Based on this, the server receives:
```json
{}
```

Other ways to trigger this tool:
> "How much money do I have left in my OpenRouter account?"
> "Check my balance."
> "Am I running low on credits?"

**What you get back:**
Your current balance in dollars, such as:
```
Current OpenRouter balance: $7.43
```

**Tips:**
- If your balance is zero or very low, requests will fail. Top up your account at openrouter.ai before continuing.
- Use `get_budget_status` (Chapter 10) for more detailed spending information including session usage and budget limits.

---

### Tool 6: `get_key_info`

**What it does:**
Returns information about your current API key, including its permissions, rate limits, and associated account details.

**When to use it:**
- When troubleshooting authentication issues
- When you want to verify which account your key belongs to
- When checking rate limits before a high-volume task

**Parameters:**
This tool has no parameters.

**How to ask for it:**

> "Show me information about my API key."

Based on this, the server receives:
```json
{}
```

Other ways to trigger this tool:
> "What account is this API key associated with?"
> "Check my API key details."
> "What are my rate limits?"

**What you get back:**
Key details including:
- Key label or name (if set)
- Associated account email
- Rate limits (requests per minute, tokens per minute)
- Enabled model access
- Key creation date

**Tips:**
- If you have multiple API keys (e.g., one for development, one for production), this tool helps you verify which one is active.
- Rate limit information is useful when planning high-volume operations.

---

---

## Chapter 6: Memory and Context Tools

These tools give your AI assistant a persistent memory that survives across conversations. Without these tools, every new conversation starts fresh — the AI has no memory of previous sessions. With these tools, you can save important information and retrieve it later.

---

### The "Fresh Start" Technique

Before explaining the memory tools, it is important to understand a fundamental limitation of AI assistants: **every new conversation starts with a blank slate**.

This is actually a feature, not a bug. It means:
- Previous mistakes do not carry forward
- You can start fresh without baggage from old conversations
- Multiple people can use the same assistant without their contexts mixing

But it also means that if you want the AI to remember something across conversations, you must explicitly save it. That is what the context tools are for.

**The Fresh Start Technique** is the practice of deliberately clearing context at the start of a new project phase, then re-pinning only the information that is still relevant. This keeps your context clean and prevents old, outdated information from confusing the AI.

---

### Tool 7: `pin_context`

**What it does:**
Saves a piece of text to persistent memory so it can be retrieved in future conversations. Think of it as leaving yourself a note that the AI can read later.

**When to use it:**
- Saving architectural decisions ("We chose PostgreSQL because...")
- Recording important constraints ("This service must not exceed 100ms response time")
- Storing frequently referenced information ("The staging server is at staging.example.com")
- Documenting team conventions ("We use snake_case for Python, camelCase for JavaScript")
- Saving the results of expensive research or analysis

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `text` | **Yes** | string | — | The content to save |
| `tag` | No | string | — | A label for categorizing this context |
| `project` | No | string | — | The project this context belongs to |

**How to ask for it — examples:**

*Saving a simple fact:*
> "Remember that our database is PostgreSQL 15 running on port 5433."

Based on this, the server receives:
```json
{
  "text": "Database: PostgreSQL 15, running on port 5433 (non-standard port). Connection string format: postgresql://user:pass@host:5433/dbname"
}
```

*Saving with a tag for organization:*
> "Save this architectural decision with the tag 'architecture': We chose a monolithic architecture initially to move fast, with the plan to extract services after reaching 10,000 users."

Based on this, the server receives:
```json
{
  "text": "Architectural decision (2024): Chose monolithic architecture for initial launch to maximize development speed. Plan to extract microservices after reaching 10,000 active users. Key services to extract first: authentication, notifications, billing.",
  "tag": "architecture"
}
```

*Saving project-specific context:*
> "For the payments project, remember that we use Stripe in test mode and the webhook endpoint is /api/webhooks/stripe."

Based on this, the server receives:
```json
{
  "text": "Stripe integration: Currently in test mode. Webhook endpoint: /api/webhooks/stripe. Test webhook secret stored in STRIPE_WEBHOOK_SECRET env var. Live mode requires separate approval from finance team.",
  "tag": "integrations",
  "project": "payments"
}
```

**What you get back:**
Confirmation that the context was saved, along with an ID you can use to reference it later.

**Tips:**
- Be generous with context. Storage is cheap; the cost of re-explaining something to the AI is not.
- Use tags consistently. If you use "architecture" for architectural decisions, always use "architecture" — not "arch" or "design."
- Include the date in important context entries so you know when they were recorded.
- The `project` parameter is especially useful when working on multiple projects simultaneously.

---

### Tool 8: `retrieve_context`

**What it does:**
Searches your saved context and returns the most relevant entries for your current query. It uses semantic search, meaning it finds context that is *related in meaning* to your query, not just context that contains the exact same words.

**When to use it:**
- At the start of a new conversation to reload relevant context
- When you need to recall a decision or fact you saved earlier
- When you want to check if you have already documented something
- When the AI needs background information to answer a question

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `query` | **Yes** | string | — | What you are looking for |
| `top_k` | No | number | — | Maximum number of results to return |
| `tag` | No | string | — | Filter results to a specific tag |
| `project` | No | string | — | Filter results to a specific project |

**How to ask for it — examples:**

*Basic retrieval:*
> "What do I know about the database setup for this project?"

Based on this, the server receives:
```json
{
  "query": "database setup configuration connection"
}
```

*Filtered by tag:*
> "Retrieve all architectural decisions I've saved."

Based on this, the server receives:
```json
{
  "query": "architectural decisions design choices",
  "tag": "architecture"
}
```

*Filtered by project with result limit:*
> "Show me the top 3 most relevant pieces of context about Stripe for the payments project."

Based on this, the server receives:
```json
{
  "query": "Stripe payment processing integration",
  "top_k": 3,
  "project": "payments"
}
```

**What you get back:**
A ranked list of relevant context entries, each showing:
- The saved text
- The tag and project (if set)
- A relevance score
- When it was saved

**Tips:**
- You do not need to remember exactly what you saved. Describe what you are looking for in natural language.
- If you get too many irrelevant results, add a `tag` or `project` filter.
- At the start of each work session, ask the AI to retrieve context for your current task. This gives it the background it needs.

---

### Tool 9: `clear_context`

**What it does:**
Removes saved context entries. You can clear specific tags, a specific project, or everything at once.

**When to use it:**
- When starting a new project phase and old context is no longer relevant
- When you have saved incorrect information and need to remove it
- When a project is complete and you want to clean up
- As part of the "Fresh Start" technique

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `tag` | No | string | — | Clear only entries with this tag |
| `project` | No | string | — | Clear only entries for this project |
| `confirm_wipe_all` | No | boolean | — | Set to `true` to clear ALL context (requires explicit confirmation) |

**⚠️ Warning:** Clearing context is permanent. There is no undo. Use `confirm_wipe_all: true` only when you are certain you want to delete everything.

**How to ask for it — examples:**

*Clear a specific tag:*
> "Clear all context tagged as 'architecture'."

Based on this, the server receives:
```json
{
  "tag": "architecture"
}
```

*Clear a specific project:*
> "Remove all saved context for the payments project."

Based on this, the server receives:
```json
{
  "project": "payments"
}
```

*Clear everything (with explicit confirmation):*
> "Wipe all saved context. I'm starting fresh."

Based on this, the server receives:
```json
{
  "confirm_wipe_all": true
}
```

**What you get back:**
Confirmation of how many entries were deleted.

**Tips:**
- Before clearing, consider using `retrieve_context` to review what you are about to delete.
- The `tag` and `project` parameters can be combined to clear a specific subset (e.g., all "architecture" entries for the "payments" project).
- If you omit all parameters and do not set `confirm_wipe_all`, the tool will ask for clarification rather than deleting anything.

---

---

## Chapter 7: Code Intelligence Tools

These tools give your AI assistant the ability to understand your actual codebase — not just code you paste into the conversation, but the entire project, including files you have not mentioned.

---

### Tool 10: `index_project`

**What it does:**
Scans a directory on your file system, reads all the code files, and builds a searchable index. This index is what makes `search_symbols` and `semantic_code_search` possible.

**When to use it:**
- When starting work on a new project
- When you want the AI to understand your codebase
- After cloning a repository you have not worked with before
- When setting up a new development environment

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `project_path` | **Yes** | string | — | The file system path to the project directory |
| `project_name` | **Yes** | string | — | A name to identify this project in future searches |

**How to ask for it — examples:**

*Basic indexing:*
> "Index my project at /Users/alice/projects/my-app and call it my-app."

Based on this, the server receives:
```json
{
  "project_path": "/Users/alice/projects/my-app",
  "project_name": "my-app"
}
```

*Indexing a cloned repository:*
> "I just cloned a repo to /home/dev/repos/payment-service. Index it and name it payment-service."

Based on this, the server receives:
```json
{
  "project_path": "/home/dev/repos/payment-service",
  "project_name": "payment-service"
}
```

**What you get back:**
A summary of the indexing operation:
```
Indexed project: my-app
  Path: /Users/alice/projects/my-app
  Files processed: 247
  Symbols found: 1,842
  Chunks created: 892
  Time: 23.4 seconds
  Status: Complete
```

**Tips:**
- Indexing large projects can take a minute or two. This is normal.
- **Tilde Path Expansion:** You can use the standard tilde prefix (`~` or `~/`) in `project_path` to refer to your home directory (e.g., `~/dev/my-project`). The server will automatically expand it to the correct absolute system path (e.g., `/home/username/dev/my-project` or `/Users/username/dev/my-project`) on both Linux and macOS.
- **100% Path Portability:** The indexer stores all file references as relative paths from the project root. When you or another developer run symbol searches later, the server dynamically reconstructs absolute paths relative to the project directory or current workspace. This makes your symbol database (`symbol_index.json`) fully portable across machines.
- The `project_name` you choose will be used in `search_symbols`, `semantic_code_search`, and `reindex_project`. Choose something memorable and consistent.
- The index is stored locally. It does not send your code to any external service beyond what is needed for embedding generation.
- If your project changes significantly, use `reindex_project` to update the index.

---

### Tool 11: `search_symbols`

**What it does:**
Searches the code index for specific symbols — functions, classes, methods, variables, interfaces, and other named code elements. This is a fast, exact-match style search.

**When to use it:**
- When you know the name of a function or class and want to find where it is defined
- When you want to see all usages of a particular symbol
- When you are exploring an unfamiliar codebase
- When you need to find where a specific piece of functionality lives

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `query` | **Yes** | string | — | The symbol name or partial name to search for |

**How to ask for it — examples:**

*Finding a specific function:*
> "Find the authenticateUser function in my codebase."

Based on this, the server receives:
```json
{
  "query": "authenticateUser"
}
```

*Finding all classes with a pattern:*
> "Search for all classes that have 'Controller' in their name."

Based on this, the server receives:
```json
{
  "query": "Controller"
}
```

*Finding a specific method:*
> "Where is the processPayment method defined?"

Based on this, the server receives:
```json
{
  "query": "processPayment"
}
```

**What you get back:**
A list of matching symbols with:
- Symbol name and type (function, class, method, etc.)
- File path and line number
- A brief code snippet showing the definition

**Tips:**
- This tool searches across all indexed projects. If you have multiple projects indexed, results from all of them will appear.
- For meaning-based search (e.g., "find code that handles authentication"), use `semantic_code_search` instead.
- Partial names work: searching for "auth" will find `authenticate`, `authorization`, `authMiddleware`, etc.

---

### Tool 12: `reindex_project`

**What it does:**
Updates an existing project index to reflect changes in the codebase. Use this after making significant changes to your project.

**When to use it:**
- After adding new files or modules to a project
- After a major refactor
- After merging a large pull request
- When search results seem outdated

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `project_name` | **Yes** | string | — | The name of the project to reindex (must match the name used in `index_project`) |
| `max_chunks` | No | number | `1000` | Maximum number of code chunks to index |

**How to ask for it — examples:**

*Basic reindex:*
> "Reindex the my-app project."

Based on this, the server receives:
```json
{
  "project_name": "my-app"
}
```

*Reindex with a higher chunk limit for a large project:*
> "Reindex the payment-service project. It's grown a lot, so increase the chunk limit to 3000."

Based on this, the server receives:
```json
{
  "project_name": "payment-service",
  "max_chunks": 3000
}
```

**What you get back:**
A summary similar to `index_project`, showing what changed:
```
Reindexed project: my-app
  New files: 12
  Modified files: 34
  Deleted files: 3
  Total symbols: 1,956 (was 1,842)
  Time: 18.7 seconds
  Status: Complete
```

**Tips:**
- The `project_name` must exactly match the name you used when calling `index_project`.
- `max_chunks` controls how much of the project is indexed. For very large projects, you may need to increase this. The default of 1000 is sufficient for most projects.
- Reindexing is faster than initial indexing because it only processes changed files.

---

### Tool 13: `semantic_code_search`

**What it does:**
Searches your indexed code by meaning rather than by exact keyword match. You describe what you are looking for in plain English, and the tool finds code that does that thing — even if it uses completely different variable names or terminology.

**When to use it:**
- When you do not know the exact name of what you are looking for
- When you want to find all code that handles a particular concern (e.g., "error handling," "database connections")
- When exploring an unfamiliar codebase
- When looking for examples of a pattern to follow

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `query` | **Yes** | string | — | A natural language description of what you are looking for |
| `repos` | No | array of strings | — | Limit search to specific project names |
| `top_k` | No | number | `5` | Number of results to return |
| `file_pattern` | No | string | — | Filter results to files matching this pattern (e.g., `*.py`, `src/**/*.ts`) |

**How to ask for it — examples:**

*Basic semantic search:*
> "Find code that handles user authentication in my codebase."

Based on this, the server receives:
```json
{
  "query": "user authentication login verification password checking"
}
```

*Search in specific projects:*
> "Search for database connection pooling code in the my-app and payment-service projects."

Based on this, the server receives:
```json
{
  "query": "database connection pool management",
  "repos": ["my-app", "payment-service"]
}
```

*Search with file pattern filter:*
> "Find all error handling code in Python files only."

Based on this, the server receives:
```json
{
  "query": "error handling exception catching retry logic",
  "file_pattern": "*.py",
  "top_k": 10
}
```

*Search for a specific pattern:*
> "Find examples of how we implement caching in this project."

Based on this, the server receives:
```json
{
  "query": "caching cache storage memoization redis memcached",
  "repos": ["my-app"],
  "top_k": 5
}
```

**What you get back:**
A ranked list of code snippets, each showing:
- The file path and line numbers
- The relevant code
- A relevance score
- The project it belongs to

**Tips:**
- Semantic search is powerful but slower than `search_symbols`. Use `search_symbols` when you know the exact name; use `semantic_code_search` when you are exploring.
- Include synonyms in your query for better results: "authentication login auth" will find more than just "authentication."
- The `file_pattern` parameter is useful when you know the code lives in a specific part of the project.
- Increase `top_k` when you want a broader view; decrease it when you want only the most relevant result.

---

---

## Chapter 8: Analysis Tools
### *Advanced — Multi-System & Multi-Platform*

> **⚠️ Advanced Users**
> The tools in this chapter are designed for developers working on projects that span **multiple systems and development platforms** — for example, debugging a microservices architecture where errors cascade across a web server, database, and message queue simultaneously.
>
> If you are working on a single application or a single codebase, you can safely skip this chapter.
>
> These tools may grow as the need is identified, but **there is no current plan to extend this range of tools.**

---

### Tool 14: `correlate_errors`

**What it does:**
Analyzes error logs from multiple systems simultaneously and identifies patterns, correlations, and root causes. Instead of manually comparing logs from your web server, database, and message queue, you provide them all at once and the AI finds the connections.

**When to use it:**
- When debugging an incident that spans multiple services
- When you have errors in one system that might be caused by another
- When you want to find the root cause of a cascading failure
- When you need to understand the timeline of a complex bug

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `logs` | **Yes** | array of objects | — | Array of log objects, each with `system_name` and `content` |

Each log object in the array must have:
- `system_name` (string): The name of the system this log came from
- `content` (string): The actual log content

*Correlating errors across two services:*
> "I'm seeing errors in both my API server and my database. Here are the logs from both — can you find the correlation?"

Based on this, the server receives:
```json
{
  "logs": [
    {
      "system_name": "API Server",
      "content": "[14:23:01] ERROR: Connection timeout after 30s\n[14:23:01] ERROR: Request failed for /api/users"
    },
    {
      "system_name": "Database",
      "content": "[14:22:58] WARN: Connection pool exhausted (100/100 connections)\n[14:23:00] ERROR: Unable to allocate new connection"
    }
  ]
}
```

**What happens:** The AI reads all the logs together and identifies that the database connection pool exhaustion at 14:22:58 is the root cause of the API timeouts starting 3 seconds later at 14:23:01.

---

### Tool 15: `dependency_graph`

**What it does:**
Analyzes shared dependencies and version conflicts across multiple projects you've indexed.

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `repos` | No | array of strings | All indexed | List of project names to analyze |
| `check_conflicts` | No | boolean | false | Run semver conflict detection |
| `include_dev` | No | boolean | false | Include devDependencies in analysis |

**How to ask for it:**
> "Check if there are any dependency version conflicts across my frontend and backend projects."

Based on this, the server receives:
```json
{
  "repos": ["frontend", "backend"],
  "check_conflicts": true
}
```

---

---

## Chapter 9: Vision Tools

These tools let you analyze images — screenshots, diagrams, photos, or any visual content — using AI models that can "see."

---

### Tool 16: `vision_analyze`

**What it does:**
Sends an image (from your computer or a URL) to a vision-capable AI model and returns a description, analysis, or answer about the image.

**When to use it:**
- When you need to describe what's in a screenshot or photo
- When you want to extract text or data from an image
- When you're debugging a UI and want AI analysis of the layout
- When you need to compare a design mockup against the implementation

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `image_path` | No* | string | — | Absolute path or home-relative path (e.g., `~/screenshots/nav.png`) |
| `image_url` | No* | string | — | URL of an image to analyze |
| `prompt` | No | string | "Describe this image in detail." | What to look for or analyze |
| `model` | No | string | `google/gemini-flash-1.5` | The vision model to use |

*\*You must provide either `image_path` or `image_url` (at least one).*

**How to ask for it — examples:**

*Analyzing a local screenshot:*
> "Look at this screenshot and tell me if the navigation menu is aligned correctly."

Based on this, the server receives:
```json
{
  "image_path": "/Users/tim/screenshots/nav-bar.png",
  "prompt": "Is the navigation menu aligned correctly? Check for spacing and consistency."
}
```

*Analyzing an image from a URL:*
> "What does this architecture diagram show?"

Based on this, the server receives:
```json
{
  "image_url": "https://example.com/architecture-diagram.png",
  "prompt": "Describe this architecture diagram. Identify the components and data flow."
}
```

**Tips:**
- This is one of the key tools that may justify using OpenRouter — if your locally selected model does not have vision capabilities, `vision_analyze` provides that capability.
- **Tilde Home Support:** The `image_path` parameter supports tilde expansion (`~` or `~/`), making it simple to reference image files in user directories (e.g., `~/Desktop/screenshot.png`).
- The default model (`google/gemini-flash-1.5`) is cost-effective for most vision tasks.
- Be specific in your `prompt`. "Describe this image" gives a general description. "Does this login form have accessibility issues?" gives a focused, actionable answer.

---

---

## Chapter 10: Budget Tools

These tools help you manage your OpenRouter spending — the "financial controls" for your AI usage.

---

### Tool 17: `set_budget`

**What it does:**
Sets a session-wide spending limit. Once your total OpenRouter usage reaches this limit, further requests are blocked until you increase it.

**Parameters:**

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `max_dollars` | No | number | — | Maximum amount to spend this session (USD) |
| `warn_at_percent` | No | number | — | Percentage of budget used before warnings appear |

**How to ask for it:**
> "Set my budget to $5 for this session, and warn me when I've used 80%."

Based on this, the server receives:
```json
{
  "max_dollars": 5.00,
  "warn_at_percent": 80
}
```

---

### Tool 18: `get_budget_status`

**What it does:** Shows how much you've spent in the current session and your remaining budget.

**Parameters:** None. Just ask for it.

**How to ask for it:**
> "How much have I spent so far this session?"

---

### Tool 19: `get_balance`

**What it does:** Checks your OpenRouter account credit balance — the actual money in your OpenRouter account.

**Parameters:** None. Just ask for it.

**How to ask for it:**
> "How much credit do I have left in my OpenRouter account?"

---

### Tool 20: `get_key_info`

**What it does:** Shows information about your current API key — its permissions, usage limits, and restrictions.

**Parameters:** None. Just ask for it.

**How to ask for it:**
> "Show me the details of my OpenRouter API key."

---

### Tool 21: `get_session_usage`

**What it does:** Shows your total token usage and estimated cost for the current session.

**Parameters:** None. Just ask for it.

**How to ask for it:**
> "What's my total token usage for this session?"

---

---

# PART 3: ADVANCED REFERENCE
## *Power User Patterns & Safety Systems*

---

## Chapter 11: The Budget-First Workflow

### 11.1 The Golden Rule

> **💰 Always set a budget before you start working.**
>
> Run `set_budget` at the start of every session. Run `get_budget_status` periodically. This is your financial safety net.

---

### 11.2 The Complete Pre-Flight Checklist

Before any significant AI job via OpenRouter, run through this checklist:

```
PRE-FLIGHT CHECKLIST
─────────────────────────────────────────────────
□ 1. Have I SET a budget for this session?
      → Run set_budget with max_dollars and warn_at_percent

□ 2. Does my locally selected model already handle this?
      → If YES, use it instead of OpenRouter (Cost-Aware Routing)

□ 3. Have I chosen the RIGHT model for this task?
      → Use recommend_model if unsure

□ 4. Have I set max_tokens in my request?
      → Always. No exceptions. Prevents runaway output.

□ 5. Am I checking the response for errors?
      → Build this into your workflow
─────────────────────────────────────────────────
```

---

### 11.3 Cost Scenarios: Real Numbers for Real Decisions

| Use Case | Recommended Preset | Est. Tokens/Request | Monthly Volume | Est. Monthly Cost |
|---|---|---|---|---|
| **Simple chatbot** | cheap | 500 in / 200 out | 50,000 requests | **~$3** |
| **Document summarizer** | smart | 5,000 in / 500 out | 1,000 docs | **~$20** |
| **Code review assistant** | coder | 2,000 in / 1,000 out | 5,000 reviews | **~$5** |
| **Image analysis** | (vision_analyze) | 500 tokens + image | 10,000 images | **~$15** |
| **Research assistant** | smart | 10,000 in / 2,000 out | 500 sessions | **~$35** |

---

### 11.4 Secret Redaction Firewall (Data Leak Prevention)

To prevent accidental leaks of highly sensitive developer credentials or system keys during active conversations, the server contains an automatic, high-precision **Secret Redaction Firewall**.

#### How it Works
The firewall intercepts every outbound payload to `chat_completion` (chat prompts) and `embeddings` (code chunks) before they hit the network. It parses the entire input payload recursively and matches credentials using highly precise patterns:
1. **OpenRouter API Keys**: Matches strings conforming to `sk-or-v1-[a-zA-Z0-9]{32,128}`.
2. **OpenAI API Keys**: Matches strings conforming to `sk-proj-[a-zA-Z0-9_-]{32,128}`.
3. **PEM Private Keys**: Matches standard PEM multi-line private key structures, including `-----BEGIN [A-Z0-9\s_-]+KEY----- ... -----END [A-Z0-9\s_-]+KEY-----` (which covers RSA, DSA, EC, OPENSSH, and generic private keys).

Matched secrets are replaced instantly with a standard `[REDACTED]` placeholder, preventing them from ever leaving your local machine.

#### Programmatic Escape Hatch
For specialized environments (e.g. testing credential rotators, key verification agents, or closed enterprise networks) where you explicitly *intend* to send keys, you can disable the firewall by setting the environment variable:
```env
DISABLE_REDACTION=true
```

---

### 11.5 Zero-Network Startup and Local Pricing Cache

The OpenRouter MCP server features **Instant Startup Capability** using local pricing serialization.

#### Startup Optimization
Older versions of the server performed blocking network calls to OpenRouter's `/models` endpoint on startup to resolve models and their pricing structures, resulting in significant delays and high susceptibility to start failures if the API was offline or degraded.
The server now implements:
1. **Local Persistent Cache**: Stores the full OpenRouter model catalog, pricing, and context limits under a local `pricing_cache.json` state file.
2. **Instant Initialization**: On boot, the server loads `pricing_cache.json` instantly into memory (`modelsCache`), letting the server register with your MCP client within milliseconds.
3. **Background Syncing**: Once successfully started, the server schedules non-blocking background tasks to sync pricing maps from the remote API, updating `pricing_cache.json` on-the-fly and serving them without any blocking calls.

---

## Chapter 12: Error Handling — What Went Wrong and How to Fix It

### 12.1 The Error Translation Guide

| Error Code | Raw Message | Human Translation | Fix It By... |
|---|---|---|---|
| `400` | Bad Request | Your input is malformed | Check required fields; verify `model` format |
| `401` | Unauthorized | Your API key is wrong or missing | Re-check your API key in config |
| `402` | Payment Required | Your OpenRouter account has no credit | Add funds at openrouter.ai/credits |
| `403` | Forbidden | This model requires special access | Check model page for access requirements |
| `404` | Not Found | That model ID doesn't exist | Run `list_models` to get valid IDs |
| `429` | Too Many Requests | You're sending too fast | Add delays between requests |
| `500` | Server Error | OpenRouter's side is having issues | Wait and retry |
| `503` | Service Unavailable | The specific model is offline | Try a different model |

---

### 12.2 Common "Nothing Happens" Scenarios

| Symptom | Likely Cause | Fix |
|---|---|---|
| Tool call returns nothing | API key not configured | Check `OPENROUTER_API_KEY` is set |
| "Error fetching models" | Network issue or invalid key | Verify internet connection and key |
| Model returns garbled output | Wrong model for the task | Use `recommend_model` |
| Response seems truncated | `max_tokens` too low | Increase `max_tokens` or omit it |

---

### 12.3 Setup Verification Diagnostics

To proactively prevent and troubleshoot execution problems, the server includes a dedicated setup verification tool called `verify_setup`. This tool runs a suite of diagnostic checks on the runtime environment, credentials, file permissions, and active budget session.

You can trigger this diagnostic run at any time via your AI client using the following tool call:

```json
{
  "name": "verify_setup"
}
```

#### Diagnostic Suite Coverage

When executed, the tool checks:
1. **Node.js Compatibility:** Verifies that your current runtime meets the minimum required version (`>=20.12.0`). It warns you if dynamic module styling utilities (like the standard `styleText` export in Node's utilities) might be unavailable or crash-prone.
2. **API Credentials:** Inspects your configured `OPENROUTER_API_KEY` and confirms if it conforms to the standard `sk-or-...` format without exposing your secret values.
3. **Storage Permissiveness:** Probes the database storage directory permissions to ensure that the server can persist session budgets (`rate_config.json`), symbol maps (`symbol_index.json`), and pinned memories (`context_store.json`).
4. **Usage Metrics:** Measures active memory caching metrics and current session spending against your configured maximum budget limit.

#### Example Output

Here is a typical passing diagnostic report returned by `verify_setup`:

```markdown
## 🔍 OpenRouter MCP Verification Report
- **Node.js:** ✅ Passed (Version: `v20.14.0` >= `20.12.0`)
- **API Key:** ✅ Configured (`sk-or-...` format verified)
- **File Permissions:**
  - `rate_config.json`: ✅ Accessible (Not yet created)
  - `symbol_index.json`: ✅ Writable
  - `context_store.json`: ✅ Writable
- **Pricing Cache:** ✅ Active (185 models cached)
- **Session Spend:** $0.000000 / $10.00 limit
```

If any check fails, the report will flag the specific issue (with a `⚠️ Warning` or `❌ Missing` status) and guide you on the exact path and context to fix.

---

## Chapter 13: Sustainability & Responsible Usage

### 13.1 The Environmental Equation

Every AI request consumes real energy. Here's a framework for responsible choices:

```
TASK COMPLEXITY vs. MODEL SIZE
─────────────────────────────────────────────────────
Simple Task + Small Model = ✅ Right-sized (efficient)
Simple Task + Large Model = ⚠️ Wasteful (costly + high energy)
Complex Task + Small Model = ❌ Inadequate (poor results)
Complex Task + Large Model = ✅ Appropriate (justified)
─────────────────────────────────────────────────────
```

**The Practical Rule:** Always try the smallest model that can do the job. The `cheap` and `fast` presets exist for exactly this reason.

---

### 13.2 The Responsible Usage Pledge

```
□ Am I using the right-sized model for each task?
□ Am I setting token limits to prevent unnecessary generation?
□ Do I have budget limits set at both the session and account level?
□ Am I monitoring actual usage vs. estimates?
□ Am I using my subscription quota before reaching for OpenRouter?
```

---

## Chapter 14: Quick Reference — The Cheat Sheet

### 14.1 All 22 Tools at a Glance

| # | Tool | Category | Key Input | What It Does |
|---|---|---|---|---|
| 1 | `chat_completion` | Chat | `prompt` | Send a prompt to any model |
| 2 | `chat_with_preset` | Chat | `preset`, `prompt` | Send using a named preset |
| 3 | `recommend_model` | Chat | `task` | Get a preset recommendation |
| 4 | `optimize_prompt` | Chat | `prompt` | Improve a draft prompt |
| 5 | `list_models` | Models | (none) | Browse all available models |
| 6 | `filter_models` | Models | `query` | Filter models by context/price/vision |
| 7 | `get_balance` | Account | (none) | Check account credit |
| 8 | `get_key_info` | Account | (none) | Check API key details |
| 9 | `get_session_usage` | Account | (none) | Check session token usage |
| 10 | `pin_context` | Memory | `text` | Store information for later |
| 11 | `retrieve_context` | Memory | `query` | Search stored information |
| 12 | `clear_context` | Memory | (optional) | Delete stored information |
| 13 | `index_project` | Code | `project_path`, `project_name` | Index a project's symbols |
| 14 | `search_symbols` | Code | `query` | Search indexed symbols |
| 15 | `reindex_project` | Code | `project_name` | Deep semantic indexing |
| 16 | `semantic_code_search` | Code | `query` | Natural language code search |
| 17 | `correlate_errors` | Analysis | `logs` | Find root causes across logs |
| 18 | `dependency_graph` | Analysis | (optional) | Analyze shared dependencies |
| 19 | `vision_analyze` | Vision | `image_path` or `image_url` | Analyze images with AI |
| 20 | `set_budget` | Budget | `max_dollars` | Set spending limits |
| 21 | `get_budget_status` | Budget | (none) | Check spending status |
| 22 | `verify_setup` | Diagnostics | (none) | Verify keys, permissions, and Node compatibility |

---

### 14.2 The Token Math Cheat Sheet

| You Have | Approximate Tokens | Relative Cost (Efficient Model) |
|---|---|---|
| 1 word | ~1.3 tokens | Negligible |
| 1 sentence | ~20 tokens | Negligible |
| 1 paragraph | ~100 tokens | < $0.001 |
| 1 page | ~500 tokens | < $0.005 |
| 10 pages | ~5,000 tokens | < $0.01 |
| 100 pages | ~50,000 tokens | < $0.05 |
| 500 pages | ~250,000 tokens | < $0.25 |

---

### 14.3 Temperature Quick-Pick Guide

| Your Task | Recommended Temperature |
|---|---|
| Extracting data from documents | 0.0 – 0.2 |
| Writing code | 0.1 – 0.3 |
| Summarizing text | 0.2 – 0.4 |
| Answering factual questions | 0.2 – 0.5 |
| Writing professional emails | 0.4 – 0.6 |
| General conversation | 0.5 – 0.7 |
| Creative writing / storytelling | 0.7 – 1.0 |
| Brainstorming / ideation | 0.8 – 1.2 |

---

> [!CAUTION]
> **NOTICE TO USERS: Defense-in-Depth Budgeting**
> 
> The Universal MCP for OpenRouter provides powerful application-level budget controls (via the `set_budget` tool) and automatic circuit breakers. However, you should treat these tools as **just one line of defense** specifically tailored for application development and dynamic agentic workflows.
> 
> **You must ALWAYS implement infrastructure-level limits directly through OpenRouter.** 
> 
> If your IDE crashes, an agent enters an infinite loop that bypasses the MCP, or your API key is somehow exposed, the MCP's circuit breakers cannot protect you. To ensure true financial safety, follow these OpenRouter best practices:
> 
> 1. **Use Unique Keys:** Generate a unique OpenRouter API key specifically for this MCP server. Do not reuse a master key.
> 2. **Set Hard Key Limits:** In your OpenRouter Dashboard (Settings -> Keys), apply a strict USD spending limit to this specific key.
> 3. **Set Reset Frequencies:** Configure the key to reset daily or weekly rather than leaving it uncapped.
> 4. **Base Account Limits:** Ensure your base OpenRouter account has a global maximum spending limit configured.
> 
> Use OpenRouter's native limits to protect your wallet, and use the Universal MCP's budget tools to manage your agent's behavior.

---

### 14.4 The 60-Second Decision Framework

```
Got a new AI task? Follow this in 60 seconds:

1. (10 sec) Can my local model handle this?
   → If YES, use it. Done. You've saved money.

2. (10 sec) What TYPE of task is it?
   Code / Factual / Creative / Visual / Analysis

3. (10 sec) Use recommend_model to pick a preset
   → Or choose: smart, cheap, creative, fast, coder

4. (20 sec) Set your budget with set_budget
   → Set max_dollars and warn_at_percent

5. (10 sec) Run the task with the chosen preset
   → Check the response for completeness
   → Done.
```

---

## Closing Note: The Human Behind the API

This manual has covered tools, parameters, presets, and pricing. But the most important thing to remember is this:

**Every AI request is a decision.** A decision about which model to trust, how much to spend, what task to automate, and what to keep human.

The tools in this manual give you *information* to make those decisions well. The three pillars — **sustainability**, **safety**, and **transparency** — are your compass when the information alone isn't enough.

Use the smallest model that works. Set budget limits before you're surprised by bills. Understand what you're paying for and why.

The best AI workflows aren't the ones that use the most powerful models. They're the ones that use the *right* models, wisely.

---

*OpenRouter MCP User's Manual — Human-Centric Edition*
*For corrections, contributions, or feedback: [refer to the project repository](https://github.com/tim/universal-mcp-for-openrouter)*

---

> **📚 Appendix Note:** For raw API schema documentation, model ID complete listings, and advanced streaming configurations, refer to the OpenRouter API Reference at [openrouter.ai/docs](https://openrouter.ai/docs). This manual is intentionally human-first; the official docs are machine-first. Use both.

---

### Legal Notices

**License:** This project is licensed under the [MIT License](./LICENSE). You are free to use, modify, and distribute this software for any purpose, including commercial use. See the LICENSE file for the full terms.

**Disclaimer of Warranty:** To the fullest extent permitted by applicable law, the authors and contributors disclaim all warranties and shall not be liable for any claims, damages, losses, costs, or liabilities arising from the use of this software. THE SOFTWARE IS PROVIDED "AS IS," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. This includes, but is not limited to:
- API costs incurred through OpenRouter or any third-party service
- Data loss, service interruptions, or security incidents
- Decisions made based on AI-generated outputs
- Charges caused by misconfiguration, automation, bugs, repeated requests, prompt loops, third-party integrations, or unexpected behavior of this software

**Data Transmission and Privacy:** This software may transmit prompts, messages, metadata, files, tool outputs, or other user-provided content to OpenRouter and/or third-party model providers. Do not use this software with sensitive, confidential, personal, regulated, or proprietary data unless you have reviewed and accepted the applicable third-party privacy policies, data processing terms, and security practices.

**AI Output Disclaimer:** AI-generated outputs may be inaccurate, incomplete, offensive, unsafe, or misleading. You are solely responsible for reviewing and validating all outputs before relying on them. This software is not intended to provide legal, medical, financial, safety-critical, or other professional advice.

**Third-Party Services:** This tool connects to OpenRouter's API, which is a paid service operated by OpenRouter, Inc. You are solely responsible for managing your API keys, account balance, and usage costs. The author is not responsible for changes to pricing, availability, rate limits, model behavior, API compatibility, terms of service, or service outages by OpenRouter or any downstream model provider. Review OpenRouter's terms of service at [openrouter.ai/terms](https://openrouter.ai/terms).

**User Responsibility:** You are responsible for ensuring that your use of this software complies with OpenRouter's terms of service, applicable model provider policies, and all applicable laws and regulations.

**No Support or Maintenance Obligation:** This project is provided as open-source software by an individual developer. There is no guarantee of support, maintenance, updates, bug fixes, compatibility with future API changes, or continued availability of the software.

**Trademark Notice:** "Universal MCP for OpenRouter" is an independent, community-developed project. It is not affiliated with, endorsed by, or officially connected to OpenRouter, Inc. "OpenRouter" is a trademark of OpenRouter, Inc. All other trademarks are the property of their respective owners.
