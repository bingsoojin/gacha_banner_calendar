// src/sources/hsr.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

const URL = 'https://game8.co/games/Honkai-Star-Rail/archives/408381';

// Build Version/Phase map from the “All Warp Banners Schedule” box
function parseVersionPhaseMap(text){
  const blocks = [];
  const reVer = /Ver\.\s*(\d+\.\d+)/g;
  let m, idxs = [];
  while ((m = reVer.exec(text))) idxs.push([m.index, m[1]]);
  for (let i = 0; i < idxs.length; i++){
    const [start, ver] = idxs[i];
    const end = i + 1 < idxs.length ? idxs[i + 1][0] : text.length;
    const chunk = text.slice(start, end);
    blocks.push({ ver, chunk });
  }

  const out = [];
  for (const { ver, chunk } of blocks){
    const status = /\(Current\)/.test(chunk) ? 'current'
                 : /\(Next\)/.test(chunk)    ? 'next'
                 : /\(Upcoming\)/.test(chunk)? 'upcoming'
                 : undefined;

    // Accept "Phase 1" OR "Part 1", dates in (...) can be "MM/DD - MM/DD/YYYY" or "Aug. 12 - Sep. 02, 2025"
    const rePhase = /(Phase|Part)\s*(\d)[^()]*\(([^)]+)\)/g;
    let p;
    while ((p = rePhase.exec(chunk))){
      const phase_num = Number(p[2]);
      const ranges = extractDateRanges(p[3], 'UTC-5');
      for (const r of ranges){
        out.push({
          version: ver,
          phase_num,
          status,
          startUTC: r.startUTC,
          endUTC: r.endUTC
        });
      }
    }
  }
  return out;
}

// Detect character reruns (e.g., “Kafka Rerun …”, “Silver Wolf Rerun …”)
function detectReruns(text){
  const names = new Set();
  const reR = /([A-Z][A-Za-z' \-]+?)\s+Rerun\b/gi;
  let m;
  while ((m = reR.exec(text))) names.add(m[1].trim());
  return names;
}

function attachVersionPhase(r, vpMap){
  // Prefer exact match
  let mm = vpMap.find(v => v.startUTC === r.startUTC && v.endUTC === r.endUTC);
  if (!mm){
    // Fallback: any overlap between [start,end]
    mm = vpMap.find(v => !(r.endUTC <= v.startUTC || r.startUTC >= v.endUTC));
  }
  return mm || {};
}

export async function scrapeHSR(){
  const { $, html } = await fetchDoc(URL);
  const text = normalize($.root().text());
  const vpMap = parseVersionPhaseMap(text);
  const reruns = detectReruns(text);

  const out = [];

  // 1) Character banners — accept several wordings before the date parens
  //    e.g. “Hysilens Banner (Aug. 12 - Sep. 02, 2025)”
  //         “Kafka Warp Banner (Aug. 12 - Sep. 02, 2025)”
  //         “Name Character Event Warp (Aug. 12 - Sep. 02, 2025)”
  //         “Indelible Coterie Banner (Jul. 23 - Aug. 12, 2025)” (event banner still ok)
  const reChar = /([A-Z][\w' .:-]+?)\s+(?:Character\s+Event\s+Warp|Warp\s+Banner|Banner|Event\s+Warp)\s*\(([^)]+)\)/g;
  for (let m; (m = reChar.exec(text)); ){
    const name = m[1].trim().replace(/\s+Banner Dates$/i, ''); // be safe
    const ranges = extractDateRanges(m[2], 'UTC-5');
    for (const r of ranges){
      const mm = attachVersionPhase(r, vpMap);
      const row = rec({
        game: 'HSR',
        name,
        phase: mm?.phase_num ? String(mm.phase_num) : '—',
        startUTC: r.startUTC,
        endUTC: r.endUTC,
        source: URL,
        notes: 'UTC-5 per Game8',
        version: mm.version,
        phase_num: mm.phase_num,
        status: mm.status,
        banner_type: 'Character',
        rerun: reruns.has(name)
      });
      if (row) out.push(row);
    }
  }

  // 2) Light Cones — accept “3.5 Part 1 Light Cones (Aug. 12 - Sep. 02, 2025)” etc.
  const reLC = /(?:Part|Phase)\s*\d[^)]*?(Light Cones?)\s*\(([^)]+)\)/g;
  for (let m; (m = reLC.exec(text)); ){
    const label = m[1]; // “Light Cones”
    const ranges = extractDateRanges(m[2], 'UTC-5');
    for (const r of ranges){
      const mm = attachVersionPhase(r, vpMap);
      const row = rec({
        game: 'HSR',
        name: label,
        phase: mm?.phase_num ? String(mm.phase_num) : '—',
        startUTC: r.startUTC,
        endUTC: r.endUTC,
        source: URL,
        notes: 'UTC-5 per Game8',
        version: mm.version,
        phase_num: mm.phase_num,
        status: mm.status,
        banner_type: 'Light Cone',
        rerun: false
      });
      if (row) out.push(row);
    }
  }

  return out;
}
