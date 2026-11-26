(() => {
  const root = document.documentElement;
  const THEME_KEY = 'studytrail-theme';
  const LANG_KEY = 'studytrail-lang';

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

  /* ---------- Language (JA / EN) + Localized Screenshots ---------- */
  function getInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const paramLang = params.get('lang');
    if (paramLang === 'en' || paramLang === 'ja') return paramLang;
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'ja') return saved;
    return 'ja';
  }

  function screenPath(screenKey, lang) {
    return lang === 'en'
      ? `assets/screens/en/${screenKey}.webp`
      : `assets/screens/${screenKey}.webp`;
  }

  function applyLang(lang, persist = false) {
    const normalized = lang === 'en' ? 'en' : 'ja';
    root.dataset.lang = normalized;
    root.lang = normalized;
    if (persist) localStorage.setItem(LANG_KEY, normalized);

    // Update page title & meta description if provided
    const titleEl = document.querySelector('meta[name="st-title-' + normalized + '"]');
    if (titleEl && titleEl.content) document.title = titleEl.content;
    const descEl = document.querySelector('meta[name="st-desc-' + normalized + '"]');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (descEl && metaDesc && descEl.content) metaDesc.content = descEl.content;

    // Update localized screenshots
    document.querySelectorAll('img[data-screen]').forEach((img) => {
      const key = img.dataset.screen;
      const nextSrc = screenPath(key, normalized);
      if (img.getAttribute('src') !== nextSrc) {
        img.setAttribute('src', nextSrc);
      }
      const altAttr = normalized === 'en' ? img.dataset.altEn : img.dataset.altJa;
      if (altAttr) img.setAttribute('alt', altAttr);
    });

    // Update placeholders
    document.querySelectorAll('[data-placeholder-ja]').forEach((input) => {
      input.placeholder = normalized === 'en'
        ? (input.dataset.placeholderEn || input.dataset.placeholderJa)
        : input.dataset.placeholderJa;
    });

    // Update language toggle buttons
    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      const label = btn.querySelector('[data-lang-label]');
      if (label) label.textContent = normalized === 'en' ? '日本語' : 'EN';
      btn.setAttribute('aria-label', normalized === 'en' ? '日本語に切り替え' : 'Switch to English');
    });

    // Re-sync hero showcase caption & FAQ status if present
    window.dispatchEvent(new CustomEvent('studytrail:langchange', { detail: { lang: normalized } }));
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
    const captionJa = document.querySelector('[data-hero-caption-ja]');
    const captionEn = document.querySelector('[data-hero-caption-en]');
    if (!img || tabs.length === 0) return;

    let activeTab = tabs[0];

    function activate(tab, animate = true) {
      activeTab = tab;
      const key = tab.dataset.heroTab;
      const lang = root.dataset.lang || 'ja';

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

      img.dataset.screen = key;
      img.dataset.altJa = tab.dataset.altJa || '';
      img.dataset.altEn = tab.dataset.altEn || '';
      img.setAttribute('src', screenPath(key, lang));
      img.setAttribute('alt', lang === 'en' ? (tab.dataset.altEn || '') : (tab.dataset.altJa || ''));

      if (animate) {
        img.classList.remove('screen-fade-enter');
        void img.offsetWidth;
        img.classList.add('screen-fade-enter');
      }

      if (captionJa && tab.dataset.captionJa) captionJa.textContent = tab.dataset.captionJa;
      if (captionEn && tab.dataset.captionEn) captionEn.textContent = tab.dataset.captionEn;
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activate(tab, true));
    });

    activate(activeTab, false);
  }

  /* ---------- Scroll Reveal (Framer-like spring) ---------- */
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

  /* ---------- FAQ Search & Category Filter (support.html) ---------- */
  function initSupportFaq() {
    const searchInput = document.getElementById('support-search');
    const clearBtn = document.getElementById('support-search-clear');
    const statusEl = document.getElementById('search-status');
    const emptyEl = document.getElementById('faq-empty');
    const groups = Array.from(document.querySelectorAll('[data-faq-group]'));
    if (!searchInput || groups.length === 0) return;

    const items = Array.from(document.querySelectorAll('details.st-faq'));

    function runFilter() {
      const q = searchInput.value.trim().toLowerCase();
      const lang = root.dataset.lang || 'ja';
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
          statusEl.textContent = lang === 'en'
            ? (matches === 0 ? `No results for "${searchInput.value.trim()}".` : `${matches} matching question${matches === 1 ? '' : 's'} found.`)
            : (matches === 0 ? `「${searchInput.value.trim()}」に一致する質問は見つかりませんでした。` : `「${searchInput.value.trim()}」に一致する質問が ${matches} 件あります。`);
        }
      }
    }

    searchInput.addEventListener('input', runFilter);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        items.forEach((item) => { item.open = false; });
        runFilter();
        searchInput.focus();
      });
    }

    // Open target FAQ if linked by hash
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
          const feedbackJa = btn.querySelector('[data-copy-feedback-ja]');
          const feedbackEn = btn.querySelector('[data-copy-feedback-en]');
          const defaultJa = btn.querySelector('[data-copy-default-ja]');
          const defaultEn = btn.querySelector('[data-copy-default-en]');
          if (feedbackJa && defaultJa) {
            defaultJa.classList.add('hidden');
            feedbackJa.classList.remove('hidden');
          }
          if (feedbackEn && defaultEn) {
            defaultEn.classList.add('hidden');
            feedbackEn.classList.remove('hidden');
          }
          setTimeout(() => {
            if (feedbackJa && defaultJa) {
              defaultJa.classList.remove('hidden');
              feedbackJa.classList.add('hidden');
            }
            if (feedbackEn && defaultEn) {
              defaultEn.classList.remove('hidden');
              feedbackEn.classList.add('hidden');
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
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme(), false);
    applyLang(getInitialLang(), false);

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyTheme(root.classList.contains('dark') ? 'light' : 'dark', true);
      });
    });

    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyLang(root.dataset.lang === 'en' ? 'ja' : 'en', true);
      });
    });

    initMobileMenu();
    initHeroShowcase();
    initReveal();
    initSupportFaq();
    initCopyButtons();
    initLanguagesModal();
  });
})();
