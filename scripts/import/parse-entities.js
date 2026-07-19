export function parseEntitiesXml(xmlText) {
  const zombies = [];
  const entityRegex = /<entity_class\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/entity_class>/g;
  let match;

  while ((match = entityRegex.exec(xmlText)) !== null) {
    const [_, name, content] = match;

    if (!name.toLowerCase().includes('zombie')) continue;

    const zombie = {
      id: name,
      name,
      category: 'humanoid',
      tier: 1,
      hp: 100,
      speed: { walk: 1, run: 2 },
      damage: { melee: 10 },
      experience: 100,
    };

    const hpMatch = /<property\s+name="max_health"\s+value="(\d+)"/.exec(content);
    if (hpMatch) zombie.hp = parseInt(hpMatch[1]);

    const expMatch = /<property\s+name="experience_gain"\s+value="([\d.]+)"/.exec(content);
    if (expMatch) zombie.experience = parseFloat(expMatch[1]);

    const walkMatch = /<property\s+name="MoveSpeed"\s+value="([\d.]+)"/.exec(content);
    if (walkMatch) zombie.speed.walk = parseFloat(walkMatch[1]);

    const runMatch = /<property\s+name="MoveSpeedRun"\s+value="([\d.]+)"/.exec(content);
    if (runMatch) zombie.speed.run = parseFloat(runMatch[1]);

    if (name.toLowerCase().includes('bear') || name.toLowerCase().includes('dog') || name.toLowerCase().includes('cat') || name.toLowerCase().includes('deer') || name.toLowerCase().includes('rabbit')) {
      zombie.category = 'animal';
    }

    zombies.push(zombie);
  }

  return zombies;
}
