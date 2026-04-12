# Prompt Contracts Skill

> Transform vibe coding into structured, shippable software with the Prompt Contracts framework.

## What This Skill Does

This skill implements the **Prompt Contracts** methodology for Claude Code - a structured approach that replaces vague prompts with enforceable specifications. Instead of "gambling" with natural language prompts, you'll create contracts with clear goals, constraints, formats, and failure conditions.

**Key Benefits:**
- Reduce undo/revert rate from 1-in-3 to 1-in-10
- Cut prompt-to-usable-code cycles from 3 rounds to 1-2 rounds
- Eliminate stack violations (wrong libraries, wrong patterns)
- Ship code you understand and can maintain

## The Four Components of a Prompt Contract

### 1. GOAL — Define What "Done" Looks Like

**Before (vibe):**
```
Add a subscription system to the app
```

**After (contract):**
```
GOAL: Implement Stripe subscription management where users can
subscribe to 3 tiers (free/pro/team), upgrade/downgrade instantly,
and see billing status on /settings/billing.
Success = a free user can subscribe to Pro,
see the charge on Stripe dashboard, and access
gated features within 5 seconds.
```

**Rules:**
- Make it **testable** - you should verify in under 1 minute
- Define **exact success metrics**
- No ambiguity - avoid "it kind of works"

### 2. CONSTRAINTS — The Walls That Save You

**Always include:**
- Stack requirements (frameworks, libraries, tools)
- Hard boundaries that cannot be crossed
- Forbidden actions

**Pro Tip:** Maintain a `CLAUDE.md` file at your project root. Every session starts with:
```
Read CLAUDE.md and confirm you understand the project constraints
before doing anything.
```

This forces a "handshake" - Claude echoes back constraints, you agree on reality, then work begins.

### 3. FORMAT — Specify the Exact Structure

**Before:**
```
Create an API endpoint for user onboarding
```
*Results in: 800-line god-function with inline validation, no types*

**After:**
```
FORMAT:
1. Convex function in convex/users.ts (mutation, not action)
2. Zod schema for input validation in convex/schemas/onboarding.ts
3. TypeScript types exported from convex/types/user.ts
4. Include JSDoc on the public function
5. Return { success: boolean, userId: string, error?: string }
```

**Benefits:**
- Modular, typed, documented code every time
- No 1,200-line components
- Optimizes for maintainability, not speed

### 4. FAILURE CONDITIONS — The Secret Weapon

Define what **breaks** the contract. This gives Claude a negative target.

**Example:**
```
FAILURE CONDITIONS:
- Uses useState for data that should be in Convex
- Any component exceeds 150 lines
- Fetches data client-side when it could be server-side
- Uses any UI library besides Tailwind utility classes
- Missing loading and error states
- Missing TypeScript types on any function parameter
```

**Why it works:** Claude doesn't have to guess what "good" means when you've told it what "bad" looks like.

---

## How to Use This Skill

When you invoke this skill, I will:

1. **Check for CLAUDE.md** - If missing, I'll help you create one with your stack constraints
2. **Analyze your request** - Understand what you're trying to build
3. **Draft a Prompt Contract** - Create a structured contract with all 4 components
4. **Review with you** - Present the contract for your approval
5. **Execute** - Build according to the contract specifications
6. **Verify** - Test against the defined success criteria

## Example Session Flow

**You:** "I need a user dashboard that shows active projects"

**I respond with a Prompt Contract:**
```
GOAL: Display user's active projects with real-time updates.
First meaningful paint under 1 second. User can create, archive,
and rename projects inline.

CONSTRAINTS: Convex useQuery for data, no polling, no SWR.
Clerk useUser() for auth check. Redirect to /sign-in if
unauthenticated. Max 150 lines per component file.

FORMAT: Page component in app/dashboard/page.tsx (server component
wrapper), client component in components/dashboard/ProjectList.tsx,
Convex query in convex/projects.ts. Tailwind only.

FAILURE CONDITIONS:
- Uses useState for data that should be in Convex
- Any component exceeds 150 lines
- Fetches data client-side when it could be server-side
- Uses any UI library besides Tailwind utility classes
- Missing loading and error states
- Missing TypeScript types on any function parameter
```

**You approve, I build it.**

---

## CLAUDE.md Template

I'll help you create a CLAUDE.md file if you don't have one. Here's the recommended structure:

