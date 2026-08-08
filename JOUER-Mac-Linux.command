#!/usr/bin/env bash
# Lance NOVA-7 avec la détection par caméra. Double-cliquez sur ce fichier.
cd "$(dirname "$0")" || exit 1

echo
echo "  NOVA-7 : Protocole Évasion"
echo "  Démarrage du serveur local (nécessaire pour la caméra)..."
echo

if command -v python3 >/dev/null 2>&1; then
  python3 serve.py
elif command -v python >/dev/null 2>&1; then
  python serve.py
else
  echo "  ERREUR : Python n'a pas été trouvé."
  echo "  Installez-le depuis https://www.python.org/downloads/"
  echo
  read -r -p "  Appuyez sur Entrée pour fermer."
fi
