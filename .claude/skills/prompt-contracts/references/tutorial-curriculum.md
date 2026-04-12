# Prompt Contracts Tutorial Curriculum

A prompt contract is a structured prompt that specifies what success looks like, what constraints apply, what output format is expected, and what failure modes to avoid — so the AI produces a useful result on the first attempt.

---

## Export Mode (`--export`)

When `--export` is detected, immediately write the file `prompt-contracts-guide.md` to the current working directory. Do not ask any questions. Confirm with: `Guide written to ./prompt-contracts-guide.md`

The file should contain all 4 concepts below formatted as a standalone developer guide with the full contract template and quick reference table.

---

## Interactive Mode

Begin with this exact intro line:
> "I'll walk you through 4 concepts. After each one, type **next** to continue or ask a question."

Present each concept in sequence. Do NOT show all 4 at once. Wait for the user to type "next" before advancing.

---

## Concept 1: The Vibe Prompt Problem

### The Problem

Vague prompts force the AI to make assumptions about scope, technology choices, and expected behavior. When those assumptions are wrong — and they often are — you get code that uses the wrong library, follows the wrong pattern, or solves a slightly different problem than the one you had.

### Bad Example

```
Add a user profile endpoint
```

### Good Example

```
CONTEXT: Spring Boot 3.2 REST API, Java 21, existing UserRepository (JPA) with fields:
id (UUID), email, displayName, avatarUrl, createdAt. Authentication via JWT — the current
user's ID is available as a claim named "sub".

GOAL: Add a GET /api/v1/users/me endpoint that returns the authenticated user's profile.

Success = endpoint returns 200 with JSON body matching UserProfileResponse(UUID id,
String email, String displayName, String avatarUrl, Instant createdAt), returns 401
if JWT is missing or invalid, returns 404 if the user ID from the token does not exist.

CONSTRAINTS:
- Use the existing UserRepository — do not create a new one
- Do not modify the User entity
- No new dependencies

FORMAT:
- UserProfileController.java
- Any required Spring Security configuration as a comment block
```

### Practice

Rewrite this vague prompt as a complete prompt: *"Add a search feature to the app"*

Specify the domain, what "search" means exactly, endpoint shape, and response format.

---

## Concept 2: Writing a GOAL Clause

### The Problem

A GOAL clause is testable when it contains a concrete success condition you can verify without asking the AI. "Build a date picker" is not testable. A testable GOAL names the exact behavior, exact data shape emitted, and interaction requirements.

### Bad Example

```
GOAL: Build a date picker component.
```

### Good Example

```
GOAL: Build a DatePicker component that allows the user to select a date range.

Success conditions:
1. User can click a start date, then click an end date — range is visually highlighted
2. Component calls onChange with { start: Date, end: Date } when range is complete
3. User can navigate months using Previous and Next buttons
4. User can navigate the grid using arrow keys; Enter selects a date
5. If start and end are the same date, onChange is still called with equal values

CONSTRAINTS:
- TypeScript only — no .js files
- Props: interface DatePickerProps { onChange: (range: { start: Date; end: Date }) => void }
- No external dependencies beyond React and Tailwind

FORMAT:
- DatePicker.tsx
- DatePicker.test.tsx (React Testing Library, covering all 5 success conditions)
```

### Practice

Write a GOAL clause with at least 3 success conditions for: *"Add a loading state to the dashboard"*

---

## Concept 3: CONSTRAINTS and FORMAT

### The Problem

Without CONSTRAINTS, the AI picks the most familiar tools — which may not match your stack. Without FORMAT, output structure is unpredictable.

### Bad Example

```
Set up a database
```

### Good Example

```
CONTEXT: Existing Terraform project (AWS provider ~> 5.0). VPC and subnets exist as data sources.

GOAL: Add a PostgreSQL 15 RDS instance (db.t3.micro) accessible only from within the VPC.

CONSTRAINTS:
- Use aws_db_instance, not aws_rds_cluster
- Multi-AZ: false
- Credentials via aws_secretsmanager_secret — no hardcoded passwords
- No public accessibility
- Follow the existing module pattern: create ./modules/rds/

FORMAT:
- modules/rds/variables.tf
- modules/rds/main.tf
- modules/rds/outputs.tf
- environments/staging/main.tf — new module block only
```

### Practice

Add CONSTRAINTS and FORMAT to: *"Add Redis caching to the API"*

---

## Concept 4: FAILURE CONDITIONS

### The Problem

Without failure conditions, the AI produces the nearest technically-valid implementation — which may silently drop data, load everything into memory, use a library you can't deploy, or be incompatible with downstream systems.

### Bad Example

```
GOAL: Write a job that migrates the orders table from PostgreSQL to ClickHouse.
Success = orders data appears in ClickHouse.
```

### Good Example

```
GOAL: Write a batch migration job, 10,000 rows per batch, resumable on interruption.

FAILURE CONDITIONS:
1. Do not use pandas — only psycopg2 and clickhouse-driver
2. Do not load the full table into memory — stream in batches of exactly 10,000
3. Do not silently skip rows — log failures and halt the job
4. Do not hardcode connection strings — use environment variables
5. Do not ignore checkpoint.json — resume from last committed order_id
```

### Practice

Write 3 failure conditions for: *"Build a CSV import feature"*

---

## Live Practice Session

After Concept 4, say:
> "You've seen all 4 concepts. Now let's build a real contract together. What are you working on?"

From this point, run the full `/prompt-contracts new` flow — ask clarifying questions, check for CLAUDE.md, generate a contract, and save it automatically.

When the contract is saved, end with:
> "Tutorial complete. Your contract is saved as `<uuid_short>`. Use `/prompt-contracts show <uuid_short>` to view it anytime."

---

## Mid-Tutorial Rules

- If the user asks a question instead of typing "next": answer fully, then restate where you left off.
- If user types "skip": advance to the next concept without requiring acknowledgement.
