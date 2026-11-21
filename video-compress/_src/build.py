"""Generate the Video Compress website from _src/i18n/<locale>.json.

English is published at the site root and every other locale under /<dir>/.
Run: python3 video-compress/_src/build.py
"""
import json
import re
import sys
from html import escape
from pathlib import Path
from urllib.parse import quote

SRC = Path(__file__).resolve().parent
SITE = SRC.parent
BASE_URL = "https://porarrirr.github.io/app-pages/video-compress/"
EMAIL = "support@rarari.org"
ROOT_LOCALE = "en"
RTL = {"ar", "he", "ur"}

# (App locale code, autonym). Order matches the language menu.
LOCALES = [
    ("en", "English"), ("en-GB", "English (UK)"), ("en-AU", "English (Australia)"), ("en-CA", "English (Canada)"),
    ("ja", "日本語"), ("zh-Hans", "简体中文"), ("zh-Hant", "繁體中文"), ("ko", "한국어"),
    ("es", "Español (España)"), ("es-MX", "Español (México)"), ("fr", "Français"), ("fr-CA", "Français (Canada)"),
    ("de", "Deutsch"), ("it", "Italiano"), ("pt-BR", "Português (Brasil)"), ("pt-PT", "Português (Portugal)"),
    ("nl", "Nederlands"), ("da", "Dansk"), ("sv", "Svenska"), ("nb", "Norsk bokmål"), ("fi", "Suomi"),
    ("pl", "Polski"), ("cs", "Čeština"), ("sk", "Slovenčina"), ("sl", "Slovenščina"), ("hr", "Hrvatski"),
    ("hu", "Magyar"), ("ro", "Română"), ("ca", "Català"), ("el", "Ελληνικά"), ("ru", "Русский"),
    ("uk", "Українська"), ("tr", "Türkçe"), ("ar", "العربية"), ("he", "עברית"), ("ur", "اردو"),
    ("hi", "हिन्दी"), ("bn", "বাংলা"), ("mr", "मराठी"), ("gu", "ગુજરાતી"), ("pa", "ਪੰਜਾਬੀ"),
    ("ta", "தமிழ்"), ("te", "తెలుగు"), ("kn", "ಕನ್ನಡ"), ("ml", "മലയാളം"), ("or", "ଓଡ଼ିଆ"),
    ("th", "ไทย"), ("vi", "Tiếng Việt"), ("id", "Bahasa Indonesia"), ("ms", "Bahasa Melayu"),
]
PAGES = [("index", "index.html", ""), ("support", "support.html", "support.html"), ("privacy", "privacy.html", "privacy.html")]

FEATURE_ICONS = [
    '<path d="M12 3v11m0 0-4-4m4 4 4-4"/><path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3"/>',
    '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h6"/>',
    '<path d="M12 3l2.4 5.1 5.6.7-4.1 3.9 1 5.5L12 15.6l-4.9 2.6 1-5.5L4 8.8l5.6-.7z"/>',
    '<rect x="3" y="5" width="8" height="14" rx="2"/><rect x="13" y="5" width="8" height="14" rx="2"/>',
    '<rect x="6" y="3" width="12" height="8" rx="2"/><rect x="4" y="9" width="16" height="12" rx="2.5"/>',
    '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
]
CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
SHIELD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z"/><path d="M8.8 12.2l2.3 2.3 4.3-4.6"/></svg>'
MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>'


def locale_dir(code):
    return "" if code == ROOT_LOCALE else code.lower() + "/"


def load(code):
    return json.loads((SRC / "i18n" / f"{code}.json").read_text(encoding="utf-8"))


def placeholders(text):
    return sorted(re.findall(r"\{[a-z_]+\}", text))


