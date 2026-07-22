#!/usr/bin/env python3
"""Guard the public site's indivisible Dude McGee artist name."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PAGES = (ROOT / "index.html", ROOT / "label.html", ROOT / "press/index.html")
FULL_NAME = "Dude McGee"


def json_objects(value: object):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from json_objects(child)
    elif isinstance(value, list):
        for child in value:
            yield from json_objects(child)


errors: list[str] = []
website_names: list[str] = []

for page in PUBLIC_PAGES:
    source = page.read_text(encoding="utf-8")
    label = page.relative_to(ROOT)

    if re.search(r"(?<!Dude )\bMcGee\s+(?:is\s+an?\s+)?independent\s+(?:recording\s+)?artist\b", source, re.I):
        errors.append(f"{label}: standalone McGee artist wording")

    description = re.search(r'<meta name="description" content="([^"]+)">', source)
    if not description or FULL_NAME not in description.group(1):
        errors.append(f"{label}: meta description must contain {FULL_NAME}")

    site_name = re.search(r'<meta property="og:site_name" content="([^"]+)">', source)
    if not site_name or site_name.group(1) != FULL_NAME:
        errors.append(f"{label}: og:site_name must be exactly {FULL_NAME}")

    title = re.search(r"<title>(.*?)</title>", source, re.S)
    if not title or FULL_NAME not in title.group(1):
        errors.append(f"{label}: title must contain {FULL_NAME}")

    for raw_json in re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', source, re.S):
        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            errors.append(f"{label}: invalid JSON-LD: {exc}")
            continue

        for item in json_objects(data):
            item_type = item.get("@type")
            if item_type == "MusicGroup" and item.get("name") != FULL_NAME:
                errors.append(f"{label}: MusicGroup name must be exactly {FULL_NAME}")
            if item_type == "WebSite":
                website_names.append(str(item.get("name", "")))
                if item.get("name") != FULL_NAME:
                    errors.append(f"{label}: WebSite name must be exactly {FULL_NAME}")

if FULL_NAME not in website_names:
    errors.append(f"homepage JSON-LD must define WebSite name as {FULL_NAME}")

if errors:
    raise SystemExit("Artist identity check failed:\n- " + "\n- ".join(errors))

print("Artist identity check passed: every public identity signal uses Dude McGee.")
