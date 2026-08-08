// chambres.js — Les chambres du complexe, déclarées une seule fois.
//
// Ce fichier est lu par DEUX programmes qui n'ont rien à voir l'un avec l'autre :
//
//     batisseur.js      → construit la pièce en 3D
//     resolubilite.js   → prouve qu'elle est franchissable
//
// C'est délibéré et c'est le cœur de T-022. Ailleurs, un niveau vit dans un
// fichier et sa validation dans un autre ; on déplace un objet dans l'un, on
// oublie l'autre, et la salle validée n'est plus celle qu'on joue. Ici il n'y a
// rien à synchroniser, donc rien à oublier.
//
// ─── Format ──────────────────────────────────────────────────────────────────
//   id           identifiant court, apparaît dans les messages d'échec
//   titre        nom affiché au joueur
//   etat         'soigne' | 'envahi' — décide des matières et de l'ambiance
//   taille       { largeur, profondeur } en modules de 1,2 m
//   objets       objets PRÉSENTS dans la pièce, noms de la base curatée
//   poses        objet → { x, z } en modules — où il repose au départ
//   receptacles  instance → { type, x, z } — maintenu par une PRÉSENCE
//   terminaux    instance → { type, x, z } — déclenché par une ACTION, reste acquis
//   passerelles  [{ id, x, z, largeur, longueur, condition }] — franchissables une fois sorties
//   elevateurs   [{ id, x, z, largeur, longueur, bas, haut, vitesse, condition }]
//                une passerelle qui voyage VERTICALEMENT ; même fait, même
//                grammaire, mais elle PORTE ce qui est posé dessus
//   mezzanines   [{ x, z, largeur, profondeur, hauteur, ouvertureX }] — planchers perchés
//   gouffre      { xMin, xMax, zMin, zMax } en modules — le sol y est absent
//   zones        zone → condition d'accès ; « depart » est toujours atteignable
//   dans         objet | mécanisme → zone où il se trouve (défaut : « depart »)
//   sortie       condition sur les instances (grammaire de utils/conditions)
//   epreuves     [{ id, affordance }] outils nécessaires
//   porte        { mur, ouverture }
//   verriere     mur remplacé par une verrière en arc ('nord'|'est'|'sud'|'ouest')
//   decor        éléments non bloquants : jardinières, lierre
//
// ─── Règle absolue ───────────────────────────────────────────────────────────
// `objets` liste ce que LA CHAMBRE contient. Ce que le joueur montre à la caméra
// n'y figure jamais : une chambre doit être franchissable sans caméra, sinon un
// joueur sans rien sous la main reste bloqué. La caméra ajoute des solutions,
// elle n'en remplace aucune.

