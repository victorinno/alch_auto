/* =====================================================
   ALCHEMIST'S AUTOMATONS — Game Logic
   Idle / Automation RPG — Zone-based golem management
   ===================================================== */

"use strict";

// ─────────────────────────────────────────────────────
// CONSTANTS & DATA
// ─────────────────────────────────────────────────────

const RESOURCES = {
  gold:       { name: "Gold Coins",      icon: "🪙", color: "#ffb300" },
  essence:    { name: "Arcane Essence",  icon: "✨", color: "#cc88ff" },
  herbs:      { name: "Wild Herbs",      icon: "🌿", color: "#39ff14" },
  crystals:   { name: "Mana Crystals",   icon: "💎", color: "#44aaff" },
  iron:       { name: "Iron Ore",        icon: "⚙️",  color: "#aaaaaa" },
  moonstone:  { name: "Moonstone",       icon: "🌙", color: "#ddeeff" },
  sulfur:     { name: "Sulfur",          icon: "🔥", color: "#ff8800" },
  clay:       { name: "Clay",            icon: "🧱", color: "#cc7744" },
  condensed_knowledge_alchemy: { name: "Condensed Knowledge (Alchemy)", icon: "💧", color: "#4488ff" },
  prepared_knowledge_alchemy:  { name: "Prepared Knowledge (Alchemy)",  icon: "⚗️", color: "#aa66ff" },
  philosophers_draft:          { name: "Philosopher's Draft",           icon: "🧪", color: "#ff6688" },
  soul_crystal:                { name: "Soul Crystal",                  icon: "💠", color: "#ffddff" },
};

// maxSlots = max golems that can work this zone simultaneously
// Forest yields clay+herbs+crystals so player can bootstrap from scratch
const ZONES = [
  { id: "forest",  name: "Whispering Forest", icon: "🌲", ascii: "forest",  yields: ["clay","herbs","crystals"], danger: 0, maxSlots: 3 },
  { id: "mine",    name: "Iron Depths",        icon: "⛏️",  ascii: "mine",   yields: ["iron","crystals"],         danger: 1, maxSlots: 3 },
  { id: "swamp",   name: "Sulfur Swamp",       icon: "🌫️",  ascii: "swamp",  yields: ["sulfur","herbs"],          danger: 1, maxSlots: 2 },
  { id: "ruins",   name: "Ancient Ruins",      icon: "🏛️",  ascii: "ruins",  yields: ["moonstone","essence"],     danger: 2, maxSlots: 2 },
  { id: "volcano", name: "Ember Volcano",      icon: "🌋",  ascii: "volcano",yields: ["sulfur","moonstone"],      danger: 3, maxSlots: 1 },
];

// ─────────────────────────────────────────────────────
// ZONE RESOURCE DEPLETION
// ─────────────────────────────────────────────────────

// Initialize resource pools for each zone
function initializeZoneResources() {
  const initialPools = {
    forest:  { total: 100000, byType: { clay: 50000, herbs: 30000, crystals: 20000 } },
    mine:    { total: 100000, byType: { iron: 60000, crystals: 40000 } },
    swamp:   { total: 80000,  byType: { sulfur: 50000, herbs: 30000 } },
    ruins:   { total: 60000,  byType: { moonstone: 35000, essence: 25000 } },
    volcano: { total: 40000,  byType: { sulfur: 25000, moonstone: 15000 } }
  };

  ZONES.forEach(zone => {
    if (!zone.resourcePool) {
      zone.resourcePool = initialPools[zone.id] || { total: 10000, byType: {} };
    }
  });
}

// Format resource numbers with "k" suffix
function fmtResources(num) {
  if (num >= 1000) return (num/1000).toFixed(1)+"k";
  return num.toString();
}

// ─────────────────────────────────────────────────────
// WORLD MAP INITIALIZATION
// ─────────────────────────────────────────────────────

function initializeWorldMap() {
  const tiles = [];
  const zoneTypes = ["forest", "mine", "swamp", "ruins", "volcano"];

  // Shuffle zone types
  const shuffled = [...zoneTypes].sort(() => Math.random() - 0.5);

  // Define positions: cross (4) + 1 random diagonal
  const crossPositions = [[0,1], [1,0], [1,2], [2,1]];
  const diagonalPositions = [[0,0], [0,2], [2,0], [2,2]];
  const randomDiagonal = diagonalPositions[Math.floor(Math.random() * diagonalPositions.length)];
  const discoveredPositions = [...crossPositions, randomDiagonal];

  // Assign shuffled zones to discovered positions
  let zoneIndex = 0;

  for (let row = 0; row < 3; row++) {
    tiles[row] = [];
    for (let col = 0; col < 3; col++) {
      const distance = Math.round(Math.sqrt((row-1)**2 + (col-1)**2) * 10) / 10;

      // Workshop tile (center)
      if (row === 1 && col === 1) {
        tiles[row][col] = {
          explored: true,
          zoneType: "workshop",
          resourcePool: null,
          position: [row, col],
          distance: 0
        };
      }
      // Discovered zone tiles
      else if (discoveredPositions.some(p => p[0] === row && p[1] === col)) {
        const zoneType = shuffled[zoneIndex++];
        const zone = ZONES.find(z => z.id === zoneType);
        const basePool = zone.resourcePool ? zone.resourcePool.total : 100000;
        const scaledTotal = Math.floor(basePool * (1 + distance * 0.5));

        tiles[row][col] = {
          explored: true,
          zoneType: zoneType,
          resourcePool: { total: scaledTotal, byType: {} },
          position: [row, col],
          distance: distance
        };
      }
      // Fogged tiles
      else {
        tiles[row][col] = {
          explored: false,
          zoneType: null,
          resourcePool: null,
          position: [row, col],
          distance: distance
        };
      }
    }
  }

  G.worldMap = { tiles };
}

const GOLEM_TYPES = {
  // Tier 1 — only needs clay+herbs (both from forest)
  clay:    { name: "Clay Golem",    tier: 1, ascii: " (o_o) \n [___] \n  | | ", speed: 8,  capacity: 4,  danger_resist: 0, cost: { clay: 5, herbs: 3 },                         unlock: 0 },
  // Tier 2 — needs iron (mine) + crystals (forest or mine) + gold (alchemy)
  iron:    { name: "Iron Golem",    tier: 2, ascii: " [O.O] \n |[_]| \n  | | ", speed: 6,  capacity: 7,  danger_resist: 1, cost: { iron: 6, crystals: 4, gold: 30 },             unlock: 1 },
  // Tier 3 — needs crystals + essence (from alchemy)
  crystal: { name: "Crystal Golem", tier: 3, ascii: " <*.*> \n |<_>| \n  | | ", speed: 4,  capacity: 12, danger_resist: 2, cost: { crystals: 10, essence: 8, gold: 80 },         unlock: 2 },
  // Tier 4 — needs moonstone + essence
  moon:    { name: "Moon Golem",    tier: 4, ascii: " (^v^) \n {___} \n  | | ", speed: 3,  capacity: 18, danger_resist: 3, cost: { moonstone: 8, essence: 15, gold: 200 },        unlock: 3 },
};

const ALCHEMY_RECIPES = [
  // Tier 0 — available from start, uses forest resources only
  { id: "herb_tonic",        name: "Herb Tonic",        icon: "🌿", ingredients: { herbs: 4 },                               produces: { gold: 8 },             time: 4,  unlocked: true,  requiresLevel: 0 },
  { id: "crystal_dust",      name: "Crystal Dust",      icon: "✨", ingredients: { crystals: 2, herbs: 2 },                  produces: { essence: 3 },          time: 6,  unlocked: true,  requiresLevel: 0 },
  { id: "healing_potion",    name: "Healing Potion",    icon: "🧪", ingredients: { herbs: 3, crystals: 2 },                  produces: { gold: 20 },            time: 8,  unlocked: true,  requiresLevel: 0 },
  // Tier 1 — needs iron/sulfur from mine/swamp
  { id: "golem_oil",         name: "Golem Oil",         icon: "⚗️", ingredients: { herbs: 3, iron: 2 },                      produces: { essence: 6, gold: 10 }, time: 10, unlocked: false, requiresLevel: 1 },
  { id: "mana_elixir",       name: "Mana Elixir",       icon: "💜", ingredients: { crystals: 4, sulfur: 2 },                 produces: { gold: 35, essence: 4 }, time: 12, unlocked: false, requiresLevel: 1 },
  // Tier 2 — gold production & research items
  { id: "liquid_gold",       name: "Liquid Gold",       icon: "💰", ingredients: { moonstone: 2, sulfur: 4, iron: 3 },       produces: { gold: 150 },            time: 18, unlocked: false, requiresLevel: 2 },
  { id: "philosophers_draft",name: "Philosopher's Draft",icon:"🧪", ingredients: { moonstone: 3, essence: 6, herbs: 4 },     produces: { philosophers_draft: 1 },time: 20, unlocked: false, requiresLevel: 2 },
  // Tier 3 — endgame (produces items for research)
  { id: "soul_crystal",      name: "Soul Crystal",      icon: "💠", ingredients: { crystals: 8, moonstone: 5, essence: 15 }, produces: { soul_crystal: 1}, time: 30, unlocked: false, requiresLevel: 3 },
  // Research materials — combines both items to create Condensed Knowledge (Tier 3)
  { id: "condensed_knowledge", name: "Condensed Knowledge", icon: "💧", ingredients: { philosophers_draft: 1, soul_crystal: 1 }, produces: { condensed_knowledge_alchemy: 5 }, time: 15, unlocked: false, requiresLevel: 3 },
];

// ─────────────────────────────────────────────────────
// RESEARCH NODES
// ─────────────────────────────────────────────────────

const RESEARCH_NODES = [
  // ═══════════════════════════════════════════════════
  // TIER 1 — Infinite Research Nodes (4 nodes)
  // ═══════════════════════════════════════════════════
  {
    id: "distiller_speed",
    name: "Distiller Efficiency",
    desc: "Reduce distillation time by 5% per level.",
    icon: "⚡",
    tier: 1,
    prerequisites: [],
    baseCost: 100, // points
    infinite: true,
    maxLevel: Infinity,
    effect: (level) => {
      // Apply 5% speed boost per level
      if (G.distiller) {
        G.distiller.speedMultiplier = 1 - (level * 0.05);
      }
    }
  },
  {
    id: "injection_points",
    name: "Knowledge Amplification",
    desc: "Each Prepared Knowledge gives +10% more points per level.",
    icon: "📈",
    tier: 1,
    prerequisites: [],
    baseCost: 100,
    infinite: true,
    maxLevel: Infinity,
    effect: (level) => {
      G.injectionPointsMult = 1 + (level * 0.1);
    }
  },
  {
    id: "alchemy_speed",
    name: "Alchemy Mastery",
    desc: "Alchemy recipes complete 3% faster per level.",
    icon: "🔥",
    tier: 1,
    prerequisites: [],
    baseCost: 100,
    infinite: true,
    maxLevel: Infinity,
    effect: (level) => {
      G.alchemySpeedMult = Math.max(0.1, 1 - (level * 0.03));
    }
  },
  {
    id: "alchemy_productivity",
    name: "Alchemy Productivity",
    desc: "Alchemy recipes have +1% productivity per level (every 100% = +1 free item).",
    icon: "🎁",
    tier: 1,
    prerequisites: [],
    baseCost: 100,
    infinite: true,
    maxLevel: Infinity,
    effect: (level) => {
      G.alchemyProductivityBonus = level; // Stored as percentage
    }
  },

  // ═══════════════════════════════════════════════════
  // TIER 2 — One-Time Unlocks (2 nodes)
  // ═══════════════════════════════════════════════════
  {
    id: "auto_distiller",
    name: "Automated Distillery",
    desc: "Distiller automatically processes Condensed Knowledge when available.",
    icon: "🤖",
    tier: 2,
    prerequisites: ["distiller_speed"], // Requires at least 1 level in Distiller Efficiency
    baseCost: 500,
    infinite: false,
    maxLevel: 1,
    effect: (level) => {
      G.autoDistiller = true;
    }
  },
  {
    id: "auto_research",
    name: "Automated Research",
    desc: "Automatically starts next research in queue when current completes.",
    icon: "🧠",
    tier: 2,
    prerequisites: ["injection_points"], // Requires at least 1 level in Knowledge Amplification
    baseCost: 500,
    infinite: false,
    maxLevel: 1,
    effect: (level) => {
      G.autoResearch = true;
    }
  }
];

