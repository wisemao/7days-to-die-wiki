# {{name}}
{{#if tier}}
- **等级:** {{tier}}
{{/if}}
- **类型:** {{categoryLabel}}
- **堆叠:** {{stack_size}}
{{#if description}}
- **描述:** {{description}}
{{/if}}

{{#if statsTable.length}}
## 基础属性

| 属性 | 值 |
|---|---|
{{#each statsTable}}
| {{key}} | {{value}} |
{{/each}}
{{/if}}

{{#if craftRecipes.length}}
## 制作配方

{{#each craftRecipes}}
**工作站:** {{station}}
**耗时:** {{craft_time}} 秒
**产出数量:** {{craft_count}}

| 材料 | 数量 |
|---|---|
{{#each materials}}
| [{{itemName}}](../items/{{linkId}}) | {{count}} |
{{/each}}

{{/each}}
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
| [{{name}}](../recipes/{{linkId}}) | {{station}} |
{{/each}}
{{/if}}

## 关联僵尸掉落
{{#if droppedBy}}

| 僵尸 | 概率 |
|---|---|
{{#each droppedBy.rows}}
| [{{name}}](../zombies/{{linkId}}) | {{chance}} |
{{/each}}
{{/if}}
