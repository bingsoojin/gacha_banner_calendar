import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

/** Game8 HSR "All Current and Upcoming Warp Banners Schedule" */
const URL = 'https://game8.co/games/Honkai-Star-Rail/archives/408381';

export async function scrapeHSR(){
  const { $, html } = await fetchDoc(URL);
  const list = [];

  // Prefer explicit "HSR All Warp Banner Dates List" bullets like "Hysilens Banner (Aug. 12, 2025 - Sep. 02, 2025)"
  $('#mw-content-text li').each((_, li)=>{
    const line = normalize($(li).text());
    if(/Banner/.test(line) && /\d{4}/.test(line)){
      // Example: "Hysilens Banner (Aug. 12, 2025 - Sep. 02, 2025)"
      const name = line.split(' Banner')[0].trim();
      const ranges = extractDateRanges(line.replace(/[()]/g,''), 'UTC-5'); // Page states UTC-5
      for(const r of ranges){
        const row = rec({ game:'HSR', name, phase: '—', startUTC: r.startUTC, endUTC: r.endUTC, source: URL, notes: 'Dates based on UTC-5.' });
        if(row) list.push(row);
      }
    }
  });

  // Also parse version blocks "Ver. 3.5 Phase 1 - (08/12 - 09/02/2025)" — skipping compact numeric format for now.

  return list;
}
