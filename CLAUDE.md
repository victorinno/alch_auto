# Alchemist's Automatons - Project Documentation

## Project Overview
**Alchemist's Automatons** is an idle automation RPG game where players craft golems to gather resources from various zones while brewing potions and upgrading their workshop. Built with pure HTML, CSS, and JavaScript with no dependencies.

**Live Demo:** [GitHub Pages](https://victorinno.github.io/alch_auto/)

## Tech Stack
- Pure HTML5
- CSS3 (Terminal/ASCII theme)
- Vanilla JavaScript (ES6+)
- LocalStorage for save/load functionality
- No external dependencies or frameworks

## Project Structure
```
alch_auto/
├── index.html          # Main HTML structure
├── game.js             # Core game logic (966 lines)
├── style.css           # Terminal-themed styles
├── _roster_patch.js    # Roster rendering patch
└── README.md           # Project readme
```

## Core Game Systems

### 1. Resource System
**Location:** [game.js:12-21](game.js#L12-L21)

8 resource types tracked in `G.resources`:
- **Gold Coins** - Currency for crafting/upgrades
- **Arcane Essence** - Advanced crafting material
- **Wild Herbs** - Basic gathering resource
- **Mana Crystals** - Magic resource
- **Iron Ore** - Metal for golem crafting
- **Moonstone** - Rare advanced resource
- **Sulfur** - Volcanic/swamp resource
- **Clay** - Basic golem building material

Each resource has icon, name, and color properties.

### 2. Zone System
**Location:** [game.js:25-31](game.js#L25-L31)

5 explorable zones with different yields and danger levels:

| Zone | Danger | Max Slots | Yields |
|------|--------|-----------|--------|
| Whispering Forest | 0 (Safe) | 3 | clay, herbs, crystals |
| Iron Depths | 1 (Low) | 3 | iron, crystals |
| Sulfur Swamp | 1 (Low) | 2 | sulfur, herbs |
| Ancient Ruins | 2 (Medium) | 2 | moonstone, essence |
| Ember Volcano | 3 (High) | 1 | sulfur, moonstone |

**Key Features:**
- `maxSlots`: Maximum golems that can work simultaneously
- `danger`: Required danger resistance level for golem access
- `yields`: Array of resources available in zone

### 3. Golem System
**Location:** [game.js:33-42](game.js#L33-L42)

4 golem tiers with progressive stats:

| Type | Tier | Speed | Capacity | Danger Resist | Cost |
|------|------|-------|----------|---------------|------|
| Clay Golem | 1 | 8s | 4 | 0 | clay:5, herbs:3 |
| Iron Golem | 2 | 6s | 7 | 1 | iron:6, crystals:4, gold:30 |
| Crystal Golem | 3 | 4s | 12 | 2 | crystals:10, essence:8, gold:80 |
| Moon Golem | 4 | 3s | 18 | 3 | moonstone:8, essence:15, gold:200 |

**Golem States:**
- `idle` - Available for assignment
- `traveling` (out) - Going to zone
- `gathering` - Collecting resources (3s)
- `traveling` (back) - Returning with resources

**Golem Properties:**
- `danger_resist` - Base + upgrades
- `bonus_capacity` - Extra slots from upgrades
- `speed_mult` - Speed multiplier from upgrades
- `upgrades[]` - Array of purchased upgrade IDs

### 4. Golem Upgrade System
**Location:** [game.js:73-82](game.js#L73-L82)

Individual golem upgrades (purchasable when idle):

| Upgrade | Effect | Max Level | Cost |
|---------|--------|-----------|------|
| Reinforced Shell | +1 Danger Resist | 1 | clay:8, crystals:4 |
| Iron Plating | +1 Danger Resist | 1 | iron:6, gold:40 |
| Arcane Plating | +1 Danger Resist | 1 | crystals:8, essence:6 |
| Satchel | +3 Capacity | 3 | herbs:8, gold:20 |
| Swift Legs | 20% faster travel | 2 | crystals:5, gold:30 |

**Implementation:** [game.js:233-253](game.js#L233-L253)
- Golems must be idle to upgrade
- Tier requirements must be met
- Multiple levels can be purchased up to maxLevel
- Effects apply immediately via `effect(golem)` function

### 5. Alchemy System
**Location:** [game.js:44-56](game.js#L44-L56)

7 brewing recipes across 4 tiers:
- **Tier 0** (unlocked from start): Herb Tonic, Crystal Dust, Healing Potion
- **Tier 1** (Workshop Lvl 1): Golem Oil, Mana Elixir
- **Tier 2** (Workshop Lvl 2): Philosopher's Draft
- **Tier 3** (Workshop Lvl 3): Soul Crystal

**Queue System:**
- Maximum 3 concurrent brewing jobs
- Time-based completion with progress bars
- Produces Gold and/or Essence

**Key Functions:**
- `startAlchemy(recipeId)` - [game.js:322-334](game.js#L322-L334)
- `tickAlchemy(now)` - [game.js:336-356](game.js#L336-L356)

### 6. Workshop Upgrade System
**Location:** [game.js:84-90](game.js#L84-L90)

4 workshop levels increasing max golems:
- **Level 0** - Novice Lab (3 golems)
- **Level 1** - Journeyman Lab (6 golems) - Cost: gold:60, crystals:8
- **Level 2** - Adept Lab (12 golems) - Cost: gold:180, essence:12, crystals:6
- **Level 3** - Master Lab (25 golems) - Cost: gold:500, moonstone:5, essence:20

**Global Upgrades:** [game.js:58-71](game.js#L58-L71)
- Better Furnace (25% faster alchemy)
- Forest Knowledge (+2 capacity for forest golems)
- Golem Beacon (+2 capacity all golems)
- Arcane Compass (20% faster golem travel)
- Essence Condenser (+50% essence production)
- Master Blueprint (25% cheaper golem crafting)
- Zone Expansion (+1 slot per zone)
- Lunar Attunement (Moon Golems gather from all zones)

### 7. Alchemist Manual Gathering
**Location:** [game.js:734-786](game.js#L734-L786)

Player can manually gather resources with 8s cooldown per zone:
- Gathers 1-2 random resources from zone
- No danger requirement
- Useful for bootstrapping early game
- Cooldown tracked per zone in `ALCHEMIST_COOLDOWNS`

## Game State Management

### Global State Object (G)
**Location:** [game.js:105-122](game.js#L105-L122)

```javascript
const G = {
  resources: {},           // Resource inventory
  golems: [],             // Array of golem objects
  nextGolemId: 1,         // Auto-increment ID
  workshopLevel: 0,       // Current workshop tier
  alchemyQueue: [],       // Active brewing jobs
  alchemySpeedMult: 1,    // Speed modifier
  golemSpeedMult: 1,      // Global golem speed
  golemBonusCapacity: 0,  // Global capacity bonus
  essenceMult: 1,         // Essence production multiplier
  craftCostMult: 1,       // Crafting cost multiplier
  lunarAttunement: false, // Moon golem special ability
  totalTime: 0,           // Total play time in seconds
  prestigeCount: 0,       // Future feature
  eventLog: [],           // Game event history
  lastSave: Date.now()
}
```

### Save/Load System
**Location:** [game.js:811-893](game.js#L811-L893)

**Save:** [game.js:811-826](game.js#L811-L826)
- Triggered every 30 seconds automatically
- Also saves on critical actions (craft, upgrade, dismantle)
- Stores to `localStorage` as JSON

**Load:** [game.js:828-893](game.js#L828-L893)
- Restores game state
- Calculates offline progress for golems
- Simulates completed trips based on time away
- Applies saved upgrades via `effect()` functions

**Offline Progress:**
- Calculates completed round trips: `trips = elapsed / (tripTime*2+3)`
- Simulates resource gathering for each trip
- Logs trips made while away

## UI/Rendering System

### Main Layout
**Location:** [index.html:45-101](index.html#L45-L101)

Three-panel layout:
1. **Left Panel** - World map (ASCII art) + Event Log
2. **Center Panel** - Workshop with all management systems
3. **Right Panel** - Zone assignment interface

### Key Render Functions

**renderZones()** - [game.js:393-458](game.js#L393-L458)
- Renders zone cards with slots
- Shows occupied slots with golem info
- Empty slots display "next eligible golem" with Send button
- Auto-assigns first eligible golem (by danger resist)

**renderGolemRoster()** - [game.js:476-538](game.js#L476-L538) & [_roster_patch.js](_roster_patch.js)
- Displays all golems with status
- Shows upgrade options when idle
- Color-coded danger resist badges
- Expandable upgrade section per golem

**renderResources()** - [game.js:580-591](game.js#L580-L591)
- Displays all resource counts
- Color-coded amounts

**renderRecipes()** - [game.js:593-628](game.js#L593-L628)
- Shows golem crafting recipes
- Highlights missing resources in red
- Shows clear blocking reasons (level, slots, resources)

**renderAlchemy()** - [game.js:630-664](game.js#L630-L664)
- Active queue with progress bars
- Available recipes with cost/production

**renderUpgrades()** - [game.js:666-689](game.js#L666-L689)
- Workshop upgrade button
- Global upgrade cards

**renderAll()** - [game.js:719-729](game.js#L719-L729)
- Full UI refresh helper

### Progress Bar System
**Location:** [game.js:544-574](game.js#L544-L574)

Real-time progress updates via `tickProgressBars(now)`:
- Golem travel/gathering progress
- Alchemy brewing progress
- Updates every frame via requestAnimationFrame

## Game Loop

**Location:** [game.js:899-920](game.js#L899-L920)

```javascript
function gameLoop() {
  const now = Date.now();
  const delta = now - lastTick;

  tickGolems(now);      // Update golem states
  tickAlchemy(now);     // Complete finished recipes
  tickProgressBars(now); // Update all progress bars

  // Auto-save every 30s
  if (Math.floor(G.totalTime) % 30 === 0) saveGame();

  requestAnimationFrame(gameLoop);
}
```

**tickGolems()** - [game.js:274-316](game.js#L274-L316)
- Checks all golems for state transitions
- Handles: out→gathering, gathering→back, back→idle
- Distributes gathered resources randomly
- Updates UI on state changes

**tickAlchemy()** - [game.js:336-356](game.js#L336-L356)
- Checks queue for completed jobs
- Awards resources with multipliers
- Removes completed jobs from queue

## Event System

**Location:** [game.js:926-951](game.js#L926-L951)

Event delegation on `#app`:
- Single event listener for all buttons
- Uses `data-action` attributes for routing
- Handles: assign, recall, craft, brew, upgrade, destroy, etc.

**Event Log:** [game.js:156-161](game.js#L156-L161)
- Max 80 entries
- Types: info, good, warn, great
- Timestamped with `toLocaleTimeString()`

## Styling System

**Theme:** Terminal/ASCII aesthetic
- Font: 'Share Tech Mono' (monospace)
- Color scheme: Green terminal with amber accents
- Custom scrollbars
- Progress bar animations

**CSS Variables:** [style.css:8-23](style.css#L8-L23)
```css
--bg, --bg2, --bg3     /* Background layers */
--green, --amber, --red /* Primary colors */
--text, --text-dim     /* Text colors */
--border               /* UI borders */
```

## Utility Functions

**Location:** [game.js:128-161](game.js#L128-L161)

- `fmt(n)` - Format large numbers (K, M)
- `fmtTime(s)` - Format seconds to h:m:s
- `canAfford(costs, mult)` - Check resource availability
- `spend(costs, mult)` - Deduct resources
- `gain(rewards, mult)` - Add resources
- `randomFrom(arr)` - Random array element
- `log(msg, type)` - Add event log entry

## Key Game Mechanics

### Golem Assignment Flow
1. Player clicks "Send" on empty zone slot
2. System finds first eligible idle golem (danger_resist >= zone.danger)
3. `assignGolemToZone(golemId, zoneId)` called
4. Golem state → "traveling" (out phase)
5. After speed seconds → "gathering" (3s fixed)
6. Random resources collected (capacity + bonuses)
7. Golem state → "traveling" (back phase)
8. After speed seconds → "idle", resources added to G.resources

### Progression Path
1. **Start:** 8 clay, 5 herbs → Craft Clay Golem
2. **Early:** Send to Whispering Forest for herbs/crystals/clay
3. **Mid:** Brew Herb Tonics for gold → upgrade Workshop
4. **Mid:** Mine iron → craft Iron Golems → access Swamp/Mine
5. **Late:** Gather moonstone from Ruins → craft Crystal/Moon Golems
6. **Endgame:** Upgrade golems individually, unlock all zones, max workshop

### Balance Points
- Forest is only zone yielding clay (golem crafting material)
- Gold comes primarily from alchemy
- Essence requires either alchemy or Ruins access
- Danger system gates content behind golem upgrades/tiers

## Recent Changes (from git log)

1. **Auto-assign golem on Send click** (23b9462)
   - Removed dropdown, replaced with automatic first-eligible selection
   - Shows "next golem" info in empty slots

2. **Golem individual upgrades** (f603212)
   - Added 5 upgrade types per golem
   - Danger resist, capacity, speed improvements
   - Multi-level upgrades (Satchel x3, Swift Legs x2)

3. **Save on upgrade/craft/dismantle** (e20f4ee)
   - Prevents loss on page refresh
   - Zone slot tracking uses golem.danger_resist

4. **Workshop Level 2 rebalance** (04ed3e4)
   - Removed iron requirement (too scarce early)

5. **Clear craft blocking reasons** (6268e8e)
   - Shows why golem can't be crafted
   - Highlights missing resources in red

## Architecture Patterns

### State Management
- Single global state object `G`
- Immutable constants (RESOURCES, ZONES, GOLEM_TYPES)
- Mutation only through dedicated functions (craft, assign, upgrade)

### Rendering Strategy
- Declarative HTML string building
- Full re-renders on state change
- Partial updates for progress bars (performance)
- Event delegation for all interactions

### Time-Based Systems
- `Date.now()` for all timing
- Delta calculations for offline progress
- Progress percentages: `(now - start) / (end - start) * 100`

### Save/Load Pattern
- Serialize state to JSON
- Restore + reapply effects on load
- Backwards compatibility (default values with ||)
- Offline progress simulation

## Development Notes

### Adding New Resources
1. Add to `RESOURCES` object with icon/color
2. Update zones `yields` arrays
3. Add to `G.resources` default object
4. Update relevant recipes/costs

### Adding New Zones
1. Add to `ZONES` array with yields/danger/maxSlots
2. Create ASCII art in `ASCII_MAPS`
3. No code changes needed (system is data-driven)

### Adding New Golem Types
1. Add to `GOLEM_TYPES` with stats/cost/unlock
2. No code changes needed (fully data-driven)

### Adding New Recipes
1. Add to `ALCHEMY_RECIPES` with ingredients/produces/time
2. Set `requiresLevel` for unlock progression
3. No code changes needed

### Adding New Upgrades
1. Add to `UPGRADES` or `GOLEM_UPGRADES` array
2. Define `effect` function that mutates G or golem
3. Save/load will automatically handle persistence

## Testing Checklist

- [ ] Craft all golem types
- [ ] Assign to all zones
- [ ] Verify danger resist blocking
- [ ] Test offline progress (close/reopen)
- [ ] Brew all recipes
- [ ] Purchase all upgrades
- [ ] Upgrade individual golems
- [ ] Test manual gathering cooldowns
- [ ] Verify save/load persistence
- [ ] Test zone slot limits
- [ ] Test workshop level progression
- [ ] Test resource math (spend/gain)
- [ ] Test golem recall functionality
- [ ] Test golem dismantle refund

## Performance Considerations

- Event delegation (1 listener vs N buttons)
- Partial updates for progress bars
- Efficient array filters for golem queries
- LocalStorage only every 30s (not every frame)
- Limit event log to 80 entries
- Use `requestAnimationFrame` for smooth rendering

## Browser Compatibility

- Modern browsers with ES6+ support
- LocalStorage required for save/load
- No polyfills or transpilation
- Works offline (no external dependencies)

## Future Enhancement Ideas

- Prestige system (G.prestigeCount exists)
- More golem types/tiers
- Zone unlock progression
- Achievements system
- Sound effects
- Animation improvements
- Mobile-responsive improvements
- Export/import save data
- Statistics tracking
- Golem personality/naming
- Random events system

## Bug Fixes Applied

1. **Render recipes on alchemy complete** - Ensures UI updates when resources change
2. **Workshop Lvl2 cost** - Removed iron requirement that blocked progression
3. **Golem craft blocking reasons** - Clear feedback why craft is disabled
4. **Save on upgrade** - Prevents data loss on refresh
5. **Zone slot danger check** - Uses individual golem danger_resist not base type

---

**Last Updated:** 2026-03-20
**Game Version:** Based on commit 23b9462