const UPGRADES = [
  // Level 0 upgrades — purchasable with gold+forest resources
  { id: "better_furnace",   name: "Better Furnace",    desc: "Alchemy recipes complete 25% faster.",          cost: { gold: 40, crystals: 5 },                    effect: () => { G.alchemySpeedMult *= 0.75; },      purchased: false, requiresLevel: 0 },
  { id: "forest_knowledge", name: "Forest Knowledge",  desc: "Forest golems carry +2 extra resources.",       cost: { gold: 30, herbs: 10 },                       effect: () => { G.golemBonusCapacity += 2; },       purchased: false, requiresLevel: 0 },
  // Level 1 upgrades
  { id: "golem_beacon",     name: "Golem Beacon",      desc: "All golems carry +2 extra resources.",          cost: { gold: 80, crystals: 6, essence: 5 },         effect: () => { G.golemBonusCapacity += 2; },       purchased: false, requiresLevel: 1 },
  { id: "arcane_compass",   name: "Arcane Compass",    desc: "Golems travel 20% faster.",                     cost: { gold: 100, crystals: 4, essence: 8 },        effect: () => { G.golemSpeedMult *= 0.80; },        purchased: false, requiresLevel: 1 },
  // Level 2 upgrades
  { id: "essence_condenser",name: "Essence Condenser", desc: "Alchemy produces +50% more essence.",           cost: { gold: 180, crystals: 8, essence: 10 },       effect: () => { G.essenceMult = (G.essenceMult||1)*1.5; }, purchased: false, requiresLevel: 2 },
  { id: "master_blueprint", name: "Master Blueprint",  desc: "Golem crafting costs reduced by 25%.",          cost: { gold: 250, essence: 15, moonstone: 4 },      effect: () => { G.craftCostMult *= 0.75; },         purchased: false, requiresLevel: 2 },
  { id: "zone_expansion",   name: "Zone Expansion",    desc: "+1 slot in every zone.",                        cost: { gold: 350, essence: 15, moonstone: 6 },      effect: () => { ZONES.forEach(z => z.maxSlots++); }, purchased: false, requiresLevel: 2 },
  // Level 3 upgrades
  { id: "lunar_attunement", name: "Lunar Attunement",  desc: "Moon Golems gather from all zones simultaneously.", cost: { gold: 500, moonstone: 12, essence: 25 }, effect: () => { G.lunarAttunement = true; },        purchased: false, requiresLevel: 3 },
];

// Upgrades that can be applied to individual golems
// Each golem tracks which upgrades it has purchased in golem.upgrades = []
const GOLEM_UPGRADES = [
  // Tier 0 — available for all golems, forest resources only
  { id: "reinforced_shell",  name: "Reinforced Shell",  icon: "🛡️",  desc: "+1 Danger Resist (access Mine & Swamp)",  cost: { clay: 8, crystals: 4 },        effect: g => { g.danger_resist = (g.danger_resist||0) + 1; }, maxLevel: 1, requiresTier: 1 },
  { id: "iron_plating",      name: "Iron Plating",      icon: "⚙️",  desc: "+1 Danger Resist (access Ruins)",         cost: { iron: 6, gold: 40 },            effect: g => { g.danger_resist = (g.danger_resist||0) + 1; }, maxLevel: 1, requiresTier: 1 },
  { id: "arcane_plating",    name: "Arcane Plating",    icon: "✨",  desc: "+1 Danger Resist (access Volcano)",      cost: { crystals: 8, essence: 6 },      effect: g => { g.danger_resist = (g.danger_resist||0) + 1; }, maxLevel: 1, requiresTier: 1 },
  { id: "satchel",           name: "Satchel",           icon: "🎒",  desc: "+3 Carry Capacity",                     cost: { herbs: 8, gold: 20 },           effect: g => { g.bonus_capacity = (g.bonus_capacity||0) + 3; }, maxLevel: 3, requiresTier: 1 },
  { id: "swift_legs",        name: "Swift Legs",        icon: "💨",  desc: "20% faster travel",                    cost: { crystals: 5, gold: 30 },        effect: g => { g.speed_mult = (g.speed_mult||1) * 0.8; },    maxLevel: 2, requiresTier: 1 },
];

const WORKSHOP_LEVELS = [
  { level: 0, name: "Novice Lab",     maxGolems: 3,  cost: null },
  // Level 1 — achievable with gold from herb tonics + crystals from forest
  { level: 1, name: "Journeyman Lab", maxGolems: 6,  cost: { gold: 60, crystals: 8 } },
  { level: 2, name: "Adept Lab",      maxGolems: 12, cost: { gold: 180, essence: 12, crystals: 6 } },
  { level: 3, name: "Master Lab",     maxGolems: 25, cost: { gold: 500, moonstone: 5, essence: 20 } },
];

const ASCII_MAPS = {
  workshop: `+----------------------------------------------------+\n|   W O R K S H O P                                 |\n|                                                    |\n|    [Furnace]      [Workbench]      [Shelf]         |\n|     (===)           |___|           |||            |\n|     |___|           |___|          [===]           |\n|                                                    |\n|    [Golem Dock]                                    |\n|     ___    ___    ___    ___    ___    ___          |\n|    |   |  |   |  |   |  |   |  |   |  |   |       |\n|    |___|   ---   |___|   ---   |___|   ---         |\n|                                                    |\n+----------------------------------------------------+`,
  forest:   `+----------------------------------------------------+\n|   W H I S P E R I N G   F O R E S T               |\n|                                                    |\n|  /\\  /\\  /\\  /\\  /\\  /\\  /\\  /\\  /\\  /\\  |\n| /  \\/  \\/  \\/  \\/  \\/  \\/  \\/  \\/  \\/  \\  |\n| ||||  ||||  ||||  ||||  ||||  ||||  ||||  ||||     |\n| ||||  ||||  ||||  ||||  ||||  ||||  ||||  ||||     |\n| ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |\n|   * herbs *  * crystals *  * mushrooms *           |\n|                                                    |\n+----------------------------------------------------+`,
  mine:     `+----------------------------------------------------+\n|   I R O N   D E P T H S                           |\n|                                                    |\n|  ##################################################|\n|  #  [===]   [===]   [===]   [===]   [===]      #  |\n|  #   |||     |||     |||     |||     |||         #  |\n|  ##################################################|\n|  #   * iron *   * crystals *   * stone *        #  |\n|  ##################################################|\n|                                                    |\n+----------------------------------------------------+`,
  swamp:    `+----------------------------------------------------+\n|   S U L F U R   S W A M P                         |\n|                                                    |\n|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|\n|  ~ ))) ~ ))) ~ ))) ~ ))) ~ ))) ~ ))) ~ ))) ~      |\n|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|\n|  ~ ))) ~ ))) ~ ))) ~ ))) ~ ))) ~ ))) ~ ))) ~      |\n|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|\n|     * sulfur *   * herbs *   * bog water *        |\n|                                                    |\n+----------------------------------------------------+`,
  ruins:    `+----------------------------------------------------+\n|   A N C I E N T   R U I N S                       |\n|                                                    |\n|  _   _   _   _   _   _   _   _   _   _   _   _   |\n| | | | | | | | | | | | | | | | | | | | | | | | |  |\n| |_| |_| |_| |_| |_| |_| |_| |_| |_| |_| |_| |_| |\n|  |||   |||   |||   |||   |||   |||   |||   |||    |\n|     * moonstone *   * essence *   * relics *      |\n|                                                    |\n+----------------------------------------------------+`,
  volcano:  `+----------------------------------------------------+\n|   E M B E R   V O L C A N O                       |\n|                                                    |\n|              /\\                                   |\n|             /  \\                                  |\n|            / ** \\      * D A N G E R *            |\n|           / **** \\                                |\n|          /________\\                               |\n|    * sulfur *   * moonstone *   * magma *         |\n|                                                    |\n+----------------------------------------------------+`,
};

// ─────────────────────────────────────────────────────
// GAME STATE
// ─────────────────────────────────────────────────────

const G = {
  // Starting resources: enough clay+herbs to craft 1st golem immediately
  resources: {
    gold: 5, essence: 0, herbs: 5, crystals: 0, iron: 0, moonstone: 0, sulfur: 0, clay: 8,
    condensed_knowledge_alchemy: 0, prepared_knowledge_alchemy: 0, philosophers_draft: 0, soul_crystal: 0
  },
  golems: [],
  nextGolemId: 1,
  workshopLevel: 0,
  alchemyQueue: [],
  alchemySpeedMult: 1,
  golemSpeedMult: 1,
  golemBonusCapacity: 0,
  essenceMult: 1,
  craftCostMult: 1,
  lunarAttunement: false,
  totalTime: 0,
  prestigeCount: 0,
  eventLog: [],
  lastSave: Date.now(),

  // World Map State
  worldMap: null,               // Initialized on first load
  alchemistState: "idle",       // "idle" | "exploring" | "returning"
  explorationTarget: null,      // { row, col } or null
  explorationEndTime: null,     // timestamp or null
  currentView: "workshop",      // "workshop" | "worldmap"

  // Research Lab State
  distiller: null,              // { built: bool, processingQueue: [], currentProcessing: null, baseProcessingTime: 10000, speedMultiplier: 1.0 }
  injector: null,               // { built: bool, capacity: 100, currentAmount: 0 }
  activeResearch: null,         // { nodeId, startTime, endTime, pointsNeeded } or null
  researchQueue: [],            // Array of nodeIds (max 10)
  researchNodes: {},            // { nodeId: { level: number } }
  injectionPointsMult: 1,       // Multiplier for PK → points conversion
  alchemyProductivityBonus: 0,  // Percentage bonus (accumulated, every 100% = +1 item)
  autoDistiller: false,         // Tier 2 research unlock
  autoResearch: false,          // Tier 2 research unlock
};

// ─────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────

function fmt(n) {
  if (n >= 1e6) return (n/1e6).toFixed(2)+"M";
  if (n >= 1e3) return (n/1e3).toFixed(1)+"K";
  return Math.floor(n).toString();
}

