// src/sources/gf2.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

/** GFL2 Help – Banner History (Global) */
const URL = 'https://gfl2exilium.help/en/banners';

// words to ignore when scanning the tail after the date range
const STOP = /^(Past|Now|Live|Upcoming|Unknown|GLOBAL|CN|SERVER|Image|Date|From|Until)$/i;

// Find names: capitalized words, allow hyphen/apostrophe, optional two-word names (rare)
const NAME_RE = /\b([A-Z][A-Za-z'\-]{2,}(?:\s+[A-Z][A-Za-z'\-]{2,})?)\b/g;

export async function scrapeGF2(){
  const { $, html } = await fetchDoc(URL);
  const full = normalize($.root().text());

  // Work only within GLOBAL SERVER -> CN SERVER
  const startIdx = full.indexOf('GLOBAL SERVER');
  const endIdx   = full.indexOf('CN SERVER');
  const seg = startIdx >= 0 && endIdx > startIdx ? full.slice(startIdx, endIdx) : full;

  const out = [];

  // Find month-range strings, then parse names/status from the text that follows each range
  const reRange =
    /[A-Z][a-z]{3,}\.?\s+\d{1,2},\s*\d{4}\s*(?:-|to)\s*[A-Z][a-z]{3,}\.?\s+\d{1,2},\s*\d{4}/g;

  const ranges = [];
  for(let m; (m = reRange.exec(seg)); ){
    ranges.push({ text: m[0], i0: m.index, i1: m.index + m[0].length });
  }

  for (let r = 0; r < ranges.length; r++){
    const cur = ranges[r];
    const nxt = ranges[r+1]?.i0 ?? seg.length;

    const parsed = extractDateRanges(cur.text, 'UTC');
    if (!parsed.length) continue; // should not happen with month names

    // Tail = text right after this range up to the next range (or +200 chars if ranges are close)
    const tail = seg.slice(cur.i1, Math.min(nxt, cur.i1 + 220));

    // Status
    let status = undefined;
    if (/Now\s+Live/i.test(tail))       status = 'current';
    else if (/Upcoming/i.test(tail))    status = 'upcoming';
    else if (/Past/i.test(tail))        status = 'past';

    // Names: scan tail; filter stopwords; collect up to 2 distinct names
    const names = [];
    let m2;
    while ((m2 = NAME_RE.exec(tail)) && names.length < 2){
      const nm = m2[1].trim();
      if (!STOP.test(nm)) {
        // Skip pure month/day tokens accidentally captured
        if (/^(January|February|March|April|May|June|July|August|September|October|November|December|Aug|Sep)$/i.test(nm)) continue;
        names.push(nm);
      }
    }

    // If the page says "Unknown", skip creating entries
    if (!names.length) continue;

    for (const p of parsed){
      for (const name of [...new Set(names)]) {
        const row = rec({
          game: 'GF2',
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

  console.log('[GF2] rows produced:', out.length);
  return out;
}
