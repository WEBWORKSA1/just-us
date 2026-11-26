#!/usr/bin/env python3
"""Build Just.us: turn src/ and data/ into the static site at the repo root.
Standard library only.  Usage: python scripts/build.py"""
import datetime as dt
import hashlib
import html
import json
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, DATA, ASSETS = ROOT / "src", ROOT / "data", ROOT / "assets"
SITE = json.loads((SRC / "site.json").read_text("utf-8"))
URL, NAME = SITE["url"].rstrip("/"), SITE["name"]
NOW = dt.datetime.now(dt.timezone.utc)
TODAY = NOW.date()
e = html.escape
SITEMAP = []
COST = ["Free", "$", "$$", "$$$"]
ADS = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6620975821265271" crossorigin="anonymous"></script>'
TOPBAR = "Contact, if you are interested in this website/domain name/Sponsorship/Advertisement/Partnership"
BASEFIX = r"""<script>document.write('<base href="'+(/github\.io$/.test(location.hostname)?"/"+location.pathname.split("/")[1]+"/":"/")+'">')</script>"""
FONTS = "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap"


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def short(s, n=158):
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[: n - 1].rsplit(" ", 1)[0] + "…"


def nice(d):
    return f"{d:%B} {d.day}, {d.year}"


def rj(path, default):
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return default