function fmtTime(s) {
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${Math.floor(s%60)}s`;
}

function canAfford(costs, mult = 1) {
  for (const [res, amt] of Object.entries(costs))
    if ((G.resources[res]||0) < Math.ceil(amt*mult)) return false;
  return true;
}

function spend(costs, mult = 1) {
  for (const [res, amt] of Object.entries(costs))
    G.resources[res] = Math.max(0, (G.resources[res]||0) - Math.ceil(amt*mult));
}

function gain(rewards, mult = 1) {
  for (const [res, amt] of Object.entries(rewards))
    G.resources[res] = (G.resources[res]||0) + Math.floor(amt*mult);
}

function randomFrom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function log(msg, type = "info") {
  const t = new Date().toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"});
  G.eventLog.unshift({t, msg, type});
  if (G.eventLog.length > 80) G.eventLog.pop();
  renderLog();
}

// ─────────────────────────────────────────────────────
// GOLEM HELPERS
// ─────────────────────────────────────────────────────

function idleGolems() {
  return G.golems.filter(g => g.state === "idle");
}

function golemsInZone(zoneId) {
  return G.golems.filter(g => g.zoneId === zoneId && g.state !== "idle");
}

// ─────────────────────────────────────────────────────
// WORLD MAP EXPLORATION
// ─────────────────────────────────────────────────────

function getDirectionLabel(row, col) {
  if (row === 0 && col === 1) return "north";
  if (row === 1 && col === 0) return "west";
  if (row === 1 && col === 2) return "east";
  if (row === 2 && col === 1) return "south";
  if (row === 0 && col === 0) return "northwest corner";
  if (row === 0 && col === 2) return "northeast corner";
  if (row === 2 && col === 0) return "southwest corner";
  if (row === 2 && col === 2) return "southeast corner";
  return "unknown";
}

function startExploration(row, col) {
  // Check if alchemist is busy
  if (G.alchemistState !== "idle") {
    log("Already exploring or returning!", "warn");
    return;
  }

  // Check if map initialized
  if (!G.worldMap || !G.worldMap.tiles[row] || !G.worldMap.tiles[row][col]) {
    log("Invalid tile position!", "warn");
    return;
  }

  const tile = G.worldMap.tiles[row][col];

  // Check if tile is already explored
  if (tile.explored) {
    log("This area has already been explored!", "warn");
    return;
  }

  // Calculate exploration time based on distance
  const explorationTime = Math.ceil(tile.distance * 10) * 1000; // milliseconds

  // Set exploration state
  G.alchemistState = "exploring";
  G.explorationTarget = { row, col };
  G.explorationEndTime = Date.now() + explorationTime;

  const direction = getDirectionLabel(row, col);
  log(`🗺️ Exploring ${direction} from workshop...`, "info");

  renderWorldMap();
}

function cancelExploration() {
  if (G.alchemistState !== "exploring" || !G.explorationTarget) {
    log("Not currently exploring!", "warn");
    return;
  }

  const { row, col } = G.explorationTarget;
  const tile = G.worldMap.tiles[row][col];

  // Calculate return time (same as exploration distance)
  const returnTime = Math.ceil(tile.distance * 10) * 1000;

  // Set returning state
  G.alchemistState = "returning";
  G.explorationTarget = null; // Clear target (not discovering)
  G.explorationEndTime = Date.now() + returnTime;

  log("⚠️ Exploration canceled. Returning to workshop...", "warn");

  renderWorldMap();
}

function completeExploration() {
  if (!G.explorationTarget) return;

  const { row, col } = G.explorationTarget;
  const tile = G.worldMap.tiles[row][col];

  // Randomly assign zone type
  const zoneTypes = ["forest", "mine", "swamp", "ruins", "volcano"];
  const zoneType = randomFrom(zoneTypes);
  const zone = ZONES.find(z => z.id === zoneType);

  // Calculate resource pool based on distance
  const basePool = zone.resourcePool ? zone.resourcePool.total : 100000;
  const scaledTotal = Math.floor(basePool * (1 + tile.distance * 0.5));

  // Reveal tile
  tile.explored = true;
  tile.zoneType = zoneType;
  tile.resourcePool = { total: scaledTotal, byType: {} };

  // Reset alchemist state
  G.alchemistState = "idle";
  G.explorationTarget = null;
  G.explorationEndTime = null;

  log(`✅ Discovered ${zone.name}! (${fmtResources(scaledTotal)} resources)`, "great");

  saveGame();
  renderWorldMap();
}

function completeReturn() {
  // Reset alchemist state
  G.alchemistState = "idle";
  G.explorationTarget = null;
  G.explorationEndTime = null;

  log("🏠 Returned safely to workshop.", "info");

  renderWorldMap();
}

function tickExploration(now) {
  if (!G.explorationEndTime) return;

  // Check if exploration/return is complete
  if (now >= G.explorationEndTime) {
    if (G.alchemistState === "exploring") {
      completeExploration();
    } else if (G.alchemistState === "returning") {
      completeReturn();
    }
  } else {
    // Update countdown display (partial render)
    updateExplorationCountdown(now);
  }
}

function updateExplorationCountdown(now) {
  const remaining = Math.ceil((G.explorationEndTime - now) / 1000);
  const el = document.getElementById("exploration-countdown");
  if (el) {
    el.textContent = `${remaining}s`;
  }
}

// ─────────────────────────────────────────────────────
// RESEARCH LAB LOGIC
// ─────────────────────────────────────────────────────

// Machine Building Functions
function buildDistiller() {
  const cost = { gold: 500, essence: 50, moonstone: 10 };
  const requiresLevel = 2;

  if (G.workshopLevel < requiresLevel) {
    log(`Workshop level ${requiresLevel} required to build Distiller!`, "warn");
    return;
  }
  if (G.distiller && G.distiller.built) {
    log("Distiller is already built!", "warn");
    return;
  }
  if (!canAfford(cost)) {
    log("Not enough resources to build Distiller.", "warn");
    return;
  }

  spend(cost);
  G.distiller = {
    built: true,
    processingQueue: [],
    currentProcessing: null,
    baseProcessingTime: 10000, // 10 seconds
    speedMultiplier: 1.0
  };

  log("🔬 Distiller built! Can now process Condensed Knowledge into Prepared Knowledge.", "great");
  saveGame();
  renderResearchLab();
}

function buildInjector() {
  const cost = { gold: 300, essence: 30, crystals: 20 };
  const requiresLevel = 2;

  if (G.workshopLevel < requiresLevel) {
    log(`Workshop level ${requiresLevel} required to build Injector!`, "warn");
    return;
  }
  if (G.injector && G.injector.built) {
    log("Injector is already built!", "warn");
    return;
  }
  if (!canAfford(cost)) {
    log("Not enough resources to build Injector.", "warn");
    return;
  }

  spend(cost);
  G.injector = {
    built: true,
    capacity: 100,
    currentAmount: 0
  };

  log("💉 Injector built! Can now store Prepared Knowledge for research.", "great");
  saveGame();
  renderResearchLab();
}

// Distiller Processing Functions
function startDistilling(ckAmount) {
  if (!G.distiller || !G.distiller.built) {
    log("Distiller not built yet!", "warn");
    return;
  }
  if (G.distiller.processingQueue.length >= 5) {
    log("Distiller queue is full (max 5)!", "warn");
    return;
  }
  if (G.resources.condensed_knowledge_alchemy < ckAmount) {
    log("Not enough Condensed Knowledge!", "warn");
    return;
  }

  // Deduct CK from resources
  G.resources.condensed_knowledge_alchemy -= ckAmount;

  const processingTime = G.distiller.baseProcessingTime * G.distiller.speedMultiplier;
  const now = Date.now();
  const job = {
    ckAmount,
    startTime: now,
    endTime: now + processingTime
  };

  G.distiller.processingQueue.push(job);

  // Start processing if nothing is currently processing
  if (!G.distiller.currentProcessing) {
    G.distiller.currentProcessing = G.distiller.processingQueue.shift();
  }

  log(`🔬 Distilling ${ckAmount} Condensed Knowledge...`, "info");
  saveGame();
  renderResearchLab();
}

function tickDistiller(now) {
  if (!G.distiller || !G.distiller.built) return;

  // Auto-start processing if idle and CK is available
  if (!G.distiller.currentProcessing && G.distiller.processingQueue.length === 0) {
    const ckAvailable = G.resources.condensed_knowledge_alchemy || 0;
    if (ckAvailable > 0) {
      // Auto-queue CK (1 at a time, or all if auto-distiller research is unlocked)
      const toQueue = G.autoDistiller ? Math.min(ckAvailable, 5) : 1;
      startDistilling(toQueue);
      return; // startDistilling will handle starting the first one
    }
  }

  if (!G.distiller.currentProcessing) return;

  // Check if current processing is complete
  if (now >= G.distiller.currentProcessing.endTime) {
    completeDistilling();

    // Start next in queue
    if (G.distiller.processingQueue.length > 0) {
      G.distiller.currentProcessing = G.distiller.processingQueue.shift();
    }
  }
}

function completeDistilling() {
  if (!G.distiller.currentProcessing) return;

  const { ckAmount } = G.distiller.currentProcessing;
  const pkProduced = ckAmount; // 1:1 conversion

  // Check if injector has capacity
  if (!G.injector || !G.injector.built) {
    log("⚠️ Distillation complete, but Injector not built! Prepared Knowledge lost.", "warn");
    G.distiller.currentProcessing = null;
    renderResearchLab();
    return;
  }

  const availableCapacity = G.injector.capacity - G.injector.currentAmount;
  if (pkProduced > availableCapacity) {
    log(`⚠️ Distillation complete, but Injector is full! (${G.injector.currentAmount}/${G.injector.capacity})`, "warn");
    // Distiller stops until injector has space - keep job in currentProcessing
    // Don't clear currentProcessing so it will retry next tick
    renderResearchLab();
    return;
  }

  // Add PK to injector
  G.injector.currentAmount += pkProduced;
  G.distiller.currentProcessing = null;

  log(`✅ Distilled ${ckAmount} CK → ${pkProduced} Prepared Knowledge. Injector: ${G.injector.currentAmount}/${G.injector.capacity}`, "good");

  saveGame();
  renderResearchLab();
}

// Research Functions
function canResearchNode(nodeId) {
  const node = RESEARCH_NODES.find(n => n.id === nodeId);
  if (!node) return false;

  // Check current level
  const currentLevel = G.researchNodes[nodeId]?.level || 0;

  // Check if already at max level
  if (currentLevel >= node.maxLevel) return false;

  // Check prerequisites (Tier 2 nodes)
  if (node.prerequisites.length > 0) {
    for (const prereqId of node.prerequisites) {
      const prereqLevel = G.researchNodes[prereqId]?.level || 0;
      if (prereqLevel < 1) return false; // Must have at least level 1
    }
  }

  return true;
}

function getResearchCost(nodeId) {
  const node = RESEARCH_NODES.find(n => n.id === nodeId);
  if (!node) return 0;

  const currentLevel = G.researchNodes[nodeId]?.level || 0;
  const nextLevel = currentLevel + 1;

  // Formula: baseCost × (2^(level-1))
  return Math.floor(node.baseCost * Math.pow(2, nextLevel - 1));
}

function queueResearch(nodeId) {
  if (!canResearchNode(nodeId)) {
    log("Cannot research this node (prerequisites not met or max level reached)!", "warn");
    return;
  }
  if (G.researchQueue.length >= 10) {
    log("Research queue is full (max 10)!", "warn");
    return;
  }
  if (G.activeResearch && G.activeResearch.nodeId === nodeId) {
    log("Already researching this node!", "warn");
    return;
  }
  if (G.researchQueue.includes(nodeId)) {
    log("Node already in research queue!", "warn");
    return;
  }

  G.researchQueue.push(nodeId);
  const node = RESEARCH_NODES.find(n => n.id === nodeId);
  log(`📚 Queued research: ${node.name}`, "info");

  // Auto-start if nothing active
  if (!G.activeResearch) {
    startNextResearch();
  }

  saveGame();
  renderResearchLab();
}

function startNextResearch() {
  if (G.researchQueue.length === 0) return;
  if (G.activeResearch) return;

  const nodeId = G.researchQueue.shift();
  const pointsNeeded = getResearchCost(nodeId);
  const node = RESEARCH_NODES.find(n => n.id === nodeId);

  G.activeResearch = {
    nodeId,
    startTime: Date.now(),
    pointsNeeded,
    pointsAccumulated: 0,
    lastTickTime: Date.now() // Track when we last consumed PK
  };

  log(`🔬 Research started: ${node.name} (${pointsNeeded} points needed)`, "info");
  saveGame();
  renderResearchLab();
}

function tickResearch(now) {
  if (!G.activeResearch) return;
  if (!G.injector || !G.injector.built) return;
  if (G.injector.currentAmount <= 0) return; // No PK available

  // Consume PK automatically over time
  // Rate: 1 PK per second = 10 points per second
  const timeSinceLastTick = now - (G.activeResearch.lastTickTime || now);
  const secondsElapsed = timeSinceLastTick / 1000;

  if (secondsElapsed >= 1) { // Consume 1 PK per second
    const pkToConsume = Math.min(1, G.injector.currentAmount);
    const basePoints = 10;
    const pointsGained = Math.floor(pkToConsume * basePoints * G.injectionPointsMult);

    // Deduct PK from injector
    G.injector.currentAmount -= pkToConsume;

    // Add points to research
    G.activeResearch.pointsAccumulated += pointsGained;
    G.activeResearch.lastTickTime = now;

    // Check if research is complete
    if (G.activeResearch.pointsAccumulated >= G.activeResearch.pointsNeeded) {
      completeResearch();
    }

    // Re-render to show progress
    if (G.currentView === "researchlab") {
      renderResearchLab();
    }
  }
}

function injectKnowledge(pkAmount) {
  if (!G.injector || !G.injector.built) {
    log("Injector not built!", "warn");
    return;
  }
  if (!G.activeResearch) {
    log("No active research! Queue a research node first.", "warn");
    return;
  }
  if (G.injector.currentAmount < pkAmount) {
    log("Not enough Prepared Knowledge in Injector!", "warn");
    return;
  }

  // Deduct PK from injector
  G.injector.currentAmount -= pkAmount;

  // Convert to points (base 10 points per PK, modified by multiplier)
  const basePoints = 10;
  const pointsGained = Math.floor(pkAmount * basePoints * G.injectionPointsMult);

  // Add to active research
  G.activeResearch.pointsAccumulated += pointsGained;

  log(`💉 Injected ${pkAmount} PK → +${pointsGained} research points!`, "good");

  // Check if research is complete
  if (G.activeResearch.pointsAccumulated >= G.activeResearch.pointsNeeded) {
    completeResearch();
  }

  saveGame();
  renderResearchLab();
}

function completeResearch() {
  if (!G.activeResearch) return;

  const { nodeId } = G.activeResearch;
  const node = RESEARCH_NODES.find(n => n.id === nodeId);

  // Increment research level
  if (!G.researchNodes[nodeId]) {
    G.researchNodes[nodeId] = { level: 0 };
  }
  G.researchNodes[nodeId].level++;

  const newLevel = G.researchNodes[nodeId].level;

  // Apply effect
  if (node.effect) {
    node.effect(newLevel);
  }

  log(`✨ Research complete: ${node.name} Level ${newLevel}!`, "great");

  // Clear active research
  G.activeResearch = null;

  // Auto-start next in queue if auto-research enabled
  if (G.autoResearch && G.researchQueue.length > 0) {
    startNextResearch();
  }

  saveGame();
  renderResearchLab();
}

function cancelActiveResearch() {
  if (!G.activeResearch) {
    log("No active research to cancel!", "warn");
    return;
  }

  const node = RESEARCH_NODES.find(n => n.id === G.activeResearch.nodeId);
  log(`❌ Cancelled research: ${node.name}. Progress lost.`, "warn");

  G.activeResearch = null;
  saveGame();
  renderResearchLab();
}

function removeFromQueue(nodeId) {
  const index = G.researchQueue.indexOf(nodeId);
  if (index === -1) {
    log("Node not in queue!", "warn");
    return;
  }

  G.researchQueue.splice(index, 1);
  const node = RESEARCH_NODES.find(n => n.id === nodeId);
  log(`❌ Removed from queue: ${node.name}`, "info");

  saveGame();
  renderResearchLab();
}

// View Switching Functions
function showResearchLab() {
  if (G.workshopLevel < 2) {
    log("Workshop level 2 required to access Research Lab!", "warn");
    return;
  }

  G.currentView = "researchlab";

  // Hide main UI
  document.getElementById("main-layout").style.display = "none";

  // Show research lab panel
  const panel = document.getElementById("researchlab-panel");
  panel.style.display = "block";

  renderResearchLab();
}

function hideResearchLab() {
  G.currentView = "workshop";

  // Hide research lab panel
  document.getElementById("researchlab-panel").style.display = "none";

  // Show main UI
  document.getElementById("main-layout").style.display = "grid";

  renderAll();
}

// ─────────────────────────────────────────────────────
// GOLEM LOGIC
// ─────────────────────────────────────────────────────

function craftGolem(typeId) {
  const def = GOLEM_TYPES[typeId];
  if (!def) return;
  if (G.workshopLevel < def.unlock) { log(`Workshop level ${def.unlock} required!`, "warn"); return; }
  const maxGolems = WORKSHOP_LEVELS[G.workshopLevel].maxGolems;
  if (G.golems.length >= maxGolems) { log("Golem dock is full! Upgrade workshop.", "warn"); return; }
  if (!canAfford(def.cost, G.craftCostMult)) { log(`Not enough resources to craft ${def.name}.`, "warn"); return; }
  spend(def.cost, G.craftCostMult);
  const golem = {
    id: G.nextGolemId++, typeId, name: `${def.name} #${G.nextGolemId-1}`,
    state: "idle", zoneId: null, tripStart: null, tripEnd: null, tripPhase: null, collected: {},
    upgrades: [],          // list of upgrade ids purchased for this golem
    danger_resist: def.danger_resist,  // starts at base type value, can be increased
    bonus_capacity: 0,     // extra carry slots from upgrades
    speed_mult: 1.0        // travel speed multiplier from upgrades
  };
  G.golems.push(golem);
  log(`✨ Crafted ${golem.name}!`, "great");
  renderGolemRoster();
  renderZones();
  renderRecipes();
  renderResources();
  renderFooter();
  saveGame();
}

