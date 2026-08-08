// Verrouille le paysage extérieur (T-041).
//
// Deux familles d'exigences, et elles pèsent autant l'une que l'autre.
//
// LE PLACEMENT. Un décor lointain ne plante jamais : il est seulement faux, et
// il l'est de trois façons qu'on a déjà commises ailleurs dans ce projet — un
// objet qui flotte, deux objets qui s'interpénètrent, un objet posé là où il
// gêne. Les fonctions qui décident sont donc pures, et testées ici.
//
// LE COÛT. Le joueur a posé une contrainte explicite : « fait toujours
// attention à ce que le jeu ne lague pas ». Une contrainte qu'on ne mesure pas
// n'est pas une contrainte, c'est une intention. Le budget est donc un test :
// il échoue le jour où quelqu'un ajoute une belle idée trop chère, et il
// échoue AVANT que le joueur ne le sente.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  relief, implanter, terrain, formations, voiles, dehors, cielDeTempete,
  RAYON_PLAT, EXCLUSION, PORTEE_FORMATIONS, PORTEE_VISION, DESERT,
} from '../../game/js/rendering/dehors.js';

// ─── Relief ─────────────────────────────────────────────────────────────────

test('le sol est parfaitement plat sous le laboratoire', () => {
  // La moindre bosse traverserait le plancher et se verrait de l'intérieur
  // comme une coulée de sable au milieu du carrelage. « Presque plat » ne
  // suffit pas : c'est une surface qu'on voit à trois mètres.
  for (let x = -RAYON_PLAT; x <= RAYON_PLAT; x += 1.5) {
    for (let z = -RAYON_PLAT; z <= RAYON_PLAT; z += 1.5) {
      if (Math.hypot(x, z) > RAYON_PLAT) continue;
      assert.equal(relief(x, z), 0, `bosse en (${x}, ${z})`);
    }
  }
});

test('le relief est déterministe, et la graine le change', () => {
  // Un décor irreproductible ne se corrige pas : on ne peut ni le montrer, ni
  // prouver qu'il a changé.
  assert.equal(relief(70, -30, 5), relief(70, -30, 5));
  assert.notEqual(relief(70, -30, 5), relief(70, -30, 9));
});

test('le raccord entre le plat et les dunes est sans marche', () => {
  // C'est le défaut qu'un rendu ne pardonne pas : une falaise circulaire
  // parfaitement nette autour du laboratoire, à quinze mètres de la baie. Le
  // fondu progressif est la seule chose qui l'empêche, et rien à l'écran ne
  // dirait qu'il a sauté — sauf ce test.
  for (const cap of [0, 0.7, 1.6, 2.9, 4.1, 5.5]) {
    let precedent = relief(Math.cos(cap) * 5, Math.sin(cap) * 5);
    for (let d = 5.25; d < 70; d += 0.25) {
      const h = relief(Math.cos(cap) * d, Math.sin(cap) * d);
      assert.ok(Math.abs(h - precedent) < 0.3,
        `marche de ${(h - precedent).toFixed(2)} m à ${d} m sur le cap ${cap}`);
      precedent = h;
    }
  }
});

test('le désert lointain a vraiment du relief', () => {
  // Symétrique du test précédent : un fondu trop prudent, ou une amplitude
  // débranchée, donnerait un terrain lisse — c'est-à-dire l'ancien disque plat,
  // avec le coût du nouveau maillage en plus.
  const hauteurs = [];
  for (let i = 0; i < 400; i++) {
    const angle = i * 2.39996;
    const d = 60 + (i % 20) * 5;
    hauteurs.push(relief(Math.cos(angle) * d, Math.sin(angle) * d));
  }
  const ecart = Math.max(...hauteurs) - Math.min(...hauteurs);
  assert.ok(ecart > 2.5, `amplitude du désert trop faible : ${ecart.toFixed(2)} m`);
});

// ─── Implantation des buttes ────────────────────────────────────────────────

test('aucune butte ne se dresse devant la baie', () => {
  // La vue est le sujet de la scène. Une masse de vingt mètres plantée à trente
  // mètres de la vitre ne décore pas le désert : elle le bouche.
  for (const p of implanter({ nombre: 40 })) {
    assert.ok(Math.hypot(p.x, p.z) >= EXCLUSION,
      `butte à ${Math.hypot(p.x, p.z).toFixed(1)} m, sous la garde de ${EXCLUSION} m`);
    assert.ok(Math.hypot(p.x, p.z) <= PORTEE_FORMATIONS);
  }
});

