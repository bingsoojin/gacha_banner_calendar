// src/sources/genshin.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';
const URL = 'https://game8.co/games/Genshin-Impact/archives/305012';

function cleanName(s){
  return s.replace(/^Banner Dates\s+/i,'')
          .replace(/\s+Banner$/i,'')
          .replace(/\s+Rerun$/i,'')
          .trim();
}

export async function scrapeGI(){
  const { $, html } = await fetchDoc(URL);
  const text = normalize($.root().text());

  const out = [];

  // Lines like:
  // "Citlali Banner (Jul. 30 - Aug. 20, 2025)"
  // "Mualani Rerun Banner (Aug. 19 - Sep. 10, 2025)"
  // "Banner Dates Ineffa and Citlali (Jul. 30 - Aug. 20, 2025)"
  const re = /([A-Z][\w' .:-]+?)\s+(?:Banner|Rerun\s+Banner|Banner Dates)\s*\(([^)]+)\)/g;
  for(let m; (m=re.exec(text)); ){
    const raw = cleanName(m[1]);
    const parts = raw.split(/\s+and\s+/i); // split duals into separate rows
    const ranges = extractDateRanges(m[2], 'UTC-5');
    for(const r of ranges){
      for(const p of parts){
        const name = cleanName(p);
        if(!name) continue;
        const row = rec({
          game:'GI',
          name,
          phase:'—',
          startUTC:r.startUTC,
          endUTC:r.endUTC,
          source:URL,
          notes:'UTC-5 per server schedules',
          rerun: /Rerun\s+Banner/i.test(m[0])
        });
        if(row) out.push(row);
      }
    }
  }

  // Remove accidental aggregate rows like "Mualani and Chasca"
  const cleaned = out.filter(x => !/\sand\s/i.test(x.name));

  console.log('[GI] rows produced:', cleaned.length);
  return cleaned;
}
