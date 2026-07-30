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
│   └── images/items/      # 物品图标 PNG
├── src/                   # Astro 源文件
│   ├── layouts/
│   │   └── Layout.astro   # 全局布局（含设计系统）
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
│       └── data-loader.js # YAML 数据加载器
├── scripts/               # 游戏数据导入脚本
└── package.json
```

## 数据贡献

编辑 `data/vanilla/` 下的 YAML 文件后运行 `npm run generate` 即可更新页面：

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

物品图标放在 `docs/.vitepress/public/images/items/` 目录，文件名需与物品 `id` 或 `icon` 字段匹配（PNG 格式）。

## 自动生成

- `npm run generate` — 从 YAML 生成 Markdown 页面 + 侧边栏
- `npm run dev` — 本地预览 Wiki
- `npm run build` — 构建部署到 GitHub Pages

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

导入后运行 `npm run generate` 重新生成 Wiki 页面。

### 已知导入限制

- 部分物品分类通过 tags 推断，可能不准确
- 僵尸掉落引用 loot container 名称而非直接物品 ID，需二次映射
- 技能等级效果若有本地化 key 会自动解析为中文，否则保留原始 key

## 技术栈

- [VitePress](https://vitepress.dev/) — 静态站点生成器
- [js-yaml](https://github.com/nodeca/js-yaml) — YAML 解析
- 自定义模板引擎 (scripts/parsers/renderer.js)
