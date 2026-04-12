---
name: prompt-contracts
description: "Interactive system-building assistant using the Prompt Contracts framework. Transforms vague vibe prompts into precise, structured contracts with four enforceable clauses: GOAL, CONSTRAINTS, FORMAT, and FAILURE CONDITIONS. This skill should be used when the user wants to build a system, feature, or component and wants to avoid wasted iterations. Trigger on /prompt-contracts, help me write a contract, lets build a system, or when the user asks for help structuring a request."
---

# Prompt Contracts Skill

An interactive assistant for building precise AI-executable specifications. Stop vibe coding. Start shipping.

## What This Skill Does

Guide the user through creating a **Prompt Contract** — a structured prompt with four enforceable clauses that eliminates ambiguity and prevents Claude from solving the wrong problem.

The framework: **GOAL** (testable success metric) + **CONSTRAINTS** (hard boundaries) + **FORMAT** (exact output structure) + **FAILURE CONDITIONS** (what makes it unacceptable).

Reference `references/framework.md` for the full framework details, examples, and clarifying questions by domain.

---

## History Storage

All saved contracts live in `~/.claude/prompt-contracts/history/` as individual JSON files. Use `scripts/contracts_db.py` for all read/write operations. Never write directly to the history directory.

Each contract record contains:
- `id` — UUID v4
- `title` — short human-readable label
- `created_at` — ISO 8601 UTC timestamp
- `project` — absolute path of the working directory at save time
- `parent_id` — UUID of the contract this revises (null for originals)
- `tags` — optional string list
- `contract` — full contract text

---

## Complexity Detection & Auto-Decomposition

Before building any contract in `new` or `review` mode, run a complexity check on the goal. If the goal is complex, automatically switch to sequence mode and decompose it — do not ask the user whether to decompose. Just do it and explain why.

### Complexity Signals (trigger decomposition if 2+ are true)

- Goal touches more than one architectural layer (e.g. DB + API + UI, or service + tests + infra)
- Goal mentions multiple distinct domains (e.g. auth + billing + notifications)
- Goal implies more than 3 output files in FORMAT
- Goal contains connective language: "and also", "as well as", "plus", "including", "then", "after that", "on top of that"
- Goal describes multiple distinct user journeys or success paths
- Estimated implementation is >200 LOC or >4 hours of work
- Goal includes cross-cutting concerns (logging, auth, validation) alongside feature work

### Decomposition Algorithm

When complexity is detected:

1. **Announce the decision** — one sentence: "This goal spans multiple concerns — I'll break it into a linked sequence of contracts." Do not ask for permission.

2. **Identify natural seams** using SE principles (see `references/framework.md` for the full decomposition guide).

3. **Show the proposed breakdown** as a numbered list before building anything.

4. **Create the sequence** once confirmed.

5. **Build each contract** using the standard interactive flow.

6. **Save each step** with sequence link.

7. **After all steps**, show the full sequence summary via `seq-show` and offer to execute.

---

## Modes

### `/prompt-contracts` or `/prompt-contracts new` — Build a New Contract

1. Ask: "What are you building, and what does success look like when it's done?"
2. Run complexity check — if 2+ signals, auto-decompose.
3. Identify domain, load clarifying questions from `references/framework.md`.
4. Ask targeted follow-ups (stack, success verification, failure modes).
5. Check for CLAUDE.md — use its constraints as baseline.
6. Generate contract as clean, copyable code block.
7. Save automatically via `contracts_db.py save`.
8. Offer to refine one section at a time.

**Tone**: Conversational. One question at a time.

---

### `/prompt-contracts review` — Convert a Vibe Prompt to a Contract

1. Ask the user to paste their existing prompt.
2. Run complexity check — if 2+ signals, auto-decompose.
3. Identify what's underspecified (no success metric, no stack, no output structure, no failure guardrails).
4. Ask minimum questions to fill gaps.
5. Output upgraded contract + brief diff summary.
6. Save automatically.

---

### `/prompt-contracts claude-md` — Create, Update, or Refine CLAUDE.md

**Path A — CLAUDE.md exists:** Diagnostic + refinement mode. Identify vague rules, missing stack entries, missing failure guardrails. Scan codebase for drift. Show before/after diff before writing.

**Path B — No CLAUDE.md:** Infer from package files, directory structure, code style. Confirm with user before writing.

Both paths: include session handshake ritual at top. Always confirm before writing. Never silently overwrite.

---

### `/prompt-contracts sequence <title>` — Start a Multi-Step Feature Sequence

1. Create sequence via `contracts_db.py seq-create`.
2. Ask user to identify logical steps (DB → API → UI → tests).
3. Show proposed breakdown, confirm before proceeding.
4. Build contracts step by step, save each with sequence link.
5. Show full summary via `seq-show`.
6. Offer to execute.

