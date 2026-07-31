/**
 * Parse food/medical/drink item effects from items.xml effect_group blocks.
 * In 7 Days to Die, consumable effects are defined via triggered_effect ModifyCVar
 * on the item itself (not in buffs.xml).
 *
 * Output: Map<itemId, effects> where effects is a flat stats object:
 *   { hunger, water, health, stamina, infection_cure, dysentery_cure, buff_duration }
 */

const CVAR_MAP = {
  '$foodAmountAdd': 'hunger',
  '$waterAmountAdd': 'water',
  'foodHealthAmount': 'health',
  'medicalRegHealthAmount': 'health',
  '.foodStaminaBonusAdd': 'stamina',
  '$buffInfectionAddCurePerc': 'infection_cure',
  '$buffDysenteryAddCurePerc': 'dysentery_cure',
};

export function parseItemEffects(xmlText) {
  const result = {};
  const itemRegex = /<item\s+name="([^"]+)"[\s\S]*?<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const [full, name] = match;
    const effects = {};
    // Primary effects: ModifyCVar add operations
    const cvarRegex = /action="ModifyCVar"\s+cvar="([^"]+)"\s+operation="add"\s+value="([^"]+)"/g;
    let cm;
    while ((cm = cvarRegex.exec(full)) !== null) {
      const mapped = CVAR_MAP[cm[1]];
      if (mapped) {
        const val = parseFloat(cm[2]);
        // Keep the largest value for the same stat (e.g. tiered food groups)
        if (!(mapped in effects) || val > effects[mapped]) effects[mapped] = val;
      }
      // Buff durations: $buffXxxDuration = seconds
      if (/^\$buff.+(Duration|RunDuration)$/.test(cm[1])) {
        effects.buff_duration = Math.max(effects.buff_duration || 0, parseFloat(cm[2]));
      }
    }
    // Buff references (e.g. <property name="Buff" value="buffXXX"/>)
    const buffRefs = [...full.matchAll(/<property\s+name="Buff"\s+value="([^"]+)"/g)].map(b => b[1]);
    if (buffRefs.length) effects.buffs = buffRefs;

    if (Object.keys(effects).length > 0) result[name] = effects;
  }
  return result;
}

export function formatEffectStats(effects) {
  const stats = {};
  if (effects.hunger) stats.hunger = effects.hunger;
  if (effects.water) stats.water = effects.water;
  if (effects.health) stats.health = effects.health;
  if (effects.stamina) stats.stamina = effects.stamina;
  if (effects.infection_cure) stats.infection_cure = `${effects.infection_cure}%`;
  if (effects.dysentery_cure) stats.dysentery_cure = `${effects.dysentery_cure}%`;
  if (effects.buff_duration) stats.buff_duration = `${Math.round(effects.buff_duration / 60)} 分钟`;
  return stats;
}