test('les buttes ne se traversent pas', () => {
  // Deux masses qui s'interpénètrent produisent une silhouette impossible, et
  // c'est exactement ce qu'on lit en premier sur un horizon.
  const poses = implanter({ nombre: 40 });
  assert.ok(poses.length > 8, 'trop peu de buttes retenues pour conclure');
  for (let i = 0; i < poses.length; i++) {
    for (let j = i + 1; j < poses.length; j++) {
      const a = poses[i]; const b = poses[j];
      const ecart = Math.hypot(a.x - b.x, a.z - b.z);
      const rayons = Math.max(a.rayonX, a.rayonZ) + Math.max(b.rayonX, b.rayonZ);
      assert.ok(ecart > rayons, `buttes ${i} et ${j} imbriquées`);
    }
  }
});

test('aucune butte ne flotte au-dessus du sable', () => {
  // Le défaut le plus coûteux à voir et le plus facile à écrire : poser l'objet
  // à la hauteur du sol SOUS SON CENTRE. Sur une pente, le centre touche et les
  // bords décollent. On mesure donc l'empreinte entière, sur seize directions
  // décalées de celles qu'échantillonne le code : un test qui rejouerait
  // exactement le même calcul ne vérifierait que lui-même.
  for (const p of implanter({ nombre: 40 })) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + 0.1;
      const sol = relief(p.x + Math.cos(a) * p.rayonX, p.z + Math.sin(a) * p.rayonZ);
      assert.ok(p.y <= sol + 0.15,
        `butte décollée de ${(p.y - sol).toFixed(2)} m sur le bord ${k}`);
    }
  }
});

test('les buttes sont enfoncées, mais pas englouties', () => {
  // Deux fautes symétriques. Une base qui affleure exactement se lit comme un
  // objet posé sur une table. Mais un enfouissement généreux est pire : il
  // CACHE les erreurs d'altitude au lieu de les corriger, et c'est précisément
  // ce qui laissait passer un calcul pris au seul centre de l'empreinte.
  for (const p of implanter({ nombre: 40 })) {
    let bas = relief(p.x, p.z);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      bas = Math.min(bas, relief(p.x + Math.cos(a) * p.rayonX, p.z + Math.sin(a) * p.rayonZ));
    }
    assert.ok(p.y < bas, 'butte simplement posée sur le sable');
    assert.ok(p.y > bas - 1.2,
      `butte enterrée de ${(bas - p.y).toFixed(2)} m : la marge masque les erreurs`);
  }
});

