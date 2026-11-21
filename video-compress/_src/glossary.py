"""Extract the app's own localized UI terms so the website uses identical wording."""
import json, sys
from pathlib import Path

APP = Path(__file__).resolve().parents[3] / "assyuku"
TERMS = ["動画圧縮", "管理", "写真に保存", "ファイルに保存", "位置情報を残す", "動画圧縮に追加",
         "自動(推奨)", "小さく", "バランス", "高画質", "詳細設定", "容量で指定", "画質で指定",
         "写真から選ぶ", "ファイルから選ぶ", "音声を削除する", "目標容量",
         "写真ライブラリへの追加が許可されていません。設定アプリの「プライバシーとセキュリティ」→「写真」で、このアプリに「写真を追加のみ」または「フルアクセス」を許可してください。"]

def load():
    out = {}
    for f in ["Assyuku/Resources/Localizable.xcstrings", "Assyuku/Resources/InfoPlist.xcstrings", "AssyukuShare/Resources/Localizable.xcstrings"]:
        for key, v in json.load(open(APP / f))["strings"].items():
            out.setdefault(key, v.get("localizations", {}))
    return out

def app_name(lang):
    plist = json.load(open(APP / "Assyuku/Resources/InfoPlist.xcstrings"))
    return plist["strings"]["CFBundleDisplayName"]["localizations"][lang]["stringUnit"]["value"]

def glossary(lang):
    data = load()
    result = {}
    for t in TERMS:
        loc = data[t].get(lang)
        if loc is None:
            raise KeyError(f"{t!r} has no {lang} localization")
        result[t] = loc["stringUnit"]["value"]
    return result

if __name__ == "__main__":
    print(json.dumps(glossary(sys.argv[1]), ensure_ascii=False, indent=2))
