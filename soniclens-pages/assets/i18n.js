(function () {
  "use strict";

  var PAGE = document.body.getAttribute("data-page") || "index";
  var UPDATED = "2026-09-14";
  var CONTACT_EMAIL = "musicbunseiki@rarari.org";
  var STORAGE_KEY = "soniclens-lang";
  var DEFAULT_LOCALE = "ja";


  var LOCALES = [
    "ja", "en", "es", "zh", "fr",
    "ar-SA", "bn-BD", "ca", "cs", "da", "de-DE", "el",
    "en-AU", "en-CA", "en-GB", "es-MX", "fi", "fr-CA",
    "gu-IN", "he", "hi", "hr", "hu", "id", "it",
    "kn-IN", "ko", "ml-IN", "mr-IN", "ms", "nl-NL", "no",
    "or-IN", "pa-IN", "pl", "pt-BR", "pt-PT", "ro", "ru",
    "sk", "sl-SI", "sv", "ta-IN", "te-IN", "th", "tr", "uk",
    "ur-PK", "vi", "zh-Hant"
  ];

  var LOWER_TO_CANONICAL = {};
  LOCALES.forEach(function (code) {
    LOWER_TO_CANONICAL[code.toLowerCase()] = code;
  });

  var RTL_LOCALES = { "ar-sa": true, "he": true, "ur-pk": true };


  var LANG_ATTR = { "zh": "zh-Hans" };


  var BASE_ALIAS = {
    de: "de-DE", pt: "pt-BR", nb: "no", nn: "no", no: "no",
    ar: "ar-SA", bn: "bn-BD", gu: "gu-IN", kn: "kn-IN",
    ml: "ml-IN", mr: "mr-IN", or: "or-IN", pa: "pa-IN",
    sl: "sl-SI", ta: "ta-IN", te: "te-IN", ur: "ur-PK", nl: "nl-NL"
  };

  function normalizeLocale(raw) {
    if (!raw) return null;
    var v = String(raw).trim().replace(/_/g, "-").toLowerCase();
    if (!v) return null;
    if (LOWER_TO_CANONICAL[v]) return LOWER_TO_CANONICAL[v];
    if (v.indexOf("zh") === 0) {
      return /hant|tw|hk|mo/.test(v) ? "zh-Hant" : "zh";
    }
    var base = v.split("-")[0];
    if (LOWER_TO_CANONICAL[base]) return LOWER_TO_CANONICAL[base];
    if (BASE_ALIAS[base] && LOWER_TO_CANONICAL[BASE_ALIAS[base].toLowerCase()]) {
      return BASE_ALIAS[base];
    }
    return null;
  }

  function detectLocale() {
    try {
      var params = new URLSearchParams(location.search);
      var q = params.get("lang") || params.get("hl");
      var fromQuery = normalizeLocale(q);
      if (fromQuery) return fromQuery;
    } catch (_) {}
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      var fromStored = normalizeLocale(stored);
      if (fromStored) return fromStored;
    } catch (_) {}
    var langs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (var i = 0; i < langs.length; i += 1) {
      var match = normalizeLocale(langs[i]);
      if (match) return match;
    }
    return DEFAULT_LOCALE;
  }

  function localeName(code) {
    try {
      var names = new Intl.DisplayNames([code], { type: "language" });
      return names.of(code) || code;
    } catch (_) {
      return code;
    }
  }

  function buildPicker() {
    var select = document.getElementById("langSelect");
    if (!select) return;
    LOCALES.forEach(function (code) {
      var option = document.createElement("option");
      option.value = code;
      option.textContent = localeName(code);
      option.lang = LANG_ATTR[code] || code;
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      applyLang(select.value);
    });
  }

  function fillPlaceholders(value) {
    return String(value)
      .replace(/\{year\}/g, String(new Date().getFullYear()))
      .replace(/\{updated\}/g, UPDATED);
  }

  function render(dict, code) {
    var strings = {};
    if (dict.shared) {
      Object.keys(dict.shared).forEach(function (k) { strings[k] = dict.shared[k]; });
    }
    Object.keys(dict[PAGE] || {}).forEach(function (k) { strings[k] = dict[PAGE][k]; });

    document.documentElement.lang = LANG_ATTR[code] || code;
    document.documentElement.dir = RTL_LOCALES[code.toLowerCase()] ? "rtl" : "ltr";

    if (typeof strings.pageTitle === "string" && strings.pageTitle) {
      document.title = strings.pageTitle;
    }
    if (typeof strings.metaDesc === "string" && strings.metaDesc) {
      var meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", strings.metaDesc);
    }

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var value = strings[key];
      if (typeof value === "string" && value) {
        el.textContent = fillPlaceholders(value);
      }
    });

    if (PAGE === "support" && Array.isArray(strings.faq)) {
      var faqList = document.getElementById("faqList");
      if (faqList) {
        faqList.innerHTML = "";
        strings.faq.forEach(function (item) {
          var wrap = document.createElement("article");
          wrap.className = "faq-item";
          var q = document.createElement("h3");
          q.className = "faq-q";
          q.textContent = item.q;
          var a = document.createElement("p");
          a.className = "faq-a";
          a.textContent = item.a;
          wrap.appendChild(q);
          wrap.appendChild(a);
          faqList.appendChild(wrap);
        });
      }
    }

    document.querySelectorAll("#mailLink").forEach(function (link) {
      if (typeof strings.mailSubject === "string" && strings.mailSubject) {
        link.setAttribute(
          "href",
          "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(strings.mailSubject)
        );
      }
    });

    var select = document.getElementById("langSelect");
    if (select) {
      select.value = code;
      if (typeof strings.langLabel === "string" && strings.langLabel) {
        select.setAttribute("aria-label", strings.langLabel);
      }
    }
  }

  var dictCache = {};

  function loadDict(code) {
    if (dictCache[code]) return Promise.resolve(dictCache[code]);
    return fetch("assets/locales/" + code + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error(code + ": " + res.status);
        return res.json();
      })
      .then(function (json) {
        dictCache[code] = json;
        return json;
      });
  }

  function applyLang(requested) {
    var code = normalizeLocale(requested) || detectLocale();
    return loadDict(code)
      .catch(function () {
        code = DEFAULT_LOCALE;
        return loadDict(code);
      })
      .then(function (dict) {
        render(dict, code);
        try {
          localStorage.setItem(STORAGE_KEY, code);
        } catch (_) {}
        try {
          var url = new URL(location.href);
          url.searchParams.set("lang", code);
          history.replaceState(null, "", url);
        } catch (_) {}
      })
      .catch(function (err) {
        console.error("MusicAnalysis i18n:", err);
      });
  }

  buildPicker();
  applyLang(detectLocale());
})();
