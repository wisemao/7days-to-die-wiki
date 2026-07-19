import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseLocalization } from './parse-localization.js';
import { parseItemsXml } from './parse-items-xml.js';
import { parseRecipesXml } from './parse-recipes-xml.js';
import { parseProgressionXml } from './parse-progression.js';
import { parseEntitiesXml } from './parse-entities.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data', 'vanilla');

function yamlDump(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let result = '';

  if (Array.isArray(obj)) {
    for (const item of obj) {
      result += `${spaces}- ${yamlDumpScalar(item, indent + 1)}\n`;
    }
    return result;
  }

  if (obj && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) continue;
      result += `${spaces}${key}: ${yamlDumpScalar(val, indent + 1)}\n`;
    }
    return result;
  }

  return yamlDumpScalar(obj, indent);
}

function yamlDumpScalar(val, indent) {
  if (val === null || val === undefined) return '~';
  if (typeof val === 'string') {
    if (val.includes(':') || val.includes('#') || val.includes('{') || val.includes('}')) {
      return `"${val.replace(/"/g, '\\"')}"`;
    }
    return val;
  }
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return '\n' + val.map(v => `${'  '.repeat(indent)}- ${yamlDumpScalar(v, indent + 1)}`).join('\n');
  }
  if (typeof val === 'object') {
    return '\n' + yamlDump(val, indent);
  }
  return String(val);
}

function importAll(gamePath) {
  if (!gamePath) {
    console.error('❌ 请指定游戏路径: node scripts/import/import-all.js --game-path "E:/Steam/7 Days to Die"');
    console.error('   或: node scripts/import/import-all.js --game-path "C:/Program Files (x86)/Steam/steamapps/common/7 Days to Die"');
    process.exit(1);
  }

  const configDir = join(gamePath, 'Data', 'Config');

  if (!existsSync(configDir)) {
    console.error(`❌ 未找到游戏配置目录: ${configDir}`);
    console.error('   请确认游戏路径正确');
    process.exit(1);
  }

  console.log(`📂 读取游戏数据: ${configDir}`);

  const locPath = join(configDir, 'localization.txt');
  const locMap = existsSync(locPath) ? parseLocalization(locPath) : new Map();
  console.log(`  - localization.txt: ${locMap.size} 条`);

  const itemsPath = join(configDir, 'items.xml');
  if (existsSync(itemsPath)) {
    const items = parseItemsXml(readFileSync(itemsPath, 'utf-8'), locMap);
    writeFileSync(join(DATA_DIR, 'items.yaml'), 'items:\n' + items.map(i => yamlDumpScalar(i, 1)).join('\n').replace(/^- /gm, '\n  - ').trimStart() + '\n', 'utf-8');
    console.log(`  - items.xml: ${items.length} 个物品`);
  }

  const recipesPath = join(configDir, 'recipes.xml');
  if (existsSync(recipesPath)) {
    const recipes = parseRecipesXml(readFileSync(recipesPath, 'utf-8'), locMap);
    writeFileSync(join(DATA_DIR, 'recipes.yaml'), 'recipes:\n' + recipes.map(r => yamlDumpScalar(r, 1)).join('\n').replace(/^- /gm, '\n  - ').trimStart() + '\n', 'utf-8');
    console.log(`  - recipes.xml: ${recipes.length} 个配方`);
  }

  const progPath = join(configDir, 'progression.xml');
  if (existsSync(progPath)) {
    const skills = parseProgressionXml(readFileSync(progPath, 'utf-8'));
    writeFileSync(join(DATA_DIR, 'skills.yaml'), 'skills:\n' + skills.map(s => yamlDumpScalar(s, 1)).join('\n').replace(/^- /gm, '\n  - ').trimStart() + '\n', 'utf-8');
    console.log(`  - progression.xml: ${skills.length} 个技能`);
  }

  const entityPath = join(configDir, 'entityclasses.xml');
  if (existsSync(entityPath)) {
    const zombies = parseEntitiesXml(readFileSync(entityPath, 'utf-8'));
    writeFileSync(join(DATA_DIR, 'zombies.yaml'), 'zombies:\n' + zombies.map(z => yamlDumpScalar(z, 1)).join('\n').replace(/^- /gm, '\n  - ').trimStart() + '\n', 'utf-8');
    console.log(`  - entityclasses.xml: ${zombies.length} 个僵尸`);
  }

  console.log('✅ 导入完成');
}

const gamePath = process.argv.find(a => a.startsWith('--game-path='))?.split('=')[1];
importAll(gamePath);
