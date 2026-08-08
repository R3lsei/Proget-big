# ART_DIRECTION — NOVA-7

> Ce que le jeu doit donner à voir, et pourquoi. Toute décision visuelle qui
> contredit ce document doit d'abord le modifier.

## 1. En une phrase

Un complexe de recherche futuriste où le végétal est d'abord **cultivé**, puis
**subi** — et la progression du joueur suit exactement cette bascule.

## 2. La règle qui prime sur l'esthétique

**Le décor n'occulte jamais un élément interactif.**

Une liane devant une plaque de pression, et le joueur cherche pour une mauvaise
raison. Il ne saura jamais qu'il a échoué à cause d'une feuille : il croira que
la salle est mal conçue, ou qu'il est mauvais.

Le végétal **encadre** les mécanismes, il ne les recouvre pas. En cas de doute
entre une belle image et une énigme lisible, l'énigme gagne. Toujours.

## 3. Les deux états du lieu

| | Cœur soigné | Périphérie envahie |
|---|---|---|
| Panneaux | blancs, joints nets | déboîtés, fissurés, tachés |
| Végétal | en jardinières, taillé | racines dans les joints, lianes libres |
| Lumière | verrières propres, franche | filtrée, tachetée, verdâtre |
| Sol | carrelage clair | béton, flaques, mousse dans les joints |
| Son | ventilation régulière | gouttes, craquements, vent |

**La bascule est narrative.** Le joueur fuit le centre entretenu vers les zones
oubliées : plus il progresse, plus le lieu se dégrade. C'est le décor qui
raconte depuis combien de temps le complexe tourne sans personne.

Un corollaire de mise en scène : les premières chambres doivent être *belles et
rassurantes*. L'inquiétude vient de leur perfection, pas d'une ambiance sombre —
un laboratoire impeccable où plus personne ne travaille est plus dérangeant
qu'une ruine.

## 4. Lumière

**Une source principale unique : le soleil, à travers les verrières.**

Ce n'est pas seulement un parti pris. C'est la correction du défaut le plus
visible de la version précédente — l'absence d'ombres portées, qui faisait
paraître chaque objet *collé* au sol plutôt que *posé* dessus.

- Une lumière directionnelle, **une seule carte d'ombre**, contre une par lampe
  ponctuelle auparavant. Meilleure image *et* moins cher.
- Les lampes artificielles ne servent qu'à l'accent : bandeaux, signalétique,
  écrans. Elles ne portent pas d'ombre.
- L'éclairage d'ambiance reste bas pour que les ombres existent. Une ambiance
  trop généreuse les efface, et on retombe sur le décor plat.

## 5. Matières

Trois familles, jamais plus, pour que l'œil comprenne le lieu :

1. **Panneau** — blanc mat, légèrement satiné, joints marqués. C'est la peau du
   complexe.
2. **Structure** — métal brossé sombre, montants, gaines, passerelles. C'est le
   squelette, toujours visible aux jonctions.
3. **Vivant** — feuillage, mousse, terre, eau. C'est ce qui n'était pas prévu.

Le contraste blanc / métal sombre / vert est la signature. Toute matière qui
n'entre dans aucune des trois familles doit se justifier.

## 6. Végétation, et son coût

Le feuillage est le premier poste de performance d'une scène naturelle : il se
dessine par transparence, se superpose, et le coût se paie en surface couverte,
pas en nombre de polygones.

Règles fermes :

- **Découpe binaire, jamais de fondu.** Le fondu impose un tri par profondeur et
  interdit la fusion des géométries.
- **Instanciation obligatoire.** Une plante = une instance, pas un objet.
- **Densité plafonnée par chambre**, vérifiée par un test. Sans plafond, une
  chambre luxuriante passe inaperçue à la relecture et coûte trente images par
  seconde.

## 7. Échelle et grille

Tout se construit sur une grille de **1,2 m**. Hauteur standard d'une chambre :
3 modules, soit 3,6 m.

La grille n'est pas une contrainte gratuite : elle rend le kit réutilisable, la
fusion de géométries efficace, et une chambre relisible d'un coup d'œil dans son
fichier de déclaration. C'est ce qui permettra d'en écrire vingt sans que la
vingtième coûte plus cher que la première.

## 8. Ce qui est banni

- Les murs sans jonction visible : l'œil a besoin d'une échelle.
- Le blanc uniforme sur sol, mur et plafond à la fois — le défaut principal de
  la version précédente.
- Les lampes ponctuelles porteuses d'ombre en série.
- Le végétal devant un mécanisme.
- L'obscurité comme moyen de créer une ambiance : le jeu est lumineux, et son
  malaise vient de ce qu'il montre, pas de ce qu'il cache.
