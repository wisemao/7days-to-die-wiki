/**
 * Data validation script for 7 Days to Die Wiki
 * Usage: node scripts/validate-data.js
 * Exit code 0 = pass, 1 = warnings, 2 = errors
 */
import { load } from 'js-yaml';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());
const DATA_DIR = join(ROOT, 'data', 'vanilla');
const ICONS_DIR = join(ROOT, 'public', 'images', 'items');

const issues = [];
const warnings = [];

function loadYaml(name) {
  const file = join(DATA_DIR, name);
  if (!existsSync(file)) {
    issues.push(`数据文件缺失: ${name}`);
    return [];
  }
  try {
    const doc = load(readFileSync(file, 'utf-8'));
    return Array.isArray(doc) ? doc : doc ? Object.values(doc)[0] || [] : [];
  } catch (e) {
    issues.push(`YAML 解析失败 ${name}: ${e.message}`);
    return [];
  }
}

const items = loadYaml('items.yaml');
const recipes = loadYaml('recipes.yaml');
const skills = loadYaml('skills.yaml');
const zombies = loadYaml('zombies.yaml');

console.log(`\n📦 数据验证报告\n${'═'.repeat(50)}`);
console.log(`物品 ${items.length} · 配方 ${recipes.length} · 技能 ${skills.length} · 僵尸 ${zombies.length}`);

// ─── Duplicate ID check (recipes are merged by mergeRecipes, duplicates are by design) ───
const dupItems = items.filter((i, idx, arr) => arr.findIndex(x => x.id === i.id) !== idx);
if (dupItems.length) issues.push(`物品重复 ID: ${dupItems.slice(0, 5).map(d => d.id).join(', ')}`);

// ─── Item checks (only count items that pass visibility filter) ───
function isItemVisible(item) {
  const id = item.id;
  const hasCjk = item.name && /[\u4e00-\u9fff]/.test(item.name);
  if (/^admin/i.test(id) || /Admin/.test(id) || /^TEST_/.test(id)) return false;
  if (/^qtest_/i.test(id) || /^giveXP_/i.test(id)) return false;
  if (/^note[A-Z]/.test(id)) return false;
  if (/^missingItem$|^UselessThing$/.test(id)) return false;
  if (/^twitchTurd$/i.test(id)) return false;
  if (/^tier\d{2}/.test(id) || /^questReward/.test(id)) return false;
  if (/^meleeHand/.test(id)) return false;
  if (/^ammoProjectile/.test(id)) return false;
  if (/invisibleRecipes/.test(id)) return false;
  if (/Master$|Template$|Bundle$|^master/i.test(id) && !hasCjk) return false;
  if (/^gunBowT1DevCrossbow$|^unit_|^coolLootShades|^craftingShades/.test(id)) return false;
  return true;
}
const visibleItems = items.filter(isItemVisible);
const noNameItems = visibleItems.filter(i => !i.name || /^[a-zA-Z0-9_]+$/.test(i.name));
if (noNameItems.length > 10) {
  warnings.push(`可见物品缺少中文名: ${noNameItems.length} 个 (超过 10 限制)`);
} else if (noNameItems.length > 0) {
  warnings.push(`可见物品缺少中文名: ${noNameItems.map(i => i.id).join(', ')}`);
}

const noCategory = items.filter(i => !i.category);
if (noCategory.length) issues.push(`物品缺少分类: ${noCategory.map(i => i.id).join(', ')}`);

// ─── Category validity check ───
const KNOWN_CATEGORIES = new Set(['tool', 'melee_weapon', 'ranged_weapon', 'armor', 'food', 'medical', 'material', 'ammo', 'book', 'vehicle', 'trap', 'accessory', 'consumable', 'quest_item', 'mod']);
const badCat = visibleItems.filter(i => !KNOWN_CATEGORIES.has(i.category));
if (badCat.length) issues.push(`物品分类非法: ${badCat.map(i => `${i.id}=${i.category}`).join(', ')}`);
// Trap category should be empty (trap blocks aren't imported as items)
const trapItems = visibleItems.filter(i => i.category === 'trap');
if (trapItems.length) warnings.push(`trap 分类不应有物品（方块未导入）: ${trapItems.map(i => i.id).join(', ')}`);

// ─── Icon coverage ───
const iconFiles = existsSync(ICONS_DIR) ? readdirSync(ICONS_DIR).filter(f => f.endsWith('.png')) : [];
const iconIds = new Set(iconFiles.map(f => f.replace('.png', '')));
const itemIds = new Set(items.map(i => i.id));
const withIcon = items.filter(i => iconIds.has(i.id) || iconIds.has(i.id.replace(/Schematic$|SkillMagazine$/, '')));
const coverage = (withIcon.length / items.length * 100).toFixed(1);
console.log(`图标覆盖率: ${withIcon.length}/${items.length} (${coverage}%)`);
if (coverage < 30) warnings.push(`图标覆盖率过低: ${coverage}%`);

