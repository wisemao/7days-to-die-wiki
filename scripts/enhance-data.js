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
  const entityclassesPath = join(configDir, 'entityclasses.xml');

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
    let splitCount = 0;
    for (const z of zombiesDoc.zombies || []) {
      if (!z.loot) continue;
      // Split combined container refs: "EntityLootContainerRegular,1,EntityLootContainerPlague,1"
      const newLoot = [];
      for (const l of z.loot) {
        if (l.item_id && l.item_id.includes(',') && !resolved[l.item_id]) {
          const parts = l.item_id.split(',');
          for (let i = 0; i < parts.length; i += 2) {
            const cid = parts[i].trim();
            const cnt = parts[i + 1]?.trim();
            if (!cid) continue;
            newLoot.push({ item_id: cid, count: cnt ? parseInt(cnt, 10) : 1, chance: l.chance });
            splitCount++;
          }
        } else {
          newLoot.push(l);
        }
      }
      if (splitCount > 0) z.loot = newLoot;
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
    if (splitCount > 0) {
      writeYaml(join(DATA_DIR, 'zombies.yaml'), zombiesDoc);
      console.log(`  - 组合容器拆分: ${splitCount} 处 (EntityLootContainer* 系列)`);
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
    // Merge mod effects into existing mod items (idempotent: only add missing)
    const modById = new Map(mods.map(m => [m.id, m]));
    let effectMerged = 0;
    for (const item of itemsDoc.items || []) {
      if (item.category !== 'mod' || !item.id) continue;
      const fresh = modById.get(item.id);
      if (!fresh || !fresh.effects || fresh.effects.length === 0) continue;
      const existingKeys = new Set((item.effects || []).map(e => e.name + '|' + e.op + '|' + e.value));
      const toAdd = fresh.effects.filter(e => !existingKeys.has(e.name + '|' + e.op + '|' + e.value));
      if (toAdd.length > 0) {
        if (!item.effects) item.effects = [];
        item.effects.push(...toAdd);
        effectMerged++;
      }
    }
    if (effectMerged > 0) writeYaml(join(DATA_DIR, 'items.yaml'), itemsDoc);
    console.log(`  - 模组解析: ${mods.length} 个，新增 ${uniqueAdd.length} 个模组本体, ${effectMerged} 个补效果`);
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
      const itemById = new Map((itemsDoc.items || []).map(i => [i.id, i]));
      const skillsDoc = readYaml(join(DATA_DIR, 'skills.yaml'));
      let linked = 0, named = 0;
      for (const skill of skillsDoc.skills || []) {
        if (!bookSkills.includes(skill.id)) continue;
        const bookId = 'book' + skill.id.slice(4); // perkFiremansAlmanacHeat -> bookFiremansAlmanacHeat
        if (!itemIds.has(bookId)) {
          // Complete perk (series mastery): perkFiremansAlmanacComplete -> "消防员年鉴 精通"
          if (/Complete$/.test(skill.id) && (!skill.name || !/[\u4e00-\u9fff]/.test(skill.name))) {
            // perkTechJunkie8Complete -> TechJunkie8 -> TechJunkie (strip trailing digits)
            const seriesCode = skill.id.slice(4).replace(/Complete$/, '').replace(/\d+$/, '');
            const seriesBook = [...itemById.values()].find(i => i.id.startsWith('book' + seriesCode));
            if (seriesBook?.name) {
              const seriesName = seriesBook.name.replace(/[ 　]*第\s*\d+\s*[卷册][\s\S]*$/, '').trim();
              if (seriesName) { skill.name = seriesName + ' 精通'; named++; }
            }
          }
          continue;
        }
        if (!skill.tied_books || skill.tied_books.length === 0) {
          const effect = skill.description || skill.levels?.[0]?.effect || '';
          skill.tied_books = [{ book_id: bookId, effect }];
          linked++;
        }
        // Skill name from the corresponding book item (perk skills have no localized name)
        if (!skill.name || !/[\u4e00-\u9fff]/.test(skill.name)) {
          const bookItem = itemById.get(bookId);
          if (bookItem?.name) { skill.name = bookItem.name; named++; }
        }
      }
      if (linked > 0 || named > 0) writeYaml(join(DATA_DIR, 'skills.yaml'), skillsDoc);
      console.log(`  - 技能书籍关联: ${linked} 个技能关联, ${named} 个技能补中文名 (共 ${bookSkills.length} 个书籍技能)`);
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

  // ─── 10. Recipe names (blocks/localization/readable fallback) ───
  const recipesPath = join(DATA_DIR, 'recipes.yaml');
  const recipesDoc = readYaml(recipesPath);
  const blocksDoc = readYaml(join(DATA_DIR, 'blocks.yaml'));
  const blockByName = new Map((blocksDoc.blocks || []).map(b => [b.id, b.name]));
  let recipeNamed = 0;
  for (const r of recipesDoc.recipes || []) {
    if (r.name && /[\u4e00-\u9fff]/.test(r.name)) continue;
    const blockName = blockByName.get(r.id);
    if (blockName) { r.name = blockName; recipeNamed++; continue; }
    const clean = r.id.replace(/(_player|BlockVariantHelper|VariantHelper)$/, '');
    const loc = locMap.get(clean);
    if (loc?.name && /[\u4e00-\u9fff]/.test(String(loc.name))) { r.name = loc.name; recipeNamed++; continue; }
    // Readable fallback: camelCase split
    const readable = r.id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
    if (readable !== r.id) { r.name = readable; recipeNamed++; }
  }
  if (recipeNamed > 0) writeYaml(recipesPath, recipesDoc);
  console.log(`  - 配方名补全: ${recipeNamed} 个`);

  // ─── 11. Living animals + classification fixes (entityclasses.xml) ───
  // Parse animal* entities (living animals were skipped by import: name must contain "zombie")
  // Also fix zombieSkateboarder* (skater zombies) wrongly classified as animals
  const entitiesPath = join(configDir, 'entityclasses.xml');
  if (existsSync(entitiesPath)) {
    const entXml = readFileSync(entitiesPath, 'utf-8');
    const zombiesDoc = readYaml(join(DATA_DIR, 'zombies.yaml'));
    const existing = new Set((zombiesDoc.zombies || []).map(z => z.id));
    const livingAnimals = [];
    const entityRegex = /<entity_class\s+name="(animal[^"]+)"[^>]*>([\s\S]*?)<\/entity_class>/g;
    let m;
    // Index all entities for extends resolution
    const allEntities = {};
    let em;
    const allRegex = /<entity_class\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/entity_class>/g;
    while ((em = allRegex.exec(entXml)) !== null) allEntities[em[1]] = em[2];
    const resolveProps = (name, depth = 0) => {
      if (depth > 6 || !allEntities[name]) return {};
      const own = {};
      for (const p of allEntities[name].matchAll(/<property\s+name="([^"]+)"\s+value="([^"]*)"/g)) own[p[1]] = p[2];
      // HealthMax via passive_effect (base_set)
      const hm = /<passive_effect\s+name="HealthMax"[^>]*value="([^"]+)"/.exec(allEntities[name]);
      if (hm) own.HealthMax = hm[1];
      const parent = resolveProps(own.Extends, depth + 1);
      return { ...parent, ...own };
    };
    while ((m = entityRegex.exec(entXml)) !== null) {
      const [, name, content] = m;
      if (name.includes('Template')) continue;      // templates
      if (name.toLowerCase().includes('zombie')) continue; // already parsed (undead variants)
      const props = resolveProps(name);
      const hp = parseInt(props.HealthMax || '0');
      const exp = parseFloat(props.ExperienceGain || '0');
      const walk = parseFloat(props.MoveSpeed || '0');
      const run = parseFloat(props.MoveSpeedAggro || props.MoveSpeedRun || '0');
      const animal = {
        id: name,
        name: (locMap.get(name) && locMap.get(name).name) || name,
        category: 'animal',
        tier: 1,
        hp: hp || 100,
        speed: { walk: walk || 1, run: run || 2 },
        damage: { melee: 10 },
        experience: exp || 100,
      };
      if (existing.has(name)) {
        // Already present: only refresh stats (handled below), don't re-add
        livingAnimals.push(null); // placeholder to keep count logic simple
        continue;
      }
      livingAnimals.push(animal);
    }
    // Update existing living animals with real stats (idempotent: merge, don't overwrite names)
    let updated = 0;
    const freshMap = new Map(livingAnimals.filter(Boolean).map(a => [a.id, a]));
    for (const z of zombiesDoc.zombies || []) {
      if (!z.id.startsWith('animal') || z.id.includes('Zombie')) continue;
      const fresh = freshMap.get(z.id);
      if (!fresh) continue;
      if (fresh.hp !== 100) z.hp = fresh.hp;
      if (fresh.experience !== 100) z.experience = fresh.experience;
      if (fresh.speed.walk !== 1) z.speed.walk = fresh.speed.walk;
      if (fresh.speed.run !== 2) z.speed.run = fresh.speed.run;
      updated++;
    }
    // Fix skateboarder zombies classification (humanoid, not animal)
    let fixed = 0;
    for (const z of zombiesDoc.zombies || []) {
      if (z.id.startsWith('zombieSkateboarder') && z.category === 'animal') {
        z.category = 'humanoid';
        fixed++;
      }
    }
    if (livingAnimals.filter(Boolean).length > 0 || fixed > 0) {
      zombiesDoc.zombies.push(...livingAnimals.filter(Boolean));
      writeYaml(join(DATA_DIR, 'zombies.yaml'), zombiesDoc);
    }
    console.log(`  - 活体动物解析: ${livingAnimals.filter(Boolean).length} 个新增, 动物属性更新: ${updated} 个, 暴徒分类修正: ${fixed} 个`);
  }

  // ─── 11b. Blocks ammo cleanup: strip +tags(...) suffix (ammo9mmBulletBall+tags(ammo9mm)) ───
  const blocksDoc2 = readYaml(join(DATA_DIR, 'blocks.yaml'));
  let ammoFixed = 0;
  for (const b of blocksDoc2.blocks || []) {
    if (typeof b.ammo === 'string' && b.ammo.includes('+tags(')) {
      b.ammo = b.ammo.split('+tags(')[0];
      ammoFixed++;
    }
  }
  if (ammoFixed > 0) writeYaml(join(DATA_DIR, 'blocks.yaml'), blocksDoc2);
  console.log(`  - 炮塔弹药清理: ${ammoFixed} 个 +tags 后缀移除`);

  // ─── 12. Zombie HP/XP from entityclasses.xml replace tables (^ref → value) ───
  // passive_effect HealthMax uses ^references (^healthSlim) defined in replace_passive_effect (ZOMBIE_HP_LIST);
  // ExperienceGain uses ^xp* references defined in replace_properties (ZOMBIE_XP_LIST)
  if (existsSync(entityclassesPath)) {
    const ecXml = readFileSync(entityclassesPath, 'utf-8');
    const hpMap = {};
    const blockRe = /<replace_passive_effect>([\s\S]*?)<\/replace_passive_effect>/g;
    let bm;
    while ((bm = blockRe.exec(ecXml)) !== null) {
      const propRe = /<property\s+name="([^"]+)"\s+value="([^"]+)"/g;
      let pm;
      while ((pm = propRe.exec(bm[1])) !== null) hpMap[pm[1]] = parseFloat(pm[2]);
    }
    const xpMap = {};
    const propBlockRe = /<replace_properties>([\s\S]*?)<\/replace_properties>/g;
    let pbm;
    while ((pbm = propBlockRe.exec(ecXml)) !== null) {
      const propRe = /<property\s+name="([^"]+)"\s+value="([^"]+)"/g;
      let pm;
      while ((pm = propRe.exec(pbm[1])) !== null) xpMap[pm[1]] = parseFloat(pm[2]);
    }
    const zombiesDoc = readYaml(join(DATA_DIR, 'zombies.yaml'));
    let hpFilled = 0;
    let xpFilled = 0;
    for (const z of zombiesDoc.zombies || []) {
      if (typeof z.hp === 'string' && z.hp.startsWith('^')) {
        const v = hpMap[z.hp.slice(1)];
        if (v != null) { z.hp = v; hpFilled++; }
      }
      if (typeof z.experience === 'string' && z.experience.startsWith('^')) {
        const v = xpMap[z.experience.slice(1)];
        if (v != null) { z.experience = v; xpFilled++; }
      }
    }
    if (hpFilled > 0 || xpFilled > 0) writeYaml(join(DATA_DIR, 'zombies.yaml'), zombiesDoc);
    console.log(`  - 丧尸血量解析: ${hpFilled} 个引用替换为数值 (replace_passive_effect), 经验解析: ${xpFilled} 个 (replace_properties)`);
  }

  // ─── 12b. Zombie move speed from entityclasses.xml properties (extends chain) ───
  // MoveSpeedAggro is "walk, run" comma format; MoveSpeed is walk-only
  if (existsSync(entityclassesPath)) {
    const ecXml = readFileSync(entityclassesPath, 'utf-8');
    const entities = {};
    const entRe = /<entity_class\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/entity_class>/g;
    let em;
    while ((em = entRe.exec(ecXml)) !== null) {
      const [, name, body] = em;
      const props = {};
      const propRe = /<property\s+name="(MoveSpeed|MoveSpeedAggro|MoveSpeedRun)"\s+value="([^"]+)"/g;
      let pm;
      while ((pm = propRe.exec(body)) !== null) props[pm[1]] = pm[2];
      // extends is a tag attribute (or rarely a property)
      const tagExt = /<entity_class\s+name="[^"]+"\s+extends="([^"]+)"/.exec(em[0]);
      const propExt = /<property\s+name="Extends"\s+value="([^"]+)"/.exec(body);
      entities[name] = { props, extends: tagExt ? tagExt[1] : propExt ? propExt[1] : null };
    }
    const resolveSpeed = (name, depth = 0) => {
      if (depth > 8 || !entities[name]) return {};
      const own = entities[name].props;
      const parent = resolveSpeed(entities[name].extends, depth + 1);
      return { ...parent, ...own };
    };
    // XP references (^xpSlim01 etc.) come from replace_properties (ZOMBIE_XP_LIST)
    const xpMap = {};
    const propBlockRe = /<replace_properties>([\s\S]*?)<\/replace_properties>/g;
    let pbm;
    while ((pbm = propBlockRe.exec(ecXml)) !== null) {
      const propRe = /<property\s+name="([^"]+)"\s+value="([^"]+)"/g;
      let pm;
      while ((pm = propRe.exec(pbm[1])) !== null) xpMap[pm[1]] = parseFloat(pm[2]);
    }
    // Collect ExperienceGain per entity (extends chain)
    const xpEntities = {};
    const entRe2 = /<entity_class\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/entity_class>/g;
    let em2;
    while ((em2 = entRe2.exec(ecXml)) !== null) {
      const [, name, body] = em2;
      const xp = /<property\s+name="ExperienceGain"\s+value="([^"]+)"/.exec(body);
      const tagExt = /<entity_class\s+name="[^"]+"\s+extends="([^"]+)"/.exec(em2[0]);
      xpEntities[name] = { xp: xp ? xp[1] : null, extends: tagExt ? tagExt[1] : null };
    }
    const resolveXp = (name, depth = 0) => {
      if (depth > 8 || !xpEntities[name]) return null;
      if (xpEntities[name].xp != null) return xpEntities[name].xp;
      return resolveXp(xpEntities[name].extends, depth + 1);
    };
    const zombiesDoc = readYaml(join(DATA_DIR, 'zombies.yaml'));
    let speedFilled = 0;
    let xpFilled = 0;
    for (const z of zombiesDoc.zombies || []) {
      if (z.category === 'animal' && !z.id.includes('Zombie')) continue; // living animals already parsed
      const p = resolveSpeed(z.id);
      if (!Object.keys(p).length) continue;
      let walk, run;
      if (p.MoveSpeedAggro) {
        const [w, r] = p.MoveSpeedAggro.split(',').map(s => parseFloat(s.trim()));
        if (!Number.isNaN(w)) walk = w;
        if (!Number.isNaN(r)) run = r;
      }
      if (walk == null && p.MoveSpeed) walk = parseFloat(p.MoveSpeed);
      if (run == null && p.MoveSpeedRun) run = parseFloat(p.MoveSpeedRun);
      if (walk == null && run == null) continue;
      const isDefault = !z.speed || (z.speed.walk === 1 && z.speed.run === 2);
      if (isDefault) {
        if (!z.speed) z.speed = {};
        if (walk != null) z.speed.walk = walk;
        if (run != null) z.speed.run = run;
        speedFilled++;
      }
      // XP: replace placeholder (100) with real chain value
      if (z.experience === 100 && z.category === 'humanoid') {
        const raw = resolveXp(z.id);
        if (raw != null) {
          const val = raw.startsWith('^') ? xpMap[raw.slice(1)] : parseFloat(raw);
          if (val != null && !Number.isNaN(val)) { z.experience = val; xpFilled++; }
        }
      }
    }
    if (speedFilled > 0 || xpFilled > 0) writeYaml(join(DATA_DIR, 'zombies.yaml'), zombiesDoc);
    console.log(`  - 丧尸移速解析: ${speedFilled} 个补全 (extends链 MoveSpeed/MoveSpeedAggro), 经验补全: ${xpFilled} 个`);
  }

  // ─── 13. Zombie melee damage from hand_item (items.xml DamageEntity) ───
  // Zombie damage is defined on their hand items: <property class="Action0"><property name="DamageEntity" .../>
  if (existsSync(itemsPath)) {
    const itemsXml = readFileSync(itemsPath, 'utf-8');
    // Index all meleeHand items + resolve extends chain (meleeHandZombieCop extends meleeHandMaster)
    const handItems = {};
    const itemRegex = /<item\s+name="(meleeHand[^"]+)"[^>]*>([\s\S]*?)<\/item>/g;
    let im;
    while ((im = itemRegex.exec(itemsXml)) !== null) handItems[im[1]] = im[2];
    const resolveHand = (name, depth = 0) => {
      if (depth > 6 || !handItems[name]) return {};
      const own = {};
      const de = /<property\s+name="DamageEntity"\s+value="([^"]+)"/.exec(handItems[name]);
      const db = /<property\s+name="DamageBlock"\s+value="([^"]+)"/.exec(handItems[name]);
      if (de) own.melee = parseFloat(de[1]);
      if (db) own.block = parseFloat(db[1]);
      const ext = /<property\s+name="Extends"\s+value="([^"]+)"/.exec(handItems[name]);
      const parent = resolveHand(ext ? ext[1] : '', depth + 1);
      return { ...parent, ...own };
    };
    const handDamage = new Map();
    for (const name of Object.keys(handItems)) handDamage.set(name, resolveHand(name));
    const zombiesDoc = readYaml(join(DATA_DIR, 'zombies.yaml'));
    let dmgFilled = 0;
    for (const z of zombiesDoc.zombies || []) {
      const d = z.hand_item ? handDamage.get(z.hand_item) : null;
      if (!d || d.melee == null) continue;
      if (!z.damage) z.damage = {};
      z.damage.melee = d.melee;
      if (d.block != null && z.damage.block == null) z.damage.block = d.block;
      dmgFilled++;
    }
    if (dmgFilled > 0) writeYaml(join(DATA_DIR, 'zombies.yaml'), zombiesDoc);
    console.log(`  - 丧尸近战伤害: ${dmgFilled} 个补全 (从手持物品 DamageEntity)`);
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
