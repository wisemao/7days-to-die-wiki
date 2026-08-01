/**
 * Parse blocks.xml to extract player-facing defensive/electrical blocks.
 * Covers: core traps + all blocks with RequiredPower + spike traps.
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

// Extra defensive blocks beyond RequiredPower detection
const EXTRA_BLOCKS = {
  'trapSpikesWoodMaster': '木尖刺(基础)',
  'trapSpikesIronMaster': '铁尖刺(基础)',
  'electricwire': '电线',
  'electricwirerelay': '电线继电器',
  'switch': '开关',
  'pressureplate': '压力板',
  'pressureplateLong': '长压力板',
  'tripwirepost': '绊线柱',
  'motionsensor': '运动传感器',
  'electrictimerrelay': '定时继电器',
  'autoTurret': '自动炮塔',
  'shotgunTurret': '霰弹枪炮塔',
  'm60Turret': 'M60 炮塔',
};

// Ignore non-defensive powered blocks (lighting)
const IGNORE = /light|Light|speaker|Speaker/;

function parseBlockProps(content) {
  const props = {};
  const propRegex = /<property\s+name="([^"]+)"\s+value="([^"]*)"/g;
  let m;
  while ((m = propRegex.exec(content)) !== null) props[m[1]] = m[2];
  return props;
}

function resolveBlock(blocks, name, depth = 0) {
  if (depth > 6 || !blocks[name]) return {};
  const own = parseBlockProps(blocks[name]);
  const parent = resolveBlock(blocks, own.Extends, depth + 1);
  return { ...parent, ...own };
}

function extractDamage(xmlText) {
  const dmgRegex = /<passive_effect\s+name="EntityDamage"[^>]*value="([^"]+)"/g;
  let m, val;
  while ((m = dmgRegex.exec(xmlText)) !== null) val = parseFloat(m[1]);
  return val;
}

export function parseTrapBlocks(xmlText, locMap = new Map()) {
  // 1. Index ALL blocks
  const allBlocks = {};
  const blockRegex = /<block\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/block>/g;
  let match;
  while ((match = blockRegex.exec(xmlText)) !== null) {
    allBlocks[match[1]] = match[2];
  }

  // 2. Discover powered blocks (defensive electrical devices)
  const names = new Set(Object.keys(CORE_TRAPS));
  for (const [name, content] of Object.entries(allBlocks)) {
    if (IGNORE.test(name)) continue;
    if (/RequiredPower|TriggerRange|AmmoItem|AmmoMagazineSize/.test(content)) names.add(name);
  }
  for (const name of Object.keys(EXTRA_BLOCKS)) names.add(name);

  // 3. Resolve each block with inheritance
  const blocks = [];
  for (const name of names) {
    const content = allBlocks[name];
    if (!content) continue;
    const merged = resolveBlock(allBlocks, name);
    const fallbackName = CORE_TRAPS[name] || EXTRA_BLOCKS[name] || name;
    const block = {
      id: name,
      name: (locMap.get(name) && locMap.get(name).name) || fallbackName,
      category: 'trap',
    };
    if (merged.MaxDamage) block.durability = parseInt(merged.MaxDamage);
    if (merged.Damage) block.damage = parseFloat(merged.Damage);
    if (merged.RequiredPower) block.power_usage = parseFloat(merged.RequiredPower);
    if (merged.TriggerRange) block.trigger_range = parseFloat(merged.TriggerRange);
    if (merged.AmmoItem) block.ammo = merged.AmmoItem;
    if (merged.EconomicValue) block.tier = parseInt(merged.EconomicValue);
    if (merged.DescriptionKey) block.description = (locMap.get(merged.DescriptionKey) && locMap.get(merged.DescriptionKey).name) || merged.DescriptionKey;
    if (merged.CustomIcon || merged.Icon) block.icon = merged.CustomIcon || merged.Icon;
    const dmg = extractDamage(content);
    if (dmg != null && block.damage == null) block.damage = dmg;
    // Extends chain for display
    const chain = [];
    let cur = name, guard = 0;
    while (cur && allBlocks[cur] && guard++ < 6) {
      chain.unshift(cur);
      cur = parseBlockProps(allBlocks[cur]).Extends;
    }
    block.extends = chain.join(' <- ');
    blocks.push(block);
  }
  return blocks;
}
