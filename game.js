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
  // Tier 2 — advanced
  { id: "philosophers_draft",name: "Philosopher's Draft",icon:"🌟", ingredients: { moonstone: 3, essence: 6, herbs: 4 },     produces: { gold: 120, essence: 12},time: 20, unlocked: false, requiresLevel: 2 },
  // Tier 3 — endgame
  { id: "soul_crystal",      name: "Soul Crystal",      icon: "🔮", ingredients: { crystals: 8, moonstone: 5, essence: 15 }, produces: { essence: 35, gold: 60}, time: 30, unlocked: false, requiresLevel: 3 },
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
  resources: { gold: 5, essence: 0, herbs: 5, crystals: 0, iron: 0, moonstone: 0, sulfur: 0, clay: 8 },
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
      for (const [res, amt] of Object.entries(golem.collected)) {
        G.resources[res] = (G.resources[res]||0) + amt;
        summary.push(`${amt}x ${RESOURCES[res].icon}`);
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

function renderZones() {
  const el = document.getElementById("zones-panel");
  if (!el) return;

  el.innerHTML = ZONES.map(zone => {
    const active = golemsInZone(zone.id);
    const slots  = zone.maxSlots;
    const yieldsStr = zone.yields.map(r => RESOURCES[r].icon).join(" ");
    const dangerStr = "⚠️".repeat(zone.danger) || "✅";

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
          <span class="zone-meta">${dangerStr} | ${yieldsStr} | ${active.length}/${slots} slots</span>
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
    const costStr = Object.entries(recipe.ingredients).map(([r,a])=>`${a}${RESOURCES[r].icon}`).join(" ");
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
  const nextLevel = WORKSHOP_LEVELS[G.workshopLevel + 1];
  let workshopHtml = nextLevel
    ? `<button class="btn btn-amber" data-action="upgrade-workshop" ${canAfford(nextLevel.cost)?'':'disabled'}>
        🏗️ Upgrade Workshop → ${nextLevel.name}
        <div class="btn-cost">${Object.entries(nextLevel.cost).map(([r,a])=>`${a}x ${RESOURCES[r].icon}`).join(" ")}</div>
      </button>`
    : `<div style="color:var(--green-dim);font-size:11px;">Workshop at MAX level!</div>`;
  const upgradesHtml = UPGRADES.map(upg => {
    const locked = upg.requiresLevel > G.workshopLevel;
    const affordable = canAfford(upg.cost) && !upg.purchased && !locked;
    const costStr = Object.entries(upg.cost).map(([r,a])=>`${a}x ${RESOURCES[r].icon}`).join(" ");
    return `<div class="upgrade-card ${upg.purchased?'purchased':''}">
      <div class="upgrade-name">${upg.purchased?"✅":"🔧"} ${upg.name}</div>
      <div class="upgrade-desc">${upg.desc}</div>
      ${!upg.purchased?`<button class="btn" style="margin-top:4px;" data-action="buy-upgrade" data-upgrade="${upg.id}" ${affordable?'':'disabled'}>
        ${locked?`🔒 Lvl ${upg.requiresLevel}`:`Buy — ${costStr}`}
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
    if (save.zoneSlotsOverride) save.zoneSlotsOverride.forEach(sz => {
      const zone = ZONES.find(z=>z.id===sz.id);
      if (zone) zone.maxSlots = sz.maxSlots;
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
          if (trips > 0 && zone) {
            const capacity = def.capacity + G.golemBonusCapacity;
            for (let t=0; t<trips; t++) {
              let remaining = capacity;
              const yields = [...zone.yields];
              while (remaining > 0) {
                const res = randomFrom(yields);
                const amt = Math.min(remaining, Math.ceil(Math.random()*3)+1);
                G.resources[res] = (G.resources[res]||0) + amt;
                remaining -= amt;
              }
            }
            log(`📦 ${golem.name} made ${trips} trips while away!`, "good");
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
    }
  });
}

// ─────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", function() {
  loadGame();
  renderAll();
  setupEventDelegation();
  log("🧪 Welcome, Alchemist! Craft your first Golem to begin.", "great");
  log("💡 Tip: Craft a golem, then assign it to a zone using the Zones panel.", "info");
  log("💡 Tip: Each zone has limited slots — manage your golems wisely!", "info");
  requestAnimationFrame(gameLoop);
});
