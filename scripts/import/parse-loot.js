/**
 * Parse loot.xml to build loot container -> item mappings.
 * Used to resolve zombie loot containers (zPackReg etc.) into actual items.
 *
 * Structure:
 *   <lootcontainer name="zPackReg" ...><item group="groupZpackReg"/></lootcontainer>
 *   <lootgroup name="groupZpackReg"><item name="resourceX" count="1" prob="0.04"/></lootgroup>
 * Group references can be nested (<item group="..."/> inside lootgroup).
 */

export function parseLootXml(xmlText, maxDepth = 6) {
  // 1. Parse all lootgroups
  const groups = {};
  const groupRegex = /<lootgroup\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/lootgroup>/g;
  let gm;
  while ((gm = groupRegex.exec(xmlText)) !== null) {
    const [, name, content] = gm;
    const items = [];
    const itemRegex = /<item\s+name="([^"]+)"\s+count="([^"]+)"(?:\s+prob="([^"]+)")?/g;
    let im;
    while ((im = itemRegex.exec(content)) !== null) {
      items.push({
        item_id: im[1],
        count: im[2],
        prob: im[3] || null,
      });
    }
    // Also capture group references
    const refRegex = /<item\s+group="([^"]+)"/g;
    let rm;
    const refs = [];
    while ((rm = refRegex.exec(content)) !== null) refs.push(rm[1]);
    groups[name] = { items, refs };
  }

  // 2. Parse lootcontainers
  const containers = {};
  const containerRegex = /<lootcontainer\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/lootcontainer>/g;
  let cm;
  while ((cm = containerRegex.exec(xmlText)) !== null) {
    const [, name, content] = cm;
    const refs = [...content.matchAll(/<item\s+group="([^"]+)"/g)].map(m => m[1]);
    const items = [...content.matchAll(/<item\s+name="([^"]+)"\s+count="([^"]+)"(?:\s+prob="([^"]+)")?/g)].map(m => ({
      item_id: m[1], count: m[2], prob: m[3] || null,
    }));
    containers[name] = { refs, items };
  }

  // 3. Resolve container -> flattened item list (recursive with depth limit)
  function resolveGroup(name, depth, seen) {
    if (depth > maxDepth || seen.has(name)) return [];
    const g = groups[name];
    if (!g) return [];
    seen.add(name);
    const result = [...g.items];
    for (const ref of g.refs) {
      result.push(...resolveGroup(ref, depth + 1, seen));
    }
    seen.delete(name);
    return result;
  }

  const resolved = {};
  for (const [cname, c] of Object.entries(containers)) {
    const list = [...c.items];
    for (const ref of c.refs) {
      list.push(...resolveGroup(ref, 0, new Set()));
    }
    // Deduplicate by item_id, keep highest prob
    const byId = new Map();
    for (const l of list) {
      const existing = byId.get(l.item_id);
      if (!existing) byId.set(l.item_id, l);
      else if ((l.prob ? parseFloat(l.prob) : 1) > (existing.prob ? parseFloat(existing.prob) : 1)) byId.set(l.item_id, l);
    }
    resolved[cname] = [...byId.values()];
  }

  return { groups, containers, resolved };
}
