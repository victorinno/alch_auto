/* =====================================================
   ALCHEMIST'S AUTOMATONS — Game Logic
   Idle / Automation RPG — Event-driven rendering
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
  { id: "forest",  name: "Whispering Forest", icon: "🌲", ascii: "forest",  yields: ["herbs","crystals"],      danger: 0 },
  { id: "mine",    name: "Iron Depths",        icon: "⛏️",  ascii: "mine",   yields: ["iron","crystals"],       danger: 1 },
  { id: "swamp",   name: "Sulfur Swamp",       icon: "🌫️",  ascii: "swamp",  yields: ["sulfur","herbs"],        danger: 1 },
  { id: "ruins",   name: "Ancient Ruins",      icon: "🏛️",  ascii: "ruins",  yields: ["moonstone","essence"],   danger: 2 },
  { id: "volcano", name: "Ember Volcano",      icon: "🌋",  ascii: "volcano",yields: ["sulfur","moonstone"],    danger: 3 },
];

const GOLEM_TYPES = {
  clay:    { name: "Clay Golem",    tier: 1, ascii: " (o_o) \n [___] \n  | | ", speed: 8,  capacity: 3,  danger_resist: 0, cost: { clay: 5, essence: 2 },                       unlock: 0 },
  iron:    { name: "Iron Golem",    tier: 2, ascii: " [O.O] \n |[_]| \n  | | ", speed: 6,  capacity: 6,  danger_resist: 1, cost: { iron: 8, essence: 5, crystals: 3 },           unlock: 1 },
  crystal: { name: "Crystal Golem", tier: 3, ascii: " <*.*> \n |<_>| \n  | | ", speed: 4,  capacity: 10, danger_resist: 2, cost: { crystals: 12, moonstone: 4, essence: 10 },    unlock: 2 },
  moon:    { name: "Moon Golem",    tier: 4, ascii: " (^v^) \n {___} \n  | | ", speed: 3,  capacity: 15, danger_resist: 3, cost: { moonstone: 10, essence: 20, crystals: 8 },    unlock: 3 },
};

const ALCHEMY_RECIPES = [
  { id: "healing_potion",    name: "Healing Potion",    icon: "🧪", ingredients: { herbs: 3, crystals: 1 },                   produces: { gold: 15 },           time: 5,  unlocked: true,  requiresLevel: 0 },
  { id: "mana_elixir",       name: "Mana Elixir",       icon: "💜", ingredients: { crystals: 3, moonstone: 1 },               produces: { gold: 30, essence: 2 },time: 8,  unlocked: true,  requiresLevel: 0 },
  { id: "golem_oil",         name: "Golem Oil",         icon: "⚗️", ingredients: { herbs: 2, sulfur: 2, iron: 1 },            produces: { essence: 5 },         time: 10, unlocked: true,  requiresLevel: 0 },
  { id: "philosophers_draft",name: "Philosopher's Draft",icon:"🌟", ingredients: { moonstone: 3, essence: 5, sulfur: 2 },     produces: { gold: 100, essence: 10},time: 20, unlocked: false, requiresLevel: 2 },
  { id: "soul_crystal",      name: "Soul Crystal",      icon: "🔮", ingredients: { crystals: 8, moonstone: 5, essence: 15 },  produces: { essence: 30, gold: 50},time: 30, unlocked: false, requiresLevel: 3 },
];

const UPGRADES = [
  { id: "better_furnace",   name: "Better Furnace",    desc: "Alchemy recipes complete 25% faster.",          cost: { gold: 50, iron: 5 },                        effect: () => { G.alchemySpeedMult *= 0.75; },      purchased: false, requiresLevel: 0 },
  { id: "golem_beacon",     name: "Golem Beacon",      desc: "All golems gather +1 extra resource per trip.", cost: { gold: 80, crystals: 5, essence: 5 },         effect: () => { G.golemBonusCapacity += 1; },       purchased: false, requiresLevel: 1 },
  { id: "arcane_compass",   name: "Arcane Compass",    desc: "Golems travel 20% faster.",                     cost: { gold: 120, moonstone: 3, essence: 10 },      effect: () => { G.golemSpeedMult *= 0.80; },        purchased: false, requiresLevel: 1 },
  { id: "essence_condenser",name: "Essence Condenser", desc: "Alchemy produces +50% more essence.",           cost: { gold: 200, crystals: 10, moonstone: 5 },     effect: () => { G.essenceMult = (G.essenceMult||1)*1.5; }, purchased: false, requiresLevel: 2 },
  { id: "master_blueprint", name: "Master Blueprint",  desc: "Golem crafting costs reduced by 25%.",          cost: { gold: 300, essence: 20, moonstone: 8 },      effect: () => { G.craftCostMult *= 0.75; },         purchased: false, requiresLevel: 2 },
  { id: "lunar_attunement", name: "Lunar Attunement",  desc: "Moon Golems gather from all zones simultaneously.", cost: { gold: 500, moonstone: 15, essence: 30 }, effect: () => { G.lunarAttunement = true; },        purchased: false, requiresLevel: 3 },
];

const WORKSHOP_LEVELS = [
  { level: 0, name: "Novice Lab",     maxGolems: 2,  cost: null },
  { level: 1, name: "Journeyman Lab", maxGolems: 4,  cost: { gold: 100, iron: 10 } },
  { level: 2, name: "Adept Lab",      maxGolems: 6,  cost: { gold: 250, crystals: 8, essence: 10 } },
  { level: 3, name: "Master Lab",     maxGolems: 10, cost: { gold: 600, moonstone: 6, essence: 25 } },
];

const ASCII_MAPS = {
  workshop: `+------------------------------------------+\n|  WORKSHOP                                |\n|                                          |\n|   [Furnace]    [Workbench]   [Shelf]     |\n|    (===)         |___|        |||        |\n|    |___|         |___|       [===]       |\n|                                          |\n|   [Golem Dock]                           |\n|    ___   ___   ___   ___                 |\n|   |   | |   | |   | |   |               |\n|   |___|  ---  |___|  ---                |\n|                                          |\n+------------------------------------------+`,
  forest:   `+------------------------------------------+\n|  WHISPERING FOREST                       |\n|                                          |\n|  /\\  /\\  /\\  /\\  /\\  /\\  /\\  /\\        |\n| /  \\/  \\/  \\/  \\/  \\/  \\/  \\/  \\       |\n|  ||||  ||||  ||||  ||||  ||||  ||||      |\n|  ||||  ||||  ||||  ||||  ||||  ||||      |\n|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~   |\n|  * herbs * crystals * mushrooms *       |\n|                                          |\n+------------------------------------------+`,
  mine:     `+------------------------------------------+\n|  IRON DEPTHS                             |\n|                                          |\n|  ####################################   |\n|  #  [===]  [===]  [===]  [===]      #   |\n|  #   |||    |||    |||    |||        #   |\n|  ####################################   |\n|  #  * iron * crystals * stone *     #   |\n|  ####################################   |\n|                                          |\n+------------------------------------------+`,
  swamp:    `+------------------------------------------+\n|  SULFUR SWAMP                            |\n|                                          |\n|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     |\n|  ~ ))) ~ ))) ~ ))) ~ ))) ~ ))) ~        |\n|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     |\n|  ~ * sulfur * herbs * bog water * ~     |\n|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     |\n|                                          |\n+------------------------------------------+`,
  ruins:    `+------------------------------------------+\n|  ANCIENT RUINS                           |\n|                                          |\n|  _   _   _   _   _   _   _   _          |\n| | | | | | | | | | | | | | | | |         |\n| |_| |_| |_| |_| |_| |_| |_| |_|        |\n|  * moonstone * essence * relics *       |\n|                                          |\n+------------------------------------------+`,
  volcano:  `+------------------------------------------+\n|  EMBER VOLCANO                           |\n|                                          |\n|        /\\                               |\n|       /  \\                              |\n|      / ** \\   * DANGER ZONE *           |\n|     /______\\                            |\n|    * sulfur * moonstone * magma *       |\n|                                          |\n+------------------------------------------+`,
};

// ─────────────────────────────────────────────────────
// GAME STATE
// ─────────────────────────────────────────────────────

const G = {
  resources: { gold: 10, essence: 5, herbs: 0, crystals: 0, iron: 0, moonstone: 0, sulfur: 0, clay: 10 },
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
  const golem = { id: G.nextGolemId++, typeId, name: `${def.name} #${G.nextGolemId-1}`, state:"idle", zoneId:null, tripStart:null, tripEnd:null, tripPhase:null, collected:{} };
  G.golems.push(golem);
  log(`✨ Crafted ${golem.name}!`, "great");
  addGolemCard(golem);
  renderRecipes();
  renderResources();
  renderFooter();
}

function sendGolem(golemId, zoneId) {
  const golem = G.golems.find(g => g.id == golemId);
  const zone  = ZONES.find(z => z.id === zoneId);
  if (!golem || !zone || golem.state !== "idle") return;
  const def = GOLEM_TYPES[golem.typeId];
  if (zone.danger > def.danger_resist) { log(`⚠️ ${golem.name} cannot handle ${zone.name}!`, "warn"); return; }
  const speed = def.speed * G.golemSpeedMult;
  golem.state = "traveling"; golem.zoneId = zoneId; golem.tripPhase = "out";
  golem.tripStart = Date.now(); golem.tripEnd = Date.now() + speed*1000; golem.collected = {};
  log(`🚶 ${golem.name} → ${zone.name}`, "info");
  updateGolemCardState(golem);
  renderMap(zoneId);
}

function recallGolem(golemId) {
  const golem = G.golems.find(g => g.id == golemId);
  if (!golem || golem.state === "idle") return;
  golem.state = "idle"; golem.zoneId = null; golem.tripStart = null; golem.tripEnd = null; golem.collected = {};
  log(`🔔 ${golem.name} recalled.`, "warn");
  updateGolemCardState(golem);
  renderMap(null);
}

function destroyGolem(golemId) {
  const idx = G.golems.findIndex(g => g.id == golemId);
  if (idx === -1) return;
  const golem = G.golems[idx];
  const def = GOLEM_TYPES[golem.typeId];
  const refund = {};
  for (const [r,a] of Object.entries(def.cost)) refund[r] = Math.floor(a*0.5);
  gain(refund);
  G.golems.splice(idx, 1);
  const card = document.getElementById(`golem-card-${golemId}`);
  if (card) card.remove();
  const el = document.getElementById("golems-list");
  if (el && G.golems.length === 0) el.innerHTML = `<div style="color:var(--text-dim);font-size:12px;padding:8px;">No golems yet. Craft one in the Workshop!</div>`;
  log(`💀 ${golem.name} dismantled. 50% materials refunded.`, "warn");
  renderResources();
  renderRecipes();
  renderFooter();
}

function tickGolems(now) {
  let stateChanged = false;
  for (const golem of G.golems) {
    if (golem.state === "idle") continue;
    const def  = GOLEM_TYPES[golem.typeId];
    const zone = ZONES.find(z => z.id === golem.zoneId);
    const speed = def.speed * G.golemSpeedMult;

    if (golem.state === "traveling" && golem.tripPhase === "out" && now >= golem.tripEnd) {
      golem.state = "gathering"; golem.tripStart = now; golem.tripEnd = now + 2000;
      log(`⛏️  ${golem.name} arrived at ${zone.name}.`, "info");
      updateGolemCardState(golem); stateChanged = true;

    } else if (golem.state === "gathering" && now >= golem.tripEnd) {
      const capacity = def.capacity + G.golemBonusCapacity;
      golem.collected = {};
      let remaining = capacity;
      const yields = [...zone.yields];
      while (remaining > 0 && yields.length > 0) {
        const res = randomFrom(yields);
        const amt = Math.min(remaining, Math.ceil(Math.random()*3)+1);
        golem.collected[res] = (golem.collected[res]||0) + amt;
        remaining -= amt;
      }
      golem.state = "traveling"; golem.tripPhase = "back"; golem.tripStart = now; golem.tripEnd = now + speed*1000;
      log(`📦 ${golem.name} gathered, heading back...`, "info");
      updateGolemCardState(golem); stateChanged = true;

    } else if (golem.state === "traveling" && golem.tripPhase === "back" && now >= golem.tripEnd) {
      let summary = [];
      for (const [res, amt] of Object.entries(golem.collected)) {
        G.resources[res] = (G.resources[res]||0) + amt;
        summary.push(`${amt}x ${RESOURCES[res].icon}`);
      }
      log(`✅ ${golem.name} returned: ${summary.join(" ")}`, "good");
      golem.state = "idle"; golem.zoneId = null; golem.tripPhase = null; golem.collected = {};
      updateGolemCardState(golem);
      renderResources(); renderRecipes(); stateChanged = true;
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
        rewards[res] = Math.floor(amt*mult);
      }
      gain(rewards);
      const summary = Object.entries(rewards).map(([r,a])=>`${a}x ${RESOURCES[r].icon}`).join(" ");
      log(`🌟 ${recipe.name} complete! +${summary}`, "great");
      changed = true;
      return false;
    }
    return true;
  });
  if (changed) { renderResources(); renderAlchemy(); }
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
}

// ─────────────────────────────────────────────────────
// RENDER — STATIC RENDERS (called on state change)
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
  el.innerHTML = `<div style="color:var(--text-dim);font-size:11px;margin-bottom:6px;">Golem slots: ${G.golems.length}/${maxGolems}</div>`
    + Object.entries(GOLEM_TYPES).map(([typeId, def]) => {
      const locked = G.workshopLevel < def.unlock;
      const costStr = Object.entries(def.cost).map(([r,a])=>`${Math.ceil(a*G.craftCostMult)}x ${RESOURCES[r].icon}`).join(" ");
      const affordable = canAfford(def.cost, G.craftCostMult) && slots > 0 && !locked;
      return `<button class="btn ${locked?'':'btn-amber'}" data-action="craft" data-type="${typeId}" ${(!affordable||locked)?'disabled':''}>
        ${locked?"🔒":def.ascii.split("\n")[0]} ${def.name}
        ${locked?`<span style="color:var(--red)"> [Lvl ${def.unlock} required]</span>`:""}
        <div class="btn-cost">${costStr}</div>
      </button>`;
    }).join("");
}

// ─────────────────────────────────────────────────────
// GOLEM CARD — DOM-based, created once per golem
// ─────────────────────────────────────────────────────

function addGolemCard(golem) {
  const el = document.getElementById("golems-list");
  if (!el) return;

  // Remove "no golems" placeholder if present
  const placeholder = el.querySelector('[data-placeholder]');
  if (placeholder) placeholder.remove();

  const def = GOLEM_TYPES[golem.typeId];

  const div = document.createElement('div');
  div.id = `golem-card-${golem.id}`;
  div.className = 'golem-card idle';

  // Build zone buttons
  const zoneBtnsHtml = ZONES.map(z => {
    const canGo = def.danger_resist >= z.danger;
    return `<button class="btn zone-btn" id="zbtn-${golem.id}-${z.id}"
      data-action="send-zone" data-golem="${golem.id}" data-zone="${z.id}"
      ${!canGo ? 'disabled title="Too dangerous"' : ''}
      style="flex:1;min-width:0;font-size:11px;padding:3px 4px;${!canGo?'opacity:0.4;':''}"
      >${z.icon} ${z.name.split(' ')[0]}</button>`;
  }).join("");

  div.innerHTML = `
    <div class="golem-header">
      <span class="golem-name">${golem.name}</span>
      <span class="golem-type">Tier ${def.tier}</span>
    </div>
    <pre class="golem-ascii">${def.ascii}</pre>
    <div class="golem-status" id="gstatus-${golem.id}">Idle — awaiting orders</div>
    <div class="golem-progress-bar">
      <div class="golem-progress-fill" id="gprog-${golem.id}" style="width:0%"></div>
    </div>
    <div style="margin-top:6px;">
      <div style="color:var(--text-dim);font-size:10px;margin-bottom:3px;">SEND TO ZONE:</div>
      <div id="zone-btns-${golem.id}" style="display:flex;gap:3px;flex-wrap:wrap;">
        ${zoneBtnsHtml}
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <button class="btn" id="gbtn-recall-${golem.id}" disabled
        style="flex:1;font-size:11px;"
        data-action="recall" data-golem="${golem.id}">↩️ Recall</button>
      <button class="btn" style="flex:1;font-size:11px;color:var(--red);"
        data-action="destroy" data-golem="${golem.id}">💀 Destroy</button>
    </div>`;
  el.appendChild(div);
}

function updateGolemCardState(golem) {
  const card = document.getElementById(`golem-card-${golem.id}`);
  if (!card) return;
  const isIdle = golem.state === "idle";
  const def = GOLEM_TYPES[golem.typeId];
  card.className = `golem-card ${isIdle ? 'idle' : 'busy'}`;

  // Enable/disable zone buttons
  ZONES.forEach(z => {
    const zbtn = document.getElementById(`zbtn-${golem.id}-${z.id}`);
    if (zbtn) {
      const canGo = def.danger_resist >= z.danger;
      zbtn.disabled = !isIdle || !canGo;
    }
  });

  const recBtn = document.getElementById(`gbtn-recall-${golem.id}`);
  if (recBtn)  recBtn.disabled  = isIdle;

  // Reset status text immediately on state change
  const statusEl = document.getElementById(`gstatus-${golem.id}`);
  const zone = ZONES.find(z => z.id === golem.zoneId);
  if (statusEl) {
    if (isIdle) statusEl.textContent = "Idle — awaiting orders";
    else if (golem.state === "traveling" && golem.tripPhase === "out") statusEl.textContent = `→ Traveling to ${zone?.name}...`;
    else if (golem.state === "gathering") statusEl.textContent = `⛏️  Gathering at ${zone?.name}...`;
    else if (golem.state === "traveling" && golem.tripPhase === "back") statusEl.textContent = `← Returning from ${zone?.name}...`;
  }

  const progEl = document.getElementById(`gprog-${golem.id}`);
  if (progEl && isIdle) progEl.style.width = "0%";
}

// ─────────────────────────────────────────────────────
// RENDER — PROGRESS ONLY (called every frame from gameLoop)
// ─────────────────────────────────────────────────────

function tickProgressBars(now) {
  for (const golem of G.golems) {
    if (golem.state === "idle" || !golem.tripStart || !golem.tripEnd) continue;
    const pct = Math.min(100, ((now - golem.tripStart) / (golem.tripEnd - golem.tripStart)) * 100);
    const progEl = document.getElementById(`gprog-${golem.id}`);
    if (progEl) progEl.style.width = `${pct}%`;
    const statusEl = document.getElementById(`gstatus-${golem.id}`);
    const zone = ZONES.find(z => z.id === golem.zoneId);
    if (statusEl) {
      if (golem.state === "traveling" && golem.tripPhase === "out")
        statusEl.textContent = `→ Traveling to ${zone?.name}... ${Math.floor(pct)}%`;
      else if (golem.state === "gathering")
        statusEl.textContent = `⛏️  Gathering at ${zone?.name}... ${Math.floor(pct)}%`;
      else if (golem.state === "traveling" && golem.tripPhase === "back")
        statusEl.textContent = `← Returning from ${zone?.name}... ${Math.floor(pct)}%`;
    }
  }

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
// ALCHEMY RENDER
// ─────────────────────────────────────────────────────

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
    el.textContent = `Workshop: ${wl.name} (Lvl ${G.workshopLevel}) | Golems: ${G.golems.length}/${wl.maxGolems} | Time: ${fmtTime(G.totalTime)}`;
  }
}

function renderAll() {
  renderResources();
  renderRecipes();
  renderAlchemy();
  renderUpgrades();
  renderMap(null);
  renderFooter();

  // Rebuild golem cards from saved state
  const el = document.getElementById("golems-list");
  if (el) {
    el.innerHTML = "";
    if (G.golems.length === 0) {
      el.innerHTML = `<div data-placeholder style="color:var(--text-dim);font-size:12px;padding:8px;">No golems yet. Craft one in the Workshop!</div>`;
    } else {
      G.golems.forEach(golem => {
        addGolemCard(golem);
        updateGolemCardState(golem);
      });
    }
  }
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
    G.golems           = save.golems||[];
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
    const elapsed = Math.floor((Date.now() - (save.savedAt||Date.now())) / 1000);
    if (elapsed > 5) {
      log(`⏰ Welcome back! Away for ${fmtTime(elapsed)}.`, "great");
      G.golems.forEach(golem => {
        if (golem.state !== "idle" && golem.zoneId) {
          const def  = GOLEM_TYPES[golem.typeId];
          const zone = ZONES.find(z=>z.id===golem.zoneId);
          const tripTime = def.speed * G.golemSpeedMult;
          const trips = Math.floor(elapsed / (tripTime*2+2));
          if (trips > 0 && zone) {
            const capacity = def.capacity + G.golemBonusCapacity;
            for (let t=0; t<trips; t++) {
              let remaining = capacity;
              const yields = [...zone.yields];
              while (remaining > 0) { const res=randomFrom(yields); const amt=Math.min(remaining,Math.ceil(Math.random()*3)+1); G.resources[res]=(G.resources[res]||0)+amt; remaining-=amt; }
            }
            log(`📦 ${golem.name} made ${trips} trips while away!`, "good");
          }
          golem.state="idle"; golem.zoneId=null; golem.tripPhase=null;
        }
      });
    }
    log("💾 Game loaded.", "info");
  } catch(e) { log("⚠️ Could not load save.", "warn"); }
}

// ─────────────────────────────────────────────────────
// MAIN GAME LOOP — only ticks logic + updates progress bars
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

  // Update footer timer every second
  saveTimer += delta;
  if (saveTimer >= 1000) {
    renderFooter();
    saveTimer -= 1000;
  }

  // Auto-save every 30s
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

    if (action === 'send-zone') {
      sendGolem(Number(btn.dataset.golem), btn.dataset.zone);

    } else if (action === 'recall')          { recallGolem(Number(btn.dataset.golem));
    } else if (action === 'destroy')         { destroyGolem(Number(btn.dataset.golem));
    } else if (action === 'craft')           { craftGolem(btn.dataset.type);
    } else if (action === 'brew')            { startAlchemy(btn.dataset.recipe);
    } else if (action === 'upgrade-workshop'){ upgradeWorkshop();
    } else if (action === 'buy-upgrade')     { buyUpgrade(btn.dataset.upgrade);
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
  log("💡 Tip: Select a zone from the dropdown and click Send ▶ to dispatch a golem.", "info");
  log("💡 Tip: Use the Alchemy Lab to brew potions and earn Gold.", "info");
  requestAnimationFrame(gameLoop);
});
