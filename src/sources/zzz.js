// src/sources/zzz.js
import { fetchDoc, extractDateRanges, rec, normalize } from './common.js';

const URL = 'https://game8.co/games/Zenless-Zone-Zero/archives/435687';

// Known W-Engine channel names (easy to extend)
const ENGINE_CHANNELS = new Set([
  'Dazzling Choir',
  'Dazzling Melody',
  'Vibrant Resonance',
  'Dissonant Sonata',
]);

export async function scrapeZZZ(){
  const { $, html } = await fetchDoc(URL);
  const text = normalize($.root().text());

  // Limit to the schedule section to reduce false hits
  const anchor = 'ZZZ Banner Schedule';
  let seg = text;
  const i = text.indexOf(anchor);
  if (i >= 0) {
    // take a generous window after the anchor; tweak if the page grows
    seg = text.slice(i, i + 5000);
  }
  console.log('[ZZZ] scheduleMarker:', i >= 0, 'segmentLen:', seg.length);

  const out = [];
  const matches = [];

  // Pattern: "<Left> = <RightDates>"
  // Ex: "Alice Banner = August 6, 2025 - September 3, 2025"
  //     "Yanagi Rerun Banner = August 6, 2025 - September 3, 2025"
  //     "Dazzling Choir = August 6, 2025 - September 3, 2025"
  const reEq = /([A-Z][^=]{1,80}?)\s*=\s*([A-Za-z][A-Za-z.]+\s+\d{1,2},\s*\d{4}\s*(?:-|to)\s*[A-Za-z][A-Za-z.]+\s+\d{1,2},\s*\d{4})/g;

  for (let m; (m = reEq.exec(seg)); ){
    const left = m[1].trim();
    const right = m[2].trim();
    matches.push({ left, right });
    const ranges = extractDateRanges(right, 'UTC'); // ZZZ page doesn't state offset; UTC is fine for date-only
    if (!ranges.length) continue;

    const isRerun = /rerun/i.test(left);
    let name = left;
    let banner_type = 'Agent';

    if (/banner/i.test(left)) {
      name = name.replace(/Rerun\s+Banner/i, '').replace(/\s*Banner$/i, '').trim();
    } else if (ENGINE_CHANNELS.has(name)) {
      banner_type = 'W-Engine';
    } else {
      // Heuristic: treat non-"Banner" entries in this block as W-Engine channels
      banner_type = 'W-Engine';
    }

    for (const r of ranges) {
      const row = rec({
        game: 'ZZZ',
        name,
        phase: '—',
        startUTC: r.startUTC,
        endUTC: r.endUTC,
        source: URL,
        notes: 'ZZZ Banner Schedule (Game8)',
        banner_type,
        rerun: !!isRerun
      });
      if (row) out.push(row);
    }
  }

  console.log('[ZZZ] eqMatches:', matches.length);
  if (matches.length && out.length === 0) {
    console.log('[ZZZ] firstRightSamples:', matches.slice(0, 3).map(x => x.right));
  }
  console.log('[ZZZ] rows produced:', out.length);
  return out;
}
