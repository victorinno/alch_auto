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