def blocks(name):
    """Parse src/<name>: lines starting with @ open a block, other lines belong to it. Fields split on |."""
    out, cur = [], None
    for raw in (SRC / name).read_text("utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        f = [x.strip() for x in line.lstrip("@").split("|")]
        if line.startswith("@"):
            cur = (f, [])
            out.append(cur)
        elif cur:
            cur[1].append(f)
    return out


# ---------------------------------------------------------------- content
CATS, IDEAS = [], []
for head, rows in blocks("ideas.txt"):
    if head[0] == "cat":
        CATS.append({"slug": head[1], "name": head[2], "intro": head[3]})
    for r in rows:
        tags = [t.strip() for t in r[1].split(",") if t.strip()]
        cost, where = int(r[2]), r[3]
        if where == "home":
            tags.append("at-home")
        if cost == 0:
            tags.append("free")
        IDEAS.append({"slug": slug(r[0]), "title": r[0], "tags": tags, "cost": cost, "where": where, "mins": int(r[4]), "desc": r[5]})
IDX = {i["slug"]: i for i in IDEAS}
for c in CATS:
    c["items"] = [i for i in IDEAS if c["slug"] in i["tags"]]
DECKS = [{"slug": h[1], "name": h[2], "h1": h[3], "intro": h[4], "q": [r[0] for r in rows]} for h, rows in blocks("questions.txt")]
EXTRA = {h[0]: rows for h, rows in blocks("extras.txt")}
WYR = [[x.strip() for x in r[0].split("~")] for r in EXTRA["wyr"]]
KNOW = [r[0] for r in EXTRA["knowme"]]
CHAL = [r[0] for r in EXTRA["challenge"]]
QUIZ = [{"q": r[0], "a": r[1:6]} for r in EXTRA["quiz"]]
ALLQ = [(d["slug"], d["name"], q) for d in DECKS for q in d["q"]]
READS = rj(DATA / "reads.json", [])
VIDEOS = rj(DATA / "videos.json", [])
GUIDES = []
for f in sorted((SRC / "guides").glob("*.html")):
    first, body = f.read_text("utf-8").split("\n", 1)
    g = json.loads(first)
    g.update(slug=f.stem, body=body)
    GUIDES.append(g)
GUIDES.sort(key=lambda g: g["date"], reverse=True)
V = hashlib.sha1(b"".join(p.read_bytes() for p in sorted(ASSETS.rglob("*")) if p.suffix in (".css", ".js"))).hexdigest()[:8]


# ---------------------------------------------------------------- fragments
def idea_card(i, h="h3"):
    meta = f"<li>{COST[i['cost']]}</li><li>{'At home' if i['where'] == 'home' else 'Out'}</li><li>~{i['mins']} min</li>"
    return (f'<article class="idea" id="{i["slug"]}" data-cost="{i["cost"]}" data-where="{i["where"]}">'
            f'<{h}>{e(i["title"])}</{h}><p>{e(i["desc"])}</p><ul class="meta">{meta}</ul>'
            f'<button class="chip save" type="button" data-save="{i["slug"]}" aria-pressed="false">Save</button></article>')


def links(pairs):
    return "".join(f'<li><a href="@@/{p}">{e(t)}</a></li>' for p, t in pairs)


def reads_html(n):
    if not READS:
        return '<p class="muted">The reading list refreshes several times a day. Check back shortly.</p>'
    return '<ul class="reads">' + "".join(
        f'<li><a href="{e(r["link"])}" target="_blank" rel="noopener nofollow">{e(r["title"])}</a><span>{e(r["source"])} · {e(r["date"][:10])}</span></li>'
        for r in READS[:n]) + "</ul>"


def videos_html(n):
    if not VIDEOS:
        return '<p class="muted">New videos are added automatically as channels publish them. Check back shortly.</p>'
    return '<div class="videos">' + "".join(
        f'<button class="yt" type="button" data-yt="{e(v["id"])}" aria-label="Play video: {e(v["title"])}">'
        f'<img loading="lazy" alt="" width="480" height="360" src="https://i.ytimg.com/vi/{e(v["id"])}/hqdefault.jpg">'
        f'<span>{e(v["title"])}</span><small>{e(v["channel"])}</small></button>' for v in VIDEOS[:n]) + "</div>"


STRIP = '''<section class="strip no-print"><div class="wrap split"><div><h2>The Friday Two</h2><p>One date idea and one question worth asking, by email, at the end of the week. Free, short and easy to leave.</p></div>
<div><form class="form inline" data-form="newsletter" data-subject="Newsletter sign-up" data-done="nl-done"><div class="hp" aria-hidden="true"><label>Leave empty<input name="_honey" tabindex="-1" autocomplete="off"></label></div><label class="sr" for="nl-email">Email address</label><input id="nl-email" name="email" type="email" required placeholder="Your email address" autocomplete="email"><button class="btn sun" type="submit">Send me Fridays</button><label class="check"><input type="checkbox" name="consent" value="yes" required> <span>Yes, email me the weekly note. <a href="@@/privacy/">Privacy</a>.</span></label></form><p id="nl-done" class="done" tabindex="-1" hidden>You’re on the list. Talk soon.</p></div></div></section>'''


def page(path, title, desc, body, h1=None, lede="", crumbs=(), js=(), strip=True, index=True, schema=None, prio="0.6", hero=False):
    is404 = path == "404.html"
    base = "" if is404 else "../" * path.count("/")
    canon = URL + "/" + ("" if is404 else path)
    full = title if NAME in title else f"{title} | {NAME}"
    ld = [{"@context": "https://schema.org", "@type": "Organization", "name": NAME, "url": URL + "/", "logo": URL + "/assets/img/icon-512.png"}]
    trail = ""
    if path and not is404:
        items = [("", "Home"), *crumbs, (path, h1 or title)]
        ld.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": n + 1, "name": t, "item": f"{URL}/{p}"} for n, (p, t) in enumerate(items)]})
        trail = '<nav class="crumbs" aria-label="Breadcrumb">' + " / ".join(f'<a href="@@/{p}">{e(t)}</a>' for p, t in items[:-1]) + f" / {e(items[-1][1])}</nav>"
    elif not path:
        ld.append({"@context": "https://schema.org", "@type": "WebSite", "name": NAME, "url": URL + "/", "description": desc})
    if schema:
        ld.append(schema)
    head = "" if hero else f'<section class="page-head"><div class="wrap">{trail}<h1>{e(h1 or title)}</h1>' + (f'<p class="lede">{lede}</p>' if lede else "") + "</div></section>"
    nav = "".join(f'<a href="@@/{p}">{e(t)}</a>' for p, t in SITE["nav"])
    scripts = "".join(f'<script src="@@/assets/js/{j}.js?v={V}" defer></script>' for j in ("config", "core", *js))
    robots = "index, follow, max-image-preview:large" if index else "noindex, follow"
    doc = f'''<!doctype html>
<html lang="en" data-base="{base or "./"}" data-v="{V}">
<head>
<meta charset="utf-8">{BASEFIX if is404 else ""}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(full)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{NAME}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{URL}/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#16383c">
<link rel="icon" href="@@/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="@@/assets/img/apple-touch-icon.png">
<link rel="manifest" href="@@/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="{NAME} daily" href="@@/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS}" rel="stylesheet">
<link rel="stylesheet" href="@@/assets/css/site.css?v={V}">
{ADS}
<script type="application/ld+json">{json.dumps(ld).replace("</", "<\\/")}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="topbar no-print"><div class="wrap"><a href="https://web.works/contact" target="_blank" rel="noopener">{TOPBAR}</a></div></div>
<header class="site-header no-print"><div class="wrap">
<a class="logo" href="@@/" aria-label="{NAME} home">just<i aria-hidden="true"></i>us</a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
<nav class="nav" id="nav" aria-label="Main">{nav}<a class="btn small" href="@@/plan/">Plan a date for us</a></nav>
</div></header>
<main id="main">
{head}{body}
</main>
{STRIP if strip else ""}
<footer class="site-footer no-print"><div class="wrap">
<div class="foot-grid">
<div><a class="logo" href="@@/">just<i aria-hidden="true"></i>us</a><p>Free date ideas, questions and games for two. No sign-up and nothing to install.</p><a class="btn sun small" href="@@/plan/">Get a date planned</a></div>
<div><h4>Do together</h4><ul>{links([("dates/", "Date night generator"), ("questions/", "Question decks"), ("play/would-you-rather/", "Would you rather"), ("play/how-well-do-you-know-me/", "How well do you know me"), ("quiz/", "Care-style quiz"), ("tools/", "Planning tools")])}</ul></div>
<div><h4>Read &amp; watch</h4><ul>{links([("today/", "Today for two"), ("daily/", "Daily archive"), ("guides/", "Guides"), ("reads/", "Fresh reads"), ("videos/", "Videos")])}</ul></div>
<div><h4>Work with us</h4><ul>{links([("plan/", "Custom date plan"), ("partners/", "Advertise &amp; partner".replace("&amp;", "&")), ("contests/", "Monthly contest"), ("support/", "Support the project"), ("careers/", "Careers &amp; talent".replace("&amp;", "&"))])}</ul></div>
<div><h4>About</h4><ul>{links([("about/", "About"), ("contact/", "Contact"), ("privacy/", "Privacy policy"), ("terms/", "Terms of use"), ("cookies/", "Cookie policy"), ("disclaimer/", "Trademark & copyright")])}</ul></div>
</div>
<div class="foot-legal">
<p>© {TODAY.year} {NAME}. Original text, tools and design © {NAME}. All rights reserved.</p>
<p>{NAME} is an independent website, written with the dot as the name of this domain. It is not affiliated with, endorsed by or connected to any person, company, product or trademark named “Justus”, “JustUs” or “Just Us”. Third-party names and marks belong to their owners. <a href="@@/disclaimer/">Full disclosure</a>.</p>
<p>{NAME} shares ideas and conversation prompts for entertainment and general information. It is not counselling or professional advice. Headlines and videos link to their original publishers. Content refreshed <time datetime="{TODAY.isoformat()}">{nice(TODAY)}</time>.</p>
</div>
</div></footer>
{scripts}
</body>
</html>
'''
    out = ROOT / (path if is404 else path + "index.html")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc.replace("@@/", base or "./"), "utf-8")
    if index and not is404:
        SITEMAP.append((path, prio))