```markdown
# CLAUDE.md — Project Constraints (always active)

## Stack (non-negotiable)
- Frontend: [Your framework]
- Backend: [Your backend]
- Auth: [Your auth provider]
- Styling: [Your styling solution]
- Database: [Your database]

## Hard Rules
- Never install a new dependency without asking first
- Never modify the database schema without showing migration plan
- All API calls go through [your API layer]
- Environment variables go in .env.local, never hardcoded
- [Add your project-specific rules]

## Patterns
- [Your architectural patterns]
- [Your code organization rules]
- [Your testing requirements]
- [Your error handling standards]

## Failure Conditions (Global)
- No inline styles (use [your styling system])
- No magic numbers (use constants)
- No console.logs in production code
- All functions must have TypeScript types
- All user inputs must be validated
```

---

## When to Use This Skill

✅ **Use when:**
- Building new features
- Refactoring existing code
- Integrating new systems
- You need reliable, predictable output
- You're tired of undoing Claude's creative interpretations

❌ **Don't use when:**
- Quick one-line fixes
- Exploratory research questions
- You genuinely want creative brainstorming

---

## Results You Can Expect

Based on 3 weeks of tracked data:

- **Undo/revert rate:** From 33% → 10%
- **Rounds of iteration:** From 3 → 1.2 average
- **Stack violations:** From multiple per day → essentially zero
- **Time investment:** 60 seconds to write contract
- **Time saved:** 45 minutes of debugging per contract

---

## Quick Start Guide

**Step 1:** Create CLAUDE.md in your project root
```
> Help me create a CLAUDE.md for my project. I'm using [your stack].
```

**Step 2:** For your next task, structure it as a Prompt Contract
```
> Build [feature] using Prompt Contract methodology
```

**Step 3:** I'll draft the contract with GOAL, CONSTRAINTS, FORMAT, and FAILURE CONDITIONS

**Step 4:** You approve, I execute

---

## Advanced: Security Review Integration

Before pushing code, run a security scan:

```
> Run /security-review on pending changes
```

I'll scan for:
- SQL injection vulnerabilities
- Auth bypasses
- Hardcoded secrets
- XSS vulnerabilities
- Insecure patterns

Prompt Contracts build the right thing. Security review ensures the right thing doesn't have holes.

---

## Philosophy

**The problem was never Claude's intelligence.**

The problem is vibe prompts like:
- "Make it responsive"
- "Add error handling"
- "Use best practices"

These aren't instructions. They're horoscopes.

**Claude Code isn't a fortune teller — it's a contractor.**

You wouldn't hand a contractor a napkin that says "build house, make nice" and expect your dream home. Same applies here.

**Prompt Contracts:**
- Think for 60 seconds
- So Claude doesn't guess for 60 minutes
- From gambling → shipping

---

## Iterative Workflow - How This Skill Works

This skill uses an **iterative, collaborative approach**. We work together until the Prompt Contract is perfect.

### Phase 1: Setup & Context (First Time Only)
1. **Check for CLAUDE.md**
   - If missing: I draft one based on your stack
   - We iterate on it together until accurate
   - You approve and I save it

2. **Constraint Handshake**
   - I read CLAUDE.md
   - Echo back key constraints
   - You confirm I understand your project

### Phase 2: Contract Drafting (Iterative)
3. **Understand the Request**
   - You describe what you want to build
   - I ask clarifying questions if needed
   - We establish scope together

4. **Draft GOAL**
   - I propose a testable goal with success metrics
   - You review: too vague? too specific? wrong focus?
   - We iterate until the goal is crystal clear

5. **Draft CONSTRAINTS**
   - I list constraints based on CLAUDE.md + this specific task
   - You add missing constraints
   - We iterate until boundaries are firm

6. **Draft FORMAT**
   - I specify exact file structure, patterns, return types
   - You review: files in right places? patterns match your codebase?
   - We iterate until format is precise

7. **Draft FAILURE CONDITIONS**
   - I list what would make output unacceptable
   - You add critical failure modes I missed
   - We iterate until guardrails are complete

### Phase 3: Review & Refinement
8. **Present Complete Contract**
   - I show you the full 4-component contract
   - You review as a whole
   - We iterate on any component that needs adjustment

9. **Confirmation Gate**
   - I ask: "Does this contract fully specify what you want?"
   - You say YES → we proceed to execution
   - You say NO → we return to the component that needs work

### Phase 4: Execution
10. **Build According to Contract**
    - I write code following every specification
    - No surprises, no creative interpretation
    - Stick to the contract like law

11. **Verify Against Contract**
    - Test against success criteria from GOAL
    - Check all FAILURE CONDITIONS are avoided
    - Confirm FORMAT matches specification

12. **Deliver & Iterate**
    - Show you the result
    - If it violates the contract → I fix it
    - If the contract was wrong → we refine the contract and rebuild

