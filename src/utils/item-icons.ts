import { existsSync } from 'fs';
import { join } from 'path';
import type { Item } from './data-loader';

/**
 * Category representative icons (hand-picked, verified to exist in public/images/items)
 */
export const CATEGORY_ICONS: Record<string, string> = {
  tool: 'meleeToolRepairT1ClawHammer',
  melee_weapon: 'meleeWpnClubT1BaseballBat',
  ranged_weapon: 'gunHandgunT1Pistol',
  armor: 'armorScavengerOutfit',
  food: 'foodCanBeef',
  medical: 'medicalFirstAidKit',
  material: 'resourceForgedIron',
  ammo: 'ammo9mmBulletBall',
  book: 'bookArtOfMiningLuckyStrike',
  vehicle: 'vehicleMinibikePlaceable',
  quest_item: 'questMaster',
  mod: 'modGunScopeMedium',
  consumable: 'drugVitamins',
};

/** Resolve the actual icon file id for an item (id / icon / suffix fallback), or null */
export function resolveItemIconId(item: Pick<Item, 'id' | 'icon'>): string | null {
  const base = item.icon || item.id;
  if (existsSync(join(process.cwd(), 'public', 'images', 'items', `${base}.png`))) return base;
  const fallback = base.replace(/(Schematic|SkillMagazine|Parts)$/, '');
  if (fallback !== base && existsSync(join(process.cwd(), 'public', 'images', 'items', `${fallback}.png`))) return fallback;
  return null;
}

/** Icon URL for an item (base prefix applied), or null if no icon */
export function itemIconUrl(item: Pick<Item, 'id' | 'icon'>, base: string): string | null {
  const id = resolveItemIconId(item);
  return id ? `${base}/images/items/${id}.png` : null;
}

/** Icon URL for a category representative, or null */
export function categoryIconUrl(category: string, base: string): string | null {
  const id = CATEGORY_ICONS[category];
  if (!id) return null;
  return `${base}/images/items/${id}.png`;
}

/**
 * Attribute (skill tree) representative icons — the signature weapon of each tree
 */
export const ATTR_ICONS: Record<string, string> = {
  strength: 'meleeWpnSledgeT1IronSledgehammer',   // 力量: 大锤
  fortitude: 'meleeWpnKnucklesT1IronKnuckles',   // 强壮: 拳套
  perception: 'gunRifleT1HuntingRifle',          // 感知: 猎枪
  agility: 'meleeWpnBladeT1HuntingKnife',        // 敏捷: 猎刀
  intellect: 'gunBotT2JunkTurret',               // 智力: 机器人炮塔
  general: 'bookArtOfMiningLuckyStrike',         // 通用: 技能书
};

/** Zombie type representative icons */
export const ZOMBIE_TYPE_ICONS: Record<string, string> = {
  humanoid: 'sleeperIdle',            // 丧尸: 站立完整丧尸全身图
  animal: 'sleeperWolfAnimal',        // 动物: 真实狼形象
  special: 'meleeHandBossGrace',      // 特殊: 首领
  other: 'sleeperIdle',
};

export function attrIconUrl(slug: string, base: string): string | null {
  const id = ATTR_ICONS[slug];
  return id ? `${base}/images/items/${id}.png` : null;
}

export function zombieTypeIconUrl(slug: string, base: string): string | null {
  const id = ZOMBIE_TYPE_ICONS[slug];
  return id ? `${base}/images/items/${id}.png` : null;
}
