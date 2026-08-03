/**
 * Parse item_modifiers.xml to extract weapon/armor/vehicle mods.
 * Mods are separate from items (items.yaml only has mod schematics).
 * Returns mod entries compatible with the items.yaml format.
 */

export function parseModsXml(xmlText, locMap = new Map()) {
  const mods = [];
  const modRegex = /<item_modifier\s+name="([^"]+)"([^>]*)>([\s\S]*?)<\/item_modifier>/g;
  let m;

  while ((m = modRegex.exec(xmlText)) !== null) {
    const [, name, attrs, content] = m;
    const installable = attrs.match(/installable_tags="([^"]+)"/);
    const modifierTags = attrs.match(/modifier_tags="([^"]+)"/);

    const mod = {
      id: name,
      name: locMap.get(name)?.name || name,
      category: 'mod',
      installable_tags: installable ? installable[1] : '',
      modifier_tags: modifierTags ? modifierTags[1] : '',
    };

    const props = [...content.matchAll(/<property\s+name="([^"]+)"\s+value="([^"]*)"/g)];
    for (const [_, pn, pv] of props) {
      if (pn === 'UnlockedBy') mod.unlocked_by = pv;
      if (pn === 'LightValue') mod.light_value = parseFloat(pv);
      if (pn === 'EconomicValue') mod.tier = parseInt(pv);
      if (pn === 'CustomIcon' || pn === 'Icon') mod.icon = pv;
      if (pn === 'Tags') mod.tags = pv;
      if (pn === 'Stacknumber') mod.stack_size = parseInt(pv) || 1;
    }

    // Mod effects: passive_effect entries (name/operation/value), deduplicated
    const effects = [];
    const seenEffects = new Set();
    for (const pe of content.matchAll(/<passive_effect\s+name="([^"]+)"\s+operation="([^"]+)"\s+value="([^"]+)"/g)) {
      const key = pe[1] + '|' + pe[2] + '|' + pe[3];
      if (seenEffects.has(key)) continue;
      seenEffects.add(key);
      effects.push({ name: pe[1], op: pe[2], value: pe[3] });
    }
    if (effects.length) mod.effects = effects;

    mods.push(mod);
  }
  return mods;
}
