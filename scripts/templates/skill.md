# {{name}}

- **属性:** {{category}}
- **最高等级:** {{max_level}}
- **描述:** {{description}}

## 等级效果

| 等级 | 效果 | 消耗技能点 |
|---|---|---|
{{#each levels.rows}}
| {{level}} | {{effect}} | {{cost}} |
{{/each}}

## 关联书籍
{{#if tiedBooks}}

| 书籍 | 效果 |
|---|---|
{{#each tiedBooks.rows}}
| {{bookName}} | {{effect}} |
{{/each}}
{{/if}}
