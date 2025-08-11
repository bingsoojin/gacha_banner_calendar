import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

/** GFL2 Help – Banner History (Global) */
const URL = 'https://gfl2exilium.help/en/banners';

export async function scrapeGF2(){
  const { $, html } = await fetchDoc(URL);
  const list = [];
  const full = normalize($.root().text());

  // Limit to text between "GLOBAL SERVER" and "CN SERVER"
  const startIdx = full.indexOf('GLOBAL SERVER');
  const endIdx = full.indexOf('CN SERVER');
  const segment = startIdx >= 0 && endIdx > startIdx ? full.slice(startIdx, endIdx) : full;

  const ranges = extractDateRanges(segment, 'UTC');
  for(const r of ranges){
    // After each range, the next ~120 chars usually contain 1-2 names
    const idx = segment.indexOf(r.startLocal.replace(/-/g,' '));
    const window = idx >= 0 ? segment.slice(idx, idx + 200) : segment;
    const names = [];
    const nameRegex = /\b([A-Z][a-zA-Z\-]{2,})\b/g;
    let m;
    while((m = nameRegex.exec(window)) && names.length < 2){
      const nm = m[1];
      if(!/Past|Now|Live|Upcoming|GLOBAL|CN|SERVER|Unknown|Image|Date|July|August|September|October|November|December|January|February|March|April|May|June/i.test(nm)){
        names.push(nm);
      }
    }
    const uniq = [...new Set(names)];
    for(const n of uniq){
      const row = rec({ game:'GF2', name: n, phase: '—', startUTC: r.startUTC, endUTC: r.endUTC, source: URL });
      if(row) list.push(row);
    }
  }
  return list;
}
