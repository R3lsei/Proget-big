# UI_GUIDELINES — NOVA-7

> L'interface doit disparaître. Ce que le joueur regarde, c'est la salle et
> l'objet qu'il tient dans la main.

## 1. Principe : diégétique d'abord

Le HUD n'est pas une surcouche : c'est **l'implant neural du Sujet 23**. Cette
fiction impose une cohérence utile — tout élément d'interface doit pouvoir
s'expliquer dans le monde du jeu.

| Élément | Justification narrative |
|---|---|
| Objectif en haut à gauche | Rappel de mission gravé dans l'implant |
| Scanner | Liaison optique neurale |
| Inventaire | Mémoire tampon de matérialisation |
| Sous-titres | Transcription de la liaison audio |

Un élément qu'on ne sait pas justifier ainsi est probablement un élément dont on
peut se passer.

## 2. Hiérarchie

Un seul élément dominant à l'écran à la fois. En cas de conflit, cet ordre tranche :

1. Danger immédiat (dégât, alarme)
2. Résultat d'un scan
3. Invite d'interaction
4. Dialogue
5. Objectif
6. Inventaire

## 3. Lisibilité

- Corps de texte : **16 px minimum** à 1080p, mise à l'échelle relative au-delà.
- Contraste **4,5:1 minimum** (WCAG AA), vérifié automatiquement.
- Tout texte sur image possède un fond ou une ombre portée.
- Largeur de lecture ≤ 70 caractères.
- Chiffres alignés : `font-variant-numeric: tabular-nums`.

## 4. La couleur ne porte jamais seule une information

Environ 8 % des hommes ont une déficience de perception des couleurs. Toute
information codée par couleur est doublée d'une forme, d'une icône ou d'un texte.

```
✗ Voyant rouge = verrouillé, voyant vert = ouvert
✓ Voyant rouge + cadenas fermé  /  voyant vert + cadenas ouvert
```

## 5. Retour immédiat

Toute action produit une réaction en **moins de 100 ms**, même si le résultat
prend plus longtemps.

| Action | Réaction immédiate | Résultat |
|---|---|---|
| Ouvrir le scanner | Fondu + son d'amorçage | Flux caméra |
| Scanner un objet | Ligne de balayage | Nom + propriétés |
| Objet refusé | Vibration + son sourd | Explication de la propriété manquante |
| Énigme résolue | Éclat lumineux + accord | Ouverture |

L'attente d'inférence est **habitée**, jamais figée : animation de balayage,
message de progression. Un écran immobile est perçu comme un plantage.

## 6. Le refus enseigne

C'est la règle d'interface la plus importante du jeu.

> ❌ « Objet invalide. »
> ✅ « Le plastique se tord sous la pression. Il faudrait quelque chose de **plus rigide**. »

La propriété manquante est mise en évidence. L'objet attendu n'est jamais nommé.

## 7. Mouvement

- Transitions : 150-250 ms, courbe `ease-out`.
- `prefers-reduced-motion` respecté partout — les animations décoratives
  disparaissent, les retours fonctionnels restent (ils portent de l'information).
- Aucune animation ne bloque une entrée joueur.
- Rien qui clignote entre 3 et 55 Hz (risque photosensible).

## 8. Résolutions à valider

`1280×720` · `1920×1080` · `2560×1440` · `3440×1440` · `390×844` (mobile)

Aucun défilement horizontal du corps de page. Les contenus larges défilent dans
leur propre conteneur.

## 9. Accessibilité — exigences fermes

- Navigation clavier complète, focus **toujours visible**
- Remappage intégral des commandes
- Sous-titres activés par défaut, taille réglable
- Sensibilité souris réglable, inversion d'axe disponible
- Aucune énigme à contrainte de temps stricte
- Aucune énigme reposant sur la perception audio seule
