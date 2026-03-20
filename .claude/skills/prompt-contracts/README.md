# Prompt Contracts Skill

**Stop vibe coding. Start shipping.**

This skill implements the Prompt Contracts methodology for Claude Code - transforming vague prompts into enforceable specifications with clear goals, constraints, formats, and failure conditions.

## Quick Start

### 1. Install the Skill

This skill is already installed at `.claude/skills/prompt-contracts/`.

### 2. Invoke the Skill

In Claude Code, type:

```
@prompt-contracts
```

Or reference it in your message:

```
Use the prompt-contracts skill to build a user dashboard
```

### 3. Follow the Iterative Process

The skill will guide you through creating a contract:
- ✅ Check/create CLAUDE.md
- ✅ Draft GOAL with you
- ✅ Draft CONSTRAINTS
- ✅ Draft FORMAT
- ✅ Draft FAILURE CONDITIONS
- ✅ Get your approval
- ✅ Execute the contract

## What's Included

```
.claude/skills/prompt-contracts/
├── skill.md                    # Main skill definition
├── README.md                   # This file
├── templates/
│   ├── CLAUDE.md.template      # Project constraints template
│   └── contract-template.md    # Blank contract template
└── examples/
    └── example-simple.md       # Complete example contract
```

## Files Overview

### skill.md
The main skill definition that Claude Code reads. Contains:
- 4-component framework (GOAL, CONSTRAINTS, FORMAT, FAILURE CONDITIONS)
- Iterative workflow process
- Examples and best practices
- Session flow rules

### templates/CLAUDE.md.template
Template for creating your project's constraint file. Fill this out once and every Prompt Contract inherits these constraints.

Sections:
- Stack (frontend, backend, auth, styling)
- Hard Rules (dependencies, database, API patterns)
- Patterns (component architecture, error handling)
- Failure Conditions (global deal-breakers)

### templates/contract-template.md
Blank template for creating individual feature contracts. Use this structure when requesting features.

### examples/example-simple.md
A complete, real-world example showing a contract for "User Profile Avatar Upload" feature.

## How It Works

### The Problem
Vibe coding with prompts like:
- "Build me a dashboard"
- "Add error handling"
- "Make it responsive"

Results in:
- 30% time spent undoing wrong implementations
- 3+ rounds of iteration per feature
- Stack violations (wrong libraries, wrong patterns)
- Code you don't understand

### The Solution
Structured contracts with:
1. **GOAL** - Testable success criteria (verify in < 1 min)
2. **CONSTRAINTS** - Hard boundaries from CLAUDE.md + feature-specific
3. **FORMAT** - Exact file structure, return types, patterns
4. **FAILURE CONDITIONS** - Deal-breakers that make output unacceptable

### The Results
After 3 weeks of use:
- Undo/revert rate: 33% → 10%
- Iteration rounds: 3 → 1.2 average
- Stack violations: daily → zero
- Contract writing time: 60 seconds
- Debugging time saved: 45 minutes per contract

## Usage Patterns

### First-Time Setup
```
@prompt-contracts help me create CLAUDE.md for my Next.js + Supabase project
```

### Building a Feature (Guided)
```
@prompt-contracts build a user dashboard, guide me step-by-step
```

### Building a Feature (Experienced)
```
@prompt-contracts draft complete contract for real-time notifications, I'll review all at once
```

### Quick Simple Task
```
@prompt-contracts quick contract: add loading spinner to submit button
```

## Best Practices

### DO:
✅ Create CLAUDE.md on your first use
✅ Start every session with "Read CLAUDE.md and confirm constraints"
✅ Challenge vague language in drafts
✅ Add failure conditions Claude might miss
✅ Iterate until the contract is crystal clear
✅ Only approve when you can test the goal in < 1 minute

### DON'T:
❌ Skip the GOAL (everything else is meaningless without it)
❌ Accept vague constraints ("use best practices")
❌ Approve incomplete FORMAT (specify exact files)
❌ Start coding before contract approval
❌ Rewrite CLAUDE.md constraints for every contract

## Workflow Phases

### Phase 1: Setup (First Time Only)
1. Create/review CLAUDE.md
2. Constraint handshake

### Phase 2: Contract Drafting (Iterative)
3. Understand request
4. Draft GOAL → iterate
5. Draft CONSTRAINTS → iterate
6. Draft FORMAT → iterate
7. Draft FAILURE CONDITIONS → iterate

### Phase 3: Review
8. Present complete contract
9. Get approval or iterate more

### Phase 4: Execution
10. Build according to contract
11. Verify against contract
12. Deliver (or fix if violated contract)

