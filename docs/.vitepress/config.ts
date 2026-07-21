import { defineConfig } from 'vitepress'
import { sidebar } from './sidebar.generated'
import { fileURLToPath } from 'url'

export default defineConfig({
  title: '七日杀 Wiki',
  description: '7 Days to Die Wiki - 快速查询物品、配方、技能、僵尸',
  base: '/7days-to-die-wiki/',
  ignoreDeadLinks: true,
  srcExclude: ['superpowers/**/*.md'],
  vite: {
    resolve: {
      alias: {
        '/images': fileURLToPath(new URL('./public/images', import.meta.url)),
      },
    },
  },
  markdown: {
    image: { lazyLoading: true },
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '物品', link: '/vanilla/items/' },
      { text: '配方', link: '/vanilla/recipes/' },
      { text: '技能', link: '/vanilla/skills/' },
      { text: '僵尸', link: '/vanilla/zombies/' },
    ],
    sidebar,
    search: {
      provider: 'local',
    },
  },
})
