import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';
const URL = 'https://game8.co/games/Genshin-Impact/archives/305012';

export async function scrapeGI(){
  const { $, html } = await fetchDoc(URL);
  const list = [];
  const text = normalize($.root().text());

  const rePair = /([A-Z][\w' -]+?)\s+and\s+([A-Z][\w' -]+?)\s+Banners?\s*\(([^)]+)\)/g;
  for(let m; (m = rePair.exec(text)); ){
    const [n1, n2] = [m[1].trim(), m[2].trim()];
    const ranges = extractDateRanges(m[3], 'UTC-5');
    for(const r of ranges){
      for(const n of [n1, n2]){
        const row = rec({ game:'GI', name:n, phase:'—', startUTC:r.startUTC, endUTC:r.endUTC, source:URL, notes:'UTC-5 per server schedules' });
        if(row) list.push(row);
      }
    }
  }

  const reSingle = /([A-Z][\w' -]+?)\s+Banner[s]?\s*\(([^)]+)\)/g;
  for(let m; (m = reSingle.exec(text)); ){
    const ranges = extractDateRanges(m[2], 'UTC-5');
    for(const r of ranges){
      const row = rec({ game:'GI', name:m[1].trim(), phase:'—', startUTC:r.startUTC, endUTC:r.endUTC, source:URL, notes:'UTC-5 per server schedules' });
      if(row) list.push(row);
    }
  }

  return list;
}
