# {{name}}



{{#if tier}}
- **品质:** {{tier}}
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

{{#if scrappable}}
## 分解获得

| 材料 | 数量 |
|---|---|
{{#each scrappable.rows}}
| {{itemName}} | {{count}} |
{{/each}}
{{/if}}

{{#if usedInRecipes}}
## 用于以下配方

| 配方 | 工作站 |
|---|---|
{{#each usedInRecipes.rows}}
| [{{name}}](../recipes/{{linkId}}) | {{station}} |
{{/each}}
{{/if}}

{{#if droppedBy}}
## 关联僵尸掉落

| 僵尸 | 概率 |
|---|---|
{{#each droppedBy.rows}}
| [{{name}}](../zombies/{{linkId}}) | {{chance}} |
{{/each}}
{{/if}}
