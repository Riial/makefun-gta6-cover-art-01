#!/usr/bin/env python3
"""Critique the v6 cover (1-cover.jpg) with OpenRouter nemotron vision and
Gemini vision, against the top-10 reference pattern.
Usage: critique-v6.py <cover.jpg>
Mirrors ~/workspace/makefun-entries/refs/analyze-refs.py (working auth).
"""
import base64, json, sys, urllib.request

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request  # noqa: E402

PROMPT = """You are judging a GTA 6-style poster cover image made by a web app from user photos. The winning pattern (top entries of this competition) is: a GIANT striped-gradient title (yellow-orange-pink-purple bands, thick dark outline) across the middle overlapping the panels; a pink script subtitle under it; one dominant hero face close-up, whole face visible above the title; 5-6 panels, every panel a whole face (or at most one scene panel), each with a small role tag; a quote band with stars at top; a tagline band; a gold seal; barcode and tiny credits at the bottom.

Look carefully at THIS cover and reply in EXACTLY this format:
TITLE: <is the title giant, striped-gradient, legible, and does it avoid covering any face? YES/NO + one line>
FACES: <is every face whole (not cut by the title or a panel edge)? list any cut face>
TYPO: <any typos, misspellings, truncated or cut-off text, or NONE>
LAYOUT: <any layout defects (overlaps, unreadable text, empty areas, repeated identical faces looking like a mistake), or NONE>
PATTERN: <how closely does it follow the winning pattern above? 1-10>
SCORE: <x/10>
VERDICT: <GOOD or NOT GOOD>
FIX: <the single most important fix, or NONE>"""

def call_openrouter(img_b64):
    body = {"model": "nvidia/nemotron-3.5-super-vl:free", "max_tokens": 4096,
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + img_b64}}]}]}
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions',
        data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    add_surrogate_to_request(req, "custom.openrouter", allowed_hosts=["openrouter.ai"])
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.load(r)
    msg = d['choices'][0]['message']
    return (msg.get('content') or '(empty)').strip()

def call_gemini(img_b64):
    body = json.dumps({"contents": [{"parts": [
        {"text": PROMPT},
        {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}}]}],
        "generationConfig": {"maxOutputTokens": 4096}}).encode()
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
        data=body, headers={"Content-Type": "application/json"})
    add_surrogate_to_request(req, "custom.gemini",
        allowed_hosts=["generativelanguage.googleapis.com"])
    with urllib.request.urlopen(req, timeout=300) as r:
        d = json.load(r)
    try:
        return d["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return '(no text; raw: ' + json.dumps(d)[:800] + ')'

if __name__ == '__main__':
    b64 = base64.b64encode(open(sys.argv[1], 'rb').read()).decode()
    for name, fn in [('OPENROUTER', call_openrouter), ('GEMINI', call_gemini)]:
        try:
            print(f'===== {name} =====')
            print(fn(b64))
        except Exception as e:
            print(f'===== {name} FAILED: {e} =====')
