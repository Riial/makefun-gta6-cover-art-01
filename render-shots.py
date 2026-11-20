#!/usr/bin/env python3
"""Renders the 4 screenshots in shots.json with the cached Chromium binary.

Serves app/ with node serve.ts, screenshots each ?shot= scene headless, then
re-encodes every shot with PIL (q85, optimize=False, progressive=False) so
strict decoders read them cleanly. Usage: python3 render-shots.py
"""
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent
CHROME = Path.home() / ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome"
PORT = 8123


def wait_for_server(url, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(0.5)
    return False


def main():
    shots = json.loads((REPO / "shots.json").read_text())
    server = subprocess.Popen(
        ["node", "serve.ts", "--port", str(PORT)],
        cwd=REPO,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        if not wait_for_server(f"http://127.0.0.1:{PORT}/"):
            print("server did not come up", file=sys.stderr)
            return 1
        from PIL import Image

        for shot in shots:
            raw = Path("/tmp") / f"v7-shot-{shot['name']}.png"
            url = f"http://127.0.0.1:{PORT}/{shot['query']}"
            cmd = [
                str(CHROME),
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                f"--window-size={shot['w']},{shot['h']}",
                "--virtual-time-budget=15000",
                f"--screenshot={raw}",
                url,
            ]
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if r.returncode != 0 or not raw.exists():
                print(f"FAILED {shot['name']}: {r.stderr.strip()[-300:]}", file=sys.stderr)
                return 1
            out = REPO / "screenshots" / shot["name"]
            with Image.open(raw) as im:
                im.convert("RGB").save(
                    out, "JPEG", quality=85, optimize=False, progressive=False
                )
            print(f"{shot['name']}: {im.size[0]}x{im.size[1]}, {out.stat().st_size} B")
            raw.unlink(missing_ok=True)
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
