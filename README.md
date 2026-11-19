# ASCE EWRI Stormwater Modeling Committee — website

Source for **https://ewri-stormwater.org**, the website of the Stormwater Modeling Committee
(Urban Water Resources Research Council, Environmental & Water Resources Institute of ASCE).

It is a plain static site — HTML, one stylesheet, one small script. No build step, no frameworks.

## Structure

| Path | What it is |
|---|---|
| `index.html` | Home page (initiatives, resources, events, meeting notes, people, join) |
| `Initiatives/` | One page per task committee + `template.html` for new ones (see `Initiatives/README.md`) |
| `Resources/data-sources.html` | Curated data sources for modeling |
| `MeetingNotes/` | One page per committee meeting |
| `assets/site.css` | All styles (brand colors and fonts are CSS variables at the top) |
| `assets/site.js` | Mobile menu, scroll reveal and the animated "wave field" brand motif |
| `assets/icons.svg` | Icon sprite — use with `<svg class="icon"><use href="assets/icons.svg#i-NAME"></use></svg>` |
| `assets/img/` | Optimized logo, favicons, social image and member photos |
| `assets/fonts/` | Self-hosted Montserrat + Inter (SIL OFL) |
| `Images/`, `Members/`, `Learning/` | Original brand files and source photos (not loaded by the site) |
| `CNAME` | Custom domain for GitHub Pages |

## Common edits

- **Add meeting notes:** copy `MeetingNotes/2026-02-12-meeting-notes.html`, edit, then add a `note-row` link in the `#meeting-notes` section of `index.html`.
- **Add/update an event:** edit the `events` list in the `#conferences` section of `index.html`.
- **Add a member photo:** square JPG, ~480px, into `assets/img/members/` (lowercase file name).

## Brand

- Colors: navy `#061a2b`, ocean blue `#0a91bd`, aqua `#00aadb`, teal `#2bb3a0`, green `#5dba7d`
- Type: Montserrat (headings, matches the logo wordmark) and Inter (body)
- `assets/img/mark-simple.svg` is a simplified mark for small sizes (nav, favicon); use the full logo files in `Images/` for print.

## Hosting

Deployed by GitHub Pages from the `main` branch (root). Any push to `main` goes live in about a minute.
Preview locally with `python3 -m http.server` and open http://localhost:8000.

**Cache busting:** pages load `assets/site.css?v=YYYYMMDD`. After changing the CSS or JS, bump that
number in every HTML file (search & replace) so visitors' browsers fetch the new version.

## Member activity wall

`activity.html` and the "What members are up to" section on the homepage show recent publications,
open-source releases and videos by members. Nobody posts anything: a GitHub Action
(`.github/workflows/update-wall.yml`) runs `tools/update_wall.py` every day, collects items from
OpenAlex (papers), GitHub (repos/releases) and YouTube (channel feeds), and commits `data/wall.json`.

- **Add/remove a person:** edit `data/wall-sources.json` (OpenAlex author ID, GitHub username, YouTube channel ID).
- **Run it now:** GitHub → Actions → "Update member activity wall" → Run workflow.
- **Optional:** add a free OpenAlex API key as the repo secret `OPENALEX_API_KEY` for a dedicated daily quota.
