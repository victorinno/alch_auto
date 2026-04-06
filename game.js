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
  condensed_knowledge_alchemy:    { name: "Alchemy Condensed Knowledge",    icon: "💧", color: "#4488ff" },
  prepared_knowledge_alchemy:     { name: "Alchemy Prepared Knowledge",     icon: "⚗️", color: "#aa66ff" },
  condensed_knowledge_divination: { name: "Divination Condensed Knowledge", icon: "🔮💧", color: "#cc44ff" },
  philosophers_draft:          { name: "Philosopher's Draft",           icon: "🧪", color: "#ff6688" },
  soul_crystal:                { name: "Soul Crystal",                  icon: "💠", color: "#ffddff" },
  divination_shard:            { name: "Divination Shard",              icon: "🔮", color: "#cc44ff" },
  artifact:                    { name: "Ancient Artifact",              icon: "🏺", color: "#ffb347" },
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
// SPECIAL TILE TYPES
// ─────────────────────────────────────────────────────

const SPECIAL_TILE_TYPES = {
  merchant: { icon: "🛒", label: "Merchant Caravan", spawnChance: 0.15,
    desc: "A travelling merchant offering rare trades. Trades once then moves on." },
  shrine:   { icon: "⛩️",  label: "Ancient Shrine",   spawnChance: 0.10,
    desc: "An ancient shrine radiating power. Grants a 10-minute global buff." },
  boss:     { icon: "💀", label: "Boss Lair",         spawnChance: 0.08,
    desc: "A dangerous lair. Send tier-2+ golems to clear it for artifacts." },
};

// 5 possible merchant trades; 3 chosen at random each visit
const MERCHANT_CATALOG = [
  { id: "mc_1", offer: { res: "moonstone", amt: 3 },  cost: { res: "gold",    amt: 80  }, label: "3🌙 for 80🪙" },
  { id: "mc_2", offer: { res: "essence",  amt: 15 }, cost: { res: "gold",    amt: 60  }, label: "15✨ for 60🪙" },
  { id: "mc_3", offer: { res: "crystals", amt: 20 }, cost: { res: "sulfur",  amt: 10  }, label: "20💎 for 10🔥" },
  { id: "mc_4", offer: { res: "artifact", amt: 1  }, cost: { res: "moonstone",amt: 5  }, label: "1🏺 for 5🌙" },
  { id: "mc_5", offer: { res: "gold",     amt: 120 }, cost: { res: "essence", amt: 20  }, label: "120🪙 for 20✨" },
];

// Shrine buff magnitudes
const SHRINE_BUFF = {
  golemSpeedMult:    1.5,   // ×1.5 travel speed
  golemBonusCapacity: 5,    // +5 capacity
  alchemySpeedMult:  1.5,   // ×1.5 alchemy speed
  essenceMult:       1.5,   // ×1.5 essence production
  craftCostMult:     0.75,  // ×0.75 craft cost (25% cheaper)
  duration:          600000, // 10 minutes in ms
};

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
  // Tier 5 — Intelligent Golems (require Divination research)
  feeder:   { name: "Feeder Golem",   tier: 5, ascii: " (^_^) \n [   ] \n  | | ", speed: 5, capacity: 10, danger_resist: 0, cost: { divination_shard: 2, clay: 5, essence: 8 },        unlock: 0, role: "feeder"   },
  carrier:  { name: "Carrier Golem",  tier: 5, ascii: " (~_~) \n [___] \n  | | ", speed: 5, capacity: 20, danger_resist: 1, cost: { divination_shard: 2, iron: 4, crystals: 6 },       unlock: 1, role: "carrier"  },
  // Tier 5 — Explorer Golems (require Expedition Mastery research)
  explorer: { name: "Explorer Golem", tier: 5, ascii: " (>_<) \n [=X=] \n  | | ", speed: 5, capacity: 15, danger_resist: 0, cost: { divination_shard: 3, moonstone: 2, essence: 12 }, unlock: 2, role: "explorer" },
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
  // Divination — produces shards used to craft intelligent golems
  { id: "divination_brew",     name: "Divination Brew",     icon: "🔮", ingredients: { soul_crystal: 2, moonstone: 3, essence: 10 },                                  produces: { divination_shard: 3 },               time: 25, unlocked: false, requiresLevel: 3 },
  // Divination Condensed Knowledge — feeds the Divination research pipeline
  { id: "divination_condensed_knowledge", name: "Divination Condensed Knowledge", icon: "🔮💧", ingredients: { divination_shard: 2, soul_crystal: 1, essence: 8 }, produces: { condensed_knowledge_divination: 3 }, time: 20, unlocked: false, requiresLevel: 3 },
];

// ─────────────────────────────────────────────────────
// RESEARCH NODES
// ─────────────────────────────────────────────────────

