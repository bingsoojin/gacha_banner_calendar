import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';
const URL = 'https://game8.co/games/Honkai-Star-Rail/archives/408381';

export async function scrapeHSR(){
  const { $, html } = await fetchDoc(URL);
  const list = [];
  const text = normalize($.root().text());

  // e.g., "Hysilens Banner (Aug. 12 - Sep. 02, 2025)"
  const reLine = /([A-Z][\w' .:-]+?)\s+Banner\s*\(([^)]+)\)/g;
  for(let m; (m = reLine.exec(text)); ){
    const name = m[1].trim();
    const ranges = extractDateRanges(m[2], 'UTC-5');
    for(const r of ranges){
      const row = rec({ game:'HSR', name, phase:'—', startUTC:r.startUTC, endUTC:r.endUTC, source:URL, notes:'UTC-5 per page' });
      if(row) list.push(row);
    }
  }

  // Fallback: numeric ranges in version/phase blocks near known names (kept minimal)
  const reVer = /Phase\s*\d[^)]*\(([^)]+)\)[\s\S]*?(Hysilens|Kafka|Cerydra|Silver Wolf|Evernight|Permansor Terrae)/g;
  for(let m; (m = reVer.exec(text)); ){
    const ranges = extractDateRanges(m[1], 'UTC-5');
    for(const r of ranges){
      const row = rec({ game:'HSR', name:m[2].trim(), phase:'—', startUTC:r.startUTC, endUTC:r.endUTC, source:URL, notes:'UTC-5 per page' });
      if(row) list.push(row);
    }
  }

  return list;
}
