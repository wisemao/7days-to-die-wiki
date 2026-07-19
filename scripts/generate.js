import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load } from 'js-yaml';
import { buildCrossReferences } from './utils/cross-ref.js';
import { generateSidebar } from './utils/sidebar-gen.js';
import { parseItem } from './parsers/parse-items.js';
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
    const md = parseItem(item, refs, itemTemplate, resolveItemName);
    writeFileSync(join(itemsDir, `${item.id}.md`), md, 'utf-8');
  }

  // Generate recipe pages
  console.log('📝 生成配方页面...');
  const recipesDir = join(DOCS_DIR, 'vanilla/recipes');
  ensureDir(recipesDir);
  for (const recipe of recipes) {
    const md = parseRecipe(recipe, refs, recipeTemplate, resolveItemName);
    writeFileSync(join(recipesDir, `${recipe.id}.md`), md, 'utf-8');
  }

  // Generate skill pages
  console.log('📝 生成技能页面...');
  const skillsDir = join(DOCS_DIR, 'vanilla/skills');
  ensureDir(skillsDir);
  for (const skill of skills) {
    const md = parseSkill(skill, refs, skillTemplate, resolveItemName);
    writeFileSync(join(skillsDir, `${skill.id}.md`), md, 'utf-8');
  }

  // Generate zombie pages
  console.log('📝 生成僵尸页面...');
  const zombiesDir = join(DOCS_DIR, 'vanilla/zombies');
  ensureDir(zombiesDir);
  for (const zombie of zombies) {
    const md = parseZombie(zombie, refs, zombieTemplate, resolveItemName);
    writeFileSync(join(zombiesDir, `${zombie.id}.md`), md, 'utf-8');
  }

  // Generate sidebar
  console.log('📑 生成侧边栏...');
  const sidebarCode = generateSidebar(items, recipes, skills, zombies);
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

generate();
