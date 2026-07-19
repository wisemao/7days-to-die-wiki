# {{name}}

- **类型:** {{categoryLabel}}
- **等级:** {{tier}}
- **HP:** {{hp}}

## 属性

| 属性 | 值 |
|---|---|
{{#each statsTable}}
| {{key}} | {{value}} |
{{/each}}

## 掉落物

| 物品 | 数量 | 概率 |
|---|---|---|
{{#each loot.rows}}
| [{{itemName}}](/vanilla/items/{{itemLinkId}}) | {{count}} | {{chance}} |
{{/each}}

## 弱点
{{#if weakness}}
{{#each weakness}}
- {{.}}
{{/each}}
{{/if}}

## 刷新

- **生物群系:** {{spawn.biomes}}
- **时间:** {{spawn.time}}
- **区域:** {{spawn.groups}}
