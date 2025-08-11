import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

/** Fetches and returns Cheerio root + raw HTML */
export async function fetchDoc(url){
  const res = await fetch(url, { headers: { 'user-agent': 'banner-cal/1.0 (+github actions)' }});
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  return { $, html };
}

export function normalize(text){
  return (text||'').replace(/\s+/g,' ').replace(/[\u2013\u2014]/g,'-').trim();
}

/** Parse "Month dd, yyyy - Month dd, yyyy" ranges; returns array of {start,end} ISO strings in given zone */
export function extractDateRanges(text, zone='UTC'){
  const t = normalize(text);
  const re = /([A-Z][a-z]+\.?\s+\d{1,2},\s*\d{4})\s*(?:-|to)\s*([A-Z][a-z]+\.?\s+\d{1,2},\s*\d{4})/g;
  const out = [];
  let m;
  while((m = re.exec(t))){
    const [ , s, e ] = m;
    const start = DateTime.fromFormat(s.replace('.', ''), 'LLLL d, yyyy', { zone });
    const end   = DateTime.fromFormat(e.replace('.', ''), 'LLLL d, yyyy', { zone });
    if(start.isValid && end.isValid){
      out.push({
        startUTC: start.startOf('day').toUTC().toISO({ suppressMilliseconds: true }),
        endUTC: end.endOf('day').toUTC().toISO({ suppressMilliseconds: true }),
        startLocal: start.toISODate(),
        endLocal: end.toISODate(),
        zone
      });
    }
  }
  return out;
}

/** Helper to create a record */
export function rec({game, name, phase='—', startUTC, endUTC, source, notes=''}){
  if(!game || !name || !startUTC || !endUTC) return null;
  return { game, name: name.trim(), phase, start: startUTC, end: endUTC, source, notes };
}
