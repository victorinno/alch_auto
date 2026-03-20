# Prompt Contract Template

Use this template to structure your requests to Claude Code.

---

## Contract for: [Feature Name]

### GOAL
**What success looks like:**
- [Primary objective - be specific and testable]
- [Success metric 1 - how do you verify this works?]
- [Success metric 2]
- [Success metric 3]

**Success criteria:**
Success = [Concrete, testable statement. e.g., "a user can click X, see Y happen in under 2s, and Z updates correctly"]

---

### CONSTRAINTS
**Stack requirements:**
- Frontend: [specific frameworks/libraries]
- Backend: [specific backend tech]
- Auth: [auth provider/pattern]
- Data: [database/API pattern]

**Hard boundaries:**
- ❌ [Thing that must NOT happen]
- ❌ [Another forbidden action]
- ❌ [Stack violation to avoid]

**Required patterns:**
- ✅ [Pattern 1 to follow, e.g., "Use Convex queries not SWR"]
- ✅ [Pattern 2 to follow]
- ✅ [Pattern 3 to follow]

**Additional constraints for this feature:**
- [Feature-specific constraint 1]
- [Feature-specific constraint 2]

---

### FORMAT
**File structure:**
1. [File path/name] - [Purpose, e.g., "Page component (server)"]
2. [File path/name] - [Purpose, e.g., "Client component for interaction"]
3. [File path/name] - [Purpose, e.g., "Convex mutation"]
4. [File path/name] - [Purpose, e.g., "TypeScript types"]
5. [File path/name] - [Purpose, e.g., "Zod validation schema"]

**Code structure:**
- Max lines per file: [e.g., 150]
- Function return type: [e.g., `{ success: boolean, data?: T, error?: string }`]
- Documentation: [e.g., "JSDoc on all exported functions"]
- Testing: [e.g., "Include test file with happy path + error cases"]

**Styling:**
- [e.g., "Tailwind utility classes only"]
- [e.g., "Use design system tokens from /styles/tokens.ts"]

---

### FAILURE CONDITIONS
**Deal-breakers (output is unacceptable if):**
- ❌ [Failure condition 1, e.g., "Uses useState for server data"]
- ❌ [Failure condition 2, e.g., "Any file exceeds 150 lines"]
- ❌ [Failure condition 3, e.g., "Missing TypeScript types"]
- ❌ [Failure condition 4, e.g., "No loading/error states"]
- ❌ [Failure condition 5, e.g., "Uses forbidden library"]

**Quality gates:**
- ❌ [Missing documentation]
- ❌ [Missing tests]
- ❌ [Console.logs in code]
- ❌ [Hardcoded values]

---

## Approval

- [ ] GOAL is testable in under 1 minute
- [ ] CONSTRAINTS cover all critical boundaries
- [ ] FORMAT matches our codebase structure
- [ ] FAILURE CONDITIONS cover my main concerns

**Status:** [DRAFT | APPROVED | IN PROGRESS | COMPLETE]

**Notes:**
[Any additional context, edge cases, or clarifications]

---

## Examples of Good vs Bad Components

### GOAL Examples

❌ **Bad:** "Add a form"
- Not testable
- No success metric
- Unclear what the form does

✅ **Good:** "Add user registration form on /signup that collects email + password, validates on blur, shows inline errors, submits to /api/register, redirects to /dashboard on success. Success = user types invalid email, sees error, fixes it, submits, sees loading state, lands on dashboard within 3s"
- Completely testable
- Clear success path
- Observable outcomes

### CONSTRAINTS Examples

❌ **Bad:** "Use the database"
- Which database?
- Which pattern?
- What's allowed/forbidden?

✅ **Good:** "Use Supabase PostgreSQL via Row Level Security policies. All queries through Supabase client. No raw SQL in frontend. Schema changes require migration file with up/down. No direct admin key usage."
- Specific tech
- Clear patterns
- Security boundaries

### FORMAT Examples

❌ **Bad:** "Make it modular"
- What does modular mean?
- How many files?
- What goes where?

✅ **Good:**
```
1. app/dashboard/page.tsx - Server component wrapper (auth check)
2. components/dashboard/ProjectList.tsx - Client component (max 100 lines)
3. components/dashboard/ProjectCard.tsx - Presentation component
4. lib/projects/queries.ts - Supabase queries
5. lib/projects/types.ts - TypeScript interfaces
6. lib/projects/validation.ts - Zod schemas
```
- Exact files
- Clear purpose
- Size limits

### FAILURE CONDITIONS Examples

❌ **Bad:** "Make it good"
- Subjective
- Not measurable
- No specific violations

✅ **Good:**
- Uses fetch() instead of Supabase client
- Any component exceeds 150 lines
- Missing error boundaries
- No loading states on async operations
- Hardcoded API URLs
- Missing TypeScript types on functions
- Uses any package not in package.json
- Inline styles instead of Tailwind
- No data validation

---

## Usage Tips

1. **Start with GOAL** - Everything else follows from knowing what "done" means
2. **Steal CONSTRAINTS from CLAUDE.md** - Don't rewrite your stack every time
3. **Be specific in FORMAT** - File paths, not vague "components"
4. **Think worst-case for FAILURE CONDITIONS** - What would make you delete the code?

5. **Iterate!** - Draft → Review → Refine → Approve → Execute

---

**Remember:** 60 seconds to write this contract saves 45 minutes of debugging.
