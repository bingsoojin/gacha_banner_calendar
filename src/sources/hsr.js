// src/sources/hsr.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';
const URL = 'https://game8.co/games/Honkai-Star-Rail/archives/408381';

function parseVersionPhase(text){
  const out=[];
  const reVer=/Ver\.\s*(\d+\.\d+)/g;
  let m, cuts=[];
  while((m=reVer.exec(text))) cuts.push([m.index,m[1]]);
  for(let i=0;i<cuts.length;i++){
    const [s, ver] = cuts[i];
    const e = i+1<cuts.length ? cuts[i+1][0] : text.length;
    const chunk = text.slice(s,e);
    const status = /\(Current\)/.test(chunk)?'current':/\(Next\)/.test(chunk)?'next':/\(Upcoming\)/.test(chunk)?'upcoming':undefined;
    const reP=/(Phase|Part)\s*(\d)[^()]*\(([^)]+)\)/g;
    let p; while((p=reP.exec(chunk))){
      const phase_num=Number(p[2]);
      const ranges=extractDateRanges(p[3],'UTC-5'); // HSR server schedule UTC-5 stated on page
      for(const r of ranges) out.push({version:ver,phase_num,status,startUTC:r.startUTC,endUTC:r.endUTC});
    }
  }
  return out;
}

function detectReruns(text){
  const set=new Set();
  const re=/([A-Z][A-Za-z' \-]+?)\s+Rerun\b/gi; let m;
  while((m=re.exec(text))) set.add(m[1].trim());
  return set;
}

export async function scrapeHSR(){
  const { $, html } = await fetchDoc(URL);
  const text = normalize($.root().text());

  const vp=parseVersionPhase(text);
  const reruns=detectReruns(text);

  const out=[];
  // Character lines (ignore the banner title like "Indelible Coterie")
  // e.g., "Firefly Banner (...)" or "Jingliu Warp Banner (...)" etc.
  const re=/([A-Z][\w' .:-]+?)\s+(?:Character\s+Event\s+Warp|Warp\s+Banner|Banner|Event\s+Warp)\s*\(([^)]+)\)/g;
  for(let m; (m=re.exec(text)); ){
    const raw=m[1].trim();
    // skip generic banner titles
    if (/Indelible Coterie|Evernight|Permansor Terrae/i.test(raw)) continue;
    const name=raw.replace(/\s+Banner$/i,'').trim();
    const ranges=extractDateRanges(m[2],'UTC-5');
    for(const r of ranges){
      const match = vp.find(v => !(r.endUTC <= v.startUTC || r.startUTC >= v.endUTC));
      const row=rec({
        game:'HSR',
        name,
        phase: match?.phase_num ? String(match.phase_num) : '—',
        startUTC:r.startUTC,
        endUTC:r.endUTC,
        source:URL,
        notes:'UTC-5 per Game8',
        version:match?.version,
        phase_num:match?.phase_num,
        status:match?.status,
        banner_type:'Character',
        rerun: reruns.has(name)
      });
      if(row) out.push(row);
    }
  }

  console.log('[HSR] rows produced:', out.length);
  return out;
}
