// src/sources/zzz.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

const URL = 'https://game8.co/games/Zenless-Zone-Zero/archives/435687';

// Known W-Engine channel names seen on Game8 (kept small and editable)
const ENGINE_CHANNELS = new Set([
  'Dazzling Choir',
  'Dazzling Melody',
  'Vibrant Resonance',
  'Dissonant Sonata',
]);

export async function scrapeZZZ(){
  const { $, html } = await fetchDoc(URL);
  const text = normalize($.root().text());

  // Debug: Did we see the schedule section at all?
  const hasSchedule = /ZZZ Banner Schedule/i.test(text);
  console.log('[ZZZ] scheduleMarker:', hasSchedule, 'textLen:', text.length);

  const out = [];

  // Pattern: "<Left> = <RightDates>"
  // Examples (from Game8):
  // "Alice Banner = August 6, 2025 - September 3, 2025"
  // "Yanagi Rerun Banner = August 6, 2025 - September 3, 2025"
  // "Dazzling Choir = August 6, 2025 - September 3, 2025"
  // "Bangboo Banner = Permanent"  (skip – no dates)
  const reEq = /([A-Z][\w' :&.-]+?)\s*=\s*([A-Za-z0-9/,.\s-]+?\d{4})/g;
  for (let m; (m = reEq.exec(text)); ){
    const left = m[1].trim();
    const right = m[2].trim();

    // Ignore any rows that aren’t a date range (e.g., “Permanent”)
    const ranges = extractDateRanges(right, 'UTC'); // ZZZ page doesn’t state an offset; default to UTC
    if (!ranges.length) continue;

    // Classify
    const isRerun = /rerun/i.test(left);
    let name = left;
    let banner_type = 'Agent';

    if (/banner/i.test(left)) {
      // Strip trailing “Banner” (and “Rerun Banner”) from agent names
      name = name.replace(/Rerun\s+Banner/i, '').replace(/\s*Banner$/i, '').trim();
    } else {
      // No “Banner” word → likely a channel like “Dazzling Choir / Dazzling Melody”
      if (ENGINE_CHANNELS.has(name)) banner_type = 'W-Engine';
      else {
        // Heuristic: treat other non-Banner schedule lines as W-Engine channel names
        banner_type = 'W-Engine';
      }
    }

    for (const r of ranges){
      const row = rec({
        game: 'ZZZ',
        name,
        phase: '—',
        startUTC: r.startUTC,
        endUTC: r.endUTC,
        source: URL,
        notes: 'Schedule block on Game8',
        banner_type,
        rerun: !!isRerun
      });
      if (row) out.push(row);
    }
  }

  console.log('[ZZZ] rows produced:', out.length);
  if (out.length === 0) {
    const idx = text.indexOf('ZZZ Banner Schedule');
    if (idx >= 0) {
      console.log('[ZZZ] snippet:', text.slice(idx, idx + 200));
    }
  }
  return out;
}
