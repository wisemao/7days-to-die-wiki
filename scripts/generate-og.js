/**
 * Generate social share image (OG image) at public/og-image.png
 * 1200x630 PNG with dark post-apocalyptic theme + signature item icons
 * Usage: node scripts/generate-og.js
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const OUT = join(process.cwd(), 'public', 'og-image.png');
const ICONS = [
  'meleeToolRepairT0StoneAxe', 'gunHandgunT1Pistol', 'foodCanBeef', 'medicalFirstAidKit',
  'resourceForgedIron', 'meleeWpnBladeT1HuntingKnife', 'modGunScopeMedium', 'meleeWpnSledgeT1IronSledgehammer',
];

const W = 1200, H = 630;
const ICON_SIZE = 84;
const GAP = 16;
const rowW = ICONS.length * ICON_SIZE + (ICONS.length - 1) * GAP;
const x0 = Math.round((W - rowW) / 2);
const y0 = 430;

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1c1510"/>
      <stop offset="55%" stop-color="#2a1f14"/>
      <stop offset="100%" stop-color="#14100c"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8b2f1d"/>
      <stop offset="100%" stop-color="#c94f30"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="10" fill="url(#accent)"/>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="url(#accent)"/>
  <!-- subtle vignette -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#3a2b1e" stroke-width="2" opacity="0.5"/>
  <text x="${W / 2}" y="235" font-family="Microsoft YaHei, sans-serif" font-size="110" font-weight="800" fill="#ede0c8" text-anchor="middle">七日杀 <tspan fill="#d9552f">Wiki</tspan></text>
  <text x="${W / 2}" y="310" font-family="Microsoft YaHei, sans-serif" font-size="34" fill="#a8967c" text-anchor="middle">7 Days to Die 中文资料库 · 物品 · 配方 · 技能 · 僵尸</text>
  <text x="${W / 2}" y="620" font-family="Microsoft YaHei, sans-serif" font-size="24" fill="#6b5b48" text-anchor="middle">数据来自游戏源文件自动生成 · 1589 个物品图标</text>
</svg>`;

const compositeOps = [];
for (let i = 0; i < ICONS.length; i++) {
  const p = join(process.cwd(), 'public', 'images', 'items', `${ICONS[i]}.png`);
  if (!existsSync(p)) continue;
  // Icon tile: dark rounded square background
  compositeOps.push({
    input: Buffer.from(`<svg width="${ICON_SIZE}" height="${ICON_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="${ICON_SIZE - 4}" height="${ICON_SIZE - 4}" rx="12" fill="#241b12" stroke="#4a3826" stroke-width="2"/>
    </svg>`),
    left: x0 + i * (ICON_SIZE + GAP),
    top: y0,
  });
  compositeOps.push({
    input: readFileSync(p),
    left: x0 + i * (ICON_SIZE + GAP) + 10,
    top: y0 + 10,
  });
}

const out = await sharp(Buffer.from(svg))
  .composite(compositeOps)
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(OUT, out);
console.log(`OG 图已生成: public/og-image.png (${(out.length / 1024).toFixed(0)} KB)`);
