#!/usr/bin/env python3
"""Build data/wall.json — the "What members are up to" wall.

Runs daily in GitHub Actions (.github/workflows/update-wall.yml). No member has to do anything:
the script collects what members already publish in open sources.

  * Publications ... OpenAlex (free, open scholarly database)  -> data/wall-sources.json "openalex"
  * Software ....... GitHub public repos and releases            -> "github"
  * Videos ......... YouTube channel feeds                       -> "youtube"

To add or fix a person, edit data/wall-sources.json. Standard library only.
Optional env vars: OPENALEX_API_KEY (free key, higher daily budget), GITHUB_TOKEN (set by Actions).
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCES = os.path.join(ROOT, "data", "wall-sources.json")
OUT = os.path.join(ROOT, "data", "wall.json")
UA = "ewri-stormwater-wall/1.0 (+https://ewri-stormwater.org; mailto:contact@ewri-stormwater.org)"
TODAY = dt.date.today()
MAX_ITEMS = 150
SKIP_WORK_TYPES = {"peer-review", "erratum", "paratext", "retraction", "editorial", "letter", "other", "supplementary-materials", "dataset", "software"}


def fetch(url, headers=None, tries=4):
    h = {"User-Agent": UA}
    h.update(headers or {})
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and k < tries - 1:
                time.sleep(6 * (k + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def clean(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return re.sub(r"\s+", " ", s).strip()


# --------------------------------------------------------------------------- publications
def openalex(cfg):
    people = {p["openalex"]: p["member"] for p in cfg if p.get("openalex")}
    if not people:
        return []
    since = (TODAY - dt.timedelta(days=cfg_days("publications"))).isoformat()
    items, ids = [], list(people)
    key = os.environ.get("OPENALEX_API_KEY")
    for i in range(0, len(ids), 40):
        chunk = ids[i:i + 40]
        params = {
            "filter": f"author.id:{'|'.join(chunk)},from_publication_date:{since},to_publication_date:{TODAY.isoformat()}",
            "sort": "publication_date:desc",
            "per-page": "100",
            "select": "id,doi,title,publication_date,type,primary_location,authorships",
        }
        if key:
            params["api_key"] = key
        else:
            params["mailto"] = "contact@ewri-stormwater.org"
        data = json.loads(fetch("https://api.openalex.org/works?" + urllib.parse.urlencode(params)))
        for w in data.get("results", []):
            if (w.get("type") or "") in SKIP_WORK_TYPES or not w.get("title"):
                continue
            members = []
            for a in w.get("authorships", []):
                aid = ((a.get("author") or {}).get("id") or "").split("/")[-1]
                if aid in people and people[aid] not in members:
                    members.append(people[aid])
            if not members:
                continue
            loc = w.get("primary_location") or {}
            src = (loc.get("source") or {}).get("display_name")
            url = w.get("doi") or loc.get("landing_page_url") or w["id"]
            items.append({
                "type": "publication",
                "members": members,
                "title": clean(w["title"]),
                "where": re.sub(r"\s*\(.*?\)", "", src) if src else (w.get("type") or "").replace("-", " ").capitalize(),
                "date": w["publication_date"],
                "url": url,
            })
        time.sleep(1)
    return items


# --------------------------------------------------------------------------- software
def github(cfg):
    items = []
    tok = os.environ.get("GITHUB_TOKEN")
    hdr = {"Accept": "application/vnd.github+json"}
    if tok:
        hdr["Authorization"] = f"Bearer {tok}"
    since = TODAY - dt.timedelta(days=cfg_days("software"))
    for p in cfg:
        user = p.get("github")
        extra = [{"full_name": r, "name": r.split("/")[-1]} for r in p.get("repos", [])]
        if not user and not extra:
            continue
        repos = json.loads(fetch(f"https://api.github.com/users/{user}/repos?sort=pushed&per_page=30&type=owner", hdr)) if user else []
        for r in repos:
            if r.get("fork") or r.get("private"):
                continue
            created = r["created_at"][:10]
            if dt.date.fromisoformat(created) >= since:
                items.append({
                    "type": "software", "members": [p["member"]],
                    "title": f"New open-source project: {r['name']}",
                    "summary": clean(r.get("description"))[:220],
                    "where": "GitHub", "date": created, "url": r["html_url"],
                })
        for r in extra + [r for r in repos if not r.get("fork")][:8]:
            try:
                rels = json.loads(fetch(f"https://api.github.com/repos/{r['full_name']}/releases?per_page=3", hdr))
                if "description" not in r:
                    r["description"] = json.loads(fetch(f"https://api.github.com/repos/{r['full_name']}", hdr)).get("description")
            except urllib.error.HTTPError:
                continue
            for rel in rels:
                d = (rel.get("published_at") or "")[:10]
                if not d or rel.get("draft") or dt.date.fromisoformat(d) < since:
                    continue
                items.append({
                    "type": "software", "members": [p["member"]],
                    "title": f"{r['name']} {rel.get('name') or rel.get('tag_name')}".strip(),
                    "summary": clean(r.get("description"))[:220],
                    "where": "GitHub release", "date": d, "url": rel["html_url"],
                })
    return items


# --------------------------------------------------------------------------- videos
def youtube(cfg):
    items = []
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015", "m": "http://search.yahoo.com/mrss/"}
    since = TODAY - dt.timedelta(days=cfg_days("videos"))
    for p in cfg:
        cid = p.get("youtube")
        if not cid:
            continue
        root = ET.fromstring(fetch(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
        for e in root.findall("a:entry", ns)[:8]:
            d = e.findtext("a:published", "", ns)[:10]
            if not d or dt.date.fromisoformat(d) < since:
                continue
            vid = e.findtext("yt:videoId", "", ns)
            items.append({
                "type": "video", "members": [p["member"]],
                "title": clean(e.findtext("a:title", "", ns)),
                "where": e.findtext("a:author/a:name", "YouTube", ns),
                "date": d, "url": f"https://www.youtube.com/watch?v={vid}",
                "thumb": f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
            })
    return items


CONFIG = {}


def cfg_days(kind):
    return int(CONFIG.get("lookback_days", {}).get(kind, 365))


def main():
    global CONFIG
    CONFIG = json.load(open(SOURCES))
    people = CONFIG["people"]
    try:
        previous = json.load(open(OUT))
    except Exception:
        previous = {"items": []}

    collected, status = [], {}
    for kind, fn in (("publication", openalex), ("software", github), ("video", youtube)):
        try:
            got = fn(people)
            collected += got
            status[kind] = f"ok ({len(got)})"
        except Exception as e:  # keep yesterday's items for a source that failed today
            kept = [i for i in previous.get("items", []) if i.get("type") == kind]
            collected += kept
            status[kind] = f"failed, kept {len(kept)} previous: {e}"
        print(kind, status[kind], file=sys.stderr)

    seen, items = set(), []
    for it in sorted(collected, key=lambda i: i["date"], reverse=True):
        k = it["url"].lower().rstrip("/")
        if k in seen:
            continue
        seen.add(k)
        items.append(it)
    items = items[:MAX_ITEMS]

    if previous.get("items") == items:
        print("no changes", file=sys.stderr)
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "status": status,
                   "photos": {p["member"]: p["photo"] for p in people if p.get("photo")}, "items": items}, f, indent=1, ensure_ascii=False)
    print(f"wrote {len(items)} items", file=sys.stderr)


if __name__ == "__main__":
    main()
