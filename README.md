# Banner Calendars – Auto Builder

Nightly GitHub Action scrapes trusted pages for banner start/end dates for:
- Honkai: Star Rail (HSR)
- Zenless Zone Zero (ZZZ)
- Genshin Impact (GI)
- Wuthering Waves (WUWA)
- Girls' Frontline 2 (GF2)

Output: `banners.json` at the repo root, consumed by your static site (`index.html`) via a simple `fetch()`.

## Deploy

1. Create a new GitHub repo and push these files.
2. Enable **GitHub Pages** (if you want to host the static page from this repo): Settings → Pages → Source = `main` → Root.
3. Actions → enable workflows. The nightly job will create/update `banners.json` automatically.
4. Open your site. The included `index.html` fetches `/banners.json` automatically.

## Local run

```bash
npm i
npm run build
# banners.json will be created/updated
```

## Data schema

```json
{
  "game": "HSR|ZZZ|GI|WUWA|GF2",
  "name": "Banner name",
  "phase": "Phase 1|Phase 2|Rerun|—",
  "start": "2025-08-06T00:00:00Z",
  "end":   "2025-09-03T00:00:00Z",
  "notes": "optional",
  "source": "URL used"
}
```

**Timezone note:** Source pages often list dates in *server time* or a specific offset (e.g., `UTC-5`). When a precise time isn’t provided, scrapers default to **00:00 at the page’s stated timezone (if any), converted to UTC**. You can override any entry via `data/manual.json`. The website UI lets you display in any timezone.

## Overrides

Put manual entries in `data/manual.json` (same schema). They will be merged in **and** take precedence over scraped duplicates.

## Workflow

- `.github/workflows/scrape.yml` runs nightly and on demand.
- It runs `node src/build.js`.
- If `banners.json` changed, it commits back to `main`.

## Sources (per game)

- HSR: Game8 – “All Current and Upcoming Warp Banners Schedule”
- ZZZ: Game8 – “Current and Upcoming Signal Search Banner Schedule”
- Genshin: Game8 – “Current and Next Banner Schedule”
- Wuthering Waves: Game8 – “All Current and Next Banners (Gacha)”
- Girls’ Frontline 2: GFL2 Help – “Banner History”

If a page’s layout changes, update the adapter in `src/sources/*.js`. The system fails gracefully and keeps the last `banners.json` plus overrides.