def check_shape(ref, data, path, code, errors):
    if isinstance(ref, dict):
        if not isinstance(data, dict):
            errors.append(f"{code}:{path} should be an object")
            return
        for key in ref.keys() - data.keys():
            errors.append(f"{code}:{path}.{key} is missing")
        for key in data.keys() - ref.keys():
            errors.append(f"{code}:{path}.{key} is not in ja.json")
        for key in ref.keys() & data.keys():
            check_shape(ref[key], data[key], f"{path}.{key}", code, errors)
    elif isinstance(ref, list):
        if not isinstance(data, list) or len(data) != len(ref):
            errors.append(f"{code}:{path} should be a list of {len(ref)} items")
            return
        for i, (r, d) in enumerate(zip(ref, data)):
            check_shape(r, d, f"{path}[{i}]", code, errors)
    else:
        if not isinstance(data, str) or not data.strip():
            errors.append(f"{code}:{path} is empty or not a string")
        elif placeholders(ref) != placeholders(data):
            errors.append(f"{code}:{path} placeholders {placeholders(data)} != {placeholders(ref)}")
        elif "<" in data or ">" in data:
            errors.append(f"{code}:{path} contains markup")


def validate(all_strings):
    ref = all_strings["ja"]
    errors = []
    for code, data in all_strings.items():
        check_shape(ref, data, "", code, errors)
    if errors:
        sys.exit("Invalid translations:\n" + "\n".join(errors))


class Page:
    def __init__(self, code, strings, page, filename, slug):
        self.code, self.s, self.page, self.filename, self.slug = code, strings, page, filename, slug
        self.depth = 0 if code == ROOT_LOCALE else 1
        self.app = strings["app_name"]

    def t(self, text):
        return escape(text.replace("{app}", self.app))

    def asset(self, name):
        return "../" * self.depth + "assets/" + name

    def href(self, code, slug):
        return "../" * self.depth + locale_dir(code) + slug or "./"

    def link(self, slug):
        return self.href(self.code, slug)

    def mailto(self, subject):
        return f"mailto:{EMAIL}?subject={quote(subject.replace('{app}', self.app))}"


def head(p, title, description):
    alternates = "\n".join(
        f'    <link rel="alternate" hreflang="{code}" href="{BASE_URL}{locale_dir(code)}{p.slug}" />' for code, _ in LOCALES
    )
    return f"""<!doctype html>
<html lang="{p.code}" dir="{'rtl' if p.code in RTL else 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
    <title>{p.t(title)}</title>
    <meta name="description" content="{p.t(description)}" />
    <link rel="canonical" href="{BASE_URL}{locale_dir(p.code)}{p.slug}" />
{alternates}
    <link rel="alternate" hreflang="x-default" href="{BASE_URL}{p.slug}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{p.t(title)}" />
    <meta property="og:description" content="{p.t(description)}" />
    <meta property="og:image" content="{BASE_URL}assets/icon.png" />
    <link rel="icon" type="image/png" href="{p.asset('favicon.png')}" />
    <link rel="apple-touch-icon" href="{p.asset('apple-touch-icon.png')}" />
    <link rel="stylesheet" href="{p.asset('style.css')}" />
    <script src="{p.asset('locale.js')}" defer></script>
  </head>"""


def header(p):
    c = p.s["common"]
    langs = "\n".join(
        f'            <li><a href="{p.href(code, p.slug)}" hreflang="{code}" lang="{code}" data-locale="{locale_dir(code).rstrip("/")}"'
        f'{" aria-current=\"true\"" if code == p.code else ""}>{escape(name)}</a></li>'
        for code, name in LOCALES
    )
    current = dict(LOCALES)[p.code]
    nav = lambda page, slug, label: (
        f'<a href="{p.link(slug)}"{" aria-current=\"page\"" if p.page == page else ""}>{p.t(c[label])}</a>'
    )
    return f"""  <body data-page="{p.page}">
    <a class="skip" href="#main">{p.t(c['skip_to_content'])}</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="{p.link('')}"><img src="{p.asset('icon.png')}" alt="" width="30" height="30" /><span>{p.t(p.app)}</span></a>
        <nav class="site-nav" aria-label="{p.t(p.app)}">
          {nav('support', 'support.html', 'nav_support')}
          {nav('privacy', 'privacy.html', 'nav_privacy')}
        </nav>
        <details class="lang">
          <summary aria-label="{p.t(c['language'])}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg><span>{escape(current)}</span></summary>
          <ul class="lang-menu">
{langs}
          </ul>
        </details>
      </div>
    </header>"""


