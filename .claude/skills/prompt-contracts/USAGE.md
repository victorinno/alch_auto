# Prompt Contracts - Usage Guide

> Your complete guide to using the Prompt Contracts skill in Claude Code

## Table of Contents

1. [What is Prompt Contracts?](#what-is-prompt-contracts)
2. [When to Use It](#when-to-use-it)
3. [Getting Started](#getting-started)
4. [The Iterative Workflow](#the-iterative-workflow)
5. [Example Sessions](#example-sessions)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Usage](#advanced-usage)

---

## What is Prompt Contracts?

Prompt Contracts transforms how you work with Claude Code by replacing vague "vibe coding" with **structured, enforceable specifications**.

### The Problem with Vibe Coding

**Vibe prompt:**
```
Build me a dashboard
```

**What happens:**
- Claude writes 3,000 lines across 14 files
- Uses Firebase instead of your Supabase stack
- You spend 30% of time undoing/reverting
- 3+ rounds of iteration to get it right
- Code you don't fully understand

### The Prompt Contracts Solution

**Structured contract:**
```
GOAL: Display user's active projects with real-time updates.
      Success = page loads under 1s, shows list, allows filtering.

CONSTRAINTS: Supabase for data, Clerk for auth, Tailwind only.
             No more than 3 database queries per page.

FORMAT: app/dashboard/page.tsx (server component)
        components/ProjectList.tsx (client, max 150 lines)
        lib/queries/projects.ts (Supabase queries)

FAILURE CONDITIONS:
- Uses useState for server data
- Missing loading/error states
- No TypeScript types
```

**What happens:**
- Claude builds exactly what you specified
- First-try success, no surprises
- Code follows your stack and patterns
- Shippable quality

---

## When to Use It

### ✅ Use Prompt Contracts For:

- **New features** - Building something from scratch
- **Complex changes** - Multi-file changes with dependencies
- **Integrations** - Adding third-party services (Stripe, Twilio, etc.)
- **Refactoring** - Restructuring existing code
- **Critical paths** - Features that must work correctly first time
- **Team consistency** - Ensuring all code follows same patterns

### ❌ Don't Use For:

- **Tiny fixes** - "Change button color to blue"
- **Typo corrections** - "Fix spelling in error message"
- **Quick investigations** - "How does auth work in this codebase?"
- **Exploratory questions** - "What are good options for state management?"

**Rule of thumb:** If it takes longer to write the contract than do the task, skip the contract.

---

## Getting Started

### Step 1: First-Time Setup (One Time Only)

Create your project's `CLAUDE.md` file - the permanent constraint layer that all contracts inherit from.

**Option A: Use the skill to create it**
```
@prompt-contracts help me create CLAUDE.md for my project.

My stack:
- Next.js 14 App Router
- Supabase (database + auth)
- Tailwind CSS
- TypeScript strict mode
```

**Option B: Use the template**
1. Copy [.claude/skills/prompt-contracts/templates/CLAUDE.md.template](templates/CLAUDE.md.template)
2. Save it as `CLAUDE.md` in your project root
3. Fill in your stack, rules, and patterns

**What goes in CLAUDE.md:**
- ✅ Stack decisions (frameworks, libraries, services)
- ✅ Hard rules (what's never allowed)
- ✅ Code organization patterns
- ✅ Global failure conditions
- ❌ Feature-specific requirements (those go in individual contracts)

### Step 2: Session Handshake (Every Session)

At the start of each Claude Code session, do the constraint handshake:

```
Read CLAUDE.md and confirm you understand the project constraints before doing anything.
```

**Why this matters:**
- Claude echoes back your constraints
- You both agree on reality before work begins
- Prevents stack violations and pattern drift

### Step 3: Start Your First Contract

Choose your workflow style:

**Guided (for beginners):**
```
@prompt-contracts build a user profile page, guide me step-by-step
```
→ Claude walks you through each component

**All-at-once (for experienced users):**
```
@prompt-contracts draft complete contract for email notifications, I'll review all at once
```
→ Claude presents full contract for your review

**Quick (for simple tasks):**
```
@prompt-contracts quick contract: add loading spinner to form submit
```
→ Minimal contract, fast iteration

---

## The Iterative Workflow

The skill uses a **5-phase iterative process**. You collaborate with Claude until the contract is perfect, then Claude executes it.

### Phase 1: Setup & Context *(First Time Only)*

**1.1 Check for CLAUDE.md**
- If missing → Claude drafts one based on your stack
- You iterate together until accurate
- You approve and Claude saves it

**1.2 Constraint Handshake**
- Claude reads CLAUDE.md
- Claude echoes back key constraints
- You confirm Claude understands your project

### Phase 2: Contract Drafting *(Iterative)*

**2.1 Understand the Request**
```
You: "I need user authentication"

Claude: "Let me clarify - do you want:
- Social login only (Google, GitHub)?
- Email/password?
- Magic link?
- Multi-factor auth?

And should this integrate with your existing Supabase setup?"
```

**2.2 Draft GOAL**
```
Claude: "Here's my understanding:

GOAL: Implement email/password authentication using Supabase Auth.
Success = new user can sign up at /signup, receive confirmation email,
click link, log in at /login, and see protected /dashboard within 30s.

Is this the right direction, or should I adjust?"

You: "Yes, but also add 'forgot password' flow"

Claude: "Updated GOAL:

GOAL: Implement email/password auth with Supabase Auth including
signup, login, email confirmation, and password reset flows.
Success = user can complete full signup→verify→login→reset cycle.

Better?"

You: "Perfect, move on"
```

**2.3 Draft CONSTRAINTS**
```
Claude: "Based on CLAUDE.md, I see you use Supabase + Next.js + Clerk.
Wait - you mentioned Supabase Auth but CLAUDE.md says Clerk.
Which should I use?"

You: "Good catch. Use Clerk, not Supabase Auth"

Claude: "Got it. CONSTRAINTS:

- Clerk for authentication (sign-up, sign-in, session management)
- No custom auth (never roll our own)
- Use Clerk components (@clerk/nextjs)
- Middleware protection for /dashboard routes
- Environment variables for Clerk keys

Any additional constraints for this feature?"

You: "Yes - sign-up should require email verification before dashboard access"

Claude: "Added. Moving to FORMAT..."
```

**2.4 Draft FORMAT**
```
Claude: "FORMAT:

1. app/(auth)/sign-up/[[...sign-up]]/page.tsx - Clerk sign-up page
2. app/(auth)/sign-in/[[...sign-in]]/page.tsx - Clerk sign-in page
3. middleware.ts - Route protection
4. app/dashboard/layout.tsx - Protected layout wrapper

Does this match your codebase structure?"

You: "We use /auth/signup not /(auth)/sign-up"

Claude: "Updated:

1. app/auth/signup/page.tsx - Clerk sign-up page
2. app/auth/signin/page.tsx - Clerk sign-in page
3. middleware.ts - Route protection
4. app/dashboard/layout.tsx - Protected layout wrapper

Better?"

You: "Yes, continue"
```

**2.5 Draft FAILURE CONDITIONS**
```
Claude: "FAILURE CONDITIONS:

- Stores Clerk secret key client-side
- Missing email verification requirement
- No redirect after successful auth
- Doesn't protect /dashboard routes
- Missing error states for failed auth

What critical failure modes am I missing?"

You: "Add: No loading states during auth operations"

Claude: "Added. Contract is complete. Ready for Phase 3 review..."
```

### Phase 3: Review & Refinement

**3.1 Present Complete Contract**
```
Claude: "Here's the complete contract:

═══════════════════════════════════════════════════════

CONTRACT FOR: User Authentication with Clerk

GOAL: Implement email/password authentication using Clerk including
signup, login, email verification, and password reset flows.
Success = user can complete signup→verify→login cycle, access
/dashboard only when verified, see appropriate loading/error states.

CONSTRAINTS:
- Clerk for authentication (@clerk/nextjs components)
- No custom auth implementation
- Middleware protection for /dashboard routes
- Email verification required before dashboard access
- Environment variables for Clerk publishable/secret keys

FORMAT:
1. app/auth/signup/page.tsx - Clerk SignUp component
2. app/auth/signin/page.tsx - Clerk SignIn component
3. middleware.ts - Route protection with Clerk
4. app/dashboard/layout.tsx - Protected layout wrapper
5. .env.local.example - Clerk env var template

FAILURE CONDITIONS:
- Stores Clerk secret key client-side
- Missing email verification requirement
- No redirect after successful auth
- Doesn't protect /dashboard routes
- Missing error states for failed auth
- No loading states during auth operations

═══════════════════════════════════════════════════════

Does this contract fully specify what you want?"
```

**3.2 Confirmation Gate**
```
You have 3 options:

Option 1: "YES" → Claude proceeds to execution
Option 2: "NO, the GOAL needs adjustment" → Return to Phase 2.2
Option 3: "Almost - just tweak the FORMAT" → Iterate on that component
```

### Phase 4: Execution

**4.1 Build According to Contract**
```
Claude: "Contract approved. Building now..."

[Claude writes code following every specification]
[No surprises, no creative interpretation]
[Sticks to the contract like law]
```

**4.2 Verify Against Contract**
```
Claude internally checks:
- ✅ Success criteria from GOAL met?
- ✅ All FAILURE CONDITIONS avoided?
- ✅ FORMAT matches specification?
```

**4.3 Deliver & Iterate**
```
If output violates contract → Claude fixes it
If contract was wrong → Refine contract and rebuild
If everything matches → Deliver to you
```

### Phase 5: Learn & Improve *(Optional)*

**5.1 Post-Mortem**
```
Claude: "The contract worked well. For future contracts, should we add
'Email verification required' as a global constraint in CLAUDE.md
since we always want this?"

You: "Yes, add it"

Claude: [Updates CLAUDE.md]

Result: Next auth contract will be even faster
```

---

## Example Sessions

### Example 1: New Feature (Guided Workflow)

```
═══════════════════════════════════════════════════════
SESSION: Building User Profile Avatar Upload
═══════════════════════════════════════════════════════

You:
@prompt-contracts build avatar upload feature, guide me step-by-step

Claude:
Great! Let's build your avatar upload feature together.

First, let me understand the requirements:

1. Where should users upload avatars? (profile page, settings, nav dropdown?)
2. Max file size you want to allow?
3. Image formats allowed?
4. Where to store uploads? (I see Supabase in your CLAUDE.md)
5. Should we resize/compress images?

You:
1. Profile page
2. 5MB max
3. JPG, PNG, WebP
4. Yes, Supabase Storage
5. Yes, compress to 1024x1024

Claude:
Perfect. Let me draft the GOAL:

─────────────────────────────────────────────────────
GOAL (Draft 1):

User clicks avatar placeholder on /profile page, file picker opens
(images only), user selects image, upload happens with progress bar,
avatar updates immediately on success.

Success = user with no avatar clicks placeholder, selects 2MB JPEG,
sees upload progress, avatar appears within 3 seconds, refresh shows
same avatar.
─────────────────────────────────────────────────────

Is this the right direction?

You:
Yes, but also handle when upload fails

Claude:
Updated GOAL:

─────────────────────────────────────────────────────
GOAL (Draft 2):

User clicks avatar placeholder on /profile page, file picker opens
(images only), user selects image, upload happens with progress bar,
avatar updates immediately on success, error toast shown on failure.

Success = user with no avatar clicks placeholder, selects 2MB JPEG,
sees upload progress, avatar appears within 3s, refresh shows same
avatar. If upload fails, user sees clear error message.
─────────────────────────────────────────────────────

Better?

You:
Perfect

Claude:
Great! Now for CONSTRAINTS based on your CLAUDE.md...

[Continues through CONSTRAINTS, FORMAT, FAILURE CONDITIONS]
[Each component iterated until approved]
[Finally presents complete contract]
[You approve]
[Claude builds it]

Claude:
✅ Complete! Created 4 files:
- components/profile/AvatarUpload.tsx (85 lines)
- app/api/upload-avatar/route.ts (62 lines)
- lib/storage/avatars.ts (41 lines)
- lib/storage/validation.ts (28 lines)

All tested against the contract success criteria. Ready to ship!
```

### Example 2: Quick Task (Minimal Contract)

```
═══════════════════════════════════════════════════════
SESSION: Quick Fix
═══════════════════════════════════════════════════════

You:
@prompt-contracts quick contract: add loading spinner to form submit button

Claude:
Quick contract drafted:

─────────────────────────────────────────────────────
GOAL: Form submit button shows spinner during async submit,
      disables to prevent double-submit.

CONSTRAINTS: Use existing LoadingSpinner component, Tailwind only.

FORMAT: Update components/ContactForm.tsx (add loading state + spinner)

FAILURE: Button stays enabled during submit, no visual feedback.
─────────────────────────────────────────────────────

Approve?

You:
Yes

Claude:
[Implements immediately]

✅ Done! Added loading state and spinner to ContactForm.tsx (3 lines changed).
```

### Example 3: Complex Refactor (All-at-Once Review)

```
═══════════════════════════════════════════════════════
SESSION: Complex Refactoring
═══════════════════════════════════════════════════════

You:
@prompt-contracts draft complete contract for migrating auth from NextAuth to Clerk, I'll review all at once

Claude:
Complete contract drafted:

═══════════════════════════════════════════════════════

CONTRACT FOR: Auth Migration (NextAuth → Clerk)

GOAL:
Replace NextAuth with Clerk while preserving existing user sessions.
Success = all current users can sign in with existing credentials,
no data loss, all protected routes still work, migration completes
without downtime.

CONSTRAINTS:
- Clerk for new auth system
- Preserve existing user IDs in database
- No breaking changes to user-facing flows
- Migration script for existing users
- Rollback plan in case of issues

FORMAT:
[... full contract with 15+ files ...]

FAILURE CONDITIONS:
- Loses existing user data
- Breaks user sessions mid-migration
- No rollback mechanism
- Missing migration logs
- Protected routes become accessible
- User IDs change (breaks foreign keys)

═══════════════════════════════════════════════════════

Does this fully specify the migration?

You:
Almost - add constraint: must keep Google OAuth provider IDs intact

Claude:
Updated CONSTRAINTS to include:
"Preserve Google OAuth provider IDs from NextAuth accounts table"

Ready now?

You:
Yes, proceed

Claude:
[Executes migration following contract]
```

---

## Best Practices

### DO:

✅ **Start every session with the handshake**
```
Read CLAUDE.md and confirm you understand the project constraints
```

✅ **Challenge vague language**
```
Claude: "Build it fast"
You: "What does 'fast' mean? Page load under 1s? Or query under 100ms?"
```

✅ **Add failure conditions Claude might miss**
```
Claude: "FAILURE: Missing TypeScript types"
You: "Also add: Doesn't handle image upload errors gracefully"
```

✅ **Iterate until GOAL is testable in <1 minute**
```
Bad: "Users can manage their account"
Good: "User clicks Profile → Edit → Changes email → Saves → Sees success → Email updated in DB"
```

✅ **Update CLAUDE.md when patterns emerge**
```
After 3rd contract all requiring "email validation":
→ Add to CLAUDE.md global rules
→ Future contracts inherit it automatically
```

✅ **Use workflow shortcuts when appropriate**
```
First contract: Guide me step-by-step
Fifth contract: Draft complete, I'll review all at once
```

### DON'T:

❌ **Don't skip the GOAL**
Everything else is meaningless without knowing what "done" looks like

❌ **Don't accept vague constraints**
```
Bad: "Use best practices"
Good: "Max 150 lines per file, Zod validation on all inputs, error boundaries on routes"
```

❌ **Don't approve incomplete FORMAT**
```
Bad: "Create some components"
Good: "components/auth/LoginForm.tsx, app/api/auth/login/route.ts, lib/auth/validation.ts"
```

❌ **Don't start coding before contract approval**
Once you say "YES" to the contract, Claude executes immediately

❌ **Don't rewrite CLAUDE.md constraints every time**
That's what the global file is for - write once, inherit everywhere

❌ **Don't use contracts for trivial tasks**
"Change button color" doesn't need a 4-component contract

---

## Troubleshooting

### Problem: Claude Violates the Contract

**Symptom:** Output doesn't match the approved contract

**Solution:**
```
You: "This violates the contract. The FORMAT specifies max 150 lines per file,
     but ProjectList.tsx is 200 lines. Please fix."

Claude: [Refactors to meet contract]
```

### Problem: Output Matches Contract But Is Wrong

**Symptom:** Contract was approved, code matches it, but it's not what you wanted

**Solution:** The contract was incorrect, not the execution
```
You: "The code matches the contract, but I realize the GOAL was wrong.
     Let's iterate on the contract and rebuild.

     New GOAL: [corrected version]"

Claude: [Updates contract, rebuilds]
```

### Problem: Too Many Iterations

**Symptom:** 10+ rounds of iteration to get contract right

**Solution:** Add common patterns to CLAUDE.md
```
Before (every contract):
"Use Zod validation"
"Max 150 lines per file"
"Tailwind only"

After (add to CLAUDE.md):
Now every contract inherits these automatically
```

### Problem: Contract Feels Too Rigid

**Symptom:** "I feel constrained, can't explore creative solutions"

**Solution:** Rigidity is the point!
- Contracts prevent surprises, which prevents wasted time
- If you want exploration, don't use a contract
- Use contracts when you know what you want and want it done right

### Problem: Don't Know My Stack Well Enough

**Symptom:** "I'm not sure what constraints to specify"

**Solution:** Start with minimal CLAUDE.md, grow it over time
```
First contract: Just list frameworks
Second contract: Add patterns you want repeated
Third contract: Add failure conditions you discovered
By tenth contract: CLAUDE.md is comprehensive
```

### Problem: Session Lost Context

**Symptom:** Claude forgets CLAUDE.md constraints mid-conversation

**Solution:** Remind Claude
```
You: "Read CLAUDE.md again and confirm the constraints"

Claude: [Re-reads, echoes back constraints]
```

---

## Advanced Usage

### Multi-Contract Projects

For large projects, chain contracts:

```
Contract 1: Database schema
→ Approve → Execute

Contract 2: API layer (uses Contract 1's schema)
→ Approve → Execute

Contract 3: Frontend (uses Contract 2's API)
→ Approve → Execute
```

### Multi-Agent Workflows

If using Claude Code's agent teams:

```
@prompt-contracts draft contract for payment integration

[Get approved contract]

Now spawn 3 agents in parallel:
- Agent 1: Stripe backend (follows contract FORMAT 1-3)
- Agent 2: Payment UI (follows contract FORMAT 4-5)
- Agent 3: Webhook handler (follows contract FORMAT 6)

All agents use the SAME contract → consistent output
```

### Security Review Integration

After building from contract:

```
Contract approved and executed ✅

Now run:
@security-review

[Claude scans for:]
- SQL injection
- XSS vulnerabilities
- Auth bypasses
- Hardcoded secrets
- Insecure patterns

Contracts build it right.
Security review ensures it's safe.
```

### Contract Templates Library

Build a personal library of contracts:

```
contracts/
├── auth-email-password.md     # Standard auth contract
├── crud-resource.md            # Generic CRUD contract
├── file-upload.md              # File upload contract
├── api-integration.md          # Third-party API contract

When building similar feature:
1. Copy relevant template
2. Customize for specific feature
3. Much faster than starting from scratch
```

### Measuring Improvement

Track your contracts over time:

```
Metric                  Contract 1    Contract 5    Contract 10
─────────────────────────────────────────────────────────────
Iterations to approve   8             3             1
Violations after build  3             1             0
Time to write contract  5 min         2 min         1 min
Time saved debugging    60 min        45 min        30 min
```

### CLAUDE.md Evolution

Your CLAUDE.md should grow:

**Week 1:**
```markdown
Stack: Next.js, Supabase, Tailwind
```

**Week 4:**
```markdown
Stack: Next.js, Supabase, Tailwind
Rules:
- Max 150 lines per file
- TypeScript strict mode
- Zod validation required
```

**Week 12:**
```markdown
[Comprehensive 200-line CLAUDE.md]
- Detailed stack decisions
- 20+ hard rules
- Project-specific patterns
- Security requirements
- Performance standards
```

Result: Contracts get **faster** to write, **fewer** iterations needed

---

## Quick Reference Card

### Contract Checklist

Before approving a contract, verify:

- [ ] **GOAL is testable in <1 minute**
  - Can you verify success without guessing?
  - Are success metrics concrete and observable?

- [ ] **CONSTRAINTS cover critical boundaries**
  - Stack requirements clear?
  - Forbidden actions specified?
  - Required patterns listed?

- [ ] **FORMAT matches your codebase**
  - File paths are correct?
  - File structure follows your conventions?
  - Size limits specified?

- [ ] **FAILURE CONDITIONS cover your concerns**
  - Deal-breakers listed?
  - Security issues prevented?
  - Quality gates defined?

### Common Contract Patterns

**Read-only display:**
```
GOAL: Display [data] with [filters]
CONSTRAINTS: [Your backend], read-only (no mutations)
FORMAT: Server component + presentation component
FAILURE: Fetches client-side, missing loading states
```

**Create/Edit form:**
```
GOAL: User can create/edit [resource], see validation, save
CONSTRAINTS: [Your backend], Zod validation, optimistic updates
FORMAT: Form component, API route, schema file
FAILURE: No client validation, no error handling
```

**Third-party integration:**
```
GOAL: Integrate [Service] to do [Action]
CONSTRAINTS: Use official SDK, keys in env vars, webhook for events
FORMAT: API routes, webhook handler, utility functions
FAILURE: Hardcoded secrets, missing webhook verification
```

### Iteration Speed Guide

**Too slow (>6 iterations for simple feature):**
- GOAL is too vague → add concrete success metrics
- CONSTRAINTS missing from CLAUDE.md → add global constraints
- FORMAT doesn't match codebase → update examples in CLAUDE.md

**Just right (2-3 iterations):**
- GOAL is specific but needs minor tweaks
- CONSTRAINTS mostly from CLAUDE.md
- FORMAT follows established patterns

**Very fast (1 iteration or instant approval):**
- GOAL is immediately testable
- CONSTRAINTS all in CLAUDE.md
- FORMAT is standard pattern
- You and Claude are in sync

---

## Next Steps

### 1. Create Your CLAUDE.md (If You Haven't)

```
@prompt-contracts help me create CLAUDE.md

My stack is:
[List your frameworks, libraries, tools]
```

### 2. Try a Simple Contract

Pick something small to learn the workflow:

```
@prompt-contracts quick contract: add loading state to my existing form
```

### 3. Build Something Real

Use guided workflow for your first real feature:

```
@prompt-contracts build [your feature], guide me step-by-step
```

### 4. Review and Iterate

After your first contract:
- What worked well?
- What should be added to CLAUDE.md?
- What failure conditions did you miss?

### 5. Level Up

After 5+ contracts:
- Switch to all-at-once workflow (faster)
- Build your template library
- Measure your improvement
- Refine your CLAUDE.md

---

## Philosophy: From Gambling to Shipping

**The Old Way (Vibe Coding):**
```
"Build me a dashboard"
→ Hope for the best
→ Get something that compiles
→ Spend hours debugging
→ Maybe ships
```

**The Prompt Contracts Way:**
```
60 seconds: Write contract (GOAL, CONSTRAINTS, FORMAT, FAILURE)
5 seconds: Approve
2 minutes: Claude builds
0 minutes: Debugging (it matches the contract)
→ Ships immediately
```

**The difference:**
- From hoping → knowing
- From guessing → specifying
- From fixing → preventing
- From gambling → shipping

---

## Resources

- **Main skill:** [skill.md](skill.md)
- **Templates:** [templates/](templates/)
- **Examples:** [examples/](examples/)
- **README:** [README.md](README.md)

---

## Support

**Something unclear?**
```
@prompt-contracts explain [concept]
```

**Want to see an example?**
```
@prompt-contracts show me an example contract for [use case]
```

**Contract not working?**
```
@prompt-contracts help me debug this contract: [paste contract]
```

---

**Ready to stop gambling and start shipping?**

```
@prompt-contracts
```

Let's build your first contract together.
