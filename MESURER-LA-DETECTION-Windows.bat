@echo off
REM Banc de mesure de la detection. Double-cliquez sur ce fichier.
cd /d "%~dp0"

python mesurer.py 2>nul
if errorlevel 1 (
  py mesurer.py 2>nul
  if errorlevel 1 (
    echo.
    echo   ERREUR : Python n'a pas ete trouve.
    echo   Installez Python depuis https://www.python.org/downloads/
    echo   ^(cochez "Add Python to PATH" pendant l'installation^)
    echo.
    pause
  )
)
pause
