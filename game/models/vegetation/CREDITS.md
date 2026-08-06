# Crédits — modèles de végétation

Ces modèles proviennent de la collection d'exemples glTF de Khronos et ont été
recompressés pour le jeu (Draco + textures WebP 1024 px). Les fichiers d'origine
sont sur https://github.com/KhronosGroup/glTF-Sample-Assets.

| Fichier | Origine | Licence | Attribution obligatoire |
|---|---|---|---|
| `plante-pot.glb` | Diffuse Transmission Plant, Khronos glTF Sample Assets | **CC-BY 4.0** | **oui** |
| `plante-pot-loin.glb` | idem, simplifié à 12 % pour les plans larges | **CC-BY 4.0** | **oui** |
| `fleurs-vase.glb` | Glass Vase with Flowers, Khronos glTF Sample Assets | **CC0 1.0** | non |

Une version simplifiée reste une œuvre dérivée : elle porte la même licence et
la même obligation que l'original. C'est un test qui a rattrapé son absence de
ce tableau — l'oubli est arrivé en moins de dix minutes.

## Ce que cela impose

`plante-pot.glb` est en CC-BY 4.0 : sa mention doit apparaître **dans le jeu
lui-même**, pas seulement dans ce fichier. Un dépôt n'est pas une distribution
suffisante — un joueur qui télécharge le jeu doit pouvoir lire l'attribution.

Un écran de crédits accessible depuis le menu principal remplit cette obligation.
Tant qu'il n'existe pas, ce modèle ne doit pas partir dans une version publique.

## Règle pour les prochains ajouts

Aucun asset n'entre dans le dépôt sans une ligne dans ce tableau. Une licence
qu'on ne retrouve plus est une licence qu'on ne respecte pas, et cela se découvre
toujours au pire moment — juste avant une publication.
