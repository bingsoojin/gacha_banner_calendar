// src/sources/hsr.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

const URL = 'https://game8.co/games/Honkai-Star-Rail/archives/408381';

// Helper: build version/phase map from the "All Warp Banners Schedule" box
function parseVersionPhaseMap(text){
  // Split into "Ver. x.y ... (until next Ver.)" chunks
  const blocks = [];
  const reVer = /Ver\.\s*(\d+\.\d+)/g;
  let m, idxs = [];
  while((m = reVer.exec(text))) idxs.push([m.index, m[1]]);
  for(let i=0;i<idxs.length;i++){
    const [start, ver] = idxs[i];
    const end = i+1<idxs.length ? idxs[i+1][0] : text.length;
    const chunk = text.slice(start, end);
    blocks.push({ ver, chunk });
  }

  const out = [];
  for(const { ver, chunk } of blocks){
    // Status label near this block (Current / Next / Upcoming)
    const status = /\(Current\)/.test(chunk) ? 'current'
                  : /\(Next\)/.test(chunk)    ? 'next'
                  : /\(Upcoming\)/.test(chunk)? 'upcoming'
                  : undefined;

    // Phase lines: "Phase 1 - (MM/DD - MM/DD/YYYY)" OR "(Aug. 12 - Sep. 02, 2025)"
    const rePhase = /Phase\s*(\d)[^()]*\(([^)]+)\)/g;
    let p;
    while((p = rePhase.exec(chunk))){
      const phase_num = Number(p[1]);
      const ranges = extractDateRanges(p[2], 'UTC-5');
      for(const r of ranges){
        out.push({
          key: `${r.startUTC}|${r.endUTC}`,
          version: ver,
          phase_num,
          status
        });
      }
    }
  }
  return out; // array of {key,version,phase_num,status}
}

// Helper: detect reruns by looking for “… Rerun …” sections
function detectReruns(text){
  // e.g., "Kafka Rerun in Phase 1..." / "Silver Wolf Rerun..."
  const names = new Set();
  const reR = /([A-Z][A-Za-z' \-]+?)\s+Rerun\b/gi;
  let m;
  while((m = reR.exec(text))){
    names.add(m[1].trim());
  }
  return names;
}

export async function scrapeHSR(){
  const { $, html } = await fetchDoc(URL);
  const text = normalize($.root().text());

  const vpMap = parseVersionPhaseMap(text); // version/phase/status per date range
  const reruns = detectReruns(text);        // set of names marked as rerun

  const list = [];

  // 1) From the "HSR All Warp Banner Dates List" (characters)
  // Examples:
  // "Hysilens Banner (Aug. 12 - Sep. 02, 2025)"
  // "Kafka Banner (Aug. 12 - Sep. 02, 2025)"  <-- rerun true
  const reChar = /([A-Z][\w' .:-]+?)\s+Banner\s*\(([^)]+)\)/g;
  for(let m; (m = reChar.exec(text)); ){
    const name = m[1].trim();
    const ranges = extractDateRanges(m[2], 'UTC-5');
    for(const r of ranges){
      // find version/phase by matching the exact start/end
      const mm = vpMap.find(v => v.key === `${r.startUTC}|${r.endUTC}`);
      const row = rec({
        game: 'HSR',
        name,
        phase: mm?.phase_num ? String(mm.phase_num) : '—',
        startUTC: r.startUTC,
        endUTC: r.endUTC,
        source: URL,
        notes: 'UTC-5 per Game8',
        version: mm?.version,
        phase_num: mm?.phase_num,
        status: mm?.status,
        banner_type: 'Character',
        rerun: reruns.has(name)
      });
      if(row) list.push(row);
    }
  }

  // 2) Light Cones (optional, include if you want them on the calendar)
  // From both "All Warp Banner Dates List" & Phase sections, e.g.:
  // "3.5 Part 1 Light Cones (Aug. 12 - Sep. 02, 2025)"
  const reLC = /(Light Cones?)\s*\(([^)]+)\)/g;
  for(let m; (m = reLC.exec(text)); ){
    const label = m[1]; // e.g., "Light Cones"
    const ranges = extractDateRanges(m[2], 'UTC-5');
    for(const r of ranges){
      const mm = vpMap.find(v => v.key === `${r.startUTC}|${r.endUTC}`);
      const row = rec({
        game: 'HSR',
        name: label, // or make separate entries per LC if you prefer
        phase: mm?.phase_num ? String(mm.phase_num) : '—',
        startUTC: r.startUTC,
        endUTC: r.endUTC,
        source: URL,
        notes: 'UTC-5 per Game8',
        version: mm?.version,
        phase_num: mm?.phase_num,
        status: mm?.status,
        banner_type: 'Light Cone',
        rerun: false
      });
      if(row) list.push(row);
    }
  }

  return list;
}
