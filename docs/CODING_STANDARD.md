# CODING_STANDARD — NOVA-7

> Objectif : qu'un développeur qui découvre le projet comprenne un fichier
> sans avoir à en ouvrir trois autres.

## 1. Langue

- **Code** (identifiants, types) : français ou anglais, mais **cohérent par module**.
  Le domaine métier est en français (`proprietes`, `affordances`, `enigme`) car
  le jeu est pensé en français ; les termes techniques établis restent en anglais
  (`renderer`, `mesh`, `buffer`).
- **Commentaires et documentation** : français.
- **Textes affichés** : jamais en dur. Toujours par clé de localisation.

## 2. Commentaires

Un commentaire explique **pourquoi**, jamais **quoi**.

```js
// ✗ inutile : le code le dit déjà
// incrémente le compteur
compteur++;

// ✓ utile : explique une décision non évidente
// Seuil à 1e-6 : sans lui, un résidu de virgule flottante
// (Math.sin(Math.PI) ≈ 1.2e-16) déclenchait la correction latérale
// et éjectait le joueur hors du décor.
if (Math.abs(delta) < 1e-6) return;
```

**Règle** : si un commentaire décrit ce que fait la ligne suivante, supprimez le
commentaire ou renommez la fonction.

## 3. Fonctions

- Une fonction fait **une chose**. Son nom le dit en entier.
- Au-delà de 40 lignes, justifier ou découper.
- Au-delà de 3 paramètres, passer un objet nommé.
- Pas d'effet de bord caché : une fonction qui s'appelle `calculer…` ne modifie rien.

```js
// ✗ le nom ment sur ce que ça fait
function verifierObjet(o) { inventaire.push(o); return true; }

// ✓
function estUtilisable(objet) { … }
function ajouterAInventaire(objet) { … }
```

## 4. Nommage

| Élément | Convention | Exemple |
|---|---|---|
| Fichiers | `kebab-case.js` | `detecteur-owlv2.js` |
| Classes | `PascalCase` | `MoteurAffordances` |
| Fonctions, variables | `camelCase` | `proprietesDe(objet)` |
| Constantes globales | `SCREAMING_SNAKE` | `FOYER_MINIMAL` |
| Booléens | préfixe interrogatif | `estRigide`, `aCamera`, `peutCouper` |
| Événements | `domaine:fait-accompli` | `enigme:resolue`, `objet:materialise` |

Les événements sont nommés au **passé** : ils décrivent un fait, pas un ordre.

## 5. Imports et dépendances

- Les dépendances suivent le sens déclaré dans ARCHITECTURE.md. **Vérifié en CI.**
- Aucune dépendance circulaire, jamais.
- Toute bibliothèque tierce est justifiée par écrit avant ajout.
- Les bibliothèques sont vendorées dans `lib/`, jamais chargées depuis un CDN
  en production (CSP, hors-ligne, reproductibilité).

## 6. Gestion d'erreur

Un `catch` silencieux est interdit sauf justification écrite sur place.

```js
// ✗ masque le problème et complique le débogage
try { charger(); } catch (_) {}

// ✓ le repli est une décision documentée
try {
  await chargerOwlv2();
} catch (err) {
  // Repli assumé : le jeu doit rester jouable sans le modèle lourd.
  journal.avertir('OWLv2 indisponible, bascule sur COCO-SSD', err);
  await chargerCocoSsd();
}
```

**Règle du repli** : toute dégradation doit être *visible dans le journal* et
*invisible pour le joueur*.

## 7. Immutabilité

- Les données de configuration sont gelées (`Object.freeze`).
- Les fonctions pures ne modifient pas leurs arguments.
- L'état mutable est concentré dans des magasins identifiés, jamais dispersé.

## 8. Interdits

| Interdit | Raison |
|---|---|
| Nombres magiques non nommés | Illisible et non réglable |
| Texte affiché en dur | Bloque la localisation |
| `console.log` en production | Utiliser `core/journal` |
| Variables globales hors `window.NOVA` (debug) | Couplage invisible |
| Fonctions de plus de 3 niveaux d'indentation | Signe de découpage manquant |
| Copier-coller de plus de 5 lignes | Extraire une fonction |

## 9. Avant chaque commit

1. Les tests passent
2. Aucune règle de dépendance violée
3. Les seuils de performance tiennent
4. CHANGELOG.md mis à jour
5. Le message de commit explique **pourquoi**, pas seulement quoi
