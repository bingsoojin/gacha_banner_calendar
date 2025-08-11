import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';
const URL = 'https://game8.co/games/Zenless-Zone-Zero/archives/435687';

export async function scrapeZZZ(){
  const { $, html } = await fetchDoc(URL);
  const list = [];
  const text = normalize($.root().text());

  const re = /([A-Z][\w' .-]+?)\s+Banner\s*=\s*([A-Za-z0-9/,.\s-]+?\d{4})/g;
  for(let m; (m = re.exec(text)); ){
    const name = m[1].trim();
    const ranges = extractDateRanges(m[2], 'UTC');
    for(const r of ranges){
      const row = rec({ game:'ZZZ', name, phase:'—', startUTC:r.startUTC, endUTC:r.endUTC, source:URL });
      if(row) list.push(row);
    }
  }

  return list;
}
