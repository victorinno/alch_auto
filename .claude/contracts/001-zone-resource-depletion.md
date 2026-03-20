# Contract #001: Zone Resource Depletion System

**Date:** 2026-03-20
**Status:** APPROVED
**Estimated Lines:** ~50 lines

---

## GOAL

Implement zone resource depletion system where each zone has a finite pool of resources that depletes as golems gather.

### Mechanics
- Each zone starts with ~100,000 total resources (balanced distribution, weighted toward more commonly needed resources for progression)
  - Example: Forest (clay-heavy for early golems): 50k clay, 30k herbs, 20k crystals
- Each resource gathered by a golem reduces the zone's total pool by 1
- Zone displays total remaining resources (not individual resource types)
- Format: "100k" when ≥1000, exact number when <1000 (e.g., "847")
- When zone pool reaches 0, zone completely disappears from zones panel
- Event log shows "[Zone Name] has been depleted and is no longer available"

### Success Criteria
Success = load game with Forest at 100k resources → assign golem → golem gathers 4 items → zone shows "99,996" → fast-forward time until depleted → zone disappears from UI → event log shows "Whispering Forest has been depleted" → refresh page → Forest still gone (persisted)

### Offline Progress
- Each resource gathered during offline calculation reduces zone pool
- If zone depletes mid-offline-calculation, stop gathering from that zone
- Save depleted status so zone stays removed after offline progress

---

## CONSTRAINTS

### Tech Stack
- Pure vanilla JavaScript (ES6+)
- No external dependencies or frameworks
- LocalStorage for save/load persistence
- Existing game loop with requestAnimationFrame

### Code Organization
- All changes in game.js (single-file architecture)
- Follow existing patterns (G global state object, ZONES constant)
- Use existing utility functions (fmt for number formatting)

### Data Structure
- Add resourcePool property to ZONES array
- Track individual resource amounts per yield type (for future use)
- Store in format: `{ total: number, byType: { clay: number, herbs: number, ... } }`
- Save/load zone depletion state in localStorage

### Game Balance
Starting resource pools:
- **Whispering Forest:** ~100k total (50k clay, 30k herbs, 20k crystals)
- **Iron Depths:** ~100k total (60k iron, 40k crystals)
- **Sulfur Swamp:** ~80k total (50k sulfur, 30k herbs)
- **Ancient Ruins:** ~60k total (35k moonstone, 25k essence)
- **Ember Volcano:** ~40k total (25k sulfur, 15k moonstone)

