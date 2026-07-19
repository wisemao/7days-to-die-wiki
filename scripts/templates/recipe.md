# {{name}}

**工作站:** {{station}}
**耗时:** {{craft_time}} 秒
**产出数量:** {{craft_count}}

## 配方材料

| 材料 | 数量 |
|---|---|
{{#each recipe.rows}}
| [{{itemName}}](/vanilla/items/{{item_id}}) | {{count}} |
{{/each}}

## 分解获得
{{#if scrappable}}

| 材料 | 数量 |
|---|---|
{{#each scrappable.rows}}
| [{{itemName}}](/vanilla/items/{{item_id}}) | {{count}} |
{{/each}}
{{/if}}