/** Chambre 1 — le réveil. Tutoriel du portage et de la plaque de pression. */
const REVEIL = {
  id: 'c01_reveil',
  titre: 'Salle de réveil',
  etat: 'soigne',
  taille: { largeur: 8, profondeur: 8 },
  // Le côté vitré : une verrière en arc ouvrant sur le désert. C'est par là que
  // le joueur comprend où il est avant qu'aucun texte ne le lui dise.
  verriere: 'est',
  // Deux objets lourds pour une seule plaque : la chambre reste franchissable
  // même si le joueur en perd un, et il découvre que plusieurs choses marchent.
  objets: ['brique', 'caillou', 'couteau', 'éponge'],
  poses: {
    brique: { x: -1.8, z: 1.2 },
    caillou: { x: 1.9, z: 0.4 },
    couteau: { x: 0.6, z: 2.4 },
    'éponge': { x: -2.4, z: 2.6 },
  },
  receptacles: {
    plaque: { type: 'plaque_pression', x: 0, z: -1.5 },
  },
  // ─── La consigne, et pourquoi elle est aussi peu subtile ──────────────────
  //
  // NOVA-7 demande au joueur quelque chose qu'aucun jeu ne lui a jamais
  // demandé : montrer un objet RÉEL à sa webcam. Aucune convention ne l'y
  // prépare, aucune icône ne le suggère. On l'écrit donc en toutes lettres, dès
  // la première salle, sur un panneau qui reste accroché au mur — un message
  // qui s'efface ne sert qu'à ceux qui l'ont lu au bon moment.
  //
  // Le ton reste celui du lieu : une consigne de sécurité affichée par
  // l'administration du complexe, pas une bulle d'aide. Elle explique la RÈGLE,
  // jamais la solution — « un objet lourd », et le joueur cherche lequel.
  consigne: {
    titre: 'Sas de réveil — procédure',
    corps: 'Posez un objet LOURD sur la plaque au sol. '
      + 'La porte reste ouverte tant que la plaque est enfoncée.',
    rappel: 'C : montrez un objet à votre caméra pour l\'ajouter à la sacoche. '
      + 'E : prendre ou poser.',
  },
  sortie: 'plaque',
  epreuves: [{ id: 'liens', affordance: 'couper' }],
  porte: { mur: 'nord', ouverture: 2 },
  // Plus de jardinière : ce bac procédural était le dernier reste de l'époque
  // où le décor était fabriqué par formule, et il jurait franchement à côté du
  // mobilier et de la végétation modelés. Le meublage automatique et le semis
  // par les joints remplissent désormais ce rôle, et le racontent mieux.
  decor: [],
};

