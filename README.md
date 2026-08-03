# 7 Days to Die 中文维基 (7days-to-die-wiki)

基于 [Astro](https://astro.build/) 构建的七日杀中文维基，数据来自游戏 XML 文件自动生成。

## 快速开始

```bash
npm install
npm run dev        # 启动本地开发服务器
npm run build      # 构建静态站点（含 Pagefind 搜索索引）
```

## 项目结构

```
├── data/                  # YAML 数据源
│   ├── vanilla/           # 原版游戏数据
│   │   ├── items.yaml     # 物品数据（含 103 模组）
│   │   ├── recipes.yaml   # 配方数据
│   │   ├── skills.yaml    # 技能数据（211 个，含书籍关联）
│   │   ├── zombies.yaml   # 生物数据（197 个：175 丧尸 + 22 动物）
│   │   ├── blocks.yaml    # 防御方块（17 个陷阱/炮塔/电力设备）
│   │   └── biomes.yaml    # 生物群系（6 个）
│   └── crafting-skills.json # 技能杂志数据
├── public/
│   ├── robots.txt         # 爬虫规则
│   ├── favicon.svg        # 站点图标
│   ├── og-image.png       # 社交分享图（1200×630）
│   └── images/items/      # 物品图标 PNG（1606 个，优化后 ~12MB）
├── src/                   # Astro 源文件
│   ├── components/
│   │   ├── Nav.astro      # 顶栏导航（搜索弹窗 + 主题切换）
│   │   ├── Sidebar.astro  # 侧栏导航（游戏图标）
│   │   ├── ItemGridLink.astro # 带图标物品链接组件
│   │   └── Footer.astro   # 页脚（含构建日期）
│   ├── layouts/
│   │   └── Layout.astro   # 全局布局（设计系统 + SEO/OG 元数据 + 主题）
│   ├── pages/             # 页面路由（2048 页）
│   │   ├── index.astro    # 首页（Hero 图标带 + 6 大卡 + 分类/工作站）
│   │   ├── 404.astro      # 404 页面
│   │   └── vanilla/       # 原版数据页面
│   │       ├── items/     # 物品（分类/套装分组/详情）
│   │       ├── recipes/   # 配方（工作站）
│   │       ├── skills/    # 技能（属性分组/详情）
│   │       ├── zombies/   # 僵尸（类型/图鉴）
│   │       ├── blocks/    # 防御方块
│   │       ├── biomes/    # 生物群系
│   │       └── book-series/ # 技能书系列
│   └── utils/
│       ├── data-loader.ts # YAML 数据加载器（TypeScript 类型化）
│       └── item-icons.ts  # 图标解析工具（分类/属性/僵尸代表图标）
├── scripts/
│   ├── import/            # 游戏数据导入脚本
│   ├── enhance-data.js    # 增量数据增强（幂等，不覆盖人工数据）
│   ├── sync-icons.js      # 物品图标同步（游戏 ItemIcons → 站点）
│   ├── generate-og.js     # OG 分享图生成
│   └── validate-data.js   # 数据质量验证脚本
├── tsconfig.json          # TypeScript 配置
└── package.json
```

## 数据贡献

编辑 `data/vanilla/` 下的 YAML 文件后 Astro 会自动重新构建页面：

```yaml
# data/vanilla/items.yaml 示例
items:
  - id: myCustomItem
    name: 自定义物品
    category: tool
    stack_size: 1
    tier: 500
    stats:
      damage: 15
      durability: 300
```

### 图标

物品图标放在 `public/images/items/` 目录，文件名需与物品 `id` 或 `icon` 字段匹配（PNG 格式）。
图标会自动优化匹配（如 `modGunBarrelExtenderSchematic` 会回退查找 `modGunBarrelExtender.png`，书籍变体按系列前缀回退）。

从游戏同步缺失图标并压缩：

```bash
node scripts/sync-icons.js --game-path "F:/SteamLibrary/steamapps/common/7 Days to Die"
node scripts/sync-icons.js --compress   # 重新压缩全部图标
```

## 常用命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 本地开发服务器（自动刷新） |
| `npm run build` | 构建静态站点（含 Pagefind 搜索索引） |
| `npm run preview` | 预览构建结果 |
| `npm run typecheck` | TypeScript 类型检查（`tsc --noEmit`） |
| `npm run validate` | 数据质量验证（退出码 0=通过/1=警告/2=错误） |
| `npm run clean` | 清理 dist/.astro 缓存 |
| `npm run rebuild` | 清空后完整重建 |
| `npm run import` | 从游戏 XML 导入数据 |

## 从游戏重新导入/增强数据

```bash
# 需要先安装 7 Days to Die 游戏（Steam），3.1 稳定版
# 增量增强（幂等，推荐）：
node scripts/enhance-data.js --config-dir "F:/SteamLibrary/steamapps/common/7 Days to Die/Data/Config"

# 全量导入（重建 items/recipes/skills/zombies）：
node scripts/import/import-all.js --game-path "F:/SteamLibrary/steamapps/common/7 Days to Die"
```

### 数据源覆盖

| 游戏文件 | 生成数据 | 说明 |
|---------|---------|------|
| `items.xml` | `items.yaml` | 物品属性、堆叠、分类、食物医疗效果 |
| `recipes.xml` | `recipes.yaml` | 合成配方、工作站 |
| `progression.xml` | `skills.yaml` | 技能等级、书籍技能关联 |
| `entityclasses.xml` | `zombies.yaml` | 僵尸属性、掉落、弱点 |
| `loot.xml` | `zombies.yaml` | 掉落容器 → 具体物品解析 |
| `spawning.xml` + `entitygroups.xml` | `zombies.yaml` | 刷新生物群系 |
| `blocks.xml` | `blocks.yaml` | 防御方块（陷阱/炮塔/电力设备） |
| `biomes.xml` | `biomes.yaml` | 生物群系资源/天气/难度 |
| `vehicles.xml` | `items.yaml` | 载具速度/油耗 |
| `item_modifiers.xml` | `items.yaml` | 武器/护甲/载具/无人机模组 |
| `traders.xml` | `items.yaml` | 商人可购标记 |
| `localization.txt/csv` | — | 中文名称本地化（25575 条） |

增强后运行 `npm run validate` 检查数据质量，再 `npm run build` 重新生成页面。

### 已知导入限制

- 部分物品分类通过 tags 推断，可能不准确
- 僵尸掉落引用 loot container 名称而非直接物品 ID，需二次映射
- 技能等级效果若有本地化 key 会自动解析为中文，否则保留原始 key
- 无中文名的物品会自动生成可读名称（`generateItemName`）
- quests.xml / challenges.xml 无中文本地化，暂未接入

## 技术栈

- [Astro](https://astro.build/) — 静态站点生成器（2048 页面，构建 ~10s）
- [Pagefind](https://pagefind.app/) — 全文搜索（Component UI 弹窗，Ctrl+K 快捷，zh-cn 分词）
- [TypeScript](https://www.typescriptlang.org/) — 数据层类型化
- [js-yaml](https://github.com/nodeca/js-yaml) — YAML 解析
- [Sharp](https://sharp.pixelplumbing.com/) — 图标 PNG 优化 + OG 图生成
- GitHub Actions — 自动部署（typecheck + validate + build 流水线）
