"""Lance les nouvelles chambres de NOVA-7.

Usage :  python jouer.py [port]

Sert le dossier `game/` et ouvre directement `chambres.html`, la version bâtie
sur le nouveau moteur : chambres déclarées, mécanismes, portage, caméra.

L'ancienne version reste accessible par `serve.py`, le temps que toutes les
épreuves aient été portées.

Aucune image ne quitte votre ordinateur : la reconnaissance est locale.
"""

import sys
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RACINE = Path(__file__).resolve().parent / "game"

# La caméra exige une origine sûre : `localhost` en est une, un fichier ouvert
# directement depuis le disque n'en est pas une. D'où ce serveur, même pour un
# jeu entièrement local.
PAGE = "chambres.html"


class HandlerSansCache(SimpleHTTPRequestHandler):
    """Sert les fichiers en interdisant toute mise en cache.

    Sans `Cache-Control`, le navigateur applique une fraîcheur heuristique et
    peut resservir une version périmée sans même revalider — on croit alors
    tester le jeu à jour, on teste celui d'avant. C'est le bogue B-015, déjà
    payé une fois sur le banc de mesure.
    """

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        """Silence les journaux d'accès : ils noient les consignes affichées."""


def main() -> None:
    if not RACINE.is_dir():
        print(f"  ERREUR : dossier introuvable — {RACINE}")
        print("  Lancez ce script depuis la racine du projet.")
        sys.exit(1)

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(HandlerSansCache, directory=str(RACINE))
    try:
        serveur = ThreadingHTTPServer(("127.0.0.1", port), handler)
    except OSError as exc:
        print(f"  ERREUR : impossible d'ouvrir le port {port} ({exc}).")
        print(f"  Essayez un autre port :  python jouer.py {port + 1}")
        sys.exit(1)

    # Paramètre unique à chaque lancement : `no-store` ne gouverne que les
    # réponses qui traversent le serveur, or une page déjà en cache peut être
    # resservie sans qu'aucune requête ne parte.
    url = f"http://localhost:{port}/{PAGE}?v={int(time.time())}"
    print(f"""
  NOVA-7 — chambres

  Ouvert sur : {url}

  ZQSD    se déplacer          E    prendre / poser
  souris  regarder             C    caméra
  espace  sauter               1-9  invoquer un objet mémorisé

  Chambre 2 : ajoutez ?c=1 à l'adresse.

  Fermez cette fenêtre quand vous avez terminé (Ctrl+C).
""")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print("\n  Partie terminée.")


if __name__ == "__main__":
    main()