---

### `/prompt-contracts sequence next <seq_id>` — Continue a Sequence

Run `seq-next`, show last contract, build next step interactively.

---

### `/prompt-contracts sequences` — List All Sequences

Run `contracts_db.py seq-list`.

---

### `/prompt-contracts sequence show <seq_id>` — Show a Sequence

Run `contracts_db.py seq-show <seq_id>`.

---

### `/prompt-contracts sequence run <seq_id>` — Execute a Sequence

Load summary, run `contracts_db.py seq-execute <seq_id>`. Executor handles all output.

---

### `/prompt-contracts history` — Browse Contract History

Run `contracts_db.py list --limit 20`.

---

### `/prompt-contracts show <uuid>` — Show a Saved Contract

Run `contracts_db.py show <uuid>`. Offer to revise.

---

### `/prompt-contracts revise <uuid>` — Revise an Existing Contract

Load, ask what to change, generate updated contract, save with `--parent <original_uuid>`.

---

### `/prompt-contracts diff <uuid1> <uuid2>` — Compare Two Contracts

Run `contracts_db.py diff <uuid1> <uuid2>`. Summarize key changes in plain English.

---

### `/prompt-contracts search <query>` — Search Contracts

Run `contracts_db.py search "<query>"`.

---

### `/prompt-contracts revisions <uuid>` — Show Revision Chain

Run `contracts_db.py revisions <uuid>`. Current contract marked with `*`.

---

### `/prompt-contracts superpowers` — Phase-Gated Workflow

Load `references/superpowers.md` first. Run Step 0 installation check. Follow phase protocol exactly: Brainstorm → Spec → Plan → Execute. Each phase requires explicit user sign-off before advancing.

```
Phase 1 → GOAL clause (draft) — gate: user approves success metric
Phase 2 → Full contract       — gate: user signs off, saved to history
Phase 3 → Task list           — gate: user confirms breakdown
Phase 4 → Implemented tasks   — gate: each task passes clause review
```

---

### `/prompt-contracts tutorial` — Interactive Walkthrough

Load `references/tutorial-curriculum.md` first. Two modes: interactive (4 concepts, one at a time) or `--export` (generates `prompt-contracts-guide.md`).

---

### `/prompt-contracts help` — Show Available Commands

```
Prompt Contracts — available commands:

Contract building:
  /prompt-contracts              → Build a new contract interactively
  /prompt-contracts new          → Same as above
  /prompt-contracts review       → Convert a vague prompt into a contract
  /prompt-contracts claude-md    → Create, update, or refine CLAUDE.md
  /prompt-contracts superpowers  → Phase-gated workflow: brainstorm → spec → plan → execute
  /prompt-contracts tutorial     → Guided walkthrough of the prompt contracts framework

Sequences (multi-step features):
  /prompt-contracts sequence <title>       → Start a new multi-step sequence
  /prompt-contracts sequence next <seq_id> → Add the next step to a sequence
  /prompt-contracts sequence show <seq_id> → Show all steps in a sequence
  /prompt-contracts sequence run <seq_id>  → Execute a sequence (parallel where possible)
  /prompt-contracts sequences              → List all sequences

History:
  /prompt-contracts history               → List saved contracts
  /prompt-contracts show <uuid>           → Show a saved contract
  /prompt-contracts revise <uuid>         → Revise a contract (saves as new revision)
  /prompt-contracts diff <u1> <u2>        → Diff two contracts
  /prompt-contracts search <q>            → Search contract text
  /prompt-contracts revisions <uuid>      → Show revision chain

  /prompt-contracts help                  → Show this help
```

---

## Output Format

Always output the final contract as a **fenced code block**:

```
[Brief task title]

GOAL: [Exact, testable success metric]
Success = [specific observable outcome]

CONSTRAINTS:
- [Constraint 1]
- [Constraint 2]

FORMAT:
1. [File/function with path and type]
2. [File/function with path and type]

FAILURE CONDITIONS:
- [Antipattern to avoid]
- [Missing state/type/validation]
- [Wrong library/pattern]
```

---

## Key Principles

- **One question at a time.** Never dump a form on the user.
- **Read context before asking.** Check CLAUDE.md, package files, and existing code before asking about the stack.
- **Testability is the north star.** Every GOAL must have a verifiable success condition.
- **Failure conditions are the secret weapon.** Push for at least 4 specific failure conditions.
- **Shorter prompts over time.** Once CLAUDE.md holds constraints, the per-task contract becomes short.
- **The contract is for the next message.** Output should be ready to paste directly into Claude Code.
