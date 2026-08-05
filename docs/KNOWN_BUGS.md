# KNOWN_BUGS — NOVA-7

> Bugs connus, ouverts et fermés. Un bug fermé garde sa fiche : elle documente
> une non-régression à conserver.

## Ouverts

| ID | Gravité | Description | Contournement |
|---|---|---|---|
| B-010 | Moyenne | Aucun test JavaScript : une régression peut passer inaperçue | Tâche T-002 |
| B-011 | Faible | `test_tripo_client` échoue si le SDK `tripo3d` n'est pas installé | `pip install -r requirements.txt` |
| B-012 | Faible | Modèles IA chargés depuis un CDN externe : premier lancement impossible hors-ligne | Accepté en v1 web ; empaquetage prévu en desktop |
| B-013 | Faible | `world.js` dépasse 1000 lignes | Découpage prévu au jalon 4 |

---

## Fermés — non-régressions à préserver

Chacun de ces bugs doit avoir un test dédié avant la migration (T-003).

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

**Test à conserver** : marche dans les 4 directions + sauts contre les murs, le
joueur reste dans la cellule.

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
