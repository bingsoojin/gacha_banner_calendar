import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { DateTime } from 'luxon';
import { scrapeHSR } from './sources/hsr.js';
import { scrapeZZZ } from './sources/zzz.js';
import { scrapeGI } from './sources/genshin.js';
import { scrapeWUWA } from './sources/wuwa.js';
import { scrapeGF2 } from './sources/gf2.js';

const OUT = 'banners.json';
const MANUAL = 'data/manual.json';

function uniqueKey(x) {
  return [x.game, x.name, x.start, x.end].join('|');
}

async function main() {
  const tasks = [
    ['HSR',  scrapeHSR],
    ['ZZZ',  scrapeZZZ],
    ['GI',   scrapeGI],
    ['WUWA', scrapeWUWA],
    ['GF2',  scrapeGF2],
  ];

  const all = [];
  for (const [label, fn] of tasks) {
    try {
      const rows = await fn();
      console.log(`✔ ${label}: ${rows.length}`);
      all.push(...rows);
    } catch (e) {
      console.warn(`! ${label} scraper failed:`, e.message);
    }
  }

  // Merge manual overrides (take precedence)
  let manual = [];
  if (existsSync(MANUAL)) {
    try { manual = JSON.parse(readFileSync(MANUAL, 'utf8')); } catch {}
  }

  const map = new Map();
  for (const r of all)    map.set(uniqueKey(r), r);
  for (const r of manual) map.set(uniqueKey(r), r);

  const merged = Array.from(map.values())
    .filter(r => DateTime.fromISO(r.start).isValid && DateTime.fromISO(r.end).isValid)
    .sort((a, b) => DateTime.fromISO(a.start) - DateTime.fromISO(b.start));

  writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n', 'utf8');

  const bySrc = { HSR:0, ZZZ:0, GI:0, WUWA:0, GF2:0 };
  for (const r of merged) bySrc[r.game] = (bySrc[r.game] || 0) + 1;
  console.log(`Wrote ${merged.length} records to ${OUT}`, bySrc);

  // Stats + visibility guard
  const bySrc = { HSR: 0, ZZZ: 0, GI: 0, WUWA: 0, GF2: 0 };
  for (const r of merged) bySrc[r.game] = (bySrc[r.game] || 0) + 1;

  console.log(`Wrote ${merged.length} records to ${OUT}`, bySrc);

  if ((bySrc.HSR + bySrc.ZZZ + bySrc.GI) === 0) {
    console.error('No HoYoverse banners found (HSR/ZZZ/GI) - failing build for visibility.');
    process.exit(2);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
