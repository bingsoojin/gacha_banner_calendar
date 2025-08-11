import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

/** Game8 GI "Current and Next Banner Schedule" */
const URL = 'https://game8.co/games/Genshin-Impact/archives/305012';

export async function scrapeGI(){
  const { $, html } = await fetchDoc(URL);
  const list = [];

  // In "Banner Dates" bullets, patterns like "Ineffa and Citlali Banners (July 30, 2025 - August 19, 2025)"
  $('#mw-content-text li').each((_, li)=>{
    const line = normalize($(li).text());
    if(/Banners?\s*\(/.test(line) && /\d{4}/.test(line)){
      const namePart = line.split(' Banners')[0].trim();
      const names = namePart.split(/\s+and\s+/).map(s=>s.trim()).filter(Boolean);
      const ranges = extractDateRanges(line, 'UTC-5'); // Game8 GI lists NA/UTC-5 timings frequently
      for(const r of ranges){
        for(const n of names){
          const row = rec({ game:'GI', name: n, phase: '—', startUTC: r.startUTC, endUTC: r.endUTC, source: URL, notes: 'Dates interpreted from banner schedule list.' });
          if(row) list.push(row);
        }
      }
    }
  });

  return list;
}
