#!/usr/bin/env python3
"""Render the 4 screenshots for Golden Heist v6.

Serves app/ on 127.0.0.1:8123 (node serve.ts), screenshots each ?shot=
scene with headless Chromium, then re-encodes with PIL q85, optimize=False,
progressive=False (standard Huffman tables: the anti-green-scanline recipe
that decodes cleanly on Android and vision pipelines).
Usage: python3 render-shots.py  (run from the repo root)
"""
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CHROME = "/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome"
PORT = 8123


def wait_for_server(url, timeout=20):
    for _ in range(timeout * 5):
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(0.2)
    return False


def main():
    shots = json.loads((HERE / "shots.json").read_text())
    server = subprocess.Popen(
        ["node", "serve.ts", str(PORT)], cwd=HERE,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not wait_for_server(f"http://127.0.0.1:{PORT}/"):
            print("server did not come up")
            return 1
        (HERE / "screenshots").mkdir(exist_ok=True)
        for s in shots:
            raw = f"/tmp/v6shot-{s['name'].replace('.jpg', '.png')}"
            url = f"http://127.0.0.1:{PORT}/{s['query']}"
            cmd = [CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
                   "--hide-scrollbars", f"--window-size={s['w']},{s['h']}",
                   "--virtual-time-budget=9000", f"--screenshot={raw}", url]
            r = subprocess.run(cmd, capture_output=True, timeout=120)
            if r.returncode != 0:
                print(f"{s['name']}: chrome failed: {r.stderr.decode()[:300]}")
                return 1
            from PIL import Image
            im = Image.open(raw).convert("RGB")
            out = HERE / "screenshots" / s["name"]
            im.save(out, "JPEG", quality=85, optimize=False, progressive=False)
            print(f"{s['name']}: {im.size} {out.stat().st_size} bytes")
        return 0
    finally:
        server.terminate()


if __name__ == "__main__":
    sys.exit(main())