# ---------------------------------------------------------------- daily picks
def pick(seq, day, salt):
    return seq[int(hashlib.sha256(f"{day}{salt}".encode()).hexdigest(), 16) % len(seq)]


DATA.mkdir(exist_ok=True)
daily = rj(DATA / "daily.json", [])
have = {d["date"] for d in daily}
for back in range(6, -1, -1):
    day = (TODAY - dt.timedelta(days=back)).isoformat()
    if day not in have:
        dk, dn, q = pick(ALLQ, day, "q")
        daily.append({"date": day, "deck": dk, "deckName": dn, "q": q, "idea": pick(IDEAS, day, "i")["slug"],
                      "wyr": pick(WYR, day, "w"), "challenge": pick(CHAL, day, "c")})
daily = sorted(daily, key=lambda d: d["date"])[-120:]
(DATA / "daily.json").write_text(json.dumps(daily, ensure_ascii=False, indent=1), "utf-8")
LATEST = daily[-1]


def daily_body(d, extras=False):
    i = IDX.get(d["idea"], IDEAS[0])
    more = ""
    if extras:
        more = f'<h2>Fresh reads</h2>{reads_html(4)}<p><a href="@@/reads/">All fresh reads</a></p><h2>Watch together</h2>{videos_html(2)}<p><a href="@@/videos/">All videos</a> · <a href="@@/daily/">Earlier days</a></p>'
    return f'''<section class="section"><div class="wrap narrow">
<div class="duo" data-daily="{d["date"]}"><p class="eyebrow">Question for two · from <a href="@@/questions/{d["deck"]}/">{e(d["deckName"])}</a></p><h2 class="qtext">{e(d["q"])}</h2><div class="duo-ui"></div></div>
<h2>Date idea of the day</h2>{idea_card(i)}
<h2>Would you rather</h2><div class="wyr-static"><span>{e(d["wyr"][0])}</span><b>or</b><span>{e(d["wyr"][1])}</span></div><p><a class="btn ghost" href="@@/play/would-you-rather/">Play ten rounds</a></p>
<h2>Two-minute challenge</h2><p class="callout">{e(d["challenge"])}</p>
{more}</div></section>'''


