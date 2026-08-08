// Verrouille la mise en page des consignes (T-042).
//
// Un panneau de tutoriel qui déborde, se tronque ou se retrouve derrière le
// joueur ne lève aucune erreur : il échoue en silence, et le joueur croit que
// le jeu est mal expliqué — ce qu'il a dit, mot pour mot. Ces tests portent donc
// sur ce qui décide de la lisibilité, pas sur des pixels.

import test from 'node:test';
import assert from 'node:assert/strict';

import { enLignes, mettreEnPage, placerConsigne, COLONNES } from '../../game/js/rendering/consigne.js';
import { CHAMBRES } from '../../game/js/gameplay/chambres.js';
import { seuilDe, departDe } from '../../game/js/rendering/plan.js';

const TEXTE = 'Montrez un objet lourd à votre caméra, puis posez-le sur la plaque '
  + 'pour la maintenir enfoncée.';

test('aucune ligne ne dépasse la largeur du panneau', () => {
  // Le défaut le plus banal et le plus fatal : le texte sort du cadre et la fin
  // de la phrase — celle qui dit quoi faire — n'est jamais lue.
  for (const largeur of [12, 20, COLONNES, 48]) {
    for (const ligne of enLignes(TEXTE, largeur)) {
      assert.ok(ligne.length <= largeur,
        `ligne de ${ligne.length} caractères pour ${largeur} : « ${ligne} »`);
    }
  }
});

test('aucun mot n\'est coupé', () => {
  // Un mot tronqué se lit comme un bug d'affichage, et le joueur cesse de faire
  // confiance au panneau — donc à tout ce qu'il raconte.
  const recompose = enLignes(TEXTE, 18).join(' ');
  assert.equal(recompose, TEXTE.replace(/\s+/g, ' ').trim());
});

test('un mot plus long que la ligne déborde au lieu d\'être cassé', () => {
  // Choix assumé : « électroaimant » sur une ligne de dix vaut mieux que
  // « électroai / mant », qu'on lit comme deux mots inconnus.
  const lignes = enLignes('un électroaimant', 10);
  assert.ok(lignes.includes('électroaimant'), JSON.stringify(lignes));
});

test('le panneau grandit avec son texte', () => {
  // Sinon la police rétrécit à chaque phrase ajoutée, et le jour où le panneau
  // devient illisible personne ne s'en aperçoit avant le joueur.
  const court = mettreEnPage({ titre: 'a', corps: 'Deux mots.' });
  const long = mettreEnPage({ titre: 'a', corps: `${TEXTE} ${TEXTE} ${TEXTE}` });
  assert.ok(long.hauteur > court.hauteur + 0.2,
    `${long.hauteur} contre ${court.hauteur} : le panneau ne suit pas son texte`);
});

test('la consigne est dans le champ de vision du départ', () => {
  // C'est TOUTE la raison d'être de ce placement. Un panneau accroché derrière
  // le joueur suppose qu'il sait déjà qu'il existe — c'est-à-dire qu'il n'a pas
  // besoin de le lire.
  for (const chambre of CHAMBRES) {
    const depart = departDe(chambre);
    const pose = placerConsigne(chambre, seuilDe(chambre));

    // Direction du regard au départ, convention du joueur : (-sin, -cos).
    const regardX = -Math.sin(depart.yaw);
    const regardZ = -Math.cos(depart.yaw);
    const versX = pose.x - depart.x;
    const versZ = pose.z - depart.z;
    const distance = Math.hypot(versX, versZ);
    const cosinus = (versX * regardX + versZ * regardZ) / distance;

    // Le champ de vision fait 72°, soit 36° de part et d'autre ; on exige mieux
    // que 45° pour garder de la marge si le joueur regarde un peu de côté.
    assert.ok(cosinus > Math.cos(Math.PI / 4),
      `${chambre.id} : la consigne est à ${(Math.acos(cosinus) * 180 / Math.PI).toFixed(0)}° `
      + 'du regard de départ');
  }
});

test('la consigne ne bouche pas la porte', () => {
  // Un panneau à cheval sur l'ouverture est un obstacle qu'on ne comprend pas,
  // et il cacherait précisément ce vers quoi il envoie le joueur.
  for (const chambre of CHAMBRES) {
    const seuil = seuilDe(chambre);
    const pose = placerConsigne(chambre, seuil);
    // Distance au centre de la porte, le long du mur.
    const leLong = Math.abs(-seuil.nz * pose.x + seuil.nx * pose.z);
    assert.ok(leLong > seuil.ouverture / 2 + 0.4,
      `${chambre.id} : consigne à ${leLong.toFixed(2)} m de l'axe de la porte`);
  }
});

test('chaque chambre a une consigne rédigée', () => {
  // Le tutoriel n'est pas optionnel : c'est le seul endroit où l'on apprend
  // qu'on peut montrer un objet réel à sa caméra. Une chambre sans consigne est
  // une chambre où le joueur peut rester bloqué sans jamais savoir pourquoi.
  for (const chambre of CHAMBRES) {
    assert.ok(chambre.consigne?.corps, `${chambre.id} n'explique rien`);
    const page = mettreEnPage(chambre.consigne);
    assert.ok(page.lignes.length >= 2, `${chambre.id} : consigne trop courte`);
    assert.ok(page.lignes.length <= 8, `${chambre.id} : consigne trop bavarde`);
  }
});
