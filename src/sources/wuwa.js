// src/sources/wuwa.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

// Game8 Wuthering Waves banner page
const URL = 'https://game8.co/games/Wuthering-Waves/archives/453303';

// Known permanent/4★ names to exclude from limited 5★ banners
const FOUR_STAR = new Set(['Taoqi','Lumi','Yuanwu']); // extend as needed
// Some upcoming 5★ names to ensure we keep (if present on page)
const FIVE_STAR_HINT = /Cantarella|Brant/i;

function cleanName(s){
  return s.replace(/\s+Banner\s*$/i,'').trim();
}

function parseVersionBlocks(text){
  // Grab "Ver. 2.4" / "Version 2.5" blocks and their Phase 1/2 ranges
  const out = [];
  const reVer = /Ver(?:sion|\.)\s*(\d+\.\d+)/gi;
  let m, idx=[];
  while ((m = reVer.exec(text))) idx.push([m.index, m[1]]);
  for(let i=0;i<idx.length;i++){
    const [start, ver] = idx[i];
    const end = i+1<idx.length ? idx[i+1][0] : text.length;
    const chunk = text.slice(start, end);
    const status = /\(Current\)/i.test(chunk) ? 'current'
                : /\(Next\)/i.test(chunk)    ? 'next'
                : /\(Upcoming\)/i.test(chunk)? 'upcoming' : undefined;
    const rePhase = /(Phase|Part)\s*(\d)[^()]*\(([^)]+)\)/gi;
    let p;
    while ((p = rePhase.exec(chunk))){
      const phase_num = Number(p[2]);
      const ranges = extractDateRanges(p[3], 'UTC'); // WW is posted without explicit server offset
      for (const r of ranges){
        out.push({ version:ver, phase_num, status, startUTC:r.startUTC, endUTC:r.endUTC });
      }
    }
  }
  return out;
}

export async function scrapeWUWA(){
  const { $, html } = await fetchDoc(URL);
  const text = normalize($.root().text());

  const vp = parseVersionBlocks(text);

  // Character lines like "Phrolova Banner (Jul. 24 - Aug. 14, 2025)"
  const out = [];
  const reChar = /([A-Z][\w' -]+?)\s+Banner\s*\(([^)]+)\)/g;
  for (let m; (m = reChar.exec(text)); ){
    const name = cleanName(m[1]);
    const ranges = extractDateRanges(m[2], 'UTC');
    for (const r of ranges){
      // attach version/phase if the dates overlap a phase window
      const match = vp.find(v => !(r.endUTC <= v.startUTC || r.startUTC >= v.endUTC));
      const row = rec({
        game: 'WUWA',
        name,
        phase: match?.phase_num ? String(match.phase_num) : '—',
        startUTC: r.startUTC,
        endUTC: r.endUTC,
        source: URL,
        notes: '',
        version: match?.version,
        phase_num: match?.phase_num,
        status: match?.status,
        rarity: FOUR_STAR.has(name) ? 4 : 5
      });
      if (row) out.push(row);
    }
  }

  // Filter: only 5★ characters, plus keep any hinted upcoming 5★ names
  const filtered = out.filter(r => r.rarity === 5 || FIVE_STAR_HINT.test(r.name));

  console.log('[WUWA] rows produced (5★ only):', filtered.length);
  return filtered;
}