def today_card(d):
    i = IDX.get(d["idea"], IDEAS[0])
    return f'''<div class="today"><a class="today-q" href="@@/today/"><span class="eyebrow">Question for two</span><strong>{e(d["q"])}</strong><span class="more">Answer it together →</span></a>
<a href="@@/today/"><span class="eyebrow">Date idea of the day</span><strong>{e(i["title"])}</strong><span>{e(i["desc"])}</span></a>
<a href="@@/today/"><span class="eyebrow">Two-minute challenge</span><span>{e(d["challenge"])}</span></a></div>'''


# ---------------------------------------------------------------- tokens for src/pages
month_end = (TODAY.replace(day=28) + dt.timedelta(days=4)).replace(day=1) - dt.timedelta(days=1)
themes = SITE["contest"]["themes"]
TOK = {
    "idea_count": len(IDEAS),
    "question_count": len(ALLQ),
    "deck_count": len(DECKS),
    "cats": '<div class="grid cats">' + "".join(f'<a class="card" href="@@/dates/{c["slug"]}/"><strong>{e(c["name"])}</strong><span>{len(c["items"])} ideas</span></a>' for c in CATS) + "</div>",
    "decks": '<div class="grid decks">' + "".join(f'<a class="card" href="@@/questions/{d["slug"]}/"><strong>{e(d["name"])}</strong><span>{e(short(d["intro"], 90))}</span><small>{len(d["q"])} questions</small></a>' for d in DECKS) + "</div>",
    "guides": '<div class="grid guides">' + "".join(f'<a class="card" href="@@/guides/{g["slug"]}/"><strong>{e(g["title"])}</strong><span>{e(g["desc"])}</span><small>{g["mins"]} min read</small></a>' for g in GUIDES) + "</div>",
    "today": today_card(LATEST),
    "reads6": reads_html(6),
    "videos2": videos_html(2),
    "ideas_all": "".join(idea_card(i) for i in IDEAS),
    "wyr_list": "<ol class=\"qlist\">" + "".join(f"<li>Would you rather {e(a)} or {e(b)}?</li>" for a, b in WYR[:30]) + "</ol>",
    "contest_theme": e(themes[(TODAY.month - 1) % len(themes)]),
    "contest_prize": e(SITE["contest"]["prize"]),
    "contest_deadline": nice(month_end),
    "contest_iso": month_end.isoformat(),
    "month": f"{TODAY:%B %Y}",
    "updated": nice(TODAY),
}


def fill(body):
    return re.sub(r"\{\{(\w+)\}\}", lambda m: str(TOK.get(m.group(1), m.group(0))), body)


# ---------------------------------------------------------------- pages from src/pages
for f in sorted((SRC / "pages").glob("*.html")):
    first, body = f.read_text("utf-8").split("\n", 1)
    m = json.loads(first)
    page(m["path"], m["title"], m["desc"], fill(body), h1=m.get("h1"), lede=m.get("lede", ""), js=m.get("js", ()), strip=m.get("strip", True),
         index=m.get("index", True), prio=m.get("prio", "0.6"), hero=m.get("hero", False), crumbs=[tuple(c) for c in m.get("crumbs", [])])

# ---------------------------------------------------------------- date categories
for c in CATS:
    others = "".join(f'<a class="chip" href="@@/dates/{o["slug"]}/">{e(o["name"])}</a>' for o in CATS if o is not c)
    body = f'''<section class="section"><div class="wrap">
<div class="filterbar" data-filter="#list"></div>
<div class="idea-list" id="list">{"".join(idea_card(i, "h2") for i in c["items"])}</div>
<div class="callout split"><div><h2>Can’t choose?</h2><p>Let the generator pick one that fits your budget, time and mood, or hand the planning to us.</p></div><p><a class="btn" href="@@/dates/#gen">Spin a date</a> <a class="btn ghost" href="@@/plan/">Have it planned for you</a></p></div>
<h2>More kinds of dates</h2><p class="chips">{others}</p>
<p class="muted small">Cost guide: Free, $ under about US$20 for two, $$ about US$20–60, $$$ more than that. Times are rough.</p>
</div></section>'''
    page(f'dates/{c["slug"]}/', f'{c["name"]} date ideas: {len(c["items"])} to try', short(c["intro"]), body, h1=f'{c["name"]} date ideas',
         lede=e(c["intro"]), crumbs=[("dates/", "Date ideas")], js=["play"], prio="0.8")

