/**
 * Parse spawning.xml + entitygroups.xml to enrich zombie spawn data.
 * spawning.xml maps biome -> entity group; entitygroups.xml maps group -> entity list.
 */

export function parseSpawningXml(spawningXml, entitygroupsXml) {
  // 1. entitygroups.xml: group name -> entity ids
  // v2.6: <entitygroup name="X">zombieBoe zombieJoe zombieBiker, .3 ...</entitygroup>
  // v3.x: <entitygroup name="X"><e n="zombieBoe" p="0.3"/>...</entitygroup>
  const entityGroups = {};
  const groupRegex = /<entitygroup\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/entitygroup>/g;
  let gm;
  while ((gm = groupRegex.exec(entitygroupsXml)) !== null) {
    const [, name, content] = gm;
    // Tag-based entities: <entity name="X"/> or <e n="X"/>
    const tagEntities = [
      ...[...content.matchAll(/<entity\s+name="([^"]+)"/g)].map(m => m[1]),
      ...[...content.matchAll(/<e\s+n="([^"]+)"/g)].map(m => m[1]),
    ];
    // Space-separated bare ids (optionally "id, weight")
    const bare = content
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(t => t && !t.startsWith('<') && !t.includes('='));
    entityGroups[name] = [...new Set([...tagEntities, ...bare])];
  }

  // 2. spawning.xml: biome -> [group refs]
  const biomeGroups = {};
  const biomeRegex = /<biome\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/biome>/g;
  let bm;
  while ((bm = biomeRegex.exec(spawningXml)) !== null) {
    const [, biome, content] = bm;
    const spawners = [];
    const spawnRegex = /<spawn\s+[^>]*entitygroup="([^"]+)"[^>]*>/g;
    let sm;
    while ((sm = spawnRegex.exec(content)) !== null) {
      spawners.push(sm[1]);
    }
    biomeGroups[biome] = spawners;
  }

  // 3. Build zombie -> biomes map
  const zombieBiomes = {};
  for (const [biome, groups] of Object.entries(biomeGroups)) {
    for (const g of groups) {
      const entities = entityGroups[g] || [];
      for (const e of entities) {
        if (!zombieBiomes[e]) zombieBiomes[e] = [];
        if (!zombieBiomes[e].includes(biome)) zombieBiomes[e].push(biome);
      }
    }
  }

  return { entityGroups, biomeGroups, zombieBiomes };
}
