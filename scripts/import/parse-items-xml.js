import { existsSync, readFileSync } from 'fs';

export function parseItemsXml(xmlText, locMap = new Map()) {
  const items = [];
  const itemRegex = /<item\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const [_, name, content] = match;
    const item = {
      id: name,
      name: locMap.get(name)?.name || name,
      category: 'material',
      stack_size: 1,
    };

    const propRegex = /<property\s+name="([^"]+)"\s+value="([^"]*)"\s*\/?>/g;
    let propMatch;
    while ((propMatch = propRegex.exec(content)) !== null) {
      const [_, propName, propValue] = propMatch;
      if (propName === 'Stacknumber') item.stack_size = parseInt(propValue) || 1;
      if (propName === 'EconomicValue' || propName === 'Tier') item.tier = parseInt(propValue) || 1;
    }

    let stats = {};
    const effectRegex = /<passive_effect\s+name="([^"]+)"[^>]*value="([^"]+)"/g;
    let effectMatch;
    while ((effectMatch = effectRegex.exec(content)) !== null) {
      const [_, effectName, effectValue] = effectMatch;
      const val = parseFloat(effectValue);
      if (effectName === 'EntityDamage') stats.damage = val;
      if (effectName === 'BlockDamage') stats.block_damage = val;
      if (effectName === 'MaxDurability' || effectName === 'DegradationMax') stats.durability = val;
      if (effectName === 'AttacksPerMinute') stats.attacks_per_min = val;
    }
    if (Object.keys(stats).length > 0) item.stats = stats;

    const tagsRegex = /<property\s+name="(Group|Tags)"\s+value="([^"]+)"/g;
    let tagsMatch;
    while ((tagsMatch = tagsRegex.exec(content)) !== null) {
      const tags = tagsMatch[2];
      if (tags.includes('food') || tags.includes('canFood')) item.category = 'food';
      else if (tags.includes('medical')) item.category = 'medical';
      else if (tags.includes('ammo')) item.category = 'ammo';
      else if (tags.includes('armor') || tags.includes('clothing')) item.category = 'armor';
      else if (tags.includes('tool')) item.category = 'tool';
      else if (tags.includes('weapon')) item.category = 'ranged_weapon';
      else if (tags.includes('melee')) item.category = 'melee_weapon';
      else if (tags.includes('mod')) item.category = 'mod';
      else if (tags.includes('resource') || tags.includes('material')) item.category = 'material';
      else if (tags.includes('vehicle')) item.category = 'vehicle';
      else if (tags.includes('trap')) item.category = 'trap';
    }

    items.push(item);
  }

  return items;
}
