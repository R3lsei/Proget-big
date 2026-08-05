# Vos modèles 3D

Déposez ici vos fichiers `.glb` (ou `.gltf`) en les nommant d'après le prop
qu'ils remplacent. Le jeu les charge au démarrage et les utilise à la place
des versions modélisées en primitives. **Tout fichier absent laisse simplement
la version d'origine** : le jeu fonctionne sans aucun modèle importé.

## Noms reconnus

| Nom du fichier    | Remplace                        | Encombrement (L×H×P en m) |
|-------------------|----------------------------------|---------------------------|
| `microscope.glb`  | Microscope de paillasse          | 0,28 × 0,30 × 0,28        |
| `tabouret.glb`    | Tabouret de labo                 | 0,46 × 0,62 × 0,46        |
| `paillasse.glb`   | Paillasse / bureau               | 2,40 × 0,95 × 0,78        |
| `chariot.glb`     | Chariot médical du couloir       | 0,62 × 0,90 × 0,46        |
| `caisse.glb`      | Caisse du hangar                 | 0,90 × 0,90 × 0,90        |
| `bidon.glb`       | Bidon métallique                 | 0,60 × 0,88 × 0,60        |
| `serveur.glb`     | Baie de serveurs                 | 0,95 × 2,50 × 1,40        |
| `lit.glb`         | Lit de la cellule                | 0,82 × 0,50 × 1,95        |
| `armoire.glb`     | Armoire sécurisée du labo        | 1,05 × 2,00 × 0,50        |
| `lavabo.glb`      | Lavabo de la cellule             | 0,50 × 0,95 × 0,45        |
| `terminal.glb`    | Terminal de sécurité             | 0,56 × 0,60 × 0,30        |
| `chien.glb`       | Chien de garde                   | 1,00 × 0,75 × 0,35        |
| `becher.glb`      | Bécher de verrerie               | 0,10 × 0,18 × 0,10        |
| `portoir.glb`     | Portoir à tubes à essai          | 0,26 × 0,14 × 0,07        |

Vous n'avez pas à vous soucier de l'échelle ni du centrage : chaque modèle est
automatiquement redimensionné pour tenir dans l'encombrement indiqué, recentré,
et posé sur le sol. Les proportions d'origine sont conservées.

## Formats acceptés

`.glb` et `.gltf`, y compris **compressés en DRACO ou meshopt** — c'est le cas
de la plupart des modèles optimisés. Les décodeurs sont embarqués.

## Où trouver des modèles libres

- **[poly.pizza](https://poly.pizza)** — très grande bibliothèque, licences CC0 / CC-BY
- **[kenney.nl](https://kenney.nl/assets)** — packs de jeu CC0, style épuré
- **[quaternius.com](https://quaternius.com)** — modèles low-poly CC0
- **[sketchfab.com](https://sketchfab.com)** — filtrez sur « Downloadable » + licence CC

Vérifiez la licence avant toute diffusion publique de votre jeu : CC0 n'impose
rien, CC-BY exige de citer l'auteur.

## Ou générez-les depuis vos objets réels

Le pont Tripo3D intégré transforme les objets que vous scannez à la caméra en
véritables modèles 3D, qui apparaissent dans le jeu. Voir le README principal.
