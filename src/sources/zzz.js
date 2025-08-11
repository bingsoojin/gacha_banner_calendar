import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

/** Game8 ZZZ "Current and Upcoming Signal Search Banner Schedule" */
const URL = 'https://game8.co/games/Zenless-Zone-Zero/archives/435687';

export async function scrapeZZZ(){
  const { $, html } = await fetchDoc(URL);
  const list = [];

  // Look for the simple schedule bullets like "Alice Banner = August 6, 2025 - September 3, 2025"
  $('#mw-content-text li').each((_, li)=>{
    const line = normalize($(li).text());
    if(/Banner\s*=/.test(line) && /\d{4}/.test(line)){
      const [left, right] = line.split('=');
      const namePart = left.replace(/\s*\*\s*/g,'').trim();
      const name = namePart.replace(/Banner.*/,'').trim();
      const ranges = extractDateRanges(right, 'UTC'); // Game8 ZZZ shows server time, but doesn't state offset; assume UTC for now
      for(const r of ranges){
        const row = rec({ game:'ZZZ', name, phase: '—', startUTC: r.startUTC, endUTC: r.endUTC, source: URL });
        if(row) list.push(row);
      }
    }
  });

  return list;
}
