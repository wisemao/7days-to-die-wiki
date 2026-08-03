import { readFileSync } from 'fs';
import { load } from 'js-yaml';
const hasCjk = s => !!s && /[\u4e00-\u9fff]/.test(s);
const recipes = load(readFileSync('data/vanilla/recipes.yaml', 'utf-8')).recipes || [];
const noCjk = recipes.filter(r => !hasCjk(r.name));
// 无 name 字段 vs name 是英文 key
const noName = noCjk.filter(r => !r.name);
const enName = noCjk.filter(r => r.name && !hasCjk(r.name));
console.log('无 name 字段:', noName.length, '| name 无中文:', enName.length);
console.log('enName 样例:', enName.slice(0, 10).map(r => r.id + '=' + r.name).join(', '));
console.log('noName 样例:', noName.slice(0, 10).map(r => r.id).join(', '));
// Localization 查找
const t = readFileSync('F:/SteamLibrary/steamapps/common/7 Days to Die/Data/Config/Localization.csv', 'utf-8');
const lines = t.split(/\r?\n/);
const loc = new Map();
for (const l of lines.slice(1)) {
  const p = l.split(',');
  if (p[0] && p[4]) loc.set(p[0], p[4]);
}
console.log('\n=== 物品 2 个的 Localization ===');
for (const id of ['meleeWpnBatonT3PlasmaBaton', 'gunHandgunT3SMG5']) {
  console.log(id, '=', loc.get(id) || '❌ 无');
}
console.log('\n=== 配方 noCjk 的 Localization 覆盖率 ===');
let locFound = 0;
const foundList = [];
for (const r of noCjk) {
  const clean = (r.id || '').replace(/(_player|BlockVariantHelper|VariantHelper)$/, '');
  if (loc.get(clean) || loc.get(r.id)) { locFound++; foundList.push(r.id + '=' + (loc.get(clean) || loc.get(r.id))); }
}
console.log('配方 Localization 可补:', locFound + '/' + noCjk.length);
console.log('样例:', foundList.slice(0, 12).join(' | '));
