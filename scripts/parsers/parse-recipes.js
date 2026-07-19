import { renderTemplate } from './renderer.js';

export function parseRecipe(recipe, refs, template, resolveItemName) {
  const craftRecipe = recipe.recipe?.map(r => ({
    item_id: r.item_id,
    itemName: resolveItemName(r.item_id),
    count: r.count,
  }));

  const scrappableRows = recipe.scrappable_into?.map(s => ({
    item_id: s.item_id,
    itemName: resolveItemName(s.item_id),
    count: s.count,
  }));

  const data = {
    name: recipe.name,
    station: recipe.station,
    craft_time: recipe.craft_time || 0,
    craft_count: recipe.craft_count ?? 1,
    recipe: { rows: craftRecipe },
    scrappable: scrappableRows ? { rows: scrappableRows } : null,
  };

  return renderTemplate(template, data);
}
