import { readFileSync } from 'fs';
const t = readFileSync('F:/SteamLibrary/steamapps/common/7 Days to Die/Data/Config/buffs.xml', 'utf-8');
const i = t.indexOf('<buff name="buffInjuryBleeding"');
console.log('=== buffInjuryBleeding ===');
console.log(t.slice(i, i + 600).replace(/\t/g, '  '));
// 本地化 key
const loc = readFileSync('F:/SteamLibrary/steamapps/common/7 Days to Die/Data/Config/Localization.csv', 'utf-8');
const lines = loc.split(/\r?\n/);
const map = new Map();
for (const l of lines.slice(1)) {
  const p = l.split(',');
  if (p[0] && p[17]) map.set(p[0], p[17]);
}
for (const k of ['buffInjuryBleeding', 'buffInjuryBleedingDesc', 'buffLaceration', 'buffInfectionCatch', 'buffPainKiller', 'buffLegSprained', 'buffInjuryStunned01']) {
  console.log(k, '=', JSON.stringify(map.get(k)));
}
