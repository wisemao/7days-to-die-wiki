/**
 * Incremental data enhancement: merge v2.6 (or any game) Config data into the
 * existing wiki YAML without overwriting curated data (Chinese names, categories).
 *
 * Usage: node scripts/enhance-data.js --config-dir "path/to/Data/Config"
 *
 * Enhancements:
 *  1. items.yaml: food/medical effects from items.xml effect_group -> stats
 *  2. zombies.yaml: loot containers resolved via loot.xml (zPack* -> actual items)
 *  3. zombies.yaml: spawn biomes from spawning.xml + entitygroups.xml
 *  4. data/vanilla/blocks.yaml: trap blocks from blocks.xml (new file)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load, dump } from 'js-yaml';
import { parseItemEffects, formatEffectStats } from './import/parse-effects.js';
import { parseLootXml } from './import/parse-loot.js';
import { parseSpawningXml } from './import/parse-spawning.js';
import { parseTrapBlocks } from './import/parse-blocks.js';
import { parseLocalization } from './import/parse-localization.js';
import { parseVehiclesXml } from './import/parse-vehicles.js';
import { parseModsXml } from './import/parse-mods.js';
import { parseTradersXml } from './import/parse-traders.js';
import { parseBiomesXml } from './import/parse-biomes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'vanilla');

function writeYaml(filePath, data) {
  writeFileSync(filePath, dump(data, { indent: 2, lineWidth: 200, noRefs: true }), 'utf-8');
}
function readYaml(filePath) {
  return existsSync(filePath) ? load(readFileSync(filePath, 'utf-8')) : {};
}

function enhance(configDir) {
  if (!existsSync(configDir)) {
    console.error(`❌ 未找到 Config 目录: ${configDir}`);
    process.exit(1);
  }
  const itemsPath = join(configDir, 'items.xml');
  const lootPath = join(configDir, 'loot.xml');
  const spawningPath = join(configDir, 'spawning.xml');
  const entitygroupsPath = join(configDir, 'entitygroups.xml');
  const blocksPath = join(configDir, 'blocks.xml');

  // Load localization for Chinese names
  let locMap = new Map();
  for (const locName of ['Localization.txt', 'Localization.csv']) {
    const locPath = join(configDir, locName);
    if (existsSync(locPath)) {
      locMap = parseLocalization(locPath);
      console.log(`  - Localization: ${locMap.size} 条中文名`);
      break;
    }
  }

  // ─── 1. Item effects (food/medical) ───
  if (existsSync(itemsPath)) {
    const effects = parseItemEffects(readFileSync(itemsPath, 'utf-8'));
    const itemsDoc = readYaml(join(DATA_DIR, 'items.yaml'));
    let enriched = 0;
    for (const item of itemsDoc.items || []) {
      const eff = effects[item.id];
      if (!eff) continue;
      const stats = formatEffectStats(eff);
      if (Object.keys(stats).length === 0) continue;
      if (!item.stats) item.stats = {};
      let added = 0;
      for (const [k, v] of Object.entries(stats)) {
        if (!(k in item.stats)) { item.stats[k] = v; added++; }
      }
      if (added > 0) enriched++;
    }
    writeYaml(join(DATA_DIR, 'items.yaml'), itemsDoc);
    console.log(`  - 食物/医疗效果补全: ${enriched} 个物品 (共 ${Object.keys(effects).length} 个效果条目)`);
  }

  // ─── 2. Zombie loot resolution ───
  if (existsSync(lootPath)) {
    const { resolved } = parseLootXml(readFileSync(lootPath, 'utf-8'));
    const zombiesDoc = readYaml(join(DATA_DIR, 'zombies.yaml'));
    let resolvedCount = 0;
    for (const z of zombiesDoc.zombies || []) {
      if (!z.loot) continue;
      for (const l of z.loot) {
        const container = resolved[l.item_id];
        if (container && container.length > 0) {
          // Replace container reference with first few resolved items
          l.resolved = container.slice(0, 6).map(c => ({ item_id: c.item_id, count: c.count }));
          l.chance = l.chance || null;
          resolvedCount++;
        }
      }
    }
    writeYaml(join(DATA_DIR, 'zombies.yaml'), zombiesDoc);
    console.log(`  - 僵尸掉落容器解析: ${resolvedCount} 处`);
  }

  // ─── 3. Zombie spawn biomes ───
  if (existsSync(spawningPath) && existsSync(entitygroupsPath)) {
    const { zombieBiomes } = parseSpawningXml(
      readFileSync(spawningPath, 'utf-8'),
      readFileSync(entitygroupsPath, 'utf-8')
    );
    const zombiesDoc = readYaml(join(DATA_DIR, 'zombies.yaml'));
    let spawnCount = 0;
    for (const z of zombiesDoc.zombies || []) {
      const biomes = zombieBiomes[z.id];
      if (biomes && biomes.length > 0) {
        if (!z.spawn) z.spawn = {};
        z.spawn.biomes = biomes.join(', ');
        spawnCount++;
      }
    }
    writeYaml(join(DATA_DIR, 'zombies.yaml'), zombiesDoc);
    console.log(`  - 僵尸刷新生物群系: ${spawnCount} 个`);
  }

  // ─── 4. Trap blocks ───
  if (existsSync(blocksPath)) {
    const traps = parseTrapBlocks(readFileSync(blocksPath, 'utf-8'), locMap);
    if (traps.length > 0) {
      writeYaml(join(DATA_DIR, 'blocks.yaml'), { blocks: traps });
      console.log(`  - 陷阱方块: ${traps.length} 个 -> data/vanilla/blocks.yaml`);
    }
  }

  // ─── 5. Vehicle stats ───
  const vehiclesPath = join(configDir, 'vehicles.xml');
  if (existsSync(vehiclesPath)) {
    const vehicles = parseVehiclesXml(readFileSync(vehiclesPath, 'utf-8'));
    const itemsDoc = readYaml(join(DATA_DIR, 'items.yaml'));
    let enriched = 0;
    for (const item of itemsDoc.items || []) {
      const v = vehicles.find(v => v.item_id === item.id);
      if (!v || !v.max_speed) continue;
      if (!item.stats) item.stats = {};
      let added = 0;
      if (!('max_speed' in item.stats) && v.max_speed) { item.stats.max_speed = v.max_speed; added++; }
      if (!('fuel_per_unit' in item.stats) && v.fuel_per_unit) { item.stats.fuel_per_unit = v.fuel_per_unit; added++; }
      if (added > 0) enriched++;
    }
    if (enriched > 0) {
      writeYaml(join(DATA_DIR, 'items.yaml'), itemsDoc);
    }
    console.log(`  - 载具属性补全: ${enriched} 个 (共 ${vehicles.length} 辆载具)`);
  }

  // ─── 6. Weapon/armor/vehicle mods (item_modifiers.xml) ───
  const modsPath = join(configDir, 'item_modifiers.xml');
  if (existsSync(modsPath)) {
    const mods = parseModsXml(readFileSync(modsPath, 'utf-8'), locMap);
    const itemsDoc = readYaml(join(DATA_DIR, 'items.yaml'));
    const existingIds = new Set((itemsDoc.items || []).map(i => i.id));
    // Skip master templates / items without Chinese names / duplicates
    const toAdd = mods.filter(m => /[\u4e00-\u9fff]/.test(m.name) && !existingIds.has(m.id));
    const seen = new Set();
    const uniqueAdd = toAdd.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    if (uniqueAdd.length > 0) {
      itemsDoc.items.push(...uniqueAdd);
      writeYaml(join(DATA_DIR, 'items.yaml'), itemsDoc);
    }
    console.log(`  - 模组解析: ${mods.length} 个，新增 ${uniqueAdd.length} 个模组本体`);
  }

  // ─── 7. Trader availability (traders.xml) ───
  const tradersPath = join(configDir, 'traders.xml');
  if (existsSync(tradersPath)) {
    const { items: traderItems } = parseTradersXml(readFileSync(tradersPath, 'utf-8'));
    const traderSet = new Set(traderItems);
    const itemsDoc = readYaml(join(DATA_DIR, 'items.yaml'));
    let enriched = 0;
    for (const item of itemsDoc.items || []) {
      if (traderSet.has(item.id) && !item.trader_available) {
        item.trader_available = true;
        enriched++;
      }
    }
    if (enriched > 0) writeYaml(join(DATA_DIR, 'items.yaml'), itemsDoc);
    console.log(`  - 商人可购标记: ${enriched} 个物品 (共 ${traderSet.size} 个商人物品)`);
  }

  // ─── 8. Skill book associations (progression.xml <book>) ───
  // Each <book name="perkXxx"> skill corresponds to an item bookXxx (perk -> book prefix swap)
  const progressionPath = join(configDir, 'progression.xml');
  if (existsSync(progressionPath)) {
    const progXml = readFileSync(progressionPath, 'utf-8');
    const bookSkills = [...progXml.matchAll(/<book\s+name="([^"]+)"/g)].map(m => m[1]);
    if (bookSkills.length > 0) {
      const itemsDoc = readYaml(join(DATA_DIR, 'items.yaml'));
      const itemIds = new Set((itemsDoc.items || []).map(i => i.id));
      const skillsDoc = readYaml(join(DATA_DIR, 'skills.yaml'));
      let enriched = 0;
      for (const skill of skillsDoc.skills || []) {
        if (!bookSkills.includes(skill.id)) continue;
        if (skill.tied_books && skill.tied_books.length > 0) continue;
        const bookId = 'book' + skill.id.slice(4); // perkFiremansAlmanacHeat -> bookFiremansAlmanacHeat
        if (!itemIds.has(bookId)) continue;
        const effect = skill.description || skill.levels?.[0]?.effect || '';
        skill.tied_books = [{ book_id: bookId, effect }];
        enriched++;
      }
      if (enriched > 0) writeYaml(join(DATA_DIR, 'skills.yaml'), skillsDoc);
      console.log(`  - 技能书籍关联: ${enriched} 个技能 (共 ${bookSkills.length} 个书籍技能)`);
    }
  }

  // ─── 9. Biomes (biomes.xml) ───
  const biomesPath = join(configDir, 'biomes.xml');
  if (existsSync(biomesPath)) {
    const biomes = parseBiomesXml(readFileSync(biomesPath, 'utf-8'));
    if (biomes.length > 0) {
      writeYaml(join(DATA_DIR, 'biomes.yaml'), { biomes });
      console.log(`  - 生物群系: ${biomes.length} 个 -> data/vanilla/biomes.yaml`);
    }
  }

  console.log('✅ 数据增强完成');
}
const argIdx = process.argv.indexOf('--config-dir');
const configDir = argIdx > -1 ? process.argv[argIdx + 1] : process.argv.find(a => a.startsWith('--config-dir='))?.split('=')[1];
if (!configDir) {
  console.error('用法: node scripts/enhance-data.js --config-dir "path/to/Data/Config"');
  process.exit(1);
}
enhance(configDir);
