import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

// process.cwd() 在 Astro build 时指向项目根目录
const DATA_DIR = join(process.cwd(), 'data', 'vanilla');

// ─── Data model types ───

export interface RecipeMaterial {
  item_id: string;
  count: number;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  stack_size?: number;
  tier?: number;
  icon?: string;
  description?: string;
  stats?: Record<string, number | string>;
  effects?: { name: string; op: string; value: string }[];
  buff_effects?: { action: 'remove' | 'add'; buff: string }[];
  scrappable_into?: RecipeMaterial[];
  installable_tags?: string;
  modifier_tags?: string;
  unlocked_by?: string;
  trader_available?: boolean;
  _sanitizedId: string;
  __iconId?: string;
}

export interface Recipe {
  id: string;
  name?: string;
  station?: string;
  craft_time?: number;
  craft_count?: number;
  recipe?: RecipeMaterial[];
  scrappable_into?: RecipeMaterial[];
  _sanitizedId: string;
}

export interface SkillLevel {
  level: number;
  effect?: string;
  cost?: number;
}

export interface TiedBook {
  book_id: string;
  effect?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  max_level?: number;
  description?: string;
  levels?: SkillLevel[];
  tied_books?: TiedBook[];
  _sanitizedId: string;
}

export interface ZombieLoot {
  item_id: string;
  count: number;
  chance?: string;
  resolved?: { item_id: string; count: string | number }[];
}

export interface ZombieSpawn {
  biomes?: string;
  time?: string;
  groups?: string;
}

export interface Zombie {
  id: string;
  name: string;
  category: string;
  tier?: number;
  hp?: number | string;
  speed?: { walk?: number; run?: number };
  damage?: { melee?: number; bleeding_chance?: number; armor_penetration?: number };
  experience?: number | string;
  hand_item?: string;
  loot?: ZombieLoot[];
  weakness?: Record<string, number>[];
  spawn?: ZombieSpawn;
  _sanitizedId: string;
}

// ─── HP formulas (game macros expanded to approximate values) ───
const HP_FORMULAS: Record<string, string> = {
  '^healthSlim': '60',
  '^healthNormal': '100',
  '^healthLarge': '200',
  '^healthStrong': '300',
  '^healthVeryStrong': '500',
  '^healthFat': '800',
  '^xpNormal01': '100',
  '^xpSlim01': '50',
};

// Known block/mechanical items missing from items.yaml (import limitation).
// Used as readable fallback names in recipe material display.
const KNOWN_BLOCK_NAMES: Record<string, string> = {
  oilBarrel: '油桶',
  motionsensor: '运动传感器',
  woodLogPillar100: '原木柱',
  glassBlockVariantHelper: '玻璃方块',
};

export const ATTR_LABELS: Record<string, string> = {
  strength: '力量', fortitude: '强壮', perception: '感知',
  agility: '敏捷', intellect: '智力',
  generalperks: '通用',
};

export const ITEM_CATEGORY_LABELS: Record<string, string> = {
  tool: '工具', melee_weapon: '近战武器', ranged_weapon: '远程武器',
  armor: '护甲', food: '食物', medical: '医疗', material: '材料',
  ammo: '弹药', book: '书籍', vehicle: '载具', trap: '陷阱',
  accessory: '配件', consumable: '消耗品', quest_item: '任务物品',
  mod: '模组',
};

export const ZOMBIE_CATEGORY_LABELS: Record<string, string> = {
  humanoid: '人形', animal: '动物', special: '特殊',
};

export const STATION_LABELS: Record<string, string> = {
  backpack: '背包合成',
  workbench: '工作台',
  forge: '熔炉',
  campfire: '营火',
  chemistry: '化学台',
  concrete: '混凝土搅拌机',
};

export const ATTR_SLUG_MAP: Record<string, string> = {
  strength: 'strength',
  fortitude: 'fortitude',
  perception: 'perception',
  agility: 'agility',
  intellect: 'intellect',
  general: 'generalperks',
};

