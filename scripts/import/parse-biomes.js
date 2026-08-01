/**
 * Parse biomes.xml into structured biome data.
 * Extracts: base attributes, ore resources (from layers/resource tags), weather summary.
 */

// Biome Chinese names (not present in localization)
const BIOME_NAMES = {
  pine_forest: '松树林',
  burnt_forest: '烧焦森林',
  desert: '沙漠',
  snow: '雪地',
  wasteland: '荒原',
  underwater: '水下',
};

// Ore/terrain block Chinese names
const RESOURCE_NAMES = {
  terrOreIron: '铁矿', terrOreCoal: '煤矿', terrOrePotassiumNitrate: '硝石矿',
  terrOreLead: '铅矿', terrOreOilShale: '油页岩', terrOreSilver: '银矿',
  terrOreGold: '金矿', terrOreDiamond: '钻石', terrGravel: '砾石',
  terrOreOilDeposit: '油矿藏',
  terrClay: '黏土', terrSand: '沙', terrDirt: '泥土', terrStone: '石头',
  terrBedrock: '基岩', terrForestGround: '森林地面', terrBurntForestGround: '烧焦地面',
  terrDesertGround: '沙漠地面', terrSnowGround: '雪地地面', terrWastelandGround: '荒原地面',
  terrWater: '水', terrWaterMoving: '流动水', terrOreCoalVein: '煤矿脉',
};

const WEATHER_LABELS = {
  default: '晴朗', fog: '雾', rainlight: '小雨', rainheavy: '大雨',
  storm: '风暴', stormbuild: '风暴酝酿', bloodMoon: '血月', snow: '雪', hail: '冰雹',
  twitch_fog: '迷雾(活动)', snowStorm: '暴雪', dry: '干燥', clear: '晴', cloudy: '多云',
};

function extractWeather(biomeBody) {
  // Collect weather entries: name + temperature range + precipitation
  const weathers = [];
  for (const m of biomeBody.matchAll(/<weather name="([^"]+)"[^>]*prob="([^"]+)"[^>]*>([\s\S]*?)<\/weather>/g)) {
    const [, name, prob, body] = m;
    const temp = body.match(/<Temperature\s+range="([^"]+)"|min="([^"]+)"[^>]*max="([^"]+)"/);
    const precip = body.match(/<Precipitation\s+(?:range|min)="([^"]+)"(?:[^>]*max="([^"]+)")?/);
    weathers.push({
      name,
      label: WEATHER_LABELS[name] || name,
      prob: parseFloat(prob),
      temp_range: temp ? (temp[1] || `${temp[2]},${temp[3]}`) : '',
      precip_range: precip ? (precip[2] ? `${precip[1]},${precip[2]}` : precip[1]) : '',
    });
  }
  weathers.sort((a, b) => b.prob - a.prob);
  return weathers;
}

export function parseBiomesXml(xmlText) {
  const biomes = [];
  const regex = /<biome\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/biome>/g;
  let m;
  while ((m = regex.exec(xmlText)) !== null) {
    const [, id, body] = m;

    const attrRegex = /([\w]+)="([^"]*)"/g;
    const attrs = {};
    let a;
    while ((a = attrRegex.exec(m[0])) !== null) {
      if (a[1] !== 'name') attrs[a[1]] = a[2];
    }

    // Ore resources from <resource blockname="..."> tags
    const resources = [];
    const seen = new Set();
    for (const r of body.matchAll(/<resource\s+blockname="([^"]+)"/g)) {
      if (seen.has(r[1])) continue;
      seen.add(r[1]);
      resources.push({
        id: r[1],
        name: RESOURCE_NAMES[r[1]] || r[1],
      });
    }

    // Sub-biome count (ore regions like iron/coal veins)
    const subbiomeCount = (body.match(/<subbiome/g) || []).length;

    // Weather summary
    const weathers = extractWeather(body);
    const tempDefault = weathers.find(w => w.name === 'default');
    const rainTotal = weathers
      .filter(w => /rain|storm/i.test(w.name))
      .reduce((s, w) => s + w.prob, 0);

    biomes.push({
      id,
      name: BIOME_NAMES[id] || id,
      difficulty: attrs.difficulty || '',
      lootstage_modifier: attrs.lootstage_modifier || '',
      lootstage_bonus: attrs.lootstage_bonus || '',
      gamestage_modifier: attrs.gamestage_modifier || '',
      gamestage_bonus: attrs.gamestage_bonus || '',
      buff: attrs.buff || '',
      resources,
      subbiome_count: subbiomeCount,
      weather_count: weathers.length,
      temp_range: tempDefault?.temp_range || '',
      rain_prob: Math.round(rainTotal),
    });
  }
  return biomes;
}
