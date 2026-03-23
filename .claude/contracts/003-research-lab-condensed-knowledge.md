# Contract #003: Research Lab - Condensed Knowledge System

**Date:** 2026-03-23
**Status:** APPROVED
**Estimated Lines:** ~717 lines

---

## GOAL

**What success looks like:**
- **New resources added:**
  - 💧 **Condensed Knowledge (Alchemy)** - Raw liquid knowledge from alchemy
  - ⚗️ **Prepared Knowledge (Alchemy)** - Processed knowledge ready for injection
  - 🧪 **Philosopher's Draft** - Advanced potion (produces Condensed Knowledge)
  - 💎 **Soul Crystal** - Rare essence (produces Condensed Knowledge)

- **Research Lab UI** - New full-screen view (like World Map)
  - Accessible via "🔬 Research Lab" button in World Features section
  - "← Back to Workshop" button to return
  - Shows three main sections:
    1. **Knowledge Distiller** (machine display)
    2. **Knowledge Injector** (machine display)
    3. **Research Tree** (Alchemy Mastery branch)

- **Knowledge Distiller Machine:**
  - **Build requirement:** Unlocks at Workshop Level 1, costs gold:100, crystals:20, iron:15
  - **Function:** Processes Condensed Knowledge (Alchemy) → Prepared Knowledge (Alchemy)
  - **Processing time:** 10 seconds per CK (base rate, improvable via research)
  - **Queue capacity:** Max 5 CK in processing queue
  - **UI shows:**
    - Current processing CK with progress bar (0-10s)
    - Queue of waiting CK (e.g., "Queue: 3/5")
    - "Add to Queue" button (when have CK and queue not full)
  - **Stops when:** Injector reaches max capacity

- **Knowledge Injector Machine:**
  - **Build requirement:** Unlocks at Workshop Level 1, costs gold:150, essence:10, crystals:15
  - **Function:** Stores Prepared Knowledge, injects into active research
  - **Capacity:** Max 100 Prepared Knowledge (base capacity, improvable via research)
  - **Injection:** Manual button press (auto later via research)
  - **UI shows:**
    - Current stored Prepared Knowledge: "47/100"
    - Progress bar showing fill level
    - "Inject into Research" button
  - **Blocks Distiller:** When at max capacity (100/100), Distiller pauses

- **Research System:**
  - **Research Tree** with branching nodes
  - Each node has: name, description, required points, prerequisites, level
  - **Point consumption:** 1 Prepared Knowledge = 10 research points (base rate)
  - **Research queue:** Can queue up to 10 researches, only 1 active at a time
  - **Progress tracking:** Shows "Researching... [current points] / [required points]"
  - **Two research types:**
    1. **Infinite research** - Repeatable, costs increase per level
    2. **One-time unlock** - Unlocks feature/bonus once

- **First Research Tree: "Alchemy Mastery"**
  - **Tier 1 (Starting nodes - all available):**
    1. **Distiller Efficiency** (infinite) - Reduces processing time per CK (-10% per level)
    2. **Injector Capacity** (infinite) - Increases max Prepared Knowledge storage (+20 per level)
    3. **Knowledge Yield** (infinite) - Increases points per Prepared Knowledge (+1 point per level)
    4. **Alchemy Speed** (infinite) - % bonus to alchemy crafting speed (+5% per level)
  - **Tier 2 (Requires Tier 1 research):**
    5. **Alchemy Productivity** (infinite) - Accumulates %; every 100% = +1 free item (+10% per level)
    6. **Auto-Injection** (one-time) - Automatically injects Prepared Knowledge into active research

- **Research costs (scaling):**
  - **Tier 1 nodes:**
    - Level 1: 100 points
    - Level 2: 200 points
    - Level 3: 400 points
    - Formula: `baseCost × (2^(level-1))`
  - **Tier 2 nodes:**
    - Level 1: 500 points
    - Formula: `500 × (2^(level-1))`

