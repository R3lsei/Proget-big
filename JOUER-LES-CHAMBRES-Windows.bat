@echo off
REM Lance les nouvelles chambres de NOVA-7. Double-cliquez sur ce fichier.
cd /d "%~dp0"
echo.
echo   NOVA-7 : les chambres
echo   Demarrage du serveur local (necessaire pour la camera)...
echo.

python jouer.py 2>nul
if errorlevel 1 (
  py jouer.py 2>nul
  if errorlevel 1 (
    echo.
    echo   ERREUR : Python n'a pas ete trouve.
    echo   Installez Python depuis https://www.python.org/downloads/
    echo   ^(cochez "Add Python to PATH" pendant l'installation^)
    echo.
    pause
  )
)