test('l\'implantation est déterministe', () => {
  const a = implanter({ graine: 5, nombre: 20 });
  const b = implanter({ graine: 5, nombre: 20 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, implanter({ graine: 8, nombre: 20 }));
});

// ─── Budget ─────────────────────────────────────────────────────────────────

function inventaire(objet) {
  let dessins = 0; let triangles = 0;
  objet.traverse((n) => {
    if (!n.isMesh) return;
    dessins += 1;
    const g = n.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return { dessins, triangles };
}

test('l\'extérieur tient dans son budget d\'appels de dessin', () => {
  // C'est le nombre d'appels, pas le nombre de triangles, qui fait ramer un
  // navigateur. L'ancien extérieur en dépensait onze pour neuf boules qu'on ne
  // voyait pas ; celui-ci en dépense cinq pour un paysage entier, parce que
  // toutes les buttes tiennent dans une seule instanciation. Si ce test tombe,
  // c'est que quelqu'un a ajouté des maillages séparés — la bonne réponse est
  // presque toujours de les instancier.
  const { dessins } = inventaire(dehors().groupe);
  assert.ok(dessins <= 6, `${dessins} appels de dessin pour le seul décor lointain`);
});

test('l\'extérieur tient dans son budget de triangles', () => {
  const { triangles } = inventaire(dehors().groupe);
  assert.ok(triangles <= 26000, `${triangles} triangles pour le décor lointain`);
});

test('rien de lointain n\'entre dans la passe d\'ombre', () => {
  // La caméra d'ombre couvre vingt-six mètres ; le terrain en fait trois cent
  // quarante. Un seul `castShadow` oublié ferait rendre tout le désert une
  // seconde fois, par image, pour zéro pixel d'ombre.
  dehors().groupe.traverse((n) => {
    if (n.isMesh) assert.equal(n.castShadow, false, `${n.name} porte une ombre`);
  });
});

test('toutes les buttes tiennent dans une seule instanciation', () => {
  const buttes = formations({ nombre: 20 });
  assert.ok(buttes.isInstancedMesh, 'les buttes ne sont pas instanciées');
  assert.equal(buttes.count, implanter({ nombre: 20 }).length);
  assert.equal(buttes.children.length, 0);
});

test('le terrain est un seul maillage, déformé', () => {
  const sol = terrain();
  assert.equal(sol.children.length, 0);
  const y = sol.geometry.attributes.position.array;
  let bougés = 0;
  for (let i = 1; i < y.length; i += 3) if (Math.abs(y[i]) > 0.01) bougés += 1;
  assert.ok(bougés > 1000, `terrain quasi plat : ${bougés} sommets déplacés`);
});

test('les dunes sont éclairées comme des dunes', () => {
  // Déformer les sommets ne suffit pas : tant que les normales restent celles
  // du plan d'origine, chaque facette reçoit la lumière comme si elle était
  // horizontale, et le relief devient rigoureusement invisible. C'est un défaut
  // qui ne casse rien, ne lève rien, et annule tout le travail du terrain — on
  // paie dix-huit mille triangles pour regarder un disque plat.
  const normales = terrain().geometry.attributes.normal;
  let inclinees = 0; let laPlusRaide = 1;
  for (let i = 0; i < normales.count; i++) {
    const y = normales.getY(i);
    if (y < 0.9999) inclinees += 1;
    laPlusRaide = Math.min(laPlusRaide, y);
  }
  assert.ok(inclinees > 1000,
    `${inclinees} normales inclinées : le relief n'accroche pas la lumière`);
  // Et une pente franche quelque part, sinon les dunes existent en géométrie
  // mais rendent comme un plan : c'est l'écart d'éclairement entre le flanc au
  // soleil et le flanc à l'ombre qui les DESSINE.
  assert.ok(laPlusRaide < 0.965,
    `pente maximale de ${(Math.acos(laPlusRaide) * 180 / Math.PI).toFixed(1)}°, trop molle`);
});

test('les voiles n\'écrivent pas dans le tampon de profondeur', () => {
  // Deux surfaces transparentes qui s'y écrivent se découpent mutuellement en
  // franges nettes — un défaut qu'on prend systématiquement pour un bug de
  // géométrie alors que c'est un réglage de matière.
  voiles().traverse((n) => {
    if (!n.isMesh) return;
    assert.equal(n.material.depthWrite, false);
    assert.equal(n.material.transparent, true);
  });
});

test('la portée de vision englobe le ciel, qui englobe le terrain', () => {
  // ─── Le test que B-033 aurait dû avoir dès le premier jour ────────────────
  //
  // Le dôme faisait 220 m de rayon, la caméra voyait à 200 : le ciel était
  // tranché par le plan lointain, et il en restait des plaques NOIRES entre les
  // panneaux de verre. On a successivement accusé une dune, la toiture vitrée,
  // puis le verre lui-même — trois diagnostics faux, des semaines, et un
  // correctif qui n'a marché que par accident.
  //
  // Aucun de ces trois nombres n'est faux tout seul. C'est leur ORDRE qui doit
  // tenir, et rien dans le code ne le disait. Maintenant si.
  const rayonCiel = cielDeTempete().geometry.parameters.radius;
  const geometrieSol = terrain().geometry;
  geometrieSol.computeBoundingBox();
  const coin = Math.hypot(geometrieSol.boundingBox.max.x, geometrieSol.boundingBox.max.z);

  assert.ok(rayonCiel < PORTEE_VISION,
    `ciel à ${rayonCiel} m, vision à ${PORTEE_VISION} m : le ciel sera tranché`);
  assert.ok(coin <= rayonCiel,
    `le coin du terrain (${coin.toFixed(0)} m) sort du dôme (${rayonCiel} m)`);
  assert.ok(PORTEE_FORMATIONS < coin, 'des buttes sont posées hors du terrain');
});

test('la brume laisse voir la tranche où vit le paysage', () => {
  // La densité n'est pas un goût, c'est un calcul. Le facteur de brouillard
  // vaut exp(−(d·densité)²). L'ancienne valeur, 0,021, effaçait 99,8 % de tout
  // ce qui dépassait cent vingt mètres : les dunes existaient et n'avaient
  // aucun pixel. Ce test garde les deux bouts — l'intérieur doit rester net, et
  // l'horizon doit rester lisible.
  const facteur = (d) => Math.exp(-((d * DESERT.brume) ** 2));
  assert.ok(facteur(12) > 0.97, 'la brume mord sur l\'intérieur de la salle');
  assert.ok(facteur(PORTEE_FORMATIONS * 0.6) > 0.25, 'les buttes sont noyées');
  assert.ok(facteur(300) < 0.05, 'la brume ne referme plus l\'horizon');
});