const RESEARCH_NODES = [
  // ═══════════════════════════════════════════════════
  // TIER 0 — Foundation Unlocks
  // ═══════════════════════════════════════════════════
  {
    id: "alembic_automation",
    name: "Alembic Automation",
    desc: "Unlocks Alembics - multiply production by assigning multiple units to recipes.",
    icon: "⚗️",
    tier: 0,
    knowledgeType: "alchemy",
    prerequisites: [],
    baseCost: 50,
    infinite: false,
    maxLevel: 1,
    effect: (level) => {
      G.alembicsUnlocked = true;
      log('🔓 Alembic Automation unlocked! Build Alembics to scale production.', 'great');
      renderAlembicsBtn();
    }
  },

  // ═══════════════════════════════════════════════════
  // TIER 1 — Infinite Research Nodes (4 nodes)
  // ═══════════════════════════════════════════════════
  {
    id: "distiller_speed",
    name: "Distiller Efficiency",
    desc: "Reduce distillation time by 5% per level.",
    icon: "⚡",
    tier: 1,
    knowledgeType: "alchemy",
    prerequisites: [],
    baseCost: 100,
    infinite: true,
    maxLevel: Infinity,
    effect: (level) => {
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
    knowledgeType: "alchemy",
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
    knowledgeType: "alchemy",
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
    knowledgeType: "alchemy",
    prerequisites: [],
    baseCost: 100,
    infinite: true,
    maxLevel: Infinity,
    effect: (level) => {
      G.alchemyProductivityBonus = level;
    }
  },
  {
    id: "alembic_capacity",
    name: "Alembic Expansion",
    desc: "Increase maximum Alembic capacity by +1 per level.",
    icon: "⚗️",
    tier: 1,
    knowledgeType: "alchemy",
    prerequisites: ["alembic_automation"],
    baseCost: 200,
    infinite: true,
    maxLevel: Infinity,
    effect: (level) => {
      G.maxAlembics = 5 + level;
    }
  },

  // ═══════════════════════════════════════════════════
  // TIER 2 — One-Time Unlocks
  // ═══════════════════════════════════════════════════
  {
    id: "auto_distiller",
    name: "Automated Distillery",
    desc: "Distiller automatically processes both Condensed Knowledge types when available.",
    icon: "🤖",
    tier: 2,
    knowledgeType: "alchemy",
    prerequisites: ["distiller_speed"],
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
    knowledgeType: "alchemy",
    prerequisites: ["injection_points"],
    baseCost: 500,
    infinite: false,
    maxLevel: 1,
    effect: (level) => {
      G.autoResearch = true;
    }
  },
  {
    id: "divination",
    name: "Divination",
    desc: "Imbue golems with intelligence. Unlocks Feeder and Carrier Golems. Requires both Alchemy PK and Divination PK to research.",
    icon: "🔮",
    tier: 2,
    knowledgeType: "divination",
    prerequisites: ["alembic_automation"],
    baseCost: 800,
    infinite: false,
    maxLevel: 1,
    effect: (level) => {
      G.intelligentGolemsUnlocked = true;
      log('🔮 Divination unlocked! Craft Feeder and Carrier Golems to automate your Alembics.', 'great');
      renderRecipes();
    }
  },
  {
    id: "explorer_golem",
    name: "Expedition Mastery",
    desc: "Unlock Explorer Golems — dispatchers that automatically send regular golems to gather tracked resources.",
    icon: "🧭",
    tier: 2,
    knowledgeType: "divination",
    prerequisites: ["divination"],
    baseCost: 1200,
    infinite: false,
    maxLevel: 1,
    effect: (level) => {
      G.explorerGolemsUnlocked = true;
      log('🧭 Expedition Mastery unlocked! Craft Explorer Golems to automate zone gathering.', 'great');
      renderRecipes();
      renderExpeditionBtn();
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
    condensed_knowledge_alchemy: 0, prepared_knowledge_alchemy: 0, philosophers_draft: 0, soul_crystal: 0,
    divination_shard: 0, condensed_knowledge_divination: 0, artifact: 0
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
  intelligentGolemsUnlocked: false, // Divination research unlock
  explorerGolemsUnlocked: false,    // Expedition Mastery research unlock

  // Alembic Automation State
  alembicsUnlocked: false,      // Unlocked via research
  alembicsBuilt: 0,             // Number of Alembics built (0-5)
  maxAlembics: 5,               // Maximum number of Alembics
  alembicConfigs: {},           // { recipeId: { recipeId, allocatedAlembics, inputBuffers, outputBuffer, speedBoost, currentCraft } }

  // World Map Expansion State
  mapRing: 0,                  // 0=3×3, 1=5×5, 2=7×7, 3=9×9 (max)
  tileData: {},                // { "row,col": { type, merchantOffers, shrineActivatedAt, bossRespawnAt } }
  activeShrineBuffs: [],       // [{ endTime, origSpeed, origCapacity, origAlchemy, origEssence, origCraft }]
  bossRespawnQueue: [],        // [{ spawnAt }] — pending boss respawns

  // Tutorial State
  tutorialStep: -1,   // -1 = inactive, 0+ = current step index
  tutorialSeen: false, // true after first completion/skip

  // Debug Mode (session-only, does not persist)
  debugMode: false              // Toggle with F2 key
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

  // Roll for special tile
  const roll = Math.random();
  let specialType = null;
  let cumulative = 0;
  for (const [type, def] of Object.entries(SPECIAL_TILE_TYPES)) {
    cumulative += def.spawnChance;
    if (roll < cumulative) { specialType = type; break; }
  }

  if (specialType) {
    tile.explored = true;
    tile.zoneType = "special_" + specialType;
    tile.resourcePool = null;
    // Initialize tile data
    const key = `${row},${col}`;
    if (specialType === "merchant") {
      G.tileData[key] = { type: specialType, merchantOffers: pickMerchantOffers() };
    } else {
      G.tileData[key] = { type: specialType };
    }
    // Reset alchemist state
    G.alchemistState = "idle";
    G.explorationTarget = null;
    G.explorationEndTime = null;
    log(`✅ Discovered ${SPECIAL_TILE_TYPES[specialType].label}! ${SPECIAL_TILE_TYPES[specialType].icon}`, "great");
  } else {
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
  }

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
// SPECIAL TILES & MAP EXPANSION
// ─────────────────────────────────────────────────────

function pickMerchantOffers() {
  const shuffled = [...MERCHANT_CATALOG].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(o => o.id);
}

function getMapSize() {
  if (!G.worldMap || !G.worldMap.tiles) return 3;
  return G.worldMap.tiles.length;
}

function expandWorldMap() {
  const currentSize = getMapSize();
  const maxSize = 9;
  if (currentSize >= maxSize) { log("Map already at maximum size!", "warn"); return; }

  const ring = G.mapRing + 1;
  const cost = { moonstone: ring * 3, essence: ring * 5 };
  if (!canAfford(cost)) { log("Not enough resources to expand the map!", "warn"); return; }
  spend(cost);

  const newSize = currentSize + 2;
  const offset = 1; // shift existing tiles by 1 in each direction

  // Build new tile grid
  const newTiles = [];
  for (let r = 0; r < newSize; r++) {
    newTiles[r] = [];
    for (let c = 0; c < newSize; c++) {
      const oldR = r - offset;
      const oldC = c - offset;
      if (oldR >= 0 && oldR < currentSize && oldC >= 0 && oldC < currentSize) {
        // Copy existing tile, update position
        const t = G.worldMap.tiles[oldR][oldC];
        newTiles[r][c] = { ...t, position: [r, c] };
      } else {
        // New border tile — unknown
        const centerR = Math.floor(newSize / 2);
        const centerC = Math.floor(newSize / 2);
        const distance = Math.round(Math.sqrt((r - centerR)**2 + (c - centerC)**2) * 10) / 10;
        newTiles[r][c] = { explored: false, zoneType: null, resourcePool: null, position: [r, c], distance };
      }
    }
  }

  // Remap tileData keys to new coordinates
  const newTileData = {};
  for (const [key, data] of Object.entries(G.tileData)) {
    const [or, oc] = key.split(",").map(Number);
    newTileData[`${or + offset},${oc + offset}`] = data;
  }
  G.tileData = newTileData;

  G.worldMap = { tiles: newTiles };
  G.mapRing = ring;

  log(`🗺️ Map expanded to ${newSize}×${newSize}! New regions await exploration.`, "great");
  saveGame();
  renderWorldMap();
  renderResources();
}

function interactSpecialTile(row, col) {
  const key = `${row},${col}`;
  const data = G.tileData[key];
  if (!data) return;

  if (data.type === "merchant") interactMerchant(row, col);
  else if (data.type === "shrine") interactShrine(row, col);
  else if (data.type === "boss") interactBoss(row, col);
}

function interactMerchant(row, col) {
  const key = `${row},${col}`;
  const data = G.tileData[key];
  if (!data || !data.merchantOffers) return;

  // Build offer HTML into the world map panel
  const offersHtml = data.merchantOffers.map(offerId => {
    const offer = MERCHANT_CATALOG.find(o => o.id === offerId);
    if (!offer) return "";
    const offerRes = RESOURCES[offer.offer.res];
    const costRes  = RESOURCES[offer.cost.res];
    const canDo    = (G.resources[offer.cost.res] || 0) >= offer.cost.amt;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px;border:1px solid var(--border);margin-bottom:4px;background:var(--bg3);">
      <span style="font-size:12px;">${offerRes.icon} +${offer.offer.amt} ${offerRes.name}</span>
      <span style="color:var(--text-dim);font-size:11px;">for</span>
      <span style="font-size:12px;">${costRes.icon} ${offer.cost.amt} ${costRes.name}</span>
      <button class="btn-sm" data-action="merchant-trade" data-row="${row}" data-col="${col}" data-offer="${offerId}"
        ${canDo ? "" : "disabled"} style="color:var(--green);">Trade</button>
    </div>`;
  }).join("");

  const panel = document.getElementById("worldmap-panel");
  if (!panel) return;

  // Inject merchant panel below the grid
  let existing = document.getElementById("special-tile-panel");
  if (!existing) {
    existing = document.createElement("div");
    existing.id = "special-tile-panel";
    panel.appendChild(existing);
  }
  existing.innerHTML = `
    <div style="margin-top:16px;padding:12px;border:1px solid var(--amber);background:var(--bg2);max-width:480px;margin-left:auto;margin-right:auto;">
      <h3 style="color:var(--amber);margin:0 0 8px;">🛒 Merchant Caravan</h3>
      <p style="color:var(--text-dim);font-size:11px;margin-bottom:10px;">Trade once and the caravan moves on.</p>
      ${offersHtml}
      <button class="btn" data-action="close-special-panel" style="margin-top:8px;font-size:11px;color:var(--text-dim);">Close</button>
    </div>`;
}

function executeMerchantTrade(row, col, offerId) {
  const key = `${row},${col}`;
  const data = G.tileData[key];
  if (!data || data.type !== "merchant") return;

  const offer = MERCHANT_CATALOG.find(o => o.id === offerId);
  if (!offer) return;
  if ((G.resources[offer.cost.res] || 0) < offer.cost.amt) { log("Not enough resources for that trade!", "warn"); return; }

  spend({ [offer.cost.res]: offer.cost.amt });
  gain({ [offer.offer.res]: offer.offer.amt });

  const offerRes = RESOURCES[offer.offer.res];
  const costRes  = RESOURCES[offer.cost.res];
  log(`🛒 Traded ${offer.cost.amt}${costRes.icon} for ${offer.offer.amt}${offerRes.icon}. Caravan moves on...`, "good");

  // Remove tile and respawn as hidden merchant on a random unknown tile
  const tile = G.worldMap.tiles[row][col];
  tile.explored = false;
  tile.zoneType = null;
  tile.resourcePool = null;
  delete G.tileData[key];

  // Find a random unexplored tile to seed a hidden merchant
  const unknown = [];
  G.worldMap.tiles.forEach((rowArr, r) => rowArr.forEach((t, c) => {
    if (!t.explored && !(r === row && c === col)) unknown.push([r, c]);
  }));
  if (unknown.length > 0) {
    const [nr, nc] = randomFrom(unknown);
    G.tileData[`${nr},${nc}`] = { type: "merchant", merchantOffers: null, hiddenUntilExplored: true };
  }

  saveGame();
  renderResources();
  renderWorldMap();
}

function interactShrine(row, col) {
  // If buff already active, show remaining time
  if (G.activeShrineBuffs.length > 0) {
    const remaining = Math.ceil((G.activeShrineBuffs[0].endTime - Date.now()) / 1000);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    log(`⛩️ Shrine buff already active! ${mins}m ${secs}s remaining.`, "info");
    return;
  }

  // Apply buff — store originals first
  const orig = {
    endTime: Date.now() + SHRINE_BUFF.duration,
    origSpeed:    G.golemSpeedMult,
    origCapacity: G.golemBonusCapacity,
    origAlchemy:  G.alchemySpeedMult,
    origEssence:  G.essenceMult,
    origCraft:    G.craftCostMult,
  };
  G.activeShrineBuffs = [orig];

  G.golemSpeedMult    *= SHRINE_BUFF.golemSpeedMult;
  G.golemBonusCapacity += SHRINE_BUFF.golemBonusCapacity;
  G.alchemySpeedMult  *= SHRINE_BUFF.alchemySpeedMult;
  G.essenceMult       *= SHRINE_BUFF.essenceMult;
  G.craftCostMult     *= SHRINE_BUFF.craftCostMult;

  log("⛩️ Ancient Shrine activated! All bonuses boosted for 10 minutes!", "great");
  saveGame();
  renderFooter();
  renderWorldMap();
}

function expireShrineBuffs(now) {
  if (G.activeShrineBuffs.length === 0) return;
  const buff = G.activeShrineBuffs[0];
  if (now < buff.endTime) return;

  // Revert to originals
  G.golemSpeedMult    = buff.origSpeed;
  G.golemBonusCapacity = buff.origCapacity;
  G.alchemySpeedMult  = buff.origAlchemy;
  G.essenceMult       = buff.origEssence;
  G.craftCostMult     = buff.origCraft;

  G.activeShrineBuffs = [];
  log("⛩️ Shrine buff has expired.", "info");
  renderFooter();
}

function interactBoss(row, col) {
  const key = `${row},${col}`;
  const data = G.tileData[key];
  if (!data || data.type !== "boss") return;

  // Check if lair is on respawn cooldown
  if (data.bossRespawnAt && Date.now() < data.bossRespawnAt) {
    const remaining = Math.ceil((data.bossRespawnAt - Date.now()) / 1000);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    log(`💀 Boss Lair is recovering... ${mins}m ${secs}s remaining.`, "info");
    return;
  }

  // Find eligible idle golems (tier 2+, danger_resist >= 1)
  const eligible = G.golems.filter(g => {
    const def = GOLEM_TYPES[g.typeId];
    return g.state === "idle" && def && def.tier >= 2 && !def.role;
  });

  if (eligible.length < 2) {
    log("💀 Boss Lair requires 2+ idle tier-2 golems (Iron or higher)!", "warn");
    return;
  }

  // Send top 2 eligible golems
  const sent = eligible.slice(0, 2);
  const expeditionEnd = Date.now() + 120000; // 2 minutes

  sent.forEach(golem => {
    golem.state = "traveling";
    golem.tripPhase = "out";
    golem.zoneId = `boss_${row}_${col}`;
    golem.tripStart = Date.now();
    golem.tripEnd = expeditionEnd;
    golem.collected = {};
    golem.bossExpedition = { row, col };
  });

  log(`💀 Sent ${sent.map(g => g.name).join(" & ")} to clear the Boss Lair! (2 min)`, "good");
  saveGame();
  renderWorldMap();
  renderGolemRoster();
}

function completeBossExpedition(golem) {
  const { row, col } = golem.bossExpedition;
  const key = `${row},${col}`;

  // Award artifact
  gain({ artifact: 1 });
  log(`🏺 ${golem.name} returned from the Boss Lair with an Ancient Artifact!`, "great");

  // Set respawn timer on the tile
  if (G.tileData[key]) {
    G.tileData[key].bossRespawnAt = Date.now() + 1800000; // 30 minutes
    G.bossRespawnQueue.push({ spawnAt: Date.now() + 1800000 });
  }

  golem.state = "idle";
  golem.zoneId = null;
  golem.tripStart = null;
  golem.tripEnd = null;
  golem.collected = {};
  golem.bossExpedition = null;

  saveGame();
  renderResources();
  renderWorldMap();
}

function tickWorldMap(now) {
  // Expire shrine buffs
  expireShrineBuffs(now);

  // Process boss respawn queue
  if (G.bossRespawnQueue.length > 0) {
    G.bossRespawnQueue = G.bossRespawnQueue.filter(entry => {
      if (now < entry.spawnAt) return true;
      // Spawn a new boss on a random unknown tile
      const unknown = [];
      G.worldMap.tiles.forEach((rowArr, r) => rowArr.forEach((t, c) => {
        if (!t.explored) unknown.push([r, c]);
      }));
      if (unknown.length > 0) {
        const [nr, nc] = randomFrom(unknown);
        G.tileData[`${nr},${nc}`] = { type: "boss", hiddenUntilExplored: true };
        log("💀 A new Boss Lair has appeared somewhere on the map...", "warn");
      }
      return false;
    });
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
    speedMultiplier: 1.0,
    waitingForSpace: false
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
    currentAmount: 0,
    divinationAmount: 0
  };

  log("💉 Injector built! Can now store Prepared Knowledge for research.", "great");
  saveGame();
  renderResearchLab();
}

// Distiller Processing Functions
function startDistilling(ckAmount, type = "alchemy") {
  if (!G.distiller || !G.distiller.built) {
    log("Distiller not built yet!", "warn");
    return;
  }
  if (G.distiller.processingQueue.length >= 5) {
    log("Distiller queue is full (max 5)!", "warn");
    return;
  }
  const resourceKey = type === "divination" ? "condensed_knowledge_divination" : "condensed_knowledge_alchemy";
  if ((G.resources[resourceKey] || 0) < ckAmount) {
    log(`Not enough ${type === "divination" ? "Divination" : "Alchemy"} Condensed Knowledge!`, "warn");
    return;
  }

  G.resources[resourceKey] -= ckAmount;

  const processingTime = G.distiller.baseProcessingTime * G.distiller.speedMultiplier;
  const now = Date.now();
  const job = { ckAmount, type, startTime: now, endTime: now + processingTime };

  G.distiller.processingQueue.push(job);

  if (!G.distiller.currentProcessing) {
    G.distiller.currentProcessing = G.distiller.processingQueue.shift();
  }

  log(`🔬 Distilling ${ckAmount} ${type === "divination" ? "Divination" : "Alchemy"} Condensed Knowledge...`, "info");
  saveGame();
  renderResearchLab();
}

function tickDistiller(now) {
  if (!G.distiller || !G.distiller.built) return;

  // Auto-start processing if idle and CK is available
  if (!G.distiller.currentProcessing && G.distiller.processingQueue.length === 0) {
    if (G.injector && G.injector.built) {
      const alkCk = G.resources.condensed_knowledge_alchemy || 0;
      const alkCap = G.injector.capacity - G.injector.currentAmount;
      const divCk = G.resources.condensed_knowledge_divination || 0;
      const divCap = G.injector.capacity - (G.injector.divinationAmount || 0);

      // Auto-queue alchemy CK
      if (alkCk > 0 && alkCap > 0) {
        const toQueue = G.autoDistiller ? Math.min(alkCk, 5) : 1;
        startDistilling(toQueue, "alchemy");
        return;
      }
      // Auto-queue divination CK whenever available
      if (divCk > 0 && divCap > 0) {
        const toQueue = G.autoDistiller ? Math.min(divCk, 5) : 1;
        startDistilling(toQueue, "divination");
        return;
      }
    }
  }

  if (!G.distiller.currentProcessing) return;

  if (now >= G.distiller.currentProcessing.endTime) {
    completeDistilling();

    if (G.distiller.processingQueue.length > 0 && G.injector && G.injector.built) {
      const job = G.distiller.processingQueue[0];
      const cap = job.type === "divination"
        ? G.injector.capacity - (G.injector.divinationAmount || 0)
        : G.injector.capacity - G.injector.currentAmount;
      if (cap > 0) {
        G.distiller.currentProcessing = G.distiller.processingQueue.shift();
      }
    } else if (G.injector && G.injector.built) {
      const alkCk = G.resources.condensed_knowledge_alchemy || 0;
      const alkCap = G.injector.capacity - G.injector.currentAmount;
      const divCk = G.resources.condensed_knowledge_divination || 0;
      const divCap = G.injector.capacity - (G.injector.divinationAmount || 0);

      if (alkCk > 0 && alkCap > 0) {
        const toQueue = G.autoDistiller ? Math.min(alkCk, 5) : 1;
        startDistilling(toQueue, "alchemy");
      } else if (divCk > 0 && divCap > 0) {
        const toQueue = G.autoDistiller ? Math.min(divCk, 5) : 1;
        startDistilling(toQueue, "divination");
      }
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

  const jobType = G.distiller.currentProcessing.type || "alchemy";
  const isDivination = jobType === "divination";
  const currentPool = isDivination ? (G.injector.divinationAmount || 0) : G.injector.currentAmount;
  const availableCapacity = G.injector.capacity - currentPool;

  if (pkProduced > availableCapacity) {
    // Injector doesn't have enough space - wait for research to consume some PK
    if (!G.distiller.waitingForSpace) {
      log(`⚠️ Distillation complete, but Injector ${isDivination ? "Divination" : "Alchemy"} pool is full! Waiting for space...`, "warn");
      G.distiller.waitingForSpace = true;
    }
    renderResearchLab();
    return;
  }

  // Clear the waiting flag
  if (G.distiller.waitingForSpace) {
    G.distiller.waitingForSpace = false;
    log(`✅ Injector has space again, continuing distillation...`, "info");
  }

  // Add PK to the correct pool
  if (isDivination) {
    G.injector.divinationAmount = (G.injector.divinationAmount || 0) + pkProduced;
  } else {
    G.injector.currentAmount += pkProduced;
  }
  G.distiller.currentProcessing = null;

  // Track total processed
  if (!G.distiller.totalProcessed) G.distiller.totalProcessed = 0;
  G.distiller.totalProcessed += ckAmount;

  const poolLabel = isDivination ? "Div PK" : "Alchemy PK";
  const poolAmount = isDivination ? G.injector.divinationAmount : G.injector.currentAmount;
  log(`✅ Distilled ${ckAmount} ${isDivination ? "Div CK" : "CK"} → ${pkProduced} ${poolLabel}. Injector: ${poolAmount}/${G.injector.capacity}`, "good");

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

  const resNode = RESEARCH_NODES.find(n => n.id === G.activeResearch.nodeId);
  const isDivinationNode = resNode && resNode.knowledgeType === "divination";

  if (isDivinationNode) {
    // Divination nodes require both alchemy PK and divination PK
    if (G.injector.currentAmount <= 0 || (G.injector.divinationAmount || 0) <= 0) return;
  } else {
    if (G.injector.currentAmount <= 0) return;
  }

  // Consume PK automatically over time
  // Rate: 1 PK per second = 10 points per second
  const timeSinceLastTick = now - G.activeResearch.lastTickTime;
  const secondsElapsed = timeSinceLastTick / 1000;

  if (secondsElapsed >= 1) { // Consume 1 PK per second
    let pkToConsume, pointsGained;
    if (isDivinationNode) {
      pkToConsume = Math.min(1, G.injector.currentAmount, G.injector.divinationAmount || 0);
      if (pkToConsume <= 0) return;
      G.injector.currentAmount -= pkToConsume;
      G.injector.divinationAmount = (G.injector.divinationAmount || 0) - pkToConsume;
      pointsGained = Math.floor(pkToConsume * 10 * G.injectionPointsMult);
    } else {
      pkToConsume = Math.min(1, G.injector.currentAmount);
      pointsGained = Math.floor(pkToConsume * 10 * G.injectionPointsMult);
      G.injector.currentAmount -= pkToConsume;
    }

    // Add points to research
    G.activeResearch.pointsAccumulated += pointsGained;
    G.activeResearch.lastTickTime = now;

    // Log progress for debugging
    log(`🔬 Research progress: +${pointsGained} points (${G.activeResearch.pointsAccumulated}/${G.activeResearch.pointsNeeded})`, "info");

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
  document.getElementById("alembic-panel").style.display = "none";
  document.getElementById("expedition-panel").style.display = "none";

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
// ALEMBIC AUTOMATION LOGIC
// ─────────────────────────────────────────────────────

function buildAlembic() {
  if (!G.alembicsUnlocked) {
    log("Complete Alembic Automation research first!", "warn");
    return;
  }

  if (G.alembicsBuilt >= G.maxAlembics) {
    log(`Maximum ${G.maxAlembics} Alembics already built!`, "warn");
    return;
  }

  const cost = { clay: 20, iron: 15, crystals: 10, gold: 100 };
  if (!canAfford(cost)) {
    log("Not enough resources to build Alembic!", "warn");
    return;
  }

  spend(cost);
  G.alembicsBuilt++;
  log(`⚗️ Alembic built! (${G.alembicsBuilt}/${G.maxAlembics})`, "good");
  saveGame();
  renderAlembicsBtn();
}

function selectAlembicRecipe(recipeId) {
  const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  if (!G.alembicConfigs[recipeId]) {
    G.alembicConfigs[recipeId] = {
      recipeId: recipeId,
      allocatedAlembics: 0,
      inputBuffers: {},
      outputBuffer: { resourceId: null, amount: 0 },
      speedBoost: 1.0,
      currentCraft: null,
      feederSlots: {},    // { resourceId: count } — feeders dedicated per input slot
      collectorCount: 0   // carriers dedicated to output collection
    };

    // Initialize input buffers for recipe ingredients
    Object.keys(recipe.ingredients).forEach(id => {
      G.alembicConfigs[recipeId].inputBuffers[id] = 0;
    });
  }

  saveGame();
  renderAlembicPanel();
}

function allocateAlembics(recipeId, count) {
  const config = G.alembicConfigs[recipeId];
  if (!config) return;

  if (count > G.alembicsBuilt) {
    log(`Only ${G.alembicsBuilt} Alembics available!`, "warn");
    return;
  }

  if (count < 0 || count > G.maxAlembics) return;

  config.allocatedAlembics = count;

  const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
  const maxCapacity = 100 * count;

  // Trim input buffers if they exceed new capacity
  Object.keys(config.inputBuffers).forEach(resId => {
    if (config.inputBuffers[resId] > maxCapacity) {
      config.inputBuffers[resId] = maxCapacity;
    }
  });

  // Trim output buffer if it exceeds new capacity
  if (config.outputBuffer.amount > maxCapacity) {
    config.outputBuffer.amount = maxCapacity;
  }

  // Restart craft if active (changed allocation)
  if (config.currentCraft) {
    config.currentCraft = null;
  }

  log(`Allocated ${count} Alembic${count !== 1 ? 's' : ''} to ${recipe.name}`, "info");
  saveGame();
  renderAlembicPanel();
}

function loadAlembicInput(recipeId, resourceId, amount) {
  const config = G.alembicConfigs[recipeId];
  if (!config) return;

  if (config.allocatedAlembics === 0) {
    log("Allocate at least 1 Alembic first!", "warn");
    return;
  }

  const maxCapacity = 100 * config.allocatedAlembics;
  const currentAmount = config.inputBuffers[resourceId] || 0;
  const availableSpace = maxCapacity - currentAmount;

  if (availableSpace <= 0) {
    log("Input buffer is full!", "warn");
    return;
  }

  const toLoad = Math.min(amount, availableSpace, G.resources[resourceId] || 0);

  if (toLoad === 0) {
    log("Not enough resources!", "warn");
    return;
  }

  G.resources[resourceId] -= toLoad;
  config.inputBuffers[resourceId] = currentAmount + toLoad;

  log(`Loaded ${toLoad}x ${RESOURCES[resourceId].name} into Alembic`, "info");

  // Try to auto-start craft if ready
  tryStartAlembicCraft(recipeId);

  saveGame();
  renderAlembicPanel();
  renderResources();
}

function collectAlembicOutput(recipeId) {
  const config = G.alembicConfigs[recipeId];
  if (!config || !config.outputBuffer.resourceId || config.outputBuffer.amount === 0) {
    log("Nothing to collect!", "warn");
    return;
  }

  const resourceId = config.outputBuffer.resourceId;
  const amount = config.outputBuffer.amount;

  G.resources[resourceId] = (G.resources[resourceId] || 0) + amount;
  config.outputBuffer.amount = 0;

  log(`Collected ${amount}x ${RESOURCES[resourceId].name}`, "good");

  // Try to auto-start craft if ready
  tryStartAlembicCraft(recipeId);

  saveGame();
  renderAlembicPanel();
  renderResources();
}

function tryStartAlembicCraft(recipeId) {
  const config = G.alembicConfigs[recipeId];
  if (!config || config.allocatedAlembics === 0 || config.currentCraft) return;

  const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
  const consumption = config.allocatedAlembics;
  const maxOutputCapacity = 100 * config.allocatedAlembics;

  // Check if we have enough inputs
  for (const [id, amount] of Object.entries(recipe.ingredients)) {
    const needed = amount * consumption;
    if ((config.inputBuffers[id] || 0) < needed) {
      return; // Not enough inputs
    }
  }

  // Check if output has space
  const outputAmount = Object.values(recipe.produces)[0] * consumption;
  const currentOutput = config.outputBuffer.amount;
  if (currentOutput + outputAmount > maxOutputCapacity) {
    return; // Output buffer full
  }

  // Start craft
  const now = Date.now();
  const craftTime = recipe.time * 1000 * config.speedBoost;

  config.currentCraft = {
    startTime: now,
    endTime: now + craftTime
  };

  // Consume inputs
  Object.entries(recipe.ingredients).forEach(([id, amount]) => {
    const needed = amount * consumption;
    config.inputBuffers[id] -= needed;
  });

  renderAlembicPanel();
}

function tickAlembics(now) {
  Object.keys(G.alembicConfigs).forEach(recipeId => {
    const config = G.alembicConfigs[recipeId];

    if (config.currentCraft && now >= config.currentCraft.endTime) {
      // Complete craft
      const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
      const production = config.allocatedAlembics;
      const outputResId = Object.keys(recipe.produces)[0];
      const outputAmount = recipe.produces[outputResId] * production;

      config.outputBuffer.resourceId = outputResId;
      config.outputBuffer.amount += outputAmount;
      config.currentCraft = null;

      log(`⚗️ Alembics produced ${outputAmount}x ${RESOURCES[outputResId].name}`, "good");

      // Try to start next craft immediately
      tryStartAlembicCraft(recipeId);

      renderAlembicPanel();
    } else if (!config.currentCraft) {
      // Try to auto-start if idle
      tryStartAlembicCraft(recipeId);
    }
  });
}

// ─────────────────────────────────────────────────────
// GOLEM LOGIC
// ─────────────────────────────────────────────────────

function craftGolem(typeId) {
  const def = GOLEM_TYPES[typeId];
  if (!def) return;
  if (G.workshopLevel < def.unlock) { log(`Workshop level ${def.unlock} required!`, "warn"); return; }
  if ((def.role === "feeder" || def.role === "carrier") && !G.intelligentGolemsUnlocked) { log("Divination research required to craft intelligent golems.", "warn"); return; }
  if (def.role === "explorer" && !G.explorerGolemsUnlocked) { log("Expedition Mastery research required to craft Explorer Golems.", "warn"); return; }
  const maxGolems = WORKSHOP_LEVELS[G.workshopLevel].maxGolems;
  const regularGolemCount = G.golems.filter(g => !GOLEM_TYPES[g.typeId]?.role).length;
  if (!def.role && regularGolemCount >= maxGolems) { log("Golem dock is full! Upgrade workshop.", "warn"); return; }
  if (!canAfford(def.cost, G.craftCostMult)) { log(`Not enough resources to craft ${def.name}.`, "warn"); return; }
  spend(def.cost, G.craftCostMult);
  const golem = {
    id: G.nextGolemId++, typeId, name: `${def.name} #${G.nextGolemId-1}`,
    state: "idle", zoneId: null, tripStart: null, tripEnd: null, tripPhase: null, collected: {},
    upgrades: [],          // list of upgrade ids purchased for this golem
    danger_resist: def.danger_resist,  // starts at base type value, can be increased
    bonus_capacity: 0,     // extra carry slots from upgrades
    speed_mult: 1.0,       // travel speed multiplier from upgrades
    targetRecipeId: null,  // for feeder/carrier: which Alembic recipe to supply
    alembicSlot: null,     // specific slot assigned to: resourceId string (input) or 'output', or null
    trackedResources: [],        // for explorer: up to 2 resourceIds to track [slot0, slot1]
    dispatchedByExplorerId: null, // for regular golems dispatched by an explorer
    dispatchedForSlot: null       // which explorer slot (0 or 1) dispatched this golem
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
  if (def.role === "feeder" || def.role === "carrier" || def.role === "explorer") { log(`${golem.name} cannot be sent to zones directly.`, "warn"); return; }
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

function assignGolemToRecipe(golemId, recipeId) {
  const golem = G.golems.find(g => g.id == golemId);
  if (!golem) return;
  const def = GOLEM_TYPES[golem.typeId];
  if (def.role !== "feeder" && def.role !== "carrier") { log(`Only Feeder/Carrier Golems can be assigned to recipes.`, "warn"); return; }
  if (golem.state !== "idle") { log(`${golem.name} is busy — recall it first.`, "warn"); return; }

  if (recipeId === "") {
    golem.targetRecipeId = null;
    log(`🔮 ${golem.name} unassigned.`, "info");
  } else {
    const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;
    if (!G.alembicConfigs[recipeId]) { log(`Configure an Alembic for ${recipe.name} first.`, "warn"); return; }
    golem.targetRecipeId = recipeId;
    log(`🔮 ${golem.name} assigned to supply ${recipe.name}.`, "good");
  }
  renderGolemRoster();
  renderAlembicPanel();
  saveGame();
}

function assignFeederToSlot(recipeId, resourceId) {
  const config = G.alembicConfigs[recipeId];
  if (!config) return;
  const golem = G.golems.find(g => {
    const def = GOLEM_TYPES[g.typeId];
    return def.role === 'feeder' && g.state === 'idle' && g.alembicSlot === null;
  });
  if (!golem) { log('No idle Feeder Golems available!', 'warn'); return; }
  golem.targetRecipeId = recipeId;
  golem.alembicSlot = resourceId;
  config.feederSlots[resourceId] = (config.feederSlots[resourceId] || 0) + 1;
  const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
  log(`⚗️ ${golem.name} assigned to feed ${RESOURCES[resourceId].name} → ${recipe.name}.`, 'good');
  saveGame(); renderAlembicPanel(); renderGolemRoster();
}

function unassignFeederFromSlot(recipeId, resourceId) {
  const config = G.alembicConfigs[recipeId];
  if (!config || !(config.feederSlots[resourceId] > 0)) return;
  const golem = G.golems.find(g => {
    const def = GOLEM_TYPES[g.typeId];
    return def.role === 'feeder' && g.targetRecipeId === recipeId && g.alembicSlot === resourceId;
  });
  if (!golem) return;
  golem.targetRecipeId = null; golem.alembicSlot = null;
  golem.state = 'idle'; golem.tripStart = null; golem.tripEnd = null;
  config.feederSlots[resourceId] = Math.max(0, (config.feederSlots[resourceId] || 0) - 1);
  log(`⚗️ ${golem.name} unassigned from ${RESOURCES[resourceId].name} slot.`, 'info');
  saveGame(); renderAlembicPanel(); renderGolemRoster();
}

function assignCollectorToOutput(recipeId) {
  const config = G.alembicConfigs[recipeId];
  if (!config) return;
  const golem = G.golems.find(g => {
    const def = GOLEM_TYPES[g.typeId];
    return def.role === 'carrier' && g.state === 'idle' && g.alembicSlot === null;
  });
  if (!golem) { log('No idle Carrier Golems available!', 'warn'); return; }
  golem.targetRecipeId = recipeId;
  golem.alembicSlot = 'output';
  config.collectorCount = (config.collectorCount || 0) + 1;
  const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
  log(`🚚 ${golem.name} assigned to collect output from ${recipe.name}.`, 'good');
  saveGame(); renderAlembicPanel(); renderGolemRoster();
}

function unassignCollectorFromOutput(recipeId) {
  const config = G.alembicConfigs[recipeId];
  if (!config || !(config.collectorCount > 0)) return;
  const golem = G.golems.find(g => {
    const def = GOLEM_TYPES[g.typeId];
    return def.role === 'carrier' && g.targetRecipeId === recipeId && g.alembicSlot === 'output';
  });
  if (!golem) return;
  golem.targetRecipeId = null; golem.alembicSlot = null;
  golem.state = 'idle'; golem.tripStart = null; golem.tripEnd = null; golem.collected = {};
  config.collectorCount = Math.max(0, (config.collectorCount || 0) - 1);
  log(`🚚 ${golem.name} unassigned from output collection.`, 'info');
  saveGame(); renderAlembicPanel(); renderGolemRoster();
}

function freeAllFeeders() {
  G.golems.forEach(golem => {
    const def = GOLEM_TYPES[golem.typeId];
    if (def.role !== 'feeder' && def.role !== 'carrier') return;
    if (!golem.targetRecipeId && !golem.alembicSlot) return;
    golem.state = 'idle'; golem.tripStart = null; golem.tripEnd = null;
    golem.collected = {}; golem.alembicSlot = null; golem.targetRecipeId = null;
  });
  Object.values(G.alembicConfigs).forEach(config => {
    config.feederSlots = {};
    config.collectorCount = 0;
  });
  log('🔮 All feeder/carrier golems freed.', 'info');
  saveGame(); renderAlembicPanel(); renderGolemRoster();
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
  // Clear any feeder/collector slot assignment from the config
  if (golem.alembicSlot && golem.targetRecipeId) {
    const config = G.alembicConfigs[golem.targetRecipeId];
    if (config) {
      if (golem.alembicSlot === 'output') {
        config.collectorCount = Math.max(0, (config.collectorCount || 0) - 1);
      } else {
        config.feederSlots[golem.alembicSlot] = Math.max(0, (config.feederSlots[golem.alembicSlot] || 0) - 1);
      }
    }
  }
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
    const def  = GOLEM_TYPES[golem.typeId];

    // ── Feeder Golem: idle → feeding (5s) → deposit into alembic → idle ──
    if (def.role === "feeder") {
      if (golem.state === "idle") {
        if (!golem.targetRecipeId) continue;
        const config = G.alembicConfigs[golem.targetRecipeId];
        if (!config || config.allocatedAlembics === 0) continue;
        golem.state = "feeding"; golem.tripStart = now; golem.tripEnd = now + 5000;
        stateChanged = true;
      } else if (golem.state === "feeding" && now >= golem.tripEnd) {
        const config = G.alembicConfigs[golem.targetRecipeId];
        const recipe = ALCHEMY_RECIPES.find(r => r.id === golem.targetRecipeId);
        if (config && recipe) {
          const maxCapacity = 100 * config.allocatedAlembics;
          const capacity = def.capacity + (golem.bonus_capacity || 0);
          let remaining = capacity;
          let totalDeposited = 0;
          // If assigned to a specific slot, only deposit that ingredient
          const ingredientEntries = golem.alembicSlot
            ? Object.entries(recipe.ingredients).filter(([id]) => id === golem.alembicSlot)
            : Object.entries(recipe.ingredients);
          ingredientEntries.forEach(([id, amtPerCraft]) => {
            if (remaining <= 0) return;
            const space = maxCapacity - (config.inputBuffers[id] || 0);
            if (space <= 0) return;
            const toDeposit = Math.min(remaining, space, G.resources[id] || 0, amtPerCraft * 5);
            if (toDeposit > 0) {
              G.resources[id] -= toDeposit;
              config.inputBuffers[id] = (config.inputBuffers[id] || 0) + toDeposit;
              remaining -= toDeposit;
              totalDeposited += toDeposit;
            }
          });
          if (totalDeposited > 0) {
            log(`🔮 ${golem.name} fed ${totalDeposited} resources to ${recipe.name} Alembic.`, "info");
            tryStartAlembicCraft(golem.targetRecipeId);
            renderResources(); renderAlembicPanel();
          }
        }
        golem.state = "idle"; golem.tripStart = null; golem.tripEnd = null;
        stateChanged = true;
      }
      continue;
    }

    // ── Carrier Golem: output-collecting mode when alembicSlot === 'output' ──
    if (def.role === "carrier" && golem.alembicSlot === 'output') {
      if (golem.state === "idle") {
        const config = G.alembicConfigs[golem.targetRecipeId];
        if (!config || config.allocatedAlembics === 0 || config.outputBuffer.amount === 0) continue;
        golem.state = "pickup"; golem.tripPhase = "collecting";
        golem.tripStart = now; golem.tripEnd = now + 5000;
        stateChanged = true;
      } else if (golem.state === "pickup" && golem.tripPhase === "collecting" && now >= golem.tripEnd) {
        const config = G.alembicConfigs[golem.targetRecipeId];
        if (config && config.outputBuffer.amount > 0) {
          const resId = config.outputBuffer.resourceId;
          const amount = config.outputBuffer.amount;
          G.resources[resId] = (G.resources[resId] || 0) + amount;
          config.outputBuffer.amount = 0;
          const recipe = ALCHEMY_RECIPES.find(r => r.id === golem.targetRecipeId);
          log(`🚚 ${golem.name} collected ${amount}x ${RESOURCES[resId].name} from ${recipe.name} Alembic.`, 'good');
          renderResources(); renderAlembicPanel();
        }
        golem.state = "idle"; golem.tripStart = null; golem.tripEnd = null; golem.tripPhase = null;
        stateChanged = true;
      }
      continue;
    }

    // ── Carrier Golem: idle → pickup (4s, takes from G.resources) → delivering (4s) → deposit → idle ──
    if (def.role === "carrier") {
      if (golem.state === "idle") {
        if (!golem.targetRecipeId) continue;
        const config = G.alembicConfigs[golem.targetRecipeId];
        if (!config || config.allocatedAlembics === 0) continue;
        golem.state = "pickup"; golem.tripPhase = "pickup";
        golem.tripStart = now; golem.tripEnd = now + 4000; golem.collected = {};
        stateChanged = true;
      } else if (golem.state === "pickup" && now >= golem.tripEnd) {
        const config = G.alembicConfigs[golem.targetRecipeId];
        const recipe = ALCHEMY_RECIPES.find(r => r.id === golem.targetRecipeId);
        if (config && recipe) {
          const maxCapacity = 100 * config.allocatedAlembics;
          const capacity = def.capacity + (golem.bonus_capacity || 0);
          let remaining = capacity;
          Object.entries(recipe.ingredients).forEach(([id, amtPerCraft]) => {
            if (remaining <= 0) return;
            const space = maxCapacity - (config.inputBuffers[id] || 0);
            if (space <= 0) return;
            const toCarry = Math.min(remaining, space, G.resources[id] || 0, amtPerCraft * 10);
            if (toCarry > 0) {
              G.resources[id] -= toCarry;
              golem.collected[id] = (golem.collected[id] || 0) + toCarry;
              remaining -= toCarry;
            }
          });
          renderResources();
        }
        golem.state = "delivering"; golem.tripPhase = "delivering";
        golem.tripStart = now; golem.tripEnd = now + 4000;
        stateChanged = true;
      } else if (golem.state === "delivering" && now >= golem.tripEnd) {
        const config = G.alembicConfigs[golem.targetRecipeId];
        const recipe = ALCHEMY_RECIPES.find(r => r.id === golem.targetRecipeId);
        if (config && recipe) {
          let totalDeposited = 0;
          Object.entries(golem.collected).forEach(([id, amount]) => {
            if (amount > 0) {
              config.inputBuffers[id] = (config.inputBuffers[id] || 0) + amount;
              totalDeposited += amount;
            }
          });
          if (totalDeposited > 0) {
            log(`🚚 ${golem.name} delivered ${totalDeposited} resources to ${recipe.name} Alembic.`, "good");
            tryStartAlembicCraft(golem.targetRecipeId);
            renderAlembicPanel();
          }
        }
        golem.state = "idle"; golem.tripPhase = null;
        golem.tripStart = null; golem.tripEnd = null; golem.collected = {};
        stateChanged = true;
      }
      continue;
    }

    // ── Explorer Golem: dispatches idle regular golems for tracked resources ──
    if (def.role === "explorer") {
      for (let slot = 0; slot < 2; slot++) {
        const resourceId = golem.trackedResources[slot];
        if (!resourceId) continue;
        // Already a golem in-flight for this slot?
        const inFlight = G.golems.some(g =>
          g.dispatchedByExplorerId === golem.id && g.dispatchedForSlot === slot && g.state !== 'idle'
        );
        if (inFlight) continue;
        // Safest zone yielding this resource (not depleted)
        const eligibleZones = ZONES
          .filter(z => z.yields.includes(resourceId) && (!z.resourcePool || z.resourcePool.total > 0))
          .sort((a, b) => a.danger - b.danger);
        if (eligibleZones.length === 0) continue;
        const targetZone = eligibleZones[0];
        if (golemsInZone(targetZone.id).length >= targetZone.maxSlots) continue;
        // Idle regular golem with lowest danger_resist that qualifies
        const candidate = G.golems
          .filter(g => {
            const gDef = GOLEM_TYPES[g.typeId];
            return !gDef.role && g.state === 'idle' && !g.dispatchedByExplorerId && g.danger_resist >= targetZone.danger;
          })
          .sort((a, b) => a.danger_resist - b.danger_resist)[0];
        if (!candidate) continue;
        // Dispatch
        candidate.dispatchedByExplorerId = golem.id;
        candidate.dispatchedForSlot = slot;
        const cDef = GOLEM_TYPES[candidate.typeId];
        const cSpeed = cDef.speed * G.golemSpeedMult * (candidate.speed_mult || 1.0);
        candidate.state = "traveling"; candidate.zoneId = targetZone.id; candidate.tripPhase = "out";
        candidate.tripStart = now; candidate.tripEnd = now + cSpeed * 1000; candidate.collected = {};
        log(`🧭 ${golem.name} dispatched ${candidate.name} → ${targetZone.name} for ${RESOURCES[resourceId].icon}`, "info");
        stateChanged = true;
      }
      continue;
    }

    if (golem.state === "idle") continue;

    // Boss expedition — simple timer, no gather phase
    if (golem.bossExpedition && golem.state === "traveling" && now >= golem.tripEnd) {
      completeBossExpedition(golem);
      stateChanged = true;
      continue;
    }
    if (golem.bossExpedition) continue; // still traveling to boss

    const zone = ZONES.find(z => z.id === golem.zoneId);
    const speed = def.speed * G.golemSpeedMult * (golem.speed_mult || 1.0);

    if (golem.state === "traveling" && golem.tripPhase === "out" && now >= golem.tripEnd) {
      golem.state = "gathering"; golem.tripStart = now; golem.tripEnd = now + 3000;
      log(`⛏️  ${golem.name} arrived at ${zone?.name || "zone"}.`, "info");
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
      golem.dispatchedByExplorerId = null; golem.dispatchedForSlot = null;
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

  const mapSize = getMapSize();

  // Shrine buff timer
  let shrineBar = "";
  if (G.activeShrineBuffs.length > 0) {
    const remaining = Math.max(0, Math.ceil((G.activeShrineBuffs[0].endTime - Date.now()) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    shrineBar = `<p style="text-align:center;color:var(--amber);margin:4px 0;font-size:12px;">✨ Shrine Buff active: ${mins}m ${secs}s remaining</p>`;
  }

  // Expand button
  const ringCost = G.mapRing + 1;
  const expandCost = { moonstone: ringCost * 3, essence: ringCost * 5 };
  const canExpand = mapSize < 9 && canAfford(expandCost);
  const expandBtn = mapSize < 9
    ? `<button class="btn" data-action="expand-map" style="margin-top:10px;${canExpand ? "color:var(--green);" : "color:var(--text-dim);"}"
        ${canExpand ? "" : "disabled"}>
        🗺️ Expand Map (${ringCost * 3}🌙 + ${ringCost * 5}✨)
       </button>`
    : `<p style="text-align:center;color:var(--text-dim);font-size:11px;margin-top:8px;">Map at maximum size (9×9)</p>`;

  let html = `
    <div class="worldmap-header">
      <button class="btn" data-action="show-workshop" style="margin-bottom:10px;">← Back to Workshop</button>
      <h2 style="text-align:center;color:var(--green);margin-bottom:10px;">🗺️ World Map</h2>
      ${shrineBar}
      ${statusMsg}
    </div>
    <div class="worldmap-grid" style="grid-template-columns:repeat(${mapSize},1fr);">
  `;

  for (let row = 0; row < mapSize; row++) {
    for (let col = 0; col < mapSize; col++) {
      const tile = G.worldMap.tiles[row][col];
      html += renderTile(tile, row, col);
    }
  }

  html += `</div><div style="text-align:center;">${expandBtn}</div>`;
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

  // Special tile
  if (explored && zoneType && zoneType.startsWith("special_")) {
    const specialKey = zoneType.replace("special_", "");
    const def = SPECIAL_TILE_TYPES[specialKey];
    if (!def) return `<div class="worldmap-tile"><span style="color:var(--red);">Error</span></div>`;

    const key = `${row},${col}`;
    const data = G.tileData[key] || {};
    let subInfo = def.desc;

    if (specialKey === "boss" && data.bossRespawnAt && Date.now() < data.bossRespawnAt) {
      const rem = Math.ceil((data.bossRespawnAt - Date.now()) / 1000);
      subInfo = `Recovering: ${Math.floor(rem/60)}m ${rem%60}s`;
    } else if (specialKey === "shrine" && G.activeShrineBuffs.length > 0) {
      const rem = Math.ceil((G.activeShrineBuffs[0].endTime - Date.now()) / 1000);
      subInfo = `Buff active: ${Math.floor(rem/60)}m ${rem%60}s`;
    }

    return `
      <div class="worldmap-tile clickable" data-action="interact-special-tile" data-row="${row}" data-col="${col}">
        <div class="tile-icon">${def.icon}</div>
        <div class="tile-name">${def.label}</div>
        <div class="tile-resources" style="font-size:10px;color:var(--amber);">${subInfo}</div>
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
  let autoStatusHtml = "";

  // Show auto-processing indicator
  const hasInjector = G.injector && G.injector.built;
  const canAutoProcess = hasInjector && ckAvailable > 0;

  if (canAutoProcess && !currentProcessing) {
    autoStatusHtml = '<p style="font-size:10px;color:var(--green);margin:4px 0;animation:pulse 1.5s infinite;">🔄 Auto-processing enabled</p>';
  } else if (hasInjector) {
    autoStatusHtml = '<p style="font-size:10px;color:var(--text-dim);margin:4px 0;">🔄 Auto-processing ready</p>';
  }

  if (currentProcessing) {
    const now = Date.now();
    const pct = Math.min(100, ((now - currentProcessing.startTime) / (currentProcessing.endTime - currentProcessing.startTime)) * 100);
    const remaining = Math.max(0, Math.ceil((currentProcessing.endTime - now) / 1000));
    const elapsed = Math.floor((now - currentProcessing.startTime) / 1000);
    statusHtml = `
      <div style="margin:8px 0;padding:8px;background:rgba(57,255,20,0.1);border:1px solid var(--green);border-radius:4px;">
        <p style="font-size:11px;color:var(--green);margin:2px 0;font-weight:bold;">⚡ PROCESSING ${currentProcessing.ckAmount} CK</p>
        <div class="progress-bar" style="margin:6px 0;"><div class="progress-fill" style="width:${pct}%;background:var(--green);"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);">
          <span>Elapsed: ${elapsed}s</span>
          <span>Remaining: ${remaining}s</span>
        </div>
        <p style="font-size:9px;color:var(--green);margin:4px 0 0 0;">→ Will produce ${currentProcessing.ckAmount} PK</p>
      </div>
    `;
  } else {
    // Check if Injector is built
    if (!G.injector || !G.injector.built) {
      statusHtml = '<p style="font-size:10px;color:var(--red);margin:8px 0;padding:6px;background:rgba(255,68,68,0.1);border:1px solid var(--red);border-radius:4px;">⚠️ Build Injector to enable auto-processing!</p>';
    } else if (ckAvailable === 0) {
      statusHtml = '<p style="font-size:10px;color:var(--amber);margin:8px 0;">⏸️ Waiting for CK...</p>';
    } else {
      statusHtml = '<p style="font-size:10px;color:var(--text-dim);margin:8px 0;">💤 Idle (will auto-start)</p>';
    }
  }

  let queueHtml = "";
  if (processingQueue.length > 0) {
    queueHtml = `<p style="font-size:10px;color:var(--amber);margin:4px 0;">📋 Queue: ${processingQueue.length}/5</p>`;
  }

  // Show total CK processed counter
  const totalProcessed = (G.distiller.totalProcessed || 0);
  const statsHtml = totalProcessed > 0 ? `<p style="font-size:9px;color:var(--text-dim);margin:4px 0;">Total processed: ${totalProcessed} CK</p>` : '';

  return `
    <div class="machine-card" style="border:2px solid ${currentProcessing ? 'var(--green)' : 'var(--border)'};">
      <h4>🔬 Distiller</h4>
      <p style="font-size:10px;color:var(--text-dim);margin:2px 0;">Time: ${actualTime}s per CK | Speed: ${(speedMultiplier * 100).toFixed(0)}%</p>
      ${autoStatusHtml}
      ${statusHtml}
      ${queueHtml}
      ${statsHtml}
      <p style="font-size:10px;margin:8px 0;">Alchemy CK: <span style="color:var(--amber);font-weight:bold;">${ckAvailable}💧</span></p>
      <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
        <button class="btn-sm" data-action="distill" data-amount="1" data-type="alchemy" ${ckAvailable < 1 ? 'disabled' : ''}>Alch +1</button>
        <button class="btn-sm" data-action="distill" data-amount="5" data-type="alchemy" ${ckAvailable < 5 ? 'disabled' : ''}>Alch +5</button>
        <button class="btn-sm" data-action="distill" data-amount="${Math.floor(ckAvailable)}" data-type="alchemy" ${ckAvailable < 1 ? 'disabled' : ''}>Alch Max</button>
      </div>
      ${(() => {
        const divCk = G.resources.condensed_knowledge_divination || 0;
        if (divCk <= 0) return '';
        return `
        <p style="font-size:10px;margin:8px 0 4px;">Divination CK: <span style="color:#cc44ff;font-weight:bold;">${divCk}🔮💧</span></p>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn-sm" data-action="distill" data-amount="1" data-type="divination" style="border-color:#cc44ff;">Div +1</button>
          <button class="btn-sm" data-action="distill" data-amount="5" data-type="divination" ${divCk < 5 ? 'disabled' : ''} style="border-color:#cc44ff;">Div +5</button>
          <button class="btn-sm" data-action="distill" data-amount="${Math.floor(divCk)}" data-type="divination" style="border-color:#cc44ff;">Div Max</button>
        </div>`;
      })()}
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
  const divAmount = G.injector.divinationAmount || 0;
  const pct = (currentAmount / capacity) * 100;
  const fillColor = pct > 90 ? "var(--red)" : pct > 60 ? "var(--amber)" : "var(--green)";
  const divPct = (divAmount / capacity) * 100;
  const divFillColor = divPct > 90 ? "var(--red)" : divPct > 60 ? "var(--amber)" : "#cc44ff";

  const resNode = G.activeResearch ? RESEARCH_NODES.find(n => n.id === G.activeResearch.nodeId) : null;
  const isDivinationActive = resNode && resNode.knowledgeType === "divination";

  let statusHtml = "";
  let activeIndicator = "";

  const isInjecting = G.activeResearch && (isDivinationActive ? (currentAmount > 0 && divAmount > 0) : currentAmount > 0);
  if (isInjecting) {
    const lastTick = G.activeResearch.lastTickTime || Date.now();
    const timeSinceLastConsume = (Date.now() - lastTick) / 1000;
    const nextConsumeIn = Math.max(0, 1 - timeSinceLastConsume).toFixed(1);
    activeIndicator = '<p style="font-size:10px;color:var(--green);margin:4px 0;animation:pulse 1.5s infinite;">🔄 ACTIVELY INJECTING</p>';
    const consumeDesc = isDivinationActive ? "1 Alchemy PK + 1 Divination PK" : "1 Alchemy PK";
    statusHtml = `
      <div style="padding:6px;background:rgba(57,255,20,0.1);border:1px solid var(--green);border-radius:4px;margin:8px 0;">
        <p style="font-size:10px;color:var(--green);margin:2px 0;">⚡ Consuming ${consumeDesc} per second</p>
        <p style="font-size:9px;color:var(--text-dim);margin:2px 0;">Next consumption in ${nextConsumeIn}s</p>
        <p style="font-size:9px;color:var(--green);margin:2px 0;">→ Generating ${10 * G.injectionPointsMult} points/sec</p>
      </div>
    `;
  } else if (G.activeResearch && !isInjecting) {
    const missing = isDivinationActive && currentAmount === 0 ? "Alchemy PK" : isDivinationActive && divAmount === 0 ? "Divination PK" : "PK";
    statusHtml = `<p style="font-size:10px;color:var(--amber);margin:8px 0;padding:6px;background:rgba(255,179,0,0.1);border:1px solid var(--amber);border-radius:4px;">⚠️ Waiting for ${missing} from Distiller...</p>`;
  } else if (!G.activeResearch) {
    statusHtml = '<p style="font-size:10px;color:var(--text-dim);margin:8px 0;">💤 Queue research to start consuming PK</p>';
  } else {
    statusHtml = '<p style="font-size:10px;color:var(--text-dim);margin:8px 0;">💤 Idle</p>';
  }

  const rateInfo = `<p style="font-size:9px;color:var(--text-dim);margin:4px 0;font-weight:bold;">Rate: 1 PK/sec = ${10 * G.injectionPointsMult} points/sec</p>`;

  const divPoolHtml = divAmount > 0 || (G.resources.condensed_knowledge_divination || 0) > 0 ? `
    <p style="font-size:11px;margin:6px 0;">Divination PK: <span style="color:${divFillColor};font-weight:bold;">${divAmount}</span>/${capacity} 🔮</p>
    <div class="progress-bar" style="height:8px;margin-bottom:8px;"><div class="progress-fill" style="width:${divPct}%;background:${divFillColor}"></div></div>
  ` : '';

  return `
    <div class="machine-card" style="border:2px solid ${isInjecting ? 'var(--green)' : 'var(--border)'};">
      <h4>💉 Injector</h4>
      ${activeIndicator}
      <p style="font-size:11px;margin:6px 0;">Alchemy PK: <span style="color:${fillColor};font-weight:bold;">${currentAmount}</span>/${capacity} ⚗️</p>
      <div class="progress-bar" style="height:8px;margin-bottom:4px;"><div class="progress-fill" style="width:${pct}%;background:${fillColor}"></div></div>
      ${divPoolHtml}
      ${rateInfo}
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

  // Tier 0 Nodes (Foundation Unlocks)
  const tier0Nodes = RESEARCH_NODES.filter(n => n.tier === 0);
  if (tier0Nodes.length > 0) {
    html += '<div class="research-tier"><h4 style="color:var(--amber);margin-bottom:8px;">🟡 Tier 0 — Foundation Unlocks</h4>';
    tier0Nodes.forEach(node => {
      html += renderResearchNode(node);
    });
    html += '</div>';
  }

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
      ${node.knowledgeType === "divination"
        ? `<p style="font-size:10px;margin:4px 0;">Cost: <span style="color:#4488ff;">⚗️ ${cost} Alchemy PK</span> + <span style="color:#cc44ff;">🔮 ${cost} Divination PK</span></p>`
        : `<p style="font-size:10px;margin:4px 0;">Cost: <span style="color:#4488ff;">⚗️ ${cost} Alchemy PK</span></p>`
      }
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
// ALEMBIC AUTOMATION RENDERING
// ─────────────────────────────────────────────────────

function renderAlembicPanel() {
  const panel = document.getElementById("alembic-panel");
  if (!panel || G.currentView !== "alembics") return;

  let html = `
    <div style="max-width:1200px;margin:0 auto;padding:20px;">
      <button class="btn" data-action="hide-alembics" style="margin-bottom:10px;">← Back to Workshop</button>
      <h2 style="text-align:center;color:var(--purple);margin-bottom:10px;">⚗️ Alembic Automation</h2>
      <p style="text-align:center;color:var(--text-dim);font-size:11px;margin-bottom:20px;">
        Configure recipes and allocate Alembics (${G.alembicsBuilt}/${G.maxAlembics} built) to multiply production
      </p>

      <!-- Build Alembic -->
      <div style="background:var(--bg2);border:1px solid var(--border);padding:16px;margin-bottom:20px;border-radius:4px;">
        <h3 style="color:var(--amber);margin-bottom:8px;">Build Alembic</h3>
        ${(() => {
          const alembicCost = { clay: 20, iron: 15, crystals: 10, gold: 100 };
          if (G.alembicsBuilt >= G.maxAlembics) {
            return `<div style="color:var(--green);font-size:11px;">All Alembics built (${G.alembicsBuilt}/${G.maxAlembics})</div>`;
          }
          const canAffordAlembic = canAfford(alembicCost);
          const costHtml = Object.entries(alembicCost).map(([r, a]) => {
            const have = G.resources[r] || 0;
            const color = have >= a ? 'var(--green)' : 'var(--red)';
            return `<span style="color:${color}">${a}x ${RESOURCES[r].icon}</span>`;
          }).join(" ");
          return `<button class="btn btn-amber" data-action="build-alembic" ${canAffordAlembic ? '' : 'disabled'}>
            🔨 Build Alembic (${G.alembicsBuilt}/${G.maxAlembics})
            <div class="btn-cost">${costHtml}</div>
          </button>`;
        })()}
      </div>

      <!-- Recipe Selection -->
      <div style="background:var(--bg2);border:1px solid var(--border);padding:16px;margin-bottom:20px;border-radius:4px;">
        <h3 style="color:var(--amber);margin-bottom:8px;">Select Recipe</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">
  `;

  ALCHEMY_RECIPES.forEach(recipe => {
    const isSelected = G.alembicConfigs[recipe.id] !== undefined;
    const borderColor = isSelected ? 'var(--green)' : 'var(--border)';
    html += `
      <button class="btn" data-action="select-alembic-recipe" data-recipe="${recipe.id}"
        style="border-color:${borderColor};text-align:left;padding:8px;">
        ${recipe.icon} ${recipe.name}<br>
        <span style="font-size:9px;color:var(--text-dim);">${recipe.time}s craft</span>
      </button>
    `;
  });

  html += `
        </div>
      </div>
  `;

  // Show active configurations
  const activeConfigs = Object.values(G.alembicConfigs).filter(c => c.allocatedAlembics > 0);

  if (activeConfigs.length > 0) {
    html += `<h3 style="color:var(--amber);margin-bottom:12px;">Active Configurations</h3>`;

    activeConfigs.forEach(config => {
      const recipe = ALCHEMY_RECIPES.find(r => r.id === config.recipeId);
      html += renderAlembicConfigCard(config, recipe);
    });
  }

  // Show idle configurations (allocated but not running)
  const idleConfigs = Object.values(G.alembicConfigs).filter(c => c.allocatedAlembics === 0);

  if (idleConfigs.length > 0) {
    html += `<h3 style="color:var(--text-dim);margin:20px 0 12px 0;">Idle Configurations</h3>`;

    idleConfigs.forEach(config => {
      const recipe = ALCHEMY_RECIPES.find(r => r.id === config.recipeId);
      html += renderAlembicConfigCard(config, recipe);
    });
  }

  if (G.intelligentGolemsUnlocked) {
    const assignedCount = G.golems.filter(g => {
      const def = GOLEM_TYPES[g.typeId];
      return (def.role === 'feeder' || def.role === 'carrier') && (g.targetRecipeId || g.alembicSlot);
    }).length;
    const totalCount = G.golems.filter(g => {
      const def = GOLEM_TYPES[g.typeId];
      return def.role === 'feeder' || def.role === 'carrier';
    }).length;
    html += `
      <div style="margin-top:20px;padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:11px;color:var(--text-dim);flex:1;">🔮 Feeder/Carrier Golems: ${totalCount - assignedCount} idle / ${assignedCount} assigned</span>
        <button class="btn" data-action="free-all-feeders"
          style="color:var(--amber);border-color:var(--amber);" ${assignedCount === 0 ? 'disabled' : ''}>
          Free All Feeders
        </button>
      </div>
    `;
  }

  html += `</div>`;

  panel.innerHTML = html;
}

function renderAlembicConfigCard(config, recipe) {
  const maxCapacity = 100 * config.allocatedAlembics;
  const outputResId = Object.keys(recipe.produces)[0];
  const production = config.allocatedAlembics * recipe.produces[outputResId];

  const isCrafting = config.currentCraft !== null;
  const cardBorder = isCrafting ? 'var(--green)' : 'var(--border)';
  const cardBg = isCrafting ? 'rgba(57,255,20,0.05)' : 'var(--bg3)';

  const ingredientSummary = Object.entries(recipe.ingredients)
    .map(([id, amt]) => `${amt * config.allocatedAlembics}x ${RESOURCES[id].icon}`)
    .join(', ');

  let html = `
    <div style="background:${cardBg};border:2px solid ${cardBorder};padding:16px;margin-bottom:16px;border-radius:4px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h4 style="color:var(--purple);font-size:14px;">${recipe.icon} ${recipe.name}</h4>
        <span style="font-size:11px;color:var(--text-dim);">${recipe.time}s per cycle</span>
      </div>

      <!-- Allocation Controls -->
      <div style="margin-bottom:16px;">
        <div style="font-size:11px;color:var(--text);margin-bottom:6px;">
          Allocated Alembics: <strong style="color:var(--green);">${config.allocatedAlembics}</strong>/${G.alembicsBuilt}
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn-sm" data-action="allocate-alembics" data-recipe="${config.recipeId}" data-count="${Math.max(0, config.allocatedAlembics - 1)}">-</button>
          <button class="btn-sm" data-action="allocate-alembics" data-recipe="${config.recipeId}" data-count="${Math.min(G.alembicsBuilt, config.allocatedAlembics + 1)}">+</button>
          <button class="btn-sm" data-action="allocate-alembics" data-recipe="${config.recipeId}" data-count="0" style="color:var(--red);">None</button>
          <button class="btn-sm" data-action="allocate-alembics" data-recipe="${config.recipeId}" data-count="${G.alembicsBuilt}" style="color:var(--amber);">Max</button>
        </div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:4px;">
          Consumes ${ingredientSummary} → Produces ${production}x ${RESOURCES[outputResId].icon} per cycle
        </div>
      </div>
  `;

  if (config.allocatedAlembics > 0) {
    // Input Buffers
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:11px;color:var(--amber);margin-bottom:6px;">Input Buffers (Capacity: ${maxCapacity} each)</div>`;

    Object.entries(recipe.ingredients).forEach(([id, amount]) => {
      const current = config.inputBuffers[id] || 0;
      const percent = (current / maxCapacity) * 100;
      // Feeder slot controls
      const feederCount = config.feederSlots[id] || 0;
      const feederNames = G.golems.filter(g => GOLEM_TYPES[g.typeId]?.role === 'feeder' && g.targetRecipeId === config.recipeId && g.alembicSlot === id).map(g => g.name);
      const idleFeeders = G.golems.filter(g => GOLEM_TYPES[g.typeId]?.role === 'feeder' && g.state === 'idle' && g.alembicSlot === null).length;
      const feederHtml = G.intelligentGolemsUnlocked ? `
        <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
          <span style="font-size:10px;color:var(--purple);">⚗️ Feeders:</span>
          <button class="btn-sm" data-action="unassign-alembic-feeder" data-recipe="${config.recipeId}" data-resource="${id}" ${feederCount === 0 ? 'disabled' : ''}>-</button>
          <span style="font-size:11px;min-width:16px;text-align:center;">${feederCount}</span>
          <button class="btn-sm" data-action="assign-alembic-feeder" data-recipe="${config.recipeId}" data-resource="${id}" ${idleFeeders === 0 ? 'disabled' : ''}>+</button>
          ${feederNames.length > 0 ? `<span style="font-size:9px;color:var(--text-dim);">(${feederNames.join(', ')})</span>` : ''}
        </div>` : '';
      html += `
        <div style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
            <span style="font-size:11px;min-width:120px;">${RESOURCES[id].icon} ${RESOURCES[id].name}:</span>
            <div style="flex:1;background:var(--bg);border:1px solid var(--border);height:16px;border-radius:2px;position:relative;overflow:hidden;">
              <div style="position:absolute;top:0;left:0;height:100%;width:${percent}%;background:var(--green);transition:width 0.3s;"></div>
              <span style="position:absolute;top:0;left:4px;font-size:10px;color:var(--text);line-height:16px;">${current}/${maxCapacity}</span>
            </div>
            <button class="btn-sm" data-action="load-alembic-input" data-recipe="${config.recipeId}" data-resource="${id}" data-amount="1">+1</button>
            <button class="btn-sm" data-action="load-alembic-input" data-recipe="${config.recipeId}" data-resource="${id}" data-amount="10">+10</button>
            <button class="btn-sm" data-action="load-alembic-input" data-recipe="${config.recipeId}" data-resource="${id}" data-amount="100">+100</button>
          </div>
          ${feederHtml}
        </div>
      `;
    });

    html += `</div>`;

    // Output Buffer
    const outputCurrent = config.outputBuffer.amount;
    const outputPercent = (outputCurrent / maxCapacity) * 100;
    const outputRes = config.outputBuffer.resourceId || outputResId;
    // Collector slot controls
    const collectorCount = config.collectorCount || 0;
    const collectorNames = G.golems.filter(g => GOLEM_TYPES[g.typeId]?.role === 'carrier' && g.targetRecipeId === config.recipeId && g.alembicSlot === 'output').map(g => g.name);
    const idleCarriers = G.golems.filter(g => GOLEM_TYPES[g.typeId]?.role === 'carrier' && g.state === 'idle' && g.alembicSlot === null).length;
    const collectorHtml = G.intelligentGolemsUnlocked ? `
      <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
        <span style="font-size:10px;color:var(--purple);">🚚 Collectors:</span>
        <button class="btn-sm" data-action="unassign-alembic-collector" data-recipe="${config.recipeId}" ${collectorCount === 0 ? 'disabled' : ''}>-</button>
        <span style="font-size:11px;min-width:16px;text-align:center;">${collectorCount}</span>
        <button class="btn-sm" data-action="assign-alembic-collector" data-recipe="${config.recipeId}" ${idleCarriers === 0 ? 'disabled' : ''}>+</button>
        ${collectorNames.length > 0 ? `<span style="font-size:9px;color:var(--text-dim);">(${collectorNames.join(', ')})</span>` : ''}
      </div>` : '';

    html += `
      <div style="margin-bottom:12px;">
        <div style="font-size:11px;color:var(--amber);margin-bottom:6px;">Output Buffer</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;min-width:120px;">${RESOURCES[outputRes].icon} ${RESOURCES[outputRes].name}:</span>
          <div style="flex:1;background:var(--bg);border:1px solid var(--border);height:16px;border-radius:2px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;height:100%;width:${outputPercent}%;background:var(--purple);transition:width 0.3s;"></div>
            <span style="position:absolute;top:0;left:4px;font-size:10px;color:var(--text);line-height:16px;">${outputCurrent}/${maxCapacity}</span>
          </div>
          <button class="btn" data-action="collect-alembic-output" data-recipe="${config.recipeId}"
            style="padding:4px 12px;font-size:11px;" ${outputCurrent === 0 ? 'disabled' : ''}>
            Collect
          </button>
        </div>
        ${collectorHtml}
      </div>
    `;

    // Progress Bar (if crafting)
    if (isCrafting) {
      const now = Date.now();
      const progress = Math.min(100, ((now - config.currentCraft.startTime) / (config.currentCraft.endTime - config.currentCraft.startTime)) * 100);
      const remaining = Math.max(0, Math.ceil((config.currentCraft.endTime - now) / 1000));

      html += `
        <div style="margin-top:12px;padding:8px;background:rgba(57,255,20,0.1);border:1px solid var(--green);border-radius:4px;">
          <div class="alembic-timer-${config.recipeId}" style="font-size:11px;color:var(--green);margin-bottom:4px;">⚡ CRAFTING (${remaining}s remaining)</div>
          <div class="progress-bar" style="height:12px;margin:4px 0;">
            <div class="progress-fill alembic-progress-${config.recipeId}" style="width:${progress}%;background:var(--green);"></div>
          </div>
        </div>
      `;
    } else {
      // Status message
      let status = "Idle";
      let statusColor = "var(--text-dim)";

      // Check why not crafting
      const needsInput = Object.entries(recipe.ingredients).some(([id, amount]) => {
        const needed = amount * config.allocatedAlembics;
        return (config.inputBuffers[id] || 0) < needed;
      });

      const outputFull = (config.outputBuffer.amount + (recipe.produces[outputResId] * config.allocatedAlembics)) > maxCapacity;

      if (needsInput) {
        status = "⚠️ Waiting for inputs";
        statusColor = "var(--amber)";
      } else if (outputFull) {
        status = "⚠️ Output buffer full";
        statusColor = "var(--red)";
      }

      html += `
        <div style="margin-top:12px;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;">
          <div style="font-size:11px;color:${statusColor};">${status}</div>
        </div>
      `;
    }
  } else {
    html += `
      <div style="padding:12px;background:var(--bg);border:1px solid var(--border);border-radius:4px;text-align:center;color:var(--text-dim);font-size:11px;">
        Allocate at least 1 Alembic to activate this configuration
      </div>
    `;
  }

  // Show unslotted golems assigned to this recipe (fallback / no-slot mode)
  const unslottedGolems = G.golems.filter(g => g.targetRecipeId === config.recipeId && g.alembicSlot === null);
  if (G.intelligentGolemsUnlocked && unslottedGolems.length > 0) {
    const stateLabels = { idle: "waiting", feeding: "⚡ feeding", pickup: "🚚 pickup", delivering: "🚚 delivering" };
    html += `
      <div style="margin-top:12px;padding:8px;background:rgba(204,68,255,0.07);border:1px solid var(--purple);border-radius:4px;">
        <div style="font-size:10px;color:var(--purple);margin-bottom:4px;">🔮 Unslotted Golems (general supply):</div>
        ${unslottedGolems.map(g => {
          const gDef = GOLEM_TYPES[g.typeId];
          const stateLabel = stateLabels[g.state] || g.state;
          return `<div style="font-size:10px;color:var(--text);">${gDef.role === "feeder" ? "⚗️" : "🚚"} ${g.name} — ${stateLabel}</div>`;
        }).join("")}
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

function showAlembicPanel() {
  if (!G.alembicsUnlocked) {
    log("Complete Alembic Automation research first!", "warn");
    return;
  }

  G.currentView = "alembics";

  // Hide main UI
  document.getElementById("main-layout").style.display = "none";
  document.getElementById("worldmap-panel").style.display = "none";
  document.getElementById("researchlab-panel").style.display = "none";
  document.getElementById("expedition-panel").style.display = "none";

  // Show alembic panel
  const panel = document.getElementById("alembic-panel");
  panel.style.display = "block";

  renderAlembicPanel();
}

function hideAlembicPanel() {
  G.currentView = "workshop";
  document.getElementById("alembic-panel").style.display = "none";
  document.getElementById("main-layout").style.display = "grid";
  renderAll();
}

// ─────────────────────────────────────────────────────
// EXPEDITION PANEL — Explorer Golem Management
// ─────────────────────────────────────────────────────

function renderExpeditionBtn() {
  const btn = document.getElementById("expedition-btn");
  if (btn) btn.style.display = G.explorerGolemsUnlocked ? "block" : "none";
}

function showExpeditionPanel() {
  G.currentView = "expeditions";
  document.getElementById("main-layout").style.display = "none";
  document.getElementById("worldmap-panel").style.display = "none";
  document.getElementById("researchlab-panel").style.display = "none";
  document.getElementById("alembic-panel").style.display = "none";
  document.getElementById("expedition-panel").style.display = "block";
  renderExpeditionPanel();
}

function hideExpeditionPanel() {
  G.currentView = "workshop";
  document.getElementById("expedition-panel").style.display = "none";
  document.getElementById("main-layout").style.display = "grid";
  renderAll();
}

function setExplorerResource(explorerId, slot, resourceId) {
  const golem = G.golems.find(g => g.id == explorerId);
  if (!golem || GOLEM_TYPES[golem.typeId]?.role !== 'explorer') return;
  golem.trackedResources[slot] = resourceId || null;
  saveGame();
  renderExpeditionPanel();
}

function renderExpeditionPanel() {
  const panel = document.getElementById("expedition-panel");
  if (!panel || G.currentView !== "expeditions") return;

  const explorers = G.golems.filter(g => GOLEM_TYPES[g.typeId]?.role === 'explorer');

  // Build list of resource IDs that appear in at least one zone
  const gatherableResources = [...new Set(ZONES.flatMap(z => z.yields))];

  const stateLabels = { idle: "Idle", traveling: "🚶 Traveling", gathering: "⛏️ Gathering" };

  let cards = '';
  if (explorers.length === 0) {
    cards = `<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px;">
      No Explorer Golems yet. Craft one in the Workshop.
    </div>`;
  } else {
    cards = explorers.map(golem => {
      const slotRows = [0, 1].map(slot => {
        const tracked = golem.trackedResources[slot] || '';
        const options = `<option value="">— None —</option>` +
          gatherableResources.map(rId => {
            const r = RESOURCES[rId];
            return `<option value="${rId}" ${tracked === rId ? 'selected' : ''}>${r.icon} ${r.name}</option>`;
          }).join('');

        // Find in-flight golem for this slot
        const dispatched = G.golems.find(g =>
          g.dispatchedByExplorerId === golem.id && g.dispatchedForSlot === slot && g.state !== 'idle'
        );
        const dispatchedHtml = dispatched
          ? `<span style="font-size:10px;color:var(--green);margin-left:8px;">${dispatched.name} — ${stateLabels[dispatched.state] || dispatched.state}</span>`
          : `<span style="font-size:10px;color:var(--text-dim);margin-left:8px;">Waiting for idle golem…</span>`;

        return `
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
            <span style="font-size:10px;color:var(--text-dim);min-width:40px;">Slot ${slot + 1}:</span>
            <select data-action="set-explorer-resource" data-explorer="${golem.id}" data-slot="${slot}"
              style="background:var(--bg2);color:var(--text);border:1px solid var(--border);font-size:10px;flex:1;">
              ${options}
            </select>
            ${tracked ? dispatchedHtml : ''}
          </div>`;
      }).join('');

      return `
        <div style="border:1px solid var(--green);padding:10px 12px;margin-bottom:12px;background:var(--bg3);border-radius:4px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:12px;color:var(--green);flex:1;">🧭 ${golem.name}</span>
            <button class="btn-sm" data-action="destroy-golem" data-golem="${golem.id}"
              style="color:var(--red);font-size:10px;">✕ Dismantle</button>
          </div>
          <div style="font-size:10px;color:var(--text-dim);">Tracks up to 2 resources — dispatches idle golems automatically</div>
          ${slotRows}
        </div>`;
    }).join('');
  }

  panel.innerHTML = `
    <div style="max-width:800px;margin:0 auto;padding:20px;">
      <button class="btn" data-action="hide-expeditions" style="margin-bottom:10px;">← Back to Workshop</button>
      <h2 style="text-align:center;color:var(--green);margin-bottom:10px;">⚔️ Expeditions</h2>
      <p style="text-align:center;color:var(--text-dim);font-size:11px;margin-bottom:20px;">
        Each Explorer Golem tracks up to 2 resources and automatically dispatches your idle golems to collect them.
      </p>
      ${cards}
    </div>`;
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
    const isIdle = golem.state === "idle";
    const isIntelligent = def.role === "feeder" || def.role === "carrier" || def.role === "explorer";

    // ── Intelligent golem (feeder / carrier / explorer) — managed from dedicated panels ──
    if (isIntelligent) return "";

    // ── Standard golem ──
    const zone = ZONES.find(z => z.id === golem.zoneId);
    const statusColor = isIdle ? "var(--amber)" : "var(--green)";
    const statusText  = isIdle ? "Idle" : `→ ${zone?.name || "?"}`;

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

  // Update alembic progress bars
  if (G.alembicsUnlocked) {
    Object.keys(G.alembicConfigs).forEach(recipeId => {
      const config = G.alembicConfigs[recipeId];
      if (!config.currentCraft) return;

      const fill = document.querySelector(`.alembic-progress-${recipeId}`);
      const timer = document.querySelector(`.alembic-timer-${recipeId}`);
      if (!fill && !timer) return;

      const progress = Math.min(100, ((now - config.currentCraft.startTime) / (config.currentCraft.endTime - config.currentCraft.startTime)) * 100);
      const remaining = Math.max(0, Math.ceil((config.currentCraft.endTime - now) / 1000));

      if (fill) fill.style.width = progress + '%';
      if (timer) timer.textContent = `⚡ CRAFTING (${remaining}s remaining)`;
    });
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
  const regularGolemCount = G.golems.filter(g => !GOLEM_TYPES[g.typeId]?.role).length;
  const slots = maxGolems - regularGolemCount;
  el.innerHTML = `<div style="color:var(--text-dim);font-size:11px;margin-bottom:6px;">Golem slots: ${regularGolemCount}/${maxGolems} &mdash; <span style="color:${slots>0?'var(--green)':'var(--red)'}">${slots} slot(s) free</span></div>`
    + Object.entries(GOLEM_TYPES).map(([typeId, def]) => {
      // Hide intelligent golems unless the relevant research is complete
      if ((def.role === "feeder" || def.role === "carrier") && !G.intelligentGolemsUnlocked) return "";
      if (def.role === "explorer" && !G.explorerGolemsUnlocked) return "";

      const workshopLocked = G.workshopLevel < def.unlock;
      const noSlots = !def.role && slots <= 0; // intelligent golems are unlimited
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
      else if (noSlots)   blockReason = `<span style="color:var(--red)"> ⚠ No regular golem slots free — upgrade Workshop!</span>`;

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

function renderAlembicsBtn() {
  const btn = document.getElementById("alembics-btn");
  if (btn) btn.style.display = G.alembicsUnlocked ? "block" : "none";
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
    const regularCount = G.golems.filter(g => !GOLEM_TYPES[g.typeId]?.role).length;
    let text = `Workshop: ${wl.name} (Lvl ${G.workshopLevel}) | Golems: ${regularCount}/${wl.maxGolems} (${busy} active) | Time: ${fmtTime(G.totalTime)}`;
    if (G.activeShrineBuffs.length > 0) {
      const remaining = Math.max(0, Math.ceil((G.activeShrineBuffs[0].endTime - Date.now()) / 1000));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      text += ` | ✨ Shrine: ${mins}m ${secs}s`;
    }
    el.textContent = text;
  }
}

// ─────────────────────────────────────────────────────
// TUTORIAL SYSTEM
// ─────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: "Welcome, Alchemist!",
    text: "Welcome to Alchemist's Automatons! You'll craft Golems, gather resources, brew potions, and automate your workshop. Let's walk through the basics.",
    targetSelector: null  // center modal, no highlight
  },
  {
    title: "Your Resources",
    text: "These are your resources. You start with Clay and Herbs — just enough to craft your first Golem. Resources are gathered by Golems or by you manually.",
    targetSelector: "#resources-display"
  },
  {
    title: "Craft a Golem",
    text: "Here you craft Golems. Click 'Craft' on the Clay Golem to build your first one. Golems are your workforce — they do everything automatically!",
    targetSelector: "#golem-recipes"
  },
  {
    title: "Your Golem Roster",
    text: "Your Golems appear here once crafted. An idle Golem is waiting for a job. You can upgrade, recall, or dismantle them from this panel.",
    targetSelector: "#golem-roster"
  },
  {
    title: "Send Golems to Zones",
    text: "Zones are where Golems gather resources. Click 'Send' on an empty slot to dispatch your idle Golem. The Whispering Forest is safe and yields Clay, Herbs, and Crystals.",
    targetSelector: "#panel-zones"
  },
  {
    title: "Event Log",
    text: "All activity is logged here — resource gains, Golem trips, and important events. Keep an eye on it to track what's happening in your workshop.",
    targetSelector: "#event-log-container"
  },
  {
    title: "You're Ready!",
    text: "That's the core loop: Craft Golems → Send to Zones → Gather Resources → Brew Potions → Upgrade. You can replay this tutorial anytime from the footer. Good luck!",
    targetSelector: null
  }
];

function startTutorial() {
  // Make sure we're on the main workshop view
  if (G.currentView !== "workshop") {
    hideAlembicPanel && G.currentView === "alembics" && hideAlembicPanel();
    hideExpeditionPanel && G.currentView === "expeditions" && hideExpeditionPanel();
    if (G.currentView === "researchlab") hideResearchLab();
    if (G.currentView === "worldmap") {
      document.getElementById("worldmap-panel").style.display = "none";
      document.getElementById("main-layout").style.display = "grid";
      G.currentView = "workshop";
    }
  }
  G.tutorialStep = 0;
  renderTutorial();
}

function nextTutorialStep() {
  G.tutorialStep++;
  if (G.tutorialStep >= TUTORIAL_STEPS.length) {
    endTutorial();
  } else {
    renderTutorial();
  }
}

function endTutorial() {
  G.tutorialStep = -1;
  G.tutorialSeen = true;
  const overlay = document.getElementById("tutorial-overlay");
  if (overlay) { overlay.innerHTML = ""; overlay.classList.remove("active"); }
  saveGame();
}

function renderTutorial() {
  const overlay = document.getElementById("tutorial-overlay");
  if (!overlay) return;
  if (G.tutorialStep < 0) { overlay.innerHTML = ""; overlay.classList.remove("active"); return; }

  const step = TUTORIAL_STEPS[G.tutorialStep];
  const stepNum = G.tutorialStep + 1;
  const total = TUTORIAL_STEPS.length;

  overlay.classList.add("active");

  let highlightHtml = "";
  let cardStyle = "";

  function buildTutorialCard() {
    let hl = "";
    let cs = "";
    const isMobile = window.innerWidth < 600;

    if (step.targetSelector) {
      const target = document.querySelector(step.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        const pad = 6;
        const top = rect.top - pad;
        const left = rect.left - pad;
        const width = rect.width + pad * 2;
        const height = rect.height + pad * 2;
        hl = `<div class="tutorial-highlight" style="top:${top}px;left:${left}px;width:${width}px;height:${height}px;"></div>`;

        if (isMobile) {
          // On mobile: always anchor card to bottom center of screen
          cs = "bottom:80px;left:50%;transform:translateX(-50%);width:calc(100vw - 24px);max-width:none;";
        } else {
          const cardTop = (top + height + 12 + 160 < window.innerHeight)
            ? `${top + height + 12}px`
            : `${Math.max(8, top - 170)}px`;
          const cardLeft = Math.min(Math.max(8, left), window.innerWidth - 360) + "px";
          cs = `top:${cardTop};left:${cardLeft};`;
        }
      } else {
        cs = isMobile
          ? "bottom:80px;left:50%;transform:translateX(-50%);width:calc(100vw - 24px);max-width:none;"
          : "top:50%;left:50%;transform:translate(-50%,-50%);";
      }
    } else {
      cs = isMobile
        ? "top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100vw - 24px);max-width:none;"
        : "top:50%;left:50%;transform:translate(-50%,-50%);";
    }
    overlay.innerHTML = `
      ${hl}
      <div class="tutorial-card" style="${cs}">
        <div class="tutorial-step-indicator">Step ${stepNum} of ${total}</div>
        <h3>${step.title}</h3>
        <p>${step.text}</p>
        <div class="tutorial-actions">
          <button class="btn" data-action="tutorial-next"
            style="color:var(--green);border-color:var(--green);padding:3px 14px;font-size:11px;">
            ${G.tutorialStep === total - 1 ? "Finish" : "Next →"}
          </button>
          ${G.tutorialStep < total - 1
            ? `<button class="btn" data-action="tutorial-skip"
                 style="color:var(--text-dim);border-color:var(--border);padding:3px 10px;font-size:11px;">
                 Skip
               </button>`
            : ""}
        </div>
      </div>`;
  }

  if (step.targetSelector) {
    const target = document.querySelector(step.targetSelector);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait for scroll to settle before positioning the highlight
      setTimeout(buildTutorialCard, 350);
      return;
    }
  }
  buildTutorialCard();
}

function renderAll() {
  renderResources();
  renderRecipes();
  renderAlchemy();
  renderAlembicsBtn();
  renderUpgrades();
  renderMap(null);
  renderFooter();
  renderGolemRoster();
  renderZones();
  renderAlchemistActions();
  renderAlembicsBtn();
  renderExpeditionBtn();
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
      // Alembic State
      alembicsUnlocked: G.alembicsUnlocked,
      alembicsBuilt: G.alembicsBuilt,
      alembicConfigs: G.alembicConfigs,
      intelligentGolemsUnlocked: G.intelligentGolemsUnlocked,
      explorerGolemsUnlocked: G.explorerGolemsUnlocked,
      mapRing: G.mapRing,
      tileData: G.tileData,
      activeShrineBuffs: G.activeShrineBuffs,
      bossRespawnQueue: G.bossRespawnQueue,
      tutorialStep: G.tutorialStep,
      tutorialSeen: G.tutorialSeen,
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
    if (G.resources.divination_shard === undefined) G.resources.divination_shard = 0;
    if (G.resources.condensed_knowledge_divination === undefined) G.resources.condensed_knowledge_divination = 0;
    G.golems           = (save.golems||[]).map(g => ({
      ...g,
      upgrades: g.upgrades || [],
      danger_resist: g.danger_resist !== undefined ? g.danger_resist : (GOLEM_TYPES[g.typeId]?.danger_resist || 0),
      bonus_capacity: g.bonus_capacity || 0,
      speed_mult: g.speed_mult || 1.0,
      targetRecipeId: g.targetRecipeId || null,
      alembicSlot: g.alembicSlot || null,
      trackedResources: g.trackedResources || [],
      dispatchedByExplorerId: g.dispatchedByExplorerId || null,
      dispatchedForSlot: g.dispatchedForSlot !== undefined ? g.dispatchedForSlot : null
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
    if (G.injector && G.injector.divinationAmount === undefined) G.injector.divinationAmount = 0;
    G.activeResearch = save.activeResearch || null;
    G.researchQueue = save.researchQueue || [];
    G.researchNodes = save.researchNodes || {};
    G.injectionPointsMult = save.injectionPointsMult || 1;
    G.alchemyProductivityBonus = save.alchemyProductivityBonus || 0;
    G.autoDistiller = save.autoDistiller || false;
    G.autoResearch = save.autoResearch || false;
    G.intelligentGolemsUnlocked = save.intelligentGolemsUnlocked || false;
    G.explorerGolemsUnlocked = save.explorerGolemsUnlocked || false;
    G.mapRing = save.mapRing || 0;
    G.tileData = save.tileData || {};
    G.activeShrineBuffs = save.activeShrineBuffs || [];
    G.bossRespawnQueue = save.bossRespawnQueue || [];
    if (G.resources.artifact === undefined) G.resources.artifact = 0;
    G.tutorialStep = save.tutorialStep !== undefined ? save.tutorialStep : -1;
    G.tutorialSeen = save.tutorialSeen || false;

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

    // Restore Alembic State
    G.alembicsUnlocked = save.alembicsUnlocked || false;
    G.alembicsBuilt = save.alembicsBuilt || 0;
    G.alembicConfigs = save.alembicConfigs || {};
    // Backwards-compat: ensure feeder slot fields exist on loaded configs
    Object.values(G.alembicConfigs).forEach(config => {
      if (!config.feederSlots) config.feederSlots = {};
      if (config.collectorCount === undefined) config.collectorCount = 0;
    });

    // Handle in-progress Alembic crafts (complete if finished during offline)
    if (save.alembicConfigs) {
      Object.entries(save.alembicConfigs).forEach(([recipeId, config]) => {
        if (config.currentCraft && config.currentCraft.endTime < Date.now()) {
          // Complete the craft
          const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
          if (recipe) {
            // Add to output buffer
            Object.entries(recipe.produces).forEach(([resourceId, baseAmount]) => {
              const amount = baseAmount * config.allocatedAlembics;
              config.outputBuffer[resourceId] = (config.outputBuffer[resourceId] || 0) + amount;
            });
          }
          config.currentCraft = null;
        }
      });
    }

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

      // Alembic offline progress
      if (G.alembicConfigs) {
        Object.entries(G.alembicConfigs).forEach(([recipeId, config]) => {
          if (config.allocatedAlembics === 0) return;

          const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
          if (!recipe) return;

          // Simulate crafting cycles during offline time
          const craftTime = recipe.time; // in seconds
          const possibleCycles = Math.floor(elapsed / craftTime);

          if (possibleCycles > 0) {
            let completedCycles = 0;

            for (let cycle = 0; cycle < possibleCycles; cycle++) {
              // Check if we have enough inputs for one craft
              let canCraft = true;
              Object.entries(recipe.ingredients).forEach(([resourceId, baseAmount]) => {
                const needed = baseAmount * config.allocatedAlembics;
                const available = config.inputBuffers[resourceId] || 0;
                if (available < needed) {
                  canCraft = false;
                }
              });

              if (!canCraft) break;

              // Check if output has space
              let outputFull = false;
              const maxOutputPerResource = 100 * config.allocatedAlembics;
              Object.entries(recipe.produces).forEach(([resourceId, baseAmount]) => {
                const produceAmount = baseAmount * config.allocatedAlembics;
                const currentOutput = config.outputBuffer[resourceId] || 0;
                if (currentOutput + produceAmount > maxOutputPerResource) {
                  outputFull = true;
                }
              });

              if (outputFull) break;

              // Consume inputs
              Object.entries(recipe.ingredients).forEach(([resourceId, baseAmount]) => {
                const needed = baseAmount * config.allocatedAlembics;
                config.inputBuffers[resourceId] = (config.inputBuffers[resourceId] || 0) - needed;
              });

              // Produce outputs
              Object.entries(recipe.produces).forEach(([resourceId, baseAmount]) => {
                const amount = baseAmount * config.allocatedAlembics;
                config.outputBuffer[resourceId] = (config.outputBuffer[resourceId] || 0) + amount;
              });

              completedCycles++;
            }

            if (completedCycles > 0) {
              log(`⚗️ Alembics completed ${completedCycles} ${recipe.icon} ${recipe.name} crafts while away!`, "good");
            }
          }
        });
      }
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
  tickWorldMap(now);
  tickDistiller(now);
  tickResearch(now);
  tickAlembics(now);
  tickProgressBars(now);
  if (G.currentView === "expeditions") renderExpeditionPanel();

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
  // Change event for select dropdowns (e.g. assign-golem-recipe)
  document.getElementById('app').addEventListener('change', function(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'assign-golem-recipe') {
      assignGolemToRecipe(Number(el.dataset.golem), el.value);
    } else if (el.dataset.action === 'set-explorer-resource') {
      setExplorerResource(Number(el.dataset.explorer), Number(el.dataset.slot), el.value);
    }
  });

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
    } else if (action === 'interact-special-tile') { interactSpecialTile(Number(btn.dataset.row), Number(btn.dataset.col));
    } else if (action === 'merchant-trade') { executeMerchantTrade(Number(btn.dataset.row), Number(btn.dataset.col), btn.dataset.offer);
    } else if (action === 'close-special-panel') { const p = document.getElementById("special-tile-panel"); if (p) p.innerHTML = "";
    } else if (action === 'expand-map') { expandWorldMap();

    // Research Lab Actions
    } else if (action === 'show-researchlab') { showResearchLab();
    } else if (action === 'hide-researchlab') { hideResearchLab();
    } else if (action === 'build-distiller')  { buildDistiller();
    } else if (action === 'build-injector')   { buildInjector();
    } else if (action === 'distill')          { startDistilling(Number(btn.dataset.amount), btn.dataset.type || "alchemy");
    } else if (action === 'queue-research')   { queueResearch(btn.dataset.nodeId);
    } else if (action === 'cancel-research')  { cancelActiveResearch();
    } else if (action === 'remove-from-queue') { removeFromQueue(btn.dataset.nodeId);

    // Expedition Actions
    } else if (action === 'show-expeditions') { showExpeditionPanel();
    } else if (action === 'hide-expeditions') { hideExpeditionPanel();

    // Alembic Actions
    } else if (action === 'show-alembics')    { showAlembicPanel();
    } else if (action === 'hide-alembics')    { hideAlembicPanel();
    } else if (action === 'build-alembic')    { buildAlembic();
    } else if (action === 'select-alembic-recipe') { selectAlembicRecipe(btn.dataset.recipe);
    } else if (action === 'allocate-alembics') {
      const recipeId = btn.dataset.recipe;
      const count = Number(btn.dataset.count);
      allocateAlembics(recipeId, count);
    } else if (action === 'load-alembic-input') {
      const recipeId = btn.dataset.recipe;
      const resourceId = btn.dataset.resource;
      const amount = Number(btn.dataset.amount);
      loadAlembicInput(recipeId, resourceId, amount);
    } else if (action === 'collect-alembic-output') {
      collectAlembicOutput(btn.dataset.recipe);
    } else if (action === 'assign-alembic-feeder') {
      assignFeederToSlot(btn.dataset.recipe, btn.dataset.resource);
    } else if (action === 'unassign-alembic-feeder') {
      unassignFeederFromSlot(btn.dataset.recipe, btn.dataset.resource);
    } else if (action === 'assign-alembic-collector') {
      assignCollectorToOutput(btn.dataset.recipe);
    } else if (action === 'unassign-alembic-collector') {
      unassignCollectorFromOutput(btn.dataset.recipe);
    } else if (action === 'free-all-feeders') {
      freeAllFeeders();

    // Tutorial Actions
    } else if (action === 'start-tutorial') { startTutorial();
    } else if (action === 'tutorial-next')  { nextTutorialStep();
    } else if (action === 'tutorial-skip')  { endTutorial();

    // Debug Actions
    } else if (action === 'debug-give-resource')     { debugGiveResource();
    } else if (action === 'debug-skip-time')         { debugSkipTime();
    } else if (action === 'debug-complete-research') { debugCompleteResearch();
    } else if (action === 'debug-build-machines')    { debugBuildMachines();
    } else if (action === 'debug-max-workshop')      { debugMaxWorkshop();
    } else if (action === 'debug-unlock-all-recipes') { debugUnlockAllRecipes();
    }
  });
}

// ─────────────────────────────────────────────────────
// DEBUG FEATURES (remove before production)
// ─────────────────────────────────────────────────────

function toggleDebugMode() {
  G.debugMode = !G.debugMode;
  const panel = document.getElementById("debug-panel");
  if (panel) {
    panel.style.display = G.debugMode ? "block" : "none";
  }
  log(G.debugMode ? "🐛 Debug mode enabled" : "🐛 Debug mode disabled", "info");
  if (G.debugMode) renderDebugPanel();
}

function renderDebugPanel() {
  const panel = document.getElementById("debug-panel");
  if (!panel || !G.debugMode) return;

  // Build resource dropdown options
  const resourceOptions = Object.keys(RESOURCES).map(resId => {
    const res = RESOURCES[resId];
    return `<option value="${resId}">${res.icon} ${res.name}</option>`;
  }).join("");

  panel.innerHTML = `
    <div style="padding:12px;background:rgba(0,0,0,0.9);border:3px solid var(--red);border-radius:8px;min-width:280px;">
      <h3 style="color:var(--red);margin:0 0 12px 0;text-align:center;">🐛 DEBUG PANEL</h3>

      <!-- Resource Giver -->
      <div style="margin-bottom:12px;padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;">
        <h4 style="color:var(--amber);margin:0 0 6px 0;font-size:12px;">📦 Give Resources</h4>
        <select id="debug-resource" style="width:100%;margin-bottom:4px;background:var(--bg);color:var(--text);border:1px solid var(--border);padding:4px;">
          ${resourceOptions}
        </select>
        <div style="display:flex;gap:4px;">
          <input id="debug-amount" type="number" value="100" min="1" style="flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);padding:4px;">
          <button class="btn-sm" data-action="debug-give-resource" style="background:var(--green);">Give</button>
        </div>
      </div>

      <!-- Time Skip -->
      <div style="margin-bottom:12px;padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;">
        <h4 style="color:var(--amber);margin:0 0 6px 0;font-size:12px;">⏰ Time Skip</h4>
        <div style="display:flex;gap:4px;">
          <input id="debug-skip-seconds" type="number" value="60" min="1" style="flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);padding:4px;">
          <button class="btn-sm" data-action="debug-skip-time" style="background:var(--purple);">Skip</button>
        </div>
      </div>

      <!-- Research Complete -->
      <div style="margin-bottom:12px;padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;">
        <h4 style="color:var(--amber);margin:0 0 6px 0;font-size:12px;">🔬 Research</h4>
        <button class="btn-sm" data-action="debug-complete-research" style="width:100%;background:var(--purple);">Complete Active Research</button>
      </div>

      <!-- Quick Actions -->
      <div style="padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;">
        <h4 style="color:var(--amber);margin:0 0 6px 0;font-size:12px;">⚡ Quick Actions</h4>
        <button class="btn-sm" data-action="debug-build-machines" style="width:100%;margin-bottom:4px;background:var(--green);">Build All Machines</button>
        <button class="btn-sm" data-action="debug-max-workshop" style="width:100%;margin-bottom:4px;background:var(--green);">Max Workshop Level</button>
        <button class="btn-sm" data-action="debug-unlock-all-recipes" style="width:100%;background:var(--green);">Unlock All Recipes</button>
      </div>

      <p style="margin:8px 0 0 0;font-size:9px;color:var(--text-dim);text-align:center;">Press F2 to toggle | All actions logged</p>
    </div>
  `;
}

// Debug action handlers
function debugGiveResource() {
  const resId = document.getElementById("debug-resource")?.value;
  const amount = parseInt(document.getElementById("debug-amount")?.value || "0");

  if (!resId || amount <= 0) {
    log("⚠️ Invalid resource or amount", "warn");
    return;
  }

  const res = RESOURCES[resId];
  if (!res) return;

  G.resources[resId] = (G.resources[resId] || 0) + amount;
  log(`🐛 DEBUG: Gave ${amount}x ${res.icon} ${res.name}`, "info");
  renderResources();
  renderRecipes();
  renderAlchemy();
  renderUpgrades();
  renderResearchLab();
}

function debugSkipTime() {
  const seconds = parseInt(document.getElementById("debug-skip-seconds")?.value || "0");
  if (seconds <= 0) {
    log("⚠️ Invalid time amount", "warn");
    return;
  }

  const now = Date.now();
  const skipMs = seconds * 1000;

  // Skip golem timers
  G.golems.forEach(golem => {
    if (golem.tripEnd) {
      golem.tripEnd = Math.max(now, golem.tripEnd - skipMs);
    }
  });

  // Skip alchemy timers
  G.alchemyQueue.forEach(job => {
    job.endTime = Math.max(now, job.endTime - skipMs);
  });

  // Skip distiller timer
  if (G.distiller && G.distiller.currentProcessing) {
    G.distiller.currentProcessing.endTime = Math.max(now, G.distiller.currentProcessing.endTime - skipMs);
  }

  // Skip alembic craft timers
  Object.values(G.alembicConfigs || {}).forEach(config => {
    if (config.currentCraft) {
      config.currentCraft.endTime = Math.max(now, config.currentCraft.endTime - skipMs);
      config.currentCraft.startTime = Math.min(config.currentCraft.startTime, config.currentCraft.endTime - 1);
    }
  });

  // Skip exploration timer
  if (G.explorationEndTime) {
    G.explorationEndTime = Math.max(now, G.explorationEndTime - skipMs);
  }

  log(`🐛 DEBUG: Skipped ${seconds} seconds forward`, "info");
  renderAll();
}

function debugCompleteResearch() {
  if (!G.activeResearch) {
    log("⚠️ No active research to complete", "warn");
    return;
  }

  const node = RESEARCH_NODES.find(n => n.id === G.activeResearch.nodeId);
  G.activeResearch.pointsAccumulated = G.activeResearch.pointsNeeded;

  log(`🐛 DEBUG: Instantly completed research: ${node.name}`, "info");
  completeResearch();
  renderResearchLab();
}

function debugBuildMachines() {
  if (!G.distiller) {
    G.distiller = {
      built: true,
      processingQueue: [],
      currentProcessing: null,
      baseProcessingTime: 10000,
      speedMultiplier: 1.0,
      waitingForSpace: false
    };
    log("🐛 DEBUG: Built Distiller", "info");
  }

  if (!G.injector) {
    G.injector = {
      built: true,
      capacity: 100,
      currentAmount: 0,
      divinationAmount: 0
    };
    log("🐛 DEBUG: Built Injector", "info");
  }

  renderResearchLab();
}

function debugMaxWorkshop() {
  const maxLevel = WORKSHOP_LEVELS.length - 1;
  G.workshopLevel = maxLevel;

  // Unlock all recipes
  ALCHEMY_RECIPES.forEach(r => {
    if (r.requiresLevel !== undefined && r.requiresLevel <= G.workshopLevel) {
      r.unlocked = true;
    }
  });

  log(`🐛 DEBUG: Workshop set to max level (${maxLevel})`, "info");
  renderUpgrades();
  renderRecipes();
  renderAlchemy();
}

function debugUnlockAllRecipes() {
  ALCHEMY_RECIPES.forEach(r => r.unlocked = true);
  log("🐛 DEBUG: Unlocked all alchemy recipes", "info");
  renderAlchemy();
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

  // Auto-start tutorial for new players
  if (!G.tutorialSeen) {
    setTimeout(startTutorial, 500);
  }

  // Add F2 debug mode toggle listener
  window.addEventListener("keydown", function(e) {
    if (e.key === "F2") {
      e.preventDefault();
      toggleDebugMode();
    }
  });

  log("🧪 Welcome, Alchemist! Craft your first Golem to begin.", "great");
  log("💡 Tip: Craft a golem, then assign it to a zone using the Zones panel.", "info");
  log("💡 Tip: Each zone has limited slots — manage your golems wisely!", "info");
  log("💡 Tip: Press F2 to toggle debug mode for testing.", "info");
  requestAnimationFrame(gameLoop);
});
