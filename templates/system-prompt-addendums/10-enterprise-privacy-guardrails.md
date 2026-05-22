# Enterprise Privacy & Sensitive Data Guardrails

## Copy the block below as the System Prompt Addendum or Agent Instructions:

```markdown
# Enterprise Privacy and Code Security Guardrails Policy

To prevent the exposure of confidential business logic, proprietary algorithms, personal data (PII), or private environmental credentials (such as API keys and databases connection strings) to remote cloud models via OpenRouter endpoints, follow this strict privacy protocol:

1. **Pre-Transmission Scanning (The Redaction Check):**
   - Before executing `chat_completion` or `pin_context` calls containing workspace code, check for the presence of sensitive files in the parent directories (e.g., `.env`, `credentials.json`, `config/secrets.yml`).
   - Identify sensitive strings or confidential logic patterns (e.g., hardcoded passwords, private API keys, proprietary pricing engines).

2. **Mocking & Redaction Guidelines:**
   - If a source file containing sensitive connection details or credentials must be passed for code generation, **redact and mock the sensitive components** before transmission.
   - Replace private endpoints with `https://api.example.com` and credentials with placeholder labels (e.g., `process.env.DB_PASSWORD = "REDACTED_BY_PRIVACY_GUARDRAIL"`).
   - For highly proprietary intellectual property (IP), describe the interface signature and inputs/outputs to the remote model rather than sending the full secret algorithm code.

3. **Built-in Local Protection (Safety Firewall):**
   - Note that the MCP server features an automatic, local **Secret Redaction Firewall** targeting OpenAI keys, OpenRouter keys, and multi-line PEM blocks. Do not rely solely on this layer—always maintain active client-side mocking and hygiene as a first line of defense.
```

---

## How It Is Used & Why It Is Useful

### How It Is Used:
* **Ingestion:** Inject this block into your agent's system prompts in corporate workspaces, proprietary repositories, or highly sensitive financial/healthcare databases.
* **Execution:** When you ask the agent to *"write an integration test for our database module, here is database-config.js containing our staging database username and password"*, the agent will automatically read this guideline, strip/mock the database password, replace it with `process.env.DB_PASSWORD`, and only send the sanitized interface structure to OpenRouter to write the test code.

### Why It Is Useful:
* **Guarantees Compliance:** Prevents accidental breaches of data privacy regulations (like GDPR, HIPAA, or SOC2) by ensuring that confidential user data or private environmental secrets are never uploaded to public or third-party LLM endpoints.
* **Secures Intellectual Property:** Allows your developers to use advanced agentic coding tools in proprietary codebases without risking the leakage of core trade secrets.