function assignGolemToZone(golemId, zoneId) {
  const golem = G.golems.find(g => g.id == golemId);
  const zone  = ZONES.find(z => z.id === zoneId);
  if (!golem || !zone) return;
  if (golem.state !== "idle") { log(`${golem.name} is busy!`, "warn"); return; }
  const def = GOLEM_TYPES[golem.typeId];
  if (zone.danger > golem.danger_resist) { log(`⚠️ ${golem.name} cannot handle ${zone.name}! Needs Danger Resist ${zone.danger} (has ${golem.danger_resist}). Upgrade it first!`, "warn"); return; }
  if (golemsInZone(zoneId).length >= zone.maxSlots) { log(`${zone.name} is full! (${zone.maxSlots} slots)`, "warn"); return; }
  const speed = def.speed * G.golemSpeedMult * (golem.speed_mult || 1.0);
  golem.state = "traveling"; golem.zoneId = zoneId; golem.tripPhase = "out";
  golem.tripStart = Date.now(); golem.tripEnd = Date.now() + speed * 1000; golem.collected = {};
  log(`🚶 ${golem.name} → ${zone.name}`, "info");
  renderZones();
  renderGolemRoster();
  renderMap(zoneId);
}

function recallGolem(golemId) {
  const golem = G.golems.find(g => g.id == golemId);
  if (!golem || golem.state === "idle") return;
  const zoneName = ZONES.find(z => z.id === golem.zoneId)?.name || "zone";
  golem.state = "idle"; golem.zoneId = null; golem.tripStart = null; golem.tripEnd = null; golem.collected = {};
  log(`🔔 ${golem.name} recalled from ${zoneName}.`, "warn");
  renderZones();
  renderGolemRoster();
  renderMap(null);
}

function upgradeGolem(golemId, upgradeId) {
  const golem = G.golems.find(g => g.id == golemId);
  if (!golem) return;
  if (golem.state !== "idle") { log(`Recall ${golem.name} before upgrading!`, "warn"); return; }
  const upg = GOLEM_UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return;
  const def = GOLEM_TYPES[golem.typeId];
  if (def.tier < upg.requiresTier) { log(`${golem.name} tier too low for this upgrade.`, "warn"); return; }
  // Count how many times this upgrade was already applied
  const timesApplied = golem.upgrades.filter(u => u === upgradeId).length;
  if (timesApplied >= upg.maxLevel) { log(`${golem.name} already has max level of ${upg.name}.`, "warn"); return; }
  if (!canAfford(upg.cost)) { log(`Not enough resources for ${upg.name}.`, "warn"); return; }
  spend(upg.cost);
  upg.effect(golem);
  golem.upgrades.push(upgradeId);
  log(`⬆️ ${golem.name} upgraded: ${upg.name}! (Danger Resist: ${golem.danger_resist})`, "great");
  renderGolemRoster();
  renderResources();
  renderZones();
  saveGame(); // save immediately so refresh doesn't lose upgrade
}

function destroyGolem(golemId) {
  const idx = G.golems.findIndex(g => g.id == golemId);
  if (idx === -1) return;
  const golem = G.golems[idx];
  if (golem.state !== "idle") { log(`Recall ${golem.name} before dismantling!`, "warn"); return; }
  const def = GOLEM_TYPES[golem.typeId];
  const refund = {};
  for (const [r,a] of Object.entries(def.cost)) refund[r] = Math.floor(a * 0.5);
  gain(refund);
  G.golems.splice(idx, 1);
  log(`💀 ${golem.name} dismantled. 50% materials refunded.`, "warn");
  renderGolemRoster();
  renderZones();
  renderRecipes();
  renderResources();
  renderFooter();
  saveGame();
}

function tickGolems(now) {
  let stateChanged = false;
  for (const golem of G.golems) {
    if (golem.state === "idle") continue;
    const def  = GOLEM_TYPES[golem.typeId];
    const zone = ZONES.find(z => z.id === golem.zoneId);
    const speed = def.speed * G.golemSpeedMult * (golem.speed_mult || 1.0);

    if (golem.state === "traveling" && golem.tripPhase === "out" && now >= golem.tripEnd) {
      golem.state = "gathering"; golem.tripStart = now; golem.tripEnd = now + 3000;
      log(`⛏️  ${golem.name} arrived at ${zone.name}.`, "info");
      updateZoneGolemRow(golem); stateChanged = true;

    } else if (golem.state === "gathering" && now >= golem.tripEnd) {
      const capacity = def.capacity + (golem.bonus_capacity || 0) + G.golemBonusCapacity;
      golem.collected = {};
      let remaining = capacity;
      const yields = [...zone.yields];
      while (remaining > 0 && yields.length > 0) {
        const res = randomFrom(yields);
        const amt = Math.min(remaining, Math.ceil(Math.random()*3)+1);
        golem.collected[res] = (golem.collected[res]||0) + amt;
        remaining -= amt;
      }
      golem.state = "traveling"; golem.tripPhase = "back"; golem.tripStart = now; golem.tripEnd = now + speed * 1000;
      log(`📦 ${golem.name} gathered, heading back...`, "info");
      updateZoneGolemRow(golem); stateChanged = true;

    } else if (golem.state === "traveling" && golem.tripPhase === "back" && now >= golem.tripEnd) {
      let summary = [];
      let totalGathered = 0;

      // Add resources to player inventory and track total gathered
      for (const [res, amt] of Object.entries(golem.collected)) {
        G.resources[res] = (G.resources[res]||0) + amt;
        summary.push(`${amt}x ${RESOURCES[res].icon}`);
        totalGathered += amt;

        // Deplete zone's individual resource pool
        if (zone && zone.resourcePool && zone.resourcePool.byType) {
          zone.resourcePool.byType[res] = Math.max(0, (zone.resourcePool.byType[res] || 0) - amt);

          // Log warning if this specific resource type is depleted
          if (zone.resourcePool.byType[res] === 0) {
            log(`⚠️ ${zone.name} has run out of ${RESOURCES[res].name}!`, "warn");
          }
        }
      }

      // Deplete zone's total pool
      if (zone && zone.resourcePool) {
        zone.resourcePool.total = Math.max(0, zone.resourcePool.total - totalGathered);

        // Check if zone is fully depleted
        if (zone.resourcePool.total === 0) {
          log(`💀 ${zone.name} has been depleted and is no longer available!`, "warn");
          stateChanged = true; // Force re-render to hide depleted zone
        }
      }

      log(`✅ ${golem.name} returned: ${summary.join(" ")}`, "good");
      golem.state = "idle"; golem.zoneId = null; golem.tripPhase = null; golem.collected = {};
      renderZones();
      renderGolemRoster();
      renderResources(); renderRecipes(); renderAlchemy(); stateChanged = true;
    }
  }
  return stateChanged;
}

// ─────────────────────────────────────────────────────
// ALCHEMY LOGIC
// ─────────────────────────────────────────────────────

function startAlchemy(recipeId) {
  const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
  if (!recipe || !recipe.unlocked) return;
  if (G.alchemyQueue.length >= 3) { log("Alchemy queue is full (max 3).", "warn"); return; }
  if (!canAfford(recipe.ingredients)) { log(`Not enough ingredients for ${recipe.name}.`, "warn"); return; }
  spend(recipe.ingredients);
  const duration = recipe.time * G.alchemySpeedMult * 1000;
  const now = Date.now();
  G.alchemyQueue.push({ recipeId, startTime: now, endTime: now + duration });
  log(`⚗️  Brewing ${recipe.name}...`, "info");
  renderAlchemy();
  renderResources();
}

function tickAlchemy(now) {
  let changed = false;
  G.alchemyQueue = G.alchemyQueue.filter(job => {
    if (now >= job.endTime) {
      const recipe = ALCHEMY_RECIPES.find(r => r.id === job.recipeId);
      const rewards = {};
      for (const [res, amt] of Object.entries(recipe.produces)) {
        const mult = res === "essence" ? (G.essenceMult||1) : 1;
        rewards[res] = Math.floor(amt * mult);
      }
      gain(rewards);
      const summary = Object.entries(rewards).map(([r,a])=>`${a}x ${RESOURCES[r].icon}`).join(" ");
      log(`🌟 ${recipe.name} complete! +${summary}`, "great");
      changed = true;
      return false;
    }
    return true;
  });
  if (changed) { renderResources(); renderAlchemy(); renderRecipes(); renderUpgrades(); }
  return changed;
}

// ─────────────────────────────────────────────────────
// WORKSHOP UPGRADE
// ─────────────────────────────────────────────────────

function upgradeWorkshop() {
  const next = WORKSHOP_LEVELS[G.workshopLevel + 1];
  if (!next) { log("Workshop is already at max level!", "warn"); return; }
  if (!canAfford(next.cost)) { log("Not enough resources to upgrade workshop.", "warn"); return; }
  spend(next.cost);
  G.workshopLevel++;
  ALCHEMY_RECIPES.forEach(r => { if (r.requiresLevel !== undefined && r.requiresLevel <= G.workshopLevel) r.unlocked = true; });
  log(`🏗️  Workshop upgraded to ${next.name}!`, "great");
  renderAll();
  saveGame();
}

function buyUpgrade(upgradeId) {
  const upg = UPGRADES.find(u => u.id === upgradeId);
  if (!upg || upg.purchased) return;
  if (upg.requiresLevel > G.workshopLevel) { log(`Requires Workshop Level ${upg.requiresLevel}.`, "warn"); return; }
  if (!canAfford(upg.cost)) { log(`Not enough resources for ${upg.name}.`, "warn"); return; }
  spend(upg.cost);
  upg.purchased = true;
  upg.effect();
  log(`🔧 Upgrade purchased: ${upg.name}!`, "great");
  renderUpgrades();
  renderResources();
  renderZones();
  saveGame();
}

// ─────────────────────────────────────────────────────
// RENDER — ZONE PANEL (right panel)
// ─────────────────────────────────────────────────────
// VIEW SWITCHING
// ─────────────────────────────────────────────────────

function showWorldMap() {
  G.currentView = "worldmap";

  // Hide main layout
  const mainLayout = document.getElementById("main-layout");
  if (mainLayout) mainLayout.style.display = "none";

  // Show worldmap panel
  const worldmapPanel = document.getElementById("worldmap-panel");
  if (worldmapPanel) worldmapPanel.style.display = "block";

  renderWorldMap();
}

function showWorkshop() {
  G.currentView = "workshop";

  // Hide worldmap panel
  const worldmapPanel = document.getElementById("worldmap-panel");
  if (worldmapPanel) worldmapPanel.style.display = "none";

  // Show main layout
  const mainLayout = document.getElementById("main-layout");
  if (mainLayout) mainLayout.style.display = "grid";

  renderAll();
}