- **Philosopher's Draft / Soul Crystal alchemy recipes:**
  - **Philosopher's Draft:**
    - Cost: essence:10, crystals:8, gold:50
    - Time: 60 seconds
    - Produces: Condensed Knowledge (Alchemy) × 5
    - Unlocks: Workshop Level 2
  - **Soul Crystal:**
    - Cost: moonstone:5, essence:15, gold:100
    - Time: 120 seconds
    - Produces: Condensed Knowledge (Alchemy) × 15
    - Unlocks: Workshop Level 2

- **Research cancellation:**
  - Can cancel active research
  - Refunds all unconsumed Prepared Knowledge to Injector
  - Loses all accumulated points for that research
  - Shows confirmation: "Cancel research? Progress will be lost."

- **Research in-progress indicator:**
  - Shows in World Features section
  - Format: "🔬 Researching: [Node Name] Lv[X] - [points]/[total] pts"
  - Clickable to open Research Lab
  - Only visible when research is active

- **Persistence:**
  - Distiller queue, processing state, progress
  - Injector stored Prepared Knowledge
  - Active research, points, unlocked nodes, levels
  - Research queue
  - All saved/loaded via localStorage

**Success criteria:**
Success = unlock Workshop Level 1 → see "Build Distiller" and "Build Injector" buttons in workshop → build both (spend resources) → upgrade to Workshop Level 2 → brew Philosopher's Draft → gain 5 Condensed Knowledge (Alchemy) → click "🔬 Research Lab" → see Distiller (empty), Injector (0/100), Research Tree with 4 Tier 1 nodes → click "Add to Queue" on Distiller → adds 1 CK to queue → 10s countdown starts → after 10s → 1 Prepared Knowledge → goes to Injector (1/100) → click "Distiller Efficiency Lvl 1" node (costs 100 points) → click "Begin Research" → see "🔬 Researching: Distiller Efficiency Lvl 1 - 0/100 pts" in main UI → click "Inject into Research" → consumes 1 Prepared Knowledge → gains 10 points (10/100) → add 9 more CK to Distiller queue (in batches due to 5 max) → wait for processing → inject all → 100/100 points → research completes → "✅ Research complete: Distiller Efficiency Lvl 1! (-10% processing time)" → Distiller now processes in 9s → next level appears (Lvl 2, costs 200 points) → refresh page → Distiller queue persists, Injector storage persists, research progress persists, Distiller Efficiency Lvl 1 still unlocked

---

## CONSTRAINTS

### Tech Stack Constraints
- ✅ Pure vanilla JavaScript (ES6+) - no frameworks
- ✅ All code in `game.js` (single-file architecture)
- ✅ CSS in `style.css` (terminal/ASCII theme)
- ✅ LocalStorage for persistence
- ✅ Existing game loop with `requestAnimationFrame`

### Data Structure Constraints
- ✅ Add to global state `G`:
  - `G.researchLab` - Lab state object
  - `G.distiller` - Distiller machine state
  - `G.injector` - Injector machine state
  - `G.activeResearch` - Current research in progress
  - `G.researchQueue` - Array of queued research nodes (max 10)
  - `G.researchNodes` - Object tracking unlocked nodes and levels
- ✅ New resources in `RESOURCES`:
  - `condensed_knowledge_alchemy` - Icon: 💧, name: "Condensed Knowledge (Alchemy)"
  - `prepared_knowledge_alchemy` - Icon: ⚗️, name: "Prepared Knowledge (Alchemy)"
  - `philosophers_draft` - Icon: 🧪, name: "Philosopher's Draft"
  - `soul_crystal` - Icon: 💎, name: "Soul Crystal"
- ✅ Distiller state structure:
  ```javascript
  {
    built: boolean,
    processingQueue: [], // Array of {ckAmount, startTime, endTime}
    currentProcessing: {ckAmount, startTime, endTime} | null,
    baseProcessingTime: 10000, // milliseconds
    speedMultiplier: 1.0 // Affected by research
  }
  ```
- ✅ Injector state structure:
  ```javascript
  {
    built: boolean,
    storedPreparedKnowledge: number,
    maxCapacity: 100, // Affected by research
    autoInject: false // Unlocked by research
  }
  ```