def footer(p):
    c = p.s["common"]
    return f"""    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand"><img src="{p.asset('icon.png')}" alt="" width="24" height="24" /><span>{p.t(p.app)}</span></div>
        <nav class="footer-nav">
          <a href="{p.link('support.html')}">{p.t(c['footer_support'])}</a>
          <a href="{p.link('privacy.html')}">{p.t(c['footer_privacy'])}</a>
          <a href="{p.mailto(p.s['support']['contact_mail_subject'])}">{p.t(c['footer_contact'])}</a>
        </nav>
        <p>{p.t(c['requirements'])}</p>
        <p>© 2026 porarrirr</p>
      </div>
    </footer>
  </body>
</html>
"""


def icon(path):
    return f'<svg viewBox="0 0 24 24" aria-hidden="true">{path}</svg>'


def render_index(p):
    s = p.s["index"]
    badges = "".join(
        f'<li>{CHECK}{p.t(s[k])}</li>' for k in ("hero_badge_offline", "hero_badge_no_account", "hero_badge_no_tracking")
    )
    features = "\n".join(
        f'''        <article class="card feature"><span class="feature-icon">{icon(FEATURE_ICONS[i])}</span>
          <h3>{p.t(f["title"])}</h3><p>{p.t(f["body"])}</p></article>'''
        for i, f in enumerate(s["features"])
    )
    steps = "\n".join(
        f'        <li class="card step"><span class="step-number">{i + 1}</span><div><h3>{p.t(st["title"])}</h3><p>{p.t(st["body"])}</p></div></li>'
        for i, st in enumerate(s["steps"])
    )
    return f"""    <main id="main">
      <section class="hero">
        <img class="hero-icon" src="{p.asset('icon.png')}" alt="{p.t(p.app)}" width="128" height="128" />
        <p class="eyebrow">{p.t(s['hero_eyebrow'])}</p>
        <h1>{p.t(s['hero_title'])}</h1>
        <p class="lead">{p.t(s['hero_lead'])}</p>
        <ul class="badges">{badges}</ul>
        <div class="actions">
          <a class="button prominent" href="{p.link('support.html')}">{p.t(s['hero_cta_support'])}</a>
          <a class="button bordered" href="{p.link('privacy.html')}">{p.t(p.s['common']['footer_privacy'])}</a>
        </div>
        <p class="requirements">{p.t(p.s['common']['requirements'])}</p>
      </section>
      <section class="section" aria-labelledby="features-title">
        <h2 id="features-title">{p.t(s['features_title'])}</h2>
        <div class="feature-grid">
{features}
        </div>
      </section>
      <section class="section">
        <div class="privacy-band">
          {SHIELD}
          <div>
            <h2>{p.t(s['privacy_title'])}</h2>
            <p>{p.t(s['privacy_body'])}</p>
            <a href="{p.link('privacy.html')}">{p.t(s['privacy_link'])}</a>
          </div>
        </div>
      </section>
      <section class="section" aria-labelledby="steps-title">
        <h2 id="steps-title">{p.t(s['steps_title'])}</h2>
        <ol class="steps">
{steps}
        </ol>
      </section>
    </main>"""


def contact_card(p, subject):
    return f'<a class="button prominent mail" href="{p.mailto(subject)}">{MAIL}<span>{EMAIL}</span></a>'


