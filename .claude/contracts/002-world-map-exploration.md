# Contract #002: World Map Exploration System

**Date:** 2026-03-20
**Status:** APPROVED
**Estimated Lines:** ~370 lines

---

## GOAL

**What success looks like:**
- New "🗺️ World" button appears in left panel (in special menu for map features)
- Clicking it hides main UI, shows full-screen map view with "← Back to Workshop" button
- Map displays 3x3 grid (9 tiles total):
  ```
  [Fogged] [Zone?]  [Fogged]
  [Zone?]  [🏭 WS]  [Zone?]
  [Fogged] [Zone?]  [Fogged]
  ```
- **Workshop tile** (center, position [1,1]) always visible, shows 🏭 icon + "Workshop" label, clickable to return to main UI
- **5 discovered tiles** (adjacent cross pattern) randomly assigned existing zone types:
  - Positions: [0,1] top, [1,0] left, [1,2] right, [2,1] bottom, and one diagonal
  - Random assignment from: Forest (🌲), Mine (⛏️), Swamp (🐸), Ruins (🏛️), Volcano (🌋)
  - Each shows zone icon + name + resource pool (formatted like zones panel)
- **3 fogged tiles** (remaining corners/diagonal) show "❓" icon + "Unexplored"
  - Clickable to start exploration
- **Alchemist exploration system:**
  - Click fogged tile → alchemist becomes "exploring" state
  - **Blocks all other actions:** Can't manually gather, can't explore other tiles
  - Exploration time = `distance × 10s` (adjacent=1=10s, diagonal=1.4=14s, corner=2=20s)
  - Shows countdown timer on tile: "Exploring... 14s"
  - **Cancel button** appears: "✖ Cancel Exploration"
    - Clicking cancel → alchemist returns to workshop
    - Return time = same distance × 10s (no instant cancel)
    - Shows "Returning... 14s" during return trip
    - Tile stays fogged (exploration failed)
  - On successful completion: tile reveals as random zone type
    - Resource pool formula: `basePool × (1 + distance × 0.5)`
    - Example: corner tile (distance 2) = 100k × 2.0 = 200k resources
    - Zone type: random pick from [Forest, Mine, Swamp, Ruins, Volcano]
    - Newly revealed zone uses SAME icon/yields as original zone type
    - Fade-in animation (0.3s) on reveal
- **Persistence:** Map state saved to localStorage:
  - Which tiles are explored vs fogged
  - Zone type assignment for each explored tile
  - Resource pools for newly discovered zones
  - Current exploration state (if exploring when page closes)
- **UI integration:** Newly discovered zones do NOT appear in main zones panel (deferred)
- **Event log:** Exploration start/cancel/complete logged with messages

**Success criteria:**
Success = click "🗺️ World" → see 3x3 grid → center shows 🏭 → 5 random tiles show zone icons (e.g., 🌲⛏️🐸🏛️🌋) → 3 tiles show ❓ → click corner ❓ → see "Exploring... 20s" + Cancel button → alchemist can't gather manually → wait 20s → tile reveals as random zone (e.g., 🌲 "Whispering Forest" 200.0k) with fade-in animation → refresh page → map persists (tile still shows 🌲 200.0k, alchemist idle) → click another fogged tile → click Cancel during countdown → see "Returning... 14s" → wait → alchemist idle, tile still fogged → click 🏭 Workshop tile → returns to main UI

---

## CONSTRAINTS

### Tech Stack Constraints
- ✅ Pure vanilla JavaScript (ES6+) - no frameworks
- ✅ All code in `game.js` (single-file architecture)
- ✅ CSS in `style.css` (terminal/ASCII theme)
- ✅ LocalStorage for map state persistence
- ✅ Existing game loop with `requestAnimationFrame`

### Data Structure Constraints
- ✅ Add to global state `G`:
  - `G.worldMap` - Map state object
  - `G.alchemistState` - Exploration state ("idle" | "exploring" | "returning")
  - `G.explorationTarget` - Current tile being explored (null when idle)
  - `G.explorationEndTime` - Timestamp for exploration/return completion
  - `G.currentView` - View mode ("workshop" | "worldmap")