- ✅ Research node structure:
  ```javascript
  {
    id: string,
    name: string,
    description: string,
    type: "infinite" | "one-time",
    tier: number,
    basePointCost: number,
    currentLevel: number,
    maxLevel: number | null, // null for infinite
    prerequisites: [nodeIds],
    effect: function(level) // Applied on unlock
  }
  ```

### Game Mechanics Constraints
- ✅ **Machine building:**
  - Distiller cost: gold:100, crystals:20, iron:15
  - Injector cost: gold:150, essence:10, crystals:15
  - Both unlock at Workshop Level 1
  - Must be built before using Research Lab
- ✅ **Distiller mechanics:**
  - Max queue: 5 CK
  - Processing time formula: `baseTime × speedMultiplier`
  - Base time: 10 seconds (10000ms)
  - Processes one at a time (FIFO queue)
  - Output goes to Injector (if space available)
  - Pauses when Injector full (displays "Injector Full" status)
- ✅ **Injector mechanics:**
  - Stores Prepared Knowledge
  - Base capacity: 100
  - Manual injection (button click)
  - Auto-injection when unlocked via research
  - Injection uses Prepared Knowledge for active research points
  - Point conversion: 1 Prepared Knowledge = base 10 points (affected by research)
- ✅ **Research mechanics:**
  - Only 1 active research at a time
  - Can queue up to 10 researches
  - Point accumulation from manual/auto injection
  - Research completes when points >= required points
  - Completion triggers `effect(level)`, increments level, shows next level, logs event
  - Tier 2 nodes locked until at least 1 Tier 1 node at Level 1
- ✅ **Point cost scaling:** `baseCost × (2^(level-1))`
  - Tier 1 base: 100 points
  - Tier 2 base: 500 points
- ✅ **New alchemy recipes:**
  - Philosopher's Draft: {essence:10, crystals:8, gold:50} → 60s → condensed_knowledge_alchemy:5
  - Soul Crystal: {moonstone:5, essence:15, gold:100} → 120s → condensed_knowledge_alchemy:15
  - Require Workshop Level 2 to unlock

### UI/Rendering Constraints
- ✅ View mode system: Extend `G.currentView` to include "researchlab"
- ✅ When researchlab view active:
  - Hide: `#main-layout`
  - Show: `#researchlab-panel` (new full-screen panel)
- ✅ When workshop view active:
  - Hide: `#researchlab-panel`
  - Show: `#main-layout`
- ✅ **Research in-progress indicator in main UI:**
  - Shows in World Features section
  - Format: "🔬 Researching: [Node Name] Lv[X] - [points]/[total] pts"
  - Clickable to open Research Lab
- ✅ Research Lab UI shows:
  - Distiller machine card (queue, progress, add button)
  - Injector machine card (storage, inject button)
  - Active research display with progress bar
  - Research queue display (up to 10)
  - Research tree (2-column grid for tier 1, expandable)
- ✅ Research node card shows:
  - Icon (✅ unlocked, 🔬 active, 🔒 locked)
  - Name + Level (e.g., "Distiller Efficiency Lv 2")
  - Description + current effect
  - Cost in points
  - Progress bar if active
  - Buttons: "Research", "Queue", "Cancel"

### State Management Constraints
- ✅ Block distiller add-to-queue if:
  - Not built
  - Queue full (5/5)
  - No Condensed Knowledge available
- ✅ Block injection if:
  - Not built
  - No Prepared Knowledge stored
  - No active research
- ✅ Block research start if:
  - Prerequisites not met
  - Another research active (add to queue instead)
  - Queue full (10/10)
- ✅ Research queue processes automatically when active completes
- ✅ Research queue limit: 10 researches maximum

### Save/Load Constraints
- ✅ Add to `saveGame()`:
  - `distiller: G.distiller`
  - `injector: G.injector`
  - `activeResearch: G.activeResearch`
  - `researchQueue: G.researchQueue`
  - `researchNodes: G.researchNodes`
