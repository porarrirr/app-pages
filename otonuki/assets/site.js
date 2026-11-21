const picker = document.querySelector('#language');
const page = new URL(location.href);
const rtlLocales = new Set(['ar', 'he', 'ur']);
const descriptionKeys = { home: 'intro', support: 'helpIntro', privacy: 'policyIntro' };

function matchLocale(request, locales) {
  try {
    const { baseName, language, script } = new Intl.Locale(request);
    if (locales.includes(baseName)) return baseName;
    if (language === 'zh') {
      const chinese = `zh-${script ?? new Intl.Locale(baseName).maximize().script}`;
      return locales.includes(chinese) ? chinese : undefined;
    }
    const defaults = { en: 'en-US', pt: 'pt-BR' };
    return [baseName.split('-').slice(0, 2).join('-'), language, defaults[language]]
      .find(candidate => locales.includes(candidate));
  } catch {
    return undefined;
  }
}

async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

async function localize() {
  const locales = await getJson('assets/locales.json');
  const requested = [page.searchParams.get('lang'), ...navigator.languages].filter(Boolean);
  const locale = requested.map(language => matchLocale(language, locales)).find(Boolean) ?? 'ja';
  if (locale !== 'ja') {
    const section = document.body.dataset.page;
    const revision = section === 'home' ? '?v=3' : '';
    const strings = await getJson(`locales/${locale}.json${revision}`);
    for (const element of document.querySelectorAll('[data-text]')) {
      element.textContent = strings[element.dataset.text] ?? element.textContent;
    }
    const localizedTitle = section === 'home' ? strings.marketingTitle : undefined;
    document.title = localizedTitle ?? `OtoNuki | ${strings[section]}`;
    document.querySelector('meta[name="description"]').content = strings[descriptionKeys[section]];
  }
  document.documentElement.lang = locale;
  document.documentElement.dir = rtlLocales.has(locale) ? 'rtl' : 'ltr';
  for (const link of document.querySelectorAll('a[data-page-link]')) {
    const url = new URL(link.href);
    url.searchParams.set('lang', locale);
    link.href = url.href;
  }
  for (const code of locales) {
    const names = new Intl.DisplayNames([code], { type: 'language' });
    const option = new Option(names.of(code), code);
    option.lang = code;
    picker.add(option);
  }
  picker.value = locale;
  picker.addEventListener('change', () => {
    page.searchParams.set('lang', picker.value);
    location.assign(page);
  });
  picker.closest('label').hidden = false;
}

localize().catch(error => console.error('OtoNuki:', error));
