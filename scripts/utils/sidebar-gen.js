import { writeFileSync } from 'fs';
import { join } from 'path';

export function generateSidebar(items, recipes, skills, zombies) {
  const sidebar = [
    {
      text: '导航',
      items: [
        { text: '首页', link: '/index' },
      ],
    },
    {
      text: '原版数据',
      items: [
        {
          text: '物品',
          collapsed: false,
          items: items.map(i => ({ text: i.name, link: `/vanilla/items/${i.id}` })),
        },
        {
          text: '配方',
          collapsed: false,
          items: recipes.map(r => ({ text: r.name, link: `/vanilla/recipes/${r.id}` })),
        },
        {
          text: '技能',
          collapsed: false,
          items: skills.map(s => ({ text: s.name, link: `/vanilla/skills/${s.id}` })),
        },
        {
          text: '僵尸',
          collapsed: false,
          items: zombies.map(z => ({ text: z.name, link: `/vanilla/zombies/${z.id}` })),
        },
      ],
    },
  ];

  return `import { DefaultTheme } from 'vitepress'\n\nexport const sidebar: DefaultTheme.SidebarItem[] = ${JSON.stringify(sidebar, null, 2)}\n`;
}
