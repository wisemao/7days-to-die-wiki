import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load, dump } from 'js-yaml';
import { parseLocalization } from './parse-localization.js';
import { parseItemsXml } from './parse-items-xml.js';
import { parseRecipesXml } from './parse-recipes-xml.js';
import { parseProgressionXml } from './parse-progression.js';
import { parseEntitiesXml } from './parse-entities.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data', 'vanilla');

function writeYaml(filePath, data) {
  writeFileSync(filePath, dump(data, { indent: 2, lineWidth: 120, noRefs: true, sortKeys: false }), 'utf-8');
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

  let locPath = join(configDir, 'localization.txt');
  if (!existsSync(locPath)) locPath = join(configDir, 'Localization.csv');
  const locMap = existsSync(locPath) ? parseLocalization(locPath) : new Map();
  console.log(`  - Localization: ${locMap.size} 条`);

  const itemsPath = join(configDir, 'items.xml');
  if (existsSync(itemsPath)) {
    const items = parseItemsXml(readFileSync(itemsPath, 'utf-8'), locMap);
    writeYaml(join(DATA_DIR, 'items.yaml'), { items });
    console.log(`  - items.xml: ${items.length} 个物品`);
  }

  const recipesPath = join(configDir, 'recipes.xml');
  if (existsSync(recipesPath)) {
    const recipes = parseRecipesXml(readFileSync(recipesPath, 'utf-8'), locMap);
    writeYaml(join(DATA_DIR, 'recipes.yaml'), { recipes });
    console.log(`  - recipes.xml: ${recipes.length} 个配方`);
  }

  const progPath = join(configDir, 'progression.xml');
  if (existsSync(progPath)) {
    const skills = parseProgressionXml(readFileSync(progPath, 'utf-8'), locMap);
    writeYaml(join(DATA_DIR, 'skills.yaml'), { skills });
    console.log(`  - progression.xml: ${skills.length} 个技能`);
  }

  const entityPath = join(configDir, 'entityclasses.xml');
  if (existsSync(entityPath)) {
    const zombies = parseEntitiesXml(readFileSync(entityPath, 'utf-8'), locMap);
    writeYaml(join(DATA_DIR, 'zombies.yaml'), { zombies });
    console.log(`  - entityclasses.xml: ${zombies.length} 个僵尸`);
  }

  console.log('✅ 导入完成');
}

const gamePath = process.argv.find(a => a.startsWith('--game-path='))?.split('=')[1];
importAll(gamePath);
