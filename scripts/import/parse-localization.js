import { readFileSync } from 'fs';

export function parseLocalization(filePath) {
  if (!filePath) return new Map();
  const text = readFileSync(filePath, 'utf-8');
  const lines = text.split('\n');
  const map = new Map();

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 4) continue;
    const [key, type, chinese] = parts;
    if (type === 'item' || type === 'recipe' || type === 'skill' || type === 'entity') {
      map.set(key, { name: chinese.trim() });
    }
  }

  return map;
}
