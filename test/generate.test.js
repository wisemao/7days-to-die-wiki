import { describe, it } from 'node:test';
import assert from 'node:assert';
import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { buildCrossReferences } from '../scripts/utils/cross-ref.js';
import { renderTemplate } from '../scripts/parsers/renderer.js';

describe('renderTemplate', () => {
  it('renders basic variable substitution', () => {
    assert.strictEqual(renderTemplate('Hello {{name}}!', { name: 'World' }), 'Hello World!');
  });
  it('handles {{#if}} true branch', () => {
    assert.strictEqual(renderTemplate('{{#if show}}visible{{/if}}', { show: true }), 'visible');
  });
  it('handles {{#if}} false branch', () => {
    assert.strictEqual(renderTemplate('{{#if show}}hidden{{/if}}', { show: false }), '');
  });
  it('handles {{#each}} iteration', () => {
    const result = renderTemplate('{{#each items}}|{{item}}|{{/each}}', { items: [{item:'a'},{item:'b'}] });
    assert.strictEqual(result, '|a|\n|b|');
  });
  it('returns empty string for undefined variable', () => {
    assert.strictEqual(renderTemplate('{{undefined}}', {}), '');
  });
});

describe('buildCrossReferences', () => {
  const items = [
    { id: 'iron', name: '铁', category: 'material' },
    { id: 'clay', name: '黏土', category: 'material' },
    { id: 'forged-iron', name: '锻铁', category: 'material' },
  ];
  const recipes = [
    { id: 'forged-iron', name: '锻铁', station: '熔炉', recipe: [{ item_id: 'iron', count: 6 }, { item_id: 'clay', count: 10 }] },
  ];
  const zombies = [
    { id: 'zombie-bear', name: '僵尸熊', loot: [{ item_id: 'iron', count: 4, chance: '100%' }] },
  ];

  const { refs, resolveItemName, itemMap } = buildCrossReferences({ items, recipes, skills: [], zombies });

  it('builds itemMap', () => {
    assert.strictEqual(itemMap.get('iron').name, '铁');
  });
  it('resolveItemName returns name for known id', () => {
    assert.strictEqual(resolveItemName('iron'), '铁');
  });
  it('resolveItemName returns id for unknown', () => {
    assert.strictEqual(resolveItemName('nonexistent'), 'nonexistent');
  });
  it('itemRecipes shows which recipes use an item', () => {
    assert.strictEqual(refs.itemRecipes.get('iron').length, 1);
    assert.strictEqual(refs.itemRecipes.get('iron')[0].id, 'forged-iron');
  });
  it('zombieLoot shows which zombies drop an item', () => {
    assert.strictEqual(refs.zombieLoot.get('iron').length, 1);
    assert.strictEqual(refs.zombieLoot.get('iron')[0].id, 'zombie-bear');
  });
});

describe('parser integration', () => {
  it('items.yaml can be parsed by js-yaml', () => {
    const data = load(readFileSync('data/vanilla/items.yaml', 'utf-8'));
    assert.ok(Array.isArray(data.items));
    assert.ok(data.items.length > 0);
  });
  it('recipes.yaml can be parsed', () => {
    const data = load(readFileSync('data/vanilla/recipes.yaml', 'utf-8'));
    assert.ok(Array.isArray(data.recipes));
  });
  it('skills.yaml can be parsed', () => {
    const data = load(readFileSync('data/vanilla/skills.yaml', 'utf-8'));
    assert.ok(Array.isArray(data.skills));
  });
  it('zombies.yaml can be parsed', () => {
    const data = load(readFileSync('data/vanilla/zombies.yaml', 'utf-8'));
    assert.ok(Array.isArray(data.zombies));
  });
});