/** Chambre 2 — la serre abandonnée. Deux mécanismes simultanés. */
const SERRE = {
  id: 'c02_serre',
  titre: 'Serre abandonnée',
  etat: 'envahi',
  taille: { largeur: 10, profondeur: 8 },
  verriere: 'ouest',
  // Deux plaques à maintenir en même temps : il faut donc deux objets lourds
  // DISTINCTS. C'est précisément le cas que le vérificateur de résolubilité sait
  // détecter, et la raison pour laquelle il ne se contente pas d'une suite de
  // vérifications indépendantes.
  objets: ['brique', 'pot de fleurs', 'tournevis', 'arrosoir'],
  // `tournevis` est conducteur et allongé : il ponte le boîtier. Aucun objet de
  // la salle n'est programmable — la console est donc la voie de qui montre un
  // téléphone à la caméra, le boîtier celle de qui n'en a pas.
  // Tous du côté du départ, et à l'écart des terminaux : un objet posé au pied
  // d'une console se ramasse par accident quand on veut l'activer.
  poses: {
    brique: { x: -1.4, z: 2.6 },
    'pot de fleurs': { x: 1.6, z: 2.8 },
    tournevis: { x: 0.2, z: 1.6 },
    arrosoir: { x: 4.2, z: 3.0 },
  },
  // ─── Géométrie de la salle, et la faute qu'elle a portée longtemps ────────
  //
  // Coordonnées en MODULES ; la salle va de -4 à +4 en profondeur.
  //
  //     z = -4,0 … -1,6   plate-forme du fond : les plaques, puis la porte
  //     z = -1,6 …  0,4   LE GOUFFRE, deux modules, franchi par le seul pont
  //     z =  0,4 …  4,0   départ : les objets, les deux terminaux
  //
  // L'intention était écrite dans ces commentaires depuis le début ; la salle,
  // elle, était bâtie autrement. Les plaques étaient déclarées « dans la
  // plate-forme » — donc exigeant le pont — et posées à z = -0,8, en deçà du
  // gouffre : on y marchait droit. Les DEUX terminaux, eux, étaient à z = -2,6,
  // c'est-à-dire au-dessus du vide, donc suspendus dans le trou.
  //
  // Le vérificateur de résolubilité ne pouvait rien voir : il raisonne sur les
  // zones DÉCLARÉES et jamais sur les coordonnées. La salle était prouvée juste
  // et bâtie fausse. C'est mot pour mot le défaut supprimé pour la végétation le
  // jour du « herbe dans le vide », et que personne n'avait appliqué aux
  // mécanismes. Deux invariants le rendent maintenant impossible.
  //
  // La plate-forme du fond faisait par ailleurs 48 cm de profondeur, pour un
  // joueur de 35 cm de rayon. Elle en fait 2,88 m.
  gouffre: { xMin: -5, xMax: 5, zMin: -1.6, zMax: 0.4 },
  zones: {
    plateforme: 'pont',
  },
  dans: {
    plaque_gauche: 'plateforme',
    plaque_droite: 'plateforme',
  },
  // Au-delà du gouffre : c'est ce qui rend le pont indispensable, et non
  // seulement utile pour atteindre la porte.
  receptacles: {
    plaque_gauche: { type: 'plaque_pression', x: -3, z: -2.7 },
    plaque_droite: { type: 'plaque_pression', x: 3, z: -2.7 },
  },
  terminaux: {
    // DEUX voies pour la même passerelle : la console demande de l'informatique,
    // le boîtier seulement de quoi ponter deux contacts. Un joueur sans appareil
    // programmable n'est donc jamais bloqué — c'est la règle des solutions
    // multiples appliquée au piratage.
    //
    // Du côté du DÉPART, obligatoirement : ce sont eux qui sortent le pont. Les
    // placer au-delà exigerait d'avoir déjà traversé pour pouvoir traverser.
    console: { type: 'console_reseau', x: -3.4, z: 1.4 },
    boitier: { type: 'boitier_commande', x: 3.4, z: 1.4 },
  },
  passerelles: [
    {
      id: 'pont',
      // Centré sur le gouffre, et de sa longueur exacte : un pont plus court
      // laisse une marche dans le vide, un pont plus long empiète sur les dalles
      // et se met à scintiller contre elles.
      x: 0, z: -0.6, largeur: 2, longueur: 2,
      condition: { auMoins: ['console', 'boitier'] },
    },
  ],
  // Deuxième salle, donc deuxième consigne — et c'est la dernière explicite.
  // Elle enseigne la seule règle vraiment nouvelle ici : DEUX plaques en même
  // temps, donc deux objets, donc on ne peut pas se contenter d'en porter un.
  // Elle ne dit pas comment sortir le pont : les notes de service s'en chargent,
  // et c'est là que le jeu commence à faire confiance au joueur.
  consigne: {
    titre: 'Serre — consignes de sécurité',
    corps: 'Les DEUX plaques doivent rester enfoncées en même temps. '
      + 'Franchissement de la fosse par passerelle uniquement.',
    rappel: 'La passerelle se commande depuis un terminal de ce côté-ci.',
  },
  // Notes de service : la voie diégétique, qui prend le relais des consignes.
  // Elles se lisent sur les terminaux, donc seulement si on les cherche — c'est
  // ce qui les distingue du panneau, qu'on ne peut pas manquer. Le tutoriel
  // enseigne, le journal récompense.
  notes: {
    console: 'JOURNAL — 12/09. Passerelle bloquée en position rentrée. '
      + 'Déverrouillage logiciel possible depuis n\'importe quel terminal du réseau.',
    boitier: 'ÉTIQUETTE — Commande manuelle. Ponter les deux contacts avec une '
      + 'pièce métallique allongée en cas de coupure réseau.',
  },
  // La sortie exige les deux plaques ET la passerelle : sans elle, les plaques
  // sont hors d'atteinte de l'autre côté du gouffre.
  sortie: { toutes: ['plaque_gauche', 'plaque_droite', 'pont'] },
  epreuves: [{ id: 'trappe', affordance: 'faire_levier' }],
  porte: { mur: 'nord', ouverture: 2 },
  // Plus de lierre procédural : ses tiges filiformes juraient à côté des vrais
  // modèles, et l'une d'elles se retrouvait derrière la verrière en arc. La
  // colonisation par les bords fait ce travail avec de la vraie végétation.
  decor: [],
};