export const SLUG_TO_ATTR_LABEL: Record<string, string> = {
  strength: '力量',
  fortitude: '强壮',
  perception: '感知',
  agility: '敏捷',
  intellect: '智力',
  general: '通用',
};

export const ZOMBIE_TYPE_MAP: Record<string, string> = {
  humanoid: 'humanoid',
  animal: 'animal',
  special: 'special',
};

export const ZOMBIE_TYPE_LABELS: Record<string, string> = {
  humanoid: '人形',
  animal: '动物',
  special: '特殊',
  other: '其他',
};

// Zombie loot container display names (zPack* / EntityLootContainer*)
const LOOT_CONTAINER_NAMES: Record<string, string> = {
  zPackReg: '普通丧尸包',
  zPackStrong: '强壮丧尸包',
  zPackNurse: '护士包',
  zPackLab: '实验室丧尸包',
  zPackUtility: '工人丧尸包',
  zPackThug: '暴徒包',
  zPackSoldier: '士兵包',
  zPackBoss: 'BOSS 包',
  zPackPlague: '瘟疫包',
  zPackFeral: '狂化丧尸包',
  EntityLootContainerRegular: '普通战利品容器',
  EntityLootContainerStrong: '强力战利品容器',
  EntityLootContainerPlague: '瘟疫战利品容器',
};

function isItemVisible(item: Item): boolean {
  const id = item.id;
  const hasCjk = !!item.name && /[\u4e00-\u9fff]/.test(item.name);
  // Dev/admin items with Chinese names (e.g. "开发：管理员砖块替换工具")
  if (/开发|管理员|测试人员/.test(item.name || '')) return false;
  if (/^admin/i.test(id) || /Admin/.test(id) || /^TEST_/.test(id)) return false;
  if (/^qtest_/i.test(id) || /^giveXP_/i.test(id)) return false;
  if (/^note.*(Admin|Testing|Testers)/i.test(id)) return false;
  if (/^missingItem$|^UselessThing$/.test(id)) return false;
  if (/^twitchTurd$/i.test(id)) return false;
  if (/^tier\d{2}/.test(id)) return false;
  // questReward items are player-facing quest reward bundles/books - keep them
  // (only the BundleMaster template is filtered below by the Master rule)
  // Internal game mechanic items (no player-facing use)
  if (/^meleeHand/.test(id)) return false;
  if (/^ammoProjectile/.test(id)) return false;
  if (/invisibleRecipes/.test(id)) return false;
  // Master template items (internal templates, no player-facing use)
  if (/Master$|Template$|Bundle$|^master/i.test(id) && !hasCjk) return false;
  // Dev/unit/admin items without Chinese name
  if (/^gunBowT1DevCrossbow$|^unit_|^coolLootShades|^craftingShades/.test(id)) return false;
  return true;
}

/**
 * Generate a readable Chinese-style fallback name from an English item ID.
 * Used when an item has no Chinese name in the data.
 */
export function generateItemName(id: string): string {
  return id
    .replace(/^melee|^ranged|^armor/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/T\d/g, '')
    .replace(/Schematic|SkillMagazine|Master|Template|Bundle/g, '')
    .trim()
    .replace(/^./, c => c.toUpperCase())
    || id;
}

/**
 * Resolve a skill name from its ID:
 * 1. Use the Chinese name if present
 * 2. Map perk* IDs to their book* item names (e.g. perkFiremansAlmanacMolotov -> bookFiremansAlmanacMolotov)
 * 3. For *Complete perks, derive "系列名 + 精通" from any book in the series
 * 4. Fall back to the generated readable name
 */
