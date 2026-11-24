import http.server
import json
import os
import shutil
import subprocess
import sys
import threading
import webbrowser
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
LOG = ROOT / "council.log"
BACKUPS = ROOT / "backups"


def staart(pad, regels=60):
    try:
        return "\n".join(pad.read_text(encoding="utf-8", errors="replace").splitlines()[-regels:])
    except OSError:
        return ""


def bewaar_vorige_run():
    trace = ROOT / "trace.json"
    if not trace.exists():
        return None
    try:
        run_id = json.loads(trace.read_text(encoding="utf-8")).get("run_id") or ""
    except (OSError, ValueError):
        run_id = ""
    naam = "".join(c if c.isalnum() or c in "-_" else "-" for c in run_id) or datetime.now().strftime("onbekend-%Y%m%d-%H%M%S")
    doel = BACKUPS / naam
    if not doel.exists():
        doel.mkdir(parents=True)
        for bestand in ("trace.json", "verdict.json"):
            if (ROOT / bestand).exists():
                shutil.copy2(ROOT / bestand, doel / bestand)
    return doel


class Council:
    def __init__(self, kan_starten, reden):
        self.proces = None
        self.gestart = None
        self.exitcode = None
        self.backup = None
        self.handmatig = False
        self.kan_starten = kan_starten
        self.reden = reden
        self.slot = threading.Lock()

    def loopt(self):
        return self.proces is not None and self.proces.poll() is None

    def status(self):
        if self.proces is not None and self.proces.poll() is not None:
            self.exitcode = self.proces.returncode
        return {
            "loopt": self.loopt(),
            "gestart": self.gestart,
            "exitcode": self.exitcode,
            "backup": self.backup,
            "handmatig": self.handmatig,
            "kan_starten": self.kan_starten,
            "reden": self.reden,
            "log": staart(LOG),
        }

    def start(self):
        with self.slot:
            if not self.kan_starten:
                return False, self.reden
            if self.loopt():
                return False, "De Council draait al."
            doel = bewaar_vorige_run()
            self.backup = str(doel.relative_to(ROOT)) if doel else None
            omgeving = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUNBUFFERED="1")
            extra = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {}
            with open(LOG, "w", encoding="utf-8") as log:
                self.proces = subprocess.Popen(
                    [sys.executable, str(ROOT / "council.py")],
                    cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, env=omgeving, **extra,
                )
            self.gestart = datetime.now().isoformat(timespec="seconds")
            self.exitcode = None
            self.handmatig = False
            return True, "De Council is gestart."

    def stop(self):
        with self.slot:
            if not self.loopt():
                return False, "Er draait geen Council."
            self.handmatig = True
            self.proces.terminate()
            try:
                self.proces.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.proces.kill()
                self.proces.wait(timeout=10)
            self.exitcode = self.proces.returncode
            return True, "De Council is gestopt."


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    doel = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT
    map_ = doel.parent if doel.is_file() else doel
    port = int(os.getenv("VIEWER_PORT", "8100"))
    eigen = map_.resolve() == ROOT.resolve()
    council = Council(eigen, "" if eigen else f"Deze viewer toont {map_}; starten kan alleen als de viewer de map van de repo toont.")
    toegestaan = {f"127.0.0.1:{port}", f"localhost:{port}"}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            pad = self.path.split("?")[0]
            if pad in ("/", "/index.html"):
                return self.stuur(ROOT / "viewer.html", "text/html; charset=utf-8")
            if pad in ("/trace.json", "/verdict.json"):
                return self.stuur(map_ / pad[1:], "application/json; charset=utf-8")
            if pad == "/council/status":
                if not self.vertrouwd(False):
                    return self.send_error(403)
                return self.json(200, council.status())
            self.send_error(404)

        def do_POST(self):
            pad = self.path.split("?")[0]
            if pad not in ("/council/start", "/council/stop"):
                return self.send_error(404)
            if not self.vertrouwd(True):
                return self.json(403, {"ok": False, "bericht": "Geweigerd: dit verzoek komt niet van de viewer zelf."})
            ok, bericht = council.start() if pad.endswith("start") else council.stop()
            self.json(200 if ok else 409, {"ok": ok, "bericht": bericht, **council.status()})

        def vertrouwd(self, schrijven):
            if self.headers.get("Host", "") not in toegestaan:
                return False
            herkomst = self.headers.get("Origin")
            if herkomst and herkomst.split("://", 1)[-1] not in toegestaan:
                return False
            return not schrijven or self.headers.get("X-Council") == "1"

        def json(self, code, data):
            inhoud = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(inhoud)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(inhoud)

        def stuur(self, bestand, soort):
            if not bestand.exists():
                return self.send_error(404)
            data = bestand.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", soort)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{port}/"
    print(f"Debatviewer op {url} (leest {map_}). Start de Council met de knop in de viewer. Stop met Ctrl+C.")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if council.loopt():
            print("De lopende Council wordt gestopt.")
            council.stop()


if __name__ == "__main__":
    main()