def render_support(p):
    s = p.s["support"]
    include = "".join(f"<li>{p.t(x)}</li>" for x in s["contact_include"])
    faq = "\n".join(
        f'''          <details class="faq-item"><summary>{p.t(f["q"])}</summary><p>{p.t(f["a"])}</p></details>'''
        for f in s["faq"]
    )
    return f"""    <main id="main" class="doc">
      <section class="doc-hero">
        <h1>{p.t(s['title'])}</h1>
        <p class="lead">{p.t(s['lead'])}</p>
      </section>
      <section class="group" aria-labelledby="contact-title">
        <h2 class="group-title" id="contact-title">{p.t(s['contact_title'])}</h2>
        <div class="card padded">
          <p>{p.t(s['contact_body'])}</p>
          {contact_card(p, s['contact_mail_subject'])}
          <p class="sub">{p.t(s['contact_include_title'])}</p>
          <ul class="bullets">{include}</ul>
          <p class="note">{p.t(s['contact_note'])}</p>
        </div>
      </section>
      <section class="group" aria-labelledby="faq-title">
        <h2 class="group-title" id="faq-title">{p.t(s['faq_title'])}</h2>
        <div class="card list">
{faq}
        </div>
      </section>
      <section class="group" aria-labelledby="req-title">
        <h2 class="group-title" id="req-title">{p.t(s['requirements_title'])}</h2>
        <div class="card padded"><p>{p.t(s['requirements_body'])}</p></div>
      </section>
    </main>"""


def render_privacy(p):
    s = p.s["privacy"]
    summary = "".join(f"<li>{CHECK}<span>{p.t(x)}</span></li>" for x in s["summary"])
    sections = []
    for i, sec in enumerate(s["sections"]):
        body = "".join(f"<p>{p.t(x)}</p>" for x in sec["paragraphs"])
        if "items" in sec:
            body += '<ul class="bullets">' + "".join(f"<li>{p.t(x)}</li>" for x in sec["items"]) + "</ul>"
        if i == len(s["sections"]) - 1:
            body += contact_card(p, s["contact_mail_subject"])
        sections.append(
            f'      <section class="group"><h2 class="group-title">{p.t(sec["title"])}</h2><div class="card padded">{body}</div></section>'
        )
    sections = "\n".join(sections)
    return f"""    <main id="main" class="doc">
      <section class="doc-hero">
        <h1>{p.t(s['title'])}</h1>
        <p class="updated">{p.t(s['updated'])}</p>
      </section>
      <section class="group" aria-labelledby="summary-title">
        <h2 class="group-title" id="summary-title">{p.t(s['summary_title'])}</h2>
        <ul class="card summary">{summary}</ul>
      </section>
{sections}
    </main>"""


RENDER = {"index": render_index, "support": render_support, "privacy": render_privacy}


def main():
    codes = [code for code, _ in LOCALES]
    available = sorted(path.stem for path in (SRC / "i18n").glob("*.json"))
    only = sys.argv[1:] or codes
    unknown = set(available) - set(codes)
    if unknown:
        sys.exit(f"Unknown locale files: {sorted(unknown)}")
    missing = [code for code in only if code not in available]
    if missing:
        sys.exit(f"Missing translations: {missing}")
    strings = {code: load(code) for code in set(only) | {"ja"}}
    validate(strings)
    for code in only:
        for page, filename, slug in PAGES:
            p = Page(code, strings[code], page, filename, slug)
            ps = strings[code][page]
            html = head(p, ps["meta_title"], ps["meta_description"]) + "\n" + header(p) + "\n" + RENDER[page](p) + "\n" + footer(p)
            out = SITE / locale_dir(code) / filename
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(html, encoding="utf-8")
    if set(only) == set(codes):
        urls = "\n".join(
            f"  <url><loc>{BASE_URL}{locale_dir(code)}{slug}</loc></url>" for code in codes for _, _, slug in PAGES
        )
        (SITE / "sitemap.xml").write_text(
            f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n',
            encoding="utf-8",
        )
    print(f"Built {len(only)} locale(s): {', '.join(only)}")


if __name__ == "__main__":
    main()
