# NOVA-7 : Protocole Évasion

Un FPS d'évasion dans le navigateur, où **votre caméra est votre inventaire** :
montrez un objet réel (ciseaux, téléphone, livre, bouteille, banane…) et le jeu
le reconnaît, l'annonce à voix haute, lui attribue automatiquement des
capacités logiques, et le matérialise dans votre inventaire pour résoudre les
épreuves.

## Lancer le jeu

Deux façons de servir le jeu (la caméra exige `http://localhost` ou HTTPS) :

```bash
# Recommandé : avec le pont Tripo3D (objets scannés → vrais modèles 3D en jeu)
pip install -r requirements.txt   # une fois, à la racine du dépôt
python serve.py                   # TRIPO_API_KEY dans .env pour activer le pont

# Ou en statique pur (le jeu complet fonctionne aussi comme ça)
cd game && python3 -m http.server 8000
# puis ouvrir http://localhost:8000 dans Chrome / Edge / Firefox
```

Autorisez l'accès à la caméra quand le navigateur le demande. Au premier
lancement, le modèle de détection (COCO-SSD, ~6 Mo) est téléchargé puis mis en
cache ; les bibliothèques (three.js, TensorFlow.js) sont déjà embarquées dans
`lib/`. Pour jouer entièrement hors-ligne, placez les fichiers du modèle
(`model.json` + shards, base `lite_mobilenet_v2`) dans `lib/model/` — le jeu
les utilisera en priorité.

## Contrôles (clavier AZERTY)

| Touche | Action |
|---|---|
| **Z Q S D** / flèches | Se déplacer |
| **Souris** | Regarder |
| **Espace** | Sauter |
| **Maj** | Courir |
| **E** | Interagir avec l'obstacle visé |
| **C** | Ouvrir le scanner caméra (montrer un objet réel) |
| **Entrée** | Matérialiser l'objet détecté |
| **Tab** | Inventaire |
| **F** | Lampe torche (si un téléphone a été scanné) |

## L'histoire

Vous êtes le **Sujet 23**, prisonnier amnésique du complexe souterrain NOVA-7.
Une faille dans votre lien neural — exploitée par le mystérieux Dr Lenoir —
permet de matérialiser dans la simulation les objets réels que vous montrez à
votre caméra. Cinq chapitres vous séparent de la surface :

1. **Le réveil** — poignets liés dans la cellule C-23 : trouvez de quoi couper.
2. **Le bloc A** — crochetez la porte ou faites levier sur la grille d'aération.
3. **Œil pour œil** — neutralisez la caméra de surveillance, trouvez le code de la porte.
4. **La zone chaude** — éteignez le feu chimique du laboratoire, récupérez le badge niveau 4, franchissez la conduite de vapeur qui balaie le sas.
5. **Le cœur de NOVA-7** — piratez le terminal, désactivez la grille laser, amadouez le chien de garde, et montez vers la lumière.

Un secret optionnel (le casier du gardien, dans le bloc A) éclaire l'histoire.

## Les critères logiques automatiques

Chaque objet détecté par la caméra reçoit des capacités déduites de sa nature
(`js/items.js`). Quelques exemples :

| Objet réel montré | Capacités déduites | Sert à |
|---|---|---|
| Ciseaux, couteau | ✂️ Couper, 🔓 Crocheter, 🪛 Levier | Liens, serrures, grilles |
| Brosse à dents, fourchette | 🔓 Crocheter | Serrures mécaniques |
| Cuillère | 🪛 Faire levier | Grille d'aération |
| Téléphone, PC portable, clavier, souris, télécommande | 💻 Pirater (+ 🔦 lampe pour le téléphone) | Caméra, clavier à code, terminal laser |
| Livre | 📖 Connaissance | Révèle le code de la porte |
| Bouteille, tasse, verre, bol | 💧 Liquide, 💥 Briser | Éteindre le feu, casser la vitre de l'armoire |
| Banane, pomme, sandwich, pizza… | 🍎 Nourrir, 🎯 Distraire | Le chien de garde |
| Ballon, vase | 💥 Briser, 🎯 Distraire | Vitre blindée, diversion |
| Cravate, parapluie, sac | 🛡️ Protéger | Refermer la valve de vapeur brûlante |
| Horloge (ou téléphone) | ⏱️ Chronométrer | Passer entre deux jets de vapeur |
| Objet inconnu | 🎯 Distraire | Rien n'est inutile : ça se lance |

La plupart des épreuves acceptent **plusieurs solutions** (pirater *ou*
distraire la caméra, livre *ou* piratage pour le code, casser *ou* crocheter
l'armoire…), et les consommables (liquides, nourriture) s'épuisent.

## Architecture

```
game/
  index.html        interface (menu, HUD, scanner, inventaire, fin)
  css/style.css
  js/
    main.js         assemblage : rendu, boucle, HUD, entrées clavier
    world.js        le complexe : 5 zones, éclairage, portes, feu, lasers, chien
    player.js       contrôleur FPS (ZQSD, souris, saut, collisions)
    vision.js       webcam + COCO-SSD : détection stabilisée + annonce
    items.js        moteur de règles : classe détectée → capacités logiques
    story.js        chapitres, épreuves, dialogues du Dr Lenoir
    audio.js        ambiance et bruitages 100 % procéduraux + voix de synthèse
    tripo.js        pont optionnel vers Tripo3D (désactivé sans backend)
  lib/              three.js, GLTFLoader, tfjs, coco-ssd embarqués (aucun CDN requis)
../serve.py         serveur de dev : sert game/ + POST /api/tripo3d
```

## Pont Tripo3D (optionnel)

Servi par `python serve.py` avec une `TRIPO_API_KEY` (voir la racine du dépôt),
chaque objet réel scanné est envoyé à l'intégration **Tripo3D** du dépôt : un
vrai modèle 3D photoréaliste est généré (~1-2 min), mis en cache dans
`game/generated/<classe>/`, puis **apparaît physiquement devant vous** dans le
complexe, dans un halo de matérialisation. Sans clé ni backend, le module se
désactive silencieusement — le jeu reste complet.

Astuce développeur : dans la console, `NOVA.debug = true` permet de jouer sans
verrouillage de la souris (utile pour les tests automatisés).
