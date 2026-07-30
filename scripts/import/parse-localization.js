import { readFileSync } from 'fs';

export function parseLocalization(filePath) {
  if (!filePath) return new Map();
  const text = readFileSync(filePath, 'utf-8');
  const lines = text.split('\n');
  if (lines.length === 0) return new Map();
  const map = new Map();

  // Detect delimiter: tabs in header = tab-separated, commas = CSV
  const header = lines[0];
  const delimiter = header.includes('\t') ? '\t' : ',';
  const headers = header.split(delimiter).map(h => h.trim());
  const typeIdx = headers.indexOf('Type');
  const keyIdx = headers.indexOf('Key');
  const chineseIdx = headers.indexOf('schinese');
  const englishIdx = headers.indexOf('english');

  if (keyIdx === -1) return map; // can't parse

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split (handles quoted fields with commas)
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === delimiter && !inQuotes) { parts.push(current); current = ''; }
      else current += ch;
    }
    parts.push(current);

    const key = parts[keyIdx]?.trim();
    const type = typeIdx >= 0 ? parts[typeIdx]?.trim() : '';
    const chineseName = chineseIdx >= 0 ? parts[chineseIdx]?.trim() : '';
    const englishName = englishIdx >= 0 ? parts[englishIdx]?.trim() : '';

    if (!key) continue;

    const name = chineseName || englishName;
    // Accept all item/equipment/perk/block related types - covers singular, plural, and game-specific variants
    const itemTypes = new Set([
      'item','items','gun','food','tool','tools','ammo','vehicle','vehicles','mod',
      'clothes','medical','melee','farming','workstation','workstations','resource',
      'armor','ammo and guns','part','electrical','robotics','thrown','twitchdrop',
      'perk  book','perk book','perk','perk str','perk for','perk per','perk agi','perk int',
      'buff','buff','entity','block','recipe','skill','challenge','container','sign',
    ]);
    if (name && (itemTypes.has(type.toLowerCase()) || type.startsWith('perk') || type.startsWith('quest') || type.startsWith('buff'))) {
      map.set(key, { name });
    }
  }

  return map;
}
