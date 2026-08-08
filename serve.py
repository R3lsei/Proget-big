"""Serveur de développement du jeu NOVA-7 avec pont Tripo3D.

Sert le dossier `game/` et expose POST /api/tripo3d : le jeu y envoie la
classe de chaque objet réel scanné, et l'intégration Tripo3D du dépôt génère
un vrai modèle 3D (.glb) qui apparaît ensuite dans la partie.

Usage:
    pip install -r requirements.txt
    # facultatif mais recommandé : TRIPO_API_KEY dans .env pour activer le pont
    python serve.py [port]        # défaut : 8000

Sans TRIPO_API_KEY, le jeu fonctionne normalement — le pont répond 503 et le
client se désactive silencieusement. Les modèles générés sont mis en cache
dans game/generated/<classe>/ (git-ignoré) : une seule génération par classe.
"""

import asyncio
import json
import os
import re
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # dépendance facultative : sans elle, pas de .env mais le jeu tourne
    def load_dotenv() -> None:
        pass

ROOT = Path(__file__).resolve().parent
GAME_DIR = ROOT / "game"
GENERATED_DIR = GAME_DIR / "generated"

_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _find_glb(out_dir: Path) -> Path | None:
    """Préfère la variante PBR quand Tripo en fournit une."""
    if not out_dir.is_dir():
        return None
    candidates = sorted(out_dir.glob("*.glb"), key=lambda p: ("pbr" not in p.name.lower(), p.name))
    return candidates[0] if candidates else None


class GameHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(GAME_DIR), **kwargs)

    def log_message(self, fmt, *args):  # journal compact
        sys.stderr.write("[serve] %s\n" % (fmt % args))

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Manifeste des modèles généré à la volée depuis le contenu du dossier.
        # Sans lui, le jeu doit sonder chaque nom possible et la console se
        # remplit de 404 ; ici il sait d'emblée quoi charger.
        if self.path.split("?")[0] in ("/models/manifest.json", "/models/manifest.json/"):
            dossier = GAME_DIR / "models"
            noms = []
            if dossier.is_dir():
                for f in sorted(dossier.iterdir()):
                    if f.suffix.lower() in (".glb", ".gltf"):
                        noms.append(f.stem)
            self._json(200, {"modeles": sorted(set(noms))})
            return
        super().do_GET()

    def do_HEAD(self):
        if self.path.split("?")[0].startswith("/models/manifest.json"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            return
        super().do_HEAD()

    def do_POST(self):
        if self.path != "/api/tripo3d":
            self.send_error(404)
            return

        if not os.environ.get("TRIPO_API_KEY"):
            self._json(503, {"error": "TRIPO_API_KEY absent : pont Tripo3D désactivé"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length) or b"{}")
            cls = str(data.get("cls", ""))[:60]
        except (ValueError, json.JSONDecodeError):
            self._json(400, {"error": "requête invalide"})
            return

        slug = _slug(cls)
        if not slug:
            self._json(400, {"error": "classe manquante"})
            return

        with _locks_guard:
            lock = _locks.setdefault(slug, threading.Lock())

        # un seul thread génère une classe donnée ; les autres attendent le cache
        with lock:
            glb = _find_glb(GENERATED_DIR / slug)
            if glb is None:
                try:
                    from integrations.tripo import TripoError, generate_from_text
                except ImportError:
                    self._json(503, {"error": "SDK tripo3d manquant : pip install -r requirements.txt"})
                    return

                prompt = (
                    f"a realistic {cls}, single object, photorealistic PBR "
                    f"game prop, centered, plain background"
                )
                try:
                    asyncio.run(generate_from_text(prompt, str(GENERATED_DIR / slug)))
                except TripoError as exc:
                    self._json(502, {"error": str(exc)})
                    return
                except Exception as exc:  # réseau, SDK…
                    self._json(502, {"error": f"génération échouée : {exc}"})
                    return
                glb = _find_glb(GENERATED_DIR / slug)

        if glb is None:
            self._json(502, {"error": "Tripo n'a produit aucun fichier .glb"})
            return
        self._json(200, {"url": f"/generated/{slug}/{glb.name}"})


def main() -> None:
    load_dotenv()
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    GENERATED_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(("0.0.0.0", port), GameHandler)
    print(f"NOVA-7 servi sur http://localhost:{port}")

    # ouvre le navigateur automatiquement : il suffit de lancer `python serve.py`
    import webbrowser

    threading.Timer(0.8, lambda: webbrowser.open(f"http://localhost:{port}")).start()
    print(
        "Pont Tripo3D :",
        "ACTIF" if os.environ.get("TRIPO_API_KEY") else "inactif (TRIPO_API_KEY absent)",
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