function resolveSkillName(skill: Skill, items: Item[]): string {
  if (skill.name && /[\u4e00-\u9fff]/.test(skill.name)) return skill.name;
  const bookId = skill.id.startsWith('perk') ? 'book' + skill.id.slice(4) : null;
  if (bookId) {
    const book = items.find(i => i.id === bookId);
    if (book && book.name && /[\u4e00-\u9fff]/.test(book.name)) return book.name;
  }
  if (skill.id.endsWith('Complete')) {
    const prefix = skill.id.replace(/^perk/, '').replace(/Complete$/, '').replace(/\d+$/, '');
    const seriesBook = items.find(i => i.id.startsWith('book' + prefix) && i.name && /[\u4e00-\u9fff]/.test(i.name));
    if (seriesBook) {
      const seriesName = seriesBook.name.replace(/[ 　]*第\s*\d+\s*[卷册].*$/, '').trim();
      if (seriesName) return `${seriesName} 精通`;
    }
  }
  return generateItemName(skill.id);
}

function isZombieVisible(zombie: Zombie): boolean {
  return !/zombieTemplate/.test(zombie.id);
}

function mergeRecipes(recipes: Recipe[]): Recipe[] {
  const byId = new Map<string, Recipe[]>();
  for (const r of recipes) {
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id)!.push(r);
  }
  return Array.from(byId.values()).map(list => {
    const base: Recipe = { ...list[0] };
    const allMats = new Map<string, RecipeMaterial>();
    for (const r of list) {
      for (const m of r.recipe || []) {
        if (m.item_id && m.count > 0) {
          const existing = allMats.get(m.item_id);
          if (!existing || m.count > existing.count) allMats.set(m.item_id, { ...m });
        }
      }
    }
    base.recipe = allMats.size > 0 ? Array.from(allMats.values()) : [];
    const allScrap = new Map<string, RecipeMaterial>();
    for (const r of list) {
      for (const s of r.scrappable_into || []) {
        if (s.item_id && s.count > 0) {
          const existing = allScrap.get(s.item_id);
          if (!existing || s.count > existing.count) allScrap.set(s.item_id, { ...s });
        }
      }
    }
    base.scrappable_into = allScrap.size > 0 ? Array.from(allScrap.values()) : base.scrappable_into || [];
    base._sanitizedId = sanitizeId(base.id);
    return base;
  });
}

export function sanitizeId(id: string): string {
  return id.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '-');
}

export interface Block {
  id: string;
  name: string;
  category: string;
  durability?: number;
  damage?: number;
  power_usage?: number;
  trigger_range?: number;
  ammo?: string;
  tier?: number;
  description?: string;
  icon?: string;
  extends?: string;
  _sanitizedId: string;
}

export interface Biome {
  id: string;
  name: string;
  difficulty?: string;
  lootstage_modifier?: string;
  lootstage_bonus?: string;
  gamestage_modifier?: string;
  gamestage_bonus?: string;
  buff?: string;
  resources?: { id: string; name: string }[];
  subbiome_count?: number;
  weather_count?: number;
  temp_range?: string;
  rain_prob?: number;
  _sanitizedId: string;
}

export interface WikiData {
  items: Item[];
  recipes: Recipe[];
  skills: Skill[];
  zombies: Zombie[];
  blocks: Block[];
  biomes: Biome[];
  itemMap: Map<string, Item>;
  itemRecipes: Map<string, Recipe[]>;
  itemCraftRecipes: Map<string, Recipe[]>;
  zombieLoot: Map<string, Zombie[]>;
  resolveItemName: (id: string) => string;
  getItemLink: (id: string) => string | null;
  ITEM_CATEGORY_LABELS: Record<string, string>;
  ATTR_LABELS: Record<string, string>;
  ZOMBIE_CATEGORY_LABELS: Record<string, string>;
}

let _cached: WikiData | null = null;