// ─────────────────────────────────────────────────────
// WORLDMAP RENDERING
// ─────────────────────────────────────────────────────

function renderWorldMap() {
  const panel = document.getElementById("worldmap-panel");
  if (!panel || G.currentView !== "worldmap") return;

  if (!G.worldMap) {
    panel.innerHTML = '<div class="worldmap-header"><p>Initializing world map...</p></div>';
    return;
  }

  // Show status message if exploring or returning
  let statusMsg = "";
  if (G.alchemistState === "returning" && G.explorationEndTime) {
    const remaining = Math.ceil((G.explorationEndTime - Date.now()) / 1000);
    statusMsg = `<p style="text-align:center;color:var(--amber);margin:10px 0;">🏃 Returning to workshop... <span id="exploration-countdown">${remaining}s</span></p>`;
  } else if (G.alchemistState === "exploring") {
    statusMsg = `<p style="text-align:center;color:var(--green);margin:10px 0;">🔍 Exploring distant lands...</p>`;
  }

  let html = `
    <div class="worldmap-header">
      <button class="btn" data-action="show-workshop" style="margin-bottom:10px;">← Back to Workshop</button>
      <h2 style="text-align:center;color:var(--green);margin-bottom:10px;">🗺️ World Map</h2>
      ${statusMsg}
    </div>
    <div class="worldmap-grid">
  `;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const tile = G.worldMap.tiles[row][col];
      html += renderTile(tile, row, col);
    }
  }

  html += '</div>';
  panel.innerHTML = html;
}

function renderTile(tile, row, col) {
  const { explored, zoneType, resourcePool, distance } = tile;

  // Workshop tile (clickable to return)
  if (zoneType === "workshop") {
    return `
      <div class="worldmap-tile clickable" data-action="show-workshop">
        <div class="tile-icon">🏭</div>
        <div class="tile-name">Workshop</div>
        <div class="tile-resources" style="color:var(--text-dim);font-size:10px;">Click to return</div>
      </div>
    `;
  }

  // Explored zone tile
  if (explored && zoneType) {
    const zone = ZONES.find(z => z.id === zoneType);
    if (!zone) return `<div class="worldmap-tile"><span style="color:var(--red);">Error</span></div>`;

    const resourcesStr = resourcePool ? fmtResources(resourcePool.total) : "?";
    const revealClass = tile.justRevealed ? " revealed" : "";

    return `
      <div class="worldmap-tile${revealClass}">
        <div class="tile-icon">${zone.icon}</div>
        <div class="tile-name">${zone.name}</div>
        <div class="tile-resources">${resourcesStr} resources</div>
        <div style="color:var(--text-dim);font-size:9px;">Distance: ${distance.toFixed(1)}</div>
      </div>
    `;
  }

  // Fogged tile (exploring current target)
  if (G.alchemistState === "exploring" && G.explorationTarget && G.explorationTarget.row === row && G.explorationTarget.col === col) {
    const remaining = Math.ceil((G.explorationEndTime - Date.now()) / 1000);
    return `
      <div class="worldmap-tile">
        <div class="tile-icon">🔍</div>
        <div class="tile-countdown">Exploring...</div>
        <div class="tile-countdown" id="exploration-countdown">${remaining}s</div>
        <button class="btn-sm" data-action="cancel-exploration" style="margin-top:8px;color:var(--red);">✖ Cancel</button>
      </div>
    `;
  }

  // Fogged tile (when idle = clickable, when returning = disabled)
  const clickable = G.alchemistState === "idle";
  const clickableClass = clickable ? " clickable" : "";
  const clickableAttr = clickable ? `data-action="explore-tile" data-row="${row}" data-col="${col}"` : '';

  return `
    <div class="worldmap-tile fogged${clickableClass}" ${clickableAttr}>
      <div class="tile-icon">❓</div>
      <div class="tile-name" style="color:var(--text-dim);">Unexplored</div>
      ${clickable ? `<div style="color:var(--text-dim);font-size:9px;">Distance: ${distance.toFixed(1)}</div>` : ''}
      ${G.alchemistState === "returning" ? '<div class="tile-countdown" style="color:var(--text-dim);font-size:10px;">Returning...</div>' : ''}
    </div>
  `;
}

// ─────────────────────────────────────────────────────
// RESEARCH LAB RENDERING
// ─────────────────────────────────────────────────────

function renderResearchLab() {
  const panel = document.getElementById("researchlab-panel");
  if (!panel || G.currentView !== "researchlab") return;

  let html = `
    <div class="researchlab-header">
      <button class="btn" data-action="hide-researchlab" style="margin-bottom:10px;">← Back to Workshop</button>
      <h2 style="text-align:center;color:var(--purple);margin-bottom:10px;">🧪 Research Lab</h2>
      <p style="text-align:center;color:var(--text-dim);font-size:11px;margin-bottom:20px;">
        Distill Condensed Knowledge → Inject into research for upgrades
      </p>
    </div>
    <div class="researchlab-content">
      ${renderMachines()}
      ${renderResearchTree()}
    </div>
  `;

  panel.innerHTML = html;
}

function renderMachines() {
  let html = '<div class="machines-section"><h3 style="color:var(--amber);margin-bottom:12px;">⚙️ Machines</h3><div class="machines-grid">';

  // Distiller
  html += renderDistiller();

  // Injector
  html += renderInjector();

  html += '</div></div>';
  return html;
}

function renderDistiller() {
  if (!G.distiller || !G.distiller.built) {
    const cost = "500🪙 50✨ 10🌙";
    const canBuild = G.workshopLevel >= 2;
    const btnClass = canBuild ? "" : "disabled";
    const tooltip = !canBuild ? "Requires Workshop Lvl 2" : "";

    return `
      <div class="machine-card">
        <h4>🔬 Distiller</h4>
        <p style="font-size:10px;color:var(--text-dim);margin:4px 0;">Processes Condensed Knowledge → Prepared Knowledge</p>
        <p style="font-size:10px;color:var(--text-dim);margin:4px 0;">Processing Time: 10s | Queue: 5 max</p>
        <button class="btn ${btnClass}" data-action="build-distiller" title="${tooltip}" style="margin-top:8px;">
          🔨 Build (${cost})
        </button>
      </div>
    `;
  }

  // Distiller is built - show status and controls
  const ckAvailable = G.resources.condensed_knowledge_alchemy || 0;
  const { currentProcessing, processingQueue, speedMultiplier } = G.distiller;
  const baseTime = G.distiller.baseProcessingTime / 1000; // convert to seconds
  const actualTime = (baseTime * speedMultiplier).toFixed(1);

  let statusHtml = "";
  if (currentProcessing) {
    const now = Date.now();
    const pct = Math.min(100, ((now - currentProcessing.startTime) / (currentProcessing.endTime - currentProcessing.startTime)) * 100);
    const remaining = Math.max(0, Math.ceil((currentProcessing.endTime - now) / 1000));
    statusHtml = `
      <div style="margin:8px 0;">
        <p style="font-size:10px;color:var(--green);margin:2px 0;">⚡ Processing ${currentProcessing.ckAmount} CK...</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <p style="font-size:9px;color:var(--text-dim);margin:2px 0;">${remaining}s remaining</p>
      </div>
    `;
  } else {
    statusHtml = '<p style="font-size:10px;color:var(--text-dim);margin:8px 0;">💤 Idle</p>';
  }

  let queueHtml = "";
  if (processingQueue.length > 0) {
    queueHtml = `<p style="font-size:10px;color:var(--amber);margin:4px 0;">📋 Queue: ${processingQueue.length}/5</p>`;
  }

  return `
    <div class="machine-card">
      <h4>🔬 Distiller</h4>
      <p style="font-size:10px;color:var(--text-dim);margin:2px 0;">Time: ${actualTime}s per CK | Speed: ${(speedMultiplier * 100).toFixed(0)}%</p>
      ${statusHtml}
      ${queueHtml}
      <p style="font-size:10px;margin:8px 0;">CK Available: ${ckAvailable}💧</p>
      <div style="display:flex;gap:4px;margin-top:8px;">
        <button class="btn-sm" data-action="distill" data-amount="1" ${ckAvailable < 1 ? 'disabled' : ''}>+1</button>
        <button class="btn-sm" data-action="distill" data-amount="5" ${ckAvailable < 5 ? 'disabled' : ''}>+5</button>
        <button class="btn-sm" data-action="distill" data-amount="10" ${ckAvailable < 10 ? 'disabled' : ''}>+10</button>
        <button class="btn-sm" data-action="distill" data-amount="${Math.floor(ckAvailable)}" ${ckAvailable < 1 ? 'disabled' : ''}>Max</button>
      </div>
    </div>
  `;
}

function renderInjector() {
  if (!G.injector || !G.injector.built) {
    const cost = "300🪙 30✨ 20💎";
    const canBuild = G.workshopLevel >= 2;
    const btnClass = canBuild ? "" : "disabled";
    const tooltip = !canBuild ? "Requires Workshop Lvl 2" : "";

    return `
      <div class="machine-card">
        <h4>💉 Injector</h4>
        <p style="font-size:10px;color:var(--text-dim);margin:4px 0;">Stores Prepared Knowledge for research</p>
        <p style="font-size:10px;color:var(--text-dim);margin:4px 0;">Capacity: 100 PK</p>
        <button class="btn ${btnClass}" data-action="build-injector" title="${tooltip}" style="margin-top:8px;">
          🔨 Build (${cost})
        </button>
      </div>
    `;
  }

  // Injector is built - show status and controls
  const { capacity, currentAmount } = G.injector;
  const pct = (currentAmount / capacity) * 100;
  const fillColor = pct > 90 ? "var(--red)" : pct > 60 ? "var(--amber)" : "var(--green)";

  let statusHtml = "";
  if (G.activeResearch && currentAmount > 0) {
    statusHtml = '<p style="font-size:10px;color:var(--green);margin:8px 0;">⚡ Auto-injecting into research (1 PK/sec)</p>';
  } else if (G.activeResearch && currentAmount === 0) {
    statusHtml = '<p style="font-size:10px;color:var(--amber);margin:8px 0;">⚠️ Waiting for more PK...</p>';
  } else if (!G.activeResearch) {
    statusHtml = '<p style="font-size:10px;color:var(--text-dim);margin:8px 0;">💤 No active research</p>';
  } else {
    statusHtml = '<p style="font-size:10px;color:var(--text-dim);margin:8px 0;">💤 Idle</p>';
  }

  return `
    <div class="machine-card">
      <h4>💉 Injector</h4>
      <p style="font-size:10px;margin:4px 0;">Stored: ${currentAmount}/${capacity} ⚗️</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${fillColor}"></div></div>
      <p style="font-size:9px;color:var(--text-dim);margin:4px 0;">1 PK/sec = ${10 * G.injectionPointsMult} points/sec</p>
      ${statusHtml}
    </div>
  `;
}

