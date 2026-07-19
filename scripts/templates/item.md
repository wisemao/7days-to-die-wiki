# {{name}}
{{#if tier}}
- **等级:** {{tier}}
{{/if}}
- **类型:** {{categoryLabel}}
- **堆叠:** {{stack_size}}
{{#if description}}
- **描述:** {{description}}
{{/if}}

## 基础属性
{{#if statsTable.length}}

| 属性 | 值 |
|---|---|
{{#each statsTable}}
| {{key}} | {{value}} |
{{/each}}
{{/if}}

## 制作配方
{{#if hasCraft}}
**工作站:** {{craft.station}}
{{#if craft.craft_time}}
**耗时:** {{craft.craft_time}} 秒
{{/if}}

| 材料 | 数量 |
|---|---|
{{#each craft.recipe}}
| {{itemName}} | {{count}} |
{{/each}}
{{/if}}
{{#if craft.recipes_locked_by}}
**需要解锁:** {{lockBookName}}
{{/if}}

## 分解获得
{{#if scrappable}}

| 材料 | 数量 |
|---|---|
{{#each scrappable.rows}}
| {{itemName}} | {{count}} |
{{/each}}
{{/if}}

## 用于以下配方
{{#if usedInRecipes}}

| 配方 | 工作站 |
|---|---|
{{#each usedInRecipes.rows}}
| [{{name}}](/vanilla/recipes/{{id}}) | {{station}} |
{{/each}}
{{/if}}

## 关联僵尸掉落
{{#if droppedBy}}

| 僵尸 | 概率 |
|---|---|
{{#each droppedBy.rows}}
| [{{name}}](/vanilla/zombies/{{id}}) | {{chance}} |
{{/each}}
{{/if}}
