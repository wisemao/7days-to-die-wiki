# Wiki 内容优化设计

## 背景

七日杀 Wiki 项目通过解析游戏 XML 数据，自动生成 VitePress 文档。当前内容存在三类问题：技能页面显示占位符名称（如 `perkMiner69rName`）、页面格式有多余空行、索引页过于简陋、物品页缺少图标。

---

## 改动 1：修复技能名称解析器

**文件：** `scripts/import/parse-progression.js:20-21`

**问题：** 第 10 行已通过 `locMap` 正确获取中文本地化名称，但第 21 行用 `name_key` 属性值覆盖了它。

**修复：** 删除覆盖逻辑，使本地化名称优先。如本地化未命中，则使用 `name_key` 作为后备。

```js
// 改为
skill.name = locMap.get(name)?.name || nameMatch?.[1] || name;
// 删除原第 21-22 行
```

**影响：** 重新导入后所有 59 个技能名显示正确中文。

---

## 改动 2：优化渲染输出格式

**文件：** `scripts/parsers/renderer.js:55`

**问题：** `{{#if}}`/`{{#each}}` 条件块被跳过时留下多余空行，渲染器清理不够彻底。

**修复：** 增强渲染器，在条件块输出空时吃掉其周围的换行符。

```
改动前:     "## 分解获得\n\n\n\n## 用于以下配方"
改动后:     "## 分解获得\n\n## 用于以下配方"
```

---

## 改动 3：补全导航与索引页

**新增 `docs/vanilla/index.md`** 作为原版内容总入口。

**增强 4 个索引页**（items/recipes/skills/zombies），在生成器中增加统计逻辑，自动写出包含分类概览的索引内容。索引页随数据重新生成自动同步。

**不动 `docs/index.md`**，已有的主入口页面良好。

---

## 改动 4：完善交叉引用（酌情处理）

- 确认僵尸掉落数据流向正确：`parse-entities.js` → `zombies.yaml` → `refs.zombieLoot` → 物品页
- 如果解析器提取不完整，更新解析逻辑
- 如果游戏 XML 无此数据，通过 `data/patches/` 补全

此改动的幅度取决于实际数据缺失情况，实施时评估。

---

## 改动 5：恢复物品图标显示

**文件：** `scripts/templates/item.md`

**背景：** `docs/.vitepress/public/images/items/` 目录已存在 1212 张物品图标 PNG。`parse-items.js` 已具备图标检测能力（`hasIcon` + `data.icon`），但模板中的 `![...](...)` 引用在之前的构建失败中被移除。

**问题当时：** 模板硬编码了 `/7days-to-die-wiki/images/items/{{icon}}.png`，当 VitePress 的 `base` 配置与之不匹配时导致死链接，且没有检测文件是否存在。

**现在已具备修复条件：**
1. `hasIcon` 检测已到位——仅当文件实际存在时才设置 `data.icon`
2. `base: '/7days-to-die-wiki/'` 已在 `config.ts` 中配置

**修复：** 在 `item.md` 模板 `{{name}}` 下方重新添加图片引用。使用 VitePress 标准路径 `/images/items/{{icon}}.png`，由 `{{#if icon}}` 守卫：

```md
# {{name}}

{{#if icon}}
![](/images/items/{{icon}}.png)
{{/if}}
```

**效果：** 约 1212 个有图标物品显示对应图标，无图标的物品不显示破损图片。

---

## 实施步骤

1. 修复技能名称解析器
2. 优化渲染器空白处理
3. 恢复物品模板图标显示
4. 补全索引页（生成器+新文件）
5. 检查交叉引用完整性
6. 重新生成全部文档
7. 验证构建通过

## 涉及文件清单

| 文件 | 改动类型 |
|---|---|
| `scripts/import/parse-progression.js` | 修复 |
| `scripts/parsers/renderer.js` | 优化 |
| `scripts/templates/item.md` | 恢复图标 |
| `scripts/generate.js` | 新增索引逻辑 |
| `docs/vanilla/index.md` | 新建 |
| `docs/vanilla/items/index.md` | 更新 |
| `docs/vanilla/recipes/index.md` | 更新 |
| `docs/vanilla/skills/index.md` | 更新 |
| `docs/vanilla/zombies/index.md` | 更新 |

## 非改动范围

- 不重构生成器整体架构
- 不动已有样式/主题配置
- 不新增文档类型
- 不写测试（生成器已有基本功能，此改动风险低）
