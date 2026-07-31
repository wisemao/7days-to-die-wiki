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
│   │   ├── items.yaml     # 物品数据
│   │   ├── recipes.yaml   # 配方数据
│   │   ├── skills.yaml    # 技能数据
│   │   └── zombies.yaml   # 僵尸数据
│   └── crafting-skills.json # 技能杂志数据
├── public/
│   ├── robots.txt         # 爬虫规则
│   ├── favicon.svg        # 站点图标
│   └── images/items/      # 物品图标 PNG（优化后 ~6.5MB）
├── src/                   # Astro 源文件
│   ├── components/
│   │   ├── Nav.astro      # 顶栏导航（含搜索弹窗触发）
│   │   ├── Sidebar.astro  # 侧栏导航
│   │   └── Footer.astro   # 页脚（含构建日期）
│   ├── layouts/
│   │   └── Layout.astro   # 全局布局（设计系统 + SEO 元数据）
│   ├── pages/             # 页面路由
│   │   ├── index.astro    # 首页
│   │   ├── 404.astro      # 404 页面
│   │   └── vanilla/       # 原版数据页面
│   │       ├── items/     # 物品
│   │       ├── recipes/   # 配方
│   │       ├── skills/    # 技能
│   │       ├── zombies/   # 僵尸
│   │       └── book-series/ # 技能书系列
│   └── utils/
│       └── data-loader.ts # YAML 数据加载器（TypeScript 类型化）
├── scripts/
│   ├── import/            # 游戏数据导入脚本
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
图标会自动优化匹配（如 `modGunBarrelExtenderSchematic` 会回退查找 `modGunBarrelExtender.png`）。

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

## 从游戏重新导入数据

如需从游戏源文件重新导入数据（如修复技能等级、僵尸掉落等）：

```bash
# 需要先安装 7 Days to Die 游戏（Steam）
node scripts/import/import-all.js --game-path "C:/Program Files (x86)/Steam/steamapps/common/7 Days to Die"
```

导入脚本会解析游戏 `Data/Config/` 目录下的 XML 文件：

| 游戏文件 | 生成数据 | 说明 |
|---------|---------|------|
| `items.xml` | `data/vanilla/items.yaml` | 物品属性、堆叠、分类 |
| `recipes.xml` | `data/vanilla/recipes.yaml` | 合成配方、工作站 |
| `progression.xml` | `data/vanilla/skills.yaml` | 技能等级、属性分类 |
| `entityclasses.xml` | `data/vanilla/zombies.yaml` | 僵尸属性、掉落、弱点 |
| `localization.txt/csv` | — | 中文名称本地化 |

导入后运行 `npm run validate` 检查数据质量，再 `npm run build` 重新生成页面。

### 已知导入限制

- 部分物品分类通过 tags 推断，可能不准确
- 僵尸掉落引用 loot container 名称而非直接物品 ID，需二次映射
- 技能等级效果若有本地化 key 会自动解析为中文，否则保留原始 key
- 无中文名的物品会自动生成可读名称（`generateItemName`）

## 技术栈

- [Astro](https://astro.build/) — 静态站点生成器（1811 页面，构建 ~3s）
- [Pagefind](https://pagefind.app/) — 全文搜索（Component UI 弹窗，Ctrl+K 快捷）
- [TypeScript](https://www.typescriptlang.org/) — 数据层类型化
- [js-yaml](https://github.com/nodeca/js-yaml) — YAML 解析
- [Sharp](https://sharp.pixelplumbing.com/) — 图标 PNG 优化
- GitHub Actions — 自动部署（typecheck + validate + build 流水线）
