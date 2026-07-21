const EFFECT_MAP = {
  EntityDamage: 'damage',
  BlockDamage: 'block_damage',
  MaxDurability: 'durability',
  DegradationMax: 'durability',
  AttacksPerMinute: 'attacks_per_min',
  Knockback: 'knockback',
  PowerAttackDamage: 'power_attack_damage',
  PowerAttackStamina: 'power_attack_stamina',
  MaxRange: 'range',
  FireRate: 'fire_rate',
  RoundsPerMinute: 'rounds_per_min',
  MagazineSize: 'magazine_size',
  ReloadSpeedMultiplier: 'reload_speed',
  Penetration: 'penetration',
  EntityPenetrationCount: 'penetration',
  CritChance: 'crit_chance',
  CritDamage: 'crit_damage',
  HeadshotDamage: 'headshot_damage',
  StaggerChance: 'stagger_chance',
  SpreadDegreesHorizontal: 'spread_horizontal',
  SpreadDegreesVertical: 'spread_vertical',
  Recoil: 'recoil',
  AimDownSightTime: 'aim_down_sight_time',
  Mobility: 'mobility',
  RunSpeed: 'run_speed',
  CrouchSpeed: 'crouch_speed',
  Armor: 'armor',
  DamageReduction: 'damage_reduction',
  MovementSpeed: 'movement_speed',
  StaminaRegen: 'stamina_regen',
  StaminaLoss: 'stamina_cost',
  StaminaMax: 'max_stamina',
  StaminaChangeOT: 'stamina_regen_rate',
  ColdResistance: 'cold_resistance',
  HeatResistance: 'heat_resistance',
  HyperthermalResist: 'heat_resistance',
  HypothermalResist: 'cold_resistance',
  FallDamageReduction: 'fall_damage_reduction',
  ExplosiveResistance: 'explosive_resistance',
  PhysicalDamageResist: 'physical_resist',
  ElementalDamageResist: 'elemental_resist',
  GeneralDamageResist: 'damage_reduction',
  Hunger: 'hunger',
  Health: 'health',
  HealthMax: 'max_health',
  Stamina: 'stamina',
  MaxHealthBonus: 'max_health_bonus',
  Healing: 'healing',
  BleedingStop: 'bleeding_stop',
  InfectionCure: 'infection_cure',
  InfectionChance: 'infection_chance',
  Water: 'water',
  WaterLossPerStaminaPointGained: 'water_loss_rate',
  Oxygen: 'oxygen',
  SprintStamina: 'sprint_stamina',
  JumpStamina: 'jump_stamina',
  JumpStrength: 'jump_strength',
  SwimStamina: 'swim_stamina',
  StorageSlots: 'storage_slots',
  CarryCapacity: 'carry_capacity',
  LightIntensity: 'light_intensity',
  TriggerRange: 'trigger_range',
  PowerUsage: 'power_usage',
  FuelCapacity: 'fuel_capacity',
  FuelConsumption: 'fuel_consumption',
  VehicleFuelUsePer: 'fuel_consumption',
  RepairAmount: 'repair_amount',
  ResourceHarvest: 'resource_harvest',
  HarvestCount: 'harvest_count',
  CraftTime: 'craft_time',
  CraftingTime: 'craft_time',
  CraftCount: 'craft_count',
  ModSlots: 'mod_slots',
  BurstRoundCount: 'burst_round_count',
  DamageFalloffRange: 'damage_falloff',
  NoiseMultiplier: 'noise',
  BuffProcChance: 'buff_chance',
  DismemberChance: 'dismember_chance',
  LockPickBreakChance: 'lockpick_break_chance',
  LockPickTime: 'lockpick_time',
  PlayerExpGain: 'exp_gain',
  LootStage: 'loot_stage',
};

export function parseItemsXml(xmlText, locMap = new Map()) {
  const items = [];
  const itemRegex = /<item\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const [_, name, content] = match;
    const item = {
      id: name,
      name: locMap.get(name)?.name || name,
      category: 'material',
      stack_size: 1,
    };

    const propRegex = /<property\s+name="([^"]+)"\s+value="([^"]*)"\s*\/?>/g;
    let propMatch;
    while ((propMatch = propRegex.exec(content)) !== null) {
      const [_, propName, propValue] = propMatch;
      if (propName === 'Stacknumber') item.stack_size = parseInt(propValue) || 1;
      if (propName === 'EconomicValue' || propName === 'Tier') item.tier = parseInt(propValue) || 1;
      if (propName === 'CustomIcon' || propName === 'Icon') item.icon = propValue;
      if (propName === 'Description') item.description = locMap.get(propValue)?.name || propValue;
    }

    let stats = {};
    const effectRegex = /<passive_effect\s+name="([^"]+)"[^>]*value="([^"]+)"/g;
    let effectMatch;
    while ((effectMatch = effectRegex.exec(content)) !== null) {
      const [_, effectName, effectValue] = effectMatch;
      const mappedName = EFFECT_MAP[effectName];
      if (mappedName) {
        const val = parseFloat(effectValue);
        if (mappedName === 'resource_harvest') {
          if (!stats.resource_harvest) stats.resource_harvest = {};
          const tagMatch = content.match(/tags="([^"]*)"/);
          if (tagMatch) {
            const tags = tagMatch[1].split(',');
            for (const tag of tags) {
              const t = tag.trim();
              if (t) stats.resource_harvest[t] = val;
            }
          }
        } else {
          stats[mappedName] = val;
        }
      }
    }
    if (Object.keys(stats).length > 0) item.stats = stats;

    const tagsRegex = /<property\s+name="(Group|Tags)"\s+value="([^"]+)"/g;
    let tagsMatch;
    while ((tagsMatch = tagsRegex.exec(content)) !== null) {
      const tags = tagsMatch[2];
      if (tags.includes('food') || tags.includes('canFood')) item.category = 'food';
      else if (tags.includes('medical')) item.category = 'medical';
      else if (tags.includes('ammo')) item.category = 'ammo';
      else if (tags.includes('armor') || tags.includes('clothing')) item.category = 'armor';
      else if (tags.includes('tool')) item.category = 'tool';
      else if (tags.includes('weapon')) item.category = 'ranged_weapon';
      else if (tags.includes('melee')) item.category = 'melee_weapon';
      else if (tags.includes('mod')) item.category = 'mod';
      else if (tags.includes('resource') || tags.includes('material')) item.category = 'material';
      else if (tags.includes('vehicle')) item.category = 'vehicle';
      else if (tags.includes('trap')) item.category = 'trap';
    }

    items.push(item);
  }

  return items;
}
