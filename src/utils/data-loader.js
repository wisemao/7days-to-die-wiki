import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

// process.cwd() 在 Astro build 时指向项目根目录
const DATA_DIR = join(process.cwd(), 'data', 'vanilla');

const ATTR_LABELS = {
  strength: '力量', fortitude: '强壮', perception: '感知',
  agility: '敏捷', intellect: '智力',
};

const ITEM_CATEGORY_LABELS = {
  tool: '工具', melee_weapon: '近战武器', ranged_weapon: '远程武器',
  armor: '护甲', food: '食物', medical: '医疗', material: '材料',
  ammo: '弹药', book: '书籍', vehicle: '载具', trap: '陷阱',
  accessory: '配件', consumable: '消耗品', quest_item: '任务物品',
};

const ZOMBIE_CATEGORY_LABELS = {
  humanoid: '人形', animal: '动物', special: '特殊',
};

function isItemVisible(item) {
  const id = item.id;
  if (/^admin/i.test(id) || /Admin/.test(id) || /^TEST_/.test(id)) return false;
  if (/^qtest_/i.test(id) || /^giveXP_/i.test(id)) return false;
  if (/^note[A-Z]/.test(id)) return false;
  if (/^meleeHandMaster$|^meleeHandZombieTest$|^meleeHandZombieBalancingDummy$/.test(id)) return false;
  if (/^missingItem$|^UselessThing$/.test(id)) return false;
  if (/^ammoBundleMaster$|^twitchTurd$/i.test(id)) return false;
  if (/^tier\d{2}/.test(id) || /^questReward/.test(id)) return false;
  return true;
}

function isZombieVisible(zombie) {
  return !/zombieTemplate/.test(zombie.id);
}

function mergeRecipes(recipes) {
  const byId = new Map();
  for (const r of recipes) {
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }
  return Array.from(byId.values()).map(list => {
    const base = { ...list[0] };
    const allMats = new Map();
    for (const r of list) {
      for (const m of r.recipe || []) {
        if (m.item_id && m.count > 0) {
          const existing = allMats.get(m.item_id);
          if (!existing || m.count > existing.count) allMats.set(m.item_id, { ...m });
        }
      }
    }
    base.recipe = allMats.size > 0 ? Array.from(allMats.values()) : [];
    const allScrap = new Map();
    for (const r of list) {
      for (const s of r.scrappable_into || []) {
        if (s.item_id && s.count > 0) {
          const existing = allScrap.get(s.item_id);
          if (!existing || s.count > existing.count) allScrap.set(s.item_id, { ...s });
        }
      }
    }
    base.scrappable_into = allScrap.size > 0 ? Array.from(allScrap.values()) : base.scrappable_into || [];
    base._sanitizedId = base.id.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '-');
    return base;
  });
}

export function sanitizeId(id) {
  return id.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '-');
}

let _cached = null;

export function loadData() {
  if (_cached) return _cached;

  const rawItems = load(readFileSync(join(DATA_DIR, 'items.yaml'), 'utf-8')).items || [];
  let recipes = load(readFileSync(join(DATA_DIR, 'recipes.yaml'), 'utf-8')).recipes || [];
  const skills = (load(readFileSync(join(DATA_DIR, 'skills.yaml'), 'utf-8')).skills || []).map(s => ({ ...s, _sanitizedId: sanitizeId(s.id) }));
  const rawZombies = load(readFileSync(join(DATA_DIR, 'zombies.yaml'), 'utf-8')).zombies || [];

  recipes = mergeRecipes(recipes);

  const items = rawItems.filter(isItemVisible).map(i => ({ ...i, _sanitizedId: sanitizeId(i.id) }));
  const zombies = rawZombies.filter(isZombieVisible).map(z => ({ ...z, _sanitizedId: sanitizeId(z.id) }));

  const itemMap = new Map(items.map(i => [i.id, i]));
  const itemRecipes = new Map();
  for (const r of recipes) {
    for (const m of r.recipe || []) {
      if (!itemRecipes.has(m.item_id)) itemRecipes.set(m.item_id, []);
      itemRecipes.get(m.item_id).push(r);
    }
  }
  const itemCraftRecipes = new Map();
  for (const r of recipes) {
    if (!itemCraftRecipes.has(r.id)) itemCraftRecipes.set(r.id, []);
    itemCraftRecipes.get(r.id).push(r);
  }
  const zombieLoot = new Map();
  for (const z of zombies) {
    for (const l of z.loot || []) {
      if (!zombieLoot.has(l.item_id)) zombieLoot.set(l.item_id, []);
      zombieLoot.get(l.item_id).push(z);
    }
  }

  function resolveItemName(id) {
    const item = itemMap.get(id);
    return item ? item.name : id;
  }

  function getItemLink(id) {
    const item = itemMap.get(id);
    return item ? `/vanilla/items/${item._sanitizedId}/` : null;
  }

  _cached = {
    items, recipes, skills, zombies,
    itemMap, itemRecipes, itemCraftRecipes, zombieLoot,
    resolveItemName, getItemLink,
    ITEM_CATEGORY_LABELS, ATTR_LABELS, ZOMBIE_CATEGORY_LABELS,
  };
  return _cached;
}
