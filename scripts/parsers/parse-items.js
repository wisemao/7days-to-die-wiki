import { renderTemplate } from './renderer.js';

const ITEM_CATEGORY_LABELS = {
  tool: '工具', melee_weapon: '近战武器', ranged_weapon: '远程武器',
  armor: '护甲', food: '食物', medical: '医疗', material: '材料',
  ammo: '弹药', book: '书籍', vehicle: '载具', trap: '陷阱',
  accessory: '配件', consumable: '消耗品', quest_item: '任务物品',
};

export function parseItem(item, refs, template, resolveItemName, sanitizeId = (id) => id) {
  const statsTable = buildStatsTable(item);
  const categoryLabel = ITEM_CATEGORY_LABELS[item.category] || item.category;

  const usedRecipes = refs.itemRecipes.get(item.id) || [];
  const usedInRecipes = {
    rows: usedRecipes.map(r => ({ id: r.id, linkId: sanitizeId(r.id), name: r.name, station: r.station })),
  };

  const droppedZombies = refs.zombieLoot.get(item.id) || [];
  const droppedBy = droppedZombies.length > 0 ? {
    rows: droppedZombies.map(z => ({
      id: z.id,
      linkId: sanitizeId(z.id),
      name: z.name,
      chance: z.loot?.find(l => l.item_id === item.id)?.chance || '',
    })),
  } : null;

  const craftRecipes = (refs.itemCraftRecipes.get(item.id) || [])
    .filter(r => r.recipe && r.recipe.length > 0)
    .map(r => ({
      station: r.station || '',
      craft_time: r.craft_time || 0,
      craft_count: r.craft_count ?? 1,
      materials: r.recipe.map(m => ({
        item_id: m.item_id,
        itemName: resolveItemName(m.item_id),
        count: m.count,
        linkId: sanitizeId(m.item_id),
      })),
    }));

  const scrappableRows = item.scrappable_into?.map(s => ({
    item_id: s.item_id,
    itemName: resolveItemName(s.item_id),
    count: s.count,
  }));

  const data = {
    name: item.name,
    tier: item.tier,
    categoryLabel,
    stack_size: item.stack_size,
    description: item.description || '',
    statsTable,
    craftRecipes,
    lockBookName: item.recipes_locked_by?.book_id || '',
    scrappable: scrappableRows ? { rows: scrappableRows } : null,
    usedInRecipes: usedInRecipes.rows.length > 0 ? usedInRecipes : null,
    droppedBy,
  };

  return renderTemplate(template, data);
}

function buildStatsTable(item) {
  if (!item.stats) return [];
  const rows = [];
  const labels = {
    damage: '攻击力', attacks_per_min: '攻击速度', durability: '耐久度', block_damage: '方块伤害',
    knockback: '击退', power_attack_damage: '重击伤害', power_attack_stamina: '重击体力',
    range: '射程', fire_rate: '射速', magazine_size: '弹匣容量',
    reload_time: '换弹时间', ammo_type: '弹药类型', penetration: '穿透',
    armor: '护甲值', damage_reduction: '减伤', movement_speed: '移速',
    stamina_regen: '体力回复', cold_resistance: '寒冷抗性', heat_resistance: '炎热抗性',
    hunger: '饱腹度', health: '生命值', stamina: '体力',
    max_health_bonus: '最大生命加成', wellness: '健康度',
    bleeding_stop: '止血', infection_cure: '感染治愈', infection_chance: '感染风险',
    hp: '生命值', speed: '速度', storage_slots: '存储格数',
    fuel_type: '燃料类型', fuel_capacity: '燃料容量', fuel_consumption: '油耗',
    power_usage: '耗电量', trigger_range: '触发范围',
    light_intensity: '光照强度',
    repair_amount: '修复量', repair_type: '修复类型',
    max_level: '最高等级', skill_name: '对应技能',
    resource_harvest: '采集倍率',
  };

  for (const [key, val] of Object.entries(item.stats)) {
    const label = labels[key] || key;
    if (key === 'resource_harvest' && typeof val === 'object') {
      for (const [res, mult] of Object.entries(val)) {
        rows.push({ key: `采集倍率 (${res})`, value: mult });
      }
    } else if (typeof val === 'boolean') {
      rows.push({ key: label, value: val ? '是' : '否' });
    } else {
      rows.push({ key: label, value: val });
    }
  }
  return rows;
}
