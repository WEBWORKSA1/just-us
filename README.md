# Just.us

Source and published build of **Just.us** ("just us"): free tools for couples and close pairs. A date-night generator, 300+ conversation questions in themed decks, two-player games, a care-style quiz, planning tools, a daily page that rebuilds itself, and lead, sponsorship, support, contest and hiring funnels. Static HTML, CSS and plain JavaScript, hosted free on GitHub Pages from the `main` branch.

## How it stays fresh

`.github/workflows/refresh.yml` runs every 6 hours (and on every push that changes `scripts/`, `src/` or `assets/`):

1. `scripts/update.py` pulls relationship headlines (RSS) and new YouTube uploads into `data/`. A failing source is skipped and logged in `data/status.json`; old items are kept so pages never go empty.
2. `scripts/build.py` rebuilds every page: home, date categories, question decks, games, tools, guides, a new dated daily page (`/daily/YYYY-MM-DD/`), reading list, videos, sitemap, RSS feed and icons.
3. The workflow commits the result; GitHub Pages republishes.

Run it by hand any time from **Actions → Refresh site content → Run workflow**.

## Layout

| Path | What |
|---|---|
| `src/site.json` | Site name, URL, navigation, feeds, YouTube channels, contest settings |
| `src/ideas.txt` | Date categories and every date idea (one per line) |
| `src/questions.txt` | Question decks (one question per line) |
| `src/extras.txt` | Would-you-rather pairs, know-me prompts, daily challenges, quiz |
| `src/pages/*.html` | Page bodies; the first line is a JSON meta header |
| `src/guides/*.html` | Long-form guides; the first line is a JSON meta header |
| `assets/` | CSS and JS (every tool runs in the browser) |
| `assets/js/config.js` | Encoded form inbox and optional payment links |
| `scripts/` | `update.py`, `build.py`, `encode_inbox.py` (standard library only) |
| `docs/RESEARCH.md` | The 46-site benchmark study the build is based on |

Local build: `python scripts/update.py && python scripts/build.py`, then serve the folder with any static server (`python -m http.server`).

## One-time setup

1. **GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`. The site is then live at `https://webworksa1.github.io/just-us/`. Every link is relative, so it works there and on the custom domain.
2. **Custom domain:** Settings → Pages → Custom domain → `just.us`. At the DNS host, point the apex to GitHub Pages (A records 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153) and `www` as a CNAME to `webworksa1.github.io`. Tick *Enforce HTTPS* once the certificate is issued. GitHub adds the `CNAME` file itself.
3. **Forms:** every form posts through FormSubmit to the inbox encoded in `assets/js/config.js`; the address never appears in any page. The first submission triggers a one-time activation email from FormSubmit; click *Activate* and every later submission is delivered. To change the inbox: `python scripts/encode_inbox.py "new-address"` and paste the output into `config.js`.
4. **AdSense:** the Auto ads script is in the `<head>` of every page and `ads.txt` is at the root. Apply with the custom domain (AdSense does not approve `github.io` addresses), then turn on the Google-certified consent message under *Privacy & messaging* for EEA/UK/Swiss visitors.
5. **Payments (optional):** paste PayPal, Stripe, Ko-fi or Buy Me a Coffee links into `config.js` → `payments` to show pay buttons on `/support/`. Until then, pledges arrive by form.
6. **Contest prize:** edit `contest` in `src/site.json`.

## Trademark and copyright

"Just.us" is used only as the name of this website and its domain, always written with the dot. The site is not affiliated with any person, company, product or trademark named "Justus", "JustUs" or "Just Us". Original content and code © Just.us. Headlines and videos belong to their publishers and creators and link to the originals. See `/disclaimer/`.
