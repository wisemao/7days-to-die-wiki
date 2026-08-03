# AGENTS.md — 7 Days to Die 中文维基

## 项目概述

7 Days to Die（七日杀）中文维基站。Astro 7.x 静态站，部署至 GitHub Pages（https://wisemao.github.io/7days-to-die-wiki/）。内容由本地游戏数据自动解析生成（2048 页面，纯静态，Pagefind 中文搜索）。

## ⚠️ 核心规则（必须遵守）

1. **部署验证闭环**：任何修改"解决完问题必须部署并验证没问题，才算真的解决了问题"。未部署验证的工作一律标记为"未完成"。
2. **每轮流程**：本地 `npm run build` 验证 → `git commit`（中文信息，按惯例 `feat:`/`fix:` 前缀）→ `push main` → 等 GitHub Actions（约 160s，用匿名 GitHub API `https://api.github.com/repos/wisemao/7days-to-die-wiki/actions/runs?per_page=1` 轮询）→ 线上 fetch 验证关键点 → 报告 PASS/FAIL。
3. **永远使用中文**回复与写 commit message。

## 数据管线（核心架构）

```
游戏 XML (F:\SteamLibrary\steamapps\common\7 Days to Die\Data\Config)
  → scripts/import/import-all.js   （XML → data/vanilla/*.yaml 基础解析）
  → scripts/enhance-data.js         （增量增强，幂等，可重复运行）
  → data/vanilla/*.yaml             （数据源：items/recipes/skills/zombies/biomes/blocks.yaml）
  → src/pages/**/*.astro            （Astro 构建，每 yaml 条目生成详情页）
  → dist/ + pagefind 索引           → GitHub Pages
```

- **增强命令**：`node scripts/enhance-data.js --config-dir "F:/SteamLibrary/steamapps/common/7 Days to Die/Data/Config"`
- 已解析：items(1526)/recipes(639)/skills(211)/zombies(197 唯一：172 丧尸(可见) + 22 动物)/loot/spawning/blocks(17 图标)/biomes(6)/vehicles/item_modifiers/traders/Localization.csv(25575 条，非 .txt！)/Pagefind zh-cn 官方翻译
- enhance-data.js 已有 12 个步骤（含活体动物解析、丧尸伤害从手持物品 DamageEntity 解析、暴徒分类修正等）

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run typecheck` | TS 检查（`tsc --noEmit`） |
| `npm run build` | 构建 + pagefind 索引（注意：pagefind 在 build 后自动跑） |
| `npm run validate` | 数据校验 |
| `npm run rebuild` | clean + build |
| `npm run import` | 全量重新导入 XML |

## 术语约定（全站词）

- 一级标题/导航：**生物**（图标 meleeHandAnimalWolf.png 狼爪）
- 分区：**丧尸**（人形 humanoid，172 个）/ **动物**（22 个活体）
- 数据文件 zombies.yaml 中：`category: humanoid` 为丧尸，`category: animal` 为动物；zombieSkateboarder*（暴徒）是人形，不是动物
- 用户曾用词"僵尸"已全部改为"丧尸"

## 关键文件

- `scripts/enhance-data.js`：增强主脚本（改数据先改这里，保持幂等）
- `scripts/sync-icons.js`：图标同步（支持 blocks + compress 模式）
- `data/vanilla/zombies.yaml`：丧尸+动物数据（197 唯一：172 丧尸(可见) + 22 动物，含 damage.melee 等）
- `src/pages/vanilla/zombies/index.astro`：生物图鉴分区页
- `src/pages/vanilla/zombies/[id].astro`：生物详情页
- `src/components/Nav.astro`、`Sidebar.astro`：导航（"生物"标签）
- `src/pages/index.astro`：首页 Hero 统计
- `public/pagefind/translations/zh-cn.json`：搜索 UI 中文

## 验证要点（改动后必查）

- 数据改动：`node -e` 读取 yaml 抽查关键条目 → `npm run typecheck` → `npm run build`
- 部署后线上验证：fetch 关键页面断言关键内容（标题/数值/分类归属）
- 已知量：2048 页面、物品可见 978、技能中文 100%、配方 0 无名、图标 1606、动物 22、丧尸 172(可见)
