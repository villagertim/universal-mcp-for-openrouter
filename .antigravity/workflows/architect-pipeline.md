# WORKFLOW: The Architect's Pipeline

**STATUS:** ON-DEMAND ONLY. Do not apply this workflow autonomously.

This workflow is a reference for developers or agents to follow ONLY when explicitly requested. It is a 3-phase process for generating technically accurate, structures, and cost-effective content.

---

## Phase 1: The Strategist (Model Selection)
**Objective:** Match the complexity of the task to the most capable/efficient model.
- **Action:** Call `mcp_openrouter_recommend_model` with a detailed description of the task.
- **Outcome:** Identify the target `preset` (e.g., smart, coder, fast) to use for the final generation.

## Phase 2: The Auditor (Context Gathering)
**Objective:** Replace "LLM Memory" with "Technical Ground Truth."
- **Action:** 
  1. For documentation: Use `ls` or `index_project` to get the list of files/tools.
  2. For model reference: Use `mcp_openrouter_list_models` to get current pricing/IDs.
  3. For code: Use `grep_search` to find relevant implementation details.
- **Outcome:** A "Context Block" of verified data that will be injected into the final prompt.

## Phase 3: The Assembler (Structured Assembly)
**Objective:** Merge instructions and context into a final production prompt.
- **Action:** Assemble a prompt with the following sections:
  1. **Role**: High-level professional persona.
  2. **Instructions**: Structural requirements (e.g., "Progressive Disclosure").
  3. **Ground Truth**: The data gathered in Phase 2.
  4. **Output Format**: Explicit constraints (e.g., Markdown tables).

---

## How to Invoke
A human user may invoke this by saying: *"Apply the Architect's Pipeline workflow to [Task Description]."*
An agent must wait for this explicit instruction before proceeding with Phase 1.
