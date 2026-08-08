@echo off
REM Lance les nouvelles chambres de NOVA-7. Double-cliquez sur ce fichier.
cd /d "%~dp0"

echo.
echo   NOVA-7 : les chambres
echo.

REM On EXECUTE chaque interpreteur au lieu de se contenter de le trouver.
REM Windows installe un faux "python.exe" qui ne fait qu'ouvrir le Microsoft
REM Store : "where python" le trouve, et on croit alors Python installe. Seul
REM un vrai lancement fait la difference -- le faux sort en erreur sans rien
REM executer. On essaie "py" en premier : ce lanceur-la n'a jamais de leurre.
set LANCEUR=
for %%C in (py python python3) do (
  if not defined LANCEUR (
    %%C -c "import sys" >nul 2>nul && set LANCEUR=%%C
  )
)

if defined LANCEUR (
  echo   Demarrage du serveur local ^(necessaire pour la camera^)...
  echo.
  REM Pas de "2^>nul" ici : les erreurs de jouer.py doivent etre LUES.
  %LANCEUR% jouer.py
  echo.
  pause
  exit /b 0
)

REM Pas de Python ? Ce n'est pas au joueur d'en installer un pour ouvrir une
REM page web. PowerShell est present sur tout Windows depuis la version 7, et
REM sait servir ces fichiers aussi bien.
echo   Python n'est pas installe -- j'utilise PowerShell a la place.
echo   Demarrage du serveur local ^(necessaire pour la camera^)...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\serveur.ps1"
if errorlevel 1 (
  echo.
  echo   ERREUR : le serveur n'a pas pu demarrer.
  echo   Relisez le message ci-dessus : il dit lequel des deux cas s'applique
  echo   ^(archive mal extraite, ou aucun port disponible^).
)
echo.
pause
