(() => {
  const root = document.documentElement;
  const THEME_KEY = 'studytrail-theme';
  const LANG_KEY = 'studytrail-lang';
  const RTL_LOCALES = new Set(['ar-SA', 'he', 'ur-PK']);
  const LANG_ALIASES = {
    en: 'en-US', 'en-us': 'en-US', 'en-gb': 'en-GB', 'en-au': 'en-AU', 'en-ca': 'en-CA',
    zh: 'zh-Hans', 'zh-cn': 'zh-Hans', 'zh-sg': 'zh-Hans', 'zh-tw': 'zh-Hant',
    'zh-hk': 'zh-Hant', 'zh-mo': 'zh-Hant',
    pt: 'pt-BR', ar: 'ar-SA', ur: 'ur-PK', es: 'es-ES', 'es-419': 'es-MX',
    fr: 'fr-FR', de: 'de-DE', it: 'it', ja: 'ja', ko: 'ko',
  };

  /* ---------- Theme (Light / Dark) ---------- */
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme, persist = false) {
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    if (persist) localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isDark));
      const sun = btn.querySelector('[data-icon-sun]');
      const moon = btn.querySelector('[data-icon-moon]');
      if (sun && moon) {
        sun.classList.toggle('hidden', !isDark);
        moon.classList.toggle('hidden', isDark);
      }
    });
  }

  /* ---------- i18n ---------- */
  let locales = [];
  const dictCache = {};
  let currentLang = 'ja';
  let currentDict = null;
  let enDict = null;
  let jaDict = null;

  function normalizeLang(code) {
    if (!code) return null;
    const c = String(code).trim();
    if (LANG_ALIASES[c.toLowerCase()]) return LANG_ALIASES[c.toLowerCase()];
    const exact = locales.find((l) => l.code === c);
    if (exact) return c;
    const base = c.split('-')[0].toLowerCase();
    const byBase = locales.find((l) => l.code.split('-')[0].toLowerCase() === base);
    if (byBase) return byBase.code;
    const alias = LANG_ALIASES[base];
    return alias || null;
  }

  function matchBrowserLang() {
    const prefs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ''];
    for (const pref of prefs) {
      const hit = normalizeLang(pref);
      if (hit) return hit;
    }
    return null;
  }

  function getInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const fromParam = normalizeLang(params.get('lang'));
    if (fromParam) return fromParam;
    const saved = normalizeLang(localStorage.getItem(LANG_KEY));
    if (saved) return saved;
    return matchBrowserLang() || 'ja';
  }

  function fetchDict(code) {
    if (dictCache[code]) return dictCache[code];
    dictCache[code] = fetch(`assets/i18n/${code}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    return dictCache[code];
  }

  function t(key) {
    if (currentDict && currentDict[key] !== undefined) return currentDict[key];
    if (enDict && enDict[key] !== undefined) return enDict[key];
    if (jaDict && jaDict[key] !== undefined) return jaDict[key];
    return undefined;
  }

  function currentPage() {
    const file = location.pathname.split('/').pop() || 'index.html';
    return file.replace(/\.html$/, '') || 'index';
  }

  function applyStrings(dict) {
    currentDict = dict;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const v = t(el.dataset.i18n);
      if (v === undefined) return;
      if (v === '') {
        el.hidden = true;
      } else {
        el.hidden = false;
        el.innerHTML = v;
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const v = t(el.dataset.i18nAria);
      if (v) el.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const v = t(el.dataset.i18nAlt);
      if (v) el.setAttribute('alt', v);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      const v = t(el.dataset.i18nPh);
      if (v !== undefined) el.setAttribute('placeholder', v);
    });

    const page = currentPage();
    const title = t(`meta.title.${page}`);
    if (title) document.title = title;
    const desc = t(`meta.desc.${page}`);
    const metaDesc = document.querySelector('meta[name="description"]');
    if (desc && metaDesc) metaDesc.content = desc;
    const ogTitle = t(`meta.ogTitle.${page}`);
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitleEl) ogTitleEl.content = ogTitle;
    const ogDesc = t(`meta.ogDesc.${page}`);
    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDescEl) ogDescEl.content = ogDesc;

    syncHero();
    syncScreenAlts();

    const select = document.querySelector('[data-lang-select]');
    if (select) select.value = currentLang;
  }

  function screenPath(screenKey, lang) {
    return lang === 'ja'
      ? `assets/screens/${screenKey}.webp`
      : `assets/screens/en/${screenKey}.webp`;
  }

  function syncHero() {
    const img = document.querySelector('[data-hero-screen]');
    const active = document.querySelector('[data-hero-tab][aria-selected="true"]');
    if (!img || !active) return;
    const key = active.dataset.heroTab;
    img.setAttribute('src', screenPath(key, currentLang));
    const alt = t(`alt.tab.${key}`);
    if (alt) img.setAttribute('alt', alt);
    const cap = document.querySelector('[data-hero-caption]');
    if (cap) {
      const capText = t(`cap.${key}`);
      if (capText !== undefined) cap.textContent = capText;
    }
  }

  function syncScreenAlts() {
    document.querySelectorAll('img[data-screen]:not([data-hero-screen])').forEach((img) => {
      const v = t(`alt.img.${img.dataset.screen}`);
      if (v) img.setAttribute('alt', v);
    });
  }

  async function applyLang(lang, persist = false) {
    const normalized = normalizeLang(lang) || 'ja';
    currentLang = normalized;
    root.dataset.lang = normalized;
    root.lang = normalized;
    root.dir = RTL_LOCALES.has(normalized) ? 'rtl' : 'ltr';
    if (persist) localStorage.setItem(LANG_KEY, normalized);

    const [dict, en, ja] = await Promise.all([
      fetchDict(normalized),
      fetchDict('en-US'),
      fetchDict('ja'),
    ]);
    enDict = en;
    jaDict = ja;
    if (normalized === 'en-US' && dict) enDict = dict;
    if (normalized === 'ja' && dict) jaDict = dict;
    applyStrings(dict || enDict || jaDict || {});

    window.dispatchEvent(new CustomEvent('studytrail:langchange', { detail: { lang: normalized } }));
  }

  /* ---------- Language selector ---------- */
  function initLangSelect() {
    const select = document.querySelector('[data-lang-select]');
    if (!select) return;
    locales.forEach((l) => {
      const opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.name;
      select.appendChild(opt);
    });
    select.value = currentLang;
    select.addEventListener('change', () => {
      applyLang(select.value, true);
    });
  }

  /* ---------- Mobile Menu ---------- */
  function initMobileMenu() {
    const toggle = document.querySelector('[data-mobile-menu-toggle]');
    const drawer = document.querySelector('[data-mobile-menu]');
    if (!toggle || !drawer) return;

    const setOpen = (open) => {
      drawer.classList.toggle('hidden', !open);
      toggle.setAttribute('aria-expanded', String(open));
      const openIcon = toggle.querySelector('[data-menu-open]');
      const closeIcon = toggle.querySelector('[data-menu-close]');
      if (openIcon && closeIcon) {
        openIcon.classList.toggle('hidden', open);
        closeIcon.classList.toggle('hidden', !open);
      }
    };

    toggle.addEventListener('click', () => {
      setOpen(drawer.classList.contains('hidden'));
    });

    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });
  }

  /* ---------- Interactive Hero Phone Preview ---------- */
  function initHeroShowcase() {
    const img = document.querySelector('[data-hero-screen]');
    const tabs = Array.from(document.querySelectorAll('[data-hero-tab]'));
    if (!img || tabs.length === 0) return;

    function activate(tab, animate = true) {
      tabs.forEach((btn) => {
        const isCurrent = btn === tab;
        btn.setAttribute('aria-selected', String(isCurrent));
        btn.classList.toggle('bg-forest-800', isCurrent);
        btn.classList.toggle('text-white', isCurrent);
        btn.classList.toggle('dark:bg-forest-300', isCurrent);
        btn.classList.toggle('dark:text-forest-950', isCurrent);
        btn.classList.toggle('shadow-sm', isCurrent);

        btn.classList.toggle('bg-white/90', !isCurrent);
        btn.classList.toggle('text-[#3B4B45]', !isCurrent);
        btn.classList.toggle('dark:bg-[#202A27]', !isCurrent);
        btn.classList.toggle('dark:text-[#B4C5BC]', !isCurrent);
      });

      const key = tab.dataset.heroTab;
      img.setAttribute('src', screenPath(key, currentLang));
      const alt = t(`alt.tab.${key}`);
      if (alt) img.setAttribute('alt', alt);

      if (animate) {
        img.classList.remove('screen-fade-enter');
        void img.offsetWidth;
        img.classList.add('screen-fade-enter');
      }

      syncHero();
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activate(tab, true));
    });

    const initial = tabs.find((b) => b.getAttribute('aria-selected') === 'true') || tabs[0];
    activate(initial, false);
  }

  /* ---------- Scroll Reveal ---------- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (els.length === 0) return;

    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -36px 0px' }
    );

    els.forEach((el) => observer.observe(el));
  }

  /* ---------- FAQ Search ---------- */
  function initSupportFaq() {
    const searchInput = document.getElementById('support-search');
    const clearBtn = document.getElementById('support-search-clear');
    const statusEl = document.getElementById('search-status');
    const emptyEl = document.getElementById('faq-empty');
    const groups = Array.from(document.querySelectorAll('[data-faq-group]'));
    if (!searchInput || groups.length === 0) return;

    function runFilter() {
      const q = searchInput.value.trim().toLowerCase();
      const query = searchInput.value.trim();
      if (clearBtn) {
        clearBtn.classList.toggle('hidden', q.length === 0);
        clearBtn.classList.toggle('inline-flex', q.length > 0);
      }

      let matches = 0;
      groups.forEach((group) => {
        let groupMatches = 0;
        group.querySelectorAll('details.st-faq').forEach((item) => {
          const text = item.textContent.toLowerCase();
          const hit = q === '' || text.includes(q);
          item.hidden = !hit;
          if (hit) {
            groupMatches += 1;
            matches += 1;
            if (q !== '') item.open = true;
          }
        });
        group.hidden = groupMatches === 0;
      });

      if (emptyEl) emptyEl.classList.toggle('hidden', matches > 0);
      if (statusEl) {
        if (q === '') {
          statusEl.textContent = '';
          statusEl.classList.add('hidden');
        } else {
          statusEl.classList.remove('hidden');
          const key = matches === 0 ? 'js.search.none' : 'js.search.some';
          let msg = t(key) || '';
          msg = msg.replaceAll('{q}', query).replaceAll('{n}', String(matches));
          statusEl.textContent = msg;
        }
      }
    }

    searchInput.addEventListener('input', runFilter);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        document.querySelectorAll('details.st-faq').forEach((item) => { item.open = false; });
        runFilter();
        searchInput.focus();
      });
    }

    function openHashTarget() {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;
      const target = document.getElementById(hash);
      if (!target) return;
      if (target.tagName === 'DETAILS') {
        target.open = true;
      } else {
        const parentDetails = target.closest('details');
        if (parentDetails) parentDetails.open = true;
      }
    }

    openHashTarget();
    window.addEventListener('hashchange', openHashTarget);
    window.addEventListener('studytrail:langchange', runFilter);
  }

  /* ---------- Copy Email Helper ---------- */
  function initCopyButtons() {
    document.querySelectorAll('[data-copy-text]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copyText;
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          const feedback = btn.querySelector('[data-copy-feedback]');
          const dflt = btn.querySelector('[data-copy-default]');
          if (feedback && dflt) {
            dflt.classList.add('hidden');
            feedback.classList.remove('hidden');
          }
          setTimeout(() => {
            if (feedback && dflt) {
              dflt.classList.remove('hidden');
              feedback.classList.add('hidden');
            }
          }, 2000);
        } catch (_) {
          // Clipboard unavailable; mailto link remains clickable
        }
      });
    });
  }

  /* ---------- Languages Disclosure Toggle ---------- */
  function initLanguagesModal() {
    const btn = document.querySelector('[data-toggle-langs]');
    const panel = document.querySelector('[data-langs-panel]');
    if (!btn || !panel) return;
    btn.addEventListener('click', () => {
      const isHidden = panel.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!isHidden));
    });
  }

  /* ---------- Bootstrap ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    applyTheme(getPreferredTheme(), false);

    try {
      const res = await fetch('assets/i18n/locales.json');
      if (res.ok) {
        const data = await res.json();
        locales = data.locales || [];
      }
    } catch (_) {}
    if (!locales.length) {
      locales = [{ code: 'ja', name: '日本語', dir: 'ltr' }, { code: 'en-US', name: 'English (US)', dir: 'ltr' }];
    }

    await applyLang(getInitialLang(), false);
    initLangSelect();

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyTheme(root.classList.contains('dark') ? 'light' : 'dark', true);
      });
    });

    initMobileMenu();
    initHeroShowcase();
    initReveal();
    initSupportFaq();
    initCopyButtons();
    initLanguagesModal();

    // refresh hero caption/alt after dict is applied (applyLang already ran syncHero,
    // but tabs may not have been activated yet on index)
    window.addEventListener('studytrail:langchange', () => {
      const active = document.querySelector('[data-hero-tab][aria-selected="true"]');
      if (active) {
        const img = document.querySelector('[data-hero-screen]');
        if (img) img.setAttribute('src', screenPath(active.dataset.heroTab, currentLang));
      }
      syncHero();
      syncScreenAlts();
    });
  });
})();
