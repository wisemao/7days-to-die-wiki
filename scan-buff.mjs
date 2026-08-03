import { readFileSync } from 'fs';
// Localization 中 buff 名的中文
const t = readFileSync('F:/SteamLibrary/steamapps/common/7 Days to Die/Data/Config/Localization.csv', 'utf-8');
const lines = t.split(/\r?\n/);
const loc = new Map();
for (const l of lines.slice(1)) {
  const p = l.split(',');
  if (p[0] && p[17]) loc.set(p[0], p[17]);
}
for (const id of ['buffInjuryBleeding', 'buffInfectionCatch', 'buffDysenteryCatch', 'buffLaceration', 'buffInjuryStunned01', 'buffPainKiller', 'buffWet', 'buffFoodPoisoningCatch']) {
  console.log(id + ':', JSON.stringify(loc.get(id) || null));
}
// 检查 items.xml 中所有 RemoveBuff/AddBuff 的 buff 集合
import { readFileSync as rfs } from 'fs';
const itemsXml = rfs('F:/SteamLibrary/steamapps/common/7 Days to Die/Data/Config/items.xml', 'utf-8');
const buffs = new Set([...itemsXml.matchAll(/action="(?:Remove|Add)Buff"\s+buff="([^"]+)"/g)].map(m => m[1]));
console.log('\nitems.xml 中 buff 引用数:', buffs.size);
for (const b of buffs) {
  console.log(b, '=', JSON.stringify(loc.get(b) || '无中文'));
}
