// player.js — Contrôleur FPS : ZQSD (clavier AZERTY), souris, saut, gravité, collisions.

import * as THREE from 'three';
import { colliders } from './world.js';
import { sfxFootstep, sfxJump, sfxLand } from './audio.js';

const EYE = 1.62;          // hauteur des yeux
const HEIGHT = 1.75;       // taille du sujet 23
const RADIUS = 0.32;       // rayon de collision
const SPEED = 3.6;         // m/s marche
const RUN = 5.6;           // m/s course (Shift)
const JUMP_V = 4.6;
const GRAVITY = 12.5;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.position = new THREE.Vector3(0, 0, 0.9); // pieds, dans la cellule
    this.lastSafe = this.position.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = Math.PI;      // regarde le mur du fond au réveil
    this.pitch = 0;
    this.onGround = true;
    this.keys = {};
    this.enabled = false;    // verrouillé tant que les liens ne sont pas coupés
    this.locked = false;     // pointer lock actif
    this.bob = 0;
    this.stepTimer = 0;
    this._wasAirborne = false;

    // ZQSD par position physique (e.code) : sur un clavier AZERTY,
    // Z-Q-S-D occupent les codes KeyW-KeyA-KeyS-KeyD. Les flèches marchent aussi.
    document.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
    document.addEventListener('pointerlockerror', () => this.enableFallback());

    this.syncCamera();
  }

  requestLock() {
    let p;
    try {
      p = this.dom.requestPointerLock({ unadjustedMovement: true });
    } catch (_) { /* API sans options */ }
    // Firefox renvoie undefined, Chrome une Promise qui peut rejeter
    if (p && p.catch) p.catch(() => { try { this.dom.requestPointerLock(); } catch (_) {} });
    setTimeout(() => { if (!this.locked) this.enableFallback(); }, 900);
  }

  /** Mode compatibilité : pointer lock indisponible (iframe, mobile…) →
   *  on regarde en faisant glisser la souris, le jeu reste jouable. */
  enableFallback() {
    if (this.fallback) return;
    this.fallback = true;
    if (window.NOVA) window.NOVA.debug = true;
    let drag = false;
    this.dom.addEventListener('mousedown', () => { drag = true; });
    window.addEventListener('mouseup', () => { drag = false; });
    window.addEventListener('mousemove', (e) => {
      if (!drag || this.locked) return;
      this.yaw -= e.movementX * 0.0028;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - e.movementY * 0.0028));
    });
  }

  get forwardDir() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt) {
    if (!this.locked && !(window.NOVA && window.NOVA.debug)) { this.syncCamera(); return; }

    const fwd = this.forwardDir;
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3();

    if (this.enabled) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) move.add(fwd);
      if (this.keys['KeyS'] || this.keys['ArrowDown']) move.sub(fwd);
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.sub(right);
      if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);
    }

    const running = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = running ? RUN : SPEED;
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

    // saut + gravité
    if (this.enabled && this.keys['Space'] && this.onGround) {
      this.velocity.y = JUMP_V;
      this.onGround = false;
      sfxJump();
    }
    this.velocity.y -= GRAVITY * dt;

    // déplacement axe par axe avec résolution de collision
    this.moveAxis('x', move.x * dt);
    this.moveAxis('z', move.z * dt);
    this.moveAxis('y', this.velocity.y * dt);

    // filet de sécurité : le complexe tient dans ces limites. Si le joueur en
    // sort malgré tout, on le ramène à sa dernière position valide plutôt que
    // de le laisser flotter hors du décor.
    const p = this.position;
    if (p.x < -8.5 || p.x > 8.5 || p.z > 3.5 || p.z < -62 || p.y < -1 || p.y > 7) {
      p.copy(this.lastSafe);
      this.velocity.set(0, 0, 0);
    } else if (this.onGround) {
      this.lastSafe.copy(p);
    }

    // sol
    if (this.position.y <= 0) {
      this.position.y = 0;
      if (this._wasAirborne) sfxLand();
      this.velocity.y = 0;
      this.onGround = true;
      this._wasAirborne = false;
    } else if (!this.onGround) {
      this._wasAirborne = true;
    }

    // head-bob + bruits de pas
    const moving = move.lengthSq() > 0 && this.onGround;
    if (moving) {
      this.bob += dt * (running ? 11 : 8);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        sfxFootstep();
        this.stepTimer = running ? 0.32 : 0.46;
      }
    } else {
      this.bob *= 0.9;
      this.stepTimer = 0.1;
    }

    this.syncCamera();
  }

  /** Déplace le joueur sur UN SEUL axe et résout les collisions sur ce même axe.
   *  Le joueur est toujours repoussé du côté d'où il vient : jamais à travers
   *  l'obstacle. Les déplacements infimes sont ignorés — sans ce seuil, un
   *  résidu de virgule flottante (Math.sin(Math.PI) ≈ 1.2e-16) suffisait à
   *  déclencher une correction latérale et à éjecter le joueur hors du décor. */
  moveAxis(axis, amount) {
    if (!Number.isFinite(amount) || Math.abs(amount) < 1e-6) return;

    const feetBefore = this.position.y;
    this.position[axis] += amount;
    const pbox = this.bbox();

    for (const c of colliders) {
      if (!pbox.intersectsBox(c)) continue;

      if (axis === 'y') {
        if (amount < 0) {
          // on ne se pose que sur une surface qui était sous nos pieds
          if (c.max.y > feetBefore + 0.02) continue;
          this.position.y = c.max.y + 0.002;
          this.velocity.y = 0;
          this.onGround = true;
        } else {
          this.position.y = c.min.y - HEIGHT - 0.002;
          this.velocity.y = 0;
        }
      } else if (amount > 0) {
        this.position[axis] = c.min[axis] - RADIUS - 0.002;
      } else {
        this.position[axis] = c.max[axis] + RADIUS + 0.002;
      }

      pbox.copy(this.bbox());
    }
  }

  bbox() {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.position.x, this.position.y + HEIGHT / 2, this.position.z),
      new THREE.Vector3(RADIUS * 2, HEIGHT, RADIUS * 2)
    );
  }

  syncCamera() {
    const bobY = Math.sin(this.bob) * 0.035;
    const bobX = Math.cos(this.bob * 0.5) * 0.02;
    this.camera.position.set(
      this.position.x + bobX,
      this.position.y + EYE + bobY,
      this.position.z
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  /** Repousse le joueur (feu, laser, vapeur, chien) */
  pushBack(strength = 3) {
    const back = this.forwardDir.multiplyScalar(-strength);
    this.moveAxis('x', back.x * 0.1);
    this.moveAxis('z', back.z * 0.1);
  }
}
