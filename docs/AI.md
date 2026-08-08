# AI — NOVA-7

> Deux « IA » sans rapport cohabitent dans ce projet. Les confondre serait une
> source d'erreurs : ce document les sépare explicitement.

| | Perception | Comportements |
|---|---|---|
| Quoi | Réseau de neurones (OWLv2) | Machines à états |
| Où | `perception/` | `ai/` |
| Rôle | Reconnaître un objet réel | Faire vivre gardes et animaux |
| Document | [GAMEPLAY.md](GAMEPLAY.md) §2 | ce document |

---

## 1. Choix : machines à états, pas d'arbres de comportement

Nos PNJ ont **3 à 5 états**. Un arbre de comportement apporterait un moteur, un
vocabulaire et un outillage pour un gain nul à cette échelle.

**Critère de bascule, écrit à l'avance** : si un PNJ dépasse 7 états ou si trois
PNJ partagent plus de la moitié de leur logique, on passe aux arbres. Pas avant.

## 2. Contrat commun

Chaque agent expose la même interface — c'est ce qui les rend testables sans
rendu ni physique :

```js
{
  etat,                        // état courant, lisible
  percevoir(monde) -> faits,   // ce que l'agent sait (pas ce qui est vrai)
  decider(faits) -> etat,      // transition pure, testable isolément
  agir(dt),                    // effets : déplacement, son, animation
}
```

`decider` est **pure** : mêmes faits, même état. Toute la logique se teste sans
navigateur.

## 3. Le chien de garde

```
        ┌──────────┐  joueur à < 6 m   ┌──────────┐
        │  RONDE   │──────────────────▶│  ALERTE  │
        └──────────┘                   └──────────┘
             ▲                            │      │
   10 s sans │              joueur < 2,5 m│      │ nourriture jetée
   détection │                            ▼      ▼
             │                       ┌────────┐ ┌────────┐
             └───────────────────────│ CHARGE │ │  REPAS │
                                     └────────┘ └────────┘
                                                     │ 25 s
                                                     ▼
                                                 ┌────────┐
                                                 │ APAISÉ │ (terminal)
                                                 └────────┘
```

| État | Comportement | Sortie |
|---|---|---|
| RONDE | Va-et-vient, cycle de marche | Joueur < 6 m → ALERTE |
| ALERTE | S'oriente, grogne, avance lentement | < 2,5 m → CHARGE · nourriture → REPAS · 10 s → RONDE |
| CHARGE | Repousse le joueur, aboie | Après impact → ALERTE |
| REPAS | Se dirige vers la nourriture, mange | 25 s → APAISÉ |
| APAISÉ | Couché, queue qui remue, inoffensif | terminal |

**Choix de design** : le chien ne tue pas, il repousse. Un échec doit coûter du
temps et de la tension, jamais une reprise de sauvegarde — cohérent avec
l'accessibilité (SPEC §5) et avec un jeu d'énigmes, pas d'action.

## 4. Caméras de surveillance

```
BALAYAGE ──joueur dans le cône 1,5 s──▶ DÉTECTION ──▶ ALARME
    ▲                                                    │
    └──────────────── 15 s ──────────────────────────────┘
```

Le délai de 1,5 s est un **choix d'équité** : il laisse au joueur le temps de
reculer. Une détection instantanée serait perçue comme injuste.

## 5. Anti-répétitivité

Un comportement prévisible devient invisible. Trois règles :

1. **Bruit temporel** : chaque durée est tirée à ±15 % de sa valeur nominale.
2. **Mémoire courte** : un agent qui a vu le joueur reste vigilant 20 s.
3. **Réactions inutiles** : un chien qui bâille, une caméra qui recale son
   objectif. Aucune conséquence de jeu, mais l'agent cesse d'être une horloge.

## 6. Ce qui est interdit

- Un agent qui lit l'état du joueur directement → il perçoit, il ne sait pas
- Un état sans sortie → interdit par test
- Une transition non déterministe dans `decider` → le hasard vit dans `agir`
- Un agent capable de bloquer une progression → violation du pilier P3

## 7. Tests

- Chaque transition, isolément
- Aucun état orphelin ni cul-de-sac (parcours du graphe)
- Aucun agent ne peut rendre une salle infranchissable
- Détermination de `decider` sur 1000 tirages