export function loadData(): WikiData {
  if (_cached) return _cached;

  const rawItems = (load(readFileSync(join(DATA_DIR, 'items.yaml'), 'utf-8')) as { items?: Item[] }).items || [];
  const rawRecipes = (load(readFileSync(join(DATA_DIR, 'recipes.yaml'), 'utf-8')) as { recipes?: Recipe[] }).recipes || [];
  const rawSkills = (load(readFileSync(join(DATA_DIR, 'skills.yaml'), 'utf-8')) as { skills?: Skill[] }).skills || [];
  const rawZombies = (load(readFileSync(join(DATA_DIR, 'zombies.yaml'), 'utf-8')) as { zombies?: Zombie[] }).zombies || [];
  const rawBlocks = (load(readFileSync(join(DATA_DIR, 'blocks.yaml'), 'utf-8')) as { blocks?: Block[] }).blocks || [];
  const rawBiomes = (load(readFileSync(join(DATA_DIR, 'biomes.yaml'), 'utf-8')) as { biomes?: Biome[] }).biomes || [];

  const recipes = mergeRecipes(rawRecipes);

  const skills: Skill[] = rawSkills.map(s => ({
    ...s,
    _sanitizedId: sanitizeId(s.id),
    // Resolve Chinese names via book series or fallback generation
    name: resolveSkillName(s, rawItems),
  }));

  const items: Item[] = rawItems.filter(isItemVisible).map(i => ({
    ...i,
    _sanitizedId: sanitizeId(i.id),
    // Auto-generate a readable name for items without Chinese names
    name: i.name && /[\u4e00-\u9fff]/.test(i.name) ? i.name : generateItemName(i.id),
  }));

  const zombies: Zombie[] = rawZombies.filter(isZombieVisible).map(z => ({
    ...z,
    // Resolve formula-based HP values (field is `hp` in the data)
    hp: typeof z.hp === 'string' && z.hp.startsWith('^') ? (HP_FORMULAS[z.hp] || z.hp) : z.hp,
    _sanitizedId: sanitizeId(z.id),
  }));

  const blocks: Block[] = rawBlocks.map(b => ({
    ...b,
    _sanitizedId: sanitizeId(b.id),
    name: b.name && /[\u4e00-\u9fff]/.test(b.name) ? b.name : generateItemName(b.id),
  }));

  const biomes: Biome[] = rawBiomes.map(b => ({
    ...b,
    _sanitizedId: sanitizeId(b.id),
  }));

  const itemMap = new Map(items.map(i => [i.id, i] as const));

  const itemRecipes = new Map<string, Recipe[]>();
  for (const r of recipes) {
    for (const m of r.recipe || []) {
      if (!itemRecipes.has(m.item_id)) itemRecipes.set(m.item_id, []);
      itemRecipes.get(m.item_id)!.push(r);
    }
  }

  const itemCraftRecipes = new Map<string, Recipe[]>();
  for (const r of recipes) {
    if (!itemCraftRecipes.has(r.id)) itemCraftRecipes.set(r.id, []);
    itemCraftRecipes.get(r.id)!.push(r);
  }

  const zombieLoot = new Map<string, Zombie[]>();
  for (const z of zombies) {
    for (const l of z.loot || []) {
      // Resolved container contents (l.resolved) map concrete items to the zombie
      if (l.resolved && Array.isArray(l.resolved)) {
        for (const r of l.resolved) {
          if (!r.item_id) continue;
          if (!zombieLoot.has(r.item_id)) zombieLoot.set(r.item_id, []);
          zombieLoot.get(r.item_id)!.push(z);
        }
      } else if (l.item_id) {
        if (!zombieLoot.has(l.item_id)) zombieLoot.set(l.item_id, []);
        zombieLoot.get(l.item_id)!.push(z);
      }
    }
  }

  function resolveItemName(id: string): string {
    const item = itemMap.get(id);
    if (item) return item.name;
    if (LOOT_CONTAINER_NAMES[id]) return LOOT_CONTAINER_NAMES[id];
    return KNOWN_BLOCK_NAMES[id] || id;
  }

  function getItemLink(id: string): string | null {
    const item = itemMap.get(id);
    return item ? `/vanilla/items/${item._sanitizedId}/` : null;
  }

  _cached = {
    items, recipes, skills, zombies, blocks, biomes,
    itemMap, itemRecipes, itemCraftRecipes, zombieLoot,
    resolveItemName, getItemLink,
    ITEM_CATEGORY_LABELS, ATTR_LABELS, ZOMBIE_CATEGORY_LABELS,
  };
  return _cached;
}
