# PERFORMANCE — NOVA-7

> Objectif : **120 FPS**, aucun à-coup visible.
> Les chiffres marqués ⏳ attendent le banc de mesure (jalon 0).

## 1. Machine de référence

Toute cible chiffrée s'entend sur cette configuration. Sans référence commune,
« 120 FPS » ne veut rien dire.

- CPU 6 cœurs, 2020 ou plus récent
- GPU intégré moderne (Iris Xe / Radeon 680M) — **pas** une carte dédiée
- 16 Go de RAM
- Chrome ou Edge à jour
- Rendu 1920×1080

Viser le GPU intégré est délibéré : c'est ce qu'on trouve sur un portable
ordinaire, et le jeu se veut accessible sans machine de joueur.

## 2. Budget par image (8,3 ms à 120 FPS)

| Poste | Budget |
|---|---|
| Rendu (draw calls + shaders) | 4,0 ms |
| Physique et collisions | 0,8 ms |
| Logique de jeu | 0,5 ms |
| Animation | 0,7 ms |
| Interface | 0,5 ms |
| Marge | 1,8 ms |

**L'inférence IA n'apparaît pas dans ce budget** : elle ne tourne jamais pendant
que le joueur se déplace. C'est une règle d'architecture, pas une optimisation.

## 3. Règle d'or de l'inférence

```
Le joueur se déplace  →  AUCUNE inférence
Le scanner est ouvert →  le rendu 3D est mis en pause
```

Faire tourner un réseau de neurones et un moteur 3D sur le même GPU en même
temps garantit des à-coups. On les sépare dans le temps plutôt que de tenter un
partage impossible.

Conséquence de conception : le scanner est un **mode**, pas une superposition.
Ce n'est pas une contrainte subie, c'est ce qui rend l'action lisible.

## 4. Seuils bloquants en CI

| Mesure | Seuil | Actuel |
|---|---|---|
| Appels de dessin, pire vue | < 400 | **337** ✅ |
| Maillages en scène | < 300 | **213** ✅ |
| Triangles, pire vue | < 250 000 | 189 246 ✅ |
| Chargement initial (hors IA) | < 5 s | à mesurer |
| Croissance mémoire sur 15 min | < 5 % | à mesurer |
| Latence d'inférence médiane | ⏳ | ⏳ |

## 5. Optimisations déjà en place (mesurées)

| Technique | Gain |
|---|---|
| **Fusion des géométries statiques par zone** | 1414 → 337 appels (−76 %) |
| **Pool de 6 lumières suivant le joueur** | 25 → 12 lumières évaluées |
| Palette de matériaux mutualisée | ~36 matériaux uniques supprimés |
| Fusion par zone (et non globale) | Préserve l'élimination hors champ |
| Décodeurs DRACO / meshopt | Modèles compressés acceptés |

**Détail qui a compté** : fusionner tout le niveau d'un seul bloc réduisait les
appels mais supprimait le tri par champ de vision — depuis la cellule, on
dessinait tout le complexe (62 → 26 738 triangles). La fusion **par zone** garde
les deux bénéfices. Une optimisation qui en annule une autre n'est pas une
optimisation.

## 6. Chantiers d'optimisation à venir

Par gain attendu décroissant :

1. **Instanciation** des props répétés (béchers, tabourets, caisses)
2. **Niveaux de détail** sur les props lointains
3. **Occlusion par portails** : les zones sont déjà cloisonnées, la structure s'y prête
4. **Atlas de textures** pour réduire les changements d'état
5. **Quantification du modèle IA** si le jalon 0 le réclame

## 7. Fuites mémoire : les suspects

Une session de 4-6 h ne pardonne rien. Points de vigilance :

- Géométries et matériaux non libérés au changement de salle
- Écouteurs d'événements non retirés
- Tenseurs d'inférence non libérés (piège classique de ONNX Runtime)
- Textures canvas régénérées à chaque salle
- Cibles de rendu du PMREM

Chaque salle doit ramener `renderer.info.memory` à son niveau de départ.

## 8. Protocole de mesure

Ne jamais optimiser sans mesure préalable. L'outil est déjà en place :

```js
window.NOVA.renderer.info.render.calls    // appels de dessin
window.NOVA.renderer.info.memory          // géométries, textures
```

Toute optimisation proposée doit s'accompagner d'un avant/après chiffré, aux
cinq points d'observation du niveau. Une optimisation non mesurée est une
hypothèse.
