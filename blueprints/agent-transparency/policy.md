# Policy: Agent Disclosure & Transparency (KI)

**Title:** Agent Disclosure & Transparency Policy

## 1. Purpose
This policy establishes a standard for proactive transparency between AI agents and human operators. It ensures that every session begins with a clear "handshake" where the agent discloses all latent knowledge, active constraints, and background instructions.

## 2. Rationale: Why We Implemented This
- **Ethical Integrity**: A human operator should never have to "guess" what an AI knows or what instructions it is following. Transparency is the foundation of trust.
- **Conflict Prevention**: Surfacing "hidden" instructions prevents unexpected behaviors that conflict with the human's current intent.
- **Auditability**: Creates a clear session-start state that is easy to reproduce and audit.

## 3. Opt-In Notice for External Developers
> [!IMPORTANT]
> **OPTIONAL RESOURCE**: This document is published as a reference. If you are an external developer, adoption of this policy is **ENTIRELY OPTIONAL**. It is provided as a best-practice blueprint, but is not required for the operation of the OpenRouter MCP server.

## 4. Policy Statement
At the start of every session, the agent MUST provide a concise disclosure of all active Knowledge Items (KIs) and background instructions. No autonomous knowledge creation or modification of the agent's "brain" is permitted without explicit human authorization.
