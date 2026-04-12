# Superpowers Integration Reference

How to run `/prompt-contracts superpowers` — a mode that fuses Superpowers' phase-gated workflow with prompt-contracts' 4-clause precision.

---

## Step 0 — Installation Check (run this first, every time)

Before starting Phase 1, verify Superpowers is installed:

```bash
python3 -c "
import json, pathlib, sys
f = pathlib.Path.home() / '.claude/plugins/installed_plugins.json'
if not f.exists():
    print('NOT_INSTALLED')
    sys.exit(0)
data = json.loads(f.read_text())
plugins = data.get('plugins', {})
if 'superpowers@claude-plugins-official' in plugins:
    print('INSTALLED')
else:
    print('NOT_INSTALLED')
"
```

**If output is `INSTALLED`:** proceed to Phase 1.

**If output is `NOT_INSTALLED`:** stop and show this message to the user:

```
Superpowers is not installed.

To install it, run this command in Claude Code:
  /install superpowers@claude-plugins-official

After installation, restart Claude Code and run /prompt-contracts superpowers again.

Why install it?
Superpowers adds brainstorming, subagent-driven development, TDD, and
systematic debugging skills that this mode orchestrates. Without it,
the plan and execute phases have no structured execution engine.
```

Do not proceed with the workflow until the user confirms Superpowers is installed.

---

## Phase → Clause Mapping

| Superpowers Phase | Prompt-Contracts Output         | Gate (before proceeding)          |
|-------------------|---------------------------------|-----------------------------------|
| **brainstorm**    | GOAL clause (draft)             | User approves the success metric  |
| **spec**          | Full contract (all 4 clauses)   | User signs off on the contract    |
| **plan**          | Task list referencing contract  | User confirms step breakdown      |
| **execute**       | Per-task review against FAILURE CONDITIONS | Each task passes clause check |

---

## Per-Phase Interaction Protocol

### Phase 1 — Brainstorm

**Purpose:** Surface assumptions, explore alternatives, lock the success metric.

**What to ask (one at a time):**
1. "What are you building, and what does success look like when it's done?"
2. "How would you verify it worked in under 60 seconds?"
3. "What's the biggest thing that could go wrong?"

**What to produce:** A draft GOAL clause only. No constraints, no format yet.

```
GOAL (draft): [exact observable outcome]
Success = [specific verification step]
Open questions: [anything still unresolved]
```

**Gate:** Show the draft GOAL and ask: "Does this capture what success looks like? Adjust before we move to spec."
Do not proceed to Phase 2 until the user explicitly approves.

---

### Phase 2 — Spec

**Purpose:** Harden the GOAL and fill the remaining 3 clauses.

**What to do:**
1. Read CLAUDE.md if present — pull CONSTRAINTS from it automatically.
2. Ask: "What must never happen? Any libraries, patterns, or scope to exclude?"
3. Ask: "What does the output look like — files, functions, return types?"
4. Push for at least 4 FAILURE CONDITIONS: "What would make this output wrong even if it compiled?"

**What to produce:** Full 4-clause contract.

**Gate:** Show the full contract and ask: "Sign off on this before I break it into tasks?"
Save the contract with `contracts_db.py save` before proceeding.

---

### Phase 3 — Plan

**Purpose:** Break the contract into bite-sized, independently executable tasks.

**Rules:**
- Each task: 2–5 minutes of work maximum
- Each task must reference at least one contract clause
- Tasks ordered by dependency (infra → schema → service → API → UI → tests)
- Each task includes: file path, what to write, how to verify

**What to produce:** Numbered task list.

```
Plan: [feature title]
Contract: [uuid from Phase 2]

Task 1 — [Layer: what to do]
  Clause: CONSTRAINTS §[relevant constraint]
  File: [exact path]
  Write: [what goes in it]
  Verify: [how to confirm it worked]

Task 2 — ...
```

**Gate:** Show the full task list and ask: "Does this breakdown look right? Any tasks to add, reorder, or remove?"
Do not start executing until confirmed.

---

### Phase 4 — Execute

