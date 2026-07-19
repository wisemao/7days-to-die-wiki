export function parseRecipesXml(xmlText, locMap = new Map()) {
  const recipes = [];
  const recipeRegex = /<recipe\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/recipe>/g;
  let match;

  while ((match = recipeRegex.exec(xmlText)) !== null) {
    const [_, name, content] = match;
    const recipe = {
      id: name,
      name: locMap.get(name)?.name || name,
      station: '背包合成',
      craft_time: 1,
      craft_count: 1,
      recipe: [],
    };

    const countMatch = /count="(\d+)"/.exec(match[0]);
    if (countMatch) recipe.craft_count = parseInt(countMatch[1]);

    const timeMatch = /craft_time="([\d.]+)"/.exec(match[0]);
    if (timeMatch) recipe.craft_time = parseFloat(timeMatch[1]);

    const areaMatch = /craft_area="([^"]+)"/.exec(match[0]);
    if (areaMatch) {
      const areaMap = {
        'crafting': '背包合成',
        'forge': '熔炉',
        'campfire': '营火',
        'workbench': '工作台',
        'chemistryStation': '化学台',
        'cementMixer': '混凝土搅拌机',
        'anvil': '锻造炉',
      };
      recipe.station = areaMap[areaMatch[1]] || areaMatch[1];
    }

    const ingRegex = /<ingredient\s+name="([^"]+)"\s+count="(\d+)"/g;
    let ingMatch;
    while ((ingMatch = ingRegex.exec(content)) !== null) {
      recipe.recipe.push({ item_id: ingMatch[1], count: parseInt(ingMatch[2]) });
    }

    recipes.push(recipe);
  }

  return recipes;
}