/**
 * Chambre 3 — la halle de maintenance. Première salle de l'acte I.
 *
 * ─── Ce qu'elle enseigne, et pourquoi c'est la bonne suite ──────────────────
 *
 * Les deux salles du tutoriel ont appris deux verbes : LESTER une plaque,
 * PIRATER un terminal. Celle-ci ne les répète pas et n'en ajoute pas un
 * troisième — elle les COMBINE, et la combinaison produit une idée qu'aucun des
 * deux ne contenait :
 *
 *     une machine qu'on a lancée continue sans nous.
 *
 * D'où la boucle. La passerelle est garée en HAUT, à fleur de mezzanine, donc
 * la sortie est visible et inaccessible dès la première seconde : la salle pose
 * sa question avant que le joueur ait fait un pas. Pirater la console la fait
 * descendre. Une fois en bas elle ne relie plus rien : il faut la renvoyer en
 * haut avec soi dessus, et c'est la plaque, lestée d'un objet, qui l'y renvoie.
 *
 * ─── La règle qui rend la salle sûre ────────────────────────────────────────
 *
 * Tout est RÉVERSIBLE. Reprendre l'objet fait redescendre la passerelle ; rater
 * l'embarquement ne coûte que de recommencer. Dans une salle verticale, un
 * blocage n'est pas une difficulté, c'est une partie perdue — et le joueur ne
 * sait jamais si c'est lui ou le jeu qui a échoué.
 *
 * ─── Le piège que le vérificateur a été écrit pour attraper ─────────────────
 *
 * L'outil qui sort la passerelle placé de l'autre côté de la passerelle. La
 * console et la plaque sont donc AU SOL, toutes les deux, et un test l'exige.
 */
/** Les deux voies du déverrouillage, nommées une fois pour ne pas diverger. */
const DEVERROUILLAGE_LEVAGE = Object.freeze({
  auMoins: ['console_levage', 'boitier_levage'],
});

