# Workflow: Agent Disclosure — Session Initialization

**Title:** Agent Disclosure Workflow

## 1. Overview
This workflow provides the implementation steps for the transparency policy. It creates a standardized "Handshake" at the start of any agentic session.

## 2. Opt-In Status
> [!WARNING]
> **REFERENCE ONLY**: This workflow is a best-practice blueprint. External developers are welcome to adopt this pattern, but it is **NOT REQUIRED**.

## 3. Implementation Matrix
| Context | Required? |
| :--- | :--- |
| **Internal Development** | ✅ Mandatory |
| **External Developers** | ⬜ Optional |

## 4. Step-by-Step Instructions
1. **Initialize Context**: The agent scans for active Knowledge Items (KIs).
2. **Output Handshake**: The agent outputs a structured list of active KIs and background constraints.
3. **Verify Intent**: The agent describes its current understanding of the task to ensure alignment.

## 5. Example Disclosure
*"Before we begin, I am disclosing that I have 2 KIs active: 'OpenRouter Security' and 'Transparency Mandate'. I am using the 'antigravity' profile. I understand our goal is to build the User Manual."*
