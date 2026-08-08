# KNOWN_BUGS — NOVA-7

> Bugs connus, ouverts et fermés. Un bug fermé garde sa fiche : elle documente
> une non-régression à conserver.

## Ouverts

| ID | Gravité | Description | Contournement |
|---|---|---|---|
| B-011 | Faible | `test_tripo_client` échoue si le SDK `tripo3d` n'est pas installé | `pip install -r requirements.txt` |
| B-012 | Faible | Modèles IA chargés depuis un CDN externe : premier lancement impossible hors-ligne | Accepté en v1 web ; empaquetage prévu en desktop |
| B-013 | Faible | `world.js` dépasse 1000 lignes | Découpage prévu au jalon 4 |

---

## Fermés — non-régressions à préserver

Chacun de ces bugs doit avoir un test dédié. B-001 et B-014 sont verrouillés
(T-003) ; B-002 et B-004 restent à couvrir (T-006).

### B-033 · Plaques noires dans le ciel — **corrigé, après trois diagnostics faux**

**Gravité : élevée.** Vu à travers la baie, le ciel n'était pas dégradé mais
découpé : certains panneaux de verre montraient un désert clair, d'autres une
masse brun sombre. Le défaut a survécu à toute une refonte de l'extérieur.

**Cause réelle** : le dôme céleste a un rayon de 220 m ; le plan lointain de la
caméra était à **200 m**. Le ciel était donc tranché par le plan de coupe, par
plaques, selon la facette du dôme traversée — d'où l'apparence d'un problème de
matériau, et non de caméra. Aucun des deux nombres n'était faux isolément :
c'est leur ORDRE qui l'était, et rien ne l'exprimait.

**Trois diagnostics faux avant celui-là**, tous plausibles, tous démentis :
une dune trop proche, la sous-face de la verrière, la teinte du verre. Le
troisième a même semblé se confirmer : remplacer la toiture vitrée par un
plafond plein a fait disparaître la masse sombre — par accident, en changeant
la tranche de ciel visible. **Un correctif qui marche n'est pas une preuve de
diagnostic.**

**Ce qui a tranché** — deux mesures, aucune observation :
1. peindre le fond du rendu en vert faisait virer au vert les seuls pixels
   sombres : donc rien n'y était dessiné, ce n'était pas une couleur mais une
   ABSENCE ;
2. porter le plan lointain à 400 m les rendait identiques aux pixels clairs.

**Correction** : `PORTEE_VISION` est exportée par `dehors.js` — le module qui
sait jusqu'où le monde s'étend — et la caméra du joueur comme la sonde de
reflets s'en servent. La sonde était atteinte du même mal (portée 150 m) : elle
capturait un ciel noir, et tout ce que le carrelage poli reflétait d'un peu haut
s'en trouvait assombri. Un test vérifie l'ordre des trois rayons.

**Leçon** : quand une surface est ABSENTE et non mal colorée, ce n'est jamais un
problème de matière. Et un défaut visuel qui ressemble à un réglage d'aspect
peut être un réglage de caméra — il faut mesurer le pixel, pas le regarder.

---

### B-014 · Traversée d'obstacle sur déplacement long — **corrigé**
**Gravité : moyenne.** Trouvé par les tests de T-003, pas en jeu.

La collision n'était testée qu'à l'arrivée du déplacement : un pas plus long
que le gabarit du joueur franchissait un mur sans jamais le chevaucher.
Invisible à 120 FPS (6 cm par image), mais un à-coup de 100 ms produit 56 cm —
assez pour traverser une cloison de 30 cm.

**Correction** : découpage du déplacement en sous-pas bornés par le rayon du
corps. Ce bug existait dans le code d'origine et n'avait jamais été observé.

**Test à conserver** : `tests/js/collision.test.js` — déplacement de 5 m
franchissant un mur de 30 cm.

---

### B-001 · Joueur éjecté hors de la carte
**Gravité : critique.** Après avoir coupé ses liens, marcher en arrière
projetait le joueur en (-2,62 · 2,62), hors du décor.

**Deux causes cumulées :**
1. Tous les colliders de portes restaient à l'origine du monde.
   `Box3.setFromObject` ne rafraîchit pas la matrice du groupe parent
   fraîchement ajouté à la scène — d'où un mur invisible au centre de la cellule.
2. La résolution de collision plaquait le joueur sur un bord de boîte selon le
   *signe* du déplacement, sans vérifier qu'il soit significatif. Or
   `Math.sin(Math.PI)` vaut `1,2e-16`, pas zéro : marcher droit en arrière
   portait un déplacement latéral infime qui déclenchait la correction et
   téléportait le joueur de l'autre côté du mur, en cascade.

**Correction** : mise à jour explicite de la matrice avant mesure ; résolution
axe par axe ignorant les déplacements sous `1e-6` ; repoussée toujours du côté
d'origine ; filet de sécurité ramenant à la dernière position valide.

**Test à conserver** : `tests/js/collision.test.js` — marche dans les 4
directions, sauts contre les murs, et reproduction directe du résidu
`Math.sin(Math.PI)`. Verrouillé depuis T-003.

---

### B-002 · Fusion de géométries silencieusement inopérante
**Gravité : moyenne.** `mergeGeometries` refuse de mélanger géométries indexées
et non indexées. Nos boîtes biseautées (`ExtrudeGeometry`) ne sont pas indexées,
les boîtes et cylindres le sont : les groupes mixtes échouaient **sans lever
d'exception**, en écrivant seulement dans la console.

**Correction** : normalisation en non-indexé quand le groupe est mixte.

**Effet mesuré** : 486 → 671 maillages effectivement fusionnés.

---

### B-003 · Matériaux clonés empêchant toute fusion
**Gravité : moyenne.** Chaque bécher clonait son matériau pour une teinte
aléatoire, créant ~36 matériaux uniques. La fusion se faisant par matériau,
aucun ne pouvait être regroupé.

**Correction** : palette fixe de six teintes partagées.

---

### B-004 · Fusion globale supprimant l'élimination hors champ
**Gravité : moyenne.** Fusionner tout le niveau en un bloc réduisait les appels
de dessin mais rendait le tri par champ de vision inopérant : depuis la cellule,
le jeu dessinait tout le complexe (62 → 26 738 triangles).

**Correction** : fusion **par zone**.

**Leçon** : une optimisation qui en annule une autre n'est pas une optimisation.
Toujours mesurer aux cinq points d'observation, pas au pire cas seul.

---

### B-005 · Yeux du chien traités comme un maillage unique
**Gravité : faible.** Le modèle articulé expose deux yeux dans un tableau ;
le code d'apaisement accédait encore à `.material` sur le tableau.

---

### B-006 · Panneau du scanner débordant sur écran court
**Gravité : faible.** En-tête et boutons coupés sous 700 px de haut. De plus,
le canevas des cadres de détection ne suivait pas le cadrage `object-fit` de la
vidéo : les rectangles se décalaient quand l'image était encadrée de bandes noires.

---

### B-007 · Plantage au démarrage sur Firefox
**Gravité : critique.** `requestPointerLock()` renvoie `undefined` sur Firefox ;
appeler `.catch()` dessus levait une exception au clic sur « Commencer ».

**Correction** : appel défensif + mode de compatibilité (regard au glisser) si
le verrouillage du pointeur est indisponible.