- ✅ Map grid stored as 2D array (3x3): `G.worldMap.tiles[row][col]`
- ✅ Each tile object structure:
  ```javascript
  {
    explored: boolean,
    zoneType: string | null,  // "forest" | "mine" | "swamp" | "ruins" | "volcano" | "workshop"
    resourcePool: { total: number, byType: {...} } | null,
    position: [row, col],
    distance: number  // from workshop (Pythagorean)
  }
  ```

### Game Mechanics Constraints
- ✅ Workshop tile: always `explored: true`, `zoneType: "workshop"`, position `[1,1]`, distance `0`
- ✅ Initial 5 zones: randomly assigned to cross pattern positions
  - Positions: `[0,1], [1,0], [1,2], [2,1]` + one random diagonal from `[[0,0], [0,2], [2,0], [2,2]]`
  - Random shuffle of: `["forest", "mine", "swamp", "ruins", "volcano"]`
- ✅ Distance calculation: `Math.sqrt((row-1)² + (col-1)²)` rounded to 1 decimal
  - Adjacent (cross) = 1.0
  - Diagonal = 1.4
  - Corner = 2.0
- ✅ Exploration time formula: `Math.ceil(distance × 10)` seconds
- ✅ Return time formula: Same as exploration (distance × 10)
- ✅ Resource pool formula: `Math.floor(basePool × (1 + distance × 0.5))`
  - Use existing zone base pools from ZONES constant
- ✅ Zone type on reveal: `randomFrom(["forest", "mine", "swamp", "ruins", "volcano"])`
- ✅ NO resource cost to explore
- ✅ NO XP/rewards beyond discovering the zone

### UI/Rendering Constraints
- ✅ View mode system: `G.currentView = "workshop" | "worldmap"`
- ✅ When worldmap view active:
  - Hide: `#workshop-panel`, `#zones-panel`, entire center/right panels
  - Show: `#worldmap-panel` (new full-screen panel)
- ✅ When workshop view active:
  - Hide: `#worldmap-panel`
  - Show: normal game UI
- ✅ Map rendered as 3×3 CSS grid with gap
- ✅ Each tile is a card showing:
  - **Workshop tile:** 🏭 icon + "Workshop" + clickable to return to workshop view
  - **Explored zone tiles:** Zone icon + name + resource count (formatted with `fmtResources()`)
  - **Fogged tiles:** ❓ icon + "Unexplored" text + clickable when alchemist idle
  - **Exploring tiles:** Countdown timer + "Exploring..." + Cancel button
  - **Returning tiles:** Countdown timer + "Returning..." (no cancel)
- ✅ Map button in left panel: Add new section "🌍 World Features" with "🗺️ World Map" button
- ✅ Simple reveal animation: CSS opacity fade-in (0.3s) when tile becomes explored

### State Management Constraints
- ✅ Block manual gathering when `G.alchemistState !== "idle"`
  - Add check in `alchemistGather()` function
  - Show message: "Can't gather while exploring!"
- ✅ Block exploration start if already exploring/returning
- ✅ Only ONE exploration at a time (no queue)
- ✅ Exploration state transitions:
  - `idle` + click fogged tile → `exploring` (set endTime, target, log)
  - `exploring` + time expires → reveal tile, set alchemist `idle`, log
  - `exploring` + click cancel → `returning` (set new endTime, clear target, log)
  - `returning` + time expires → `idle`, log
- ✅ Workshop tile click → switch to `G.currentView = "workshop"`

### Save/Load Constraints
- ✅ Add to `saveGame()`:
  - `worldMap: G.worldMap`
  - `alchemistState: G.alchemistState`
  - `explorationTarget: G.explorationTarget`
  - `explorationEndTime: G.explorationEndTime`
  - `currentView: G.currentView`
- ✅ On `loadGame()`:
  - Restore map state or initialize with default map
  - Handle in-progress exploration:
    - If `explorationEndTime < Date.now()` → complete action immediately
    - If `explorationEndTime > Date.now()` → resume countdown
  - Always reset view to "workshop" on load