- ✅ On `loadGame()`:
  - Restore all research lab state
  - Handle in-progress distiller processing (resume or complete based on elapsed time)
  - Handle in-progress research (resume point accumulation)
  - Re-apply research effects via `effect(level)`
  - Always reset view to "workshop"

### Event Log Constraints
- ✅ Log distiller events:
  - "🔬 Added Condensed Knowledge to Distiller queue." (info)
  - "⚗️ Distiller completed processing! +1 Prepared Knowledge." (good)
  - "⚠️ Distiller paused - Injector full!" (warn)
- ✅ Log injector events:
  - "💉 Injected 10 Prepared Knowledge → +100 research points." (info)
  - "🎯 Injector at max capacity (100/100)!" (warn)
- ✅ Log research events:
  - "🔬 Started research: [Node Name] Lv[X]" (info)
  - "✅ Research complete: [Node Name] Lv[X]! [Effect description]" (great)
  - "⚠️ Research canceled: [Node Name]. Points lost." (warn)
  - "📋 Research queued: [Node Name] Lv[X]. Queue: [X]/10" (info)

### Hard Rules (Must Not Break)
- ❌ Do NOT modify existing ZONES, GOLEM_TYPES, UPGRADES constants
- ❌ Do NOT break existing game loop, tick functions, render functions
- ❌ Do NOT allow multiple active researches (queue only)
- ❌ Do NOT allow injection when Injector not built
- ❌ Do NOT allow distiller to exceed queue capacity (5)
- ❌ Do NOT allow research queue to exceed 10 researches
- ❌ Do NOT allow tier 2 research until tier 1 prerequisite met
- ❌ View must reset to "workshop" on page load

### Performance Constraints
- ✅ Only render Research Lab when `G.currentView === "researchlab"`
- ✅ Use existing game loop for countdowns
- ✅ Create new `tickResearchLab(now)` function (called from game loop)
- ✅ Partial updates for progress bars (not full re-render)
- ✅ Update research in-progress indicator without full render

### CSS/Styling Constraints
- ✅ Follow terminal/ASCII theme (existing color palette)
- ✅ Reuse existing `.zone-card`, `.btn`, `.progress-bar` classes where possible
- ✅ Grid layout for research tree nodes (2 columns for tier 1, responsive)
- ✅ Hover effects for clickable nodes
- ✅ Disabled/locked styling for unavailable nodes
- ✅ Visual distinction for active research node (glowing border/highlight)

---

## FORMAT

All changes in `game.js`, `index.html`, and `style.css` following existing patterns:

### 1. Global State Additions (game.js, after line ~155)
```javascript
// Research Lab State
G.distiller = null;
G.injector = null;
G.activeResearch = null;
G.researchQueue = [];
G.researchNodes = {};
```

### 2. New Resources (game.js, in RESOURCES constant ~line 12)
Add to existing RESOURCES object:
```javascript
condensed_knowledge_alchemy: { icon: "💧", name: "Condensed Knowledge (Alchemy)", color: "var(--blue)" },
prepared_knowledge_alchemy: { icon: "⚗️", name: "Prepared Knowledge (Alchemy)", color: "var(--purple)" },
philosophers_draft: { icon: "🧪", name: "Philosopher's Draft", color: "var(--amber)" },
soul_crystal: { icon: "💎", name: "Soul Crystal", color: "var(--purple)" },
```

Add to `G.resources` default:
```javascript
condensed_knowledge_alchemy: 0,
prepared_knowledge_alchemy: 0,
philosophers_draft: 0,
soul_crystal: 0,
```

### 3. New Alchemy Recipes (game.js, in ALCHEMY_RECIPES ~line 44)
```javascript
{
  id: "philosophers_draft",
  name: "Philosopher's Draft",
  icon: "🧪",
  ingredients: { essence: 10, crystals: 8, gold: 50 },
  produces: { condensed_knowledge_alchemy: 5 },
  time: 60,
  requiresLevel: 2,
  unlocked: false
},
{
  id: "soul_crystal",
  name: "Soul Crystal",
  icon: "💎",
  ingredients: { moonstone: 5, essence: 15, gold: 100 },
  produces: { condensed_knowledge_alchemy: 15 },
  time: 120,
  requiresLevel: 2,
  unlocked: false
}
```