// ─── Recipe checks (merge same-id recipes first, mirroring data-loader) ───
const mergedRecipes = new Map();
for (const r of recipes) {
  if (!mergedRecipes.has(r.id)) mergedRecipes.set(r.id, { ...r, recipe: [], scrappable_into: [] });
  const m = mergedRecipes.get(r.id);
  if (r.recipe?.length) m.recipe = r.recipe;
  if (r.scrappable_into?.length) m.scrappable_into = r.scrappable_into;
}
const noMatRecipes = [...mergedRecipes.values()].filter(r => !r.recipe || r.recipe.length === 0);
// Salvage-scrap recipes (salvage: true) intentionally have no materials - not a warning
const realNoMat = noMatRecipes.filter(r => !r.salvage);
if (realNoMat.length > 100) {
  warnings.push(`配方无材料: ${realNoMat.length} 个 (超过 100 限制)`);
} else if (realNoMat.length > 0) {
  warnings.push(`配方无材料: ${realNoMat.slice(0, 10).map(r => r.id).join(', ')}${realNoMat.length > 10 ? ' 等' : ''}`);
}

// ─── Skill checks ───
const noLevels = skills.filter(s => !s.levels || s.levels.length === 0);
if (noLevels.length) warnings.push(`技能无等级定义: ${noLevels.map(s => s.id).join(', ')}`);
const noCatSkills = skills.filter(s => !s.category);
if (noCatSkills.length) issues.push(`技能缺少分类: ${noCatSkills.map(s => s.id).join(', ')}`);
const noNameSkills = skills.filter(s => !s.name || /^[a-zA-Z0-9_]+$/.test(s.name));
if (noNameSkills.length > 10) {
  warnings.push(`技能缺少中文名: ${noNameSkills.length} 个 (超过 10 限制)`);
} else if (noNameSkills.length > 0) {
  warnings.push(`技能缺少中文名: ${noNameSkills.map(s => s.id).join(', ')}`);
}
// Simulate runtime resolveSkillName: perk* maps to book*, *Complete -> 系列+精通
const itemIdSet2 = new Map(items.map(i => [i.id, i]));
const unresolvedSkills = noNameSkills.filter(s => {
  if (s.id.startsWith('perk')) {
    const book = itemIdSet2.get('book' + s.id.slice(4));
    if (book && book.name && /[\u4e00-\u9fff]/.test(book.name)) return false;
  }
  if (s.id.endsWith('Complete')) {
    const prefix = s.id.replace(/^perk/, '').replace(/Complete$/, '').replace(/\d+$/, '');
    if (items.some(i => i.id.startsWith('book' + prefix) && i.name && /[\u4e00-\u9fff]/.test(i.name))) return false;
  }
  return true;
});
if (unresolvedSkills.length > 0) {
  warnings.push(`技能名解析后仍为英文: ${unresolvedSkills.map(s => s.id).join(', ')}`);
}

// ─── Zombie checks (only visible zombies) ───
const visibleZombies = zombies.filter(z => !/zombieTemplate/.test(z.id));
const noNameZombies = visibleZombies.filter(z => !z.name || /^[a-zA-Z0-9_]+$/.test(z.name));
if (noNameZombies.length > 20) {
  warnings.push(`僵尸缺少中文名: ${noNameZombies.length} 个`);
} else if (noNameZombies.length > 0) {
  warnings.push(`僵尸缺少中文名: ${noNameZombies.map(z => z.id).join(', ')}`);
}

// ─── Broken recipe references ───
const itemIdSet = new Set(items.map(i => i.id));
const KNOWN_BLOCKS = new Set(['oilBarrel', 'motionsensor', 'woodLogPillar100', 'glassBlockVariantHelper']);
let brokenRefs = 0;
let blockRefs = 0;
for (const r of recipes) {
  for (const m of r.recipe || []) {
    if (m.item_id && !itemIdSet.has(m.item_id) && !/^meleeHand|^ammoProjectile/.test(m.item_id)) {
      if (KNOWN_BLOCKS.has(m.item_id)) blockRefs++;
      else brokenRefs++;
    }
  }
}
if (brokenRefs) warnings.push(`配方引用不存在的物品: ${brokenRefs} 处`);
if (blockRefs) warnings.push(`配方引用已知方块（导入限制）: ${blockRefs} 处`);

// ─── Summary ───
console.log(`${'═'.repeat(50)}`);
if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ 全部通过，无问题\n');
  process.exit(0);
}
if (issues.length) {
  console.log(`❌ 错误 (${issues.length}):`);
  issues.forEach(i => console.log(`   - ${i}`));
}
if (warnings.length) {
  console.log(`⚠️  警告 (${warnings.length}):`);
  warnings.forEach(w => console.log(`   - ${w}`));
}
console.log('');
process.exit(issues.length ? 2 : 1);
