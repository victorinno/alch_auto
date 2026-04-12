# Prompt Contracts Framework Reference

## The Four Components

### 1. GOAL
The exact success metric. What does "done" look like? Must be testable and verifiable in under a minute.

**Bad (vibe):** "Add a subscription system to the app"
**Good (contract):**
```
GOAL: Implement Stripe subscription management where users can subscribe to 3 tiers
(free/pro/team), upgrade/downgrade instantly, and see billing status on /settings/billing.
Success = a free user can subscribe to Pro, see the charge on Stripe dashboard,
and access gated features within 5 seconds.
```

Key questions to nail the GOAL:
- What's the observable end state?
- How do you verify it worked in < 60 seconds?
- What user action proves success?

---

### 2. CONSTRAINTS
Hard boundaries that cannot be crossed. Maps directly to CLAUDE.md permanent constraints.

**Categories:**
- **Stack**: Libraries, frameworks, databases — the non-negotiables
- **Patterns**: How things must be structured (server vs client, mutations vs actions)
- **Rules**: No new dependencies without asking, no schema changes without migration plan
- **Scope**: What's explicitly out of scope for this task

**Bad (vibe):** "Use our existing stack"
**Good (contract):**
```
CONSTRAINTS: Convex useQuery for data, no polling, no SWR.
Clerk useUser() for auth check. Redirect to /sign-in if unauthenticated.
Max 150 lines per component file.
```

---

### 3. FORMAT
The exact output structure expected. Files, function signatures, return types, patterns.

**Bad (vibe):** "Create an API endpoint for user onboarding"
**Good (contract):**
```
FORMAT:
1. Convex function in convex/users.ts (mutation, not action)
2. Zod schema for input validation in convex/schemas/onboarding.ts
3. TypeScript types exported from convex/types/user.ts
4. Include JSDoc on the public function
5. Return { success: boolean, userId: string, error?: string }
```

---

### 4. FAILURE CONDITIONS
What makes the output unacceptable. The negative target — guardrails that bound the solution space.

**Bad (vibe):** "Make sure it's good quality"
**Good (contract):**
```
FAILURE CONDITIONS:
- Uses useState for data that should be in Convex
- Any component exceeds 150 lines
- Fetches data client-side when it could be server-side
- Uses any UI library besides Tailwind utility classes
- Missing loading and error states
- Missing TypeScript types on any function parameter
```

---

## The CLAUDE.md Constraint Layer

CLAUDE.md is the permanent CONSTRAINTS layer — active across all sessions. Structure:

```markdown
# CLAUDE.md — Project Constraints (always active)

## Stack (non-negotiable)
- [list your stack]

## Hard Rules
- [list your rules]

## Patterns
- [list your patterns]
```

**Session handshake ritual:**
> Read CLAUDE.md and confirm you understand the project constraints before doing anything.

This forces Claude to echo back the constraints, establishing shared reality before work begins.

---

## Full Contract Template

```
[Brief task description]

GOAL: [Exact success metric. Testable in < 60 seconds.]
Success = [specific observable outcome]

CONSTRAINTS: [Hard boundaries — stack, libraries, patterns]
[Constraint 1]
[Constraint 2]

FORMAT:
[Numbered list of exact output structure]
1. [File/function/structure]
2. [File/function/structure]

FAILURE CONDITIONS:
- [What makes the output unacceptable — 4–8 items]
- [Specific antipatterns to avoid]
- [Missing states/types/validations]
```

---

## Clarifying Questions by Domain

### For backend/API work:
- What data store? Which ORM/query layer?
- Sync or async? REST, GraphQL, or RPC?
- Auth pattern? Who can call this?
- What does the caller expect back?

### For frontend/UI work:
- Server component or client component?
- What state management is in use?
- Which styling system?
- What loading/error states are needed?
- What's the navigation pattern on success/failure?

### For data/jobs:
- One-time or recurring?
- Idempotent requirement?
- Failure/retry behavior?
- What's the output — DB write, event, file?

### For system design:
- Scale/volume expectations?
- Existing patterns to follow?
- Integration points with other systems?
- What can be deferred to later?

---

## Decomposition Guide (Auto-Sequence)

Use this guide when complexity signals trigger auto-decomposition.

### Standard Dependency Order by Architecture

**Web feature (full-stack):**
```
Step 1: DB schema + migration
Step 2: Domain model / service layer
Step 3: API endpoints / mutations
Step 4: UI components / pages
Step 5: Integration tests
```

**Event-driven / async system:**
```
Step 1: Schema + data model
Step 2: Producer (event emitter / publisher)
Step 3: Consumer / handler logic
Step 4: Dead-letter / retry / monitoring
Step 5: End-to-end test
```

**Infrastructure + app:**
```
Step 1: Infrastructure (IaC, env config, secrets)
Step 2: Service scaffolding + health check
Step 3: Core business logic
Step 4: Observability (logging, metrics, alerts)
Step 5: Deployment pipeline / smoke test
```

**Auth system:**
```
Step 1: User model + credential storage
Step 2: Authentication flow (login/logout/token)
Step 3: Authorization layer (roles/permissions)
Step 4: Protected route enforcement
Step 5: Session management + expiry
```

### Seam Rules (what makes a good cut point)

A good seam has:
- A **stable interface**: the next step depends on a named function, endpoint, table, or event — not on implementation details
- **Independent testability**: the step can be verified without running the next step
- **Single ownership**: one team/PR/file group — not spread across multiple domains

A bad seam has:
- Cuts through a transaction boundary
- Leaves an artifact in an invalid state (migration without model, model without service)
- Requires the next step to know internal implementation of the current step

### Linking Language (use in CONSTRAINTS)

Each contract must contain one of these dependency anchors:
- `"Assumes Step N output: <artifact name and shape>"`
- `"Builds on top of: <function/table/endpoint> produced in Step N"`
- `"Do not reimplement: use <artifact> from Step N directly"`

### SIZE heuristic per step

Each step contract should resolve to roughly:
- 1–3 files changed
- ≤ 200 LOC added/modified
- Completable and reviewable in a single PR
- Testable in isolation before the next step starts

If a step exceeds this, split it further.
