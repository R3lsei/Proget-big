# GAMEPLAY — NOVA-7

> Le système de jeu. Comment un objet réel devient une solution.

## 1. La boucle principale

```
   ┌─ Observer la salle ─────────────────────────────┐
   │                                                  │
   ▼                                                  │
Identifier l'obstacle                                 │
   │                                                  │
   ▼                                                  │
Comprendre la PROPRIÉTÉ manquante  ←── c'est ici que  │
   │   (« il me faut quelque chose        se joue le  │
   │     de rigide et fin »)              plaisir     │
   ▼                                                  │
Chercher un objet réel chez soi                       │
   │                                                  │
   ▼                                                  │
Le montrer à la caméra                                │
   │                                                  │
   ▼                                                  │
Le jeu le nomme, en déduit ses propriétés,            │
et l'accepte ou explique pourquoi il ne convient pas ─┘
```

**Le moment de plaisir n'est pas le scan** : c'est l'instant où le joueur
comprend quelle *propriété* résout l'obstacle, puis se lève pour la chercher.
Toute la conception protège ce moment.

## 2. Du texte à l'affordance : la chaîne complète

C'est le cœur technique du jeu. Trois étages, chacun testable isolément.

```
  Image caméra
      │
      ▼  détection open-vocabulary (OWLv2)
  "tournevis"                                   ← étage 1 : PERCEPTION
      │
      ▼  base curatée, sinon repli sémantique
  { rigide, allongé, fin, pointu,               ← étage 2 : PROPRIÉTÉS
    métallique, conducteur, manipulable }
      │
      ▼  règles d'affordance
  peut : { faire levier, crocheter,             ← étage 3 : AFFORDANCES
           percer, court-circuiter }
      │
      ▼  l'énigme exige : { rigide ∧ fin }
  ✓ accepté
```

**Pourquoi trois étages et pas un seul.** Si l'on associait directement
`"tournevis" → "peut crocheter"`, il faudrait écrire une fiche par objet du
monde : impossible en open-vocabulary. En passant par les propriétés, un objet
inconnu hérite d'affordances dès qu'on sait le décrire physiquement.

## 3. Les propriétés

Vocabulaire fermé et versionné. Ajouter une propriété est une décision de design,
pas un réflexe — chaque ajout multiplie la surface de test.

### Forme
`allongé` · `fin` · `plat` · `pointu` · `tranchant` · `creux` · `crochu`

### Matière
`rigide` · `souple` · `élastique` · `fragile` · `absorbant` · `conducteur` ·
`isolant` · `inflammable` · `magnétique`

### État
`liquide` · `lourd` · `léger` · `lumineux` · `sonore` · `comestible` · `odorant`

### Fonction
`électronique` · `connecté` · `porteur_d_information` · `chronomètre` · `réfléchissant`

## 4. Les affordances

Une affordance est ce que le joueur peut *faire*. Elle est dérivée, jamais écrite
sur l'objet.

| Affordance | Prédicat de propriétés |
|---|---|
| Couper | `tranchant` |
| Percer | `pointu ∧ rigide` |
| Crocheter | `rigide ∧ fin ∧ allongé` |
| Faire levier | `rigide ∧ allongé ∧ ¬fragile` |
| Éteindre | `liquide` |
| Court-circuiter | `conducteur ∧ allongé` |
| Isoler | `isolant ∧ souple` |
| Éclairer | `lumineux` |
| Distraire | `sonore ∨ (lourd ∧ ¬fragile)` |
| Nourrir | `comestible` |
| Refléter | `réfléchissant ∧ plat` |
| Chronométrer | `chronomètre` |
| Pirater | `électronique ∧ connecté` |
| Documenter | `porteur_d_information` |

## 5. Grammaire des énigmes

Une énigme est un **prédicat**, jamais une liste d'objets.

```js
// ✓ CORRECT — accepte tout ce qui a les bonnes propriétés
{ exige: ['rigide', 'fin', 'allongé'], interdit: ['fragile'] }

// ✗ INTERDIT — recrée la limite qu'on cherche à supprimer
{ objets: ['tournevis', 'stylo', 'trombone'] }
```

### Difficulté = resserrement du prédicat

| Palier | Exemple | Solutions typiques au foyer |
|---|---|---|
| Découverte | `{tranchant}` | ciseaux, couteau, cutter, lame, ouvre-lettre… |
| Standard | `{rigide ∧ fin}` | stylo, trombone, brochette, tournevis… |
| Exigeant | `{conducteur ∧ allongé ∧ ¬isolant}` | fourchette, clé, trombone métallique |
| Expert | `{réfléchissant ∧ plat ∧ léger}` | miroir de poche, CD, écran de téléphone éteint |

Voir [BALANCING.md](BALANCING.md) pour la garantie de résolubilité.

## 6. Feedback : le refus doit enseigner

Un refus muet est un échec de conception. Le jeu explique toujours **quelle
propriété manque**, sans nommer la solution.

> ❌ « Ça ne marche pas. »
> ❌ « Il faut un tournevis. »  *(donne la réponse, tue P2)*
> ✅ « Le manche cède. Il faudrait quelque chose de **plus rigide**. »

Trois refus consécutifs sur la même énigme déclenchent un indice sur la
propriété, jamais sur l'objet.

## 7. Progression

Les propriétés sont introduites une par une, chacune avec une salle qui
l'enseigne avant de l'exiger en combinaison.

| Salles | Introduit | Boucle enseignée |
|---|---|---|
| 1 | `tranchant` | Le scan lui-même. Aucune autre difficulté. |
| 2-3 | `rigide`, `allongé` | Combinaison de deux propriétés |
| 4-5 | `liquide`, `lourd` | Objets consommés à l'usage |
| 6-7 | `conducteur`, `isolant` | Propriétés opposées, choix exclusif |
| 8-9 | `électronique`, `connecté` | Chaînes d'objets multiples |
| 10-12 | négations, combinaisons | Prédicats complets |

## 8. Ce que le joueur n'a pas le droit de subir

- Une énigme sans solution dans un foyer ordinaire → interdit par CI
- Un refus sans explication → interdit par revue
- Une propriété exigée avant d'avoir été enseignée → interdit par test d'ordre
- Un objet accepté dans une salle et refusé dans une autre sans raison → interdit
