# BALANCING — NOVA-7

> Comment on garantit qu'aucun joueur ne reste bloqué, et comment on règle la difficulté.

## 1. Le foyer minimal

C'est le contrat du jeu : **la liste des objets qu'on suppose présents dans
n'importe quel domicile occidental**. Toute énigme doit être résoluble avec
cette liste seule.

Elle est délibérément conservatrice. On n'y met pas de perceuse, pas de miroir
de poche, pas de bougie — trop de foyers en sont dépourvus.

```
Cuisine      couteau · fourchette · cuillère · assiette · verre · tasse ·
             bouteille · casserole · éponge · torchon · sac plastique
Bureau       stylo · crayon · papier · livre · trombone · ciseaux · règle ·
             ruban adhésif · enveloppe
Salle de bain brosse à dents · serviette · savon · peigne · miroir mural
Salon        télécommande · coussin · chargeur · câble · téléphone · clés
Divers       chaussure · chaussette · ceinture · pièce de monnaie · sac
```

**Règle absolue : toute énigme doit accepter au moins 8 objets de cette liste.**
Vérifié automatiquement — voir §4.

## 2. Réglage de la difficulté

La difficulté ne se règle pas en cachant des objets ou en ajoutant du temps.
Elle se règle sur **trois leviers**, dans cet ordre de préférence :

### Levier 1 — la spécificité du prédicat (principal)

| Difficulté | Forme | Solutions au foyer minimal |
|---|---|---|
| Découverte | 1 propriété | 15+ |
| Standard | 2 propriétés | 8-14 |
| Exigeant | 3 propriétés | 8-10 |
| Expert | 3 propriétés + 1 négation | 8 (le plancher) |

On ne descend **jamais** sous 8. Une énigme à 3 solutions est une énigme cassée,
même si elle paraît élégante.

### Levier 2 — la lisibilité de l'indice

Ce n'est pas la solution qu'on cache, c'est la formulation du problème.

- *Facile* : « Ce lien plastique résisterait à tout sauf à une lame. »
- *Standard* : « Le mécanisme est enfoncé, hors de portée des doigts. »
- *Exigeant* : « Le circuit est ouvert. Il manque un pont entre les deux bornes. »

### Levier 3 — la chaîne d'objets

Les salles tardives exigent deux objets successifs : d'abord ouvrir le panneau
(`rigide ∧ fin`), puis ponter le circuit (`conducteur ∧ allongé`). La difficulté
vient de la planification, pas de l'obscurité.

## 3. Consommables

Certains objets sont consommés (liquides, nourriture). Règle : **un consommable
n'est jamais l'unique solution d'une énigme**, sinon un joueur qui le gaspille
se bloque définitivement — violation directe du pilier P3.

## 4. La garantie automatique de résolubilité

C'est le mécanisme qui rend le pilier P3 vérifiable plutôt que déclaratif.

Un test d'intégration continue croise **chaque énigme** avec **tout le foyer
minimal**, via le moteur d'affordances réel :

```
pour chaque énigme E :
    solutions = [ objet ∈ foyer_minimal | affordances(objet) ⊨ E.prédicat ]
    ASSERT len(solutions) >= 8      sinon → échec du build
    ASSERT E.propriétés ⊆ propriétés_déjà_enseignées(E.salle)
```

Ce test ne demande ni caméra, ni modèle d'IA, ni navigateur : il travaille sur
les propriétés. Il tourne en quelques millisecondes à chaque commit.

**Conséquence pratique** : une énigme trop restrictive fait échouer le build.
Le déséquilibre devient impossible à livrer, pas seulement improbable.

## 5. Ce qu'on mesure en playtest

| Indicateur | Cible | Signification si dépassé |
|---|---|---|
| Temps médian par salle | 12-20 min | Trop long : indice illisible |
| Tentatives avant résolution | 2-4 objets | Trop : prédicat mal communiqué |
| Taux d'abandon par salle | < 5 % | Au-delà : la salle est cassée |
| Solutions non anticipées | > 30 % | En dessous : le système est trop rigide, P2 échoue |
| Recours aux indices | < 25 % | Au-delà : l'énoncé du problème est mauvais |

L'indicateur le plus important est le **taux de solutions non anticipées**.
S'il est bas, le jeu n'est qu'une chasse au bon objet déguisée — et le projet a
raté son pari.
