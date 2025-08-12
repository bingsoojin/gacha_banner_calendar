// src/sources/gfl2.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

const URL = 'https://gfl2exilium.help/en/banners';

const STOP = /^(Past|Now|Live|Upcoming|Unknown|GLOBAL|CN|SERVER|Image|Date|From|Until)$/i;
const NAME_RE = /\b([A-Z][A-Za-z'\-]{2,}(?:\s+[A-Z][A-Za-z'\-]{2,})?)\b/g;

export async function scrapeGFL2(){
  const { $, html } = await fetchDoc(URL);
  const full = normalize($.root().text());

  // Global-only slice: from "GLOBAL SERVER" down to the divider before CN ("No results found")
  const iGlobal = full.indexOf('GLOBAL SERVER');
  const iDivider = iGlobal >= 0 ? full.indexOf('No results found', iGlobal + 1) : -1;
  const seg = iGlobal >= 0
    ? (iDivider > iGlobal ? full.slice(iGlobal, iDivider) : full.slice(iGlobal))
    : full;

  console.log('[GFL2] indices', { iGlobal, iDivider, segLen: seg.length });

  const out = [];

  // Month-name ranges (e.g., "July 24, 2025 - August 13, 2025")
  const reRange = /[A-Z][a-z]{3,}\.?\s+\d{1,2},\s*\d{4}\s*(?:-|to)\s*[A-Z][a-z]{3,}\.?\s+\d{1,2},\s*\d{4}/g;
  const ranges = [];
  for (let m; (m = reRange.exec(seg)); ){
    ranges.push({ text: m[0], i0: m.index, i1: m.index + m[0].length });
  }

  for (let r = 0; r < ranges.length; r++){
    const cur = ranges[r];
    const nxt = ranges[r+1]?.i0 ?? seg.length;

    const parsed = extractDateRanges(cur.text, 'UTC');
    if (!parsed.length) continue;

    const tail = seg.slice(cur.i1, Math.min(nxt, cur.i1 + 220));

    let status;
    if (/Now\s+Live/i.test(tail))    status = 'current';
    else if (/Upcoming/i.test(tail)) status = 'upcoming';
    else if (/Past/i.test(tail))     status = 'past';

    const names = [];
    let m2;
    while ((m2 = NAME_RE.exec(tail)) && names.length < 2){
      const nm = m2[1].trim();
      if (!STOP.test(nm) &&
          !/^(January|February|March|April|May|June|July|August|September|October|November|December|Aug|Sep)$/i.test(nm)){
        names.push(nm);
      }
    }
    if (!names.length) continue;

    for (const p of parsed){
      for (const name of [...new Set(names)]){
        const row = rec({
          game: 'GF2', // keep key stable for your UI
          name,
          phase: '—',
          startUTC: p.startUTC,
          endUTC: p.endUTC,
          source: URL,
          notes: 'Global section (GFL2 Help)',
          status
        });
        if (row) out.push(row);
      }
    }
  }

  console.log('[GFL2] rows produced:', out.length);
  return out;
}
