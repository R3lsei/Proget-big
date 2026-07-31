@echo off
REM Lance NOVA-7 avec la detection par camera. Double-cliquez sur ce fichier.
cd /d "%~dp0"
echo.
echo   NOVA-7 : Protocole Evasion
echo   Demarrage du serveur local (necessaire pour la camera)...
echo.

python serve.py 2>nul
if errorlevel 1 (
  py serve.py 2>nul
  if errorlevel 1 (
    echo.
    echo   ERREUR : Python n'a pas ete trouve.
    echo   Installez Python depuis https://www.python.org/downloads/
    echo   ^(cochez "Add Python to PATH" pendant l'installation^)
    echo.
    pause
  )
)