const HALLE = {
  id: 'c03_halle',
  titre: 'Halle de maintenance',
  // Une cinématique d'entrée. C'est la seule du jeu pour l'instant, et elle
  // porte deux informations que rien d'autre ne transmet : la salle a un
  // ÉTAGE, et la sacoche vient d'être purgée. La purge y est montrée plutôt
  // qu'annoncée — sans quoi elle se lit comme une perte de progression.
  cinematique: true,
  etat: 'envahi',
  // Deux fois la surface des salles précédentes, et surtout six mètres sous
  // plafond au lieu de trois. La hauteur est le sujet : dans un plafond bas,
  // une mezzanine à 2,80 m ne se lit pas comme un étage mais comme une marche.
  taille: { largeur: 14, profondeur: 12 },
  hauteur: 5,
  verriere: 'ouest',

  objets: ['brique', 'pot de fleurs', 'tournevis', 'extincteur', 'éponge'],
  // Tous du côté du départ, à l'écart de la plaque et de la console.
  poses: {
    brique: { x: -2.0, z: 3.6 },
    'pot de fleurs': { x: 2.4, z: 4.2 },
    tournevis: { x: -0.4, z: 2.4 },
    extincteur: { x: 4.6, z: 3.0 },
    'éponge': { x: 1.2, z: 4.6 },
  },

  // La mezzanine occupe toute la largeur du fond et porte la sortie. Son
  // garde-corps est interrompu en face de l'élévateur : c'est la seule chose
  // qui dise, depuis le sol, par où l'on monte.
  mezzanines: [
    { x: 0, z: -4, largeur: 14, profondeur: 4, hauteur: 2.8, ouvertureX: [-1.4, 1.4] },
  ],

  elevateurs: [
    {
      id: 'monte_charge',
      x: 0, z: -1.4, largeur: 2, longueur: 2,
      bas: 0, haut: 2.8,
      // ─── TROIS états, pas deux ────────────────────────────────────────────
      //
      //   ni déverrouillé            → garée EN HAUT, hors d'atteinte
      //   déverrouillée, plaque vide → elle DESCEND : on peut monter dessus
      //   déverrouillée, plaque tenue → elle REMONTE, avec ce qui est dessus
      //
      // La première version n'avait qu'une condition, donc deux états, et la
      // consigne « faux → position basse » la faisait descendre d'elle-même dès
      // la première image : la salle s'ouvrait sans qu'on ait rien piraté.
      // C'est le genre de faute qu'un test de résolubilité ne voit pas — la
      // salle restait franchissable, elle l'était simplement pour rien.
      deverrouillage: DEVERROUILLAGE_LEVAGE,
      rappel: 'plaque_rappel',
      // 0,47 m/s : la course entière dure six secondes. Assez lent pour qu'on
      // ait le temps de traverser quatre mètres sans courir — il n'y a pas de
      // touche pour courir, et un puzzle qui en exigerait une exclurait le
      // joueur qui joue posément. Assez vif pour qu'on sente la machine.
      vitesse: 0.47,
      // Déverrouillé par l'une OU l'autre des deux voies, ET rappelé par la
      // plaque. La grammaire des conditions est récursive, donc cela s'écrit en
      // une ligne — et le vérificateur explore les deux branches tout seul.
      // Le FAIT — « on peut atteindre la mezzanine » — exige les deux : sans
      // déverrouillage la passerelle ne bouge pas, sans plaque elle ne remonte
      // pas. C'est ce que lit le vérificateur, et il a raison de ne connaître
      // que cela : le reste est de la mise en scène.
      condition: { toutes: [DEVERROUILLAGE_LEVAGE, 'plaque_rappel'] },
    },
  ],

  receptacles: {
    // AU SOL, à quatre mètres de l'élévateur. C'est la distance qui fait la
    // leçon : on pose, on marche, on embarque pendant que ça monte.
    plaque_rappel: { type: 'plaque_pression', x: -2.6, z: 0.6 },
  },
  terminaux: {
    // Deux voies pour le même déverrouillage, comme toujours : la console
    // demande de l'informatique, le boîtier seulement de quoi ponter deux
    // contacts. Un joueur sans appareil programmable n'est jamais bloqué.
    //
    // La première version n'en déclarait qu'une, et la salle exigeait donc la
    // caméra — ce que la règle absolue du projet interdit. Le vérificateur l'a
    // refusée avant qu'un seul triangle soit dessiné : c'est exactement ce pour
    // quoi il existe, et c'est la deuxième fois qu'il rattrape ce commentaire
    // qui promettait deux voies là où le code n'en offrait qu'une.
    console_levage: { type: 'console_reseau', x: 4.4, z: 0.8 },
    boitier_levage: { type: 'boitier_commande', x: -5.2, z: 2.0 },
  },

  zones: { mezzanine: 'monte_charge' },
  dans: {},
  sortie: 'monte_charge',
  epreuves: [{ id: 'grille', affordance: 'faire_levier' }],
  // La porte est SUR la mezzanine. `aFranchi` teste désormais la hauteur :
  // sans cela, passer dessous au rez-de-chaussée aurait terminé la salle.
  porte: { mur: 'nord', ouverture: 2, y: 2.8 },

  consigne: {
    titre: 'Halle — levage',
    corps: 'Sacoche purgée au sas. La passerelle ne descend que si le '
      + 'levage est déverrouillé, et ne remonte que si la plaque reste enfoncée.',
    rappel: 'Elle remonte SANS vous : lestez la plaque, puis montez dessus.',
  },
  notes: {
    console_levage: 'JOURNAL — 03/11. Levage condamné après l\'incident du quai. '
      + 'Déverrouillage logiciel toujours actif, rappel par plaque de charge.',
  },
  decor: [],
};

/** Chambres du jeu, dans l'ordre de progression. */
export const CHAMBRES = Object.freeze([REVEIL, SERRE, HALLE]);