### Functional Requirements
- Depletion calculated in `tickGolems()` when golem returns
- Depletion calculated in `loadGame()` offline progress simulation
- Use existing `log()` function for depletion events
- Use existing `renderZones()` for UI updates
- Filter depleted zones in `renderZones()` (don't render if total === 0)

### Hard Rules
- ❌ Never modify ZONES constant structure (still use for initial state)
- ❌ Never break existing save/load compatibility (handle old saves gracefully)
- ❌ Never allow negative resource pools (Math.max(0, ...))
- ❌ Zone depletion is permanent (no regeneration in this version)
- ✅ **UPDATE RENDERING MUST NOT FAIL** - All rendering functions must handle depleted/missing zones gracefully (no undefined errors, no crashes)
- ✅ Defensive checks: always verify zone exists before accessing properties
- ✅ If zone is undefined/null, skip rendering that zone (fail silently)

---

## FORMAT

All changes in game.js following existing patterns:

### 1. ZONES Initialization (after line 31)
- Add `initializeZoneResources()` function
- Called once to set up resourcePool for each zone
- Structure: `zone.resourcePool = { total: number, byType: {...} }`

### 2. tickGolems() Modification (~line 274-316)
- When golem returns with resources (line 302-313)
- Deduct gathered amount from `zone.resourcePool.total`
- Deduct from `byType` for each resource
- Check if any individual resource = 0 → log warning
- Check if total = 0 → log depletion, mark zone
- Trigger `renderZones()` if depletion occurred

### 3. renderZones() Modification (~line 393-458)
- Filter zones: `ZONES.filter(z => z.resourcePool.total > 0)`
- Add resource display in zone header
- Format: `<span class="zone-resources">${fmtResources(zone.resourcePool.total)}</span>`
- Show between danger indicator and yields

### 4. loadGame() Modification (~line 828-893)
- Initialize resourcePool if missing (legacy save support)
- During offline progress (line 864-889):
  * Deduct resources from `zone.resourcePool.total`
  * Check depletion after each trip
  * Stop simulating trips if zone depletes

### 5. saveGame() Modification (~line 811-826)
- Add `zonePools: ZONES.map(z => ({id: z.id, resourcePool: z.resourcePool}))`
- Persist depletion state

### 6. New Helper Functions
- `fmtResources(num)` - Format with "k" suffix
  * ≥1000: return `(num/1000).toFixed(1)+"k"` (e.g., "5.2k")
  * <1000: return `num.toString()` (e.g., "847")
- `initializeZoneResources()` - Set up initial pools
- `depleteZone(zoneId)` - Mark zone as depleted, log event

### 7. CSS Addition (style.css)
- `.zone-resources` class for styling resource display
- Color: `var(--amber)` when >1000, `var(--red)` when <1000

### Estimated Lines Changed
- ~15 lines: `initializeZoneResources()` + `fmtResources()`
- ~10 lines: `tickGolems()` depletion logic
- ~5 lines: `renderZones()` filter + display
- ~12 lines: `loadGame()` offline depletion
- ~3 lines: `saveGame()` persist pools
- ~5 lines: CSS
- **Total: ~50 lines of new/modified code**

---

## FAILURE CONDITIONS

The output is UNACCEPTABLE if:

### UI/Display Issues
- ❌ Zone does NOT show resource depletion amount (must display "100k", "5.2k", "847" format)
- ❌ Zone is NOT removed from UI when depleted (depleted zones must disappear completely)
- ❌ Resource display formatting is wrong (must use "k" suffix for ≥1000, exact number for <1000)

### Gameplay Logic Issues
- ❌ Golem CAN access a depleted zone (must prevent assignment/gathering when pool = 0)
- ❌ Zone STOPS giving resources when it STILL HAS resources (gathering must work until pool reaches exactly 0)
- ❌ Zone depletion is NOT permanent (depleted zones must stay depleted after refresh)

### Logging Issues
- ❌ Does NOT log when a specific resource type runs out (must log events like "Whispering Forest is running low on clay")
- ❌ Does NOT log when zone is fully depleted (must log "[Zone Name] has been depleted")
- ❌ Logs incorrect depletion events (don't log if zone still has resources)

### Technical Issues
- ❌ Rendering crashes when zone is depleted (must handle missing zones gracefully)
- ❌ Save/load doesn't persist depletion state (depleted zones must stay depleted after reload)
- ❌ Offline progress doesn't account for depletion (resources gathered offline must reduce pools)
- ❌ Resource pool goes negative (must clamp to 0 minimum)
- ❌ Old saves crash the game (must initialize resourcePool for legacy saves)

### Performance Issues
- ❌ Game loop slows down with depletion calculations (must be efficient, no noticeable performance hit)

---

## IMPLEMENTATION NOTES

### Key Changes
1. Non-destructive ZONES modification (add properties, don't change structure)
2. Backward-compatible save/load (old saves get initialized with full pools)
3. Defensive rendering (handle missing/undefined zones)
4. Efficient depletion tracking (single total counter + per-type breakdown)

### Testing Checklist
- [ ] Fresh game starts with zones showing "100k"
- [ ] Golem gathering reduces zone pool by correct amount
- [ ] Zone shows formatted numbers correctly (5.2k, 847)
- [ ] Zone disappears when depleted
- [ ] Event log shows depletion message
- [ ] Refresh persists depleted state
- [ ] Old saves load without crashing
- [ ] Offline progress depletes zones correctly
- [ ] Performance unchanged

---

**Contract approved and ready for execution.**
