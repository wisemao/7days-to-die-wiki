/**
 * Sync item icons from game ItemIcons directory.
 * - Copies missing icons (id / icon / suffix-fallback matching)
 * - Compresses with sharp to keep repo small
 * Usage: node scripts/sync-icons.js --game-path "F:/SteamLibrary/steamapps/common/7 Days to Die"
 */
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { load } from 'js-yaml';
import sharp from 'sharp';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.split('=');
  return [k.replace(/^--/, ''), v.join('=')];
}));

const gamePath = args['game-path'] || 'F:/SteamLibrary/steamapps/common/7 Days to Die';
const iconSrcDir = join(gamePath, 'Data', 'ItemIcons');
const destDir = join(process.cwd(), 'public', 'images', 'items');
const itemsPath = join(process.cwd(), 'data', 'vanilla', 'items.yaml');

if (!existsSync(iconSrcDir)) {
  console.error(`ItemIcons 目录不存在: ${iconSrcDir}`);
  process.exit(1);
}

// Index available source icons (basename without extension)
const srcFiles = await import('fs').then(async fs => {
  const { readdirSync } = fs;
  return readdirSync(iconSrcDir).filter(f => f.endsWith('.png'));
});
const srcSet = new Set(srcFiles.map(f => basename(f, '.png')));

// Load all item ids (visible + hidden, mods included)
const itemsDoc = load(readFileSync(itemsPath, 'utf-8'));
const items = itemsDoc.items || [];

// Build candidate names per item: [id, icon, id-minus-suffix, camelCase prefix fallback]
const candidates = [];
for (const item of items) {
  const ids = new Set([item.id]);
  if (item.icon) ids.add(item.icon);
  // Suffix fallbacks: Schematic / SkillMagazine / _Parts
  for (const id of [...ids]) {
    const stripped = id.replace(/(Schematic|SkillMagazine|Parts)$/, '');
    if (stripped !== id) ids.add(stripped);
  }
  // CamelCase prefix fallback: bookFiremansAlmanacAxes -> bookFiremansAlmanac -> bookFiremans -> book
  for (const id of [...ids]) {
    // Split on uppercase boundaries: book|Enforcer|A|P|Ammo -> bookEnforcer, bookEnforcerA, ...
    const segs = id.split(/(?=[A-Z])/);
    let acc = segs[0] || '';
    for (let i = 1; i < segs.length; i++) {
      acc += segs[i];
      if (acc.length >= 4) ids.add(acc);
    }
  }
  candidates.push({ id: item.id, ids: [...ids] });
}

mkdirSync(destDir, { recursive: true });
let copied = 0, missing = 0, total = candidates.length;
const missingList = [];

const compressTo = async (srcPath, destPath) => {
  try {
    const meta = await sharp(srcPath).metadata();
    let pipeline = sharp(srcPath);
    if (meta.width > 128) pipeline = pipeline.resize(128, 128, { fit: 'inside', withoutEnlargement: true });
    const buf = await pipeline.png({ compressionLevel: 9, palette: true, quality: 100 }).toBuffer();
    if (buf.length < 60000) {
      await (await import('fs')).promises.writeFile(destPath, buf);
      return true;
    }
  } catch (e) {
    console.error(`  压缩失败: ${e.message}`);
  }
  return false;
};

// --compress: re-compress every existing icon
if ('compress' in args) {
  const fs = await import('fs');
  const files = fs.readdirSync(destDir).filter(f => f.endsWith('.png'));
  let done = 0;
  for (const f of files) {
    const destPath = join(destDir, f);
    const ok = await compressTo(destPath, destPath);
    if (!ok) console.error(`  跳过压缩 ${f}`);
    if (++done % 200 === 0) process.stdout.write(`  ...${done}\r`);
  }
  console.log(`\n压缩完成: ${files.length} 个图标`);
  process.exit(0);
}

for (const { id, ids } of candidates) {
  const destPath = join(destDir, `${id}.png`);
  if (existsSync(destPath)) continue; // already have
  let found = null;
  for (const cand of ids) {
    if (srcSet.has(cand)) { found = cand; break; }
  }
  if (!found) {
    // Prefix fallback: find any source icon starting with the candidate prefix
    // (e.g. bookFiremansAlmanac -> bookFiremansAlmanacHeat)
    const prefixes = [...ids].filter(p => p.length >= 4).sort((a, b) => b.length - a.length);
    outer: for (const p of prefixes) {
      for (const s of srcSet) {
        if (s.startsWith(p)) { found = s; break outer; }
      }
    }
  }
  if (!found) {
    missing++;
    missingList.push(id);
    continue;
  }
  const srcPath = join(iconSrcDir, `${found}.png`);
  const ok = await compressTo(srcPath, destPath);
  if (ok) {
    copied++;
  } else {
    // Fallback: raw copy
    const fs = await import('fs');
    await fs.promises.copyFile(srcPath, destPath);
    copied++;
  }
  if (copied % 100 === 0) process.stdout.write(`  ...${copied}\r`);
}

console.log(`\n完成: 新增 ${copied} 个图标, 缺失 ${missing} 个 (共 ${total} 物品)`);
if (missingList.length) {
  console.log('仍缺图标物品(前30):', missingList.slice(0, 30).join(', '));
}