### Event Log Constraints
- ✅ Log exploration start: `"🗺️ Exploring [direction] from workshop..."` (e.g., "northeast corner")
- ✅ Log exploration complete: `"✅ Discovered ${zone.name}! (${fmtResources(pool)} resources)"` (type: "great")
- ✅ Log exploration canceled: `"⚠️ Exploration canceled. Returning to workshop..."` (type: "warn")
- ✅ Log return complete: `"🏠 Returned safely to workshop."` (type: "info")

### Hard Rules (Must Not Break)
- ❌ Do NOT modify existing ZONES constant
- ❌ Do NOT integrate worldmap zones into main zones panel
- ❌ Do NOT allow golem assignment to worldmap zones
- ❌ Do NOT break existing game loop, tick functions, or render functions
- ❌ Do NOT allow multiple simultaneous explorations
- ❌ Manual gathering must be BLOCKED during exploration/return
- ❌ View must reset to "workshop" on page load (don't persist worldmap view)

### Performance Constraints
- ✅ Only render worldmap when `G.currentView === "worldmap"`
- ✅ Use existing game loop for countdown updates
- ✅ Create new `tickExploration(now)` function (called from game loop)
- ✅ Partial countdown updates (update timer text only, not full re-render)

### CSS/Styling Constraints
- ✅ Follow terminal/ASCII theme (existing color palette)
- ✅ Tile cards use existing `.zone-card` styling patterns
- ✅ Fog reveal animation: CSS transition on opacity
- ✅ Grid layout: `display: grid; grid-template-columns: repeat(3, 1fr);`
- ✅ Tile hover effect for clickable tiles
- ✅ Disabled styling for non-clickable fogged tiles (when exploring)

---

## FORMAT

All changes in `game.js`, `index.html`, and `style.css` following existing patterns:

### 1. Global State Additions (game.js, after line ~122)
```javascript
// World Map State
G.worldMap = null;  // Initialized on first load
G.alchemistState = "idle";  // "idle" | "exploring" | "returning"
G.explorationTarget = null;  // { row, col } or null
G.explorationEndTime = null;  // timestamp or null
G.currentView = "workshop";  // "workshop" | "worldmap"
```

### 2. Map Initialization Function (game.js, after ZONES ~line 55)
**Function:** `initializeWorldMap()` (~40 lines)
- Creates 3×3 grid with workshop at center
- Randomly assigns 5 existing zones to cross + 1 diagonal
- Sets 3 remaining tiles as fogged
- Calculates distance for each tile

### 3. Exploration Functions (game.js, new section, ~100 lines total)
- `startExploration(row, col)` (~20 lines)
- `cancelExploration()` (~15 lines)
- `completeExploration()` (~25 lines)
- `completeReturn()` (~10 lines)
- `tickExploration(now)` (~15 lines)
- `getDirectionLabel(row, col)` (~15 lines)

### 4. View Switching Functions (game.js, ~30 lines total)
- `showWorldMap()` (~10 lines)
- `showWorkshop()` (~10 lines)

### 5. Render Function (game.js, ~110 lines)
- `renderWorldMap()` (~80 lines)
- `renderTile(tile, row, col)` (~30 lines)

### 6. Modified Functions (game.js)
- `alchemistGather()` - Add state check (~3 lines)
- `gameLoop()` - Add `tickExploration(now)` call (~1 line)
- `saveGame()` - Add worldmap state (~5 lines)
- `loadGame()` - Restore/initialize worldmap (~15 lines)
- `setupEventDelegation()` - Add worldmap actions (~4 lines)

### 7. HTML Additions (index.html)
- Left panel: New "🌍 World Features" section with button (~8 lines)
- New `#worldmap-panel` container (~2 lines)

### 8. CSS Additions (style.css, ~60 lines)
- `#worldmap-panel` styling
- `.worldmap-grid` (3×3 grid layout)
- `.worldmap-tile` (card styling)
- `.worldmap-tile.clickable` (hover effects)
- `.worldmap-tile.revealed` (fade-in animation)
- `@keyframes fadeIn`

### Estimated Line Counts
- **game.js:** ~300 new/modified lines
- **index.html:** ~10 lines
- **style.css:** ~60 lines
- **Total: ~370 lines**

---

## FAILURE CONDITIONS

The output is **UNACCEPTABLE** if:

### UI/Display Issues
- ❌ "🗺️ World Map" button does NOT appear in left panel
- ❌ World Map button does NOT change the UI when clicked (view stays on workshop)
- ❌ Map view does NOT show "← Back to Workshop" button
- ❌ Back button does NOT return to main UI when clicked (stuck on map view)
- ❌ Workshop tile is NOT clickable in map view
- ❌ Clicking workshop tile does NOT return to main UI
- ❌ Map grid is not 3×3 (wrong layout)
- ❌ Workshop is not in center position [1,1]
- ❌ Initial 5 zones are not randomly placed in cross + diagonal pattern
- ❌ Fogged tiles don't show ❓ icon or "Unexplored" text
- ❌ Explored zones don't show zone icon, name, or resource count

### Exploration Logic Issues
- ❌ Alchemist CAN manually gather while exploring (must be blocked)
- ❌ Alchemist CAN start multiple explorations simultaneously (must allow only one)
- ❌ Alchemist CAN perform other actions while exploring/returning
- ❌ When exploration finishes, new zone does NOT appear on the tile (tile stays fogged)
- ❌ Revealed tile shows wrong zone type or no icon
- ❌ Resource pool calculation is wrong (doesn't scale with distance)
- ❌ Exploration time doesn't match distance formula (distance × 10s)

### Animation/UX Issues
- ❌ Fade-in animation does NOT play when tile is revealed
- ❌ No visual feedback when clicking fogged tile (exploration doesn't start)
- ❌ Countdown timer doesn't update during exploration
- ❌ Cancel button doesn't appear during exploration

### Cancellation Issues
- ❌ Clicking Cancel does NOT start return trip (alchemist stuck exploring)
- ❌ On cancel, alchemist does NOT return (stays in exploring state)
- ❌ On cancel, return time is instant (should equal distance × 10s)
- ❌ On cancel, zone IS discovered (must stay fogged on cancellation)
- ❌ Cancel button appears during return trip (should only show during exploring)

### State Management Issues
- ❌ Multiple tiles can be explored at once (violates "one at a time" rule)
- ❌ Exploration state is lost on page refresh (doesn't persist)
- ❌ In-progress exploration doesn't resume after reload
- ❌ Alchemist state is not saved/loaded correctly
- ❌ View persists as "worldmap" on reload (must reset to "workshop")

### Data Persistence Issues
- ❌ Map state (explored tiles, zone types, resources) is NOT saved to localStorage
- ❌ Refreshing page resets map to initial state (loses progress)
- ❌ Newly discovered zones lose their resource pools on reload
- ❌ Zone type assignments change randomly on each reload

### Integration Issues
- ❌ Existing game loop breaks (golems stop working, alchemy stops)
- ❌ Manual gathering breaks entirely (not just blocked during exploration)
- ❌ Main UI panels don't hide when worldmap view is active
- ❌ Worldmap panel doesn't hide when workshop view is active
- ❌ Event log doesn't show exploration/discovery/cancel messages

### Edge Cases
- ❌ Clicking already-explored tile starts new exploration
- ❌ Clicking workshop tile while exploring cancels exploration (should not)
- ❌ Distance calculation is wrong (non-Pythagorean or not rounded)
- ❌ Resource pool formula allows negative or zero resources
- ❌ Exploration can start when alchemist is returning
- ❌ Game crashes when worldmap is null/undefined

### Performance Issues
- ❌ Map renders when view is "workshop" (wasted rendering)
- ❌ Full map re-renders every frame instead of just countdown updates
- ❌ Event listeners not using delegation (creates memory leaks)

---

**Contract approved and ready for execution.**
