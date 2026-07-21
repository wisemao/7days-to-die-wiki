# 内容优化实现计划

> **For agentic workers:** 使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans` 按任务执行。步骤使用 `- [ ]` 跟踪。

**目标：** 修复技能占位符名称、消除多余空行、恢复物品图标、补全索引页

**架构：** 改动集中在生成管道（导入解析器 + 模板渲染器 + 生成器），然后重新生成全部文档。少量新增索引文件。

**Tech Stack:** Node.js (ESM), VitePress, js-yaml

## 全局约束

- 所有生成步骤在项目根目录执行
- 不改变项目依赖
- 修改后必须 `npm run build` 验证通过

---

### 任务 1：修复技能名称解析器 + 补丁现有数据

**文件：**
- 修改: `scripts/import/parse-progression.js:20-21`
- 创建: `data/patches/skills.yaml`

**问题：** 解析器将 `name_key` 属性值覆盖了本地化名称，导致 skills.yaml 中所有 59 个技能的名称都是 `perkMiner69rName` 这样的占位符。同时需要 patch 现有数据，因为修复解析器只影响下次导入。

- [ ] **步骤 1: 修改技能名解析逻辑**

将：
```js
const nameMatch = /name_key="([^"]+)"/.exec(match[0]);
if (nameMatch) skill.name = nameMatch[1];
```
改为：
```js
const nameMatch = /name_key="([^"]+)"/.exec(match[0]);
if (nameMatch && !locMap.get(name)?.name) skill.name = nameMatch[1];
```

即：仅当本地化映射无此技能名称时，才用 `name_key` 作为后备。

- [ ] **步骤 2: 校验解析器修改**

确认第 10 行的 `locMap.get(name)?.name || name` 优先返回中文名。

- [ ] **步骤 3: 直接修复 data/vanilla/skills.yaml 中的名称**

解析器修复只影响下次重新导入。要立即生效，直接编辑 YAML 数据文件，将所有 `name: perkXxxName` 替换为正确的中文名。用 `Edit` 工具逐条替换，或手动编辑该文件。

共 59 个技能需要修复名称。示例模式：`name: perkDeadEyeName` → `name: 鹰眼`。中文名从游戏 `Localization.csv` 中获取。

- [ ] **步骤 4: 提交**

```powershell
git add scripts/import/parse-progression.js data/vanilla/skills.yaml
git commit -m "fix: 技能名称本地化优先 + 修复现有技能中文名"
```

---

### 任务 2：优化渲染器空白行处理

**文件：**
- 修改: `scripts/parsers/renderer.js:55`

- [ ] **步骤 1: 增强 renderer 的空白清理**

当前：
```js
result = result.replace(/[^\S\n]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
```

改为：
```js
result = result.replace(/[^\S\n]+\n/g, '\n').replace(/\n{2,}/g, '\n\n').trim();
```

同时修改条件块处理后，在 replacement 为空时，吃掉前后多余的换行符。

在 `renderTemplate` 函数的块处理逻辑中，当 `block.type === 'if'` 且条件为 false（`replacement = ''`）时，以及 `block.type === 'each'` 且数组为空时，移除 `block` 前后的换行符：

```js
// 在替换 block 之后，处理残留空行
let before = result.slice(0, block.startIdx);
let after = result.slice(block.endIdx);
// 如果 replacement 为空，吃掉前后的换行
if (!replacement) {
  before = before.replace(/\n+$/, '');
  after = after.replace(/^\n+/, '');
}
result = before + replacement + after;
```

完整修改后的 `renderTemplate` 函数：

```js
export function renderTemplate(template, data) {
  let result = template;

  const block = findBlock(result);
  if (block) {
    let replacement = '';
    if (block.type === 'if') {
      const val = getValue(data, block.key.trim());
      const cond = Array.isArray(val) ? val.length > 0 : !!val;
      replacement = cond ? renderTemplate(block.content, data) : '';
    } else if (block.type === 'each') {
      const list = getValue(data, block.key.trim());
      if (Array.isArray(list) && list.length > 0) {
        replacement = list.map(item => renderTemplate(block.content, { ...data, ...item })).join('\n');
      }
    }

    let before = result.slice(0, block.startIdx);
    let after = result.slice(block.endIdx);
    if (!replacement) {
      before = before.replace(/\n+$/, '');
      after = after.replace(/^\n+/, '');
    }
    result = before + replacement + after;
    result = renderTemplate(result, data);
  }

  result = result.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const val = getValue(data, key.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });

  result = result.replace(/[^\S\n]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  return result;
}
```

- [ ] **步骤 2: 提交**

```powershell
git add scripts/parsers/renderer.js
git commit -m "fix: 渲染器跳过条件块时消除多余空行"
```

---

### 任务 3：恢复物品图标显示

**文件：**
- 修改: `scripts/templates/item.md`

- [ ] **步骤 1: 在 item 模板中添加图标**

在 `item.md` 的 `# {{name}}` 下方加上：

```md
# {{name}}

{{#if icon}}
![](/images/items/{{icon}}.png)
{{/if}}
```

`parse-items.js` 已具备 `hasIcon` 检测和 `data.icon` 传递，模板只需消费即可。

- [ ] **步骤 2: 提交**

```powershell
git add scripts/templates/item.md
git commit -m "feat: 恢复物品页面图标显示（带 exists 守卫）"
```

---

### 任务 4：补全索引页 + 导航

**文件：**
- 修改: `scripts/generate.js`
- 新建: `docs/vanilla/index.md`

- [ ] **步骤 1: 在 generate.js 中添加索引页生成函数**

在 `generate()` 函数末尾、`generateSidebar` 之前，添加：

```js
function generateIndexPages(items, recipes, skills, zombies) {
  const vanillaDir = join(DOCS_DIR, 'vanilla');

  // items/index.md
  const catCounts = {};
  for (const item of items) {
    const label = ITEM_CATEGORY_LABELS[item.category] || item.category;
    catCounts[label] = (catCounts[label] || 0) + 1;
  }
  const itemIndex = `# 物品列表\n\n共 ${items.length} 个物品\n\n| 分类 | 数量 |\n|---|---|\n${Object.entries(catCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/items/index.md'), itemIndex, 'utf-8');

  // recipes/index.md
  const stationCounts = {};
  for (const r of recipes) {
    const s = r.station || '背包合成';
    stationCounts[s] = (stationCounts[s] || 0) + 1;
  }
  const recipeIndex = `# 配方列表\n\n共 ${recipes.length} 个配方\n\n| 工作站 | 数量 |\n|---|---|\n${Object.entries(stationCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/recipes/index.md'), recipeIndex, 'utf-8');

  // skills/index.md
  const attrCounts = {};
  for (const s of skills) {
    attrCounts[s.category] = (attrCounts[s.category] || 0) + 1;
  }
  const skillIndex = `# 技能列表\n\n共 ${skills.length} 个技能\n\n| 属性 | 数量 |\n|---|---|\n${Object.entries(attrCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/skills/index.md'), skillIndex, 'utf-8');

  // zombies/index.md
  const typeCounts = {};
  for (const z of zombies) {
    const t = z.category || '未知';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  const zombieIndex = `# 僵尸列表\n\n共 ${zombies.length} 个僵尸\n\n| 类型 | 数量 |\n|---|---|\n${Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([k,v]) => `| ${k} | ${v} |`).join('\n')}\n`;
  writeFileSync(join(DOCS_DIR, 'vanilla/zombies/index.md'), zombieIndex, 'utf-8');
}
```

- [ ] **步骤 2: 在 generate.js 中调用该函数并创建 vanilla/index.md**

在 `generate()` 函数中 `generateSidebar` 之前调用：

```js
generateIndexPages(items, recipes, skills, zombies);
```

同时在函数开始处补充 `ITEM_CATEGORY_LABELS` 的引用——要么定义在文件顶部，要么从 `parse-items.js` 导入。因 `generate.js` 已是 ESM，导入更合适：

```js
import { ITEM_CATEGORY_LABELS } from './parsers/parse-items.js';
```

需要在 `parse-items.js` 中将 `ITEM_CATEGORY_LABELS` 导出：

```js
export const ITEM_CATEGORY_LABELS = { ... };
```

然后在 generate 函数中创建 `docs/vanilla/index.md`：

```js
const vanillaIndex = `# 原版数据\n\n- [物品](${items.length} 个) — 工具、武器、护甲、食物等\n- [配方](${recipes.length} 个) — 合成配方大全\n- [技能](${skills.length} 个) — Perk 技能树\n- [僵尸](${zombies.length} 个) — 僵尸图鉴\n`;
writeFileSync(join(vanillaDir, 'index.md'), vanillaIndex, 'utf-8');
```

- [ ] **步骤 3: 提交**

```powershell
git add scripts/generate.js scripts/parsers/parse-items.js docs/vanilla/index.md
git commit -m "feat: 自动生成增强版索引页 + 原版导航页"
```

---

### 任务 5：检查交叉引用完整性

**文件：**
- 审查: `scripts/import/parse-entities.js`

- [ ] **步骤 1: 检查僵尸掉落数据提取**

查看 `parse-entities.js` 确保 `loot` 表中的 `item_id` 被正确提取到 `zombies.yaml`。如果 `zombies.yaml` 中每个僵尸的 `loot` 数组已包含 `item_id`，则交叉引用引擎工作正常。如果缺失，手动补 `data/patches/zombies.yaml`。

- [ ] **步骤 2: 如发现问题则修复并提交**

---

### 任务 6：重新生成 + 构建验证

- [ ] **步骤 1: 如果有游戏路径，重新导入数据**

```powershell
npm run import -- --game-path="E:/Steam/7 Days to Die"
```

如果无游戏路径，跳过此步（当前 YAML 数据文件已在仓库中，仅解析器不涉及数据本身）。

- [ ] **步骤 2: 重新生成全部文档**

```powershell
npm run generate
```

预期输出：
```
📖 读取数据...
  - 物品: 1409
  - 配方: 630
  - 技能: 59
  - 僵尸: 180
🔗 构建交叉引用...
📄 加载模板...
📝 生成物品页面...
📝 生成配方页面...
📝 生成技能页面...
📝 生成僵尸页面...
📑 生成侧边栏...
✅ 生成完成
```

- [ ] **步骤 3: 构建 VitePress**

```powershell
npm run build
```

预期：构建成功，无错误输出。

- [ ] **步骤 4: 验证关键页面**

检查 `docs/vanilla/items/` 中随机几个页面确认图标、空白行、格式正常。

- [ ] **步骤 5: 提交全部生成结果**

```powershell
git add .
git commit -m "chore: 重新生成全部文档（技能名修复+图标恢复+索引更新）"
```
