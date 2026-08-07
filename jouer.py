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

    # Le fichier doit exister AVANT de lancer quoi que ce soit : un serveur qui
    # démarre puis renvoie 404 laisse croire à une panne du jeu, alors que c'est
    # l'extraction qui est incomplète.
    if not (RACINE / PAGE).is_file():
        print(f"  ERREUR : {PAGE} est introuvable dans {RACINE}")
        print("  L'archive a-t-elle bien été EXTRAITE en entier ?")
        print("  (Windows : clic droit sur le ZIP, « Extraire tout »)")
        sys.exit(1)

    demande = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(HandlerSansCache, directory=str(RACINE))

    # Un ancien serveur d'une extraction précédente peut occuper le port et
    # servir un dossier qui ne contient pas ces chambres — le navigateur affiche
    # alors un 404 venu de NULLE PART, et rien n'indique que la page ouverte
    # n'est pas la nôtre. On prend donc le premier port réellement libre.
    serveur = None
    for port in range(demande, demande + 12):
        try:
            serveur = ThreadingHTTPServer(("127.0.0.1", port), handler)
            break
        except OSError:
            print(f"  Port {port} déjà utilisé — j'essaie le suivant.")
    if serveur is None:
        print(f"  ERREUR : aucun port libre entre {demande} et {demande + 11}.")
        print("  Fermez les autres fenêtres NOVA-7 encore ouvertes, puis réessayez.")
        sys.exit(1)

    # Paramètre unique à chaque lancement : `no-store` ne gouverne que les
    # réponses qui traversent le serveur, or une page déjà en cache peut être
    # resservie sans qu'aucune requête ne parte.
    url = f"http://localhost:{port}/{PAGE}?v={int(time.time())}"
    print(f"""
  NOVA-7 — chambres

  Ouvert sur : {url}
  Dossier servi : {RACINE}

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
