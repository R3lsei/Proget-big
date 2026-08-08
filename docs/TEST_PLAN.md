# TEST_PLAN — NOVA-7

> État actuel : **13 tests Python, zéro test JavaScript.** C'est la dette
> technique la plus urgente du projet. Ce plan la solde.

## 1. Pyramide

```
        ╱ E2E ╲          ~15 parcours, lents, Playwright
      ╱─────────╲
    ╱ intégration╲       ~40, modules assemblés
  ╱───────────────╲
╱    unitaires     ╲     ~200, purs, < 2 s au total
```

**Ce qui est testable sans navigateur doit être testé sans navigateur.** Le
système de propriétés et d'affordances est volontairement conçu en fonctions
pures : il porte l'essentiel de la logique de jeu et se teste en millisecondes.

## 2. Tests unitaires (priorité 1)

| Cible | Ce qu'on vérifie |
|---|---|
| `affordances` | Chaque prédicat, y compris négations et disjonctions |
| `proprietes` | Base curatée cohérente ; repli sémantique borné |
| `physics` | **Non-régression : éjection hors carte**, atterrissage, plafond |
| `inventory` | Consommation, épuisement, doublons |
| `save` | Sérialisation, migration de version, données corrompues |
| `quest` | Ordre de progression, déblocages |
| `utils` | Maths, prédicats |

### Non-régressions obligatoires

Chaque bug corrigé devient un test. Trois sont déjà identifiés dans l'existant
et doivent être verrouillés avant toute migration :

1. **Éjection du joueur** — un déplacement de 1,2e-16 sur X déclenchait la
   correction de collision et projetait le joueur hors du décor.
2. **Colliders de portes à l'origine** — `Box3.setFromObject` ne rafraîchit pas
   la matrice du parent fraîchement ajouté.
3. **Fusion indexée/non-indexée** — `mergeGeometries` échoue en silence sur un
   groupe mixte.

## 3. Tests d'intégration

| Cible | Ce qu'on vérifie |
|---|---|
| **Résolubilité** | Chaque énigme × foyer minimal ≥ 8 solutions (voir BALANCING §4) |
| **Ordre pédagogique** | Aucune propriété exigée avant d'avoir été enseignée |
| Chaîne de perception | Détecteur simulé → propriétés → affordances → résolution |
| Repli de détecteur | OWLv2 indisponible → COCO-SSD → jeu toujours jouable |
| Repli de voix | Manifeste absent → synthèse navigateur, aucune réplique muette |
| Repli de modèles | `models/` vide → props procéduraux |

Le test de résolubilité est **bloquant** : un build qui le casse ne part pas.

## 4. Tests E2E (Playwright)

| Parcours | Vérifie |
|---|---|
| Partie complète | Les 12 salles, du réveil à la sortie |
| Scanner caméra | `getUserMedia`, flux, détection, matérialisation |
| Sauvegarde/reprise | Quitter en salle 7, reprendre en salle 7 |
| Remappage | Commandes personnalisées appliquées |
| Résolutions | 1280×720, 1920×1080, 2560×1440, 390×844 |
| Sans webcam | Message clair, pas de plantage |
| Refus caméra | Message clair, reprise possible |

## 5. Tests de performance (automatisés)

Seuils **bloquants** en CI — un dépassement casse le build :

| Mesure | Seuil |
|---|---|
| Appels de dessin, pire vue | < 400 |
| Images par seconde, machine de référence | ≥ 120 |
| Temps de chargement initial | < 5 s (hors modèle IA) |
| Mémoire après 15 min | croissance < 5 % |
| Latence d'inférence médiane | à fixer après le spike |

## 6. Tests de mémoire

Un jeu de 4-6 h ne tolère aucune fuite. Après chaque salle :

- Le nombre de géométries/textures/matériaux revient à sa valeur de base
- Les écouteurs d'événements sont retirés
- `renderer.info.memory` reste stable sur 12 salles enchaînées

## 7. Cas limites à couvrir explicitement

- Caméra refusée, puis autorisée en cours de partie
- Caméra débranchée pendant un scan
- Deux objets valides dans le champ simultanément
- Objet reconnu avec un score très faible
- Objet totalement inconnu de la base curatée
- Sauvegarde d'une version antérieure du jeu
- Onglet mis en arrière-plan pendant une inférence
- Redimensionnement de fenêtre pendant le jeu

## 8. Ce qu'on ne teste pas automatiquement

La **justesse de la détection** dépend du modèle, de l'éclairage et de la
webcam. Elle se valide en playtest sur matériel réel, avec un protocole écrit :
20 objets du foyer minimal, 3 conditions d'éclairage, taux de reconnaissance
consigné. Prétendre l'automatiser donnerait une fausse assurance.
