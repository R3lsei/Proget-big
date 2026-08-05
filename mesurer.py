"""Lance le banc de mesure de la détection (tâche T-001).

Usage :  python mesurer.py [port]

Sert tools/spike-detection/ et ouvre le navigateur. Le banc mesure sur VOTRE
machine le temps de chargement du modèle, la latence d'inférence et la justesse
de la reconnaissance — des chiffres qu'aucune documentation ne peut prédire et
dont dépend tout le design du scanner.

Aucune image ne quitte votre ordinateur : l'inférence est locale.
"""

import sys
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RACINE = Path(__file__).resolve().parent / "tools" / "spike-detection"


def main() -> None:
    if not RACINE.is_dir():
        print(f"  ERREUR : dossier introuvable — {RACINE}")
        print("  Lancez ce script depuis la racine du projet.")
        sys.exit(1)

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

    handler = partial(SimpleHTTPRequestHandler, directory=str(RACINE))
    try:
        serveur = ThreadingHTTPServer(("127.0.0.1", port), handler)
    except OSError as exc:
        print(f"  ERREUR : impossible d'ouvrir le port {port} ({exc}).")
        print(f"  Essayez un autre port :  python mesurer.py {port + 1}")
        sys.exit(1)

    url = f"http://localhost:{port}"
    print(f"""
  Banc de mesure — détection open-vocabulary

  Ouvert sur : {url}

  1. Cliquez « Charger le modèle » (long au premier lancement, c'est mesuré)
  2. Cliquez « Activer la caméra », montrez-lui quelques objets
  3. Cliquez « Mesurer 10 inférences »
  4. Copiez la ligne « Chiffres à reporter » de la section Verdict

  Fermez cette fenêtre quand vous avez terminé (Ctrl+C).
""")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print("\n  Banc arrêté.")


if __name__ == "__main__":
    main()
