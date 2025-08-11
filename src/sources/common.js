// src/sources/common.js
import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

/** Fetch the page and return Cheerio handle + raw HTML */
export async function fetchDoc(url){
  const res = await fetch(url, { headers: { 'user-agent': 'banner-cal/1.0 (+github actions)' } });
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  return { $, html };
}

export function normalize(text){
  return (text || '').replace(/\s+/g, ' ').replace(/[\u2013\u2014]/g, '-').trim();
}

/** Flexible date range parser covering:
 *  1) LLL[.] d, yyyy - LLL[.] d, yyyy
 *  2) LLL[.] d [-|to] LLL[.] d, yyyy  (left date year missing)
 *  3) MM/dd - MM/dd/yyyy
 */
export function extractDateRanges(text, zone='UTC'){
  const t = normalize(text);
  const out = [];

  // 1) Full month names/abbreviations with years on both sides
  const reFull = /([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})\s*(?:-|to)\s*([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})/g;
  for(let m; (m = reFull.exec(t)); ){
    const S = DateTime.fromFormat(m[1].replace('.',''), 'LLLL d, yyyy', { zone });
    const E = DateTime.fromFormat(m[2].replace('.',''), 'LLLL d, yyyy', { zone });
    if(S.isValid && E.isValid) out.push(_mkRange(S,E,zone));
  }

  // 2) First date missing year (e.g., "Aug. 12 - Sep. 02, 2025")
  const reHalf = /([A-Z][a-z]{2,}\.?\s+\d{1,2})(?:,\s*(\d{4}))?\s*(?:-|to)\s*([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})/g;
  for(let m; (m = reHalf.exec(t)); ){
    const right = m[3].replace('.','');
    const E = DateTime.fromFormat(right, 'LLLL d, yyyy', { zone });
    const year = m[2] || (E.isValid ? E.year : undefined);
    const S = DateTime.fromFormat(`${m[1].replace('.','')}, ${year}`, 'LLLL d, yyyy', { zone });
    if(S.isValid && E.isValid) out.push(_mkRange(S,E,zone));
  }

  // 3) Numeric (MM/dd - MM/dd/yyyy)
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

/** Create a normalized record used by all scrapers */
export function rec({game, name, phase='—', startUTC, endUTC, source, notes=''}) {
  if(!game || !name || !startUTC || !endUTC) return null;
  return { game, name: String(name).trim(), phase, start: startUTC, end: endUTC, source, notes };
}
