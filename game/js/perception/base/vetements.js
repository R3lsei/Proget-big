// Vêtements, chaussures, accessoires portés.
//
// Presque tous sont `souple`, `absorbant` et `inflammable` : le textile est une
// matière homogène. Ce qui les différencie tient à la forme et aux accessoires
// métalliques — c'est la ceinture qui apporte `rigide`, le lacet `allonge`, la
// chaussure `creux`. Sans ces nuances la catégorie entière serait interchangeable
// et n'offrirait qu'une seule solution.

export const VETEMENTS = {
  'tee-shirt':        { a: 'un',  p: ['souple', 'plat', 'absorbant', 'inflammable', 'leger'] },
  'chemise':          { a: 'une', p: ['souple', 'plat', 'absorbant', 'inflammable', 'leger'] },
  'pull':             { a: 'un',  p: ['souple', 'absorbant', 'inflammable', 'isolant_thermique'] },
  'veste':            { a: 'une', p: ['souple', 'creux', 'absorbant', 'inflammable', 'isolant_thermique'] },
  'manteau':          { a: 'un',  p: ['souple', 'creux', 'absorbant', 'inflammable', 'isolant_thermique', 'lourd'] },
  'pantalon':         { a: 'un',  p: ['souple', 'allonge', 'creux', 'absorbant', 'inflammable'] },
  'jean':             { a: 'un',  p: ['souple', 'allonge', 'creux', 'absorbant', 'inflammable', 'lourd'] },
  'short':            { a: 'un',  p: ['souple', 'creux', 'absorbant', 'inflammable', 'leger'] },
  'robe':             { a: 'une', p: ['souple', 'allonge', 'absorbant', 'inflammable', 'leger'] },
  'jupe':             { a: 'une', p: ['souple', 'absorbant', 'inflammable', 'leger'] },
  'chaussette':       { a: 'une', p: ['souple', 'creux', 'absorbant', 'inflammable', 'isolant_thermique', 'leger'] },
  'chaussure':        { a: 'une', p: ['creux', 'rigide', 'souple', 'absorbant', 'inflammable', 'odorant', 'tenable_une_main'] },
  'basket':           { a: 'une', p: ['creux', 'souple', 'absorbant', 'inflammable', 'odorant', 'tenable_une_main'] },
  'botte':            { a: 'une', p: ['creux', 'rigide', 'allonge', 'inflammable', 'lourd'] },
  'lacet':            { a: 'un',  p: ['souple', 'allonge', 'mince', 'inflammable', 'leger'] },
  'ceinture':         { a: 'une', p: ['souple', 'allonge', 'plat', 'inflammable', 'conducteur', 'magnetique', 'tenable_une_main'] },
  'cravate':          { a: 'une', p: ['souple', 'allonge', 'plat', 'absorbant', 'inflammable', 'leger'] },
  'écharpe':          { a: 'une', p: ['souple', 'allonge', 'absorbant', 'inflammable', 'isolant_thermique', 'leger'] },
  'foulard':          { a: 'un',  p: ['souple', 'plat', 'absorbant', 'inflammable', 'leger'] },
  'bonnet':           { a: 'un',  p: ['souple', 'creux', 'absorbant', 'inflammable', 'isolant_thermique', 'leger'] },
  'casquette':        { a: 'une', p: ['souple', 'creux', 'plat', 'absorbant', 'inflammable', 'leger'] },
  'chapeau':          { a: 'un',  p: ['souple', 'creux', 'inflammable', 'leger'] },
  'gant':             { a: 'un',  p: ['souple', 'creux', 'absorbant', 'inflammable', 'isolant_thermique', 'leger'] },
  'blouse de laboratoire': { a: 'une', p: ['souple', 'plat', 'absorbant', 'inflammable', 'leger'] },
  'masque':           { a: 'un',  p: ['souple', 'plat', 'absorbant', 'inflammable', 'leger'] },
  'lunettes':         { a: 'des', p: ['rigide', 'mince', 'cassant', 'reflechissant', 'leger', 'tenable_une_main'] },
  'lunettes de soleil': { a: 'des', p: ['rigide', 'mince', 'cassant', 'reflechissant', 'leger', 'tenable_une_main'] },
  'sac à dos':        { a: 'un',  p: ['souple', 'creux', 'inflammable', 'absorbant'] },
  'sac à main':       { a: 'un',  p: ['souple', 'creux', 'inflammable', 'tenable_une_main'] },
  'sac plastique':    { a: 'un',  p: ['souple', 'creux', 'mince', 'inflammable', 'leger'] },
  'portefeuille':     { a: 'un',  p: ['souple', 'plat', 'creux', 'inflammable', 'porte_texte', 'leger', 'tenable_une_main'] },
  'parapluie':        { a: 'un',  p: ['rigide', 'allonge', 'souple', 'conducteur', 'tenable_une_main'] },
  'bague':            { a: 'une', p: ['rigide', 'creux', 'conducteur', 'reflechissant', 'leger', 'tenable_une_main'] },
  'collier':          { a: 'un',  p: ['souple', 'allonge', 'mince', 'conducteur', 'reflechissant', 'leger'] },
  'bracelet':         { a: 'un',  p: ['souple', 'creux', 'conducteur', 'leger', 'tenable_une_main'] },
  'boucle d\'oreille': { a: 'une', p: ['pointu', 'mince', 'rigide', 'conducteur', 'reflechissant', 'leger'] },
  'serviette':        { a: 'une', p: ['souple', 'plat', 'absorbant', 'inflammable'] },
  'couverture':       { a: 'une', p: ['souple', 'plat', 'absorbant', 'inflammable', 'isolant_thermique', 'lourd'] },
  'oreiller':         { a: 'un',  p: ['souple', 'absorbant', 'inflammable', 'leger'] },
  'drap':             { a: 'un',  p: ['souple', 'plat', 'mince', 'absorbant', 'inflammable', 'leger'] },
};
