// Appareils électroniques, informatique, supports numériques.
//
// Distinction structurante pour les énigmes de piratage :
//   `electronique`  — contient un circuit (une télécommande en a un)
//   `communicant`   — peut échanger des données (une télécommande aussi)
//   `programmable`  — peut exécuter des instructions qu'on lui fournit
//
// Seul `programmable` ouvre le piratage profond. Sans cette distinction, une
// simple télécommande ouvrirait les portes blindées et l'énigme s'effondrerait.

export const ELECTRONIQUE = {
  'téléphone':          { a: 'un',  p: ['plat', 'rigide', 'electronique', 'alimente', 'communicant', 'programmable', 'emet_lumiere', 'emet_son', 'porte_texte', 'reflechissant', 'tenable_une_main'], syn: ['smartphone', 'portable', 'mobile'] },
  'ordinateur portable': { a: 'un', p: ['plat', 'rigide', 'electronique', 'alimente', 'communicant', 'programmable', 'emet_lumiere', 'emet_son', 'porte_texte', 'lourd'], syn: ['laptop', 'pc portable'] },
  'tablette':           { a: 'une', p: ['plat', 'rigide', 'electronique', 'alimente', 'communicant', 'programmable', 'emet_lumiere', 'emet_son', 'porte_texte', 'reflechissant', 'tenable_une_main'] },
  'ordinateur':         { a: 'un',  p: ['rigide', 'electronique', 'communicant', 'programmable', 'lourd', 'emet_son'], syn: ['tour', 'unité centrale'] },
  'écran':              { a: 'un',  p: ['plat', 'rigide', 'electronique', 'emet_lumiere', 'porte_texte', 'reflechissant', 'cassant'], syn: ['moniteur', 'télévision', 'télé'] },
  'clavier':            { a: 'un',  p: ['plat', 'rigide', 'electronique', 'communicant', 'porte_texte', 'leger'] },
  'souris':             { a: 'une', p: ['rigide', 'electronique', 'communicant', 'emet_lumiere', 'leger', 'tenable_une_main'] },
  'clé usb':            { a: 'une', p: ['rigide', 'mince', 'allonge', 'electronique', 'communicant', 'porte_texte', 'leger', 'tenable_une_main'] },
  'disque dur externe': { a: 'un',  p: ['rigide', 'plat', 'electronique', 'communicant', 'magnetique', 'porte_texte', 'tenable_une_main'] },
  'carte mémoire':      { a: 'une', p: ['plat', 'mince', 'rigide', 'electronique', 'communicant', 'porte_texte', 'leger'], syn: ['carte sd'] },
  'carte à puce':       { a: 'une', p: ['plat', 'mince', 'rigide', 'electronique', 'communicant', 'porte_texte', 'leger', 'tenable_une_main'] },
  'badge d\'accès':     { a: 'un',  p: ['plat', 'mince', 'rigide', 'electronique', 'communicant', 'magnetique', 'porte_texte', 'leger', 'tenable_une_main'] },
  'carte bancaire':     { a: 'une', p: ['plat', 'mince', 'rigide', 'souple', 'magnetique', 'electronique', 'communicant', 'porte_texte', 'leger'] },
  'télécommande':       { a: 'une', p: ['rigide', 'allonge', 'electronique', 'alimente', 'communicant', 'emet_lumiere', 'porte_texte', 'leger', 'tenable_une_main'] },
  'casque audio':       { a: 'un',  p: ['rigide', 'souple', 'electronique', 'emet_son', 'magnetique', 'tenable_une_main'] },
  'écouteurs':          { a: 'des', p: ['souple', 'allonge', 'mince', 'electronique', 'emet_son', 'magnetique', 'leger'] },
  'enceinte':           { a: 'une', p: ['rigide', 'creux', 'electronique', 'alimente', 'communicant', 'emet_son', 'magnetique', 'tenable_une_main'] },
  'microphone':         { a: 'un',  p: ['rigide', 'allonge', 'electronique', 'magnetique', 'tenable_une_main'] },
  'appareil photo':     { a: 'un',  p: ['rigide', 'electronique', 'alimente', 'emet_lumiere', 'reflechissant', 'porte_texte', 'tenable_une_main'] },
  'webcam':             { a: 'une', p: ['rigide', 'electronique', 'communicant', 'emet_lumiere', 'reflechissant', 'leger', 'tenable_une_main'] },
  'routeur':            { a: 'un',  p: ['rigide', 'plat', 'electronique', 'communicant', 'programmable', 'emet_lumiere', 'porte_texte'], syn: ['box internet'] },
  'chargeur':           { a: 'un',  p: ['rigide', 'conducteur', 'porte_texte', 'leger', 'tenable_une_main'] },
  'câble usb':          { a: 'un',  p: ['souple', 'allonge', 'mince', 'conducteur', 'inflammable', 'leger'] },
  'montre connectée':   { a: 'une', p: ['rigide', 'plat', 'electronique', 'alimente', 'communicant', 'programmable', 'mesure_temps', 'emet_lumiere', 'porte_texte', 'leger', 'tenable_une_main'] },
  'montre':             { a: 'une', p: ['rigide', 'plat', 'cassant', 'mesure_temps', 'porte_texte', 'reflechissant', 'leger', 'tenable_une_main'] },
  'réveil':             { a: 'un',  p: ['rigide', 'electronique', 'alimente', 'mesure_temps', 'emet_son', 'emet_lumiere', 'porte_texte', 'tenable_une_main'] },
  'horloge':            { a: 'une', p: ['rigide', 'plat', 'mesure_temps', 'porte_texte', 'cassant'] },
  'chronomètre':        { a: 'un',  p: ['rigide', 'electronique', 'alimente', 'mesure_temps', 'emet_son', 'porte_texte', 'leger', 'tenable_une_main'] },
  'calculatrice':       { a: 'une', p: ['plat', 'rigide', 'electronique', 'alimente', 'programmable', 'porte_texte', 'leger', 'tenable_une_main'] },
  'console de jeu':     { a: 'une', p: ['rigide', 'electronique', 'alimente', 'communicant', 'programmable', 'emet_lumiere', 'emet_son', 'tenable_une_main'] },
  'manette':            { a: 'une', p: ['rigide', 'electronique', 'alimente', 'communicant', 'tenable_une_main'] },
  'talkie-walkie':      { a: 'un',  p: ['rigide', 'allonge', 'electronique', 'alimente', 'communicant', 'emet_son', 'tenable_une_main'] },
  'radio':              { a: 'une', p: ['rigide', 'electronique', 'alimente', 'communicant', 'emet_son', 'porte_texte', 'tenable_une_main'] },
  'lampe de bureau':    { a: 'une', p: ['rigide', 'allonge', 'electronique', 'emet_lumiere', 'conducteur'] },
  'ventilateur':        { a: 'un',  p: ['rigide', 'electronique', 'emet_son', 'conducteur'] },
  'imprimante':         { a: 'une', p: ['rigide', 'lourd', 'electronique', 'communicant', 'emet_son', 'porte_texte'] },
  'scanner':            { a: 'un',  p: ['plat', 'rigide', 'electronique', 'communicant', 'emet_lumiere', 'porte_texte'] },
  'multimètre':         { a: 'un',  p: ['rigide', 'electronique', 'alimente', 'conducteur', 'porte_texte', 'tenable_une_main'] },
  'carte électronique': { a: 'une', p: ['plat', 'rigide', 'mince', 'electronique', 'conducteur', 'porte_texte', 'cassant', 'leger'], syn: ['circuit imprimé'] },
  'panneau solaire':    { a: 'un',  p: ['plat', 'rigide', 'electronique', 'alimente', 'reflechissant', 'cassant'] },
  'détecteur de fumée': { a: 'un',  p: ['rigide', 'plat', 'electronique', 'alimente', 'emet_son', 'porte_texte', 'leger', 'tenable_une_main'] },
  'lecteur de badge':   { a: 'un',  p: ['plat', 'rigide', 'electronique', 'communicant', 'emet_lumiere', 'emet_son', 'magnetique'] },
};