### Phase 5: Learn
13. Post-mortem (what to add to CLAUDE.md?)

## Examples

### Vibe Prompt
```
Add a subscription system
```

### Prompt Contract
```
GOAL: Implement Stripe subscription management where users can
subscribe to 3 tiers (free/pro/team), upgrade/downgrade instantly,
and see billing status on /settings/billing.
Success = free user can subscribe to Pro, see charge on Stripe
dashboard, access gated features within 5s.

CONSTRAINTS: Stripe SDK v14+, Clerk for user context, Convex for
subscription state. No direct Stripe calls from client. Webhook
for subscription events at /api/webhooks/stripe.

FORMAT:
1. app/settings/billing/page.tsx - Server component
2. components/billing/PricingCards.tsx - Client component
3. app/api/create-checkout/route.ts - Stripe checkout
4. app/api/webhooks/stripe/route.ts - Webhook handler
5. convex/subscriptions.ts - Subscription mutations

FAILURE CONDITIONS:
- Stores Stripe secret key client-side
- Missing webhook signature verification
- No error handling for failed payments
- Doesn't sync subscription status to database
- User can access Pro features without valid subscription
```

See `examples/example-simple.md` for a complete real-world example.

## FAQ

**Q: Do I need to write a contract for every change?**
A: No. Quick fixes ("change button color to blue") don't need contracts. Use contracts for:
- New features
- Complex changes
- Integrations
- Anything you want done right the first time

**Q: Isn't this more work upfront?**
A: 60 seconds writing contract vs 45 minutes debugging. You choose.

**Q: Can I skip components?**
A: Not recommended. Each component prevents a specific failure mode:
- No GOAL → vague, untestable output
- No CONSTRAINTS → stack violations
- No FORMAT → unmaintainable structure
- No FAILURE CONDITIONS → subtle bugs

**Q: What if my contract was wrong?**
A: Iterate! Refine the contract and rebuild. Better to fix the spec than debug the implementation.

**Q: How do I know if my contract is good?**
A checklist:
- [ ] Can I test GOAL in < 1 minute?
- [ ] Do CONSTRAINTS cover all critical boundaries?
- [ ] Does FORMAT match my codebase?
- [ ] Do FAILURE CONDITIONS cover my concerns?

## Integration with CLAUDE.md

Your `CLAUDE.md` acts as the "constitution" - permanent constraints that apply to ALL contracts.

**Global constraints (CLAUDE.md):**
- Stack decisions (Next.js, Supabase, Clerk)
- Code organization (max lines, folder structure)
- Security rules (no hardcoded secrets)

**Feature constraints (individual contracts):**
- This specific feature uses Stripe
- This page needs <1s load time
- This component max 100 lines

Together, they ensure consistency across all features.

## Troubleshooting

**Problem:** Claude violates the contract
**Solution:** Point to the specific clause violated, ask for fix

**Problem:** Output is wrong but matches contract
**Solution:** Contract was incorrect. Iterate on contract, rebuild.

**Problem:** Too many iterations to get contract right
**Solution:** Add common patterns to CLAUDE.md to reduce repetition

**Problem:** Contract feels too rigid
**Solution:** That's the point! Rigidity prevents surprises. Embrace it.

## Advanced Usage

### Multi-Agent Workflows
When using Claude Code's agent teams, ensure all sub-agents read the same contract. This prevents merge conflicts from inconsistent formatting.

### Security Review
After building, run:
```
/security-review
```
To scan for SQL injection, auth bypasses, hardcoded secrets, etc.

### MCP Tool Descriptions
Apply Prompt Contract principles to MCP tool descriptions:
```markdown
GOAL: Find users whose credit balance drifts >10% from expected
CONSTRAINTS: Query Convex only, flag >50 credits as urgent
FORMAT: Return { userId, expected, actual, drift, urgent }
FAILURE: Returns unactionable JSON or false positives
```

## Philosophy

> "The problem was never Claude's intelligence. The problem was my prompts were vibes, not specifications."

Vibe coding = gambling
Prompt Contracts = shipping

**From horoscopes to specifications.**
**From "I hope this works" to "I know this works."**

## Credits

Based on the Prompt Contracts methodology by Phil | Rentier Digital (Feb 2026)
- Article: "I Stopped Vibe Coding and Started Prompt Contracts"
- Book: "Prompt Contracts: How I Stopped Vibe Coding and Started Shipping Real Software With AI"

Inspired by Structured Prompting concepts from ex-OpenAI engineers.

## License

This skill is provided as-is for use with Claude Code. Modify and adapt as needed for your projects.

---

**Ready to stop gambling and start shipping?**

Invoke: `@prompt-contracts`