# ---------------------------------------------------------------- question decks
for d in DECKS:
    others = "".join(f'<a class="chip" href="@@/questions/{o["slug"]}/">{e(o["name"])}</a>' for o in DECKS if o is not d)
    body = f'''<section class="section"><div class="wrap narrow">
<div class="player" data-deck="{d["slug"]}"></div>
<h2>All {len(d["q"])} questions in this deck</h2><ol class="qlist">{"".join(f"<li>{e(q)}</li>" for q in d["q"])}</ol>
<p class="callout">Take turns. Whoever asks listens without interrupting, then answers the same question. One question answered properly beats ten rushed ones.</p>
<h2>More decks</h2><p class="chips">{others}</p></div></section>'''
    page(f'questions/{d["slug"]}/', f'{d["h1"]}: {len(d["q"])} to ask', short(d["intro"]), body, h1=d["h1"], lede=e(d["intro"]),
         crumbs=[("questions/", "Questions")], js=["play"], prio="0.8")

# ---------------------------------------------------------------- daily pages
d_today = dt.date.fromisoformat(LATEST["date"])
page("today/", f"Today for two: {nice(d_today)}", short(f'Today’s question for two: {LATEST["q"]} Plus a date idea, a would-you-rather and a two-minute challenge.'),
     daily_body(LATEST, True), h1="Today for two", lede=f"{d_today:%A}, {nice(d_today)}. One question, one date idea, one small challenge. It changes every day.", js=["play"], prio="0.9")
for d in daily:
    dd = dt.date.fromisoformat(d["date"])
    page(f'daily/{d["date"]}/', f"For two on {nice(dd)}", short(f'Question for two: {d["q"]} Plus the date idea and challenge for {nice(dd)}.'), daily_body(d),
         h1=f"{dd:%A}, {nice(dd)}", lede="The question, date idea and challenge from this day.", crumbs=[("daily/", "Daily archive")], js=["play"], prio="0.4")
rows = "".join(f'<li><a href="@@/daily/{d["date"]}/">{e(d["q"])}</a><span>{nice(dt.date.fromisoformat(d["date"]))}</span></li>' for d in reversed(daily))
page("daily/", "Daily archive: a question for two, every day", "Every daily question, date idea and two-minute challenge published on Just.us, newest first.",
     f'<section class="section"><div class="wrap narrow"><ul class="reads">{rows}</ul></div></section>', h1="Daily archive",
     lede='Missed a day? Each one is kept here. <a href="@@/today/">Go to today</a>.', prio="0.5")

# ---------------------------------------------------------------- reads, videos
src_list = ", ".join(f'<a href="{e(s["home"])}" target="_blank" rel="noopener">{e(s["name"])}</a>' for s in SITE["feeds"])
page("reads/", "Fresh reads on love and relationships", "New articles on relationships, communication and connection from respected publishers, gathered automatically and linked to the source.",
     f'<section class="section"><div class="wrap narrow">{reads_html(40)}<p class="muted small">Headlines belong to their publishers and open on the original site. Sources: {src_list}. Inclusion is not an endorsement.</p></div></section>',
     h1="Fresh reads", lede="Worth-your-time articles on relationships from researchers, educators and thoughtful writers. Updated automatically through the day.")
ch_list = ", ".join(f'<a href="https://www.youtube.com/channel/{e(c["id"])}" target="_blank" rel="noopener">{e(c["name"])}</a>' for c in SITE["channels"])
page("videos/", "Videos to watch together", "Recent talks and short lessons on relationships and communication, picked up automatically from educational YouTube channels.",
     f'<section class="section"><div class="wrap">{videos_html(24)}<p class="muted small">Videos are embedded from YouTube and belong to their creators: {ch_list}. Pressing play loads the YouTube player.</p></div></section>',
     h1="Watch together", lede="Pick one, watch it side by side, then ask each other: what is one thing we could try this week?")

# ---------------------------------------------------------------- guides
page("guides/", "Guides for two", "Practical, plainly written guides on planning dates that happen, asking better questions, long-distance rituals and more.",
     f'<section class="section"><div class="wrap">{TOK["guides"]}</div></section>', h1="Guides",
     lede="Short, practical reads. Each one ends with something to do tonight.", prio="0.8")
