import { renderTemplate } from './renderer.js';

const ITEM_CATEGORY_LABELS = {
  tool: '工具', melee_weapon: '近战武器', ranged_weapon: '远程武器',
  armor: '护甲', food: '食物', medical: '医疗', material: '材料',
  ammo: '弹药', book: '书籍', vehicle: '载具', trap: '陷阱',
  accessory: '配件', consumable: '消耗品', quest_item: '任务物品',
};

function tierToQuality(tier) {
  if (!tier) return null;
  if (tier <= 200) return '1';
  if (tier <= 500) return '2';
  if (tier <= 1100) return '3';
  if (tier <= 2000) return '4';
  if (tier <= 3000) return '5';
  return '6';
}

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
      materials: r.recipe.filter(m => m.count > 0).map(m => ({
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
  })) || (refs.itemScrappableFrom?.get(item.id) || []).flatMap(r =>
    (r.scrappable_into || []).map(s => ({
      item_id: s.item_id,
      itemName: resolveItemName(s.item_id),
      count: s.count,
    }))
  );

  const qualityLabel = tierToQuality(item.tier);
  const tierDisplay = qualityLabel || null;

  const data = {
    name: item.name,
    icon: item.icon || item.id,
    tier: item.tier,
    tierDisplay,
    qualityLabel,
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
    range: '射程', fire_rate: '射速', rounds_per_min: '每分钟射速',
    magazine_size: '弹匣容量', reload_speed: '换弹速度',
    ammo_type: '弹药类型', penetration: '穿透',
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
    resource_harvest: '采集倍率', harvest_count: '采集数量',
    explosion: '爆炸伤害', entity_damage: '实体伤害', falling_damage: '坠落伤害',
    healing: '治疗量', water: '水分', hydration: '补水',
    cleanse: '净化', cure: '治愈', buff_time: '效果时长',
    crit_chance: '暴击率', crit_damage: '暴击伤害', headshot_damage: '爆头伤害',
    stagger_chance: '踉跄概率', stumble_chance: '绊倒概率',
    spread: '散布', spread_horizontal: '水平散布', spread_vertical: '垂直散布',
    recoil: '后坐力', aim_down_sight_time: '瞄准时间',
    sprint_stamina: '冲刺体力消耗', stamina_cost: '体力消耗',
    jump_stamina: '跳跃体力消耗', jump_strength: '跳跃力',
    swim_stamina: '游泳体力消耗',
    oxygen: '氧气', drowning_damage: '溺水伤害',
    fall_damage_reduction: '坠落减伤', explosive_resistance: '爆炸抗性',
    physical_resist: '物理抗性', elemental_resist: '元素抗性',
    elemental_damage: '元素伤害', fire_damage: '火焰伤害',
    craft_time: '制作耗时', craft_count: '制作数量',
    experience: '经验值', quest_reward: '任务奖励',
    mod_slots: '模组插槽', burst_round_count: '连发数量',
    damage_falloff: '伤害衰减', noise: '噪音',
    buff_chance: '效果触发概率', dismember_chance: '肢解概率',
    lockpick_break_chance: '开锁器损坏概率', lockpick_time: '开锁时间',
    exp_gain: '经验获取', loot_stage: '搜刮阶段',
    mobility: '机动性', run_speed: '奔跑速度', crouch_speed: '蹲行速度',
    carry_capacity: '负重', max_health: '最大生命值',
    max_stamina: '最大体力', stamina_regen_rate: '体力回复速率',
    water_loss_rate: '水分消耗速度',
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
