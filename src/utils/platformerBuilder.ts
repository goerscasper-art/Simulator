import * as THREE from 'three';

export const PLATFORMER_BASE_Y = 230;
export const TOTAL_PLATFORMER_LEVELS = 50;

export interface ObbyPlatform {
  id: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  curX: number;
  curY: number;
  curZ: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  w: number;
  d: number;
  h: number;
  color: number;
  isStart?: boolean;
  isGoal?: boolean;
  moveType: 'none' | 'horiz_x' | 'horiz_z' | 'vert_y';
  moveAmp: number;
  moveSpeed: number;
  movePhase: number;
  mesh: THREE.Mesh;
}

export interface ObbyHazard {
  kind: 'laser_static' | 'laser_moving' | 'laser_spinner' | 'pusher_block' | 'crusher_overhead';
  mesh: THREE.Object3D;
  baseX: number;
  baseY: number;
  baseZ: number;
  curX: number;
  curY: number;
  curZ: number;
  halfW: number;
  halfH: number;
  halfD: number;
  moveAxis: 'none' | 'x' | 'y' | 'z';
  moveAmp: number;
  moveSpeed: number;
  movePhase: number;
  spinnerRadius?: number;
  spinnerAngle?: number;
  spinnerSpeed?: number;
  laserBarMesh?: THREE.Mesh;
}

export interface ObbyNpcSpawn {
  platformId: number;
  x: number;
  y: number;
  z: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  outfitColor: string;
  maxHealth: number;
}

export interface BuiltPlatformerLevel {
  levelNum: number;
  group: THREE.Group;
  platforms: ObbyPlatform[];
  hazards: ObbyHazard[];
  npcSpawns: ObbyNpcSpawn[];
  startPos: { x: number; y: number; z: number };
  goalPlatform: ObbyPlatform;
  portalRing?: THREE.Mesh;
}

// 24 vibrant Roblox Obby colors (deterministic per platform)
const OBBY_COLORS = [
  0xff3b30, // Coral Red
  0xff9500, // Tangerine Orange
  0xffcc00, // Bright Gold
  0x34c759, // Emerald Green
  0x00c7be, // Mint Teal
  0x30b0c7, // Sky Cyan
  0x007aff, // Electric Blue
  0x5856d6, // Indigo Violet
  0xaf52de, // Vibrant Purple
  0xff2d55, // Hot Pink
  0x84cc16, // Neon Lime
  0x14b8a6, // Turquoise
  0xf97316, // Sunset Orange
  0xec4899, // Magenta Rose
  0x6366f1, // Royal Periwinkle
  0x10b981, // Jade
  0x06b6d4, // Aqua
  0xeab308, // Sunny Yellow
  0xd946ef, // Fuchsia
  0x3b82f6, // Cobalt
  0xf43f5e, // Crimson
  0x22c55e, // Kelly Green
  0xa855f7, // Amethyst
  0x0ea5e9, // Cerulean
];

const NPC_BRAWLER_OUTFITS = [
  '#dc2626',
  '#7c3aed',
  '#ea580c',
  '#0284c7',
  '#be123c',
  '#4f46e5',
  '#b91c1c',
  '#0f766e',
];

// Cached procedural 1m x 1m grid tile texture for strong 3D perspective depth cues (no circular studs)
let cachedStudTexture: THREE.CanvasTexture | null = null;
function getBaseStudTexture(): THREE.CanvasTexture {
  if (cachedStudTexture) return cachedStudTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Base neutral white so vertex/material color tints it cleanly
  ctx.fillStyle = '#f4f4f6';
  ctx.fillRect(0, 0, 128, 128);

  // Crisp outer 1m grid border for strong perspective foreshortening lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, 123, 123);

  // Subtle inner highlight bevel
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 116, 116);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedStudTexture = tex;
  return tex;
}

