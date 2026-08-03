import { readFileSync } from 'fs';
const t = readFileSync('F:/SteamLibrary/steamapps/common/7 Days to Die/Data/Config/items.xml', 'utf-8');
const i = t.indexOf('<item name="medicalBandage"');
const end = t.indexOf('</item>', i);
console.log('=== medicalBandage 完整 ===');
console.log(t.slice(i, end + 8).replace(/\t/g, '  '));
