"""Write per-locale translation briefs for the translator agents (opencode-go/deepseek-v4.1-flash).

Usage: python3 translate.py [locale ...]   (default: every locale except ja and en)
Each brief is written to prompts/<locale>.md; the agent writes i18n/<locale>.json.
"""
import sys
from pathlib import Path

import glossary
from build import LOCALES

SRC = Path(__file__).resolve().parent
I18N = SRC / "i18n"
PROMPTS = SRC / "prompts"
LANGUAGE_NAMES = {
    "en-GB": "British English", "en-AU": "Australian English", "en-CA": "Canadian English",
    "zh-Hans": "Simplified Chinese", "zh-Hant": "Traditional Chinese (Taiwan)", "ko": "Korean",
    "es": "Spanish (Spain)", "es-MX": "Spanish (Mexico)", "fr": "French (France)", "fr-CA": "French (Canada)",
    "de": "German", "it": "Italian", "pt-BR": "Portuguese (Brazil)", "pt-PT": "Portuguese (Portugal)",
    "nl": "Dutch", "da": "Danish", "sv": "Swedish", "nb": "Norwegian Bokmål", "fi": "Finnish", "pl": "Polish",
    "cs": "Czech", "sk": "Slovak", "sl": "Slovenian", "hr": "Croatian", "hu": "Hungarian", "ro": "Romanian",
    "ca": "Catalan", "el": "Greek", "ru": "Russian", "uk": "Ukrainian", "tr": "Turkish", "ar": "Arabic",
    "he": "Hebrew", "ur": "Urdu", "hi": "Hindi", "bn": "Bengali", "mr": "Marathi", "gu": "Gujarati",
    "pa": "Punjabi (Gurmukhi)", "ta": "Tamil", "te": "Telugu", "kn": "Kannada", "ml": "Malayalam", "or": "Odia",
    "th": "Thai", "vi": "Vietnamese", "id": "Indonesian", "ms": "Malay",
}

PROMPT = """You are a professional software localizer. Translate the website strings of an iOS app into {name} (locale code {code}).

Inputs (read both files):
- {i18n}/ja.json: the Japanese source of truth.
- {i18n}/en.json: an English translation of the same text, for reference only.

Write the complete translation to {i18n}/{code}.json. Do not create, modify or delete any other file.

Rules:
1. Keep exactly the same JSON structure as ja.json: the same keys in the same order, the same number of list items. Translate only the string values. Never translate keys.
2. "app_name" must be exactly: {app_name}
3. Keep every {{app}} placeholder exactly as written (it is replaced by the app name later). Do not add or remove placeholders, and do not write the app name in place of {{app}}.
4. Plain text only: no HTML, no Markdown.
5. These are labels of the app's own user interface. Whenever the Japanese text quotes one of them (in 「」), use exactly the {name} label below, wrapped in the quotation marks that are standard for {name}:
{glossary}
   For the iOS Settings path to photo permissions, use the same wording as this app string: {settings_string}
6. Keep these names untranslated: iPhone, iPad, iOS, iPadOS, iCloud, H.264, HEVC, AV1, ProRes 422 Proxy, Motion JPEG, HDR, SDR, DRM, SDK, Discord, Gmail, Slack, WhatsApp, Mail Drop, MB.
7. "privacy.updated" is the date 2026-11-21; write it in the normal long date format for {name}.
8. For the device setting quoted in the "Information provided by Apple" section, use the official {name} name of the iOS setting "Share with App Developers" if you know it.
9. Write natural, concise, friendly text a native speaker would expect on an Apple app's support and privacy pages. Keep the meaning exact: this is a privacy policy, so do not add, drop or soften any statement.
10. The output must be valid UTF-8 JSON with 2-space indentation.
{extra}"""

EXTRA = {
    "en-GB": "Start from en.json and adapt it to British English spelling, punctuation and vocabulary.",
    "en-AU": "Start from en.json and adapt it to Australian English spelling, punctuation and vocabulary.",
    "en-CA": "Start from en.json and adapt it to Canadian English spelling, punctuation and vocabulary.",
}


def prompt(code):
    terms = glossary.glossary(code)
    settings_key = glossary.TERMS[-1]
    lines = "\n".join(f"   - 「{ja}」 → {value}" for ja, value in terms.items() if ja != settings_key)
    return PROMPT.format(name=LANGUAGE_NAMES[code], code=code, app_name=glossary.app_name(code), glossary=lines,
                         settings_string=terms[settings_key], i18n=I18N, extra=EXTRA.get(code, ""))


def main():
    codes = sys.argv[1:] or [c for c, _ in LOCALES if c not in ("ja", "en")]
    PROMPTS.mkdir(exist_ok=True)
    for code in codes:
        (PROMPTS / f"{code}.md").write_text(prompt(code), encoding="utf-8")
    print(f"Wrote {len(codes)} prompt(s) to {PROMPTS}")


if __name__ == "__main__":
    main()
