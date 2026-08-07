# Serveur local de secours pour NOVA-7, en PowerShell pur.
#
# Raison d'etre : le jeu est une page web, mais il lui faut une adresse
# « localhost ». Un fichier ouvert depuis le disque ne peut ni charger ses
# modules, ni demander la camera. Il faut donc un serveur -- et exiger
# l'installation de Python pour jouer a un jeu de navigateur est un cout
# injustifie, paye par le joueur.
#
# PowerShell est present sur TOUT Windows depuis la version 7. Zero
# installation, zero dependance.
#
# On ecoute avec TcpListener plutot qu'avec HttpListener : HttpListener passe
# par http.sys, qui peut exiger un enregistrement d'URL et donc les droits
# administrateur. Un socket brut n'exige rien de personne. On paie ce choix par
# une trentaine de lignes d'analyse HTTP -- le prix est juste.
#
# Tout le texte affiche ici est en ASCII pur, volontairement : la console
# Windows n'est pas en UTF-8 par defaut, et des accents s'y afficheraient en
# charabia. C'est exactement ce qui rendait le message d'erreur de Windows
# illisible ("ParamPtres > Applications").

param(
  [int]$Port = 8000,
  [string]$Page = 'chambres.html'
)

$ErrorActionPreference = 'Stop'

# Le dossier servi est « game/ », voisin du dossier « tools/ » qui contient ce
# script. On le calcule, on ne le suppose pas.
$Racine = Join-Path (Split-Path -Parent $PSScriptRoot) 'game'
$Racine = [System.IO.Path]::GetFullPath($Racine)

if (-not (Test-Path -LiteralPath $Racine -PathType Container)) {
  Write-Host "  ERREUR : dossier introuvable -- $Racine"
  Write-Host "  L'archive a-t-elle bien ete EXTRAITE en entier ?"
  exit 1
}

# Meme regle que dans jouer.py : on verifie la page AVANT d'ouvrir un socket.
# Un serveur qui demarre puis repond 404 fait croire a une panne du jeu.
if (-not (Test-Path -LiteralPath (Join-Path $Racine $Page) -PathType Leaf)) {
  Write-Host "  ERREUR : $Page est introuvable dans $Racine"
  Write-Host "  L'archive a-t-elle bien ete EXTRAITE en entier ?"
  Write-Host "  (clic droit sur le ZIP, puis 'Extraire tout')"
  exit 1
}

$TYPES = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.webp' = 'image/webp'
  '.glb'  = 'model/gltf-binary'
  '.bin'  = 'application/octet-stream'
  '.wasm' = 'application/wasm'
  '.ico'  = 'image/x-icon'
  '.mp3'  = 'audio/mpeg'
  '.wav'  = 'audio/wav'
}

function Envoyer($flux, [int]$code, [string]$texte, [string]$type, [byte[]]$corps) {
  # « Connection: close » nous dispense de gerer les connexions persistantes :
  # le navigateur en rouvre une par requete, ce qui coute quelques
  # millisecondes en local et supprime une classe entiere de bogues.
  $entete = "HTTP/1.1 $code $texte`r`n" +
            "Content-Type: $type`r`n" +
            "Content-Length: $($corps.Length)`r`n" +
            "Cache-Control: no-store, must-revalidate`r`n" +
            "Connection: close`r`n`r`n"
  $octets = [System.Text.Encoding]::ASCII.GetBytes($entete)
  $flux.Write($octets, 0, $octets.Length)
  if ($corps.Length -gt 0) { $flux.Write($corps, 0, $corps.Length) }
  $flux.Flush()
}

# Un ancien serveur peut occuper le port et servir un AUTRE dossier : le
# navigateur affiche alors un 404 venu de nulle part. On prend le premier port
# reellement libre, et on affiche lequel.
$ecouteur = $null
$retenu = 0
for ($p = $Port; $p -lt $Port + 12; $p++) {
  try {
    $essai = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
    $essai.Start()
    $ecouteur = $essai
    $retenu = $p
    break
  } catch {
    Write-Host "  Port $p deja utilise -- j'essaie le suivant."
  }
}
if ($null -eq $ecouteur) {
  Write-Host "  ERREUR : aucun port libre entre $Port et $($Port + 11)."
  Write-Host "  Fermez les autres fenetres NOVA-7 encore ouvertes, puis reessayez."
  exit 1
}

