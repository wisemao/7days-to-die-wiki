import { renderTemplate } from './renderer.js';

export function parseSkill(skill, refs, template, resolveItemName = (id) => id) {
  const levels = skill.levels?.map(l => ({
    level: l.level,
    effect: l.effect,
    cost: l.cost,
  })) || [];

  const tiedBooks = skill.tied_books?.map(b => ({
    bookName: resolveItemName(b.book_id),
    effect: b.effect,
  })) || [];

  const data = {
    name: skill.name,
    category: skill.category,
    max_level: skill.max_level,
    description: skill.description || '',
    levels: { rows: levels },
    tiedBooks: tiedBooks.length > 0 ? { rows: tiedBooks } : null,
  };

  return renderTemplate(template, data);
}
