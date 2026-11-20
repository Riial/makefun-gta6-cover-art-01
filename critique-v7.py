#!/usr/bin/env python3
"""Ask OpenRouter (nemotron vision) + Gemini vision to critique a v7 cover image.
Usage: critique-v7.py <image.jpg> [image2.jpg ...]
Mirrors analyze-refs.py (add_surrogate_to_request auth). Prints both verdicts.
No keys printed."""
import base64, json, sys, urllib.request

sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request  # noqa: E402

PROMPT = """This is a cover made by a GTA 6 cover-art maker app (multi-panel poster from user photos). Judge it as a competition entry. Be concrete and check the pixels, do not guess.

Answer in this exact shape:
SCORE: <1-10>
TYPO: <any misspelled or garbled word you can actually read, or NONE>
TITLE: <is the big title legible, striped gradient, overlapping the panels? any defect?>
FACES: <is every face whole and visible, or is any face cut off / hidden behind the title or another element? name the panel>
LAYOUT: <any real defect: overlapping text, clipped text, empty/blurry bands, unreadable small text?>
VERDICT: <GOOD or NOT GOOD, one line why>"""

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
    out = msg.get('content')
    if not out:
        out = '(empty content; reasoning: ' + str(msg.get('reasoning'))[:500] + ')'
    return out.strip()

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
        return '(no text; raw: ' + json.dumps(d)[:1000] + ')'

if __name__ == '__main__':
    for path in sys.argv[1:]:
        b64 = base64.b64encode(open(path, 'rb').read()).decode()
        print(f'##### {path} #####')
        for name, fn in [('OPENROUTER', call_openrouter), ('GEMINI', call_gemini)]:
            try:
                print(f'===== {name} =====')
                print(fn(b64))
            except Exception as e:
                print(f'===== {name} FAILED: {e} =====')
