// 中文覆盖率统计
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
const hasCjk = s => !!s && /[\u4e00-\u9fff]/.test(s);
const items = load(readFileSync('data/vanilla/items.yaml', 'utf-8')).items || [];
const skills = load(readFileSync('data/vanilla/skills.yaml', 'utf-8')).skills || [];
const recipes = load(readFileSync('data/vanilla/recipes.yaml', 'utf-8')).recipes || [];
const zombies = load(readFileSync('data/vanilla/zombies.yaml', 'utf-8')).zombies || [];
const biomes = load(readFileSync('data/vanilla/biomes.yaml', 'utf-8')).biomes || [];
const blocks = load(readFileSync('data/vanilla/blocks.yaml', 'utf-8')).blocks || [];

// 简化可见性判断（与 data-loader 对齐）
const isVis = i => {
  const id = i.id;
  if (/开发|管理员|测试人员/.test(i.name || '')) return false;
  if (/^admin/i.test(id) || /Admin/.test(id) || /^TEST_/.test(id)) return false;
  if (/^qtest_/i.test(id) || /^giveXP_/i.test(id)) return false;
  if (/^missingItem$|^UselessThing$|^twitchTurd$/.test(id)) return false;
  if (/^tier\d{2}/.test(id)) return false;
  if (/^meleeHand/.test(id) || /^ammoProjectile/.test(id)) return false;
  if (/invisibleRecipes/.test(id)) return false;
  if (/Master$|Template$|Bundle$|^master/i.test(id) && !hasCjk(i.name)) return false;
  if (/^gunBowT1DevCrossbow$|^unit_|^coolLootShades|^craftingShades/.test(id)) return false;
  return true;
};
const vis = items.filter(isVis);
const noCjk = vis.filter(i => !hasCjk(i.name));
console.log('=== 物品 ===');
console.log('可见:', vis.length, '| 无中文名:', noCjk.length);
console.log('无中文名样例:', noCjk.slice(0, 15).map(i => i.id + '=' + (i.name || '空')).join(', '));

const skNoCjk = skills.filter(s => !hasCjk(s.name));
console.log('\n=== 技能 ===');
console.log('总数:', skills.length, '| 无中文名:', skNoCjk.length);
console.log('样例:', skNoCjk.slice(0, 8).map(s => s.id).join(', '));

const zNoCjk = zombies.filter(z => !hasCjk(z.name));
console.log('\n=== 生物 ===');
console.log('总数:', zombies.length, '| 无中文名:', zNoCjk.length);
console.log('样例:', zNoCjk.slice(0, 8).map(z => z.id).join(', '));

const rNoCjk = recipes.filter(r => !hasCjk(r.name));
console.log('\n=== 配方 ===');
console.log('总数:', recipes.length, '| 无中文名:', rNoCjk.length);
console.log('样例:', rNoCjk.slice(0, 8).map(r => r.id).join(', '));

const bNoCjk = biomes.filter(b => !hasCjk(b.name));
console.log('\n=== 群系 ===');
console.log('总数:', biomes.length, '| 无中文名:', bNoCjk.length, bNoCjk.map(b => b.id).join(','));

const blNoCjk = blocks.filter(b => !hasCjk(b.name));
console.log('\n=== 方块 ===');
console.log('总数:', blocks.length, '| 无中文名:', blNoCjk.length);
console.log('样例:', blNoCjk.slice(0, 10).map(b => b.id + '=' + (b.name || '空')).join(', '));
