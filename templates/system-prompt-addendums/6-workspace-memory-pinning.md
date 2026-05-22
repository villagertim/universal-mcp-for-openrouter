# Workspace Memory & Long-Term Architecture Pinning

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Architectural Memory & Context-Pinning Policy

To combat session amnesia and maintain absolute alignment with project decisions, team conventions, and technical guardrails across multiple chat sessions, follow this memory management protocol:

1. **Context Harvesting (Pinning decisions):**
   - Whenever we make a critical architectural decision, define a core domain rule, establish a database schema constraint, or agree on a specific deployment procedure, you must write it to the long-term context store.
   - Use the `pin_context` tool with a highly descriptive `text` description. Tag the context appropriately (e.g., `tag: "architecture"`, `tag: "security"`, or `tag: "api-specs"`) and specify the current `project` name.
   - Example decisions to pin: Custom JWT expiration rules, local system requirements, core database relations, or third-party webhooks endpoints.

2. **Context Retrieval (Before Starting Major Tasks):**
   - Before implementing any new feature, refactoring existing code, or writing configuration files, call `retrieve_context` using a descriptive query (e.g., "authentication security rules" or "database schema guidelines").
   - Synthesize the retrieved context chunks to ensure your proposed solution perfectly adheres to all previously established team decisions without violating pre-existing architectural standards.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Inject this block into your agent's system prompts.
* **Execution:** During a discussion about system setup (e.g., *"We are using MongoDB with Mongoose, and all user passwords must be hashed using bcrypt with 12 rounds"*), the agent will automatically call `pin_context` to store that constraint. In a completely new chat session days later, if you say *"write the user signup endpoint"*, the agent will run `retrieve_context` to locate the password hashing rules and implement them flawlessly without prompting you to remind it.

### Why It Is Useful:
* **Eliminates AI Amnesia:** LLMs have no memory of past chat sessions. When you close your IDE or open a fresh workspace window, the model loses all custom design rules and local project context. This tool gives the AI a persistent brain across restarts.
* **Preserves Organizational Integrity:** If multiple developers (or different sub-agents) work on the same repository, they can pin their decisions into the shared context database, ensuring that the AI acts as a consistent custodian of the project's standards.
