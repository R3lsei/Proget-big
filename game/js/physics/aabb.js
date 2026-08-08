// Boîtes englobantes alignées sur les axes.
//
// Une boîte est un objet plat de six nombres. Ce choix est délibéré : la
// physique n'a aucune raison de dépendre d'une bibliothèque de rendu, et cette
// indépendance la rend testable en millisecondes, sans navigateur ni WebGL.
//
// Voir ARCHITECTURE.md : `physics/` ne connaît jamais `rendering/`.

/** @typedef {{minX:number, minY:number, minZ:number, maxX:number, maxY:number, maxZ:number}} Aabb */

/** Construit une boîte depuis son centre et ses dimensions. */
export function depuisCentre(cx, cy, cz, largeur, hauteur, profondeur) {
  const dx = largeur / 2, dy = hauteur / 2, dz = profondeur / 2;
  return {
    minX: cx - dx, minY: cy - dy, minZ: cz - dz,
    maxX: cx + dx, maxY: cy + dy, maxZ: cz + dz,
  };
}

/**
 * Convertit une THREE.Box3 en boîte plate.
 * Seul point de contact avec le rendu, appelé à la construction du niveau —
 * jamais dans la boucle de jeu.
 */
export function depuisBox3(box3) {
  return {
    minX: box3.min.x, minY: box3.min.y, minZ: box3.min.z,
    maxX: box3.max.x, maxY: box3.max.y, maxZ: box3.max.z,
  };
}

/** Deux boîtes se chevauchent-elles ? Le contact exact ne compte pas. */
export function seChevauchent(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX
      && a.minY < b.maxY && a.maxY > b.minY
      && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/** Bornes minimale et maximale sur un axe donné ('x' | 'y' | 'z'). */
export function borneMin(boite, axe) {
  return axe === 'x' ? boite.minX : axe === 'y' ? boite.minY : boite.minZ;
}

export function borneMax(boite, axe) {
  return axe === 'x' ? boite.maxX : axe === 'y' ? boite.maxY : boite.maxZ;
}
