#!/usr/bin/env python3
"""Fetch fresh headlines and videos for Just.us into data/.  Standard library only.
A failing source is skipped and logged in data/status.json; items already stored are kept."""
import datetime as dt
import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
SITE = json.loads((ROOT / "src" / "site.json").read_text("utf-8"))
KEYS = [k.lower() for k in SITE["keywords"]]
UA = {"User-Agent": "Mozilla/5.0 (compatible; JustUsBot/1.0; +" + SITE["url"] + ")"}
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}


def load(name):
    try:
        return json.loads((DATA / name).read_text("utf-8"))
    except Exception:
        return []


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
        return r.read()


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()


def wanted(title, src):
    return not src.get("filter") or any(k in title.lower() for k in KEYS)


def iso(s):
    s = (s or "").strip()
    try:
        return parsedate_to_datetime(s).astimezone(dt.timezone.utc).isoformat()
    except Exception:
        pass
    try:
        return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(dt.timezone.utc).isoformat()
    except Exception:
        return dt.datetime.now(dt.timezone.utc).isoformat()


def feed_items(src):
    root = ET.fromstring(get(src["url"]))
    out = []
    for it in root.iter("item"):  # RSS 2.0
        t, link = clean(it.findtext("title")), (it.findtext("link") or "").strip()
        if t and link.startswith("http") and wanted(t, src):
            out.append({"title": t[:160], "link": link, "source": src["name"], "date": iso(it.findtext("pubDate"))})
    for it in root.iterfind("a:entry", NS):  # Atom
        node = it.find("a:link", NS)
        t, link = clean(it.findtext("a:title", "", NS)), (node.get("href", "") if node is not None else "")
        if t and link.startswith("http") and wanted(t, src):
            out.append({"title": t[:160], "link": link, "source": src["name"], "date": iso(it.findtext("a:updated", "", NS))})
    return out[:12]


def channel_items(src):
    root = ET.fromstring(get("https://www.youtube.com/feeds/videos.xml?channel_id=" + src["id"]))
    out = []
    for it in root.iterfind("a:entry", NS):
        vid, t = it.findtext("yt:videoId", "", NS), clean(it.findtext("a:title", "", NS))
        if re.fullmatch(r"[\w-]{6,20}", vid or "") and t and wanted(t, src) and "#shorts" not in t.lower():
            out.append({"id": vid, "title": t[:120], "channel": src["name"], "date": iso(it.findtext("a:published", "", NS))})
    return out[:8]


def merge(old, new, key, cap):
    seen, out = set(), []
    for x in sorted(new + old, key=lambda x: x["date"], reverse=True):
        if x[key] not in seen:
            seen.add(x[key])
            out.append(x)
    return out[:cap]


def run(sources, fn, store, key, cap, status):
    fresh = []
    for src in sources:
        try:
            got = fn(src)
            fresh += got
            status[src["name"]] = f"ok ({len(got)})"
        except Exception as err:  # keep going: one bad source must not break the build
            status[src["name"]] = f"skipped: {type(err).__name__}"
    items = merge(load(store), fresh, key, cap)
    (DATA / store).write_text(json.dumps(items, ensure_ascii=False, indent=1), "utf-8")
    return len(items)


if __name__ == "__main__":
    status = {"checked": dt.date.today().isoformat()}
    n_reads = run(SITE["feeds"], feed_items, "reads.json", "link", 60, status)
    n_videos = run(SITE["channels"], channel_items, "videos.json", "id", 30, status)
    (DATA / "status.json").write_text(json.dumps(status, indent=1), "utf-8")
    print(f"reads: {n_reads}, videos: {n_videos}", status)
