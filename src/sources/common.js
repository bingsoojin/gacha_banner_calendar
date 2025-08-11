import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

export function fetchDoc(url){
  return fetch(url, { headers: { 'user-agent': 'banner-cal/1.0 (+github actions)' }})
    .then(r => { if(!r.ok) throw new Error(`HTTP ${r.status} for ${url}`); return r.text(); })
    .then(html => ({ $, html: html, ...{ $: cheerio.load(html) }}));
}

export function normalize(text){
  return (text||'').replace(/\s+/g,' ').replace(/[\u2013\u2014]/g,'-').trim();
}

/** Flexible date range parser covering:
 *  1) LLL[.] d, yyyy - LLL[.] d, yyyy
 *  2) LLL[.] d [-|to] LLL[.] d, yyyy  (left date year missing)
 *  3) MM/dd - MM/dd/yyyy
 */
export function extractDateRanges(text, zone='UTC'){
  const t = normalize(text);
  const out = [];

  const reFull = /([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})\s*(?:-|to)\s*([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})/g;
  for(let m; (m = reFull.exec(t)); ){
    const S = DateTime.fromFormat(m[1].replace('.',''), 'LLLL d, yyyy', { zone });
    const E = DateTime.fromFormat(m[2].replace('.',''), 'LLLL d, yyyy', { zone });
    if(S.isValid && E.isValid) out.push(_mkRange(S,E,zone));
  }

  const reHalf = /([A-Z][a-z]{2,}\.?\s+\d{1,2})(?:,\s*(\d{4}))?\s*(?:-|to)\s*([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})/g;
  for(let m; (m = reHalf.exec(t)); ){
    const right = m[3].replace('.','');
    const E = DateTime.fromFormat(right, 'LLLL d, yyyy', { zone });
    const year = m[2] || (E.isValid ? E.year : undefined);
    const S = DateTime.fromFormat(`${m[1].replace('.','')}, ${year}`, 'LLLL d, yyyy', { zone });
    if(S.isValid && E.isValid) out.push(_mkRange(S,E,zone));
  }

  const reNum = /(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  for(let m; (m = reNum.exec(t)); ){
    const [ , m1,d1, m2,d2, y2 ] = m.map(Number);
    const S = DateTime.fromObject({ year: y2, month: m1, day: d1 }, { zone });
    const E = DateTime.fromObject({ year: y2, month: m2, day: d2 }, { zone });
    if(S.isValid && E.isValid) out.push(_mkRange(S,E,zone));
  }

  return out;
}

function _mkRange(start, end, zone){
  return {
    startUTC: start.startOf('day').toUTC().toISO({ suppressMilliseconds: true }),
    endUTC:   end.endOf('day').toUTC().toISO({ suppressMilliseconds: true }),
    startLocal: start.toISODate(),
    endLocal: end.toISODate(),
    zone
  };
}
