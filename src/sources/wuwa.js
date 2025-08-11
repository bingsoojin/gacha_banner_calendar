import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

/** Game8 Wuthering Waves "All Current and Next Banners (Gacha)" */
const URL = 'https://game8.co/games/Wuthering-Waves/archives/453303';

export async function scrapeWUWA(){
  const { $, html } = await fetchDoc(URL);
  const list = [];

  // Current pair section: "Phrolova and Roccia Limited Banners" then a single date line "July 24, 2025 - August 14, 2025"
  const curSection = $('h3:contains("Limited Banners")').first().parent();
  if(curSection.length){
    const text = normalize(curSection.text());
    const ranges = extractDateRanges(text, 'UTC');
    const names = [];
    curSection.find('a').each((_, a)=>{
      const t = normalize($(a).text());
      // collect likely character names (single capitalized words common in this page)
      if(t && /^[A-Z][a-zA-Z\-]{2,}$/.test(t) && !/Banner|Best|Materials|Weapon|Lethean|Tragicomedy/i.test(t)){
        names.push(t);
      }
    });
    const uniq = [...new Set(names)].slice(0, 4); // usually 2 characters
    for(const r of ranges){
      for(const n of uniq){
        const row = rec({ game:'WUWA', name: n, phase: '—', startUTC: r.startUTC, endUTC: r.endUTC, source: URL });
        if(row) list.push(row);
      }
    }
  }

  // Upcoming pair (if present) includes a month/day without year sometimes; skip if no full range found.

  return list;
}