// Deterministic PRNG (Mulberry32) so every level 1..50 is 100% fixed and identical every time
function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getLevelWorldOrigin(levelNum: number): { x: number; y: number; z: number } {
  const clamped = Math.max(1, Math.min(TOTAL_PLATFORMER_LEVELS, levelNum));
  // Golden-angle spiral far away from the city so platformer is isolated in the void/sky and not above the city
  const angle = clamped * 2.3999632;
  const radius = 55 + ((clamped * 43) % 310);
  const x = 25000 + Math.round(Math.cos(angle) * radius);
  const z = 25000 + Math.round(Math.sin(angle) * radius);
  return { x, y: PLATFORMER_BASE_Y, z };
}

export function buildPlatformerLevel(levelNum: number): BuiltPlatformerLevel {
  const clampedLevel = Math.max(1, Math.min(TOTAL_PLATFORMER_LEVELS, levelNum));
  const rng = createSeededRng(clampedLevel * 73856093 + 19349663);
  const origin = getLevelWorldOrigin(clampedLevel);

  const group = new THREE.Group();
  const platforms: ObbyPlatform[] = [];
  const hazards: ObbyHazard[] = [];
  const npcSpawns: ObbyNpcSpawn[] = [];

  // Shared materials for hazards
  const laserMat = new THREE.MeshBasicMaterial({ color: 0xff1133 });
  const laserGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff4d6d,
    transparent: true,
    opacity: 0.42,
  });
  const emitterMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.75,
  });
  const pusherMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.35,
  });
  const crusherMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.35,
    metalness: 0.4,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.4,
  });
  const edgeLineMat = new THREE.LineBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.65,
  });

  // Difficulty & length scaling from Level 1 to Level 50
  const difficultyRatio = (clampedLevel - 1) / (TOTAL_PLATFORMER_LEVELS - 1); // 0.0 -> 1.0
  const numIntermediatePlatforms = Math.round(10 + difficultyRatio * 28); // 10 platforms on Lv1 -> 38 on Lv50 (plus start & goal = 12..40)

  // Determine which platform indices host Fist-Fighting NPCs (only past level 25: levels 26..50)
  const npcPlatformIndices = new Set<number>();
  if (clampedLevel > 25) {
    const npcPastRatio = (clampedLevel - 26) / 24; // 0.0 at Lv26 -> 1.0 at Lv50
    const targetNpcCount =
      clampedLevel <= 30 ? 1 : clampedLevel <= 37 ? 2 : clampedLevel <= 44 ? 3 : 4;
    const usableSpan = Math.max(4, numIntermediatePlatforms - 3);
    for (let k = 0; k < targetNpcCount; k++) {
      const pIdx = Math.max(
        2,
        Math.min(
          numIntermediatePlatforms - 1,
          Math.floor(2 + ((k + 0.5) / targetNpcCount) * usableSpan)
        )
      );
      npcPlatformIndices.add(pIdx);
    }
    // In levels 47-50, add an extra brawler on one of the combat platforms
    if (npcPastRatio > 0.85 && numIntermediatePlatforms >= 12) {
      npcPlatformIndices.add(Math.floor(numIntermediatePlatforms * 0.5));
    }
  }

  let lastColorIdx = (clampedLevel * 5) % OBBY_COLORS.length;
  const pickNextColor = (): number => {
    const step = 1 + Math.floor(rng() * (OBBY_COLORS.length - 2));
    lastColorIdx = (lastColorIdx + step) % OBBY_COLORS.length;
    return OBBY_COLORS[lastColorIdx];
  };

  const baseStudTex = getBaseStudTexture();

  // Helper to add a platform with 3D grid, dark 3D bevel base, and crisp edge outlines for maximum depth perception
  const createPlatform = (
    id: number,
    cx: number,
    topY: number,
    cz: number,
    w: number,
    d: number,
    h: number,
    color: number,
    opts?: {
      isStart?: boolean;
      isGoal?: boolean;
      moveType?: 'none' | 'horiz_x' | 'horiz_z' | 'vert_y';
      moveAmp?: number;
      moveSpeed?: number;
      movePhase?: number;
    }
  ): ObbyPlatform => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const sideMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.82),
      roughness: 0.4,
      metalness: 0.08,
    });
    const mesh = new THREE.Mesh(geo, sideMat);
    mesh.position.set(cx, topY - h * 0.5, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Textured 1m grid top surface cap for strong perspective foreshortening and scale cues
    const topTex = baseStudTex.clone();
    topTex.needsUpdate = true;
    topTex.repeat.set(Math.max(1, Math.round(w)), Math.max(1, Math.round(d)));
    const topCapMat = new THREE.MeshStandardMaterial({
      color,
      map: topTex,
      roughness: 0.34,
      metalness: 0.06,
    });
    const topCapMesh = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, d - 0.06), topCapMat);
    topCapMesh.rotation.x = -Math.PI / 2;
    topCapMesh.position.set(0, h * 0.5 + 0.005, 0);
    topCapMesh.receiveShadow = true;
    mesh.add(topCapMesh);

    // Darker 3D stepped underside slab so every platform has clear 3D thickness and volume in the sky
    const underGeo = new THREE.BoxGeometry(w * 0.94, h * 0.42, d * 0.94);
    const underMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.45),
      roughness: 0.6,
      metalness: 0.1,
    });
    const underMesh = new THREE.Mesh(underGeo, underMat);
    underMesh.position.set(0, -h * 0.5 - h * 0.18, 0);
    underMesh.castShadow = true;
    underMesh.receiveShadow = true;
    mesh.add(underMesh);

    // Crisp dark 3D wireframe edge outline so platform corners and borders pop clearly against any background
    const edgesGeo = new THREE.EdgesGeometry(geo);
    const edgeLines = new THREE.LineSegments(edgesGeo, edgeLineMat);
    mesh.add(edgeLines);

    group.add(mesh);

    const plat: ObbyPlatform = {
      id,
      baseX: cx,
      baseY: topY,
      baseZ: cz,
      curX: cx,
      curY: topY,
      curZ: cz,
      prevX: cx,
      prevY: topY,
      prevZ: cz,
      w,
      d,
      h,
      color,
      isStart: opts?.isStart,
      isGoal: opts?.isGoal,
      moveType: opts?.moveType || 'none',
      moveAmp: opts?.moveAmp || 0,
      moveSpeed: opts?.moveSpeed || 0,
      movePhase: opts?.movePhase || 0,
      mesh,
    };
    platforms.push(plat);
    return plat;
  };

  // Helper to add a static or moving laser beam across a platform (along X axis) with grounded posts
  const addCrossLaser = (
    cx: number,
    laserY: number,
    cz: number,
    width: number,
    moveAxis: 'none' | 'y' | 'z' = 'none',
    moveAmp: number = 0,
    moveSpeed: number = 0,
    movePhase: number = 0,
    platTopY?: number
  ) => {
    const floorY = platTopY !== undefined ? platTopY : laserY - 0.58;
    const dropDist = Math.max(0.2, laserY - floorY);

    const holder = new THREE.Group();
    holder.position.set(cx, laserY, cz);

    const coreGeo = new THREE.CylinderGeometry(0.065, 0.065, width, 10);
    coreGeo.rotateZ(Math.PI / 2);
    const coreMesh = new THREE.Mesh(coreGeo, laserMat);
    holder.add(coreMesh);

    const glowGeo = new THREE.CylinderGeometry(0.14, 0.14, width, 10);
    glowGeo.rotateZ(Math.PI / 2);
    const glowMesh = new THREE.Mesh(glowGeo, laserGlowMat);
    holder.add(glowMesh);

    if (moveAxis !== 'y') {
      // Grounded emitter posts reaching down to the platform floor
      const postH = dropDist + 0.18;
      const postGeo = new THREE.BoxGeometry(0.24, postH, 0.24);
      const postL = new THREE.Mesh(postGeo, emitterMat);
      postL.position.set(-width * 0.5, -dropDist * 0.5 + 0.06, 0);
      postL.castShadow = true;
      const postR = new THREE.Mesh(postGeo, emitterMat);
      postR.position.set(width * 0.5, -dropDist * 0.5 + 0.06, 0);
      postR.castShadow = true;
      holder.add(postL, postR);
    } else {
      const postGeo = new THREE.BoxGeometry(0.24, 0.28, 0.24);
      const postL = new THREE.Mesh(postGeo, emitterMat);
      postL.position.set(-width * 0.5, 0, 0);
      const postR = new THREE.Mesh(postGeo, emitterMat);
      postR.position.set(width * 0.5, 0, 0);
      holder.add(postL, postR);
    }

    group.add(holder);

    hazards.push({
      kind: moveAxis === 'none' ? 'laser_static' : 'laser_moving',
      mesh: holder,
      baseX: cx,
      baseY: laserY,
      baseZ: cz,
      curX: cx,
      curY: laserY,
      curZ: cz,
      halfW: width * 0.5,
      halfH: 0.07,
      halfD: 0.1,
      moveAxis,
      moveAmp,
      moveSpeed,
      movePhase,
    });
  };

  // Helper to add a rotating laser spinner hub in the center of a platform
  const addLaserSpinner = (cx: number, topY: number, cz: number, radius: number, speed: number, initAngle: number) => {
    const hubGroup = new THREE.Group();
    const beamY = topY + 0.52;
    hubGroup.position.set(cx, beamY, cz);

    const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.75, 12), emitterMat);
    hubMesh.position.set(0, -0.15, 0);
    hubMesh.castShadow = true;
    hubMesh.receiveShadow = true;
    hubGroup.add(hubMesh);

    const barGroup = new THREE.Group();
    const coreGeo = new THREE.CylinderGeometry(0.07, 0.07, radius * 2, 10);
    coreGeo.rotateX(Math.PI / 2);
    const coreMesh = new THREE.Mesh(coreGeo, laserMat);
    barGroup.add(coreMesh);

    const glowGeo = new THREE.CylinderGeometry(0.15, 0.15, radius * 2, 10);
    glowGeo.rotateX(Math.PI / 2);
    const glowMesh = new THREE.Mesh(glowGeo, laserGlowMat);
    barGroup.add(glowMesh);

    barGroup.rotation.y = initAngle;
    hubGroup.add(barGroup);
    group.add(hubGroup);

    hazards.push({
      kind: 'laser_spinner',
      mesh: hubGroup,
      baseX: cx,
      baseY: beamY,
      baseZ: cz,
      curX: cx,
      curY: beamY,
      curZ: cz,
      halfW: radius,
      halfH: 0.06,
      halfD: radius,
      moveAxis: 'none',
      moveAmp: 0,
      moveSpeed: 0,
      movePhase: 0,
      spinnerRadius: radius,
      spinnerAngle: initAngle,
      spinnerSpeed: speed,
      laserBarMesh: barGroup as unknown as THREE.Mesh,
    });
  };

  // Helper to add a sliding pusher obstacle block
  const addSlidingPusher = (cx: number, topY: number, cz: number, ampX: number, speed: number, phase: number) => {
    const bw = 1.15;
    const bh = 1.35;
    const bd = 1.15;
    const geo = new THREE.BoxGeometry(bw, bh, bd);
    const mesh = new THREE.Mesh(geo, pusherMat);
    const by = topY + bh * 0.5 + 0.05;
    mesh.position.set(cx, by, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat));

    group.add(mesh);

    hazards.push({
      kind: 'pusher_block',
      mesh,
      baseX: cx,
      baseY: by,
      baseZ: cz,
      curX: cx,
      curY: by,
      curZ: cz,
      halfW: bw * 0.5,
      halfH: bh * 0.5,
      halfD: bd * 0.5,
      moveAxis: 'x',
      moveAmp: ampX,
      moveSpeed: speed,
      movePhase: phase,
    });
  };

  // Helper to add a vertical oscillating overhead crusher gate with side pillars
  const addOverheadCrusher = (cx: number, topY: number, cz: number, width: number, speed: number, phase: number) => {
    const bw = width;
    const bh = 0.9;
    const bd = 1.2;
    const geo = new THREE.BoxGeometry(bw, bh, bd);
    const mesh = new THREE.Mesh(geo, crusherMat);
    const midY = topY + 1.95;
    mesh.position.set(cx, midY, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeLineMat));
    group.add(mesh);

    // Side frame pillars
    const pillarH = 3.4;
    const pillarGeo = new THREE.BoxGeometry(0.22, pillarH, 0.28);
    const pillarL = new THREE.Mesh(pillarGeo, emitterMat);
    pillarL.position.set(cx - bw * 0.5 - 0.12, topY + pillarH * 0.5, cz);
    pillarL.castShadow = true;
    const pillarR = new THREE.Mesh(pillarGeo, emitterMat);
    pillarR.position.set(cx + bw * 0.5 + 0.12, topY + pillarH * 0.5, cz);
    pillarR.castShadow = true;
    group.add(pillarL, pillarR);

    hazards.push({
      kind: 'crusher_overhead',
      mesh,
      baseX: cx,
      baseY: midY,
      baseZ: cz,
      curX: cx,
      curY: midY,
      curZ: cz,
      halfW: bw * 0.5,
      halfH: bh * 0.5,
      halfD: bd * 0.5,
      moveAxis: 'y',
      moveAmp: 1.25,
      moveSpeed: speed,
      movePhase: phase,
    });
  };

  // 1. Build Start Platform
  const startPlat = createPlatform(0, origin.x, origin.y, origin.z, 5.4, 5.4, 0.9, pickNextColor(), {
    isStart: true,
  });

  let curX = startPlat.baseX;
  let curY = startPlat.baseY;
  let curZ = startPlat.baseZ;
  let prevW = startPlat.w;
  let prevD = startPlat.d;
  let prevWasMoving = false;

  // 2. Build Intermediate Platforms (1 .. numIntermediatePlatforms)
  for (let i = 1; i <= numIntermediatePlatforms; i++) {
    const isNpcCombatPlat = npcPlatformIndices.has(i);
    const patternRoll = rng();

    // Choose platform archetype
    let platW = 3.8 - difficultyRatio * 0.85 + (rng() - 0.5) * 0.5;
    let platD = 4.2 - difficultyRatio * 0.65 + (rng() - 0.5) * 0.6;
    let segKind: 'jump_pad' | 'laser_bridge' | 'spinner_deck' | 'moving_pad' | 'pusher_walkway' | 'crusher_deck' | 'npc_arena' =
      'jump_pad';

    if (isNpcCombatPlat) {
      segKind = 'npc_arena';
      platW = 5.4;
      platD = 6.6;
    } else if (!prevWasMoving && patternRoll < 0.18 + difficultyRatio * 0.08) {
      segKind = 'moving_pad';
      platW = Math.max(3.1, platW);
      platD = Math.max(3.4, platD);
    } else if (patternRoll < 0.42) {
      segKind = 'laser_bridge';
      platW = Math.max(2.3, 3.3 - difficultyRatio * 0.7);
      platD = 6.2 + rng() * 1.8;
    } else if (patternRoll < 0.60) {
      segKind = 'spinner_deck';
      platW = Math.max(3.8, 4.5 - difficultyRatio * 0.4);
      platD = Math.max(4.4, 5.0 - difficultyRatio * 0.4);
    } else if (patternRoll < 0.76) {
      segKind = 'pusher_walkway';
      platW = Math.max(2.2, 3.0 - difficultyRatio * 0.55);
      platD = 6.0 + rng() * 1.4;
    } else if (patternRoll < 0.88) {
      segKind = 'crusher_deck';
      platW = Math.max(2.6, 3.4 - difficultyRatio * 0.5);
      platD = 5.4 + rng() * 1.2;
    } else {
      segKind = 'jump_pad';
      platW = Math.max(2.4, 3.4 - difficultyRatio * 0.75);
      platD = Math.max(2.5, 3.4 - difficultyRatio * 0.75);
    }

    // Calculate challenging but 100% possible jump gap & elevation step
    const dy =
      segKind === 'moving_pad' || prevWasMoving
        ? (rng() - 0.48) * 0.6
        : -0.65 + rng() * 1.65; // -0.65m to +1.0m vertical step

    // Max safe edge-to-edge jump gap depends on whether we are jumping upward
    const minEdgeGap = 3.0 + difficultyRatio * 0.55;
    const maxEdgeGap = dy > 0.45 ? 3.9 + difficultyRatio * 0.35 : 4.1 + difficultyRatio * 0.65;
    const edgeGapZ =
      segKind === 'moving_pad' || prevWasMoving
        ? 2.8 + rng() * 0.7
        : minEdgeGap + rng() * (maxEdgeGap - minEdgeGap);

    // Lateral zig-zag offset (kept small enough that total diagonal gap is within maxEdgeGap)
    const maxLatShift = segKind === 'moving_pad' || prevWasMoving ? 0.8 : 1.75;
    const lateralShift = (rng() - 0.5) * 2.0 * maxLatShift;

    const nextZ = curZ + prevD * 0.5 + edgeGapZ + platD * 0.5;
    const nextX = curX + lateralShift;
    const nextY = Math.max(PLATFORMER_BASE_Y - 8, curY + dy);

    let moveType: 'none' | 'horiz_x' | 'horiz_z' | 'vert_y' = 'none';
    let moveAmp = 0;
    let moveSpeed = 0;
    let movePhase = rng() * Math.PI * 2;

    if (segKind === 'moving_pad') {
      const mRoll = rng();
      if (mRoll < 0.55) {
        moveType = 'horiz_x';
        moveAmp = 1.6 + difficultyRatio * 1.1;
      } else {
        moveType = 'vert_y';
        moveAmp = 0.85 + difficultyRatio * 0.45;
      }
      moveSpeed = 1.45 + difficultyRatio * 0.95;
    }

    const pColor = pickNextColor();
    const plat = createPlatform(i, nextX, nextY, nextZ, platW, platD, 0.8, pColor, {
      moveType,
      moveAmp,
      moveSpeed,
      movePhase,
    });

    // Populate platform obstacles / NPCs
    if (segKind === 'npc_arena') {
      // Spawn 1 (or 2 in very high levels) fist-fighting brawler NPCs on this platform!
      const extraNpc = clampedLevel >= 44 && rng() < 0.45 ? 2 : 1;
      for (let nIdx = 0; nIdx < extraNpc; nIdx++) {
        const zOff = extraNpc === 1 ? 0.6 : nIdx === 0 ? -0.9 : 1.2;
        npcSpawns.push({
          platformId: plat.id,
          x: nextX + (nIdx === 0 ? -0.35 : 0.35),
          y: nextY,
          z: nextZ + zOff,
          minX: nextX - platW * 0.5 + 0.48,
          maxX: nextX + platW * 0.5 - 0.48,
          minZ: nextZ - platD * 0.5 + 0.48,
          maxZ: nextZ + platD * 0.5 - 0.48,
          outfitColor: NPC_BRAWLER_OUTFITS[(clampedLevel + i + nIdx) % NPC_BRAWLER_OUTFITS.length],
          maxHealth: 500,
        });
      }
    } else if (segKind === 'laser_bridge') {
      // Place 1 or 2 laser hurdles across the bridge (leaving front & back landing margins clear)
      const numLasers = platD >= 6.8 && rng() < 0.55 + difficultyRatio * 0.35 ? 2 : 1;
      if (numLasers === 1) {
        const isMovingLaser = rng() < 0.45 + difficultyRatio * 0.35;
        addCrossLaser(
          nextX,
          nextY + 0.58 + rng() * 0.25,
          nextZ,
          platW + 0.1,
          isMovingLaser ? 'z' : 'none',
          isMovingLaser ? platD * 0.26 : 0,
          1.8 + difficultyRatio * 1.3,
          rng() * Math.PI * 2,
          nextY
        );
      } else {
        addCrossLaser(nextX, nextY + 0.58, nextZ - platD * 0.2, platW + 0.1, 'none', 0, 0, 0, nextY);
        addCrossLaser(
          nextX,
          nextY + 0.62,
          nextZ + platD * 0.2,
          platW + 0.1,
          rng() < 0.5 ? 'y' : 'none',
          0.35,
          2.2 + difficultyRatio * 1.1,
          rng() * Math.PI * 2,
          nextY
        );
      }
    } else if (segKind === 'spinner_deck') {
      const spinSpd = (1.55 + difficultyRatio * 1.35) * (rng() < 0.5 ? 1 : -1);
      addLaserSpinner(
        nextX,
        nextY,
        nextZ,
        Math.min(platW, platD) * 0.48,
        spinSpd,
        rng() * Math.PI * 2
      );
    } else if (segKind === 'pusher_walkway') {
      const pushCount = platD >= 6.6 && difficultyRatio > 0.35 ? 2 : 1;
      for (let p = 0; p < pushCount; p++) {
        const zOff = pushCount === 1 ? 0 : p === 0 ? -platD * 0.2 : platD * 0.2;
        addSlidingPusher(
          nextX,
          nextY,
          nextZ + zOff,
          platW * 0.42,
          2.1 + difficultyRatio * 1.4,
          rng() * Math.PI * 2 + p * Math.PI
        );
      }
    } else if (segKind === 'crusher_deck') {
      addOverheadCrusher(
        nextX,
        nextY,
        nextZ,
        platW * 0.92,
        2.3 + difficultyRatio * 1.3,
        rng() * Math.PI * 2
      );
      if (difficultyRatio > 0.3 && rng() < 0.5) {
        addCrossLaser(nextX, nextY + 0.52, nextZ + platD * 0.22, platW + 0.1, 'none', 0, 0, 0, nextY);
      }
    } else if (segKind === 'jump_pad' && platD >= 3.0 && rng() < 0.45 + difficultyRatio * 0.3) {
      // Single laser hurdle across the jump pad
      addCrossLaser(nextX, nextY + 0.55, nextZ, platW + 0.1, 'none', 0, 0, 0, nextY);
    }

    curX = nextX;
    curY = nextY;
    curZ = nextZ;
    prevW = platW;
    prevD = platD;
    prevWasMoving = segKind === 'moving_pad';
  }

  // 3. Build Goal / Finish Platform with Glowing Teleport Portal
  const goalZ = curZ + prevD * 0.5 + 3.4 + 3.0;
  const goalY = curY + 0.3;
  const goalPlat = createPlatform(
    numIntermediatePlatforms + 1,
    curX,
    goalY,
    goalZ,
    6.0,
    6.0,
    1.0,
    0x10b981,
    { isGoal: true }
  );

  // Add glowing gold finish pad & portal arch on the Goal Platform
  const padMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 2.05, 0.18, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.65,
      roughness: 0.2,
      metalness: 0.5,
    })
  );
  padMesh.position.set(goalPlat.baseX, goalPlat.baseY + 0.09, goalPlat.baseZ);
  group.add(padMesh);

  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.65, 0.14, 12, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  portalRing.position.set(goalPlat.baseX, goalPlat.baseY + 1.85, goalPlat.baseZ);
  group.add(portalRing);

  return {
    levelNum: clampedLevel,
    group,
    platforms,
    hazards,
    npcSpawns,
    startPos: {
      x: startPlat.baseX,
      y: startPlat.baseY,
      z: startPlat.baseZ,
    },
    goalPlatform: goalPlat,
    portalRing,
  };
}
