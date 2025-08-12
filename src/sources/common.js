import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

/** Fetch the page and return Cheerio handle + raw HTML */
export async function fetchDoc(url){
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
    }
  });
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  return { $, html };
}

export function normalize(text){
  return (text || '').replace(/\s+/g, ' ').replace(/[\u2013\u2014]/g, '-').trim();
}

function parseMDY(s, zone){
  // try long month (August) then short month (Aug)
  const a = DateTime.fromFormat(s, 'LLLL d, yyyy', { zone });
  if (a.isValid) return a;
  const b = DateTime.fromFormat(s, 'LLL d, yyyy', { zone });
  return b;
}

/** Flexible date range parser covering:
 *  1) LLL[.] d, yyyy - LLL[.] d, yyyy
 *  2) LLL[.] d [-|to] LLL[.] d, yyyy  (left date year missing)
 *  3) MM/dd - MM/dd/yyyy
 */
export function extractDateRanges(text, zone='UTC'){
  const t = normalize(text);
  const out = [];

  // 1) Month name/abbr on both sides
  const reFull = /([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})\s*(?:-|to)\s*([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})/g;
  for(let m; (m = reFull.exec(t)); ){
    const S = parseMDY(m[1].replace('.',''), zone);
    const E = parseMDY(m[2].replace('.',''), zone);
    if(S.isValid && E.isValid) out.push(_mkRange(S,E,zone));
  }

  // 2) Left date missing year (e.g., "Aug. 12 - Sep. 02, 2025")
  const reHalf = /([A-Z][a-z]{2,}\.?\s+\d{1,2})(?:,\s*(\d{4}))?\s*(?:-|to)\s*([A-Z][a-z]{2,}\.?\s+\d{1,2},\s*\d{4})/g;
  for(let m; (m = reHalf.exec(t)); ){
    const right = m[3].replace('.','');
    const E = parseMDY(right, zone);
    const year = m[2] || (E.isValid ? E.year : undefined);
    const S = parseMDY(`${m[1].replace('.','')}, ${year}`, zone);
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
export function rec({game, name, phase='—', startUTC, endUTC, source, notes='', ...extra}) {
  if(!game || !name || !startUTC || !endUTC) return null;
  return { game, name: String(name).trim(), phase, start: startUTC, end: endUTC, source, notes, ...extra };
}
