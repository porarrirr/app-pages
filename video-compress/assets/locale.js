(function () {
  "use strict";

  var STORAGE_KEY = "video-compress-locale";
  var menu = document.querySelector(".lang-menu");
  if (!menu) return;

  var links = Array.prototype.slice.call(menu.querySelectorAll("a[data-locale]"));
  links.forEach(function (link) {
    link.addEventListener("click", function () {
      try {
        localStorage.setItem(STORAGE_KEY, link.getAttribute("data-locale"));
      } catch (error) {
        console.warn("Could not store language choice", error);
      }
    });
  });

  document.addEventListener("click", function (event) {
    var details = document.querySelector(".lang[open]");
    if (details && !details.contains(event.target)) details.removeAttribute("open");
  });


  if (document.documentElement.lang !== "en") return;
  var stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Could not read language choice", error);
  }
  if (stored !== null) return;

  var available = {};
  links.forEach(function (link) {
    available[link.getAttribute("data-locale")] = link.getAttribute("href");
  });
  var aliases = { "zh-cn": "zh-hans", "zh-sg": "zh-hans", "zh-tw": "zh-hant", "zh-hk": "zh-hant", "zh-mo": "zh-hant",
    "zh": "zh-hans", "pt": "pt-br", "es-419": "es-mx", "no": "nb", "nn": "nb" };

  function match(tag) {
    var value = String(tag).toLowerCase();
    if (aliases[value]) value = aliases[value];
    if (value.indexOf("zh-hans") === 0) value = "zh-hans";
    if (value.indexOf("zh-hant") === 0) value = "zh-hant";
    if (Object.prototype.hasOwnProperty.call(available, value)) return value;
    var base = value.split("-")[0];
    if (base === "en") return "";
    if (aliases[base]) base = aliases[base];
    return Object.prototype.hasOwnProperty.call(available, base) ? base : null;
  }

  var languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (var i = 0; i < languages.length; i += 1) {
    var locale = match(languages[i]);
    if (locale === null) continue;
    if (locale !== "") window.location.replace(available[locale] + window.location.hash);
    return;
  }
})();