### Phase 5: Learn & Improve
13. **Contract Post-Mortem (Optional)**
    - What worked well in the contract?
    - What should we add to CLAUDE.md for next time?
    - How can we make future contracts faster?

---

## Example Iterative Session

**You:** "I need a dashboard"

**Me:** "Let me draft a GOAL. Here's my understanding:

GOAL: Display user's active projects with real-time updates.
Success = page loads under 1s, shows projects, allows CRUD operations.

Is this the right direction, or should I adjust?"

**You:** "No, I only need read-only. No create/delete. And I need to filter by status."

**Me:** "Got it. Updated GOAL:

GOAL: Display user's active projects with real-time updates and
status filtering (active/archived/all). Read-only view.
Success = page loads under 1s, shows projects list, filter works instantly.

Better?"

**You:** "Perfect."

**Me:** "Great. Now for CONSTRAINTS based on your CLAUDE.md, I see you use Next.js + Convex + Clerk. Any additional constraints for this specific feature?"

**You:** "Yes - no more than 3 Convex queries on this page. Performance matters."

**Me:** "Added. Now let me draft FORMAT..."

*[We continue iterating through each component]*

---

## Iteration Rules

### I Will Always:
- ✅ Show you one component at a time (or ask if you want to see all at once)
- ✅ Ask "Is this right?" before moving to the next component
- ✅ Explain my reasoning if something is unclear
- ✅ Incorporate your feedback immediately
- ✅ Never start coding until you explicitly approve the full contract

### You Should:
- ✅ Challenge vague language ("what does 'fast' mean?")
- ✅ Add constraints I might miss (project-specific patterns)
- ✅ Tell me when something doesn't match your mental model
- ✅ Ask for examples if a component is unclear

### Red Flags to Call Out:
- 🚩 Goal is too vague to test
- 🚩 Constraints are missing critical boundaries
- 🚩 Format doesn't match your codebase structure
- 🚩 Failure conditions don't cover your main concerns

---

## Workflow Shortcuts

### For Experienced Users:
```
> Draft complete contract for [feature], I'll review all at once
```
I'll present all 4 components, you review as a whole.

### For New Users:
```
> Build [feature] with Prompt Contracts, guide me step-by-step
```
I'll iterate through each component with you.

### For Quick Tasks:
```
> Quick contract: [simple, well-defined task]
```
I'll draft a minimal contract, you sanity-check it.

---

## What "Done" Looks Like

A complete, approved Prompt Contract has:

✅ **GOAL** - You can test it in under 1 minute
✅ **CONSTRAINTS** - No ambiguity about what's allowed
✅ **FORMAT** - You know exactly what files/structure to expect
✅ **FAILURE CONDITIONS** - You've listed your "deal-breakers"

When you approve, I build. No surprises.

---

## Iteration Examples

### Iteration on GOAL:
```
Draft 1: "Build a settings page"
→ Too vague. What settings? What can users do?

Draft 2: "Build /settings page where users can update email and password"
→ Better. Can they see current email? What happens on success?

Draft 3: "Build /settings page displaying current email (read-only) with
         'Change Email' and 'Change Password' buttons. Success = user clicks
         button, sees modal, submits new value, sees confirmation, modal closes."
→ Approved! Testable and specific.
```

### Iteration on CONSTRAINTS:
```
Draft 1: "Use the database"
→ Which database? Supabase? Convex? PostgreSQL?

Draft 2: "Use Convex for data"
→ Which Convex pattern? Mutation? Action? Query?

Draft 3: "Use Convex mutation for updates. No direct Supabase calls.
         All schema changes require showing migration plan first."
→ Approved! Clear boundaries.
```

---

## How Many Iterations?

**First contract:** 5-10 iterations (we're learning your style)
**Fifth contract:** 2-3 iterations (I know your patterns)
**Tenth contract:** 1 iteration or instant approval (we're in sync)

The system gets **faster** as we build shared context in CLAUDE.md.

---

## Notes

- Prompts get **shorter** over time, not longer (constraints live in CLAUDE.md)
- First message of every session: "Read CLAUDE.md and confirm constraints"
- Use this for MCP tool descriptions too (they're contracts in disguise)
- The framework scales: works for components, features, full apps

---

**Ready to stop vibe coding and start shipping?**

Invoke this skill and let's build your first Prompt Contract.

---

## References

- Original article by Phil | Rentier Digital (Feb 2026)
- Book: "Prompt Contracts: How I Stopped Vibe Coding and Started Shipping Real Software With AI"
- Methodology inspired by ex-OpenAI engineer's Structured Prompting concept

---

*Remember: The quality of output is directly proportional to the specificity of input.*
