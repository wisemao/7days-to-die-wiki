import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

export function buildCrossReferences(datasets) {
  const { items, recipes, skills, zombies } = datasets;

  const itemMap = new Map(items.map(i => [i.id, i]));

  const itemRecipes = new Map();
  for (const recipe of recipes) {
    for (const mat of recipe.recipe) {
      if (!itemRecipes.has(mat.item_id)) itemRecipes.set(mat.item_id, []);
      itemRecipes.get(mat.item_id).push(recipe);
    }
  }

  const zombieLoot = new Map();
  for (const zombie of zombies) {
    for (const loot of (zombie.loot || [])) {
      if (!zombieLoot.has(loot.item_id)) zombieLoot.set(loot.item_id, []);
      zombieLoot.get(loot.item_id).push(zombie);
    }
  }

  function resolveItemName(id) {
    const item = itemMap.get(id);
    return item ? item.name : id;
  }

  return {
    refs: { itemRecipes, zombieLoot },
    resolveItemName,
    itemMap,
  };
}