for g in GUIDES:
    rest = "".join(f'<li><a href="@@/guides/{o["slug"]}/">{e(o["title"])}</a></li>' for o in GUIDES if o is not g)
    gd = dt.date.fromisoformat(g["date"])
    body = f'''<section class="section"><div class="wrap narrow"><p class="byline">By the {NAME} editors · Updated {nice(gd)} · {g["mins"]} min read</p>
<article class="prose">{g["body"]}</article>
<div class="callout split"><div><h2>Put it to use</h2><p>Spin a date that fits tonight, or pull a question to ask over dinner.</p></div><p><a class="btn" href="@@/dates/">Spin a date</a> <a class="btn ghost" href="@@/questions/">Pull a question</a></p></div>
<h2>More guides</h2><ul>{rest}</ul></div></section>'''
    page(f'guides/{g["slug"]}/', g["title"], g["desc"], body, crumbs=[("guides/", "Guides")], prio="0.7", schema={
        "@context": "https://schema.org", "@type": "Article", "headline": g["title"], "description": g["desc"], "datePublished": g["date"], "dateModified": g["date"],
        "author": {"@type": "Organization", "name": NAME, "url": URL + "/about/"}, "publisher": {"@type": "Organization", "name": NAME},
        "mainEntityOfPage": f'{URL}/guides/{g["slug"]}/', "image": URL + "/assets/img/og.png"})

# ---------------------------------------------------------------- data for the browser, feeds, icons
(ASSETS / "data").mkdir(parents=True, exist_ok=True)
(ASSETS / "data" / "app.json").write_text(json.dumps({
    "ideas": IDEAS, "decks": [{"slug": d["slug"], "name": d["name"], "q": d["q"]} for d in DECKS], "wyr": WYR, "know": KNOW, "quiz": QUIZ}, ensure_ascii=False, separators=(",", ":")), "utf-8")

sm = "".join(f"<url><loc>{URL}/{p}</loc><lastmod>{TODAY.isoformat()}</lastmod><priority>{pr}</priority></url>\n" for p, pr in sorted(SITEMAP))
(ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{sm}</urlset>\n', "utf-8")
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {URL}/sitemap.xml\n", "utf-8")
items = "".join(
    f'<item><title>{e("Question for two: " + d["q"])}</title><link>{URL}/daily/{d["date"]}/</link><guid>{URL}/daily/{d["date"]}/</guid>'
    f'<pubDate>{dt.datetime.fromisoformat(d["date"]).strftime("%a, %d %b %Y")} 00:00:00 +0000</pubDate>'
    f'<description>{e("Date idea: " + IDX.get(d["idea"], IDEAS[0])["title"] + ". Challenge: " + d["challenge"])}</description></item>\n' for d in reversed(daily[-20:]))
(ROOT / "feed.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>{NAME} daily</title><link>{URL}/</link>'
                               f'<description>A question, a date idea and a small challenge for two, every day.</description><language>en</language>\n{items}</channel></rss>\n', "utf-8")
(ROOT / "manifest.webmanifest").write_text(json.dumps({
    "name": NAME, "short_name": NAME, "start_url": "./", "display": "standalone", "background_color": "#fbf5ec", "theme_color": "#16383c",
    "icons": [{"src": "assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"}]}), "utf-8")


def png(path, w, h):
    """Write the two-circle mark as a PNG (once); pure Python so the build needs no image library."""
    if path.exists():
        return
    r, cy = min(w, h) * 0.27, h / 2
    c1, c2, rr = w / 2 - r * 0.55, w / 2 + r * 0.55, r * r
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        dy = (y - cy) ** 2
        for x in range(w):
            a, b = (x - c1) ** 2 + dy <= rr, (x - c2) ** 2 + dy <= rr
            raw += b"\xff\xf4\xe6" if a and b else b"\xe8\x5d\x3a" if a else b"\xf6\xc4\x53" if b else b"\x16\x38\x3c"

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


png(ASSETS / "img" / "og.png", 1200, 630)
png(ASSETS / "img" / "icon-512.png", 512, 512)
png(ASSETS / "img" / "apple-touch-icon.png", 180, 180)
print(f"Built {len(SITEMAP)} indexable pages: {len(IDEAS)} ideas, {len(ALLQ)} questions, {len(daily)} daily pages, {len(READS)} reads, {len(VIDEOS)} videos.")
