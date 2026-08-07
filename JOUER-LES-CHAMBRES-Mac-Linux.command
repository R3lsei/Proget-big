#!/usr/bin/env bash
# Lance les nouvelles chambres de NOVA-7. Double-cliquez sur ce fichier.
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
  python3 jouer.py
elif command -v python >/dev/null 2>&1; then
  python jouer.py
else
  echo "  ERREUR : Python n'a pas été trouvé."
  echo "  Installez-le depuis https://www.python.org/downloads/"
  echo
  read -r -p "  Appuyez sur Entrée pour fermer."
fi
