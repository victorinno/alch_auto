/* =====================================================
   ALCHEMIST'S AUTOMATONS — Game Logic
   Idle / Automation RPG
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

const ZONES = [
  { id: "forest",   name: "Whispering Forest", icon: "🌲", ascii: "forest",   yields: ["herbs","crystals"], danger: 0 },
  { id: "mine",     name: "Iron Depths",        icon: "⛏️",  ascii: "mine",    yields: ["iron","crystals"],  danger: 1 },
  { id: "swamp",    name: "Sulfur Swamp",       icon: "🌫️",  ascii: "swamp",   yields: ["sulfur","herbs"],   danger: 1 },
  { id: "ruins",    name: "Ancient Ruins",      icon: "🏛️",  ascii: "ruins",   yields: ["moonstone","essence"], danger: 2 },
  { id: "volcano",  name: "Ember Volcano",      icon: "🌋",  ascii: "volcano", yields: ["sulfur","moonstone"],  danger: 3 },
];

const GOLEM_TYPES = {
  clay: {
    name: "Clay Golem",
    tier: 1,
    ascii: " (o_o) \n [___] \n  | | ",
    speed: 8,          // seconds per trip
    capacity: 3,
    danger_resist: 0,
    cost: { clay: 5, essence: 2 },
    unlock: 0,
  },
  iron: {
    name: "Iron Golem",
    tier: 2,
    ascii: " [O.O] \n |[_]| \n  | | ",
    speed: 6,
    capacity: 6,
    danger_resist: 1,
    cost: { iron: 8, essence: 5, crystals: 3 },
    unlock: 1,   // workshop level required
  },
  crystal: {
    name: "Crystal Golem",
    tier: 3,
    ascii: " <*.*> \n |<_>| \n  | | ",
    speed: 4,
    capacity: 10,
    danger_resist: 2,
    cost: { crystals: 12, moonstone: 4, essence: 10 },
    unlock: 2,
  },
  moon: {
    name: "Moon Golem",
    tier: 4,
    ascii: " (◕‿◕) \n {___} \n  | | ",
    speed: 3,
    capacity: 15,
    danger_resist: 3,
    cost: { moonstone: 10, essence: 20, crystals: 8 },
    unlock: 3,
  },
};

const ALCHEMY_RECIPES = [
  {
    id: "healing_potion",
    name: "Healing Potion",
    icon: "🧪",
    ingredients: { herbs: 3, crystals: 1 },
    produces: { gold: 15 },
    time: 5,
    unlocked: true,
  },
  {
    id: "mana_elixir",
    name: "Mana Elixir",
    icon: "💜",
    ingredients: { crystals: 3, moonstone: 1 },
    produces: { gold: 30, essence: 2 },
    time: 8,
    unlocked: true,
  },
  {
    id: "golem_oil",
    name: "Golem Oil",
    icon: "⚗️",
    ingredients: { herbs: 2, sulfur: 2, iron: 1 },
    produces: { essence: 5 },
    time: 10,
    unlocked: true,
  },
  {
    id: "philosophers_draft",
    name: "Philosopher's Draft",
    icon: "🌟",
    ingredients: { moonstone: 3, essence: 5, sulfur: 2 },
    produces: { gold: 100, essence: 10 },
    time: 20,
    unlocked: false,
    requiresLevel: 2,
  },
  {
    id: "soul_crystal",
    name: "Soul Crystal",
    icon: "🔮",
    ingredients: { crystals: 8, moonstone: 5, essence: 15 },
    produces: { essence: 30, gold: 50 },
    time: 30,
    unlocked: false,
    requiresLevel: 3,
  },
];

const UPGRADES = [
  {
    id: "better_furnace",
    name: "Better Furnace",
    desc: "Alchemy recipes complete 25% faster.",
    cost: { gold: 50, iron: 5 },
    effect: () => { G.alchemySpeedMult *= 0.75; },
    purchased: false,
    requiresLevel: 0,
  },
  {
    id: "golem_beacon",
    name: "Golem Beacon",
    desc: "All golems gather +1 extra resource per trip.",
    cost: { gold: 80, crystals: 5, essence: 5 },
    effect: () => { G.golemBonusCapacity += 1; },
    purchased: false,
    requiresLevel: 1,
  },
  {
    id: "arcane_compass",
    name: "Arcane Compass",
    desc: "Golems travel 20% faster.",
    cost: { gold: 120, moonstone: 3, essence: 10 },
    effect: () => { G.golemSpeedMult *= 0.80; },
    purchased: false,
    requiresLevel: 1,
  },
  {
    id: "essence_condenser",
    name: "Essence Condenser",
    desc: "Alchemy produces +50% more essence.",
    cost: { gold: 200, crystals: 10, moonstone: 5 },
    effect: () => { G.essenceMult = (G.essenceMult || 1) * 1.5; },
    purchased: false,
    requiresLevel: 2,
  },
  {
    id: "master_blueprint",
    name: "Master Blueprint",
    desc: "Golem crafting costs reduced by 25%.",
    cost: { gold: 300, essence: 20, moonstone: 8 },
    effect: () => { G.craftCostMult *= 0.75; },
    purchased: false,
    requiresLevel: 2,
  },
  {
    id: "lunar_attunement",
    name: "Lunar Attunement",
    desc: "Moon Golems gather from all zones simultaneously.",
    cost: { gold: 500, moonstone: 15, essence: 30 },
    effect: () => { G.lunarAttunement = true; },
    purchased: false,
    requiresLevel: 3,
  },
];

const WORKSHOP_LEVELS = [
  { level: 0, name: "Novice Lab",    maxGolems: 2,  cost: null },
  { level: 1, name: "Journeyman Lab",maxGolems: 4,  cost: { gold: 100, iron: 10 } },
  { level: 2, name: "Adept Lab",     maxGolems: 6,  cost: { gold: 250, crystals: 8, essence: 10 } },
  { level: 3, name: "Master Lab",    maxGolems: 10, cost: { gold: 600, moonstone: 6, essence: 25 } },
];

// ─────────────────────────────────────────────────────
// GAME STATE
// ─────────────────────────────────────────────────────

const G = {
  resources: {
    gold: 10, essence: 5, herbs: 0, crystals: 0,
    iron: 0, moonstone: 0, sulfur: 0, clay: 10,
  },
  golems: [],          // active golem instances
  nextGolemId: 1,
  workshopLevel: 0,
  alchemyQueue: [],    // { recipe, startTime, endTime }
  alchemySpeedMult: 1,
  golemSpeedMult: 1,
  golemBonusCapacity: 0,
  essenceMult: 1,
  craftCostMult: 1,
  lunarAttunement: false,
  totalTime: 0,        // seconds elapsed
  prestigeCount: 0,
  eventLog: [],
  lastSave: Date.now(),
};

// ─────────────────────────────────────────────────────
// ASCII MAP FRAMES
// ─────────────────────────────────────────────────────

const ASCII_MAPS = {
  workshop: `
+------------------------------------------+
|  WORKSHOP                                |
|                                          |
|   [Furnace]    [Workbench]   [Shelf]     |
|    (===)         |___|        |||        |
|    |___|         |___|       [===]       |
|                                          |
|   [Golem Dock]                           |
|    ___   ___   ___   ___                 |
|   |   | |   | |   | |   |               |
|   |___|  ---  |___|  ---                |
|                                          |
+------------------------------------------+`,

  forest: `
+------------------------------------------+
|  WHISPERING FOREST                       |
|                                          |
|  /\\  /\\  /\\  /\\  /\\  /\\  /\\  /\\        |
| /  \\/  \\/  \\/  \\/  \\/  \\/  \\/  \\       |
|  ||||  ||||  ||||  ||||  ||||  ||||      |
|  ||||  ||||  ||||  ||||  ||||  ||||      |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   |
|  * herbs * crystals * mushrooms *       |
|                                          |
+------------------------------------------+`,

  mine: `
+------------------------------------------+
|  IRON DEPTHS                             |
|                                          |
|  ####################################   |
|  #  [===]  [===]  [===]  [===]      #   |
|  #   |||    |||    |||    |||        #   |
|  ####################################   |
|  #  * iron * crystals * stone *     #   |
|  ####################################   |
|                                          |
+------------------------------------------+`,

  swamp: `
+------------------------------------------+
|  SULFUR SWAMP                            |
|                                          |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     |
|  ~ ))) ~ ))) ~ ))) ~ ))) ~ ))) ~        |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     |
|  ~ * sulfur * herbs * bog water * ~     |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     |
|                                          |
+------------------------------------------+`,

  ruins: `
+------------------------------------------+
|  ANCIENT RUINS                           |
|                                          |
|  _   _   _   _   _   _   _   _          |
| | | | | | | | | | | | | | | | |         |
| |_| |_| |_| |_| |_| |_| |_| |_|        |
|  * moonstone * essence * relics *       |
|                                          |
+------------------------------------------+`,

  volcano: `
+------------------------------------------+
|  EMBER VOLCANO                           |
|                                          |
|        /\\                               |
|       /  \\                              |
|      / ** \\   * DANGER ZONE *           |
|     /______\\                            |
|    * sulfur * moonstone * magma *       |
|                                          |
+------------------------------------------+`,
};

// ─────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────

function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return Math.floor(n).toString();
}

function canAfford(costs, mult = 1) {
  for (const [res, amt] of Object.entries(costs)) {
    if ((G.resources[res] || 0) < Math.ceil(amt * mult)) return false;
  }
  return true;
}

function spend(costs, mult = 1) {
  for (const [res, amt] of Object.entries(costs)) {
    G.resources[res] = Math.max(0, (G.resources[res] || 0) - Math.ceil(amt * mult));
  }
}

function gain(rewards, mult = 1) {
  for (const [res, amt] of Object.entries(rewards)) {
    G.resources[res] = (G.resources[res] || 0) + Math.floor(amt * mult);
  }
}

function log(msg, type = "info") {
  const now = new Date();
  const t = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  G.eventLog.unshift({ t, msg, type });
  if (G.eventLog.length > 80) G.eventLog.pop();
  renderLog();
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────
// GOLEM LOGIC
// ─────────────────────────────────────────────────────

function craftGolem(typeId) {
  const def = GOLEM_TYPES[typeId];
  if (!def) return;
  if (G.workshopLevel < def.unlock) {
    log(`Workshop level ${def.unlock} required!`, "warn");
    return;
  }
  const maxGolems = WORKSHOP_LEVELS[G.workshopLevel].maxGolems;
  if (G.golems.length >= maxGolems) {
    log(`Golem dock is full! Upgrade workshop to add more.`, "warn");
    return;
  }
  if (!canAfford(def.cost, G.craftCostMult)) {
    log(`Not enough resources to craft ${def.name}.`, "warn");
    return;
  }
  spend(def.cost, G.craftCostMult);

  const golem = {
    id: G.nextGolemId++,
    typeId,
    name: `${def.name} #${G.nextGolemId - 1}`,
    state: "idle",   // idle | traveling | gathering | returning
    zoneId: null,
    tripStart: null,
    tripEnd: null,
    tripPhase: null,  // 'out' | 'back'
    collected: {},
  };

  G.golems.push(golem);
  log(`✨ Crafted ${golem.name}!`, "great");
  renderGolems();
  renderRecipes();
}

function sendGolem(golemId, zoneId) {
  const golem = G.golems.find(g => g.id === golemId);
  const zone  = ZONES.find(z => z.id === zoneId);
  const def   = GOLEM_TYPES[golem.typeId];
  if (!golem || !zone || golem.state !== "idle") return;

  if (zone.danger > def.danger_resist) {
    log(`⚠️ ${golem.name} cannot handle the danger at ${zone.name}!`, "warn");
    return;
  }

  const speed = def.speed * G.golemSpeedMult;
  golem.state     = "traveling";
  golem.zoneId    = zoneId;
  golem.tripPhase = "out";
  golem.tripStart = Date.now();
  golem.tripEnd   = Date.now() + speed * 1000;
  golem.collected = {};

  log(`🚶 ${golem.name} → ${zone.name}`, "info");
  renderGolems();
  renderMap(zoneId);
}

function recallGolem(golemId) {
  const golem = G.golems.find(g => g.id === golemId);
  if (!golem || golem.state === "idle") return;
  golem.state     = "idle";
  golem.zoneId    = null;
  golem.tripStart = null;
  golem.tripEnd   = null;
  golem.collected = {};
  log(`🔔 ${golem.name} recalled to workshop.`, "warn");
  renderGolems();
}

function destroyGolem(golemId) {
  const idx = G.golems.findIndex(g => g.id === golemId);
  if (idx === -1) return;
  const golem = G.golems[idx];
  // refund 50% clay/iron
  const def = GOLEM_TYPES[golem.typeId];
  const refund = {};
  for (const [r, a] of Object.entries(def.cost)) {
    refund[r] = Math.floor(a * 0.5);
  }
  gain(refund);
  G.golems.splice(idx, 1);
  log(`💀 ${golem.name} dismantled. 50% materials refunded.`, "warn");
  renderGolems();
  renderResources();
}

function tickGolems(now) {
  for (const golem of G.golems) {
    if (golem.state === "idle") continue;

    const def  = GOLEM_TYPES[golem.typeId];
    const zone = ZONES.find(z => z.id === golem.zoneId);
    const speed = def.speed * G.golemSpeedMult;

    if (golem.state === "traveling" && golem.tripPhase === "out") {
      if (now >= golem.tripEnd) {
        // arrived at zone — gather
        golem.state     = "gathering";
        golem.tripStart = now;
        golem.tripEnd   = now + 2000; // 2s gathering animation
        log(`⛏️  ${golem.name} arrived at ${zone.name}.`, "info");
      }
    } else if (golem.state === "gathering") {
      if (now >= golem.tripEnd) {
        // gather resources
        const capacity = def.capacity + G.golemBonusCapacity;
        golem.collected = {};
        let remaining = capacity;
        const yields = [...zone.yields];
        while (remaining > 0 && yields.length > 0) {
          const res = randomFrom(yields);
          const amt = Math.min(remaining, Math.ceil(Math.random() * 3) + 1);
          golem.collected[res] = (golem.collected[res] || 0) + amt;
          remaining -= amt;
        }
        golem.state     = "traveling";
        golem.tripPhase = "back";
        golem.tripStart = now;
        golem.tripEnd   = now + speed * 1000;
        log(`📦 ${golem.name} gathered resources, heading back...`, "info");
      }
    } else if (golem.state === "traveling" && golem.tripPhase === "back") {
      if (now >= golem.tripEnd) {
        // deliver resources
        let summary = [];
        for (const [res, amt] of Object.entries(golem.collected)) {
          G.resources[res] = (G.resources[res] || 0) + amt;
          summary.push(`${amt}x ${RESOURCES[res].icon}${RESOURCES[res].name}`);
        }
        log(`✅ ${golem.name} returned: ${summary.join(", ")}`, "good");
        golem.state     = "idle";
        golem.zoneId    = null;
        golem.tripPhase = null;
        golem.collected = {};
        renderResources();
      }
    }
  }
}

// ─────────────────────────────────────────────────────
// ALCHEMY LOGIC
// ─────────────────────────────────────────────────────

function startAlchemy(recipeId) {
  const recipe = ALCHEMY_RECIPES.find(r => r.id === recipeId);
  if (!recipe || !recipe.unlocked) return;
  if (G.alchemyQueue.length >= 3) {
    log("Alchemy queue is full (max 3).", "warn");
    return;
  }
  if (!canAfford(recipe.ingredients)) {
    log(`Not enough ingredients for ${recipe.name}.`, "warn");
    return;
  }
  spend(recipe.ingredients);
  const duration = recipe.time * G.alchemySpeedMult * 1000;
  const now = Date.now();
  G.alchemyQueue.push({
    recipeId,
    startTime: now,
    endTime: now + duration,
  });
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
        const mult = res === "essence" ? (G.essenceMult || 1) : 1;
        rewards[res] = Math.floor(amt * mult);
      }
      gain(rewards);
      const summary = Object.entries(rewards).map(([r, a]) => `${a}x ${RESOURCES[r].icon}`).join(" ");
      log(`🌟 ${recipe.name} complete! +${summary}`, "great");
      changed = true;
      return false;
    }
    return true;
  });
  if (changed) {
    renderResources();
    renderAlchemy();
  }
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
  // unlock recipes
  ALCHEMY_RECIPES.forEach(r => {
    if (r.requiresLevel !== undefined && r.requiresLevel <= G.workshopLevel) r.unlocked = true;
  });
  log(`🏗️  Workshop upgraded to ${next.name}!`, "great");
  renderAll();
}

function buyUpgrade(upgradeId) {
  const upg = UPGRADES.find(u => u.id === upgradeId);
  if (!upg || upg.purchased) return;
  if (upg.requiresLevel > G.workshopLevel) {
    log(`Requires Workshop Level ${upg.requiresLevel}.`, "warn");
    return;
  }
  if (!canAfford(upg.cost)) {
    log(`Not enough resources for ${upg.name}.`, "warn");
    return;
  }
  spend(upg.cost);
  upg.purchased = true;
  upg.effect();
  log(`🔧 Upgrade purchased: ${upg.name}!`, "great");
  renderUpgrades();
  renderResources();
}

// ─────────────────────────────────────────────────────
// RENDER FUNCTIONS
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

  el.innerHTML = `<div style="color:var(--text-dim);font-size:11px;margin-bottom:6px;">
    Golem slots: ${G.golems.length}/${maxGolems}
  </div>` + Object.entries(GOLEM_TYPES).map(([typeId, def]) => {
    const locked = G.workshopLevel < def.unlock;
    const costStr = Object.entries(def.cost)
      .map(([r, a]) => `${Math.ceil(a * G.craftCostMult)}x ${RESOURCES[r].icon}`)
      .join(" ");
    const affordable = canAfford(def.cost, G.craftCostMult) && slots > 0 && !locked;
    return `<button class="btn ${locked ? "" : "btn-amber"}"
        onclick="craftGolem('${typeId}')"
        ${(!affordable || locked) ? "disabled" : ""}>
      ${locked ? "🔒" : def.ascii.split("\n")[0]} ${def.name}
      ${locked ? `<span style="color:var(--red)"> [Lvl ${def.unlock} required]</span>` : ""}
      <div class="btn-cost">${costStr}</div>
    </button>`;
  }).join("");
}

function renderGolems() {
  const el = document.getElementById("golems-list");
  if (!el) return;

  if (G.golems.length === 0) {
    el.innerHTML = `<div style="color:var(--text-dim);font-size:12px;padding:8px;">
      No golems yet. Craft one in the Workshop!
    </div>`;
    return;
  }

  const now = Date.now();
  el.innerHTML = G.golems.map(golem => {
    const def  = GOLEM_TYPES[golem.typeId];
    const zone = ZONES.find(z => z.id === golem.zoneId);
    const isIdle = golem.state === "idle";

    let progress = 0;
    let statusText = "Idle — awaiting orders";
    if (!isIdle && golem.tripStart && golem.tripEnd) {
      progress = Math.min(100, ((now - golem.tripStart) / (golem.tripEnd - golem.tripStart)) * 100);
      if (golem.state === "traveling" && golem.tripPhase === "out")
        statusText = `→ Traveling to ${zone?.name}... ${Math.floor(progress)}%`;
      else if (golem.state === "gathering")
        statusText = `⛏️  Gathering at ${zone?.name}... ${Math.floor(progress)}%`;
      else if (golem.state === "traveling" && golem.tripPhase === "back")
        statusText = `← Returning from ${zone?.name}... ${Math.floor(progress)}%`;
    }

    const zoneButtons = ZONES.map(z => {
      const canGo = def.danger_resist >= z.danger;
      return `<button class="btn-sm" onclick="sendGolem(${golem.id},'${z.id}')"
        ${(!isIdle || !canGo) ? "disabled" : ""}
        title="${canGo ? z.name : "Too dangerous!"}">
        ${z.icon}${canGo ? "" : "🚫"}
      </button>`;
    }).join("");

    return `<div class="golem-card ${isIdle ? "idle" : "busy"}">
      <div class="golem-header">
        <span class="golem-name">${golem.name}</span>
        <span class="golem-type">Tier ${def.tier}</span>
      </div>
      <pre class="golem-ascii">${def.ascii}</pre>
      <div class="golem-status">${statusText}</div>
      <div class="golem-progress-bar">
        <div class="golem-progress-fill" style="width:${progress}%"></div>
      </div>
      <div class="golem-actions">
        ${zoneButtons}
        <button class="btn-sm" onclick="recallGolem(${golem.id})" ${isIdle ? "disabled" : ""}>↩️</button>
        <button class="btn-sm" onclick="destroyGolem(${golem.id})" style="color:var(--red)">💀</button>
      </div>
    </div>`;
  }).join("");
}

function renderAlchemy() {
  const el = document.getElementById("alchemy-display");
  if (!el) return;

  const now = Date.now();
  let html = "";

  // Active queue
  if (G.alchemyQueue.length > 0) {
    html += `<div style="margin-bottom:8px;color:var(--text-dim);font-size:11px;">Active (${G.alchemyQueue.length}/3):</div>`;
    html += G.alchemyQueue.map(job => {
      const recipe = ALCHEMY_RECIPES.find(r => r.id === job.recipeId);
      const pct = Math.min(100, ((now - job.startTime) / (job.endTime - job.startTime)) * 100);
      const remaining = Math.max(0, Math.ceil((job.endTime - now) / 1000));
      return `<div style="margin-bottom:6px;">
        <div style="font-size:11px;color:var(--purple);">${recipe.icon} ${recipe.name} — ${remaining}s</div>
        <div class="golem-progress-bar">
          <div class="golem-progress-fill" style="width:${pct}%;background:var(--purple);"></div>
        </div>
      </div>`;
    }).join("");
  }

  // Recipe list
  html += `<div style="margin-top:6px;">`;
  html += ALCHEMY_RECIPES.map(recipe => {
    if (!recipe.unlocked) {
      return `<div class="recipe-row">
        <span style="color:var(--text-dim)">🔒 ${recipe.name}</span>
        <span class="recipe-cost">Lvl ${recipe.requiresLevel}</span>
      </div>`;
    }
    const costStr = Object.entries(recipe.ingredients)
      .map(([r, a]) => `${a}${RESOURCES[r].icon}`).join(" ");
    const prodStr = Object.entries(recipe.produces)
      .map(([r, a]) => `+${a}${RESOURCES[r].icon}`).join(" ");
    const affordable = canAfford(recipe.ingredients) && G.alchemyQueue.length < 3;
    return `<div class="recipe-row">
      <span class="recipe-name">${recipe.icon} ${recipe.name}</span>
      <span class="recipe-cost">${costStr} → ${prodStr}</span>
      <button class="btn-sm" onclick="startAlchemy('${recipe.id}')" ${affordable ? "" : "disabled"}
        style="flex:0;padding:2px 6px;margin-left:4px;">Brew</button>
    </div>`;
  }).join("");
  html += `</div>`;

  el.innerHTML = html;
}

function renderUpgrades() {
  const el = document.getElementById("upgrades-display");
  if (!el) return;

  // Workshop upgrade button
  const nextLevel = WORKSHOP_LEVELS[G.workshopLevel + 1];
  let workshopHtml = "";
  if (nextLevel) {
    const costStr = Object.entries(nextLevel.cost)
      .map(([r, a]) => `${a}x ${RESOURCES[r].icon}`).join(" ");
    const affordable = canAfford(nextLevel.cost);
    workshopHtml = `<button class="btn btn-amber" onclick="upgradeWorkshop()" ${affordable ? "" : "disabled"}>
      🏗️ Upgrade Workshop → ${nextLevel.name}
      <div class="btn-cost">${costStr}</div>
    </button>`;
  } else {
    workshopHtml = `<div style="color:var(--green-dim);font-size:11px;">Workshop at MAX level!</div>`;
  }

  const upgradesHtml = UPGRADES.map(upg => {
    const locked = upg.requiresLevel > G.workshopLevel;
    const affordable = canAfford(upg.cost) && !upg.purchased && !locked;
    const costStr = Object.entries(upg.cost)
      .map(([r, a]) => `${a}x ${RESOURCES[r].icon}`).join(" ");
    return `<div class="upgrade-card ${upg.purchased ? "purchased" : ""}">
      <div class="upgrade-name">${upg.purchased ? "✅" : "🔧"} ${upg.name}</div>
      <div class="upgrade-desc">${upg.desc}</div>
      ${!upg.purchased ? `<button class="btn" style="margin-top:4px;"
        onclick="buyUpgrade('${upg.id}')"
        ${affordable ? "" : "disabled"}>
        ${locked ? `🔒 Lvl ${upg.requiresLevel}` : `Buy — ${costStr}`}
      </button>` : ""}
    </div>`;
  }).join("");

  el.innerHTML = workshopHtml + upgradesHtml;
}

function renderMap(zoneId) {
  const el = document.getElementById("ascii-map");
  if (!el) return;
  const key = zoneId || "workshop";
  const map = ASCII_MAPS[key] || ASCII_MAPS.workshop;

  // Color active golems on map
  let colored = map;
  const activeInZone = G.golems.filter(g => g.zoneId === zoneId && g.state !== "idle");
  if (activeInZone.length > 0) {
    colored += `\n<span style="color:var(--amber)">  [${activeInZone.length} golem(s) active here]</span>`;
  }
  el.innerHTML = colored;
}

function renderLog() {
  const el = document.getElementById("event-log");
  if (!el) return;
  el.innerHTML = G.eventLog.slice(0, 50).map(e => {
    const cls = e.type === "good" ? "log-good"
              : e.type === "warn" ? "log-warn"
              : e.type === "great" ? "log-great"
              : "log-info";
    return `<div class="log-entry">
      <span class="log-time">[${e.t}]</span>
      <span class="${cls}">${e.msg}</span>
    </div>`;
  }).join("");
}

function renderFooter() {
  const el = document.getElementById("footer-time");
  const ep = document.getElementById("footer-prestige");
  if (el) {
    const wl = WORKSHOP_LEVELS[G.workshopLevel];
    el.textContent = `Workshop: ${wl.name} (Lvl ${G.workshopLevel}) | Golems: ${G.golems.length}/${wl.maxGolems} | Time: ${fmtTime(G.totalTime)}`;
  }
  if (ep) {
    ep.textContent = G.prestigeCount > 0 ? `✨ Prestige x${G.prestigeCount}` : "";
  }
}

function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}h ${m}m ${sec}s`;
}

function renderAll() {
  renderResources();
  renderRecipes();
  renderGolems();
  renderAlchemy();
  renderUpgrades();
  renderMap(null);
  renderFooter();
}

// ─────────────────────────────────────────────────────
// SAVE / LOAD
// ─────────────────────────────────────────────────────

function saveGame() {
  try {
    const save = {
      resources: G.resources,
      golems: G.golems,
      nextGolemId: G.nextGolemId,
      workshopLevel: G.workshopLevel,
      alchemyQueue: G.alchemyQueue,
      alchemySpeedMult: G.alchemySpeedMult,
      golemSpeedMult: G.golemSpeedMult,
      golemBonusCapacity: G.golemBonusCapacity,
      essenceMult: G.essenceMult,
      craftCostMult: G.craftCostMult,
      lunarAttunement: G.lunarAttunement,
      totalTime: G.totalTime,
      prestigeCount: G.prestigeCount,
      upgrades: UPGRADES.map(u => ({ id: u.id, purchased: u.purchased })),
      recipes: ALCHEMY_RECIPES.map(r => ({ id: r.id, unlocked: r.unlocked })),
      savedAt: Date.now(),
    };
    localStorage.setItem("alch_auto_save", JSON.stringify(save));
  } catch(e) { /* ignore */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem("alch_auto_save");
    if (!raw) return;
    const save = JSON.parse(raw);

    Object.assign(G.resources, save.resources || {});
    G.golems           = save.golems || [];
    G.nextGolemId      = save.nextGolemId || 1;
    G.workshopLevel    = save.workshopLevel || 0;
    G.alchemyQueue     = save.alchemyQueue || [];
    G.alchemySpeedMult = save.alchemySpeedMult || 1;
    G.golemSpeedMult   = save.golemSpeedMult || 1;
    G.golemBonusCapacity = save.golemBonusCapacity || 0;
    G.essenceMult      = save.essenceMult || 1;
    G.craftCostMult    = save.craftCostMult || 1;
    G.lunarAttunement  = save.lunarAttunement || false;
    G.totalTime        = save.totalTime || 0;
    G.prestigeCount    = save.prestigeCount || 0;

    // Restore upgrades
    if (save.upgrades) {
      save.upgrades.forEach(su => {
        const upg = UPGRADES.find(u => u.id === su.id);
        if (upg && su.purchased && !upg.purchased) {
          upg.purchased = true;
          upg.effect();
        }
      });
    }

    // Restore recipes
    if (save.recipes) {
      save.recipes.forEach(sr => {
        const rec = ALCHEMY_RECIPES.find(r => r.id === sr.id);
        if (rec) rec.unlocked = sr.unlocked;
      });
    }

    // Offline progress
    const elapsed = Math.floor((Date.now() - (save.savedAt || Date.now())) / 1000);
    if (elapsed > 5) {
      log(`⏰ Welcome back! You were away for ${fmtTime(elapsed)}.`, "great");
      // Simulate offline golem trips (simplified)
      G.golems.forEach(golem => {
        if (golem.state !== "idle" && golem.zoneId) {
          const def  = GOLEM_TYPES[golem.typeId];
          const zone = ZONES.find(z => z.id === golem.zoneId);
          const tripTime = def.speed * G.golemSpeedMult;
          const trips = Math.floor(elapsed / (tripTime * 2 + 2));
          if (trips > 0 && zone) {
            const capacity = def.capacity + G.golemBonusCapacity;
            for (let t = 0; t < trips; t++) {
              let remaining = capacity;
              const yields = [...zone.yields];
              while (remaining > 0) {
                const res = randomFrom(yields);
                const amt = Math.min(remaining, Math.ceil(Math.random() * 3) + 1);
                G.resources[res] = (G.resources[res] || 0) + amt;
                remaining -= amt;
              }
            }
            log(`📦 ${golem.name} made ${trips} trips while you were away!`, "good");
          }
          golem.state = "idle";
          golem.zoneId = null;
          golem.tripPhase = null;
        }
      });
    }

    log("💾 Game loaded.", "info");
  } catch(e) {
    log("⚠️ Could not load save.", "warn");
  }
}

