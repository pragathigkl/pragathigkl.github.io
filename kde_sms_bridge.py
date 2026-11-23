"""
PRAGATHI P.U. COLLEGE, GURUMATKAL (KY0434)
Local KDE Connect SMS Bridge for Website College Login Invigilator Module
Runs on http://127.0.0.1:5005 (No extra pip libraries needed — uses built-in Python stdlib!)
"""
import os
import re
import json
import shutil
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer


def find_kdeconnect_cli():
    exe = shutil.which("kdeconnect-cli")
    if exe:
        return exe
    candidates = [
        r"C:\Program Files\KDE Connect\bin\kdeconnect-cli.exe",
        r"C:\Program Files (x86)\KDE Connect\bin\kdeconnect-cli.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\KDE Connect\bin\kdeconnect-cli.exe"),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return "kdeconnect-cli"


class KdeBridgeHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(200)

    def do_GET(self):
        if self.path.startswith("/devices"):
            cli = find_kdeconnect_cli()
            devices = []
            try:
                out = subprocess.check_output([cli, "-a"], stderr=subprocess.STDOUT, text=True, timeout=6)
                for line in out.splitlines():
                    m = re.search(r'-\s+(.+?):\s+([A-Za-z0-9_-]+)\s+\(', line)
                    if m:
                        devices.append({"name": m.group(1).strip(), "id": m.group(2).strip()})
                self._set_cors_headers(200)
                self.wfile.write(json.dumps({"devices": devices}).encode("utf-8"))
            except Exception as e:
                self._set_cors_headers(200)
                self.wfile.write(json.dumps({"devices": [], "error": str(e)}).encode("utf-8"))
        else:
            self._set_cors_headers(200)
            self.wfile.write(json.dumps({"ok": True, "service": "Pragathi KDE Connect Bridge"}).encode("utf-8"))

    def do_POST(self):
        if self.path.startswith("/send_sms"):
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"
            data = json.loads(raw_body)

            kde_id = str(data.get("kde_id", "")).strip()
            phone = re.sub(r'[^0-9+]', '', str(data.get("phone", "")).strip())
            message = str(data.get("message", "")).strip()

            if not kde_id or not phone or not message:
                self._set_cors_headers(400)
                self.wfile.write(json.dumps({"status": "error", "error": "Missing KDE ID, phone, or message"}).encode("utf-8"))
                return

            cli = find_kdeconnect_cli()
            try:
                proc = subprocess.run(
                    [cli, "-d", kde_id, "--send-sms", message, "--destination", phone],
                    capture_output=True, text=True, timeout=15
                )
                self._set_cors_headers(200)
                if proc.returncode == 0:
                    self.wfile.write(json.dumps({"status": "sent"}).encode("utf-8"))
                else:
                    err = (proc.stderr or proc.stdout or "KDE CLI error").strip()[:120]
                    self.wfile.write(json.dumps({"status": "error", "error": err}).encode("utf-8"))
            except Exception as e:
                self._set_cors_headers(200)
                self.wfile.write(json.dumps({"status": "error", "error": str(e)[:120]}).encode("utf-8"))


if __name__ == "__main__":
    print("=" * 68)
    print("  PRAGATHI P.U. COLLEGE, GURUMATKAL — KDE Connect SMS Bridge")
    print("  Listening on http://127.0.0.1:5005 (Keep open while sending SMS)")
    print("=" * 68)
    server = HTTPServer(("127.0.0.1", 5005), KdeBridgeHandler)
    server.serve_forever()