### 4. Research Nodes Definition (game.js, new constant after ALCHEMY_RECIPES ~80 lines)
`RESEARCH_NODES` constant with all 6 research nodes

### 5. Machine Building Functions (game.js, new section ~150 lines)
- `buildDistiller()`
- `buildInjector()`
- `addToDistillerQueue()`
- `tickDistiller(now)`
- `injectKnowledge(amount)`
- `tickInjector(now)`

### 6. Research Functions (game.js, new section ~120 lines)
- `startResearch(nodeId)`
- `completeResearch()`
- `cancelResearch()`
- `canResearchNode(nodeId)`
- `getResearchPointCost(nodeId)`
- `tickResearchLab(now)`

### 7. View Switching Functions (game.js, ~15 lines)
- `showResearchLab()`

### 8. Render Functions (game.js, new section ~200 lines)
- `renderResearchLab()`
- `renderResearchNode(nodeId)`
- `renderResearchIndicator()`
- `updateResearchProgress()`

### 9. Modified Functions
- `gameLoop()` - Add `tickResearchLab(now)` call
- `saveGame()` - Add research lab state
- `loadGame()` - Restore research lab state, re-apply effects
- `setupEventDelegation()` - Add research lab actions

### 10. HTML Additions (index.html, ~7 lines)
- Research Lab button in World Features
- Research indicator div
- New researchlab-panel

### 11. CSS Additions (style.css, ~100 lines)
- Research lab panel styling
- Machine card styling
- Research tree grid
- Research node cards with states

### Estimated Line Counts
- **game.js:** ~610 new/modified lines
- **index.html:** ~7 lines
- **style.css:** ~100 lines
- **Total: ~717 lines**

---

## FAILURE CONDITIONS

The output is **UNACCEPTABLE** if:

### UI/Display Issues
- ❌ "🔬 Research Lab" button does NOT appear in World Features section
- ❌ Research Lab button does NOT change UI when clicked (view stays on workshop)
- ❌ Research Lab view does NOT show "← Back to Workshop" button
- ❌ Back button does NOT return to main UI when clicked
- ❌ Distiller machine card does NOT appear in Research Lab
- ❌ Injector machine card does NOT appear in Research Lab
- ❌ Research tree does NOT display nodes
- ❌ Research in-progress indicator does NOT show in main UI when research is active
- ❌ Research in-progress indicator does NOT update as points accumulate

### Machine Building Issues
- ❌ Can build Distiller before Workshop Level 1
- ❌ Can build Injector before Workshop Level 1
- ❌ Can build machines without sufficient resources
- ❌ Building machines does NOT deduct resources
- ❌ Building machines does NOT save to localStorage
- ❌ Built machines do NOT persist after page refresh

