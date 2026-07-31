/**
 * Parse traders.xml to map items available from traders.
 * 3.x structure: <trader_item_group name="groupMeleeAll">...<item name="X"/>...</trader_item_group>
 */

export function parseTradersXml(xmlText) {
  const groups = {};
  const groupRegex = /<trader_item_group\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/trader_item_group>/g;
  let m;
  while ((m = groupRegex.exec(xmlText)) !== null) {
    const [, name, content] = m;
    groups[name] = [...content.matchAll(/<item\s+name="([^"]+)"/g)].map(x => x[1]);
  }

  // All items across all trader groups (deduplicated)
  const itemSet = new Set();
  for (const items of Object.values(groups)) {
    for (const i of items) itemSet.add(i);
  }

  return { groups, items: [...itemSet] };
}
