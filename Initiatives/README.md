# Initiative pages — guide for committee members

Each task committee has its own page in this folder.

## Update an existing page

Open the `.html` file (e.g. `teaching-tools.html`) and edit the text. The sections are:

| Section | What to put there |
|---|---|
| Hero (`page-hero`) | Title, one-sentence description, lead, status |
| Overview | 2 short paragraphs + a "Focus areas" bullet list |
| Recent updates | `<li><time>Month Year</time><p>…</p></li>` entries, **newest first** |
| Milestones | `class="done"` (complete), `class="now"` (in progress), `class="next"` (planned) |
| How to contribute | Who should get involved |
| At a glance (sidebar) | Lead, members, status, last updated |

## Add a new initiative

1. Copy `template.html` to a new lowercase, hyphenated name, e.g. `open-data.html`.
2. Replace every `[bracketed placeholder]`, and update `<title>` / description in the `<head>`. Remove the `noindex` meta tag.
3. In `../index.html`, copy one of the `<a class="card reveal" …>` blocks in the `#projects` section and point it at your page.
4. Add the page to `../sitemap.xml`.

Tips: keep paragraphs short, date every update, and link out to papers, repos and tools.
