/**
 * Parse blocks.xml to extract core player-facing trap blocks.
 * Supports Extends inheritance (trapSpikesWoodDmg0 extends trapSpikesWoodMaster).
 */

// Core traps with canonical ID -> Chinese name fallback
const CORE_TRAPS = {
  'electricfencepost': '电围栏柱',
  'dartTrap': '飞镖陷阱',
  'bladeTrap': '刀片陷阱',
  'flamethrowerTrap': '火焰喷射陷阱',
  'trapSpikesWoodDmg0': '木尖刺陷阱',
  'trapSpikesIronDmg0': '铁尖刺陷阱',
};

function parseBlockProps(content) {
  const props = {};
  const propRegex = /<property\s+name="([^"]+)"\s+value="([^"]*)"/g;
  let m;
  while ((m = propRegex.exec(content)) !== null) props[m[1]] = m[2];
  return props;
}

export function parseTrapBlocks(xmlText, locMap = new Map()) {
  // 1. Index ALL blocks for extends resolution
  const allBlocks = {};
  const blockRegex = /<block\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/block>/g;
  let match;
  while ((match = blockRegex.exec(xmlText)) !== null) {
    allBlocks[match[1]] = match[2];
  }

  // 2. Resolve core traps with inheritance
  const blocks = [];
  for (const [name, fallbackName] of Object.entries(CORE_TRAPS)) {
    const content = allBlocks[name];
    if (!content) continue;

    // Walk extends chain (depth-limited)
    const merged = {};
    const chain = [];
    let current = name;
    let depth = 0;
    while (current && allBlocks[current] && depth < 5) {
      chain.unshift(current);
      const props = parseBlockProps(allBlocks[current]);
      Object.assign(merged, props);
      current = props.Extends;
      depth++;
    }

    const block = {
      id: name,
      name: locMap.get(name)?.name || fallbackName || name,
      category: 'trap',
    };
    if (merged.MaxDamage) block.durability = parseInt(merged.MaxDamage);
    if (merged.Damage) block.damage = parseFloat(merged.Damage);
    if (merged.RequiredPower) block.power_usage = parseFloat(merged.RequiredPower);
    if (merged.TriggerRange) block.trigger_range = parseFloat(merged.TriggerRange);
    if (merged.AmmoItem) block.ammo = merged.AmmoItem;
    if (merged.EconomicValue) block.tier = parseInt(merged.EconomicValue);
    if (merged.DescriptionKey) block.description = locMap.get(merged.DescriptionKey)?.name || merged.DescriptionKey;
    if (merged.CustomIcon || merged.Icon) block.icon = merged.CustomIcon || merged.Icon;
    block.extends = chain.join(' <- ');

    // Damage from passive effects (final block content)
    const dmgRegex = /<passive_effect\s+name="EntityDamage"[^>]*value="([^"]+)"/g;
    let dm;
    while ((dm = dmgRegex.exec(content)) !== null) {
      block.damage = block.damage ?? parseFloat(dm[1]);
    }

    blocks.push(block);
  }
  return blocks;
}
