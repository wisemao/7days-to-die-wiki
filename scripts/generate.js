import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load } from 'js-yaml';
import { buildCrossReferences } from './utils/cross-ref.js';
import { generateSidebar } from './utils/sidebar-gen.js';
import { parseItem, ITEM_CATEGORY_LABELS } from './parsers/parse-items.js';
import { parseRecipe } from './parsers/parse-recipes.js';
import { parseSkill } from './parsers/parse-skills.js';
import { parseZombie } from './parsers/parse-zombies.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const DOCS_DIR = join(ROOT, 'docs');
const TEMPLATES_DIR = join(__dirname, 'templates');

function readYamlFile(filePath) {
  if (!existsSync(filePath)) return {};
  return load(readFileSync(filePath, 'utf-8'));
}

function readTemplate(name) {
  return readFileSync(join(TEMPLATES_DIR, name), 'utf-8');
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function sanitizeId(id) {
  return id.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '-');
}

function generate() {
  console.log('📖 读取数据...');

  const items = readYamlFile(join(DATA_DIR, 'vanilla/items.yaml')).items || [];
  const recipes = readYamlFile(join(DATA_DIR, 'vanilla/recipes.yaml')).recipes || [];
  const skills = readYamlFile(join(DATA_DIR, 'vanilla/skills.yaml')).skills || [];
  const zombies = readYamlFile(join(DATA_DIR, 'vanilla/zombies.yaml')).zombies || [];

  // Merge mod data (mods override vanilla)
  const modsIndex = readYamlFile(join(DATA_DIR, 'mods-index.yaml'));
  const activeMods = modsIndex.active_mods || [];
  for (const modName of activeMods) {
    const modDir = join(DATA_DIR, 'mods', modName);
    if (!existsSync(modDir)) continue;
    const mergeMod = (key, list, arr) => {
      for (const item of list) {
        const idx = arr.findIndex(i => i.id === item.id);
        if (idx >= 0) arr[idx] = item; else arr.push(item);
      }
    };
    mergeMod('items', readYamlFile(join(modDir, 'items.yaml')).items || [], items);
    mergeMod('recipes', readYamlFile(join(modDir, 'recipes.yaml')).recipes || [], recipes);
    mergeMod('skills', readYamlFile(join(modDir, 'skills.yaml')).skills || [], skills);
    mergeMod('zombies', readYamlFile(join(modDir, 'zombies.yaml')).zombies || [], zombies);
  }

  // Merge patches (patches have highest priority)
  const mergePatch = (key, arr) => {
    const list = readYamlFile(join(DATA_DIR, 'patches', `${key}.yaml`))[key] || [];
    for (const item of list) {
      const idx = arr.findIndex(i => i.id === item.id);
      if (idx >= 0) arr[idx] = item; else arr.push(item);
    }
  };
  mergePatch('items', items);
  mergePatch('recipes', recipes);
  mergePatch('skills', skills);
  mergePatch('zombies', zombies);

  console.log(`  - 物品: ${items.length}`);
  console.log(`  - 配方: ${recipes.length}`);
  console.log(`  - 技能: ${skills.length}`);
  console.log(`  - 僵尸: ${zombies.length}`);

  console.log('🔗 构建交叉引用...');
  const { refs, resolveItemName } = buildCrossReferences({ items, recipes, skills, zombies });

  console.log('📄 加载模板...');
  const itemTemplate = readTemplate('item.md');
  const recipeTemplate = readTemplate('recipe.md');
  const skillTemplate = readTemplate('skill.md');
  const zombieTemplate = readTemplate('zombie.md');

  // Generate item pages
  console.log('📝 生成物品页面...');
  const itemsDir = join(DOCS_DIR, 'vanilla/items');
  ensureDir(itemsDir);
  for (const item of items) {
    const md = parseItem(item, refs, itemTemplate, resolveItemName, sanitizeId);
    writeFileSync(join(itemsDir, `${sanitizeId(item.id)}.md`), md, 'utf-8');
  }

  // Generate recipe pages
  console.log('📝 生成配方页面...');
  const recipesDir = join(DOCS_DIR, 'vanilla/recipes');
  ensureDir(recipesDir);
  for (const recipe of recipes) {
    const md = parseRecipe(recipe, refs, recipeTemplate, resolveItemName, sanitizeId);
    writeFileSync(join(recipesDir, `${sanitizeId(recipe.id)}.md`), md, 'utf-8');
  }

  // Generate skill pages
  console.log('📝 生成技能页面...');
  const skillsDir = join(DOCS_DIR, 'vanilla/skills');
  ensureDir(skillsDir);
  for (const skill of skills) {
    const md = parseSkill(skill, refs, skillTemplate, resolveItemName, sanitizeId);
    writeFileSync(join(skillsDir, `${sanitizeId(skill.id)}.md`), md, 'utf-8');
  }

  // Generate zombie pages
  console.log('📝 生成僵尸页面...');
  const zombiesDir = join(DOCS_DIR, 'vanilla/zombies');
  ensureDir(zombiesDir);
  for (const zombie of zombies) {
    const md = parseZombie(zombie, refs, zombieTemplate, resolveItemName, sanitizeId);
    writeFileSync(join(zombiesDir, `${sanitizeId(zombie.id)}.md`), md, 'utf-8');
  }

  // Generate index pages
  console.log('📑 生成索引页...');
  ensureDir(join(DOCS_DIR, 'vanilla'));
  generateIndexPages(items, recipes, skills, zombies);
  const vanillaIndex = `# 原版数据\n\n- [物品](/vanilla/items/) — 工具、武器、护甲、食物等\n- [配方](/vanilla/recipes/) — 合成配方大全\n- [技能](/vanilla/skills/) — Perk 技能树\n- [僵尸](/vanilla/zombies/) — 僵尸图鉴\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/index.md'), vanillaIndex, 'utf-8');

  // Generate sidebar
  console.log('📑 生成侧边栏...');
  const sidebarCode = generateSidebar(items, recipes, skills, zombies, sanitizeId);
  const vitepressDir = join(DOCS_DIR, '.vitepress');
  ensureDir(vitepressDir);
  writeFileSync(join(vitepressDir, 'sidebar.generated.ts'), sidebarCode, 'utf-8');

  console.log(`✅ 生成完成:
  - ${items.length} 个物品
  - ${recipes.length} 个配方
  - ${skills.length} 个技能
  - ${zombies.length} 个僵尸
  - 侧边栏已更新`);
}

function generateIndexPages(items, recipes, skills, zombies) {
  // items/index.md
  const catCounts = {};
  for (const item of items) {
    const label = ITEM_CATEGORY_LABELS[item.category] || item.category;
    catCounts[label] = (catCounts[label] || 0) + 1;
  }
  const itemIndex = `# 物品列表\n\n共 ${items.length} 个物品\n\n| 分类 | 数量 |\n|---|---|\n${Object.entries(catCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/items/index.md'), itemIndex, 'utf-8');

  // recipes/index.md
  const stationCounts = {};
  for (const r of recipes) {
    const s = r.station || '背包合成';
    stationCounts[s] = (stationCounts[s] || 0) + 1;
  }
  const recipeIndex = `# 配方列表\n\n共 ${recipes.length} 个配方\n\n| 工作站 | 数量 |\n|---|---|\n${Object.entries(stationCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/recipes/index.md'), recipeIndex, 'utf-8');

  // skills/index.md
  const attrCounts = {};
  for (const s of skills) {
    attrCounts[s.category] = (attrCounts[s.category] || 0) + 1;
  }
  const skillIndex = `# 技能列表\n\n共 ${skills.length} 个技能\n\n| 属性 | 数量 |\n|---|---|\n${Object.entries(attrCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/skills/index.md'), skillIndex, 'utf-8');

  // zombies/index.md
  const typeCounts = {};
  for (const z of zombies) {
    const t = z.category || '未知';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const zombieIndex = `# 僵尸列表\n\n共 ${zombies.length} 个僵尸\n\n| 类型 | 数量 |\n|---|---|\n${Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/zombies/index.md'), zombieIndex, 'utf-8');
}

generate();
