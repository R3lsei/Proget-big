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

## Lot Stylized Nature — Quaternius

Dix-neuf modèles issus du **Stylized Nature MegaKit** (version gratuite, 68 des
116 modèles), par [@Quaternius](https://quaternius.com).

| Fichiers | Licence | Attribution obligatoire |
|---|---|---|
| `herbe-*.glb`, `trefle-*.glb`, `fougere.glb`, `plante-*.glb`, `buisson*.glb`, `champignon.glb`, `fleurs-3.glb`, `fleurs-4.glb`, `caillou-*.glb`, `rocher.glb` | **CC0 1.0** | non |

CC0 est une renonciation au droit d'auteur : aucune obligation, pas même la
citation. Ils sont crédités ici par correction, et parce qu'un lot dont on ne
retrouve plus l'origine devient un lot qu'on n'ose plus republier.

Recompressés pour le jeu par `tools/preparer-vegetation.mjs` — Draco pour la
géométrie, WebP 512 px pour les textures. Les dix-neuf pèsent 0,8 Mo au total.
Le script porte aussi la liste des modèles retenus et la raison des écarts : les
quarante-neuf autres sont des arbres de plein champ de plusieurs mètres, sans
emploi sous une verrière à 3,6 m.

## Lot Modular SciFi MegaKit — Quaternius

Vingt modèles de mobilier, rangés dans `../mobilier/`. Même auteur, même
licence : **CC0 1.0**, domaine public, aucune attribution exigée.

Vingt retenus sur cent quatre-vingt-onze. Le reste est fait de rails, de
plates-formes, de portes et d'aliens, sans emploi dans un laboratoire. 1,4 Mo
au total après Draco + WebP.

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