**Purpose:** Run each task against the contract. FAILURE CONDITIONS become the review checklist.

**Per-task flow:**
1. State which task is running: "Executing Task N: [description]"
2. Implement the task.
3. Run the two-stage review:
   - **Stage 1 (spec compliance):** Does the output satisfy GOAL + CONSTRAINTS?
   - **Stage 2 (quality check):** Does the output violate any FAILURE CONDITION?
4. Report: "Task N complete. Passed: [clauses checked]. No failures triggered."
5. Ask before moving to next task: "Ready for Task N+1?"

**Hard stop:** If any FAILURE CONDITION is triggered, stop and report:
```
FAILURE: [condition name]
What happened: [description]
Fix before continuing: [action needed]
```

---

## Handoff Artifacts

Each phase produces an artifact the next phase depends on:

```
Phase 1 → Phase 2:  approved GOAL clause (plain text)
Phase 2 → Phase 3:  saved contract UUID + full contract text
Phase 3 → Phase 4:  numbered task list with clause references
Phase 4 → done:     task completion report with clause coverage summary
```

Always show the handoff artifact explicitly at phase transition.

---

## Worked Example

**User input:** "Add a Kafka consumer that enriches user events with currency rates"

**Phase 1 — Brainstorm output:**
```
GOAL (draft): Consume from user.processed, join with latest currency rate,
emit enriched event to user.enriched.
Success = publish a test event to user.processed, verify user.enriched
receives it within 200ms with a non-null currency_rate field.
Open questions: What happens if no rate exists for the user's currency?
```
→ Gate: user approves, answers open question: "use last known rate, never drop"

**Phase 2 — Spec output:**
```
GOAL: Consume from user.processed, enrich with latest currency rate from
CurrencyConversionRateCurrent table, emit to user.enriched within 200ms p99.
Success = test event in → enriched event out with currency_rate populated
within 200ms; no events dropped if rate is temporarily missing.

CONSTRAINTS:
- Spring Kafka @KafkaListener + KafkaTemplate (no Kafka Streams)
- Virtual threads for I/O — no synchronized blocks
- No direct DB calls — use CurrencyRateService
- Rate missing → use last known rate; log warning; never drop event

FORMAT:
1. UserEnrichmentConsumer.java — @KafkaListener on user.processed
2. UserEnrichedEvent.java — record with all UserEvent fields + currency_rate
3. CurrencyRateService.java — getLatestRate(currency): Optional<BigDecimal>
4. UserEnrichmentConsumerTest.java — unit + integration tests

FAILURE CONDITIONS:
- Drops events silently when rate is missing
- Uses synchronized block on virtual thread
- Hardcodes topic name instead of reading from config
- Calls DB directly instead of using CurrencyRateService
- No metric for enrichment lag (Micrometer timer missing)
```

**Phase 3 — Plan output:**
```
Plan: Kafka user event enrichment
Contract: b856a2a5

Task 1 — Service: CurrencyRateService stub
  Clause: FORMAT §3, CONSTRAINTS §no-direct-DB
  File: src/.../service/CurrencyRateService.java
  Write: interface + in-memory impl returning Optional.empty()
  Verify: compiles, unit test green

Task 2 — Model: UserEnrichedEvent record
  Clause: FORMAT §2
  File: src/.../event/UserEnrichedEvent.java
  Write: record with all UserEvent fields + currency_rate field
  Verify: Jackson serialization test passes

Task 3 — Consumer: UserEnrichmentConsumer
  Clause: FORMAT §1, CONSTRAINTS §virtual-threads, §rate-missing
  File: src/.../consumer/UserEnrichmentConsumer.java
  Write: @KafkaListener, calls CurrencyRateService, emits to user.enriched
  Verify: integration test — message in → message out within 200ms

Task 4 — Tests: full coverage
  Clause: FORMAT §4, FAILURE CONDITIONS §drops-events, §synchronized
  File: src/.../UserEnrichmentConsumerTest.java
  Write: missing-rate scenario, happy path, lag metric assertion
  Verify: all tests green, coverage ≥80%
```
