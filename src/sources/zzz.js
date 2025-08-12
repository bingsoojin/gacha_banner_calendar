// src/sources/zzz.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';
const URL = 'https://game8.co/games/Zenless-Zone-Zero/archives/435687';

export async function scrapeZZZ(){
  const { $, html } = await fetchDoc(URL);
  const text = normalize($.root().text());

  const anchor = 'ZZZ Banner Schedule';
  const i = text.indexOf(anchor);
  const seg = i >= 0 ? text.slice(i + anchor.length, i + 6000) : text;

  const out = [];
  const reEq = /([A-Z][^=]{1,80}?)\s*=\s*([A-Za-z][A-Za-z.]+\s+\d{1,2},\s*\d{4}\s*(?:-|to)\s*[A-Za-z][A-Za-z.]+\s+\d{1,2},\s*\d{4})/g;

  for (let m; (m=reEq.exec(seg)); ){
    let left = m[1].trim()
      .replace(/^Rerun\s+/i,'')
      .replace(/\s+Rerun\s+Banner$/i,'')
      .replace(/\s+Banner$/i,'')
      .replace(/^ZZZ Banner Schedule\s+/i,'');
    const ranges = extractDateRanges(m[2],'UTC');
    for(const r of ranges){
      const row = rec({
        game:'ZZZ',
        name:left,
        phase:'—',
        startUTC:r.startUTC,
        endUTC:r.endUTC,
        source:URL,
        notes:'Schedule block on Game8',
        banner_type:'Agent',
        rerun:/rerun/i.test(m[1])
      });
      if(row) out.push(row);
    }
  }
  console.log('[ZZZ] rows produced:', out.length);
  return out;
}