// ─────────────────────────────────────────────────────
// MAIN GAME LOOP
// ─────────────────────────────────────────────────────

let lastTick = Date.now();
let renderCounter = 0;

function gameLoop() {
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = now;

  G.totalTime += delta / 1000;

  tickGolems(now);
  tickAlchemy(now);

  renderCounter++;
  if (renderCounter % 3 === 0) {  // render every ~150ms
    renderGolems();
    renderAlchemy();
    renderFooter();
  }

  // Auto-save every 30s
  if (Math.floor(G.totalTime) % 30 === 0 && Math.floor(G.totalTime) > 0) {
    saveGame();
  }

  requestAnimationFrame(gameLoop);
}

// ─────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────

function init() {
  loadGame();
  renderAll();
  log("🧪 Welcome, Alchemist! Craft your first Golem to begin.", "great");
  log("💡 Tip: Send golems to zones to gather resources automatically.", "info");
  log("💡 Tip: Use the Alchemy Lab to brew potions and earn Gold.", "info");
  requestAnimationFrame(gameLoop);
}

window.addEventListener("DOMContentLoaded", init);

// Expose functions to global scope for onclick handlers
window.craftGolem    = craftGolem;
window.sendGolem     = sendGolem;
window.recallGolem   = recallGolem;
window.destroyGolem  = destroyGolem;
window.startAlchemy  = startAlchemy;
window.upgradeWorkshop = upgradeWorkshop;
window.buyUpgrade    = buyUpgrade;
