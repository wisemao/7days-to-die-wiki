export function parseProgressionXml(xmlText) {
  const skills = [];
  const skillRegex = /<perk\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/perk>/g;
  let match;

  while ((match = skillRegex.exec(xmlText)) !== null) {
    const [_, name, content] = match;
    const skill = {
      id: name,
      name,
      category: 'strength',
      max_level: 1,
      levels: [],
      description: '',
    };

    const maxMatch = /max_level="(\d+)"/.exec(match[0]);
    if (maxMatch) skill.max_level = parseInt(maxMatch[1]);

    const nameMatch = /name_key="([^"]+)"/.exec(match[0]);
    if (nameMatch) skill.name = nameMatch[1];

    const attrMatch = /parent_attribute="([^"]+)"/.exec(match[0]);
    if (attrMatch) skill.category = attrMatch[1].toLowerCase();

    const levelRegex = /<level\s+([^>]*?)\/?\s*>/g;
    let levelMatch;
    let levelNum = 1;
    while ((levelMatch = levelRegex.exec(content)) !== null) {
      const attrs = levelMatch[1];
      const descMatch = /description="([^"]+)"/.exec(attrs);
      const costMatch = /cost="(\d+)"/.exec(attrs);
      skill.levels.push({
        level: levelNum,
        effect: descMatch ? descMatch[1] : '',
        cost: costMatch ? parseInt(costMatch[1]) : levelNum,
      });
      levelNum++;
    }

    const descMatch = /desc\w*="([^"]+)"/.exec(content);
    if (descMatch) skill.description = descMatch[1];

    skills.push(skill);
  }

  return skills;
}