# Parametre unique a chaque lancement : « no-store » ne gouverne que les
# reponses qui traversent le serveur, or une page deja en cache peut etre
# resservie sans qu'aucune requete ne parte.
$version = [int][double]::Parse((Get-Date -UFormat %s))
$url = "http://localhost:$retenu/$Page" + "?v=$version"

Write-Host ""
Write-Host "  NOVA-7 -- chambres        (serveur PowerShell, sans Python)"
Write-Host ""
Write-Host "  Ouvert sur : $url"
Write-Host "  Dossier servi : $Racine"
Write-Host ""
Write-Host "  ZQSD    se deplacer          E    prendre / poser"
Write-Host "  souris  regarder             C    camera"
Write-Host "  espace  sauter               1-9  invoquer un objet memorise"
Write-Host ""
Write-Host "  Chambre 2 : ajoutez ?c=1 a l'adresse."
Write-Host ""
Write-Host "  Fermez cette fenetre quand vous avez termine (Ctrl+C)."
Write-Host ""

try { Start-Process $url | Out-Null } catch {
  Write-Host "  (ouvrez l'adresse ci-dessus a la main dans votre navigateur)"
}

try {
  while ($true) {
    # On sonde plutot que de bloquer sur AcceptTcpClient : un appel bloquant
    # rend Ctrl+C sourd, et une fenetre qu'on ne peut pas fermer est un defaut.
    if (-not $ecouteur.Pending()) { Start-Sleep -Milliseconds 20; continue }

    $client = $ecouteur.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $client.SendTimeout = 20000
      $flux = $client.GetStream()

      # Lecture de la requete jusqu'a la ligne vide qui termine les en-tetes.
      $tampon = New-Object byte[] 8192
      $requete = ''
      while ($requete -notmatch "`r`n`r`n") {
        $lu = $flux.Read($tampon, 0, $tampon.Length)
        if ($lu -le 0) { break }
        $requete += [System.Text.Encoding]::ASCII.GetString($tampon, 0, $lu)
        if ($requete.Length -gt 32768) { break }
      }
      if ($requete.Length -eq 0) { continue }

      $morceaux = (($requete -split "`r`n")[0]) -split ' '
      if ($morceaux.Count -lt 2) { continue }
      $methode = $morceaux[0]
      $cible = ($morceaux[1] -split '\?')[0]
      $cible = [System.Uri]::UnescapeDataString($cible)
      if ($cible -eq '/' -or $cible -eq '') { $cible = "/$Page" }

      $chemin = [System.IO.Path]::GetFullPath((Join-Path $Racine $cible.TrimStart('/')))

      # Un « ../ » dans l'adresse servirait n'importe quel fichier du disque.
      # Le serveur est local, mais une page malveillante ouverte a cote peut
      # lui parler : la verification n'est pas theorique.
      $dedans = $chemin.StartsWith($Racine, [System.StringComparison]::OrdinalIgnoreCase)

      if (-not $dedans -or -not (Test-Path -LiteralPath $chemin -PathType Leaf)) {
        $corps = [System.Text.Encoding]::UTF8.GetBytes(
          "404 -- introuvable : $cible`nDossier servi : $Racine")
        Envoyer $flux 404 'Not Found' 'text/plain; charset=utf-8' $corps
        continue
      }

      $type = $TYPES[[System.IO.Path]::GetExtension($chemin).ToLowerInvariant()]
      if (-not $type) { $type = 'application/octet-stream' }

      if ($methode -eq 'HEAD') {
        Envoyer $flux 200 'OK' $type (New-Object byte[] 0)
      } else {
        Envoyer $flux 200 'OK' $type ([System.IO.File]::ReadAllBytes($chemin))
      }
    } catch {
      # Un navigateur qui coupe une connexion en cours est normal (il annule
      # les telechargements qu'il n'utilise plus). Cela ne doit pas arreter
      # le serveur, donc on avale l'erreur et on passe a la suivante.
    } finally {
      $client.Close()
    }
  }
} finally {
  $ecouteur.Stop()
  Write-Host ""
  Write-Host "  Partie terminee."
}