function renderResearchTree() {
  let html = '<div class="research-section"><h3 style="color:var(--purple);margin-bottom:12px;">🧠 Research Tree</h3>';

  // Active Research Display
  if (G.activeResearch) {
    const node = RESEARCH_NODES.find(n => n.id === G.activeResearch.nodeId);
    const { pointsAccumulated, pointsNeeded } = G.activeResearch;
    const pct = Math.min(100, (pointsAccumulated / pointsNeeded) * 100);
    const currentLevel = G.researchNodes[G.activeResearch.nodeId]?.level || 0;

    html += `
      <div class="active-research-card">
        <h4 style="color:var(--green);">🔬 Active Research</h4>
        <p style="margin:4px 0;"><span style="font-size:18px;">${node.icon}</span> ${node.name} → Level ${currentLevel + 1}</p>
        <p style="font-size:10px;color:var(--text-dim);margin:4px 0;">${node.desc}</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <p style="font-size:10px;margin:4px 0;">${pointsAccumulated} / ${pointsNeeded} points</p>
        <button class="btn-sm" data-action="cancel-research" style="color:var(--red);margin-top:4px;">✖ Cancel</button>
      </div>
    `;
  }

  // Research Queue Display
  if (G.researchQueue.length > 0) {
    html += `<div class="research-queue-card"><h4 style="color:var(--amber);">📋 Queue (${G.researchQueue.length}/10)</h4>`;
    G.researchQueue.forEach(nodeId => {
      const node = RESEARCH_NODES.find(n => n.id === nodeId);
      const currentLevel = G.researchNodes[nodeId]?.level || 0;
      const cost = getResearchCost(nodeId);
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px;border-bottom:1px solid var(--border);">
          <span style="font-size:11px;">${node.icon} ${node.name} → Lvl ${currentLevel + 1}</span>
          <div>
            <span style="font-size:10px;color:var(--text-dim);margin-right:8px;">${cost}pts</span>
            <button class="btn-xs" data-action="remove-from-queue" data-node-id="${nodeId}">✖</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  // Research Nodes Grid
  html += '<div class="research-grid">';

  // Tier 1 Nodes
  html += '<div class="research-tier"><h4 style="color:var(--green);margin-bottom:8px;">🟢 Tier 1 — Infinite Research</h4>';
  RESEARCH_NODES.filter(n => n.tier === 1).forEach(node => {
    html += renderResearchNode(node);
  });
  html += '</div>';

  // Tier 2 Nodes
  html += '<div class="research-tier"><h4 style="color:var(--purple);margin-bottom:8px;">🟣 Tier 2 — Unlocks</h4>';
  RESEARCH_NODES.filter(n => n.tier === 2).forEach(node => {
    html += renderResearchNode(node);
  });
  html += '</div>';

  html += '</div></div>';
  return html;
}

function renderResearchNode(node) {
  const currentLevel = G.researchNodes[node.id]?.level || 0;
  const canResearch = canResearchNode(node.id);
  const cost = getResearchCost(node.id);
  const isMaxed = currentLevel >= node.maxLevel;
  const isQueued = G.researchQueue.includes(node.id);
  const isActive = G.activeResearch && G.activeResearch.nodeId === node.id;

  let statusText = "";
  let btnText = "Queue";
  let btnClass = "btn-sm";
  let btnDisabled = "";

  if (isMaxed) {
    statusText = '<span style="color:var(--green);">✔ Completed</span>';
    btnDisabled = "disabled";
  } else if (isActive) {
    statusText = '<span style="color:var(--green);">⚡ Researching...</span>';
    btnDisabled = "disabled";
  } else if (isQueued) {
    statusText = '<span style="color:var(--amber);">📋 Queued</span>';
    btnDisabled = "disabled";
  } else if (!canResearch) {
    statusText = '<span style="color:var(--red);">🔒 Locked</span>';
    btnDisabled = "disabled";
  }

  // Show prerequisites for Tier 2
  let prereqText = "";
  if (node.prerequisites.length > 0 && currentLevel === 0) {
    const prereqNames = node.prerequisites.map(pid => {
      const pNode = RESEARCH_NODES.find(n => n.id === pid);
      const pLevel = G.researchNodes[pid]?.level || 0;
      const pMet = pLevel >= 1;
      const pColor = pMet ? "var(--green)" : "var(--red)";
      return `<span style="color:${pColor};">${pNode.name} Lvl1</span>`;
    }).join(", ");
    prereqText = `<p style="font-size:9px;color:var(--text-dim);margin:2px 0;">Requires: ${prereqNames}</p>`;
  }

  return `
    <div class="research-node-card ${isMaxed ? 'completed' : ''}">
      <div style="font-size:24px;margin-bottom:4px;">${node.icon}</div>
      <h5 style="margin:4px 0;">${node.name}</h5>
      <p style="font-size:10px;color:var(--text-dim);margin:4px 0;">${node.desc}</p>
      ${prereqText}
      <p style="font-size:11px;margin:4px 0;">Level: ${currentLevel}${node.infinite ? '' : '/1'}</p>
      <p style="font-size:10px;margin:4px 0;">Next: ${cost} points</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        ${statusText}
        <button class="${btnClass}" data-action="queue-research" data-node-id="${node.id}" ${btnDisabled}>
          ${btnText}
        </button>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────

function renderZones() {
  const el = document.getElementById("zones-panel");
  if (!el) return;

  // Filter out depleted zones
  const activeZones = ZONES.filter(z => z.resourcePool && z.resourcePool.total > 0);

  el.innerHTML = activeZones.map(zone => {
    const active = golemsInZone(zone.id);
    const slots  = zone.maxSlots;
    const yieldsStr = zone.yields.map(r => RESOURCES[r].icon).join(" ");
    const dangerStr = "⚠️".repeat(zone.danger) || "✅";

    // Format resource pool display
    const resourcesStr = zone.resourcePool ? fmtResources(zone.resourcePool.total) : "?";
    const resourceColor = zone.resourcePool && zone.resourcePool.total < 1000 ? "var(--red)" : "var(--amber)";

    // Build slot rows
    let slotsHtml = "";
    for (let i = 0; i < slots; i++) {
      const golem = active[i];
      if (golem) {
        // Occupied slot — show golem info + recall button
        const def = GOLEM_TYPES[golem.typeId];
        const stateLabel =
          golem.state === "traveling" && golem.tripPhase === "out" ? "→ traveling" :
          golem.state === "gathering" ? "⛏️ gathering" :
          golem.state === "traveling" && golem.tripPhase === "back" ? "← returning" : "idle";
        slotsHtml += `
          <div class="zone-slot occupied" id="zslot-${zone.id}-${i}">
            <span class="slot-golem-name">${golem.name}</span>
            <span class="slot-tier">T${def.tier}</span>
            <span class="slot-state" id="zstate-${golem.id}">${stateLabel}</span>
            <div class="slot-progress-bar">
              <div class="slot-progress-fill" id="zprog-${golem.id}" style="width:0%"></div>
            </div>
            <button class="btn-sm" data-action="recall-zone" data-golem="${golem.id}"
              style="margin-top:3px;color:var(--amber);width:100%;">↩ Recall</button>
          </div>`;
      } else {
        // Empty slot — auto-assign first eligible idle golem on click
        const available = idleGolems().filter(g =>
          (g.danger_resist !== undefined ? g.danger_resist : GOLEM_TYPES[g.typeId].danger_resist) >= zone.danger
        );
        if (available.length === 0) {
          slotsHtml += `<div class="zone-slot empty"><span style="color:var(--text-dim);font-size:10px;">[ empty — no eligible golems ]</span></div>`;
        } else {
          const next = available[0];
          const nd = GOLEM_TYPES[next.typeId];
          slotsHtml += `
            <div class="zone-slot empty" id="zslot-${zone.id}-${i}">
              <span style="font-size:10px;color:var(--text-dim);flex:1;">next: ${next.name} (T${nd.tier}, DR:${next.danger_resist})</span>
              <button class="btn-sm" data-action="assign-zone"
                data-zone="${zone.id}" data-golem="${next.id}"
                style="margin-left:4px;color:var(--green);">▶ Send</button>
            </div>`;
        }
      }
    }

    return `
      <div class="zone-card" id="zcard-${zone.id}">
        <div class="zone-header">
          <span class="zone-icon">${zone.icon}</span>
          <span class="zone-name">${zone.name}</span>
          <span class="zone-meta">${dangerStr} | <span class="zone-resources" style="color:${resourceColor};">${resourcesStr}</span> | ${yieldsStr} | ${active.length}/${slots} slots</span>
        </div>
        <div class="zone-slots" id="zslots-${zone.id}">
          ${slotsHtml}
        </div>
      </div>`;
  }).join("");
}

// Update only the state label and progress bar of a golem row (called from tickGolems)
function updateZoneGolemRow(golem) {
  const stateEl = document.getElementById(`zstate-${golem.id}`);
  if (stateEl) {
    const stateLabel =
      golem.state === "traveling" && golem.tripPhase === "out" ? "→ traveling" :
      golem.state === "gathering" ? "⛏️ gathering" :
      golem.state === "traveling" && golem.tripPhase === "back" ? "← returning" : "idle";
    stateEl.textContent = stateLabel;
  }
}

// ─────────────────────────────────────────────────────
// RENDER — GOLEM ROSTER (compact list in workshop)
// ─────────────────────────────────────────────────────

function renderGolemRoster() {
  const el = document.getElementById("golem-roster");
  if (!el) return;
  if (G.golems.length === 0) {
    el.innerHTML = `<div style="color:var(--text-dim);font-size:11px;padding:4px;">No golems yet. Craft one below!</div>`;
    return;
  }
  el.innerHTML = G.golems.map(golem => {
    const def = GOLEM_TYPES[golem.typeId];
    const zone = ZONES.find(z => z.id === golem.zoneId);
    const statusColor = golem.state === "idle" ? "var(--amber)" : "var(--green)";
    const statusText  = golem.state === "idle" ? "Idle" : `→ ${zone?.name || "?"}`;
    const isIdle = golem.state === "idle";

    // Danger resist badge
    const drColor = golem.danger_resist === 0 ? "var(--red)" : golem.danger_resist === 1 ? "var(--amber)" : "var(--green)";
    const drBadge = `<span style="font-size:10px;color:${drColor};margin-left:4px;">DR:${golem.danger_resist}</span>`;

    // Upgrades section (only shown when idle)
    let upgradesHtml = "";
    if (isIdle) {
      upgradesHtml = `<div style="margin-top:4px;padding-top:4px;border-top:1px solid var(--border);">
        <div style="font-size:10px;color:var(--text-dim);margin-bottom:3px;">⬆ Upgrades:</div>`;
      upgradesHtml += GOLEM_UPGRADES.map(upg => {
        const timesApplied = golem.upgrades.filter(u => u === upg.id).length;
        const maxed = timesApplied >= upg.maxLevel;
        const affordable = canAfford(upg.cost);
        const costStr = Object.entries(upg.cost).map(([r,a]) => {
          const have = G.resources[r] || 0;
          const color = have >= a ? "var(--green)" : "var(--red)";
          return `<span style="color:${color}">${a}${RESOURCES[r].icon}</span>`;
        }).join(" ");
        const levelStr = upg.maxLevel > 1 ? ` (${timesApplied}/${upg.maxLevel})` : "";
        return `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;font-size:10px;">
          <span style="flex:1;color:${maxed?'var(--text-dim)':'var(--text)'};">${upg.icon} ${upg.name}${levelStr}</span>
          <span style="color:var(--text-dim);">${upg.desc}</span>
          <span>${costStr}</span>
          <button class="btn-sm" data-action="upgrade-golem" data-golem="${golem.id}" data-upgrade="${upg.id}"
            style="padding:1px 6px;font-size:10px;" ${(maxed || !affordable) ? "disabled" : ""}>
            ${maxed ? "Max" : "Buy"}
          </button>
        </div>`;
      }).join("");
      upgradesHtml += `</div>`;
    }

    return `<div style="border:1px solid var(--border);padding:5px 7px;margin-bottom:5px;background:var(--bg3);">
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="font-size:11px;color:var(--amber);flex:1;">${golem.name}</span>
        <span style="font-size:10px;color:var(--text-dim);">T${def.tier}</span>
        ${drBadge}
        <span style="font-size:10px;color:${statusColor};">${statusText}</span>
        ${isIdle
          ? `<button class="btn-sm" data-action="destroy-golem" data-golem="${golem.id}"
               style="color:var(--red);padding:1px 5px;font-size:10px;">✕</button>`
          : `<button class="btn-sm" data-action="recall-zone" data-golem="${golem.id}"
               style="color:var(--amber);padding:1px 5px;font-size:10px;">↩</button>`
        }
      </div>
      ${upgradesHtml}
    </div>`;
  }).join("");
}

// ─────────────────────────────────────────────────────
// RENDER — PROGRESS BARS (called every frame)
// ─────────────────────────────────────────────────────

function tickProgressBars(now) {
  for (const golem of G.golems) {
    if (golem.state === "idle" || !golem.tripStart || !golem.tripEnd) continue;
    const pct = Math.min(100, ((now - golem.tripStart) / (golem.tripEnd - golem.tripStart)) * 100);
    const progEl = document.getElementById(`zprog-${golem.id}`);
    if (progEl) progEl.style.width = `${pct}%`;
    const stateEl = document.getElementById(`zstate-${golem.id}`);
    if (stateEl) {
      const zone = ZONES.find(z => z.id === golem.zoneId);
      if (golem.state === "traveling" && golem.tripPhase === "out")
        stateEl.textContent = `→ traveling ${Math.floor(pct)}%`;
      else if (golem.state === "gathering")
        stateEl.textContent = `⛏️ gathering ${Math.floor(pct)}%`;
      else if (golem.state === "traveling" && golem.tripPhase === "back")
        stateEl.textContent = `← returning ${Math.floor(pct)}%`;
    }
  }

  // Refresh alchemist cooldown buttons every second
  renderAlchemistActions();

  // Alchemy progress bars
  for (const job of G.alchemyQueue) {
    const pct = Math.min(100, ((now - job.startTime) / (job.endTime - job.startTime)) * 100);
    const remaining = Math.max(0, Math.ceil((job.endTime - now) / 1000));
    const progEl = document.getElementById(`aprog-${job.recipeId}`);
    const timeEl = document.getElementById(`atime-${job.recipeId}`);
    if (progEl) progEl.style.width = `${pct}%`;
    if (timeEl) timeEl.textContent = `${remaining}s`;
  }

  // Research Lab progress bars (only update if on research view)
  if (G.currentView === "researchlab") {
    // Distiller progress bar
    if (G.distiller && G.distiller.currentProcessing) {
      const job = G.distiller.currentProcessing;
      const pct = Math.min(100, ((now - job.startTime) / (job.endTime - job.startTime)) * 100);
      const progEl = document.querySelector('.machine-card .progress-fill');
      if (progEl) progEl.style.width = `${pct}%`;
    }

    // Active research progress - update points display
    if (G.activeResearch) {
      const card = document.querySelector('.active-research-card');
      if (card) {
        const pointsEl = card.querySelector('.progress-fill');
        if (pointsEl) {
          const { pointsAccumulated, pointsNeeded } = G.activeResearch;
          const pct = Math.min(100, (pointsAccumulated / pointsNeeded) * 100);
          pointsEl.style.width = `${pct}%`;
        }
        // Update points text
        const paragraphs = card.querySelectorAll('p');
        const pointsTextEl = paragraphs[paragraphs.length - 1]; // Last <p> tag
        if (pointsTextEl) {
          pointsTextEl.textContent = `${G.activeResearch.pointsAccumulated} / ${G.activeResearch.pointsNeeded} points`;
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────
// RENDER — RESOURCES, RECIPES, ALCHEMY, UPGRADES
// ─────────────────────────────────────────────────────

function renderResources() {
  const el = document.getElementById("resources-display");
  if (!el) return;
  el.innerHTML = Object.entries(G.resources).map(([id, amt]) => {
    const r = RESOURCES[id];
    return `<div class="resource-row">
      <span class="resource-icon">${r.icon}</span>
      <span class="resource-name">${r.name}</span>
      <span class="resource-amount" style="color:${r.color}">${fmt(amt)}</span>
    </div>`;
  }).join("");
}

function renderRecipes() {
  const el = document.getElementById("golem-recipes");
  if (!el) return;
  const maxGolems = WORKSHOP_LEVELS[G.workshopLevel].maxGolems;
  const slots = maxGolems - G.golems.length;
  el.innerHTML = `<div style="color:var(--text-dim);font-size:11px;margin-bottom:6px;">Golem slots: ${G.golems.length}/${maxGolems} &mdash; <span style="color:${slots>0?'var(--green)':'var(--red)'}">${slots} slot(s) free</span></div>`
    + Object.entries(GOLEM_TYPES).map(([typeId, def]) => {
      const workshopLocked = G.workshopLevel < def.unlock;
      const noSlots = slots <= 0;
      const costMissing = !canAfford(def.cost, G.craftCostMult);
      const canCraft = !workshopLocked && !noSlots && !costMissing;

      // Build cost string, highlighting missing resources in red
      const costStr = Object.entries(def.cost).map(([r,a]) => {
        const need = Math.ceil(a * G.craftCostMult);
        const have = G.resources[r] || 0;
        const color = have >= need ? 'var(--green)' : 'var(--red)';
        return `<span style="color:${color}">${need}x ${RESOURCES[r].icon}${RESOURCES[r].name} (${have})</span>`;
      }).join(" ");

      // Reason why disabled
      let blockReason = "";
      if (workshopLocked) blockReason = `<span style="color:var(--red)"> ⚠ Requires Workshop Lvl ${def.unlock}</span>`;
      else if (noSlots)   blockReason = `<span style="color:var(--red)"> ⚠ No golem slots free — upgrade Workshop!</span>`;

      return `<div style="border:1px solid var(--border);padding:6px 8px;margin-bottom:6px;background:var(--bg3);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <span style="color:${workshopLocked?'var(--text-dim)':'var(--amber)'}">${workshopLocked?'\uD83D\uDD12':def.ascii.split('\n')[0]} ${def.name} <span style="color:var(--text-dim);font-size:10px;">Tier ${def.tier}</span></span>
          <button class="btn btn-amber" data-action="craft" data-type="${typeId}" ${canCraft?'':'disabled'}
            style="padding:2px 10px;font-size:11px;">${canCraft ? 'Craft' : workshopLocked ? '\uD83D\uDD12 Locked' : noSlots ? 'No Slots' : 'Missing'}</button>
        </div>
        <div style="font-size:10px;">${costStr}</div>
        ${blockReason ? `<div style="font-size:10px;margin-top:3px;">${blockReason}</div>` : ''}
      </div>`;
    }).join("");
}

function renderAlchemy() {
  const el = document.getElementById("alchemy-display");
  if (!el) return;
  let html = "";
  if (G.alchemyQueue.length > 0) {
    html += `<div style="margin-bottom:8px;color:var(--text-dim);font-size:11px;">Active (${G.alchemyQueue.length}/3):</div>`;
    html += G.alchemyQueue.map(job => {
      const recipe = ALCHEMY_RECIPES.find(r => r.id === job.recipeId);
      const now = Date.now();
      const pct = Math.min(100, ((now - job.startTime) / (job.endTime - job.startTime)) * 100);
      const remaining = Math.max(0, Math.ceil((job.endTime - now) / 1000));
      return `<div style="margin-bottom:6px;">
        <div style="font-size:11px;color:var(--purple);">${recipe.icon} ${recipe.name} — <span id="atime-${job.recipeId}">${remaining}s</span></div>
        <div class="golem-progress-bar">
          <div class="golem-progress-fill" id="aprog-${job.recipeId}" style="width:${pct}%;background:var(--purple);"></div>
        </div>
      </div>`;
    }).join("");
  }
  html += `<div style="margin-top:6px;">`;
  html += ALCHEMY_RECIPES.map(recipe => {
    if (!recipe.unlocked) return `<div class="recipe-row"><span style="color:var(--text-dim)">🔒 ${recipe.name}</span><span class="recipe-cost">Lvl ${recipe.requiresLevel}</span></div>`;

    // Color code ingredients based on availability
    const costStr = Object.entries(recipe.ingredients).map(([r,a]) => {
      const have = G.resources[r] || 0;
      const canAffordThis = have >= a;
      const color = canAffordThis ? 'var(--green)' : 'var(--red)';
      return `<span style="color:${color}">${a}${RESOURCES[r].icon}</span>`;
    }).join(" ");

    const prodStr = Object.entries(recipe.produces).map(([r,a])=>`+${a}${RESOURCES[r].icon}`).join(" ");
    const affordable = canAfford(recipe.ingredients) && G.alchemyQueue.length < 3;
    return `<div class="recipe-row">
      <span class="recipe-name">${recipe.icon} ${recipe.name}</span>
      <span class="recipe-cost">${costStr} → ${prodStr}</span>
      <button class="btn-sm" data-action="brew" data-recipe="${recipe.id}" ${affordable?'':'disabled'}
        style="flex:0;padding:2px 6px;margin-left:4px;">Brew</button>
    </div>`;
  }).join("");
  html += `</div>`;
  el.innerHTML = html;
}

function renderUpgrades() {
  const el = document.getElementById("upgrades-display");
  if (!el) return;
  const currentLevel = WORKSHOP_LEVELS[G.workshopLevel];
  const nextLevel = WORKSHOP_LEVELS[G.workshopLevel + 1];

  // Helper function to render cost with color coding
  const renderCost = (cost) => {
    return Object.entries(cost).map(([r,a]) => {
      const have = G.resources[r] || 0;
      const canAffordThis = have >= a;
      const color = canAffordThis ? 'var(--green)' : 'var(--red)';
      return `<span style="color:${color}">${a}x ${RESOURCES[r].icon}</span>`;
    }).join(" ");
  };

  let workshopHtml = nextLevel
    ? `<button class="btn btn-amber" data-action="upgrade-workshop" ${canAfford(nextLevel.cost)?'':'disabled'}>
        🏗️ Upgrade Workshop: ${currentLevel.name} (Lvl ${G.workshopLevel}) → ${nextLevel.name} (Lvl ${nextLevel.level})
        <div class="btn-cost">${renderCost(nextLevel.cost)}</div>
      </button>`
    : `<div style="color:var(--green-dim);font-size:11px;">Workshop at MAX level: ${currentLevel.name} (Lvl ${G.workshopLevel})</div>`;
  const upgradesHtml = UPGRADES.map(upg => {
    const locked = upg.requiresLevel > G.workshopLevel;
    const affordable = canAfford(upg.cost) && !upg.purchased && !locked;
    return `<div class="upgrade-card ${upg.purchased?'purchased':''}">
      <div class="upgrade-name">${upg.purchased?"✅":"🔧"} ${upg.name}</div>
      <div class="upgrade-desc">${upg.desc}</div>
      ${!upg.purchased?`<button class="btn" style="margin-top:4px;" data-action="buy-upgrade" data-upgrade="${upg.id}" ${affordable?'':'disabled'}>
        ${locked?`🔒 Lvl ${upg.requiresLevel}`:`Buy — ${renderCost(upg.cost)}`}
      </button>`:''}
    </div>`;
  }).join("");
  el.innerHTML = workshopHtml + upgradesHtml;
}

function renderMap(zoneId) {
  const el = document.getElementById("ascii-map");
  if (!el) return;
  const key = zoneId || "workshop";
  let colored = ASCII_MAPS[key] || ASCII_MAPS.workshop;
  const activeInZone = G.golems.filter(g => g.zoneId === zoneId && g.state !== "idle");
  if (activeInZone.length > 0) colored += `\n<span style="color:var(--amber)">  [${activeInZone.length} golem(s) active here]</span>`;
  el.innerHTML = colored;
}

function renderLog() {
  const el = document.getElementById("event-log");
  if (!el) return;
  el.innerHTML = G.eventLog.slice(0, 50).map(e => {
    const cls = e.type==="good"?"log-good":e.type==="warn"?"log-warn":e.type==="great"?"log-great":"log-info";
    return `<div class="log-entry"><span class="log-time">[${e.t}]</span> <span class="${cls}">${e.msg}</span></div>`;
  }).join("");
}

function renderFooter() {
  const el = document.getElementById("footer-time");
  if (el) {
    const wl = WORKSHOP_LEVELS[G.workshopLevel];
    const busy = G.golems.filter(g => g.state !== "idle").length;
    el.textContent = `Workshop: ${wl.name} (Lvl ${G.workshopLevel}) | Golems: ${G.golems.length}/${wl.maxGolems} (${busy} active) | Time: ${fmtTime(G.totalTime)}`;
  }
}

function renderAll() {
  renderResources();
  renderRecipes();
  renderAlchemy();
  renderUpgrades();
  renderMap(null);
  renderFooter();
  renderGolemRoster();
  renderZones();
  renderAlchemistActions();
}

// ─────────────────────────────────────────────────────
// ALCHEMIST MANUAL GATHER
// ─────────────────────────────────────────────────────

// The alchemist can personally gather from any zone (no golem needed)
// Uses a cooldown per zone to prevent spam
const ALCHEMIST_COOLDOWNS = {};
const ALCHEMIST_GATHER_COOLDOWN = 8000; // 8 seconds per zone

function alchemistGather(zoneId) {
  // Check if alchemist is busy exploring
  if (G.alchemistState !== "idle") {
    log("Can't gather while exploring!", "warn");
    return;
  }

  const zone = ZONES.find(z => z.id === zoneId);
  if (!zone) return;
  const now = Date.now();
  const last = ALCHEMIST_COOLDOWNS[zoneId] || 0;
  if (now - last < ALCHEMIST_GATHER_COOLDOWN) {
    const remaining = Math.ceil((ALCHEMIST_GATHER_COOLDOWN - (now - last)) / 1000);
    log(`⏳ You need to rest ${remaining}s before gathering from ${zone.name} again.`, "warn");
    return;
  }
  // Alchemist gathers 1-3 random resources from zone (small amount)
  const yields = [...zone.yields];
  const collected = {};
  let amount = Math.floor(Math.random() * 2) + 1; // 1-2 items
  for (let i = 0; i < amount; i++) {
    const res = randomFrom(yields);
    collected[res] = (collected[res] || 0) + 1;
  }
  for (const [res, amt] of Object.entries(collected)) {
    G.resources[res] = (G.resources[res] || 0) + amt;
  }
  ALCHEMIST_COOLDOWNS[zoneId] = now;
  const summary = Object.entries(collected).map(([r,a]) => `${a}x ${RESOURCES[r].icon}`).join(" ");
  log(`🧙 You gathered: ${summary} from ${zone.name}.`, "good");
  renderResources();
  renderRecipes();
  renderZones(); // refresh cooldown buttons
}

function renderAlchemistActions() {
  const el = document.getElementById("alchemist-actions");
  if (!el) return;
  const now = Date.now();
  el.innerHTML = ZONES.map(zone => {
    const last = ALCHEMIST_COOLDOWNS[zone.id] || 0;
    const elapsed = now - last;
    const onCooldown = elapsed < ALCHEMIST_GATHER_COOLDOWN;
    const remaining = onCooldown ? Math.ceil((ALCHEMIST_GATHER_COOLDOWN - elapsed) / 1000) : 0;
    const yieldsStr = zone.yields.map(r => RESOURCES[r].icon).join(" ");
    return `<button class="btn" data-action="alchemist-gather" data-zone="${zone.id}"
      style="margin-bottom:4px;width:100%;text-align:left;${onCooldown ? 'opacity:0.5;' : ''}"
      ${onCooldown ? 'disabled' : ''}>
      ${zone.icon} ${zone.name} — ${yieldsStr}
      ${onCooldown ? `<span style="color:var(--text-dim);font-size:10px;"> (${remaining}s)</span>` : ''}
    </button>`;
  }).join("");
}

// ─────────────────────────────────────────────────────
// RESET GAME
// ─────────────────────────────────────────────────────

function resetGame() {
  const modal = document.getElementById('reset-modal');
  if (modal) modal.style.display = 'flex';
}

function confirmReset() {
  localStorage.removeItem("alch_auto_save");
  location.reload();
}

function cancelReset() {
  const modal = document.getElementById('reset-modal');
  if (modal) modal.style.display = 'none';
}

// ─────────────────────────────────────────────────────
// SAVE / LOAD
// ─────────────────────────────────────────────────────

function saveGame() {
  try {
    localStorage.setItem("alch_auto_save", JSON.stringify({
      resources: G.resources, golems: G.golems, nextGolemId: G.nextGolemId,
      workshopLevel: G.workshopLevel, alchemyQueue: G.alchemyQueue,
      alchemySpeedMult: G.alchemySpeedMult, golemSpeedMult: G.golemSpeedMult,
      golemBonusCapacity: G.golemBonusCapacity, essenceMult: G.essenceMult,
      craftCostMult: G.craftCostMult, lunarAttunement: G.lunarAttunement,
      totalTime: G.totalTime, prestigeCount: G.prestigeCount,
      upgrades: UPGRADES.map(u=>({id:u.id,purchased:u.purchased})),
      recipes: ALCHEMY_RECIPES.map(r=>({id:r.id,unlocked:r.unlocked})),
      zoneSlotsOverride: ZONES.map(z=>({id:z.id,maxSlots:z.maxSlots})),
      zonePools: ZONES.map(z=>({id:z.id, resourcePool:z.resourcePool})),
      worldMap: G.worldMap,
      alchemistState: G.alchemistState,
      explorationTarget: G.explorationTarget,
      explorationEndTime: G.explorationEndTime,
      currentView: G.currentView,
      // Research Lab State
      distiller: G.distiller,
      injector: G.injector,
      activeResearch: G.activeResearch,
      researchQueue: G.researchQueue,
      researchNodes: G.researchNodes,
      injectionPointsMult: G.injectionPointsMult,
      alchemyProductivityBonus: G.alchemyProductivityBonus,
      autoDistiller: G.autoDistiller,
      autoResearch: G.autoResearch,
      savedAt: Date.now(),
    }));
  } catch(e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem("alch_auto_save");
    if (!raw) return;
    const save = JSON.parse(raw);
    Object.assign(G.resources, save.resources||{});
    G.golems           = (save.golems||[]).map(g => ({
      ...g,
      upgrades: g.upgrades || [],
      danger_resist: g.danger_resist !== undefined ? g.danger_resist : (GOLEM_TYPES[g.typeId]?.danger_resist || 0),
      bonus_capacity: g.bonus_capacity || 0,
      speed_mult: g.speed_mult || 1.0
    }));
    G.nextGolemId      = save.nextGolemId||1;
    G.workshopLevel    = save.workshopLevel||0;
    G.alchemyQueue     = save.alchemyQueue||[];
    G.alchemySpeedMult = save.alchemySpeedMult||1;
    G.golemSpeedMult   = save.golemSpeedMult||1;
    G.golemBonusCapacity = save.golemBonusCapacity||0;
    G.essenceMult      = save.essenceMult||1;
    G.craftCostMult    = save.craftCostMult||1;
    G.lunarAttunement  = save.lunarAttunement||false;
    G.totalTime        = save.totalTime||0;
    G.prestigeCount    = save.prestigeCount||0;
    if (save.upgrades) save.upgrades.forEach(su => {
      const upg = UPGRADES.find(u=>u.id===su.id);
      if (upg && su.purchased && !upg.purchased) { upg.purchased=true; upg.effect(); }
    });
    if (save.recipes) save.recipes.forEach(sr => {
      const rec = ALCHEMY_RECIPES.find(r=>r.id===sr.id);
      if (rec) rec.unlocked = sr.unlocked;
    });
    // Also unlock any recipes that should be unlocked based on current workshop level
    // (handles new recipes added after save was created)
    ALCHEMY_RECIPES.forEach(r => {
      if (r.requiresLevel !== undefined && r.requiresLevel <= G.workshopLevel) r.unlocked = true;
    });
    if (save.zoneSlotsOverride) save.zoneSlotsOverride.forEach(sz => {
      const zone = ZONES.find(z=>z.id===sz.id);
      if (zone) zone.maxSlots = sz.maxSlots;
    });

    // Initialize or restore zone resource pools
    if (save.zonePools) {
      save.zonePools.forEach(sp => {
        const zone = ZONES.find(z=>z.id===sp.id);
        if (zone) zone.resourcePool = sp.resourcePool;
      });
    } else {
      // Legacy save: initialize with full pools
      initializeZoneResources();
    }

    // Restore or initialize worldmap
    if (save.worldMap) {
      G.worldMap = save.worldMap;
    } else {
      // Legacy save: initialize new worldmap
      initializeWorldMap();
    }

    // Restore exploration state
    G.alchemistState = save.alchemistState || "idle";
    G.explorationTarget = save.explorationTarget || null;
    G.explorationEndTime = save.explorationEndTime || null;
    G.currentView = "workshop"; // Always reset to workshop view on load

    // Handle in-progress exploration
    if (G.explorationEndTime && G.explorationEndTime < Date.now()) {
      if (G.alchemistState === "exploring") {
        completeExploration();
      } else if (G.alchemistState === "returning") {
        completeReturn();
      }
    }

    // Restore Research Lab State
    G.distiller = save.distiller || null;
    G.injector = save.injector || null;
    G.activeResearch = save.activeResearch || null;
    G.researchQueue = save.researchQueue || [];
    G.researchNodes = save.researchNodes || {};
    G.injectionPointsMult = save.injectionPointsMult || 1;
    G.alchemyProductivityBonus = save.alchemyProductivityBonus || 0;
    G.autoDistiller = save.autoDistiller || false;
    G.autoResearch = save.autoResearch || false;

    // Handle in-progress distillation (complete if finished during offline)
    if (G.distiller && G.distiller.currentProcessing) {
      if (G.distiller.currentProcessing.endTime < Date.now()) {
        completeDistilling();
        // Process queue if items remain
        while (G.distiller.processingQueue.length > 0 && G.distiller.processingQueue[0].endTime < Date.now()) {
          G.distiller.currentProcessing = G.distiller.processingQueue.shift();
          completeDistilling();
        }
        // Start next if available
        if (G.distiller.processingQueue.length > 0) {
          G.distiller.currentProcessing = G.distiller.processingQueue.shift();
        }
      }
    }

    // Re-apply research effects
    Object.entries(G.researchNodes).forEach(([nodeId, data]) => {
      const node = RESEARCH_NODES.find(n => n.id === nodeId);
      if (node && node.effect && data.level > 0) {
        node.effect(data.level);
      }
    });

    const elapsed = Math.floor((Date.now() - (save.savedAt||Date.now())) / 1000);
    if (elapsed > 5) {
      log(`⏰ Welcome back! Away for ${fmtTime(elapsed)}.`, "great");
      G.golems.forEach(golem => {
        if (golem.state !== "idle" && golem.zoneId) {
          const def  = GOLEM_TYPES[golem.typeId];
          const zone = ZONES.find(z=>z.id===golem.zoneId);
          const tripTime = def.speed * G.golemSpeedMult;
          const trips = Math.floor(elapsed / (tripTime*2+3));
          if (trips > 0 && zone && zone.resourcePool && zone.resourcePool.total > 0) {
            const capacity = def.capacity + G.golemBonusCapacity + (golem.bonus_capacity || 0);
            let completedTrips = 0;
            for (let t=0; t<trips; t++) {
              // Check if zone is depleted before this trip
              if (zone.resourcePool.total <= 0) break;

              let remaining = capacity;
              let tripGathered = 0;
              const yields = [...zone.yields];
              while (remaining > 0) {
                const res = randomFrom(yields);
                const amt = Math.min(remaining, Math.ceil(Math.random()*3)+1);
                G.resources[res] = (G.resources[res]||0) + amt;
                remaining -= amt;
                tripGathered += amt;

                // Deplete from byType
                if (zone.resourcePool.byType) {
                  zone.resourcePool.byType[res] = Math.max(0, (zone.resourcePool.byType[res] || 0) - amt);
                }
              }

              // Deplete zone total
              zone.resourcePool.total = Math.max(0, zone.resourcePool.total - tripGathered);
              completedTrips++;

              // Check if zone depleted during offline progress
              if (zone.resourcePool.total === 0) {
                log(`💀 ${zone.name} was depleted during offline progress!`, "warn");
                break;
              }
            }
            if (completedTrips > 0) {
              log(`📦 ${golem.name} made ${completedTrips} trips while away!`, "good");
            }
          }
          golem.state = "idle"; golem.zoneId = null; golem.tripPhase = null;
        }
      });
    }
    log("💾 Game loaded.", "info");
  } catch(e) { log("⚠️ Could not load save.", "warn"); }
}

// ─────────────────────────────────────────────────────
// MAIN GAME LOOP
// ─────────────────────────────────────────────────────

let lastTick = Date.now();
let saveTimer = 0;

function gameLoop() {
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = now;
  G.totalTime += delta / 1000;

  tickGolems(now);
  tickAlchemy(now);
  tickExploration(now);
  tickDistiller(now);
  tickResearch(now);
  tickProgressBars(now);

  saveTimer += delta;
  if (saveTimer >= 1000) {
    renderFooter();
    saveTimer -= 1000;
  }
  if (Math.floor(G.totalTime) % 30 === 0 && Math.floor(G.totalTime) > 0) saveGame();

  requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────────────
// EVENT DELEGATION
// ─────────────────────────────────────────────────────

function setupEventDelegation() {
  document.getElementById('app').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;

    if (action === 'assign-zone') {
      const zoneId  = btn.dataset.zone;
      const golemId = Number(btn.dataset.golem);
      if (!golemId) { log("No eligible golem available!", "warn"); return; }
      assignGolemToZone(golemId, zoneId);

    } else if (action === 'recall-zone')    { recallGolem(Number(btn.dataset.golem));
    } else if (action === 'destroy-golem')  { destroyGolem(Number(btn.dataset.golem));
    } else if (action === 'craft')          { craftGolem(btn.dataset.type);
    } else if (action === 'brew')           { startAlchemy(btn.dataset.recipe);
    } else if (action === 'upgrade-workshop'){ upgradeWorkshop();
    } else if (action === 'buy-upgrade')    { buyUpgrade(btn.dataset.upgrade);
    } else if (action === 'reset-game')     { resetGame();
    } else if (action === 'confirm-reset')   { confirmReset();
    } else if (action === 'cancel-reset')    { cancelReset();
    } else if (action === 'alchemist-gather'){ alchemistGather(btn.dataset.zone);
    } else if (action === 'upgrade-golem')    { upgradeGolem(btn.dataset.golem, btn.dataset.upgrade);
    } else if (action === 'show-worldmap')  { showWorldMap();
    } else if (action === 'show-workshop')  { showWorkshop();
    } else if (action === 'explore-tile')   { startExploration(Number(btn.dataset.row), Number(btn.dataset.col));
    } else if (action === 'cancel-exploration') { cancelExploration();

    // Research Lab Actions
    } else if (action === 'show-researchlab') { showResearchLab();
    } else if (action === 'hide-researchlab') { hideResearchLab();
    } else if (action === 'build-distiller')  { buildDistiller();
    } else if (action === 'build-injector')   { buildInjector();
    } else if (action === 'distill')          { startDistilling(Number(btn.dataset.amount));
    } else if (action === 'queue-research')   { queueResearch(btn.dataset.nodeId);
    } else if (action === 'cancel-research')  { cancelActiveResearch();
    } else if (action === 'remove-from-queue') { removeFromQueue(btn.dataset.nodeId);
    }
  });
}

// ─────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", function() {
  loadGame();

  // Initialize zone resources if not loaded from save
  ZONES.forEach(zone => {
    if (!zone.resourcePool) {
      initializeZoneResources();
      return; // Only need to call once
    }
  });

  // Initialize worldmap if not loaded from save
  if (!G.worldMap) {
    initializeWorldMap();
  }

  renderAll();
  setupEventDelegation();
  log("🧪 Welcome, Alchemist! Craft your first Golem to begin.", "great");
  log("💡 Tip: Craft a golem, then assign it to a zone using the Zones panel.", "info");
  log("💡 Tip: Each zone has limited slots — manage your golems wisely!", "info");
  requestAnimationFrame(gameLoop);
});
