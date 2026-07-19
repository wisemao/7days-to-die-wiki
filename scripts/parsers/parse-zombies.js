import { renderTemplate } from './renderer.js';

const ZOMBIE_CATEGORY_LABELS = {
  humanoid: '人形', animal: '动物', special: '特殊',
};

export function parseZombie(zombie, refs, template, resolveItemName, sanitizeId = (id) => id) {
  const statsTable = [];
  statsTable.push({ key: '步行速度', value: zombie.speed?.walk });
  statsTable.push({ key: '奔跑速度', value: zombie.speed?.run });
  if (zombie.speed?.crawl) statsTable.push({ key: '爬行速度', value: zombie.speed.crawl });
  statsTable.push({ key: '近战伤害', value: zombie.damage?.melee });
  if (zombie.damage?.bleeding_chance) statsTable.push({ key: '出血概率', value: zombie.damage.bleeding_chance });
  if (zombie.damage?.armor_penetration) statsTable.push({ key: '护甲穿透', value: zombie.damage.armor_penetration });
  if (zombie.armor) {
    statsTable.push({ key: '护甲 (头部)', value: zombie.armor.head });
    statsTable.push({ key: '护甲 (身体)', value: zombie.armor.body });
  }
  statsTable.push({ key: '经验值', value: zombie.experience });

  const loot = zombie.loot?.map(l => ({
    item_id: l.item_id,
    itemLinkId: sanitizeId(l.item_id),
    itemName: resolveItemName(l.item_id),
    count: l.count,
    chance: l.chance,
  })) || [];

  const weakness = zombie.weakness?.map(w => {
    const entries = Object.entries(w);
    return entries.map(([k, v]) => `${k} ${v}x`);
  }).flat() || [];

  const data = {
    name: zombie.name,
    categoryLabel: ZOMBIE_CATEGORY_LABELS[zombie.category] || zombie.category,
    tier: zombie.tier,
    hp: zombie.hp,
    statsTable,
    loot: { rows: loot },
    weakness: weakness.length > 0 ? weakness : null,
    spawn: zombie.spawn ? {
      biomes: zombie.spawn.biomes?.join(', ') || '',
      time: zombie.spawn.time || '',
      groups: zombie.spawn.groups?.join(', ') || '',
    } : { biomes: '', time: '', groups: '' },
  };

  return renderTemplate(template, data);
}