### Distiller Issues
- ❌ Can add to Distiller queue when not built
- ❌ Can add to Distiller queue without Condensed Knowledge
- ❌ Can add more than 5 CK to queue (exceeds max)
- ❌ Distiller does NOT process CK over time (countdown doesn't work)
- ❌ Distiller does NOT output Prepared Knowledge when complete
- ❌ Distiller does NOT pause when Injector is full
- ❌ Distiller processing time does NOT improve with research
- ❌ Distiller queue does NOT persist after refresh
- ❌ Processing progress bar does NOT update
- ❌ Event log does NOT show distiller completion messages

### Injector Issues
- ❌ Can inject when Injector not built
- ❌ Can inject when no Prepared Knowledge stored
- ❌ Can inject when no active research
- ❌ Injection does NOT consume Prepared Knowledge
- ❌ Injection does NOT add points to active research
- ❌ Injector capacity does NOT increase with research
- ❌ Injector storage does NOT persist after refresh
- ❌ Auto-injection does NOT work after unlocking research
- ❌ Injector shows wrong capacity (not 100 + research bonuses)
- ❌ Event log does NOT show injection messages

### Research Node Issues
- ❌ Can start Tier 2 research without Tier 1 prerequisites
- ❌ Can start research without meeting prerequisites
- ❌ Research does NOT consume points (points don't accumulate)
- ❌ Research does NOT complete when points >= required
- ❌ Research completion does NOT apply effect (bonuses don't work)
- ❌ Research completion does NOT log event
- ❌ Research node does NOT show correct level after completion
- ❌ Next research level does NOT appear after completion
- ❌ Point cost does NOT scale correctly (not `baseCost × 2^level`)
- ❌ Locked nodes show as clickable/unlocked
- ❌ Active research node does NOT have visual distinction (glow/highlight)

### Research Queue Issues
- ❌ Can queue more than 10 researches
- ❌ Queue does NOT automatically start next research when active completes
- ❌ Queue does NOT persist after refresh
- ❌ Queue does NOT show in UI (missing queue display)
- ❌ Canceling research does NOT refund unused Prepared Knowledge
- ❌ Canceling research does NOT lose accumulated points
- ❌ Can start multiple researches simultaneously (violates "only 1 active" rule)

### Alchemy Recipe Issues
- ❌ Philosopher's Draft does NOT produce Condensed Knowledge
- ❌ Soul Crystal does NOT produce Condensed Knowledge
- ❌ Recipes available before Workshop Level 2
- ❌ Recipes do NOT appear in alchemy display
- ❌ Brewing recipes does NOT consume correct resources
- ❌ Brewing time incorrect (not 60s/120s)

### Resource Issues
- ❌ Condensed Knowledge (Alchemy) does NOT appear in resources display
- ❌ Prepared Knowledge (Alchemy) does NOT appear in resources display
- ❌ New resources do NOT persist after refresh
- ❌ Resource icons missing or wrong
- ❌ Resource counts show incorrect values

### Research Effect Issues
- ❌ Distiller Efficiency research does NOT reduce processing time
- ❌ Injector Capacity research does NOT increase storage
- ❌ Knowledge Yield research does NOT increase points per injection
- ❌ Alchemy Speed research does NOT increase alchemy crafting speed
- ❌ Alchemy Productivity does NOT accumulate bonus percentage
- ❌ Alchemy Productivity does NOT give free items at 100%
- ❌ Auto-Injection research does NOT enable automatic injection
- ❌ Research effects do NOT persist after refresh

### State Persistence Issues
- ❌ Distiller state lost on page refresh
- ❌ Injector state lost on page refresh
- ❌ Active research lost on page refresh
- ❌ Research queue lost on page refresh
- ❌ Research node levels lost on page refresh
- ❌ In-progress distiller processing not resumed after reload
- ❌ Research progress not resumed after reload
- ❌ View persists as "researchlab" on reload (must reset to "workshop")

### Integration Issues
- ❌ Existing game loop breaks (golems, alchemy, exploration stop working)
- ❌ Main UI panels don't hide when research lab view is active
- ❌ Research lab panel doesn't hide when workshop view is active
- ❌ Event log doesn't show research/distiller/injector messages
- ❌ Save/load system breaks (game won't save/restore)

### Edge Cases
- ❌ Game crashes when machines are null/undefined
- ❌ Can inject negative amounts of Prepared Knowledge
- ❌ Research points go negative
- ❌ Queue index errors when processing empty queue
- ❌ Division by zero in point calculations
- ❌ Infinite loops in research completion
- ❌ Memory leaks from progress bar updates

### Visual/Animation Issues
- ❌ Progress bars don't update smoothly
- ❌ Active research node doesn't glow/highlight
- ❌ Locked nodes don't have disabled appearance
- ❌ Machine cards don't match terminal theme
- ❌ Research tree layout broken on small screens
- ❌ Buttons not aligned properly
- ❌ Text overflow in node descriptions

### Performance Issues
- ❌ Research Lab renders when view is "workshop" (wasted rendering)
- ❌ Full re-renders on every tick instead of partial updates
- ❌ Event listeners not using delegation (memory leaks)
- ❌ Game slows down significantly with research system active

---

**Contract approved and ready for execution.**
