#!/usr/bin/env bash
# Banc de mesure de la détection. Double-cliquez sur ce fichier.
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
  python3 mesurer.py
elif command -v python >/dev/null 2>&1; then
  python mesurer.py
else
  echo "  ERREUR : Python n'a pas été trouvé."
  echo "  Installez-le depuis https://www.python.org/downloads/"
  echo
  read -r -p "  Appuyez sur Entrée pour fermer."
fi
