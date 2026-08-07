@echo off
REM Lance les nouvelles chambres de NOVA-7. Double-cliquez sur ce fichier.
cd /d "%~dp0"

echo.
echo   NOVA-7 : les chambres
echo.

REM On cherche Python AVANT de lancer quoi que ce soit. L'ancienne version
REM enchainait « python » puis « py » et concluait « Python introuvable » sur
REM n'importe quel echec — y compris une archive mal extraite, dont le vrai
REM message se trouvait alors masque par un diagnostic faux.
set LANCEUR=
where python >nul 2>nul && set LANCEUR=python
if "%LANCEUR%"=="" where py >nul 2>nul && set LANCEUR=py
if "%LANCEUR%"=="" (
  echo   ERREUR : Python n'a pas ete trouve sur cet ordinateur.
  echo   Installez-le depuis https://www.python.org/downloads/
  echo   ^(cochez "Add Python to PATH" pendant l'installation^)
  echo.
  pause
  exit /b 1
)

echo   Demarrage du serveur local ^(necessaire pour la camera^)...
echo.

REM Pas de « 2^>nul » : les erreurs de jouer.py doivent etre LUES.
%LANCEUR% jouer.py

REM La fenetre reste ouverte : sans cela, un message d'erreur disparait avec
REM elle et le joueur ne voit qu'une fenetre noire qui se referme.
echo.
pause
