import * as THREE from 'three';
import { CarVehicle, MotorcycleVehicle } from '../types/housesim';

// Materials & Textures Cache for peak 60fps performance
const matCache = new Map<string, THREE.Material>();
const texCache = new Map<string, THREE.CanvasTexture>();

/**
 * Fast geometry batcher and merger to combine multiple BufferGeometries into a single geometry.
 * Reduces separate draw calls to 1.
 */
export function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const validGeos = geometries.filter((g) => g && g.attributes && g.attributes.position);
  if (validGeos.length === 0) return new THREE.BufferGeometry();
  if (validGeos.length === 1) return validGeos[0].clone();

  let totalPositions = 0;
  let totalIndices = 0;
  let hasUV = false;
  let totalUVs = 0;

  for (const g of validGeos) {
    totalPositions += g.attributes.position.array.length;
    if (g.attributes.uv) {
      hasUV = true;
      totalUVs += g.attributes.uv.array.length;
    } else {
      totalUVs += g.attributes.position.count * 2;
    }
    if (g.index) {
      totalIndices += g.index.array.length;
    } else {
      totalIndices += g.attributes.position.count;
    }
  }

  const mergedPos = new Float32Array(totalPositions);
  const mergedNorm = new Float32Array(totalPositions);
  const mergedUV = hasUV ? new Float32Array(totalUVs) : null;
  const mergedIndices = new Uint32Array(totalIndices);

  let posOffset = 0;
  let indexOffset = 0;
  let vertexOffset = 0;
  let uvOffset = 0;

  for (const g of validGeos) {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    mergedPos.set(pos.array, posOffset);
    if (norm) {
      mergedNorm.set(norm.array, posOffset);
    }

    if (mergedUV) {
      if (g.attributes.uv) {
        mergedUV.set(g.attributes.uv.array, uvOffset);
        uvOffset += g.attributes.uv.array.length;
      } else {
        uvOffset += pos.count * 2;
      }
    }

    if (g.index) {
      const idx = g.index;
      for (let i = 0; i < idx.count; i++) {
        mergedIndices[indexOffset + i] = idx.getX(i) + vertexOffset;
      }
      indexOffset += idx.count;
    } else {
      for (let i = 0; i < pos.count; i++) {
        mergedIndices[indexOffset + i] = i + vertexOffset;
      }
      indexOffset += pos.count;
    }

    vertexOffset += pos.count;
    posOffset += pos.array.length;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  if (mergedNorm.some((v) => v !== 0)) {
    merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  } else {
    merged.computeVertexNormals();
  }
  if (mergedUV) {
    merged.setAttribute('uv', new THREE.BufferAttribute(mergedUV, 2));
  }
  merged.setIndex(new THREE.BufferAttribute(mergedIndices, 1));
  return merged;
}

export function getStandardMat(
  colorHex: string,
  roughness: number = 0.45,
  metalness: number = 0.1,
  map?: THREE.Texture | null
): THREE.MeshStandardMaterial {
  const key = `${colorHex}_${roughness}_${metalness}_${map ? map.uuid : 'nomap'}`;
  if (matCache.has(key)) {
    return matCache.get(key) as THREE.MeshStandardMaterial;
  }
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness,
    metalness,
    map: map || null,
  });
  matCache.set(key, mat);
  return mat;
}

/**
 * Procedural Realistic Hardwood Plank Texture
 */
export function getWoodTexture(baseColorHex: string = '#78350f', darkColorHex: string = '#451a03'): THREE.CanvasTexture {
  const key = `wood_${baseColorHex}_${darkColorHex}_hd`;
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 512);

  // Planks Seams
  ctx.strokeStyle = darkColorHex;
  ctx.lineWidth = 3.5;
  for (let x = 128; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Realistic wood grain wave lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.lineWidth = 1.6;
  for (let y = 8; y < 512; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      const offset = Math.sin((x / 512) * Math.PI * 3 + y) * 5;
      ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }

  // Realistic wood knots
  for (let i = 0; i < 4; i++) {
    const kx = 60 + i * 115;
    const ky = 80 + (i % 2) * 220;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(kx, ky, 8, 16, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 18, 28, 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texCache.set(key, texture);
  return texture;
}

/**
 * Procedural Ultra-Realistic PBR Lawn & Grass Texture
 * Multi-layer blades, organic patches of emerald, olive, thatch, and micro-soil
 */
export function getRealisticGrassTexture(): THREE.CanvasTexture {
  const key = 'realistic_lush_grass_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base rich earth & deep turf green
  const baseGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
  baseGrad.addColorStop(0, '#143118');
  baseGrad.addColorStop(0.5, '#1b3d20');
  baseGrad.addColorStop(1, '#152d19');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Broad organic tone variations (mottled patches of lush emerald, lime, and olive)
  for (let p = 0; p < 90; p++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const pr = 45 + Math.random() * 140;
    const patchGrad = ctx.createRadialGradient(px, py, 0, px, py, pr);
    const col =
      Math.random() > 0.6
        ? 'rgba(34, 100, 48, 0.45)'
        : Math.random() > 0.3
        ? 'rgba(21, 68, 32, 0.4)'
        : 'rgba(46, 117, 56, 0.35)';
    patchGrad.addColorStop(0, col);
    patchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = patchGrad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Micro grass blades (thousands of sharp varied strokes)
  const bladeColors = [
    '#25542b',
    '#317038',
    '#3e8546',
    '#1a3d20',
    '#4e9957',
    '#214a27',
    '#62a86b',
    '#2c4021',
  ];
  for (let i = 0; i < 32000; i++) {
    const bx = Math.random() * 1024;
    const by = Math.random() * 1024;
    const len = 3 + Math.random() * 7;
    const angle = (Math.random() - 0.5) * 0.9;
    ctx.strokeStyle = bladeColors[Math.floor(Math.random() * bladeColors.length)];
    ctx.lineWidth = 1.0 + Math.random() * 0.7;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.sin(angle) * len, by - Math.cos(angle) * len);
    ctx.stroke();
  }

  // Subtle dandelion / tiny wildflower highlights
  ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
  for (let f = 0; f < 100; f++) {
    const fx = Math.random() * 1024;
    const fy = Math.random() * 1024;
    ctx.fillRect(fx, fy, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(100, 100);
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural Modern Architectural Cedar/Teak Wood Slat Facade Texture
 * High-end vertical timber battens with deep recessed shadow grooves
 */
export function getModernWoodSlatTexture(): THREE.CanvasTexture {
  const key = 'modern_wood_slats_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark shadow background for recessed grooves between vertical slats
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  // Vertical architectural cedar / teak slats
  const slatWidth = 16;
  const gap = 4;
  const step = slatWidth + gap;
  for (let x = 0; x < 512; x += step) {
    const tone = Math.random() * 18 - 9;
    const r = Math.min(255, Math.max(0, 185 + tone));
    const g = Math.min(255, Math.max(0, 115 + tone * 0.8));
    const b = Math.min(255, Math.max(0, 65 + tone * 0.5));
    ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    ctx.fillRect(x, 0, slatWidth, 512);

    // Vertical natural wood grain lines inside each slat
    for (let gIdx = 0; gIdx < 4; gIdx++) {
      const gx = x + 2 + Math.random() * (slatWidth - 4);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, 512);
      ctx.stroke();
    }

    // Right-edge inner drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(x + slatWidth - 2, 0, 2, 512);

    // Left-edge subtle highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x, 0, 1.5, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural Architectural Limestone & Off-White Stucco Texture
 * Smooth honed architectural panel reveals with subtle mineral stippling
 */
export function getLimestoneStuccoTexture(): THREE.CanvasTexture {
  const key = 'limestone_stucco_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle mineral grain
  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.08 + 0.02;
    ctx.fillStyle =
      Math.random() > 0.5
        ? `rgba(255, 255, 255, ${alpha})`
        : `rgba(100, 116, 139, ${alpha})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Architectural panel joint seams
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, 512, 512);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural Luxury Modern Driveway & Patio Pavers Texture
 * Clean scored architectural concrete slabs with bevels and dark joints
 */
export function getModernPaverTexture(): THREE.CanvasTexture {
  const key = 'modern_pavers_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep joint bed
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 4;
  const cols = 4;
  const pw = 512 / cols;
  const ph = 512 / rows;
  const joint = 3.5;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * pw + joint / 2;
      const y = r * ph + joint / 2;
      const w = pw - joint;
      const h = ph - joint;

      const shade = 105 + Math.floor(Math.random() * 25);
      ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 7})`;
      ctx.fillRect(x, y, w, h);

      // Micro aggregate stone specks
      for (let s = 0; s < 120; s++) {
        const sx = x + Math.random() * w;
        const sy = y + Math.random() * h;
        ctx.fillStyle =
          Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.2)';
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Bevel highlight top-left, shadow bottom-right
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(x, y, w, 2);
      ctx.fillRect(x, y, 2, h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.fillRect(x + w - 2, y, 2, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural Glass Mosaic Pool Tile Texture
 * Luminous turquoise & azure mosaic tiles for crystal swimming pools
 */
export function getPoolMosaicTexture(): THREE.CanvasTexture {
  const key = 'pool_mosaic_azure_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#082f49';
  ctx.fillRect(0, 0, 512, 512);

  const tiles = 16;
  const sz = 512 / tiles;
  const grout = 1.5;

  const blueShades = [
    '#0284c7',
    '#0369a1',
    '#0ea5e9',
    '#38bdf8',
    '#075985',
    '#0c4a6e',
    '#22d3ee',
  ];
  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      const color = blueShades[Math.floor(Math.random() * blueShades.length)];
      ctx.fillStyle = color;
      ctx.fillRect(c * sz + grout, r * sz + grout, sz - grout * 2, sz - grout * 2);

      // Glass tile highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(c * sz + grout, r * sz + grout, (sz - grout * 2) * 0.45, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural Animated Water Caustic & Ripple Texture
 */
export function getWaterRippleTexture(): THREE.CanvasTexture {
  const key = 'water_ripple_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.5, '#0ea5e9');
  grad.addColorStop(1, '#0369a1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft caustics / wave lines
  for (let i = 0; i < 45; i++) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2 + Math.random() * 3.5;
    ctx.beginPath();
    const sy = Math.random() * 512;
    ctx.moveTo(0, sy);
    ctx.bezierCurveTo(
      128,
      sy + Math.random() * 50 - 25,
      384,
      sy + Math.random() * 50 - 25,
      512,
      sy
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural Sun-Baked California Asphalt Road Texture
 * Detailed aggregate grain, double solid yellow highway centerlines, and white shoulder lines
 */
export function getAsphaltRoadTexture(type: 'highway' | 'street' | 'curb' = 'highway'): THREE.CanvasTexture {
  const key = `asphalt_road_${type}_hd`;
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark sun-baked asphalt base
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Surface asphalt grit & grain
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = Math.random() * 1.8 + 0.5;
    const alpha = Math.random() * 0.16 + 0.04;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha * 1.5})`;
    ctx.fillRect(x, y, s, s);
  }

  // Subtle tire tread wear lanes
  ctx.fillStyle = 'rgba(10, 12, 16, 0.25)';
  ctx.fillRect(80, 0, 95, 512);
  ctx.fillRect(337, 0, 95, 512);

  if (type === 'highway') {
    // Double solid yellow centerlines
    ctx.fillStyle = '#facc15';
    ctx.fillRect(250, 0, 4, 512);
    ctx.fillRect(258, 0, 4, 512);

    // Solid white shoulder lines
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(24, 0, 5, 512);
    ctx.fillRect(483, 0, 5, 512);
  } else if (type === 'street') {
    // Dashed center yellow line
    ctx.fillStyle = '#facc15';
    for (let y = 16; y < 512; y += 64) {
      ctx.fillRect(253, y, 6, 36);
    }
    // Solid white side borders
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(24, 0, 4, 512);
    ctx.fillRect(484, 0, 4, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural Concrete Sidewalk Slab Texture
 */
export function getSidewalkTexture(): THREE.CanvasTexture {
  const key = 'sidewalk_concrete_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9499a3';
  ctx.fillRect(0, 0, 512, 512);

  // Micro concrete grain
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.12 + 0.03;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(30, 41, 59, ${alpha})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }

  // Expansion Joint Lines
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3.5;
  for (let x = 128; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 128; y < 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural Chrome Front Radiator Grille & Headlight Bezel Texture
 * Like the classic 70s muscle car from GTA San Andreas!
 */
export function getCarGrilleTexture(): THREE.CanvasTexture {
  const key = 'car_grille_muscle_hd';
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Deep matte black radiator housing
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, 512, 128);

  // Outer chrome surround border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 506, 122);

  // Vertical chrome grille slats (like the reference car!)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3.5;
  for (let x = 110; x <= 402; x += 11) {
    ctx.beginPath();
    ctx.moveTo(x, 14);
    ctx.lineTo(x, 114);
    ctx.stroke();
  }

  // Left & Right Quad Round Headlight Clusters
  const drawHeadlight = (cx: number, cy: number, r: number) => {
    // Outer chrome ring
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Reflector dish
    const hGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    hGrad.addColorStop(0, '#ffffff');
    hGrad.addColorStop(0.4, '#fef08a');
    hGrad.addColorStop(0.85, '#ca8a04');
    hGrad.addColorStop(1, '#334155');
    ctx.fillStyle = hGrad;
    ctx.fill();

    // Glass lens concentric ridges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Left pair
  drawHeadlight(42, 64, 24);
  drawHeadlight(85, 64, 20);

  // Right pair
  drawHeadlight(470, 64, 24);
  drawHeadlight(427, 64, 20);

  // Amber turn signal indicators below headlights
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(22, 98, 78, 12);
  ctx.fillRect(412, 98, 78, 12);

  const tex = new THREE.CanvasTexture(canvas);
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural California / San Andreas Embossed Stamped License Plate
 */
export function getLicensePlateTexture(text: string = 'SIMULATOR'): THREE.CanvasTexture {
  const key = `plate_sim_${text}`;
  if (texCache.has(key)) return texCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // White reflective background with blue border
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, 246, 118);

  // State cursive header
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 18px serif';
  ctx.textAlign = 'center';
  ctx.fillText('CALIFORNIA', 128, 28);

  // Embossed plate letters: SIMULATOR
  ctx.fillStyle = '#1e3a8a';
  ctx.font = '900 38px monospace';
  ctx.fillText(text, 128, 86);

  // Corner registration decals
  ctx.fillStyle = '#eab308';
  ctx.fillRect(16, 14, 22, 14);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(218, 14, 22, 14);

  const tex = new THREE.CanvasTexture(canvas);
  texCache.set(key, tex);
  return tex;
}

/**
 * Procedural 3D Car Generator with 20 visually distinct real-world automotive designs
 * (keeping each car's catalog name and top speed intact):
 * - 'compact_hatch' : MINI Cooper S (F56) 3-door hatch with floating white roof, round halo headlamps, hood scoop & center twin exhaust
 * - 'sedan'         : BMW M3 / M340i (G80/G20) sports sedan with twin kidney grille, laser angel-eye LEDs, Hofmeister kink & quad exhausts
 * - 'wagon'         : Volvo V90 Cross Country luxury estate with Thor's Hammer LEDs, diagonal slash grille, wood trim, skid plates & roof cargo box
 * - 'aeropod'       : Lucid Air Sapphire / Tesla Model S Plaid EV liftback with full panoramic glass canopy, front micro-lens lightbar & turbine rims
 * - 'vintage_coupe' : 1964 Aston Martin DB5 Vantage classic GT with stepped-arch chrome grille, round tilted headlamps, chrome bumpers & wire wheels
 * - 'hot_hatch'     : Honda Civic Type R (FL5/FK8) rally hatch with red-emblem mesh grille, vented hood, tall dual-plane GT wing & triple center exhaust
 * - 'muscle'        : 1969 Ford Mustang Boss 429 / Challenger SRT Widebody with shaker hood scoop, quad halo lamps, window louvers & triple-bar tail lamps
 * - 'roadster'      : Porsche 718 Spyder RS open-top roadster with raised fender peaks, speedster twin streamliner humps, roll hoops & ducktail spoiler
 * - 'grand_tourer'  : Aston Martin DBS Superleggera V12 GT with wide hexagonal vane grille, carbon hood louvers, C-pillar aeroblades & quad cannons
 * - 'cybertruck'    : Tesla Cybertruck Cyberbeast with true flat-planar stainless steel triangle exoskeleton, front/rear laser bars, Gigawiper & Vault bed
 * - 'track_gt3'     : Porsche 911 GT3 RS (992) with oval 4-point matrix lamps, hood nostrils, fender louvers, towering swan-neck DRS wing & center twin exhaust
 * - 'exotic_wedge'  : Lamborghini Countach LPI 800-4 / Aventador SVJ sharp Gandini wedge with side NACA ducts, shoulder scoops, gold V12 stacks & 5-hole gold rims
 * - 'hypercar'      : Bugatti Chiron Pur Sport with chrome horseshoe grille, 8-eye quad LEDs, sweeping silver C-Line side hoop, exposed W16 & 6-pipe exhaust
 * - 'prototype_lmp' : Porsche 963 LMDh / Ferrari 499P Le Mans Hypercar with 4 towering louvered wheel-pod pontoons, bubble canopy, roof snorkel & dorsal shark fin
 * - 'streamliner'   : McLaren Speedtail elongated teardrop longtail with 3-seat central cockpit, front carbon aero wheel disc covers & active rear ailerons
 * - 'land_rocket'   : Aston Martin Valkyrie AMR Pro / ThrustSSC with elevated F1 needle nose, suspended front wing, open Venturi tunnels & twin jet turbines
 * - 'sonic_jet'     : Lamborghini Egoista stealth fighter concept with triple-prong trimaran nose, orange hexagonal fighter canopy, V-tails & purple afterburners
 * - 'quantum_apex'  : Mercedes-Benz Vision AVTR / Rimac Nevera concept with organic hourglass pods, 12 bionic dorsal aero scales & glowing violet wheel rings
 * - 'plasma_gt'     : Bugatti Bolide track-only X-hypercar with roof dual-stage scoop, X-beam laser headlights & full-width rear glowing crimson X-taillight frame
 * - 'nexus_chrono'  : Devel Sixteen / Koenigsegg Jesko Absolut 1000 MPH Hyper-Titan with twin dorsal tail fins & twin oversized ceramic-gold jet turbine nacelles
 * - 'police_cruiser': Dodge Charger Pursuit highway patrol interceptor with black & white livery, steel PIT push-bar, A-pillar spotlight & flashing LED lightbar
 */
export function buildCar3DModel(car: CarVehicle): { group: THREE.Group; wheels: THREE.Mesh[] } {
  const group = new THREE.Group();
  const darkMat = getStandardMat('#090d16', 0.4, 0.4);
  const matteBlackMat = getStandardMat('#111318', 0.72, 0.2);
  const carbonMat = getStandardMat('#18181b', 0.32, 0.65);
  const chromeMat = getStandardMat('#e2e8f0', 0.12, 0.92);
  const silverMat = getStandardMat('#cbd5e1', 0.22, 0.82);
  const goldMat = getStandardMat('#f59e0b', 0.18, 0.88);
  const woodPanelMat = getStandardMat('#78350f', 0.68, 0.08);
  const whitePaintMat = getStandardMat('#f8fafc', 0.18, 0.25);
  const redAccentMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const tailRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const amberLightMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const xenonWhiteMat = new THREE.MeshBasicMaterial({ color: 0xfefce8 });
  const ledIceWhiteMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const violetGlowMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });

  const rawStyle = car.modelStyle || 'sedan';
  const style =
    rawStyle === 'police_cruiser' || car.category === 'police' || car.id === 'car-police-cruiser'
      ? 'police_cruiser'
      : rawStyle;

  let bodyLength = 4.45;
  let bodyWidth = 1.92;
  let bodyHeight = 0.62;
  let cabinHeight = 0.56;
  let cabinLength = 2.15;
  let cabinZ = -0.15;
  let wheelRadius = 0.34;
  let wheelWidth = 0.25;
  let baseClearance = 0.2;

  // Authentic real-world model proportions
  if (style === 'compact_hatch') {
    // MINI Cooper S (F56)
    bodyLength = 3.58;
    bodyWidth = 1.76;
    bodyHeight = 0.66;
    cabinHeight = 0.58;
    cabinLength = 1.98;
    cabinZ = -0.22;
    wheelRadius = 0.31;
    wheelWidth = 0.22;
    baseClearance = 0.19;
  } else if (style === 'sedan') {
    // BMW M3 / M340i (G80/G20)
    bodyLength = 4.48;
    bodyWidth = 1.92;
    bodyHeight = 0.62;
    cabinHeight = 0.55;
    cabinLength = 2.18;
    cabinZ = -0.16;
    wheelRadius = 0.34;
    wheelWidth = 0.25;
    baseClearance = 0.2;
  } else if (style === 'wagon') {
    // Volvo V90 Cross Country Estate
    bodyLength = 4.78;
    bodyWidth = 1.94;
    bodyHeight = 0.64;
    cabinHeight = 0.58;
    cabinLength = 3.05;
    cabinZ = -0.45;
    wheelRadius = 0.36;
    wheelWidth = 0.25;
    baseClearance = 0.25;
  } else if (style === 'aeropod') {
    // Lucid Air Sapphire / Tesla Model S Plaid
    bodyLength = 4.66;
    bodyWidth = 1.98;
    bodyHeight = 0.58;
    cabinHeight = 0.52;
    cabinLength = 2.65;
    cabinZ = -0.12;
    wheelRadius = 0.35;
    wheelWidth = 0.26;
    baseClearance = 0.18;
  } else if (style === 'vintage_coupe') {
    // 1964 Aston Martin DB5 Vantage
    bodyLength = 4.52;
    bodyWidth = 1.82;
    bodyHeight = 0.58;
    cabinHeight = 0.52;
    cabinLength = 1.92;
    cabinZ = -0.32;
    wheelRadius = 0.34;
    wheelWidth = 0.22;
    baseClearance = 0.22;
  } else if (style === 'hot_hatch') {
    // Honda Civic Type R (FL5/FK8)
    bodyLength = 4.18;
    bodyWidth = 1.98;
    bodyHeight = 0.62;
    cabinHeight = 0.56;
    cabinLength = 2.25;
    cabinZ = -0.22;
    wheelRadius = 0.34;
    wheelWidth = 0.26;
    baseClearance = 0.18;
  } else if (style === 'muscle') {
    // 1969 Ford Mustang Boss 429 / Challenger Hellcat Widebody
    bodyLength = 4.76;
    bodyWidth = 2.08;
    bodyHeight = 0.64;
    cabinHeight = 0.5;
    cabinLength = 2.15;
    cabinZ = -0.32;
    wheelRadius = 0.36;
    wheelWidth = 0.29;
    baseClearance = 0.2;
  } else if (style === 'roadster') {
    // Porsche 718 Spyder RS
    bodyLength = 4.28;
    bodyWidth = 1.96;
    bodyHeight = 0.52;
    cabinHeight = 0.42;
    cabinLength = 1.65;
    cabinZ = -0.15;
    wheelRadius = 0.34;
    wheelWidth = 0.27;
    baseClearance = 0.16;
  } else if (style === 'grand_tourer') {
    // Aston Martin DBS Superleggera
    bodyLength = 4.75;
    bodyWidth = 2.04;
    bodyHeight = 0.55;
    cabinHeight = 0.48;
    cabinLength = 2.1;
    cabinZ = -0.35;
    wheelRadius = 0.35;
    wheelWidth = 0.28;
    baseClearance = 0.17;
  } else if (style === 'cybertruck') {
    // Tesla Cybertruck Cyberbeast
    bodyLength = 5.1;
    bodyWidth = 2.18;
    bodyHeight = 0.84;
    cabinHeight = 0.72;
    cabinLength = 2.55;
    cabinZ = 0.08;
    wheelRadius = 0.43;
    wheelWidth = 0.31;
    baseClearance = 0.3;
  } else if (style === 'track_gt3') {
    // Porsche 911 GT3 RS (992)
    bodyLength = 4.58;
    bodyWidth = 2.08;
    bodyHeight = 0.51;
    cabinHeight = 0.48;
    cabinLength = 1.98;
    cabinZ = -0.18;
    wheelRadius = 0.35;
    wheelWidth = 0.29;
    baseClearance = 0.15;
  } else if (style === 'exotic_wedge') {
    // Lamborghini Countach LPI 800-4 / Aventador SVJ
    bodyLength = 4.68;
    bodyWidth = 2.14;
    bodyHeight = 0.47;
    cabinHeight = 0.43;
    cabinLength = 2.05;
    cabinZ = 0.05;
    wheelRadius = 0.35;
    wheelWidth = 0.3;
    baseClearance = 0.14;
  } else if (style === 'hypercar') {
    // Bugatti Chiron Pur Sport
    bodyLength = 4.72;
    bodyWidth = 2.16;
    bodyHeight = 0.5;
    cabinHeight = 0.45;
    cabinLength = 1.98;
    cabinZ = -0.05;
    wheelRadius = 0.36;
    wheelWidth = 0.31;
    baseClearance = 0.15;
  } else if (style === 'prototype_lmp') {
    // Porsche 963 LMDh / Ferrari 499P Le Mans Hypercar
    bodyLength = 4.92;
    bodyWidth = 2.08;
    bodyHeight = 0.42;
    cabinHeight = 0.46;
    cabinLength = 1.65;
    cabinZ = 0.05;
    wheelRadius = 0.35;
    wheelWidth = 0.3;
    baseClearance = 0.12;
  } else if (style === 'streamliner') {
    // McLaren Speedtail Longtail
    bodyLength = 5.45;
    bodyWidth = 2.02;
    bodyHeight = 0.46;
    cabinHeight = 0.44;
    cabinLength = 2.15;
    cabinZ = 0.22;
    wheelRadius = 0.35;
    wheelWidth = 0.28;
    baseClearance = 0.14;
  } else if (style === 'land_rocket') {
    // Aston Martin Valkyrie AMR Pro / ThrustSSC
    bodyLength = 5.65;
    bodyWidth = 2.06;
    bodyHeight = 0.46;
    cabinHeight = 0.44;
    cabinLength = 1.65;
    cabinZ = -0.15;
    wheelRadius = 0.35;
    wheelWidth = 0.3;
    baseClearance = 0.14;
  } else if (style === 'sonic_jet') {
    // Lamborghini Egoista Stealth Fighter Car
    bodyLength = 5.55;
    bodyWidth = 2.22;
    bodyHeight = 0.48;
    cabinHeight = 0.44;
    cabinLength = 1.7;
    cabinZ = 0.05;
    wheelRadius = 0.36;
    wheelWidth = 0.31;
    baseClearance = 0.15;
  } else if (style === 'quantum_apex') {
    // Mercedes-Benz Vision AVTR / Rimac Nevera
    bodyLength = 5.25;
    bodyWidth = 2.18;
    bodyHeight = 0.48;
    cabinHeight = 0.46;
    cabinLength = 2.1;
    cabinZ = 0.0;
    wheelRadius = 0.37;
    wheelWidth = 0.3;
    baseClearance = 0.15;
  } else if (style === 'plasma_gt') {
    // Bugatti Bolide Track-Only X-Hypercar
    bodyLength = 5.4;
    bodyWidth = 2.22;
    bodyHeight = 0.44;
    cabinHeight = 0.43;
    cabinLength = 1.75;
    cabinZ = 0.05;
    wheelRadius = 0.36;
    wheelWidth = 0.32;
    baseClearance = 0.13;
  } else if (style === 'nexus_chrono') {
    // Devel Sixteen / Koenigsegg Jesko Absolut 1000 MPH Hyper-Titan
    bodyLength = 5.8;
    bodyWidth = 2.28;
    bodyHeight = 0.46;
    cabinHeight = 0.44;
    cabinLength = 1.9;
    cabinZ = 0.05;
    wheelRadius = 0.37;
    wheelWidth = 0.33;
    baseClearance = 0.14;
  } else if (style === 'sport_gt_coupe') {
    // Traditional Widebody Front-Engine 2-Door Sport Coupe (600 MPH)
    bodyLength = 4.65;
    bodyWidth = 1.98;
    bodyHeight = 0.56;
    cabinHeight = 0.5;
    cabinLength = 1.98;
    cabinZ = -0.14;
    wheelRadius = 0.35;
    wheelWidth = 0.28;
    baseClearance = 0.17;
  } else if (style === 'sport_track_sedan') {
    // Traditional Aggressive 4-Door Track Sport Sedan (760 MPH)
    bodyLength = 4.72;
    bodyWidth = 1.98;
    bodyHeight = 0.58;
    cabinHeight = 0.52;
    cabinLength = 2.18;
    cabinZ = -0.1;
    wheelRadius = 0.35;
    wheelWidth = 0.28;
    baseClearance = 0.17;
  } else if (style === 'sport_aero_fastback') {
    // Traditional Muscular Fastback Sport Coupe (895 MPH)
    bodyLength = 4.76;
    bodyWidth = 2.02;
    bodyHeight = 0.56;
    cabinHeight = 0.49;
    cabinLength = 2.02;
    cabinZ = -0.16;
    wheelRadius = 0.36;
    wheelWidth = 0.29;
    baseClearance = 0.17;
  } else if (style === 'sport_apex_coupe') {
    // Flagship Traditional Widebody GTR Track Coupe (1000 MPH)
    bodyLength = 4.82;
    bodyWidth = 2.06;
    bodyHeight = 0.54;
    cabinHeight = 0.48;
    cabinLength = 1.96;
    cabinZ = -0.12;
    wheelRadius = 0.36;
    wheelWidth = 0.3;
    baseClearance = 0.16;
  } else if (style === 'police_cruiser') {
    // Dodge Charger Pursuit Police Interceptor
    bodyLength = 4.68;
    bodyWidth = 1.98;
    bodyHeight = 0.64;
    cabinHeight = 0.55;
    cabinLength = 2.22;
    cabinZ = -0.16;
    wheelRadius = 0.35;
    wheelWidth = 0.26;
    baseClearance = 0.2;
  }

  // Primary automotive paint finish + contrasting secondary accent paint so no car is ever just one flat color
  const isStainlessCyber = style === 'cybertruck';
  const isStealthMatte = style === 'sonic_jet';
  const isExposedCarbon = style === 'hypercar';
  const carClearcoatMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(isStainlessCyber ? '#94a3b8' : car.color),
    metalness: isStainlessCyber ? 0.88 : isStealthMatte ? 0.45 : isExposedCarbon ? 0.55 : 0.62,
    roughness: isStainlessCyber ? 0.22 : isStealthMatte ? 0.42 : 0.16,
    clearcoat: isStainlessCyber || isStealthMatte ? 0.25 : 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 0.95,
  });

  const resolvedAccentHex =
    car.accentColor ||
    (style === 'compact_hatch' || style === 'muscle' || style === 'roadster'
      ? '#f8fafc'
      : style === 'hot_hatch'
      ? '#ff1f2d'
      : '#e2e8f0');
  const accentPaintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(resolvedAccentHex),
    metalness: 0.45,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 0.9,
  });

  const halfL = bodyLength * 0.5;
  const beltlineY = baseClearance + bodyHeight;
  const bodyW = Math.max(0.95, bodyWidth - 0.08);
  const chassisCenterY = baseClearance + bodyHeight * 0.5;
  const roofTopY = beltlineY + cabinHeight;

  // Crystal-clear reflective automotive laminated glass material (allows seeing interior clearly while reflecting sky)
  const realAutoGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    metalness: 0.1,
    roughness: 0.02,
    transmission: 0.68,
    transparent: true,
    opacity: 0.44,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    reflectivity: 1.0,
  });

  // Polycarbonate clear optical lens cover material for flush headlights (specular reflections without occluding internal projectors)
  const clearHeadlightCoverMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    metalness: 0.1,
    roughness: 0.02,
    transparent: true,
    opacity: 0.18,
    depthWrite: false, // Ensures glowing projector lenses, halo rings, and amber indicators are always 100% visible!
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    reflectivity: 0.95,
  });

  // Bright pure-white optical projector bulb core
  const brightBeamCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Helper to build a realistic, prominently visible multi-projector automotive headlight unit on the front fascia
  const addFlushContouredHeadlight = (
    hx: number,
    hy: number,
    hz: number,
    width: number,
    height: number,
    depth: number,
    drlMat: THREE.Material = cyanGlowMat,
    isRound: boolean = false
  ) => {
    const sideSign = Math.sign(hx) || 1;
    const hlGroup = new THREE.Group();
    // Place proud of any chassis front surface so the entire headlight unit is 100% visible and never submerged
    const frontSurfaceZ = Math.max(hz + 0.055, halfL + 0.055);
    hlGroup.position.set(hx, hy, frontSurfaceZ);
    hlGroup.rotation.y = sideSign * -0.06; // gentle contour angle that never submerges outer corners
    hlGroup.rotation.x = 0.04;

    if (isRound) {
      // Sculpted round housing bucket with chrome outer bezel ring, warm-white projector, cyan/ice halo ring & amber indicator
      const bucket = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.56, width * 0.52, depth, 24),
        darkMat
      );
      bucket.rotation.x = Math.PI / 2;
      bucket.position.z = -depth * 0.15;
      const chromeRing = new THREE.Mesh(
        new THREE.TorusGeometry(width * 0.54, 0.024, 14, 28),
        chromeMat
      );
      chromeRing.position.z = 0.018;
      const projectorBulb = new THREE.Mesh(
        new THREE.SphereGeometry(width * 0.36, 16, 16),
        xenonWhiteMat
      );
      projectorBulb.scale.set(1.0, 1.0, 0.5);
      projectorBulb.position.z = 0.014;
      const innerHotCore = new THREE.Mesh(
        new THREE.SphereGeometry(width * 0.22, 12, 12),
        brightBeamCoreMat
      );
      innerHotCore.scale.set(1.0, 1.0, 0.5);
      innerHotCore.position.z = 0.024;
      const haloRing = new THREE.Mesh(
        new THREE.TorusGeometry(width * 0.44, 0.018, 10, 24),
        drlMat
      );
      haloRing.position.z = 0.022;
      const amberTurnDot = new THREE.Mesh(
        new THREE.SphereGeometry(width * 0.14, 10, 10),
        amberLightMat
      );
      amberTurnDot.position.set(sideSign * width * 0.28, -width * 0.22, 0.022);
      const glassLens = new THREE.Mesh(
        new THREE.SphereGeometry(width * 0.52, 18, 18),
        clearHeadlightCoverMat
      );
      glassLens.scale.set(1.0, 1.0, 0.42);
      glassLens.position.z = 0.028;
      hlGroup.add(bucket, chromeRing, projectorBulb, innerHotCore, haloRing, amberTurnDot, glassLens);

    } else {
      const hHeight = Math.max(height, 0.115);
      const hWidth = Math.max(width, 0.33);
      // Outer metallic chrome frame bezel + dark gunmetal reflector housing
      const outerBezel = new THREE.Mesh(
        new THREE.BoxGeometry(hWidth * 1.06, hHeight * 1.14, depth * 0.85),
        chromeMat
      );
      outerBezel.position.z = -depth * 0.12;
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(hWidth, hHeight, depth * 0.9),
        darkMat
      );
      housing.position.z = -depth * 0.08;
      hlGroup.add(outerBezel, housing);

      // Dual Bi-Xenon / LED Optical Projector Barrels & Glowing Lenses inside the housing
      for (const pxOff of [-hWidth * 0.19, hWidth * 0.15]) {
        const projR = Math.min(hHeight * 0.38, hWidth * 0.15);
        const bezel = new THREE.Mesh(
          new THREE.CylinderGeometry(projR * 1.24, projR * 1.24, 0.036, 16),
          chromeMat
        );
        bezel.rotation.x = Math.PI / 2;
        bezel.position.set(pxOff, 0.004, 0.016);
        const lens = new THREE.Mesh(
          new THREE.SphereGeometry(projR * 1.05, 14, 14),
          xenonWhiteMat
        );
        lens.scale.set(1.0, 1.0, 0.55);
        lens.position.set(pxOff, 0.004, 0.024);
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(projR * 0.65, 10, 10),
          brightBeamCoreMat
        );
        core.scale.set(1.0, 1.0, 0.55);
        core.position.set(pxOff, 0.004, 0.032);
        hlGroup.add(bezel, lens, core);
      }

      // Crisp Ice-Cyan / White LED Daytime Running Light (DRL) Signature Lower & Upper Blades
      const drlBottom = new THREE.Mesh(
        new THREE.BoxGeometry(hWidth * 0.94, hHeight * 0.22, 0.032),
        drlMat
      );
      drlBottom.position.set(0, -hHeight * 0.38, 0.022);
      const drlTopBrow = new THREE.Mesh(
        new THREE.BoxGeometry(hWidth * 0.88, hHeight * 0.14, 0.03),
        ledIceWhiteMat
      );
      drlTopBrow.position.set(-sideSign * hWidth * 0.04, hHeight * 0.4, 0.022);
      const drlWing = new THREE.Mesh(
        new THREE.BoxGeometry(hWidth * 0.12, hHeight * 0.78, 0.032),
        drlMat
      );
      drlWing.position.set(sideSign * (hWidth * 0.38), 0, 0.022);
      hlGroup.add(drlBottom, drlTopBrow, drlWing);

      // Vivid Outer Amber Turn-Signal Corner Reflector
      const amberCorner = new THREE.Mesh(
        new THREE.BoxGeometry(hWidth * 0.13, hHeight * 0.68, 0.032),
        amberLightMat
      );
      amberCorner.position.set(sideSign * (hWidth * 0.44), 0.0, 0.02);
      hlGroup.add(amberCorner);

      // Flush Polycarbonate Clear Glass Cover Lens
      const lensCover = new THREE.Mesh(
        new THREE.BoxGeometry(hWidth * 1.04, hHeight * 1.08, 0.02),
        clearHeadlightCoverMat
      );
      lensCover.position.set(0, 0, 0.036);
      hlGroup.add(lensCover);

    }

    group.add(hlGroup);
  };

  // ============================================================================
  // 1. MODEL-SPECIFIC SCULPTED CHASSIS & BODYWORK
  // ============================================================================
  if (style === 'cybertruck') {
    // TESLA CYBERTRUCK: Authentic flat-planar angular origami triangle-roof stainless steel exoskeleton!
    const ctShape = new THREE.Shape();
    const roofPeakZ = 0.28;
    const roofPeakY = beltlineY + cabinHeight + 0.06;
    ctShape.moveTo(-halfL, baseClearance + 0.06);
    ctShape.lineTo(halfL - 0.08, baseClearance + 0.04);
    ctShape.lineTo(halfL + 0.04, beltlineY - 0.06);
    ctShape.lineTo(roofPeakZ, roofPeakY);
    ctShape.lineTo(-halfL - 0.02, beltlineY + 0.08);
    ctShape.lineTo(-halfL, baseClearance + 0.06);

    const ctWidth = bodyWidth - 0.06;
    const ctGeo = new THREE.ExtrudeGeometry(ctShape, {
      steps: 1,
      depth: ctWidth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
    ctGeo.translate(0, 0, -ctWidth * 0.5);
    ctGeo.rotateY(-Math.PI / 2);
    ctGeo.computeVertexNormals();
    const ctMesh = new THREE.Mesh(ctGeo, carClearcoatMat);
    ctMesh.castShadow = true;
    ctMesh.receiveShadow = true;
    group.add(ctMesh);

    // Contrasting dark-slate lower cladding & wheel arch trim on Cybertruck so it has multi-tone depth
    for (const sx of [-ctWidth * 0.505, ctWidth * 0.505]) {
      const sideRocker = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.11, bodyLength * 0.56),
        matteBlackMat
      );
      sideRocker.position.set(sx, baseClearance + 0.08, 0);
      group.add(sideRocker);
    }

    // Flush angled windshield panel along the front slope with realistic glass transparency
    const wsLen = Math.hypot(halfL - roofPeakZ, roofPeakY - (beltlineY - 0.06)) * 0.56;
    const wsAngle = Math.atan2(roofPeakY - (beltlineY - 0.06), halfL + 0.04 - roofPeakZ);
    const wsPane = new THREE.Mesh(new THREE.BoxGeometry(ctWidth * 0.88, 0.025, wsLen), realAutoGlassMat);
    wsPane.rotation.x = wsAngle;
    wsPane.position.set(0, (beltlineY + roofPeakY) * 0.52 + 0.015, (halfL + roofPeakZ) * 0.46);
    group.add(wsPane);

    // Iconic 4-Foot Single "Gigawiper" Blade along driver-side A-pillar
    const gigawiper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, wsLen * 0.92), matteBlackMat);
    gigawiper.rotation.x = wsAngle;
    gigawiper.position.set(-ctWidth * 0.38, wsPane.position.y + 0.02, wsPane.position.z);
    group.add(gigawiper);

    // Framed Angular Side Windows with B-Pillar divider on left & right doors
    const sideWinShape = new THREE.Shape();
    sideWinShape.moveTo(halfL * 0.42, beltlineY + 0.04);
    sideWinShape.lineTo(roofPeakZ, roofPeakY - 0.07);
    sideWinShape.lineTo(-halfL * 0.35, beltlineY + 0.16);
    sideWinShape.lineTo(-halfL * 0.35, beltlineY + 0.04);
    sideWinShape.closePath();
    const sideWinGeo = new THREE.ShapeGeometry(sideWinShape);
    for (const sx of [-ctWidth * 0.502, ctWidth * 0.502]) {
      const sWin = new THREE.Mesh(sideWinGeo, realAutoGlassMat);
      sWin.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      sWin.position.set(sx, 0, 0);
      const bPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, cabinHeight * 0.82, 0.07),
        matteBlackMat
      );
      bPillar.position.set(sx, beltlineY + cabinHeight * 0.42, roofPeakZ - 0.18);
      group.add(sWin, bPillar);
    }

    // Ribbed Dark Armored "Vault" Tonneau Bed Cover along the rear slope
    const vaultLen = Math.hypot(roofPeakZ + halfL, roofPeakY - (beltlineY + 0.08)) * 0.72;
    const vaultAngle = Math.atan2(roofPeakY - (beltlineY + 0.08), roofPeakZ - (-halfL - 0.02));
    const vaultCover = new THREE.Mesh(new THREE.BoxGeometry(ctWidth * 0.84, 0.04, vaultLen), carbonMat);
    vaultCover.rotation.x = -vaultAngle;
    vaultCover.position.set(0, (roofPeakY + beltlineY) * 0.52 + 0.02, (roofPeakZ - halfL) * 0.52);
    group.add(vaultCover);
  } else {
    // Sculpted side silhouette profile tailored to each car class
    // Note: Front and rear Z bounds are inset by bevelSize (~0.055) so the beveled nose ends cleanly at +halfL and tail at -halfL!
    const fLim = halfL - 0.045;
    const rLim = -halfL + 0.045;
    const bodyShape = new THREE.Shape();
    if (style === 'compact_hatch' || style === 'hot_hatch') {
      // Steep hatchback tail & sculpted aerodynamic nose
      bodyShape.moveTo(rLim + 0.02, baseClearance);
      bodyShape.lineTo(fLim - 0.04, baseClearance);
      bodyShape.quadraticCurveTo(fLim + 0.02, baseClearance + 0.06, fLim + 0.01, baseClearance + bodyHeight * 0.72);
      bodyShape.quadraticCurveTo(fLim - 0.04, beltlineY, cabinZ + cabinLength * 0.45, beltlineY);
      bodyShape.lineTo(rLim + 0.04, beltlineY);
      bodyShape.quadraticCurveTo(rLim - 0.01, beltlineY * 0.9, rLim + 0.02, baseClearance);
    } else if (
      style === 'muscle' ||
      style === 'vintage_coupe' ||
      style === 'grand_tourer' ||
      style === 'sport_gt_coupe' ||
      style === 'sport_aero_fastback' ||
      style === 'sport_apex_coupe'
    ) {
      // Long-hood, muscular rear haunch coupe/fastback profile
      bodyShape.moveTo(rLim + 0.02, baseClearance);
      bodyShape.lineTo(fLim - 0.03, baseClearance);
      bodyShape.lineTo(fLim + 0.01, baseClearance + bodyHeight * 0.78);
      bodyShape.quadraticCurveTo(fLim - 0.04, beltlineY + 0.03, cabinZ + cabinLength * 0.48, beltlineY);
      bodyShape.lineTo(cabinZ - cabinLength * 0.35, beltlineY);
      bodyShape.quadraticCurveTo(cabinZ - cabinLength * 0.65, beltlineY + 0.05, rLim + 0.02, beltlineY - 0.01);
      bodyShape.lineTo(rLim, baseClearance + 0.06);
      bodyShape.lineTo(rLim + 0.02, baseClearance);
    } else {
      // Refined aerodynamic sports / sedan / track profile with full-height front fascia
      bodyShape.moveTo(rLim + 0.02, baseClearance);
      bodyShape.lineTo(fLim - 0.04, baseClearance);
      bodyShape.quadraticCurveTo(fLim + 0.02, baseClearance + 0.06, fLim + 0.01, baseClearance + bodyHeight * 0.68);
      bodyShape.quadraticCurveTo(fLim - 0.03, beltlineY * 0.96, cabinZ + cabinLength * 0.48, beltlineY);
      bodyShape.lineTo(cabinZ - cabinLength * 0.48, beltlineY);
      bodyShape.quadraticCurveTo(rLim + 0.03, beltlineY * 0.97, rLim, baseClearance + bodyHeight * 0.68);
      bodyShape.quadraticCurveTo(rLim - 0.01, baseClearance + 0.06, rLim + 0.02, baseClearance);
    }

    const chassisWidth = bodyW;

    const chassisGeo = new THREE.ExtrudeGeometry(bodyShape, {
      steps: 28,
      curveSegments: 36,
      depth: chassisWidth,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.05,
      bevelSegments: 8,
    });
    chassisGeo.translate(0, 0, -chassisWidth * 0.5);
    chassisGeo.rotateY(-Math.PI / 2);

    // 3D Compound-Surface Automotive Body Sculpting (balanced proportions so front & rear bumpers support visible headlights!)
    const posAttr = chassisGeo.attributes.position;
    const halfChassisW = Math.max(0.35, chassisWidth * 0.5);
    const fAxleZ = bodyLength * 0.31;
    const rAxleZ = -bodyLength * 0.31;
    const isSportyCoupeOrSedan =
      style === 'sport_gt_coupe' ||
      style === 'sport_track_sedan' ||
      style === 'sport_aero_fastback' ||
      style === 'sport_apex_coupe';
    const isWidebody =
      style === 'muscle' ||
      style === 'track_gt3' ||
      style === 'grand_tourer' ||
      style === 'hot_hatch' ||
      isSportyCoupeOrSedan;

    for (let i = 0; i < posAttr.count; i++) {
      let vx = posAttr.getX(i);
      let vy = posAttr.getY(i);
      let vz = posAttr.getZ(i);

      const u = THREE.MathUtils.clamp(vx / halfChassisW, -1, 1);
      const absU = Math.abs(u);
      const v = THREE.MathUtils.clamp(vz / halfL, -1, 1);
      const h = THREE.MathUtils.clamp((vy - baseClearance) / Math.max(0.15, bodyHeight), 0, 1.15);

      // 1. Subtle, realistic plan-view nose curvature (keeps full front fender width so headlights sit proud on the fascia!)
      if (v > 0.55) {
        const noseT = Math.min(1, (v - 0.55) / 0.45);
        const noseNarrow = 1.0 - Math.pow(noseT, 1.8) * 0.045;
        vx *= noseNarrow;
        vz -= Math.pow(absU, 2.0) * Math.pow(noseT, 1.5) * 0.032;
      }

      // 2. Subtle rear bumper wrap-around corner curvature
      if (v < -0.55) {
        const tailT = Math.min(1, (-0.55 - v) / 0.45);
        const tailNarrow = 1.0 - Math.pow(tailT, 1.8) * 0.045;
        vx *= tailNarrow;
        vz += Math.pow(absU, 2.0) * Math.pow(tailT, 1.5) * 0.032;
      }

      // 3. Muscular 3D flared wheel fenders & sculpted "Coke-bottle" door waist
      const fArch = Math.exp(-Math.pow((vz - fAxleZ) / 0.58, 2));
      const rArch = Math.exp(-Math.pow((vz - rAxleZ) / 0.62, 2));
      const doorWaist = Math.exp(-Math.pow(vz / (bodyLength * 0.22), 2));
      const fenderBulge = (fArch * 0.065 + rArch * 0.08) * (isWidebody ? 1.24 : 1.0);
      const waistScallop = doorWaist * 0.028;
      const verticalBell = Math.sin(THREE.MathUtils.clamp(h, 0.05, 0.98) * Math.PI);

      vx += Math.sign(vx) * Math.pow(absU, 0.85) * (fenderBulge - waistScallop) * (0.45 + 0.55 * verticalBell);

      // 4. Cross-sectional door barrel curvature, lower rocker undercut & upper shoulder crease
      const barrelCurve =
        Math.sin(Math.min(1, h) * Math.PI) * 0.032 -
        Math.pow(Math.max(0, 0.22 - h) / 0.22, 2) * 0.03 -
        Math.pow(Math.max(0, h - 0.82) / 0.18, 2) * 0.024;
      vx += Math.sign(vx) * Math.pow(absU, 0.9) * barrelCurve;

      // 5. Raised 3D fender haunch peaks over wheels + subtle hood crown
      const haunchLift = Math.pow(absU, 1.55) * (fArch * 0.032 + rArch * 0.042) * Math.pow(Math.min(1, h), 1.15);
      const hoodCrown = (1.0 - absU * absU) * 0.028 * Math.max(0, (h - 0.55) / 0.45);
      vy += haunchLift + hoodCrown;

      posAttr.setXYZ(i, vx, vy, vz);
    }
    posAttr.needsUpdate = true;
    chassisGeo.computeVertexNormals();

    const chassis = new THREE.Mesh(chassisGeo, carClearcoatMat);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Multi-Tone Contrasting Side Accent Spear / Door Trim Molding + Lower Bumper Fascias & Fog Lights
    for (const sideSign of [-1, 1]) {
      const sideTrimSpear = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.034, bodyLength * 0.48),
        accentPaintMat
      );
      sideTrimSpear.position.set(
        sideSign * (bodyWidth * 0.485),
        baseClearance + bodyHeight * 0.46,
        -0.02
      );
      group.add(sideTrimSpear);
    }

    // Integrated Sculpted Front & Rear Lower Bumper Fascias, Accent Splitter Trim & Side Air Curtains
    const frontBumperFascia = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.94, bodyHeight * 0.34, 0.12),
      carClearcoatMat
    );
    frontBumperFascia.position.set(0, baseClearance + bodyHeight * 0.19, halfL - 0.02);
    const frontAirDam = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.64, bodyHeight * 0.22, 0.13),
      darkMat
    );
    frontAirDam.position.set(0, baseClearance + bodyHeight * 0.15, halfL - 0.01);
    const frontSplitterLip = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.96, 0.028, 0.16),
      carbonMat
    );
    frontSplitterLip.position.set(0, baseClearance + 0.016, halfL + 0.005);
    const frontSplitterAccent = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.965, 0.014, 0.165),
      accentPaintMat
    );
    frontSplitterAccent.position.set(0, baseClearance + 0.008, halfL + 0.008);
    group.add(frontBumperFascia, frontAirDam, frontSplitterLip, frontSplitterAccent);

    // Outer Bumper Air Curtain Intakes + Bright LED Lower Fog Light Bars beneath the headlights
    for (const sideSign of [-1, 1]) {
      const airCurtain = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW * 0.15, bodyHeight * 0.24, 0.11),
        darkMat
      );
      airCurtain.position.set(
        sideSign * (bodyW * 0.37),
        baseClearance + bodyHeight * 0.19,
        halfL
      );
      airCurtain.rotation.y = sideSign * -0.15;
      const fogLedStrip = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW * 0.13, 0.028, 0.04),
        ledIceWhiteMat
      );
      fogLedStrip.position.set(
        sideSign * (bodyW * 0.37),
        baseClearance + bodyHeight * 0.25,
        halfL + 0.042
      );
      fogLedStrip.rotation.y = sideSign * -0.15;
      group.add(airCurtain, fogLedStrip);
    }

    // Integrated Rear Lower Carbon Diffuser Valance with Contrasting Accent Trim
    const rearValance = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.92, bodyHeight * 0.3, 0.12),
      carbonMat
    );
    rearValance.position.set(0, baseClearance + bodyHeight * 0.16, -halfL + 0.02);
    const rearValanceAccent = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.93, 0.02, 0.13),
      accentPaintMat
    );
    rearValanceAccent.position.set(0, baseClearance + bodyHeight * 0.31, -halfL + 0.02);
    group.add(rearValance, rearValanceAccent);
  }

  // Flush Sculpted Side Aero Rocker Panels & Crisp Door Character Seam Lines
  const skirtMat = style === 'wagon' ? matteBlackMat : carbonMat;
  for (const sx of [-bodyWidth * 0.47, bodyWidth * 0.47]) {
    const sideSign = Math.sign(sx);
    const rockerPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.065, bodyLength * 0.54),
      skirtMat
    );
    rockerPanel.position.set(sx, baseClearance + 0.038, 0);
    const rockerBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.02, bodyLength * 0.55),
      carbonMat
    );
    rockerBlade.position.set(sx + sideSign * 0.008, baseClearance + 0.012, 0);
    group.add(rockerPanel, rockerBlade);
  }

  // ============================================================================
  // 2. REALISTIC AUTOMOTIVE GREENHOUSE, MULTI-PANE FRAMED WINDOWS & COCKPIT
  // ============================================================================
  const isSingleCentralSeat =
    style === 'prototype_lmp' || style === 'land_rocket' || style === 'sonic_jet' || style === 'plasma_gt';

  if (style === 'roadster') {
    // PORSCHE 718 SPYDER RS: Framed wrap-around speedster windshield + Twin Flying-Buttress Streamliner Humps!
    const wsWidth = bodyWidth * 0.78;
    const wsGlass = new THREE.Mesh(
      new THREE.BoxGeometry(wsWidth, 0.4, 0.024),
      realAutoGlassMat
    );
    wsGlass.rotation.x = -0.56;
    wsGlass.position.set(0, beltlineY + 0.17, cabinZ + cabinLength * 0.42);
    const wsTopHeader = new THREE.Mesh(
      new THREE.BoxGeometry(wsWidth + 0.02, 0.032, 0.042),
      carClearcoatMat
    );
    wsTopHeader.position.set(0, beltlineY + 0.34, cabinZ + cabinLength * 0.31);
    const wsBaseCowl = new THREE.Mesh(
      new THREE.BoxGeometry(wsWidth + 0.04, 0.035, 0.09),
      matteBlackMat
    );
    wsBaseCowl.position.set(0, beltlineY + 0.01, cabinZ + cabinLength * 0.53);
    group.add(wsGlass, wsTopHeader, wsBaseCowl);

    for (const sideSign of [-1, 1]) {
      const aPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.042, 0.42, 0.048),
        carClearcoatMat
      );
      aPillar.rotation.x = -0.56;
      aPillar.position.set(sideSign * (wsWidth * 0.5), beltlineY + 0.17, cabinZ + cabinLength * 0.42);
      // Frameless side quarter door glass half-up
      const sideQuarterGlass = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.24, cabinLength * 0.48),
        realAutoGlassMat
      );
      sideQuarterGlass.rotation.z = sideSign * 0.15;
      sideQuarterGlass.position.set(sideSign * (wsWidth * 0.49), beltlineY + 0.11, cabinZ + 0.04);
      group.add(aPillar, sideQuarterGlass);
    }

    // Roll hoops + Iconic Porsche Spyder RS Twin Aerodynamic Tonneau Streamliner Humps behind seats
    for (const hx of [-bodyWidth * 0.22, bodyWidth * 0.22]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 12, 24, Math.PI), matteBlackMat);
      hoop.position.set(hx, beltlineY + 0.08, cabinZ - 0.3);
      const hump = new THREE.Mesh(new THREE.ConeGeometry(0.19, 1.05, 16), carClearcoatMat);
      hump.rotation.x = -Math.PI / 2 - 0.12;
      hump.scale.set(1.0, 1.0, 0.62);
      hump.position.set(hx, beltlineY + 0.07, cabinZ - 0.82);
      group.add(hoop, hump);
    }
    const midEngineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.65), carbonMat);
    midEngineMesh.position.set(0, beltlineY + 0.02, cabinZ - 0.65);
    group.add(midEngineMesh);
  } else if (style !== 'cybertruck') {
    const isTeardropCanopy =
      style === 'prototype_lmp' ||
      style === 'streamliner' ||
      style === 'land_rocket' ||
      style === 'sonic_jet' ||
      style === 'quantum_apex' ||
      style === 'plasma_gt' ||
      style === 'nexus_chrono';

    const cabinW = Math.max(
      0.66,
      bodyWidth * (isSingleCentralSeat ? 0.54 : isTeardropCanopy ? 0.68 : 0.8)
    );
    const cabinShape = new THREE.Shape();
    const cFrontZ = cabinZ + cabinLength * 0.52;
    const cRearZ = cabinZ - cabinLength * 0.52;

    if (style === 'wagon') {
      // VOLVO V90 CROSS COUNTRY: Long flat estate roofline extending all the way to vertical D-pillar tailgate
      cabinShape.moveTo(-halfL + 0.12, beltlineY - 0.03);
      cabinShape.lineTo(cFrontZ, beltlineY - 0.03);
      cabinShape.quadraticCurveTo(
        cFrontZ - cabinLength * 0.15,
        beltlineY + cabinHeight * 0.7,
        cFrontZ - cabinLength * 0.26,
        roofTopY
      );
      cabinShape.lineTo(-halfL + 0.32, roofTopY);
      cabinShape.quadraticCurveTo(
        -halfL + 0.16,
        beltlineY + cabinHeight * 0.65,
        -halfL + 0.12,
        beltlineY - 0.03
      );
    } else if (style === 'compact_hatch') {
      // MINI COOPER S: Upright wrap-around greenhouse with flat floating roof
      cabinShape.moveTo(cRearZ - 0.12, beltlineY - 0.03);
      cabinShape.lineTo(cFrontZ, beltlineY - 0.03);
      cabinShape.lineTo(cFrontZ - 0.28, roofTopY);
      cabinShape.lineTo(cRearZ + 0.08, roofTopY);
      cabinShape.lineTo(cRearZ - 0.12, beltlineY - 0.03);
    } else if (style === 'exotic_wedge' || style === 'sonic_jet') {
      // LAMBORGHINI COUNTACH / EGOISTA: Razor-edged hexagonal wedge greenhouse
      cabinShape.moveTo(cRearZ, beltlineY - 0.03);
      cabinShape.lineTo(cFrontZ + 0.15, beltlineY - 0.03);
      cabinShape.lineTo(cabinZ + cabinLength * 0.12, roofTopY);
      cabinShape.lineTo(cabinZ - cabinLength * 0.22, roofTopY);
      cabinShape.lineTo(cRearZ, beltlineY - 0.03);
    } else {
      // Aerodynamic fastback / coupe / sedan / teardrop canopy
      cabinShape.moveTo(cRearZ, beltlineY - 0.03);
      cabinShape.lineTo(cFrontZ, beltlineY - 0.03);
      cabinShape.quadraticCurveTo(
        cFrontZ - cabinLength * 0.18,
        beltlineY + cabinHeight * 0.68,
        cabinZ + cabinLength * 0.16,
        roofTopY
      );
      cabinShape.lineTo(cabinZ - cabinLength * 0.18, roofTopY);
      cabinShape.quadraticCurveTo(
        cRearZ + cabinLength * 0.12,
        beltlineY + cabinHeight * 0.68,
        cRearZ,
        beltlineY - 0.03
      );
    }

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      steps: 24,
      curveSegments: 32,
      depth: cabinW,
      bevelEnabled: true,
      bevelThickness: style === 'exotic_wedge' || style === 'sonic_jet' ? 0.035 : 0.055,
      bevelSize: style === 'exotic_wedge' || style === 'sonic_jet' ? 0.035 : 0.048,
      bevelSegments: 8,
    });
    cabinGeo.translate(0, 0, -cabinW * 0.5);
    cabinGeo.rotateY(-Math.PI / 2);

    // Helper function to deform any cabin-space point (vx, vy, vz) identically to the curved 3D greenhouse
    const halfCabinW = Math.max(0.3, cabinW * 0.5);
    const deformCabinPoint = (vx: number, vy: number, vz: number): [number, number, number] => {
      const cu = THREE.MathUtils.clamp(vx / halfCabinW, -1, 1);
      const absCu = Math.abs(cu);
      const ch = THREE.MathUtils.clamp((vy - beltlineY) / Math.max(0.12, cabinHeight), 0, 1.15);

      const tumblehome = 1.0 - (style === 'compact_hatch' ? 0.14 : 0.2) * Math.pow(Math.min(1, ch), 1.15);
      vx *= tumblehome;

      if (vz < cabinZ && style !== 'wagon') {
        const rearFrac = Math.min(1, (cabinZ - vz) / Math.max(0.3, cabinLength * 0.55));
        vx *= 1.0 - Math.pow(rearFrac, 1.45) * (isTeardropCanopy ? 0.22 : 0.1);
      }

      if (vz > cabinZ) {
        const frontFrac = Math.min(1, (vz - cabinZ) / Math.max(0.3, cabinLength * 0.55));
        vz -= Math.pow(absCu, 1.75) * frontFrac * 0.16 * (1.0 - 0.25 * Math.min(1, ch));
      } else {
        const backFrac = Math.min(1, (cabinZ - vz) / Math.max(0.3, cabinLength * 0.55));
        vz += Math.pow(absCu, 1.75) * backFrac * 0.12 * (1.0 - 0.25 * Math.min(1, ch));
      }

      if (ch > 0.55) {
        vy += (1.0 - cu * cu) * 0.04 * ((Math.min(1, ch) - 0.55) / 0.45);
      }
      return [vx, vy, vz];
    };

    const cPos = cabinGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      const [nx, ny, nz] = deformCabinPoint(cPos.getX(i), cPos.getY(i), cPos.getZ(i));
      cPos.setXYZ(i, nx, ny, nz);
    }
    cPos.needsUpdate = true;
    cabinGeo.computeVertexNormals();

    // 1. Crystal-Clear Reflective Laminated Glass Greenhouse Core
    const cabin = new THREE.Mesh(cabinGeo, realAutoGlassMat);
    cabin.castShadow = true;
    group.add(cabin);

    // 2. Conformal Painted Structural Roof Panel, Cantrails, A-Pillars, B-Pillars, C-Pillars & Window Trim
    //    Built using the exact same `deformCabinPoint` math so pillars & roof sit 100% flush with the glass!
    const roofCapMat =
      style === 'compact_hatch' || style === 'police_cruiser'
        ? whitePaintMat
        : style === 'grand_tourer' ||
          style === 'hypercar' ||
          style === 'track_gt3' ||
          style === 'sport_gt_coupe' ||
          style === 'sport_track_sedan' ||
          style === 'sport_aero_fastback' ||
          style === 'sport_apex_coupe'
        ? carbonMat
        : accentPaintMat;
    const pillarMat =
      style === 'compact_hatch'
        ? matteBlackMat
        : style === 'track_gt3' ||
          style === 'hypercar' ||
          style === 'prototype_lmp' ||
          style === 'sport_apex_coupe'
        ? carbonMat
        : carClearcoatMat;

    const rFrontZ =
      style === 'compact_hatch'
        ? cFrontZ - 0.26
        : style === 'exotic_wedge' || style === 'sonic_jet'
        ? cabinZ + cabinLength * 0.12
        : cabinZ + cabinLength * 0.18;
    const rRearZ =
      style === 'wagon'
        ? -halfL + 0.3
        : style === 'compact_hatch'
        ? cRearZ + 0.08
        : style === 'exotic_wedge' || style === 'sonic_jet'
        ? cabinZ - cabinLength * 0.22
        : cabinZ - cabinLength * 0.2;

    if (style !== 'sonic_jet' && style !== 'quantum_apex') {
      const roofCapShape = new THREE.Shape();
      roofCapShape.moveTo(rRearZ, roofTopY - 0.018);
      roofCapShape.lineTo(rFrontZ, roofTopY - 0.018);
      roofCapShape.lineTo(rFrontZ - 0.03, roofTopY + 0.016);
      roofCapShape.lineTo(rRearZ + 0.03, roofTopY + 0.016);
      roofCapShape.closePath();

      const roofW = cabinW * 0.98;
      const roofGeo = new THREE.ExtrudeGeometry(roofCapShape, {
        steps: 16,
        curveSegments: 20,
        depth: roofW,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.015,
        bevelSegments: 4,
      });
      roofGeo.translate(0, 0, -roofW * 0.5);
      roofGeo.rotateY(-Math.PI / 2);

      const rPos = roofGeo.attributes.position;
      for (let i = 0; i < rPos.count; i++) {
        const [nx, ny, nz] = deformCabinPoint(rPos.getX(i), rPos.getY(i), rPos.getZ(i));
        rPos.setXYZ(i, nx, ny + 0.006, nz);
      }
      rPos.needsUpdate = true;
      roofGeo.computeVertexNormals();

      const roofMesh = new THREE.Mesh(roofGeo, roofCapMat);
      roofMesh.castShadow = true;
      group.add(roofMesh);
    }

    // Helper to build a conformal structural pillar / window trim strip between two cabin points
    const addConformalCabinStrut = (
      p0: [number, number, number],
      p1: [number, number, number],
      widthX: number,
      thicknessY: number,
      mat: THREE.Material
    ) => {
      const d0 = new THREE.Vector3(...deformCabinPoint(p0[0], p0[1], p0[2]));
      const d1 = new THREE.Vector3(...deformCabinPoint(p1[0], p1[1], p1[2]));
      const dir = new THREE.Vector3().subVectors(d1, d0);
      const len = dir.length();
      if (len < 0.02) return;
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(widthX, len, thicknessY),
        mat
      );
      strut.position.copy(d0).addScaledVector(dir, 0.5);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      strut.castShadow = true;
      group.add(strut);
    };

    const windowTrimMat =
      style === 'sedan' || style === 'wagon' || style === 'vintage_coupe' || style === 'grand_tourer'
        ? chromeMat
        : matteBlackMat;

    for (const sideSign of [-1, 1]) {
      const sideX = sideSign * (halfCabinW * 0.99);

      // 1. Conformal Painted A-Pillar + Black Ceramic Windshield Frit Border
      addConformalCabinStrut(
        [sideX, beltlineY, cFrontZ - 0.03],
        [sideX, roofTopY, rFrontZ],
        0.048,
        0.055,
        pillarMat
      );
      addConformalCabinStrut(
        [sideSign * (halfCabinW * 0.93), beltlineY + 0.01, cFrontZ - 0.01],
        [sideSign * (halfCabinW * 0.93), roofTopY - 0.01, rFrontZ + 0.01],
        0.038,
        0.03,
        matteBlackMat
      );

      // 2. Conformal Gloss-Black B-Pillar Door Glass Divider (separates front & rear side windows!)
      if (!isTeardropCanopy) {
        const bPillarZ = cabinZ - 0.04;
        addConformalCabinStrut(
          [sideX * 1.005, beltlineY, bPillarZ],
          [sideX * 1.005, roofTopY - 0.01, bPillarZ - 0.08],
          0.024,
          0.085,
          matteBlackMat
        );
      }

      // 3. Conformal Painted C-Pillar & Rear Quarter Window Hofmeister Kink Frame
      addConformalCabinStrut(
        [sideX, beltlineY, style === 'wagon' ? -halfL + 0.15 : cRearZ + 0.04],
        [sideX, roofTopY, rRearZ],
        0.055,
        style === 'muscle' || style === 'grand_tourer' || style === 'sedan' ? 0.13 : 0.08,
        pillarMat
      );

      // 4. Lower Door Window Beltline Weatherstripping / Chrome Trim Molding
      addConformalCabinStrut(
        [sideX * 1.01, beltlineY + 0.012, cFrontZ - 0.04],
        [sideX * 1.01, beltlineY + 0.012, style === 'wagon' ? -halfL + 0.16 : cRearZ + 0.04],
        0.026,
        0.024,
        windowTrimMat
      );

      // 5. Upper Roof Cantrail Window Trim Molding
      addConformalCabinStrut(
        [sideX * 1.005, roofTopY - 0.015, rFrontZ],
        [sideX * 1.005, roofTopY - 0.015, rRearZ],
        0.028,
        0.026,
        windowTrimMat
      );
    }

    // 6. Windshield Lower Black Ceramic Cowl Trim & Dual Articulated Windshield Wiper Blades
    const cowlBasePos = deformCabinPoint(0, beltlineY + 0.015, cFrontZ);
    const wsCowlStrip = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW * 0.92, 0.032, 0.09),
      matteBlackMat
    );
    wsCowlStrip.position.set(0, cowlBasePos[1], cowlBasePos[2]);
    wsCowlStrip.rotation.x = 0.25;
    group.add(wsCowlStrip);

    for (const wxOff of [-cabinW * 0.2, cabinW * 0.16]) {
      const wiperArm = new THREE.Mesh(
        new THREE.BoxGeometry(cabinW * 0.38, 0.014, 0.022),
        matteBlackMat
      );
      wiperArm.position.set(wxOff + 0.06, cowlBasePos[1] + 0.024, cowlBasePos[2] - 0.02);
      wiperArm.rotation.y = -0.14;
      wiperArm.rotation.z = 0.08;
      group.add(wiperArm);
    }
    // Rear Window Upper Header Black Ceramic Frit Border
    const rearHeaderPos = deformCabinPoint(0, roofTopY - 0.01, rRearZ);
    const rearHeaderFrit = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW * 0.72, 0.028, 0.07),
      matteBlackMat
    );
    rearHeaderFrit.position.set(0, rearHeaderPos[1], rearHeaderPos[2]);
    group.add(rearHeaderFrit);



  }

  // ============================================================================
  // 3. REAL-WORLD CAR MODEL ARCHITECTURE, FLUSH GRILLES, HEADLIGHTS, TAILLIGHTS & AERO
  // ============================================================================
  if (style === 'compact_hatch') {
    // --- MINI COOPER S (F56) ---
    // 1. Contrasting Matte-Black Wheel Arch Trim & Chrome Beltline Strip + Twin Bonnet Stripes
    const beltTrim = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.02, 0.022, bodyLength * 0.78),
      chromeMat
    );
    beltTrim.position.set(0, beltlineY + 0.01, -0.05);
    group.add(beltTrim);

    for (const sx of [-0.22, 0.22]) {
      const bonnetStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.012, bodyLength * 0.32),
        accentPaintMat
      );
      bonnetStripe.position.set(sx, beltlineY + 0.012, halfL * 0.52);
      group.add(bonnetStripe);
    }

    // 2. Cooper S Clamshell Hood Turbo Mail-Slot Scoop
    const hoodScoop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.18), carClearcoatMat);
    hoodScoop.position.set(0, beltlineY + 0.015, halfL * 0.52);
    const scoopSlot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.05), darkMat);
    scoopSlot.position.set(0, beltlineY + 0.018, halfL * 0.58);
    group.add(hoodScoop, scoopSlot);

    // 3. Iconic MINI Round Canted Chrome-Ringed Halo Headlights (Flush in Front Fenders)
    for (const hx of [-bodyWidth * 0.32, bodyWidth * 0.32]) {
      addFlushContouredHeadlight(hx, beltlineY - 0.11, halfL + 0.01, 0.22, 0.22, 0.08, xenonWhiteMat, true);
      // Flush lower bumper round fog lamps
      const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), ledIceWhiteMat);
      fog.rotation.x = Math.PI / 2;
      fog.position.set(hx, baseClearance + 0.12, halfL + 0.025);
      group.add(fog);
    }

    // 4. Flush Rounded Hexagonal MINI Honeycomb Grille with Chrome Surround & Red "S" Badge
    const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.52, 0.22, 0.06), chromeMat);
    grilleFrame.position.set(0, chassisCenterY - 0.04, halfL + 0.032);
    const grilleCore = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.48, 0.18, 0.068), darkMat);
    grilleCore.position.copy(grilleFrame.position);
    const bumperBar = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.5, 0.055, 0.075), matteBlackMat);
    bumperBar.position.set(0, chassisCenterY - 0.04, halfL + 0.036);
    const sBadge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.08), redAccentMat);
    sBadge.position.set(-bodyWidth * 0.15, chassisCenterY + 0.01, halfL + 0.038);
    group.add(grilleFrame, grilleCore, bumperBar, sBadge);

    // 5. White Twin-Blister Roof Spoiler & Flush Union-Jack Vertical Taillights + Center Twin Exhausts
    const roofSpoiler = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.66, 0.04, 0.22), whitePaintMat);
    roofSpoiler.position.set(0, roofTopY + 0.01, cabinZ - cabinLength * 0.42);
    group.add(roofSpoiler);
    for (const tx of [-bodyWidth * 0.29, bodyWidth * 0.29]) {
      const tlFrame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.08), chromeMat);
      tlFrame.position.set(tx, chassisCenterY + 0.05, -halfL - 0.015);
      const tlRed = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.19, 0.09), tailRedMat);
      tlRed.position.copy(tlFrame.position);
      group.add(tlFrame, tlRed);
    }
    for (const ex of [-0.07, 0.07]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 14), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, baseClearance + 0.03, -halfL - 0.04);
      group.add(pipe);
    }
  } else if (style === 'sedan') {
    // --- BMW M3 / M340i (G80/G20) EXECUTIVE SPORTS SEDAN ---
    // 1. Sculpted Power-Dome Hood Creases + Contrasting Accent Stripes
    for (const cx of [-0.22, 0.22]) {
      const crease = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, bodyLength * 0.28, 6, 12), accentPaintMat);
      crease.rotation.x = Math.PI / 2 + 0.06;
      crease.position.set(cx, beltlineY + 0.008, halfL * 0.48);
      group.add(crease);
    }

    // 2. Signature Flush BMW Twin Kidney Grille with Chrome Rings & Vertical Double Slats
    for (const kx of [-0.2, 0.2]) {
      const kidneyOuter = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.23, 0.06), chromeMat);
      kidneyOuter.position.set(kx, chassisCenterY + 0.02, halfL + 0.038);
      const kidneyInner = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.19, 0.068), darkMat);
      kidneyInner.position.copy(kidneyOuter.position);
      group.add(kidneyOuter, kidneyInner);
      for (let s = -2; s <= 2; s++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.18, 0.075), chromeMat);
        slat.position.set(kx + s * 0.052, chassisCenterY + 0.02, halfL + 0.042);
        group.add(slat);
      }
    }

    // 3. Flush Contoured Dual-Projector Laser Headlights with Twin-L DRLs
    for (const hx of [-bodyWidth * 0.32, bodyWidth * 0.32]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.06, halfL + 0.02, 0.34, 0.11, 0.09, ledIceWhiteMat, false);
    }

    // 4. Roof Shark-Fin Antenna, Carbon Trunk Lip Spoiler, Flush 3D L-Taillights & Quad M Exhausts
    const sharkFin = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), accentPaintMat);
    sharkFin.rotation.x = -0.35;
    sharkFin.position.set(0, roofTopY + 0.04, cabinZ - cabinLength * 0.22);
    const trunkLip = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.76, 0.032, 0.08), carbonMat);
    trunkLip.position.set(0, beltlineY + 0.015, -halfL + 0.05);
    group.add(sharkFin, trunkLip);

    for (const tx of [-bodyWidth * 0.28, bodyWidth * 0.28]) {
      const tlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.11, 0.08), darkMat);
      tlHousing.position.set(tx, chassisCenterY + 0.07, -halfL - 0.01);
      const tlMain = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.075, 0.09), tailRedMat);
      tlMain.position.set(tx, chassisCenterY + 0.06, -halfL - 0.014);
      const tlUp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.09), tailRedMat);
      tlUp.position.set(tx + (tx > 0 ? 0.14 : -0.14), chassisCenterY + 0.08, -halfL - 0.014);
      group.add(tlHousing, tlMain, tlUp);
    }
    for (const ex of [-0.44, -0.34, 0.34, 0.44]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.2, 14), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, baseClearance + 0.04, -halfL - 0.04);
      group.add(pipe);
    }
  } else if (style === 'wagon') {
    // --- VOLVO V90 CROSS COUNTRY / GRAND WAGONEER ESTATE ---
    // 1. Multi-Tone Contrasting Cladding Side Panels Framed by Chrome Trim Spears (No brown wood)
    for (const sx of [-bodyW * 0.48, bodyW * 0.48]) {
      const sideCladding = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, bodyHeight * 0.44, bodyLength * 0.48),
        accentPaintMat
      );
      sideCladding.position.set(sx, chassisCenterY, -0.02);
      const chromeSpear = new THREE.Mesh(
        new THREE.BoxGeometry(0.058, 0.024, bodyLength * 0.5),
        chromeMat
      );
      chromeSpear.position.set(sx, chassisCenterY + bodyHeight * 0.23, -0.02);
      group.add(sideCladding, chromeSpear);
    }

    // 2. Flush Volvo Waterfall Grille with Diagonal Chrome Slash & Iron-Mark Emblem + Silver Skid Plate
    const vGrilleFrame = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.5, 0.23, 0.06), chromeMat);
    vGrilleFrame.position.set(0, chassisCenterY + 0.02, halfL + 0.038);
    const vGrilleCore = new THREE.Mesh(new THREE.BoxGeometry(0.46 * bodyWidth, 0.19, 0.068), darkMat);
    vGrilleCore.position.copy(vGrilleFrame.position);
    const diagSlash = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.022, 0.075), chromeMat);
    diagSlash.rotation.z = 0.38;
    diagSlash.position.set(0, chassisCenterY + 0.02, halfL + 0.042);
    const ironMark = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 10, 20), chromeMat);
    ironMark.position.set(0, chassisCenterY + 0.02, halfL + 0.046);
    const fSkid = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.6, 0.07, 0.09), silverMat);
    fSkid.position.set(0, baseClearance + 0.04, halfL + 0.034);
    group.add(vGrilleFrame, vGrilleCore, diagSlash, ironMark, fSkid);

    // 3. Flush "Thor's Hammer" Contoured Projector LED Headlights
    for (const hx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.05, halfL + 0.02, 0.34, 0.12, 0.09, ledIceWhiteMat, false);
    }

    // 4. Raised Anodized Roof Rails & Aerodynamic Rooftop Touring Cargo Box
    for (const rx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      const rail = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, cabinLength * 0.82, 6, 12), silverMat);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(rx, roofTopY + 0.045, cabinZ);
      group.add(rail);
    }
    const cargoBox = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.35, 10, 16), carbonMat);
    cargoBox.rotation.x = Math.PI / 2;
    cargoBox.scale.set(1.35, 1.0, 0.52);
    cargoBox.position.set(0, roofTopY + 0.14, cabinZ - 0.1);
    group.add(cargoBox);

    // 5. Flush Horizontal Wrap-Around Estate Taillights & Rear Skid Plate
    for (const tx of [-bodyWidth * 0.28, bodyWidth * 0.28]) {
      const tlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.08), darkMat);
      tlHousing.position.set(tx, chassisCenterY + 0.08, -halfL - 0.01);
      const vTailHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.095, 0.09), tailRedMat);
      vTailHoriz.position.set(tx, chassisCenterY + 0.08, -halfL - 0.014);
      const reverseStrip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.026, 0.095), ledIceWhiteMat);
      reverseStrip.position.set(tx + (tx > 0 ? -0.04 : 0.04), chassisCenterY + 0.08, -halfL - 0.016);
      group.add(tlHousing, vTailHoriz, reverseStrip);
    }
    const rSkid = fSkid.clone();
    rSkid.position.z = -halfL - 0.012;
    group.add(rSkid);
  } else if (style === 'aeropod') {
    // --- LUCID AIR SAPPHIRE / TESLA MODEL S PLAID ---
    // 1. Flush Full-Width Platinum Brow Trim, Glowing Front Lightbar & Outer Micro-Lens Headlamps
    const platinumBrow = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.84, 0.032, 0.08), silverMat);
    platinumBrow.position.set(0, chassisCenterY + 0.08, halfL + 0.028);
    const frontLightbar = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.82, 0.035, 0.085), cyanGlowMat);
    frontLightbar.position.set(0, chassisCenterY + 0.05, halfL + 0.032);
    group.add(platinumBrow, frontLightbar);
    for (const hx of [-bodyWidth * 0.32, bodyWidth * 0.32]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.05, halfL + 0.015, 0.32, 0.09, 0.08, cyanGlowMat, false);
    }

    // 2. Carbon-Fiber Plaid/Sapphire Ducktail Lip Spoiler & Flush Full-Width Rear Crimson Light Blade
    const ducktail = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.78, 0.045, 0.11), carbonMat);
    ducktail.rotation.x = 0.25;
    ducktail.position.set(0, beltlineY + 0.02, -halfL + 0.06);
    const rearLightbar = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.82, 0.048, 0.08), tailRedMat);
    rearLightbar.position.set(0, chassisCenterY + 0.08, -halfL - 0.012);
    group.add(ducktail, rearLightbar);
  } else if (style === 'vintage_coupe') {
    // --- 1964 ASTON MARTIN DB5 VANTAGE ---
    // 1. Sculpted Raised Round Front Fender Pontoons & Flush Round Glass-Covered Lucas Headlamps
    for (const fx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      const pontoon = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, bodyLength * 0.32, 10, 16), carClearcoatMat);
      pontoon.rotation.x = Math.PI / 2;
      pontoon.scale.set(0.95, 1.0, 0.68);
      pontoon.position.set(fx, beltlineY - 0.04, halfL * 0.45);
      addFlushContouredHeadlight(fx, beltlineY - 0.04, halfL + 0.015, 0.21, 0.21, 0.09, xenonWhiteMat, true);
      const amberSignal = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 10), amberLightMat);
      amberSignal.position.set(fx, chassisCenterY - 0.05, halfL + 0.042);
      // Classic fender-mounted chrome bullet racing mirrors & side vent strake
      const bulletMirror = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.13, 12), chromeMat);
      bulletMirror.rotation.x = -Math.PI / 2;
      bulletMirror.position.set(fx * 1.12, beltlineY + 0.08, halfL * 0.42);
      const sideStrake = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.022, 0.46), chromeMat);
      sideStrake.position.set(fx > 0 ? bodyW * 0.49 : -bodyW * 0.49, chassisCenterY + 0.05, halfL * 0.22);
      group.add(pontoon, amberSignal, bulletMirror, sideStrake);
    }
    const db5Scoop = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.52, 8, 12), accentPaintMat);
    db5Scoop.rotation.x = Math.PI / 2;
    db5Scoop.scale.set(1.8, 1.0, 0.55);
    db5Scoop.position.set(0, beltlineY + 0.018, halfL * 0.35);
    group.add(db5Scoop);

    // 2. Iconic Aston Martin Stepped-Arch Wide Horizontal-Slat Chrome Grille (Flush)
    const archCenter = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.06), chromeMat);
    archCenter.position.set(0, chassisCenterY, halfL + 0.038);
    const archWings = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.15, 0.055), chromeMat);
    archWings.position.set(0, chassisCenterY - 0.035, halfL + 0.036);
    group.add(archCenter, archWings);
    for (let s = -2; s <= 2; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.013, 0.068), darkMat);
      slat.position.set(0, chassisCenterY - 0.03 + s * 0.03, halfL + 0.042);
      group.add(slat);
    }

    // 3. Flush Chrome Bumpers with Vertical Chrome Overriders & Vertical Triple Taillights
    for (const bz of [halfL + 0.06, -halfL - 0.05]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, bodyWidth * 0.9, 16), chromeMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, baseClearance + 0.11, bz);
      group.add(bar);
      for (const ox of [-0.4, 0.4]) {
        const overrider = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.11, 8, 12), chromeMat);
        overrider.position.set(ox, baseClearance + 0.13, bz + (bz > 0 ? 0.02 : -0.02));
        group.add(overrider);
      }
    }
    for (const tx of [-bodyWidth * 0.29, bodyWidth * 0.29]) {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.22, 0.08), chromeMat);
      plinth.position.set(tx, chassisCenterY + 0.04, -halfL - 0.01);
      const tlPod = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.18, 0.09), tailRedMat);
      tlPod.position.copy(plinth.position);
      group.add(plinth, tlPod);
    }
    for (const ex of [-0.26, -0.18]) {
      const peaPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), chromeMat);
      peaPipe.rotation.x = Math.PI / 2;
      peaPipe.position.set(ex, baseClearance + 0.02, -halfL - 0.05);
      group.add(peaPipe);
    }
  } else if (style === 'hot_hatch') {
    // --- HONDA CIVIC TYPE R (FL5/FK8) ---
    // 1. Vented Carbon Hood Duct & Front Splitter with Vivid Red Type-R Pinstripe
    const hoodVent = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, 0.24), carbonMat);
    hoodVent.position.set(0, beltlineY + 0.012, halfL * 0.48);
    const redLip = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.94, 0.018, 0.21), redAccentMat);
    redLip.position.set(0, baseClearance + 0.01, halfL + 0.01);
    group.add(hoodVent, redLip);

    // 2. Flush Black Honeycomb Grille with Red Type-R Emblem & Contoured Multi-Projector LED Headlamps
    const ctrGrille = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.5, 0.16, 0.065), darkMat);
    ctrGrille.position.set(0, chassisCenterY + 0.05, halfL + 0.036);
    const redBadge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.068, 0.075), redAccentMat);
    redBadge.position.set(0, chassisCenterY + 0.05, halfL + 0.042);
    group.add(ctrGrille, redBadge);

    for (const hx of [-bodyWidth * 0.31, bodyWidth * 0.31]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.06, halfL + 0.018, 0.34, 0.095, 0.085, ledIceWhiteMat, false);
      const rallyFog = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.05, 14), amberLightMat);
      rallyFog.rotation.x = Math.PI / 2;
      rallyFog.position.set(hx * 1.02, baseClearance + 0.12, halfL + 0.025);
      group.add(rallyFog);
    }

    // 3. Roof Vortex-Generator Fin Array + Tall Dual-Plane Type-R Rear Wing + Triple Center Exhausts!
    for (let v = -2; v <= 2; v++) {
      const vortexFin = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.065, 4), carbonMat);
      vortexFin.position.set(v * 0.14, roofTopY + 0.028, cabinZ - cabinLength * 0.34);
      group.add(vortexFin);
    }
    const wingDeck = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.86, 0.038, 0.26), carbonMat);
    wingDeck.position.set(0, roofTopY - 0.02, -halfL + 0.22);
    for (const wx of [-0.38, 0.38]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.3, 0.16), carbonMat);
      pylon.position.set(wx, beltlineY + 0.15, -halfL + 0.24);
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.2, 0.32), accentPaintMat);
      endplate.position.set(wx > 0 ? bodyW * 0.43 : -bodyW * 0.43, roofTopY - 0.02, -halfL + 0.22);
      group.add(pylon, endplate);
    }
    group.add(wingDeck);

    for (const tx of [-bodyWidth * 0.28, bodyWidth * 0.28]) {
      const cTail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.08), tailRedMat);
      cTail.position.set(tx, chassisCenterY + 0.08, -halfL - 0.012);
      group.add(cTail);
    }
    for (const [ex, rad] of [
      [-0.12, 0.042],
      [0, 0.052],
      [0.12, 0.042],
    ]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.2, 14), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, baseClearance + 0.04, -halfL - 0.04);
      group.add(pipe);
    }
  } else if (style === 'muscle') {
    // --- 1969 FORD MUSTANG BOSS 429 / DODGE CHALLENGER SRT HELLCAT WIDEBODY ---
    // 1. Twin Full-Length Le Mans Racing Stripes & Matte-Black Shaker Supercharger Scoop
    for (const sx of [-0.21, 0.21]) {
      const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, bodyLength * 0.38), accentPaintMat);
      hoodStripe.position.set(sx, beltlineY + 0.01, halfL * 0.5);
      const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, cabinLength * 0.42), accentPaintMat);
      roofStripe.position.set(sx, roofTopY + 0.022, cabinZ);
      const trunkStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, bodyLength * 0.24), accentPaintMat);
      trunkStripe.position.set(sx, beltlineY + 0.01, -halfL * 0.65);
      group.add(hoodStripe, roofStripe, trunkStripe);
    }
    const shakerScoop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.68), matteBlackMat);
    shakerScoop.position.set(0, beltlineY + 0.05, halfL * 0.38);
    for (const nx of [-0.13, 0.13]) {
      const butterfly = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12), redAccentMat);
      butterfly.rotation.x = Math.PI / 2;
      butterfly.position.set(nx, beltlineY + 0.065, halfL * 0.38 + 0.34);
      group.add(butterfly);
    }
    group.add(shakerScoop);

    // 2. Deep Recessed Black Honeycomb Grille with Quad Circular Halo Headlights & Outer Multi-Color Headlight Assemblies
    const recessedNose = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.88, 0.2, 0.08), matteBlackMat);
    recessedNose.position.set(0, chassisCenterY + 0.05, halfL + 0.025);
    group.add(recessedNose);

    for (const hx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.05, halfL + 0.018, 0.34, 0.13, 0.08, xenonWhiteMat, false);
    }

    for (const hx of [-0.56, -0.37, 0.37, 0.56]) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.016, 12, 24), xenonWhiteMat);
      halo.position.set(hx, chassisCenterY + 0.05, halfL + 0.062);
      const amberInner = new THREE.Mesh(
        new THREE.TorusGeometry(0.048, 0.01, 10, 20),
        Math.abs(hx) < 0.45 ? amberLightMat : cyanGlowMat
      );
      amberInner.position.set(hx, chassisCenterY + 0.05, halfL + 0.064);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), clearHeadlightCoverMat);
      lens.scale.set(1.0, 1.0, 0.4);
      lens.position.set(hx, chassisCenterY + 0.05, halfL + 0.065);
      group.add(halo, amberInner, lens);
    }

    // 3. Fastback Rear Window Black Muscle Louvers & Mustang 6-Bar Vertical Taillights!
    for (let l = 0; l < 5; l++) {
      const t = l / 4;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.54, 0.018, 0.1), matteBlackMat);
      slat.position.set(0, beltlineY + 0.08 + t * (cabinHeight - 0.12), cabinZ - cabinLength * 0.48 + t * 0.36);
      group.add(slat);
    }
    const tailPanel = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.84, 0.2, 0.08), matteBlackMat);
    tailPanel.position.set(0, chassisCenterY + 0.05, -halfL - 0.01);
    const muscleSpoiler = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.82, 0.065, 0.12), matteBlackMat);
    muscleSpoiler.position.set(0, beltlineY + 0.03, -halfL + 0.07);
    group.add(tailPanel, muscleSpoiler);

    for (const side of [-1, 1]) {
      for (let b = 0; b < 3; b++) {
        const barX = side * (0.26 + b * 0.13);
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.09), tailRedMat);
        vBar.position.set(barX, chassisCenterY + 0.05, -halfL - 0.014);
        group.add(vBar);
      }
    }
    for (const ex of [-0.5, -0.39, 0.39, 0.5]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.22, 14), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, baseClearance + 0.03, -halfL - 0.05);
      group.add(pipe);
    }
  } else if (style === 'roadster') {
    // --- PORSCHE 718 SPYDER RS / FERRARI F8 SPIDER ---
    // 1. Raised Sculpted Front Fender Peaks & Flush Teardrop 4-Point Matrix Headlamps
    for (const fx of [-bodyWidth * 0.34, bodyWidth * 0.34]) {
      const fenderPeak = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, bodyLength * 0.28, 10, 16), carClearcoatMat);
      fenderPeak.rotation.x = Math.PI / 2;
      fenderPeak.scale.set(1.05, 1.0, 0.55);
      fenderPeak.position.set(fx, beltlineY + 0.01, halfL * 0.5);
      addFlushContouredHeadlight(fx, beltlineY - 0.04, halfL - 0.02, 0.28, 0.09, 0.09, ledIceWhiteMat, false);
      const sideIntake = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.4), carbonMat);
      sideIntake.position.set(fx > 0 ? bodyW * 0.48 : -bodyW * 0.48, chassisCenterY + 0.04, -0.55);
      group.add(fenderPeak, sideIntake);
    }
    const frunkStripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.012, bodyLength * 0.32), accentPaintMat);
    frunkStripe.position.set(0, beltlineY + 0.01, halfL * 0.5);
    const frunkVent = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.14), carbonMat);
    frunkVent.position.set(0, beltlineY + 0.012, halfL * 0.65);
    const spyderDucktail = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.76, 0.06, 0.13), accentPaintMat);
    spyderDucktail.rotation.x = 0.32;
    spyderDucktail.position.set(0, beltlineY + 0.02, -halfL + 0.07);
    const spyderLightBar = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.8, 0.045, 0.08), tailRedMat);
    spyderLightBar.position.set(0, chassisCenterY + 0.06, -halfL - 0.012);
    group.add(frunkStripe, frunkVent, spyderDucktail, spyderLightBar);

    for (const ex of [-0.13, 0.13]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.2, 14), carbonMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, baseClearance + 0.03, -halfL - 0.04);
      group.add(pipe);
    }
  } else if (style === 'grand_tourer') {
    // --- ASTON MARTIN DBS SUPERLEGGERA V12 GRAND TOURER ---
    // 1. Wide Hexagonal Aston Martin Vane Grille & Flush Contoured Headlamps
    const dbsGrille = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.66, 0.21, 0.07), darkMat);
    dbsGrille.position.set(0, baseClearance + 0.16, halfL + 0.034);
    group.add(dbsGrille);
    for (let s = -2; s <= 2; s++) {
      const vane = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.62, 0.012, 0.08), chromeMat);
      vane.position.set(0, baseClearance + 0.16 + s * 0.034, halfL + 0.038);
      group.add(vane);
    }

    for (const hx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      const hoodLouver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.025, 0.4), carbonMat);
      hoodLouver.position.set(hx * 0.65, beltlineY + 0.012, halfL * 0.46);
      addFlushContouredHeadlight(hx, beltlineY - 0.06, halfL - 0.01, 0.32, 0.09, 0.09, ledIceWhiteMat, false);
      const sideGill = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.032, 0.5), accentPaintMat);
      sideGill.position.set(hx > 0 ? bodyW * 0.49 : -bodyW * 0.49, chassisCenterY + 0.04, halfL * 0.18);
      group.add(hoodLouver, sideGill);
    }

    // 2. Carbon Aeroblade Lip Spoiler, Full-Width C-Blade Red LED Taillight & Quad Exhaust Cannons
    const aeroblade = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.78, 0.04, 0.13), carbonMat);
    aeroblade.position.set(0, beltlineY + 0.02, -halfL + 0.07);
    const dbsTailBlade = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.82, 0.042, 0.08), tailRedMat);
    dbsTailBlade.position.set(0, beltlineY - 0.05, -halfL - 0.012);
    group.add(aeroblade, dbsTailBlade);

    for (const ex of [-0.52, -0.4, 0.4, 0.52]) {
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.22, 14), chromeMat);
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(ex, baseClearance + 0.04, -halfL - 0.05);
      group.add(cannon);
    }
  } else if (style === 'cybertruck') {
    // --- TESLA CYBERTRUCK CYBERBEAST ---
    const ctFrontBar = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.92, 0.055, 0.06),
      ledIceWhiteMat
    );
    ctFrontBar.position.set(0, beltlineY - 0.07, halfL + 0.038);
    const ctFrontCyanStrip = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.9, 0.018, 0.065),
      cyanGlowMat
    );
    ctFrontCyanStrip.position.set(0, beltlineY - 0.1, halfL + 0.04);
    for (const hx of [-bodyWidth * 0.34, bodyWidth * 0.34]) {
      addFlushContouredHeadlight(hx, baseClearance + 0.22, halfL + 0.01, 0.28, 0.09, 0.08, ledIceWhiteMat, false);
    }
    const ctFrontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.94, 0.15, 0.14),
      matteBlackMat
    );
    ctFrontBumper.position.set(0, baseClearance + 0.06, halfL + 0.02);

    const ctRearBar = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.92, 0.05, 0.05),
      tailRedMat
    );
    ctRearBar.position.set(0, beltlineY + 0.04, -halfL - 0.015);
    const ctRearBumper = ctFrontBumper.clone();
    ctRearBumper.position.set(0, baseClearance + 0.06, -halfL - 0.02);
    group.add(ctFrontBar, ctFrontCyanStrip, ctFrontBumper, ctRearBar, ctRearBumper);
  } else if (style === 'track_gt3') {
    // --- PORSCHE 911 GT3 RS (992) ---
    // 1. Raised Porsche Front Fender Pontoons with Flush Canted 4-Point Matrix Headlamps & Wheel-Arch Louvers
    for (const fx of [-bodyWidth * 0.34, bodyWidth * 0.34]) {
      const pFender = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, bodyLength * 0.3, 10, 16), carClearcoatMat);
      pFender.rotation.x = Math.PI / 2;
      pFender.scale.set(1.05, 1.0, 0.58);
      pFender.position.set(fx, beltlineY + 0.008, halfL * 0.5);
      addFlushContouredHeadlight(fx, beltlineY - 0.03, halfL - 0.01, 0.22, 0.22, 0.09, ledIceWhiteMat, true);
      const archLouver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.025, 0.22), carbonMat);
      archLouver.position.set(fx, beltlineY + 0.075, bodyLength * 0.31);
      const turboIntake = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.17, 0.32), carbonMat);
      turboIntake.position.set(fx > 0 ? bodyW * 0.49 : -bodyW * 0.49, chassisCenterY + 0.06, -0.52);
      group.add(pFender, archLouver, turboIntake);
    }

    // 2. Dual Carbon Hood Radiator Exit Nostrils (992 GT3 RS signature) + Center Accent Stripe
    const gt3HoodCenter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, bodyLength * 0.32), accentPaintMat);
    gt3HoodCenter.position.set(0, beltlineY + 0.01, halfL * 0.48);
    group.add(gt3HoodCenter);
    for (const nx of [-0.19, 0.19]) {
      const nostril = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.36), carbonMat);
      nostril.position.set(nx, beltlineY + 0.008, halfL * 0.54);
      group.add(nostril);
    }

    // 3. Towering 992 GT3 RS Swan-Neck DRS Carbon-Fiber Rear Wing + Center Twin Exhausts
    const gt3WingY = roofTopY + 0.04;
    const gt3WingMain = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.94, 0.032, 0.3), carbonMat);
    gt3WingMain.position.set(0, gt3WingY, -halfL + 0.08);
    const gt3WingFlap = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.92, 0.025, 0.13), accentPaintMat);
    gt3WingFlap.rotation.x = 0.28;
    gt3WingFlap.position.set(0, gt3WingY + 0.045, -halfL - 0.01);
    group.add(gt3WingMain, gt3WingFlap);

    for (const sx of [-0.34, 0.34]) {
      const swanPylon = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.46, 0.15), carbonMat);
      swanPylon.rotation.x = -0.18;
      swanPylon.position.set(sx, beltlineY + 0.25, -halfL + 0.18);
      const swanHook = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.075, 0.2), silverMat);
      swanHook.position.set(sx, gt3WingY + 0.038, -halfL + 0.12);
      group.add(swanPylon, swanHook);
    }
    for (const ex of [-bodyWidth * 0.47, bodyWidth * 0.47]) {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.34, 0.4), carbonMat);
      endplate.position.set(ex, gt3WingY - 0.04, -halfL + 0.06);
      group.add(endplate);
    }

    const porscheTailStrip = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.82, 0.045, 0.08), tailRedMat);
    porscheTailStrip.position.set(0, chassisCenterY + 0.08, -halfL - 0.012);
    group.add(porscheTailStrip);
    for (const px of [-0.08, 0.08]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.2, 14), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(px, baseClearance + 0.04, -halfL - 0.04);
      group.add(pipe);
    }
  } else if (style === 'exotic_wedge') {
    // --- LAMBORGHINI COUNTACH LPI 800-4 / AVENTADOR SVJ ---
    // 1. Triangular Black Side NACA Ducts, Shoulder Scoops & Flush Wedge Headlamps
    for (const sx of [-1, 1]) {
      const nacaDuct = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.68, 3), carbonMat);
      nacaDuct.rotation.x = Math.PI / 2;
      nacaDuct.position.set(sx * (bodyW * 0.48), chassisCenterY + 0.02, -0.25);
      const shoulderScoop = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.52), carClearcoatMat);
      shoulderScoop.position.set(sx * (bodyWidth * 0.33), beltlineY + 0.08, -0.75);
      const scoopMouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.05), darkMat);
      scoopMouth.position.set(sx * (bodyWidth * 0.33), beltlineY + 0.08, -0.49);
      addFlushContouredHeadlight(
        sx * (bodyWidth * 0.32),
        baseClearance + bodyHeight * 0.44,
        halfL - 0.08,
        0.32,
        0.075,
        0.09,
        xenonWhiteMat,
        false
      );
      group.add(nacaDuct, shoulderScoop, scoopMouth);
    }

    // 2. Visible Gold V12 Velocity-Stack Intake Manifold under Slatted Engine Cover
    const engineBay = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.9), carbonMat);
    engineBay.position.set(0, beltlineY + 0.015, -0.95);
    group.add(engineBay);
    for (let row = 0; row < 6; row++) {
      for (const vx of [-0.14, 0.14]) {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.09, 10), goldMat);
        stack.position.set(vx, beltlineY + 0.05, -0.6 - row * 0.13);
        group.add(stack);
      }
    }

    // 3. Countach Delta Rear Wing, Flush Triple-Hexagon Taillights & Quad Clustered Center Exhausts
    const countachWing = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.88, 0.032, 0.26), accentPaintMat);
    countachWing.position.set(0, beltlineY + 0.32, -halfL + 0.16);
    for (const wx of [-0.38, 0.38]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.32, 0.15), carbonMat);
      strut.position.set(wx, beltlineY + 0.16, -halfL + 0.18);
      group.add(strut);
    }
    group.add(countachWing);

    for (const side of [-1, 1]) {
      for (let h = 0; h < 3; h++) {
        const hexTail = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.08, 6), tailRedMat);
        hexTail.rotation.x = Math.PI / 2;
        hexTail.position.set(side * (0.31 + h * 0.13), chassisCenterY + 0.07, -halfL - 0.012);
        group.add(hexTail);
      }
    }
    for (const ex of [-0.17, -0.055, 0.055, 0.17]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.2, 12), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, baseClearance + 0.05, -halfL - 0.05);
      group.add(pipe);
    }
  } else if (style === 'hypercar') {
    // --- BUGATTI CHIRON PUR SPORT / LA VOITURE NOIRE ---
    for (const sx of [-bodyW * 0.49, bodyW * 0.49]) {
      const cLine = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.036, 12, 28, Math.PI * 1.15),
        chromeMat
      );
      cLine.rotation.y = Math.PI / 2;
      cLine.rotation.z = Math.PI * 0.42;
      cLine.scale.set(1.32, 0.86, 1.0);
      cLine.position.set(sx, beltlineY + 0.11, cabinZ + 0.05);
      group.add(cLine);
    }

    const horseshoeArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.028, 12, 24, Math.PI),
      chromeMat
    );
    horseshoeArch.position.set(0, baseClearance + 0.16, halfL + 0.038);
    const horseshoeCore = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 20), darkMat);
    horseshoeCore.rotation.x = Math.PI / 2;
    horseshoeCore.position.set(0, baseClearance + 0.16, halfL + 0.025);
    group.add(horseshoeArch, horseshoeCore);

    for (const hx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.05, halfL + 0.015, 0.36, 0.085, 0.085, ledIceWhiteMat, false);
    }

    const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 1.4), carbonMat);
    dorsalFin.position.set(0, beltlineY + 0.21, -0.75);
    group.add(dorsalFin);
    for (const wx of [-0.17, 0.17]) {
      const w16Manifold = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.65, 8, 14), chromeMat);
      w16Manifold.rotation.x = Math.PI / 2;
      w16Manifold.position.set(wx, beltlineY + 0.045, -0.95);
      group.add(w16Manifold);
    }

    const chironWing = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.94, 0.036, 0.26), carbonMat);
    chironWing.position.set(0, beltlineY + 0.34, -halfL + 0.12);
    for (const sx of [-0.36, 0.36]) {
      const xStrut = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.34, 0.14), carbonMat);
      xStrut.rotation.z = sx > 0 ? -0.25 : 0.25;
      xStrut.position.set(sx, beltlineY + 0.17, -halfL + 0.16);
      group.add(xStrut);
    }
    const chironTailRibbon = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.82, 0.042, 0.08), tailRedMat);
    chironTailRibbon.position.set(0, chassisCenterY + 0.08, -halfL - 0.012);
    group.add(chironWing, chironTailRibbon);

    for (let p = -2.5; p <= 2.5; p += 1) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 12), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(p * 0.088, baseClearance + 0.05, -halfL - 0.05);
      group.add(pipe);
    }
  } else if (style === 'prototype_lmp') {
    // --- PORSCHE 963 LMDh / FERRARI 499P LE MANS HYPERCAR ---
    const carbonFloor = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.96, 0.045, bodyLength * 0.96),
      carbonMat
    );
    carbonFloor.position.set(0, baseClearance, 0);
    group.add(carbonFloor);

    const podCoords: [number, number][] = [
      [-bodyWidth * 0.34, bodyLength * 0.29],
      [bodyWidth * 0.34, bodyLength * 0.29],
      [-bodyWidth * 0.34, -bodyLength * 0.29],
      [bodyWidth * 0.34, -bodyLength * 0.29],
    ];
    podCoords.forEach(([px, pz], idx) => {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.54, bodyHeight + 0.15, 1.36), carClearcoatMat);
      pod.position.set(px, baseClearance + (bodyHeight + 0.15) * 0.5, pz);
      const louver = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.42), carbonMat);
      louver.position.set(px, baseClearance + bodyHeight + 0.155, pz);
      group.add(pod, louver);

      if (idx < 2) {
        addFlushContouredHeadlight(px, beltlineY + 0.03, pz + 0.66, 0.28, 0.11, 0.08, ledIceWhiteMat, false);
      }
    });

    const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.44, 12), carbonMat);
    snorkel.rotation.x = Math.PI / 2;
    snorkel.position.set(0, roofTopY + 0.05, cabinZ - 0.1);
    const lmpSharkFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.44, 1.9), carbonMat);
    lmpSharkFin.position.set(0, beltlineY + 0.32, -1.05);
    const lmpRearWing = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.94, 0.036, 0.32), carbonMat);
    lmpRearWing.position.set(0, beltlineY + 0.44, -halfL + 0.18);
    group.add(snorkel, lmpSharkFin, lmpRearWing);

    for (const ex of [-bodyWidth * 0.47, bodyWidth * 0.47]) {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.5, 0.46), carClearcoatMat);
      endplate.position.set(ex, beltlineY + 0.26, -halfL + 0.16);
      const vertTailLED = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.42, 0.06), tailRedMat);
      vertTailLED.position.set(ex, beltlineY + 0.26, -halfL - 0.02);
      group.add(endplate, vertTailLED);
    }
  } else if (style === 'streamliner') {
    // --- McLAREN SPEEDTAIL LONGTAIL HYPER-GT ---
    for (const fx of [-bodyWidth * 0.485, bodyWidth * 0.485]) {
      const aeroDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.96, wheelRadius * 0.96, 0.04, 28),
        carbonMat
      );
      aeroDisc.rotation.z = Math.PI / 2;
      aeroDisc.position.set(fx, wheelRadius, bodyLength * 0.31);
      const discAccent = new THREE.Mesh(
        new THREE.TorusGeometry(wheelRadius * 0.72, 0.015, 8, 24),
        cyanGlowMat
      );
      discAccent.rotation.y = Math.PI / 2;
      discAccent.position.set(fx > 0 ? fx + 0.022 : fx - 0.022, wheelRadius, bodyLength * 0.31);
      group.add(aeroDisc, discAccent);
    }
    for (const hx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.05, halfL - 0.02, 0.3, 0.08, 0.09, ledIceWhiteMat, false);
    }

    for (const ax of [-0.4, 0.4]) {
      const aileron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.3), carClearcoatMat);
      aileron.rotation.x = 0.2;
      aileron.position.set(ax, beltlineY - 0.04, -halfL + 0.24);
      group.add(aileron);
    }
    const speedtailLED = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.74, 0.034, 0.08), tailRedMat);
    speedtailLED.position.set(0, chassisCenterY + 0.04, -halfL - 0.012);
    group.add(speedtailLED);
  } else if (style === 'land_rocket') {
    // --- ASTON MARTIN VALKYRIE AMR PRO / THRUST SSC SUPERSONIC CAR ---
    const needleNose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.4, 16), carClearcoatMat);
    needleNose.rotation.x = Math.PI / 2;
    needleNose.scale.set(1.2, 1.0, 0.65);
    needleNose.position.set(0, beltlineY - 0.04, halfL - 0.25);
    const f1Wing = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.94, 0.032, 0.36), carbonMat);
    f1Wing.position.set(0, baseClearance + 0.02, halfL + 0.04);
    group.add(needleNose, f1Wing);
    for (const px of [-0.18, 0.18]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.22, 0.16), carbonMat);
      pylon.position.set(px, baseClearance + 0.13, halfL - 0.02);
      group.add(pylon);
    }
    for (const hx of [-bodyWidth * 0.32, bodyWidth * 0.32]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.04, halfL - 0.18, 0.28, 0.075, 0.08, cyanGlowMat, false);
    }

    const goldCowling = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.6, 16), goldMat);
    goldCowling.rotation.x = Math.PI / 2;
    goldCowling.position.set(0, beltlineY + 0.05, -1.15);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.65, 1.3), carClearcoatMat);
    tailFin.position.set(0, beltlineY + 0.4, -halfL + 0.65);
    group.add(goldCowling, tailFin);

    for (const rx of [-0.44, 0.44]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.8, 16), carbonMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(rx, chassisCenterY + 0.04, -halfL - 0.02);
      const glow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 14), cyanGlowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(rx, chassisCenterY + 0.04, -halfL - 0.48);
      group.add(pod, glow);
    }
  } else if (style === 'sonic_jet') {
    // --- LAMBORGHINI EGOISTA STEALTH FIGHTER CONCEPT ---
    for (const px of [-0.56, 0, 0.56]) {
      const prong = new THREE.Mesh(
        new THREE.ConeGeometry(px === 0 ? 0.24 : 0.18, 0.88, 4),
        carClearcoatMat
      );
      prong.rotation.x = Math.PI / 2;
      prong.rotation.y = Math.PI / 4;
      prong.position.set(px, baseClearance + 0.16, halfL - 0.08);
      group.add(prong);
    }
    for (const sx of [-1, 1]) {
      addFlushContouredHeadlight(
        sx * (bodyWidth * 0.31),
        baseClearance + 0.22,
        halfL - 0.08,
        0.3,
        0.075,
        0.08,
        violetGlowMat,
        false
      );
      const sponson = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 2.3), carClearcoatMat);
      sponson.position.set(sx * (bodyWidth * 0.38), chassisCenterY, -0.35);
      const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.54, 0.88), carbonMat);
      vTail.rotation.z = sx * -0.42;
      vTail.position.set(sx * 0.52, beltlineY + 0.26, -halfL + 0.55);
      const jetNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.68, 12), carbonMat);
      jetNozzle.rotation.x = Math.PI / 2;
      jetNozzle.position.set(sx * 0.42, chassisCenterY + 0.04, -halfL - 0.04);
      const jetFlame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.48, 12), violetGlowMat);
      jetFlame.rotation.x = -Math.PI / 2;
      jetFlame.position.set(sx * 0.42, chassisCenterY + 0.04, -halfL - 0.46);
      group.add(sponson, vTail, jetNozzle, jetFlame);
    }
  } else if (style === 'quantum_apex') {
    // --- MERCEDES-BENZ VISION AVTR / RIMAC NEVERA ---
    const frontArc = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.86, 0.042, 0.07), violetGlowMat);
    frontArc.position.set(0, chassisCenterY + 0.05, halfL + 0.032);
    const rearArc = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.86, 0.045, 0.07), violetGlowMat);
    rearArc.position.set(0, chassisCenterY + 0.06, -halfL - 0.012);
    group.add(frontArc, rearArc);
    for (const hx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.05, halfL + 0.012, 0.32, 0.085, 0.08, violetGlowMat, false);
    }

    for (const sx of [-bodyWidth * 0.475, bodyWidth * 0.475]) {
      const sideGlow = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.032, bodyLength * 0.52), violetGlowMat);
      sideGlow.position.set(sx, baseClearance + 0.075, 0);
      group.add(sideGlow);
    }

    for (let row = 0; row < 4; row++) {
      for (const bx of [-0.26, 0, 0.26]) {
        const bionicFlap = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.13), carClearcoatMat);
        bionicFlap.rotation.x = 0.42;
        bionicFlap.position.set(bx, beltlineY + 0.13 - row * 0.03, -0.75 - row * 0.34);
        const flapEdge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.014, 0.025), violetGlowMat);
        flapEdge.position.set(bx, beltlineY + 0.15 - row * 0.03, -0.81 - row * 0.34);
        group.add(bionicFlap, flapEdge);
      }
    }
  } else if (style === 'plasma_gt') {
    // --- BUGATTI BOLIDE TRACK-ONLY X-HYPERCAR ---
    const bolideScoop = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.5, 12), carbonMat);
    bolideScoop.rotation.x = Math.PI / 2;
    bolideScoop.position.set(0, roofTopY + 0.045, cabinZ - 0.05);
    const bolideFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 1.8), carbonMat);
    bolideFin.position.set(0, beltlineY + 0.28, -1.05);
    const bolideWing = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.94, 0.036, 0.32), carbonMat);
    bolideWing.position.set(0, beltlineY + 0.42, -halfL + 0.14);
    group.add(bolideScoop, bolideFin, bolideWing);

    for (const fx of [-bodyWidth * 0.33, bodyWidth * 0.33]) {
      addFlushContouredHeadlight(fx, chassisCenterY + 0.04, halfL - 0.02, 0.3, 0.085, 0.08, cyanGlowMat, false);
    }

    for (const rotZ of [-0.34, 0.34]) {
      const rearXBlade = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.88, 0.048, 0.07), tailRedMat);
      rearXBlade.rotation.z = rotZ;
      rearXBlade.position.set(0, chassisCenterY + 0.09, -halfL - 0.012);
      group.add(rearXBlade);
    }
    for (const ex of [-0.15, -0.05, 0.05, 0.15]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 12), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, chassisCenterY + 0.09, -halfL - 0.04);
      group.add(pipe);
    }
  } else if (style === 'nexus_chrono') {
    // --- DEVEL SIXTEEN / KOENIGSEGG JESKO ABSOLUT 1000 MPH HYPER-TITAN ---
    const triSplitter = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.96, 0.035, 0.24), carbonMat);
    triSplitter.position.set(0, baseClearance + 0.01, halfL + 0.02);
    const goldNoseLip = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.96, 0.018, 0.25), goldMat);
    goldNoseLip.position.set(0, baseClearance + 0.025, halfL + 0.025);
    group.add(triSplitter, goldNoseLip);

    for (const sx of [-1, 1]) {
      addFlushContouredHeadlight(
        sx * (bodyWidth * 0.33),
        chassisCenterY + 0.05,
        halfL - 0.02,
        0.34,
        0.085,
        0.09,
        ledIceWhiteMat,
        false
      );
      const jeskoFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.46, 1.3), carbonMat);
      jeskoFin.position.set(sx * 0.36, beltlineY + 0.26, -halfL + 0.72);
      const finGoldTrim = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.035, 1.31), goldMat);
      finGoldTrim.position.set(sx * 0.36, beltlineY + 0.48, -halfL + 0.72);
      group.add(jeskoFin, finGoldTrim);
    }

    for (const rx of [-0.34, 0.34]) {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.85, 20), carbonMat);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(rx, beltlineY + 0.04, -halfL - 0.02);
      const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.026, 12, 24), goldMat);
      goldRing.position.set(rx, beltlineY + 0.04, -halfL - 0.42);
      const ionCore = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.52, 16), cyanGlowMat);
      ionCore.rotation.x = -Math.PI / 2;
      ionCore.position.set(rx, beltlineY + 0.04, -halfL - 0.58);
      group.add(nacelle, goldRing, ionCore);
    }
    const develTailBar = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.88, 0.042, 0.07), tailRedMat);
    develTailBar.position.set(0, chassisCenterY, -halfL - 0.012);
    group.add(develTailBar);
  } else if (style === 'police_cruiser') {
    // --- DODGE CHARGER PURSUIT HIGHWAY PATROL INTERCEPTOR ---
    for (const sx of [-bodyW * 0.495, bodyW * 0.495]) {
      const doorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, bodyHeight * 0.88, cabinLength * 0.92),
        whitePaintMat
      );
      doorPanel.position.set(sx, chassisCenterY, cabinZ);
      const starShield = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6), goldMat);
      starShield.rotation.z = Math.PI / 2;
      starShield.position.set(sx > 0 ? sx + 0.01 : sx - 0.01, chassisCenterY + 0.04, cabinZ + 0.18);
      group.add(doorPanel, starShield);
    }

    const spotlight = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.11, 12), chromeMat);
    spotlight.rotation.x = Math.PI / 2;
    spotlight.position.set(-bodyWidth * 0.44, beltlineY + 0.14, cabinZ + cabinLength * 0.36);
    const whipAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.62, 8), silverMat);
    whipAntenna.position.set(-0.35, beltlineY + 0.32, -halfL + 0.35);
    group.add(spotlight, whipAntenna);

    const barMount = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.055, 0.25), darkMat);
    barMount.position.set(0, roofTopY + 0.045, cabinZ + 0.05);
    const lightRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.1, 0.21),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    lightRed.position.set(-0.33, roofTopY + 0.1, cabinZ + 0.05);
    const lightBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.1, 0.21),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
    );
    lightBlue.position.set(0.33, roofTopY + 0.1, cabinZ + 0.05);
    const lightCenter = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.11, 0.22),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.9,
      })
    );
    lightCenter.name = 'policeLightBar';
    lightCenter.position.set(0, roofTopY + 0.1, cabinZ + 0.05);
    group.add(barMount, lightRed, lightBlue, lightCenter);
    group.userData.policeLightL = lightRed;
    group.userData.policeLightR = lightBlue;

    const chargerGrille = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.48, 0.15, 0.06), darkMat);
    chargerGrille.position.set(0, chassisCenterY + 0.06, halfL + 0.036);
    group.add(chargerGrille);
    for (const bx of [-0.36, 0.36]) {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.12), matteBlackMat);
      upright.position.set(bx, baseClearance + 0.25, halfL + 0.055);
      group.add(upright);
    }
    for (const ry of [baseClearance + 0.17, baseClearance + 0.38]) {
      const crossRam = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.84, 12), matteBlackMat);
      crossRam.rotation.z = Math.PI / 2;
      crossRam.position.set(0, ry, halfL + 0.065);
      group.add(crossRam);
    }
    for (const hx of [-bodyWidth * 0.32, bodyWidth * 0.32]) {
      addFlushContouredHeadlight(hx, chassisCenterY + 0.06, halfL + 0.018, 0.34, 0.1, 0.085, ledIceWhiteMat, false);
    }
    const chargerTailBar = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.84, 0.11, 0.08), tailRedMat);
    chargerTailBar.position.set(0, chassisCenterY + 0.06, -halfL - 0.012);
    group.add(chargerTailBar);
  } else if (
    style === 'sport_gt_coupe' ||
    style === 'sport_track_sedan' ||
    style === 'sport_aero_fastback' ||
    style === 'sport_apex_coupe'
  ) {
    // --- TRADITIONAL SPORTY TOURING COUPES & PERFORMANCE SEDANS (600 - 1000 MPH) ---
    // Classic road-car silhouettes with two-tone racing stripes, aggressive grilles, multi-color projector headlights & clean sport wings
    for (const sx of [-0.2, 0.2]) {
      const hoodStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.012, bodyLength * 0.36),
        accentPaintMat
      );
      hoodStripe.position.set(sx, beltlineY + 0.012, halfL * 0.48);
      const trunkStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.012, bodyLength * 0.22),
        accentPaintMat
      );
      trunkStripe.position.set(sx, beltlineY + 0.012, -halfL * 0.66);
      group.add(hoodStripe, trunkStripe);
    }

    // Vented Carbon Power-Dome Hood Extractors
    for (const vx of [-0.32, 0.32]) {
      const hoodExtractor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.026, 0.36), carbonMat);
      hoodExtractor.position.set(vx, beltlineY + 0.014, halfL * 0.45);
      const sideFenderVent = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.14, 0.38), carbonMat);
      sideFenderVent.position.set(vx > 0 ? bodyW * 0.49 : -bodyW * 0.49, chassisCenterY + 0.04, halfL * 0.18);
      group.add(hoodExtractor, sideFenderVent);
    }

    // Sport Mesh Radiator Grille with Chrome Surround & Accent Performance Emblem
    const sportGrilleFrame = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.54, 0.2, 0.06),
      chromeMat
    );
    sportGrilleFrame.position.set(0, chassisCenterY + 0.02, halfL + 0.036);
    const sportGrilleCore = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.5, 0.16, 0.068),
      darkMat
    );
    sportGrilleCore.position.copy(sportGrilleFrame.position);
    const sportCrossBar = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.52, 0.026, 0.075),
      accentPaintMat
    );
    sportCrossBar.position.set(0, chassisCenterY + 0.02, halfL + 0.042);
    group.add(sportGrilleFrame, sportGrilleCore, sportCrossBar);

    // Multi-Color Dual-Projector LED Headlights with Ice-Blue & Amber Halos
    for (const hx of [-bodyWidth * 0.32, bodyWidth * 0.32]) {
      addFlushContouredHeadlight(
        hx,
        chassisCenterY + 0.05,
        halfL + 0.02,
        0.35,
        0.11,
        0.09,
        ledIceWhiteMat,
        false
      );
    }

    // Traditional Sport Rear Wing (Low-profile GT wing on faster trims, sleek pedestal spoiler on GT coupe/sedan)
    const wingHeight =
      style === 'sport_apex_coupe' || style === 'sport_aero_fastback' ? 0.22 : 0.12;
    const sportWingBlade = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.86, 0.034, 0.22),
      carbonMat
    );
    sportWingBlade.position.set(0, beltlineY + wingHeight, -halfL + 0.14);
    const sportWingTrim = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.87, 0.014, 0.04),
      accentPaintMat
    );
    sportWingTrim.position.set(0, beltlineY + wingHeight + 0.018, -halfL + 0.04);
    group.add(sportWingBlade, sportWingTrim);

    for (const px of [-0.34, 0.34]) {
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, wingHeight, 0.14),
        carbonMat
      );
      pylon.position.set(px, beltlineY + wingHeight * 0.5, -halfL + 0.15);
      const endplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.14, 0.26),
        accentPaintMat
      );
      endplate.position.set(
        px > 0 ? bodyWidth * 0.43 : -bodyWidth * 0.43,
        beltlineY + wingHeight,
        -halfL + 0.14
      );
      group.add(pylon, endplate);
    }

    // Wrap-Around Multi-Element LED Taillights + Quad Chrome Sport Exhausts
    const rearCenterBar = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.82, 0.042, 0.08),
      tailRedMat
    );
    rearCenterBar.position.set(0, chassisCenterY + 0.07, -halfL - 0.012);
    group.add(rearCenterBar);
    for (const tx of [-bodyWidth * 0.29, bodyWidth * 0.29]) {
      const tlCluster = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.085), tailRedMat);
      tlCluster.position.set(tx, chassisCenterY + 0.07, -halfL - 0.014);
      const tlAmber = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.026, 0.09), amberLightMat);
      tlAmber.position.set(tx, chassisCenterY + 0.035, -halfL - 0.016);
      group.add(tlCluster, tlAmber);
    }
    for (const ex of [-0.46, -0.35, 0.35, 0.46]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.22, 14), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(ex, baseClearance + 0.04, -halfL - 0.045);
      group.add(pipe);
    }
  }

  // ============================================================================
  // 4. EMBOSSED CALIFORNIA LICENSE PLATES & AERODYNAMIC SIDE MIRRORS / DOOR HANDLES
  // ============================================================================
  const plateMat = new THREE.MeshBasicMaterial({ map: getLicensePlateTexture('SIMULATOR') });
  const fPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.17), plateMat);
  fPlate.position.set(0, baseClearance + 0.11, halfL + 0.075);
  const rPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.17), plateMat);
  rPlate.rotation.y = Math.PI;
  rPlate.position.set(0, baseClearance + 0.12, -halfL - 0.045);
  group.add(fPlate, rPlate);

  // Side Mirrors (Contrasting accent/white/carbon mirror caps; vintage_coupe already has fender bullet mirrors)
  if (style !== 'vintage_coupe') {
    const mirrorMat =
      style === 'compact_hatch'
        ? whitePaintMat
        : style === 'track_gt3' || style === 'hypercar' || style === 'prototype_lmp'
        ? carbonMat
        : accentPaintMat;
    for (const sx of [-bodyWidth * 0.48, bodyWidth * 0.48]) {
      const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.09, 8), matteBlackMat);
      mirrorStem.rotation.z = Math.PI / 2;
      mirrorStem.position.set(sx > 0 ? sx + 0.04 : sx - 0.04, beltlineY + 0.05, cabinZ + cabinLength * 0.32);
      const mirrorHead = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), mirrorMat);
      mirrorHead.scale.set(1.1, 0.65, 0.55);
      mirrorHead.position.set(sx > 0 ? sx + 0.09 : sx - 0.09, beltlineY + 0.06, cabinZ + cabinLength * 0.32);
      group.add(mirrorStem, mirrorHead);

      const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.11, 6, 12), chromeMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(sx > 0 ? sx + 0.015 : sx - 0.015, beltlineY - 0.09, cabinZ - 0.05);
      group.add(handle);
    }
  }

  // ============================================================================
  // 5. MODEL-AUTHENTIC WHEELS, TIRES, SPOKE DESIGNS & BREMBO BRAKE ASSEMBLIES
  // ============================================================================
  const wheels: THREE.Mesh[] = [];
  const caliperMat = getStandardMat(
    style === 'track_gt3' ||
      style === 'nexus_chrono' ||
      style === 'sport_aero_fastback' ||
      style === 'sport_apex_coupe'
      ? '#eab308'
      : '#dc2626',
    0.3,
    0.2
  );
  const brakeDiscMat = getStandardMat('#94a3b8', 0.25, 0.85);
  const rubberTireMat = getStandardMat('#111318', 0.82, 0.08);

  const wheelPositions = [
    [-bodyWidth * 0.48, wheelRadius, bodyLength * 0.31],
    [bodyWidth * 0.48, wheelRadius, bodyLength * 0.31],
    [-bodyWidth * 0.48, wheelRadius, -bodyLength * 0.31],
    [bodyWidth * 0.48, wheelRadius, -bodyLength * 0.31],
  ];

  const rimMat =
    style === 'exotic_wedge' ||
    style === 'nexus_chrono' ||
    style === 'land_rocket' ||
    style === 'sport_apex_coupe'
      ? goldMat
      : style === 'cybertruck' || style === 'hot_hatch' || style === 'sonic_jet' || style === 'police_cruiser'
      ? matteBlackMat
      : style === 'aeropod' || style === 'streamliner' || style === 'track_gt3'
      ? carbonMat
      : chromeMat;

  const spokeCount =
    style === 'vintage_coupe'
      ? 12 // Classic DB5 multi-spoke wire wheels
      : style === 'sedan' ||
        style === 'hot_hatch' ||
        style === 'track_gt3' ||
        style === 'nexus_chrono' ||
        style === 'sport_gt_coupe' ||
        style === 'sport_track_sedan' ||
        style === 'sport_aero_fastback' ||
        style === 'sport_apex_coupe'
      ? 10 // Motorsport 10-spoke forged rims
      : style === 'compact_hatch' || style === 'aeropod' || style === 'cybertruck'
      ? 8 // 8-spoke / octagonal rims
      : 5;

  const archMat =
    style === 'compact_hatch' || style === 'wagon' || style === 'cybertruck'
      ? matteBlackMat
      : carClearcoatMat;

  wheelPositions.forEach(([wx, wy, wz]) => {
    // Deep Recessed Dark Wheel-Well Liner Housing + Sculpted 3D Fender Arch Lip
    const wheelWellRecess = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius + 0.045, wheelRadius + 0.045, wheelWidth * 1.15, 24),
      darkMat
    );
    wheelWellRecess.rotation.z = Math.PI / 2;
    wheelWellRecess.position.set(wx > 0 ? wx - 0.08 : wx + 0.08, wy + 0.01, wz);
    group.add(wheelWellRecess);

    const archFlare = new THREE.Mesh(
      new THREE.TorusGeometry(
        wheelRadius + 0.045,
        0.056,
        14,
        style === 'cybertruck' ? 6 : 28,
        Math.PI
      ),
      archMat
    );
    archFlare.rotation.y = Math.PI / 2;
    archFlare.scale.set(1.06, 1.0, 1.25);
    archFlare.position.set(wx > 0 ? wx - 0.035 : wx + 0.035, wy, wz);
    group.add(archFlare);

    // 1. Main Wheel Mesh (with rounded tire shoulder + alloy spokes attached as children so they spin together!)
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius * 0.94, wheelRadius * 0.94, wheelWidth * 0.82, 28);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wheelGeo, rubberTireMat);
    // Use 'YXZ' rotation order so steering (Y) pivots cleanly around the vertical kingpin axis while rolling (X) spins around the wheel axle with zero wobble!
    wheel.rotation.order = 'YXZ';
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;

    // Rounded Tire Torus Sidewall for realistic non-blocky tire profile
    for (const sideOffset of [-wheelWidth * 0.26, wheelWidth * 0.26]) {
      const tireShoulder = new THREE.Mesh(
        new THREE.TorusGeometry(wheelRadius - 0.065, 0.068, 14, 28),
        rubberTireMat
      );
      tireShoulder.rotation.y = Math.PI / 2;
      tireShoulder.position.x = sideOffset;
      wheel.add(tireShoulder);
    }

    // Deep-Dish Alloy Rim Lip
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(
        wheelRadius * 0.66,
        wheelRadius * 0.66,
        wheelWidth * 0.88,
        style === 'cybertruck' ? 8 : 24
      ),
      rimMat
    );
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);



    // Sculpted Alloy Wheel Spokes
    for (let sp = 0; sp < spokeCount; sp++) {
      const spAngle = (sp / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.CapsuleGeometry(spokeCount >= 10 ? 0.015 : 0.022, wheelRadius * 1.1, 6, 10),
        rimMat
      );
      spoke.rotation.x = spAngle;
      spoke.position.x = wx > 0 ? wheelWidth * 0.45 : -wheelWidth * 0.45;
      wheel.add(spoke);
    }

    // Center Hub Cap (Chrome dog-dish hubcap on Police Cruiser & Knock-off spinner on Vintage Coupe)
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.22, wheelRadius * 0.22, wheelWidth * 0.95, 16),
      style === 'police_cruiser' || style === 'vintage_coupe' ? chromeMat : rimMat
    );
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);

    group.add(wheel);
    wheels.push(wheel);

    // Stationary Brake Rotor & Brembo Caliper
    const rotor = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.5, wheelRadius * 0.5, 0.02, 20),
      brakeDiscMat
    );
    rotor.position.set(wx > 0 ? wx - 0.05 : wx + 0.05, wy, wz);
    rotor.rotation.z = Math.PI / 2;
    group.add(rotor);

    const caliper = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, wheelRadius * 0.24, 6, 10), caliperMat);
    caliper.position.set(wx > 0 ? wx - 0.05 : wx + 0.05, wy + wheelRadius * 0.18, wz + wheelRadius * 0.22);
    group.add(caliper);
  });

  return { group, wheels };
}

/**
 * Procedural Realistic 3D Helicopter Generator
 * Authentic rotorcraft engineering with:
 * - Crystal-clear see-through front windshields, side doors, passenger cabin, and lower chin windows
 * - Fully modeled cockpit interiors (pilot/copilot seats, instrument panel MFDs, cyclic & collective controls, rudder pedals)
 * - Authentic dual-tone liveries with matte-black anti-glare nose decks, contrasting belly skiffs & speed stripes
 * - Securely attached airframe components: fuselage-to-tailboom transitions, welded skid mounting saddles, rotor pitch links
 * - Authentic aviation lighting (flush port red / starboard green navigation lights, tail white position light, subtle beacon)
 * - 4 distinct models: 'scout' (Robinson R44), 'twin_turbine' (Airbus H145), 'apache' (AH-64E Longbow), 'gunship' (X-99 Compound)
 */
export function buildHelicopter3DModel(
  style: string = 'scout',
  colorHex: string = '#0284c7',
  accentHex: string = '#38bdf8'
): {
  group: THREE.Group;
  mainRotor: THREE.Group;
  tailRotor: THREE.Group;
  beaconLight: THREE.PointLight;
} {
  const group = new THREE.Group();
  const isMilitary = style === 'apache' || style === 'gunship';
  const isApache = style === 'apache';
  const isGunship = style === 'gunship';
  const isTwin = style === 'twin_turbine';

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: isMilitary ? 0.38 : 0.16,
    metalness: isMilitary ? 0.45 : 0.28,
    clearcoat: isMilitary ? 0.25 : 0.98,
    clearcoatRoughness: 0.06,
    side: THREE.DoubleSide,
  });

  const contrastBellyHex = isMilitary
    ? '#111827'
    : colorHex.toLowerCase() === '#f8fafc' || colorHex.toLowerCase() === '#ffffff'
    ? '#1e293b'
    : '#f8fafc';
  const bellyMat = getStandardMat(contrastBellyHex, 0.22, 0.35);
  const accentMat = getStandardMat(accentHex, 0.25, 0.45);
  const darkMetal = getStandardMat('#1e293b', 0.35, 0.78);
  const gunmetalMat = getStandardMat('#334155', 0.32, 0.72);
  const titaniumMat = getStandardMat('#64748b', 0.26, 0.82);
  const chromeMat = getStandardMat('#e2e8f0', 0.12, 0.94);
  const skidMat = getStandardMat('#334155', 0.26, 0.82);
  const carbonMat = getStandardMat('#0b0f19', 0.3, 0.6);
  const tipYellowMat = getStandardMat('#facc15', 0.32, 0.22);
  const tireMat = getStandardMat('#111827', 0.88, 0.08);
  const seatFabricMat = getStandardMat('#1e293b', 0.72, 0.12);
  const gasketMat = getStandardMat('#0b0f19', 0.85, 0.05);

  // Crystal-clear polarized aviation canopy acrylic (100% transparent into cockpit interior!)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: isMilitary ? 0x8ea3b5 : 0xd8eeff,
    transparent: true,
    opacity: isMilitary ? 0.38 : 0.24,
    roughness: 0.02,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    depthWrite: false, // Prevents z-fighting and rendering artifacts
    side: THREE.DoubleSide,
  });

  const mainRotor = new THREE.Group();
  const tailRotor = new THREE.Group();
  const canopyGroup = new THREE.Group();
  canopyGroup.name = 'cockpitCanopy';
  group.add(canopyGroup);

  // Helper: solidly connect two 3D points with a structural tubular strut (guaranteed zero floating!)
  const buildFrameStrut = (
    p1: [number, number, number],
    p2: [number, number, number],
    radius: number,
    mat: THREE.Material
  ) => {
    const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
    const v2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
    const dir = new THREE.Vector3().subVectors(v2, v1);
    const len = dir.length();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, Math.max(0.01, len), 12),
      mat
    );
    mesh.position.copy(v1).addScaledVector(dir, 0.5);
    if (len > 0.0001) {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Helper: Build a tapered aerodynamic airfoil surface (horizontal stabilizers & tail fins)
  const buildAerodynamicAirfoilFin = (
    rootChord: number,
    tipChord: number,
    span: number,
    sweepBackZ: number,
    thickness: number,
    mat: THREE.Material
  ): THREE.Mesh => {
    const shape = new THREE.Shape();
    const rLead = rootChord * 0.5;
    const rTrail = -rootChord * 0.5;
    const tLead = tipChord * 0.5 - sweepBackZ;
    const tTrail = -tipChord * 0.5 - sweepBackZ;

    shape.moveTo(0, rTrail);
    shape.lineTo(span, tTrail);
    shape.lineTo(span, tLead);
    shape.lineTo(0, rLead);
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: thickness * 0.25,
      bevelThickness: thickness * 0.25,
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Station Interface for continuous lofted fuselage
  interface HeliStation {
    z: number;
    y: number;
    w: number;
    hTop: number;
    hBot: number;
    roundness?: number; // 1 = smooth ellipse, <1 = faceted chined
  }

  // Builder for a single continuous, completely connected, smoothly shaded monocoque fuselage
  const buildContinuousFuselageMesh = (
    stations: HeliStation[],
    mat: THREE.Material,
    radialSegs: number = 24
  ): THREE.Mesh => {
    const positions: number[] = [];
    const indices: number[] = [];

    // Generate ring vertices for each station
    for (let s = 0; s < stations.length; s++) {
      const st = stations[s];
      const pExp = st.roundness ?? 1.0;

      for (let r = 0; r < radialSegs; r++) {
        const phi = (r / radialSegs) * Math.PI * 2;
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);

        // Super-elliptical shaping factor
        const xSign = Math.sign(sinP);
        const ySign = Math.sign(cosP);
        const px = st.w * xSign * Math.pow(Math.abs(sinP), pExp);
        const hRad = cosP >= 0 ? st.hTop : st.hBot;
        const py = st.y + hRad * ySign * Math.pow(Math.abs(cosP), pExp);
        const pz = st.z;

        positions.push(px, py, pz);
      }
    }

    // Connect stations with quad strips (2 triangles per segment)
    for (let s = 0; s < stations.length - 1; s++) {
      const ringA = s * radialSegs;
      const ringB = (s + 1) * radialSegs;

      for (let r = 0; r < radialSegs; r++) {
        const nextR = (r + 1) % radialSegs;
        const a0 = ringA + r;
        const a1 = ringA + nextR;
        const b0 = ringB + r;
        const b1 = ringB + nextR;

        indices.push(a0, b0, a1);
        indices.push(a1, b0, b1);
      }
    }

    // Cap front nose tip smoothly
    const noseTipZ = stations[0].z + (stations[0].w > 0.1 ? 0.25 : 0.05);
    const noseTipIdx = positions.length / 3;
    positions.push(0, stations[0].y, noseTipZ);
    for (let r = 0; r < radialSegs; r++) {
      const nextR = (r + 1) % radialSegs;
      indices.push(noseTipIdx, r, nextR);
    }

    // Cap aft tailboom smoothly
    const lastSt = stations[stations.length - 1];
    const tailTipZ = lastSt.z - 0.1;
    const tailTipIdx = positions.length / 3;
    positions.push(0, lastSt.y, tailTipZ);
    const lastRing = (stations.length - 1) * radialSegs;
    for (let r = 0; r < radialSegs; r++) {
      const nextR = (r + 1) % radialSegs;
      indices.push(tailTipIdx, lastRing + nextR, lastRing + r);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const addDetailedFlightDeck = (_isTandem: boolean, _floorY: number, _frontZ: number) => {};

  // Helper: Build a realistic smooth compound-curved bubble canopy shell for slower civilian helicopters
  const buildRealisticCurvedCanopy = (
    canopyStations: Array<{ z: number; yBot: number; yTop: number; w: number; curve: number }>,
    mat: THREE.Material
  ): THREE.Mesh => {
    const segsU = canopyStations.length - 1;
    const segsV = 16;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let u = 0; u <= segsU; u++) {
      const st = canopyStations[u];
      for (let v = 0; v <= segsV; v++) {
        const f = v / segsV; // 0 (left sill) -> 0.5 (top brow) -> 1 (right sill)
        const phi = (f - 0.5) * Math.PI; // -PI/2 to PI/2
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);

        const px = st.w * sinP;
        const curH = st.yTop - st.yBot;
        // Sculpted aerodynamic arch
        const py = st.yBot + Math.pow(Math.max(0, cosP), st.curve) * curH;
        const pz = st.z;
        positions.push(px, py, pz);
      }
    }

    const stride = segsV + 1;
    for (let u = 0; u < segsU; u++) {
      for (let v = 0; v < segsV; v++) {
        const a = u * stride + v;
        const b = a + 1;
        const c = (u + 1) * stride + v;
        const d = c + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.renderOrder = 10;
    return mesh;
  };

  // ---------------------------------------------------------------------------
  // 1. SCOUT HELICOPTER (Robinson R44 / Bell 407 Observation Style) - Clean & Uncluttered
  // ---------------------------------------------------------------------------
  if (style === 'scout') {
    const scoutStations: HeliStation[] = [
      { z: 2.35, y: 1.30, w: 0.12, hTop: 0.14, hBot: 0.12 },
      { z: 2.05, y: 1.36, w: 0.52, hTop: 0.32, hBot: 0.34 },
      { z: 1.55, y: 1.44, w: 0.84, hTop: 0.42, hBot: 0.44 },
      { z: 0.85, y: 1.54, w: 0.98, hTop: 0.54, hBot: 0.48 },
      { z: 0.05, y: 1.62, w: 1.02, hTop: 0.84, hBot: 0.52 },
      { z: -0.85, y: 1.68, w: 0.88, hTop: 0.78, hBot: 0.48 },
      { z: -1.75, y: 1.76, w: 0.64, hTop: 0.60, hBot: 0.38 },
      { z: -2.65, y: 1.86, w: 0.42, hTop: 0.38, hBot: 0.30 },
      { z: -3.85, y: 1.98, w: 0.26, hTop: 0.26, hBot: 0.24 },
      { z: -5.05, y: 2.10, w: 0.18, hTop: 0.20, hBot: 0.18 },
      { z: -6.15, y: 2.22, w: 0.14, hTop: 0.16, hBot: 0.14 },
      { z: -6.75, y: 2.30, w: 0.08, hTop: 0.24, hBot: 0.12 },
    ];

    const fuselageMesh = buildContinuousFuselageMesh(scoutStations, bodyMat, 28);
    group.add(fuselageMesh);

    // Pristine wrap-around bubble canopy (Zero protruding boxes or floating lines)
    const scoutCanopy = buildRealisticCurvedCanopy(
      [
        { z: 2.05, yBot: 1.42, yTop: 1.72, w: 0.48, curve: 0.85 },
        { z: 1.65, yBot: 1.48, yTop: 2.08, w: 0.78, curve: 0.90 },
        { z: 1.15, yBot: 1.54, yTop: 2.28, w: 0.92, curve: 0.92 },
        { z: 0.45, yBot: 1.58, yTop: 2.32, w: 0.96, curve: 0.95 },
      ],
      glassMat
    );
    canopyGroup.add(scoutCanopy);

    // Clean lower chin observation glass (flush conformal panels)
    for (const sx of [-0.34, 0.34]) {
      const chinBubble = buildRealisticCurvedCanopy(
        [
          { z: 2.15, yBot: 1.22, yTop: 1.42, w: 0.18, curve: 0.9 },
          { z: 1.75, yBot: 1.18, yTop: 1.46, w: 0.22, curve: 0.9 },
        ],
        glassMat
      );
      chinBubble.position.x = sx;
      canopyGroup.add(chinBubble);
    }


    // Subtle skylight eyebrow panes
    for (const sx of [-0.32, 0.32]) {
      const eyebrow = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.44), glassMat);
      eyebrow.position.set(sx, 2.34, 0.75);
      eyebrow.rotation.x = -Math.PI / 2 + 0.22;
      eyebrow.rotation.z = Math.sign(sx) * 0.12;
      canopyGroup.add(eyebrow);
    }

    // Detailed interior cockpit
    addDetailedFlightDeck(false, 1.15, 1.15);

    // Sculpted rooftop turbine doghouse & intake
    const doghouseGeo = new THREE.CylinderGeometry(0.32, 0.44, 1.85, 18);
    doghouseGeo.rotateX(Math.PI / 2);
    const doghouse = new THREE.Mesh(doghouseGeo, bodyMat);
    doghouse.scale.set(1.12, 0.70, 1.0);
    doghouse.position.set(0, 2.34, -0.45);
    doghouse.castShadow = true;
    group.add(doghouse);

    const intakeLip = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.32, 16), darkMetal);
    intakeLip.rotation.x = Math.PI / 2;
    intakeLip.position.set(0, 2.48, 0.35);
    group.add(intakeLip);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.44, 16), chromeMat);
    exhaust.rotation.x = Math.PI / 2 + 0.32;
    exhaust.position.set(0, 2.42, -1.35);
    group.add(exhaust);

    // Empennage & Rotor
    const hStab = buildAerodynamicAirfoilFin(0.42, 0.28, 1.75, 0.14, 0.038, accentMat);
    hStab.rotation.y = Math.PI / 2;
    hStab.position.set(0, 2.18, -5.65);
    group.add(hStab);

    for (const sx of [-0.85, 0.85]) {
      const endplate = buildAerodynamicAirfoilFin(0.38, 0.24, 0.48, 0.12, 0.024, bodyMat);
      endplate.rotation.x = -Math.PI / 2;
      endplate.position.set(sx, 2.18, -5.65);
      group.add(endplate);
    }

    const vFin = buildAerodynamicAirfoilFin(0.72, 0.35, 1.55, 0.38, 0.052, bodyMat);
    vFin.position.set(0, 2.85, -6.65);
    group.add(vFin);

    tailRotor.position.set(0.12, 2.35, -6.65);
    const trGearbox = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 14), titaniumMat);
    trGearbox.rotation.z = Math.PI / 2;
    tailRotor.add(trGearbox);
    const trBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.35, 0.13), carbonMat);
    tailRotor.add(trBlade);
    group.add(tailRotor);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.85, 16), darkMetal);
    mast.position.set(0, 2.82, 0.15);
    mast.castShadow = true;
    group.add(mast);

    const swashplate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), titaniumMat);
    swashplate.position.set(0, 2.92, 0.15);
    group.add(swashplate);

    mainRotor.position.set(0, 3.25, 0.15);
    const rHub = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.24), darkMetal);
    mainRotor.add(rHub);
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.022, 4.6), carbonMat);
      blade.position.set(0, 0.02, side * 2.5);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.245, 0.024, 0.4), tipYellowMat);
      tip.position.set(0, 0.02, side * 4.7);
      mainRotor.add(blade, tip);
    }
    group.add(mainRotor);

    // Skids
    for (const sx of [-1.15, 1.15]) {
      const skidTube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.9, 16), skidMat);
      skidTube.rotation.x = Math.PI / 2;
      skidTube.position.set(sx, 0.14, 0.25);
      skidTube.castShadow = true;
      const skidTip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 16), skidMat);
      skidTip.position.set(sx, 0.28, 2.35);
      skidTip.rotation.x = Math.PI / 2 - 0.65;
      group.add(skidTube, skidTip);

      group.add(
        buildFrameStrut([sx * 0.48, 1.05, 1.15], [sx, 0.14, 1.15], 0.042, skidMat),
        buildFrameStrut([sx * 0.48, 1.05, -0.65], [sx, 0.14, -0.65], 0.042, skidMat)
      );
    }

  // ---------------------------------------------------------------------------
  // 2. TWIN TURBINE (Airbus H145 / EC135 Executive Rotorcraft) - Clean & Uncluttered
  // ---------------------------------------------------------------------------
  } else if (isTwin) {
    const twinStations: HeliStation[] = [
      { z: 2.65, y: 1.36, w: 0.12, hTop: 0.12, hBot: 0.12 },
      { z: 2.30, y: 1.42, w: 0.58, hTop: 0.36, hBot: 0.38 },
      { z: 1.70, y: 1.50, w: 0.96, hTop: 0.48, hBot: 0.46 },
      { z: 0.95, y: 1.60, w: 1.16, hTop: 0.58, hBot: 0.52 },
      { z: 0.10, y: 1.68, w: 1.22, hTop: 0.94, hBot: 0.60 },
      { z: -0.90, y: 1.74, w: 1.14, hTop: 0.90, hBot: 0.56 },
      { z: -1.90, y: 1.84, w: 0.86, hTop: 0.74, hBot: 0.46 },
      { z: -2.90, y: 1.96, w: 0.54, hTop: 0.50, hBot: 0.36 },
      { z: -4.20, y: 2.10, w: 0.32, hTop: 0.34, hBot: 0.26 },
      { z: -5.50, y: 2.24, w: 0.22, hTop: 0.24, hBot: 0.20 },
      { z: -6.70, y: 2.38, w: 0.16, hTop: 0.20, hBot: 0.16 },
      { z: -7.50, y: 2.50, w: 0.10, hTop: 0.32, hBot: 0.14 },
    ];

    const fuselageMesh = buildContinuousFuselageMesh(twinStations, bodyMat, 28);
    group.add(fuselageMesh);

    // Pristine executive panoramic windshield
    const twinCanopy = buildRealisticCurvedCanopy(
      [
        { z: 2.30, yBot: 1.48, yTop: 1.82, w: 0.56, curve: 0.88 },
        { z: 1.80, yBot: 1.54, yTop: 2.18, w: 0.92, curve: 0.92 },
        { z: 1.25, yBot: 1.62, yTop: 2.40, w: 1.12, curve: 0.94 },
        { z: 0.50, yBot: 1.66, yTop: 2.44, w: 1.18, curve: 0.96 },
      ],
      glassMat
    );
    canopyGroup.add(twinCanopy);

    // Clean lower chin observation windows
    for (const sx of [-0.40, 0.40]) {
      const chinBubble = buildRealisticCurvedCanopy(
        [
          { z: 2.35, yBot: 1.28, yTop: 1.48, w: 0.22, curve: 0.9 },
          { z: 1.95, yBot: 1.24, yTop: 1.52, w: 0.26, curve: 0.9 },
        ],
        glassMat
      );
      chinBubble.position.x = sx;
      canopyGroup.add(chinBubble);
    }


    addDetailedFlightDeck(false, 1.25, 1.45);

    // Dual turboshaft engine cowlings
    for (const sx of [-0.44, 0.44]) {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.85, 16), bodyMat);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(sx, 2.50, -0.45);
      nacelle.castShadow = true;
      group.add(nacelle);

      const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.45, 16), darkMetal);
      intake.rotation.x = Math.PI / 2;
      intake.position.set(sx, 2.54, 0.45);
      group.add(intake);

      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.65, 16), titaniumMat);
      exhaust.rotation.x = Math.PI / 2 + 0.24;
      exhaust.rotation.y = Math.sign(sx) * 0.16;
      exhaust.position.set(sx, 2.50, -1.45);
      group.add(exhaust);
    }

    // Empennage & Rotor
    const hStab = buildAerodynamicAirfoilFin(0.48, 0.32, 2.35, 0.16, 0.045, accentMat);
    hStab.rotation.y = Math.PI / 2;
    hStab.position.set(0, 2.38, -6.85);
    group.add(hStab);

    for (const sx of [-1.15, 1.15]) {
      const winglet = buildAerodynamicAirfoilFin(0.42, 0.26, 0.68, 0.14, 0.035, accentMat);
      winglet.rotation.x = -Math.PI / 2;
      winglet.position.set(sx, 2.48, -6.85);
      group.add(winglet);
    }

    const upperFin = buildAerodynamicAirfoilFin(0.85, 0.42, 1.65, 0.35, 0.065, bodyMat);
    upperFin.position.set(0, 3.15, -7.45);
    group.add(upperFin);

    tailRotor.position.set(0.14, 2.65, -7.45);
    const trHub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 16), chromeMat);
    trHub.rotation.z = Math.PI / 2;
    tailRotor.add(trHub);
    const trBlade = new THREE.Mesh(new THREE.BoxGeometry(0.022, 1.55, 0.13), carbonMat);
    tailRotor.add(trBlade);
    group.add(tailRotor);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.75, 18), darkMetal);
    mast.position.set(0, 3.05, 0.15);
    mast.castShadow = true;
    group.add(mast);

    const swashplate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.10, 18), titaniumMat);
    swashplate.position.set(0, 3.15, 0.15);
    group.add(swashplate);

    mainRotor.position.set(0, 3.45, 0.15);
    const beanie = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.14, 20), darkMetal);
    mainRotor.add(beanie);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.024, 4.8), carbonMat);
      blade.position.set(0, 0.02, 2.6);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.285, 0.026, 0.42), tipYellowMat);
      tip.position.set(0, 0.02, 4.85);
      arm.add(blade, tip);
      mainRotor.add(arm);
    }
    group.add(mainRotor);

    // Skids
    for (const sx of [-1.25, 1.25]) {
      const skidTube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.8, 16), skidMat);
      skidTube.rotation.x = Math.PI / 2;
      skidTube.position.set(sx, 0.14, 0.35);
      skidTube.castShadow = true;
      const skidTip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.65, 16), skidMat);
      skidTip.position.set(sx, 0.32, 2.95);
      skidTip.rotation.x = Math.PI / 2 - 0.65;
      group.add(skidTube, skidTip);

      group.add(
        buildFrameStrut([sx * 0.55, 1.12, 1.25], [sx, 0.14, 1.25], 0.048, skidMat),
        buildFrameStrut([sx * 0.55, 1.12, -0.85], [sx, 0.14, -0.85], 0.048, skidMat)
      );

      const ghWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 14), tireMat);
      ghWheel.rotation.z = Math.PI / 2;
      ghWheel.position.set(sx, 0.14, -0.25);
      group.add(ghWheel);
    }

  // ---------------------------------------------------------------------------
  // 3 & 4. THE TWO FAST ONES: AH-64 Apache & X-99 Compound Stealth Gunship
  // (NO BALL ON THE FRONT! Sharp aerodynamic chined nose & integrated faceted canopy!)
  // ---------------------------------------------------------------------------
  } else {
    // 12 Connected Stations forming a chiseled armored military attack fuselage
    // (NO BALL ON THE NOSE! Sharp aerodynamic chined radome nose contour!)
    const militaryStations: HeliStation[] = [
      { z: 3.75, y: 1.35, w: 0.08, hTop: 0.08, hBot: 0.08, roundness: 0.82 }, // Sharp chined nose tip (NO BALL!)
      { z: 3.15, y: 1.40, w: 0.46, hTop: 0.34, hBot: 0.32, roundness: 0.84 }, // Forward sensor bay radome
      { z: 2.35, y: 1.50, w: 0.84, hTop: 0.56, hBot: 0.42, roundness: 0.86 }, // Gunner cockpit station
      { z: 1.45, y: 1.62, w: 1.10, hTop: 0.76, hBot: 0.48, roundness: 0.86 }, // Intermediate canopy arch
      { z: 0.65, y: 1.72, w: 1.20, hTop: 0.92, hBot: 0.52, roundness: 0.86 }, // Pilot elevated rear cockpit
      { z: -0.25, y: 1.78, w: 1.24, hTop: 0.94, hBot: 0.54, roundness: 0.86 }, // Rotor mast firewall
      { z: -1.25, y: 1.82, w: 1.14, hTop: 0.84, hBot: 0.50, roundness: 0.86 }, // Twin engine bay
      { z: -2.35, y: 1.90, w: 0.82, hTop: 0.68, hBot: 0.42, roundness: 0.86 }, // Aft fuselage taper
      { z: -3.55, y: 2.00, w: 0.52, hTop: 0.48, hBot: 0.34, roundness: 0.86 }, // Tailboom transition
      { z: -4.95, y: 2.12, w: 0.34, hTop: 0.36, hBot: 0.28, roundness: 0.86 }, // Mid tailboom
      { z: -6.35, y: 2.25, w: 0.22, hTop: 0.26, hBot: 0.20, roundness: 0.86 }, // Aft tailboom
      { z: -7.55, y: 2.38, w: 0.12, hTop: 0.36, hBot: 0.16, roundness: 0.86 }, // Vertical fin root
    ];

    // Single unified continuous chiseled monocoque fuselage shell
    const fuselageMesh = buildContinuousFuselageMesh(militaryStations, bodyMat, 24);
    group.add(fuselageMesh);

    // Sharp Forward Air-Data Pitot Probe extending cleanly from nose tip (NO BALL!)
    const pitotProbe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.85, 10), darkMetal);
    pitotProbe.rotation.x = Math.PI / 2;
    pitotProbe.position.set(0, 1.35, 4.15);
    group.add(pitotProbe);

    // Flush Faceted Optical Sensor Windows embedded into angled nose facets (NO PROTRUDING BALL!)
    for (const sx of [-0.18, 0.18]) {
      const sensorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.18), darkMetal);
      sensorGlass.position.set(sx, 1.44, 3.42);
      sensorGlass.rotation.x = -0.55;
      sensorGlass.rotation.y = Math.sign(sx) * 0.35;
      const sensorBezel = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.12, 4), titaniumMat);
      sensorBezel.position.set(sx, 1.44, 3.42);
      sensorBezel.rotation.x = -0.55;
      sensorBezel.rotation.y = Math.sign(sx) * 0.35;
      group.add(sensorGlass, sensorBezel);
    }

    // Extended Forward Avionics Bays (EFABs / cheek sponsons) with blended aerodynamic shoulders
    // Tapered forward and aft so they flow organically into the airframe!
    for (const sx of [-0.85, 0.85]) {
      const efabGeo = new THREE.BoxGeometry(0.42, 0.64, 3.1);
      const efab = new THREE.Mesh(efabGeo, bodyMat);
      efab.position.set(sx, 1.48, 0.45);
      efab.castShadow = true;
      group.add(efab);

      // Tapered forward chamfer wedge to blend EFAB into forward gunner sill
      const chamferForward = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.65, 4),
        bodyMat
      );
      chamferForward.rotation.x = Math.PI / 2;
      chamferForward.rotation.z = Math.PI / 4;
      chamferForward.position.set(sx, 1.48, 2.25);
      group.add(chamferForward);

      // Cooling louver slats on EFAB flanks
      for (let l = 0; l < 4; l++) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.28), darkMetal);
        louver.position.set(sx * 1.08, 1.55, 0.85 - l * 0.35);
        group.add(louver);
      }
    }

    // Stepped tandem cockpit interior & armored canopy
    addDetailedFlightDeck(true, 1.28, 2.15);

    // Sculpted Faceted Ballistic Tandem Canopy
    // Forward CPG Gunner Windscreen (Integrated faceted raked glass)
    const frontCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.56, 1.32), glassMat);
    frontCanopy.position.set(0, 1.94, 1.95);
    frontCanopy.rotation.x = 0.26;
    canopyGroup.add(frontCanopy);

    // Elevated Pilot Rear Canopy
    const rearCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.66, 1.42), glassMat);
    rearCanopy.position.set(0, 2.24, 0.55);
    rearCanopy.rotation.x = 0.12;
    canopyGroup.add(rearCanopy);

    // Rollover protection armor bulkhead between crew
    const bulkhead = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.70, 0.10), darkMetal);
    bulkhead.position.set(0, 2.18, 1.25);
    canopyGroup.add(bulkhead);

    // Dark Armor Mullions Framing the Canopy Facets
    for (const sx of [-0.43, 0.43]) {
      const frameA = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 1.42, 8), darkMetal);
      frameA.position.set(sx, 1.94, 1.95);
      frameA.rotation.x = 0.26;
      const frameB = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 1.52, 8), darkMetal);
      frameB.position.set(sx * 1.06, 2.24, 0.55);
      frameB.rotation.x = 0.12;
      canopyGroup.add(frameA, frameB);
    }

    // Chin-mounted M230 30mm automatic chain gun on 360-degree gimbal turret with curved ammo chute
    const gunSwivel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.22, 14), gunmetalMat);
    gunSwivel.position.set(0, 0.95, 2.25);
    const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 1.65, 12), darkMetal);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.88, 3.05);
    const muzzleHider = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 12), titaniumMat);
    muzzleHider.rotation.x = Math.PI / 2;
    muzzleHider.position.set(0, 0.88, 3.85);
    const ammoChute = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.65), darkMetal);
    ammoChute.position.set(0.12, 1.05, 2.05);
    group.add(gunSwivel, gunBarrel, muzzleHider, ammoChute);

    // Twin GE T700 turboshaft engines on fuselage flanks with Black Hole IR suppressors
    for (const sx of [-1.02, 1.02]) {
      const cowl = new THREE.Mesh(new THREE.CapsuleGeometry(0.40, 2.0, 14, 18), bodyMat);
      cowl.rotation.x = Math.PI / 2;
      cowl.position.set(sx, 2.36, -0.35);
      cowl.castShadow = true;
      const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.2, 16), darkMetal);
      intake.rotation.x = Math.PI / 2;
      intake.position.set(sx, 2.36, 0.75);
      const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.75), darkMetal);
      exhaust.position.set(sx, 2.50, -1.65);
      exhaust.rotation.x = 0.22;
      group.add(cowl, intake, exhaust);
    }

    // Heavy weapon stub wings carrying Hydra rocket pods and Hellfire missiles
    for (const sx of [-1, 1]) {
      const stubWing = buildAerodynamicAirfoilFin(0.95, 0.65, 1.85, 0.22, 0.12, bodyMat);
      stubWing.rotation.y = Math.PI / 2;
      stubWing.position.set(sx * 1.85, 1.65, 0.15);
      group.add(stubWing);

      // Inner: 19-tube Hydra 70 rocket pod
      const pylon1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.65), darkMetal);
      pylon1.position.set(sx * 1.55, 1.45, 0.18);
      const hydraPod = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.55, 18), gunmetalMat);
      hydraPod.rotation.x = Math.PI / 2;
      hydraPod.position.set(sx * 1.55, 1.25, 0.22);
      group.add(pylon1, hydraPod);

      // Outer: Hellfire quad rail rack with AGM-114 missiles (SHARP CONICAL TIPS, NO BALLS!)
      const pylon2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.65), darkMetal);
      pylon2.position.set(sx * 2.35, 1.42, 0.18);
      const hellfireRack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 1.15), darkMetal);
      hellfireRack.position.set(sx * 2.35, 1.25, 0.22);
      group.add(pylon2, hellfireRack);
      for (const mx of [-0.15, 0.15]) {
        const missile = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.35, 12), carbonMat);
        missile.rotation.x = Math.PI / 2;
        missile.position.set(sx * 2.35 + mx, 1.15, 0.22);
        // Sharp conical seeker tip (NO BALL!)
        const seeker = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 12), titaniumMat);
        seeker.rotation.x = Math.PI / 2;
        seeker.position.set(sx * 2.35 + mx, 1.15, 0.98);
        group.add(missile, seeker);
      }
    }

    // Heavy trailing-arm wheeled landing gear attached securely to keel hardpoints
    for (const sx of [-1.25, 1.25]) {
      group.add(buildFrameStrut([sx * 0.65, 1.35, 0.95], [sx, 0.38, 0.85], 0.065, skidMat));
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 20), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx, 0.38, 0.85);
      wheel.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.26, 14), gunmetalMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(sx, 0.38, 0.85);
      group.add(wheel, hub);
    }

    // Tail wheel under aft boom
    group.add(buildFrameStrut([0, 1.85, -7.1], [0, 0.45, -7.35], 0.048, skidMat));
    const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16), tireMat);
    tailWheel.rotation.z = Math.PI / 2;
    tailWheel.position.set(0, 0.45, -7.35);
    group.add(tailWheel);

    // All-flying horizontal stabilator & swept vertical tail fin
    const stabilator = buildAerodynamicAirfoilFin(0.72, 0.48, 2.85, 0.18, 0.065, accentMat);
    stabilator.rotation.y = Math.PI / 2;
    stabilator.position.set(0, 1.82, -7.55);
    const tailFin = buildAerodynamicAirfoilFin(1.15, 0.55, 1.85, 0.45, 0.085, bodyMat);
    tailFin.position.set(0, 2.75, -7.55);
    group.add(stabilator, tailFin);

    // Tail rotor (4-blade scissor on Apache, rear pusher on Gunship)
    tailRotor.position.set(isGunship ? 0 : -0.22, isGunship ? 2.05 : 3.25, isGunship ? -8.05 : -7.75);
    const trHub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 14), darkMetal);
    if (!isGunship) trHub.rotation.z = Math.PI / 2;
    else trHub.rotation.x = Math.PI / 2;
    tailRotor.add(trHub);
    for (let b = 0; b < 4; b++) {
      const ang = (b * Math.PI) / 2;
      const bMesh = new THREE.Mesh(
        new THREE.BoxGeometry(isGunship ? 0.16 : 0.035, 1.45, isGunship ? 0.035 : 0.16),
        carbonMat
      );
      if (isGunship) bMesh.rotation.z = ang;
      else bMesh.rotation.x = ang;
      tailRotor.add(bMesh);
    }
    group.add(tailRotor);

    // Main rotor mast & 4 heavy composite blades (NO ROUND BALL ATOP MAST!)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.85, 16), darkMetal);
    mast.position.set(0, 3.25, 0.15);
    mast.castShadow = true;
    group.add(mast);

    mainRotor.position.set(0, 3.65, 0.15);
    const rHub = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.22, 20), darkMetal);
    mainRotor.add(rHub);

    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.028, 5.1), carbonMat);
      blade.position.set(0, 0.02, 2.75);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.55), accentMat);
      tip.position.set(-0.06, 0.02, 5.35);
      tip.rotation.y = -0.28;
      arm.add(blade, tip);
      mainRotor.add(arm);
    }

    if (isApache) {
      // Low-profile faceted aerodynamic radar mast cap (flat aerodynamic disk, NO ROUND BALL!)
      const radarPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.28, 14), darkMetal);
      radarPylon.position.y = 0.20;
      const radarDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.12, 20), gunmetalMat);
      radarDisc.position.y = 0.38;
      const radarStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 20), accentMat);
      radarStripe.position.y = 0.38;
      mainRotor.add(radarPylon, radarDisc, radarStripe);
    } else {
      // Coaxial upper rotor tier on X-99 Gunship
      const coaxialShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 14), chromeMat);
      coaxialShaft.position.y = 0.28;
      mainRotor.add(coaxialShaft);
      for (let i = 0; i < 4; i++) {
        const arm2 = new THREE.Group();
        arm2.position.y = 0.55;
        arm2.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;
        const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.026, 4.9), carbonMat);
        blade2.position.set(0, 0.02, 2.65);
        arm2.add(blade2);
        mainRotor.add(arm2);
      }
    }
    group.add(mainRotor);
  }

  // Flush navigation lights (Port Red left, Starboard Green right)
  const navPort = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  navPort.position.set(-1.1, 1.5, 0.8);
  const navStbd = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
  navStbd.position.set(1.1, 1.5, 0.8);
  group.add(navPort, navStbd);

  // Anti-collision strobe beacon atop mast fairing
  const beaconMesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  beaconMesh.position.set(0, 3.85, 0.15);
  group.add(beaconMesh);
  const beaconLight = new THREE.PointLight(0xff2222, 0.35, 3.5);
  beaconLight.position.set(0, 3.85, 0.15);
  group.add(beaconLight);

  return { group, mainRotor, tailRotor, beaconLight };
}

/**
 * Procedural Smooth Articulated 3D Human Character Builder (Player & NPCs)
 * Uses smooth anatomical Capsules, Spheres, and Cylinders — zero blocky cubes,
 * and an open, natural uncovered face (never covered by hair or hat domes!).
 */
export function buildHumanCharacter3D(options: {
  skinColor?: string;
  topColor?: string;
  secondaryTopColor?: string;
  pantsColor?: string;
  shoeColor?: string;
  hairColor?: string;
  eyeColor?: string;
  hairStyle?: 'short' | 'long' | 'mohawk' | 'afro' | 'ponytail' | 'bald';
  facialHair?: 'none' | 'stubble' | 'beard' | 'mustache' | 'goatee';
  topStyle?: 'tshirt' | 'hoodie' | 'jacket' | 'suit' | 'tanktop';
  pantsStyle?: 'pants' | 'dress' | 'shorts' | 'jeans' | 'cargo' | 'slacks';
  hatStyle?: 'none' | 'cap' | 'beanie' | 'tophat' | 'cowboy' | 'crown';
  hatColor?: string;
  glassesStyle?: 'none' | 'sunglasses' | 'reading' | 'visor';
  glassesColor?: string;
  accessory?: 'none' | 'backpack' | 'cape' | 'purse' | 'chains';
  accessoryColor?: string;
  heightScale?: number;
  widthScale?: number;
  hasCap?: boolean;
  hasSunglasses?: boolean;
}): {
  group: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
} {
  const group = new THREE.Group();

  const skinMat = getStandardMat(options.skinColor || '#f1c27d', 0.48, 0.03);
  const topMat = getStandardMat(options.topColor || '#0284c7', 0.62, 0.08);
  const secTopMat = getStandardMat(options.secondaryTopColor || '#f8fafc', 0.6, 0.06);
  const pantsMat = getStandardMat(options.pantsColor || '#1e293b', 0.75, 0.05);
  const shoeMat = getStandardMat(options.shoeColor || '#111827', 0.55, 0.1);
  const soleMat = getStandardMat('#f8fafc', 0.65, 0.05);
  const hairMat = getStandardMat(options.hairColor || '#3b2818', 0.78, 0.05);
  const eyeMat = getStandardMat(options.eyeColor || '#2563eb', 0.2, 0.3);
  const hatMat = getStandardMat(options.hatColor || options.topColor || '#111827', 0.55, 0.12);
  const glassesMat = getStandardMat(options.glassesColor || '#090d16', 0.2, 0.6);
  const accMat = getStandardMat(options.accessoryColor || '#dc2626', 0.5, 0.35);
  const darkMat = getStandardMat('#090d16', 0.25, 0.3);

  const effectiveHat = options.hatStyle || (options.hasCap ? 'cap' : 'none');
  const effectiveGlasses = options.glassesStyle || (options.hasSunglasses ? 'sunglasses' : 'none');
  const effectiveHair = options.hairStyle || 'short';
  const effectiveTop = options.topStyle || 'jacket';
  const effectivePants = options.pantsStyle || 'pants';
  const effectiveFacialHair = options.facialHair || 'none';
  const effectiveAccessory = options.accessory || 'none';

  // 1. Smooth Oval Cranium & Uncovered Natural Face (+Z is Front of Face)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.56, 0);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.136, 26, 26), skinMat);
  cranium.scale.set(0.94, 1.08, 0.98);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Ears
  for (const ex of [-0.125, 0.125]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), skinMat);
    ear.scale.set(0.45, 0.9, 0.65);
    ear.position.set(ex, -0.008, -0.005);
    headGroup.add(ear);
  }

  // Sculpted Nose (clearly proud of the front facial plane z ~ 0.133)
  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.032, 8, 12), skinMat);
  nose.rotation.x = 0.25;
  nose.position.set(0, -0.004, 0.138);
  headGroup.add(nose);

  // Natural Smile / Mouth Line
  const lipMat = getStandardMat('#b45346', 0.55, 0.04);
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.034, 6, 10), lipMat);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, -0.048, 0.125);
  headGroup.add(mouth);

  // Expressive Eyes, Colored Irises & Pupils (strictly in front of skin surface)
  const scleraMat = getStandardMat('#ffffff', 0.25, 0.05);
  for (const ex of [-0.045, 0.045]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.021, 14, 14), scleraMat);
    sclera.scale.set(1.05, 0.88, 0.55);
    sclera.position.set(ex, 0.022, 0.125);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 12), eyeMat);
    iris.scale.set(1.0, 1.0, 0.5);
    iris.position.set(ex, 0.022, 0.134);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 10), darkMat);
    pupil.scale.set(1.0, 1.0, 0.45);
    pupil.position.set(ex, 0.022, 0.138);
    headGroup.add(sclera, iris, pupil);
  }

  // Eyebrows
  for (const bx of [-0.046, 0.046]) {
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.028, 6, 8), hairMat);
    brow.rotation.z = Math.PI / 2;
    brow.position.set(bx, 0.05, 0.128);
    headGroup.add(brow);
  }

  // Facial Hair (Only when explicitly selected)
  if (effectiveFacialHair === 'beard' || effectiveFacialHair === 'stubble') {
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.136, 18, 14, 0, Math.PI, Math.PI * 0.58, Math.PI * 0.38),
      hairMat
    );
    beard.scale.set(0.95, effectiveFacialHair === 'beard' ? 1.12 : 1.01, 1.02);
    beard.position.set(0, -0.012, 0.006);
    headGroup.add(beard);
  }
  if (effectiveFacialHair === 'mustache' || effectiveFacialHair === 'beard' || effectiveFacialHair === 'goatee') {
    const stache = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.052, 8, 10), hairMat);
    stache.rotation.z = Math.PI / 2;
    stache.position.set(0, -0.032, 0.134);
    headGroup.add(stache);
  }
  if (effectiveFacialHair === 'goatee') {
    const chinTuft = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.055, 10), hairMat);
    chinTuft.rotation.x = Math.PI;
    chinTuft.position.set(0, -0.11, 0.112);
    headGroup.add(chinTuft);
  }

  // Eyewear / Glasses
  if (effectiveGlasses === 'sunglasses') {
    for (const gx of [-0.048, 0.048]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 14), glassesMat);
      lens.scale.set(1.18, 0.72, 0.35);
      lens.position.set(gx, 0.022, 0.134);
      headGroup.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 8), glassesMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.028, 0.138);
    headGroup.add(bridge);
  } else if (effectiveGlasses === 'reading') {
    for (const gx of [-0.046, 0.046]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.004, 8, 18), glassesMat);
      rim.position.set(gx, 0.022, 0.136);
      headGroup.add(rim);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.035, 8), glassesMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.022, 0.136);
    headGroup.add(bridge);
  } else if (effectiveGlasses === 'visor') {
    const visorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(options.glassesColor || '#38bdf8'),
      emissive: new THREE.Color(options.glassesColor || '#38bdf8'),
      emissiveIntensity: 0.65,
      roughness: 0.15,
      metalness: 0.8,
    });
    const visorBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.04, 20, 1, false, -Math.PI * 0.38, Math.PI * 0.76),
      visorMat
    );
    visorBand.position.set(0, 0.022, 0.012);
    headGroup.add(visorBand);
  }

  // Hair Styles — Rendered naturally on scalp and back of head, stays visible when wearing hats!
  if (effectiveHair !== 'bald') {
    if (effectiveHair === 'short' || effectiveHair === 'long' || effectiveHair === 'ponytail') {
      // 1. Top scalp hair cap (theta 0 to 0.33*PI stays high above the forehead!)
      const topScalp = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.33),
        hairMat
      );
      topScalp.scale.set(0.96, 1.06, 1.0);
      topScalp.position.set(0, 0.022, -0.008);
      headGroup.add(topScalp);

      // 2. Back & Side Nape Hair (phi from 0.96*PI to 2.04*PI stays strictly on the back/sides z <= 0!)
      const backNape = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 20, 14, Math.PI * 0.96, Math.PI * 1.08, Math.PI * 0.25, Math.PI * 0.42),
        hairMat
      );
      backNape.scale.set(0.97, 1.05, 1.02);
      backNape.position.set(0, 0.015, -0.012);
      headGroup.add(backNape);
    }
    if (effectiveHair === 'long') {
      const backHair = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.22, 10, 14), hairMat);
      backHair.scale.set(1.05, 1.0, 0.55);
      backHair.position.set(0, -0.08, -0.085);
      headGroup.add(backHair);
    } else if (effectiveHair === 'ponytail') {
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.16, 8, 12), hairMat);
      tail.rotation.x = 0.55;
      tail.position.set(0, -0.04, -0.155);
      headGroup.add(tail);
    } else if (effectiveHair === 'mohawk') {
      const spikeCount = effectiveHat !== 'none' ? 4 : 6;
      for (let i = 0; i < spikeCount; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.095, 8), hairMat);
        const angle = -0.45 + i * 0.16;
        spike.position.set(0, Math.cos(angle) * 0.155 + 0.02, Math.sin(angle) * 0.145 - 0.02);
        spike.rotation.x = angle;
        headGroup.add(spike);
      }
    } else if (effectiveHair === 'afro') {
      const afroRadius = effectiveHat !== 'none' ? 0.162 : 0.185;
      const afroY = effectiveHat !== 'none' ? 0.06 : 0.095;
      const afro = new THREE.Mesh(new THREE.SphereGeometry(afroRadius, 22, 20), hairMat);
      afro.position.set(0, afroY, -0.035);
      headGroup.add(afro);
    }
  }

  // Headwear / Hats (kept above forehead y > 0.08 so the face is always open)
  if (effectiveHat === 'cap') {
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.144, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.38),
      hatMat
    );
    capDome.scale.set(0.97, 1.05, 1.01);
    capDome.position.set(0, 0.028, -0.005);
    headGroup.add(capDome);

    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.148, 0.016, 20, 1, false, -Math.PI * 0.36, Math.PI * 0.72),
      hatMat
    );
    visor.scale.set(0.95, 1, 1.38);
    visor.position.set(0, 0.082, 0.055);
    visor.rotation.x = 0.12;
    headGroup.add(visor);
  } else if (effectiveHat === 'beanie') {
    const beanieDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.146, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.4),
      hatMat
    );
    beanieDome.position.set(0, 0.034, -0.01);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.024, 10, 22), hatMat);
    cuff.rotation.x = Math.PI / 2 - 0.08;
    cuff.position.set(0, 0.086, -0.008);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 12), secTopMat);
    pom.position.set(0, 0.185, -0.025);
    headGroup.add(beanieDome, cuff, pom);
  } else if (effectiveHat === 'tophat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.016, 24), hatMat);
    brim.position.set(0, 0.115, 0);
    const tallCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.2, 22), hatMat);
    tallCrown.position.set(0, 0.215, 0);
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.123, 0.122, 0.03, 22), accMat);
    ribbon.position.set(0, 0.135, 0);
    headGroup.add(brim, tallCrown, ribbon);
  } else if (effectiveHat === 'cowboy') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.015, 24), hatMat);
    brim.scale.set(0.92, 1.0, 1.08);
    brim.position.set(0, 0.11, 0);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.13, 0.13, 20), hatMat);
    crown.position.set(0, 0.175, 0);
    headGroup.add(brim, crown);
  } else if (effectiveHat === 'crown') {
    const goldCrownMat = getStandardMat(options.hatColor || '#facc15', 0.2, 0.85);
    const baseBand = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.13, 0.06, 20), goldCrownMat);
    baseBand.position.set(0, 0.138, 0);
    headGroup.add(baseBand);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 6), goldCrownMat);
      spire.position.set(Math.cos(a) * 0.12, 0.195, Math.sin(a) * 0.12);
      headGroup.add(spire);
    }
  }

  group.add(headGroup);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.12, 16), skinMat);
  neck.position.set(0, 1.4, 0);
  group.add(neck);

  // 2. Sculpted Anatomical Torso (Flush, smooth, zero blocky protrusions or sticking-out parts)
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.148, 0.46, 22), topMat);
  chest.scale.set(1.0, 1.0, 0.68);
  chest.position.set(0, 1.12, 0);
  chest.castShadow = true;
  group.add(chest);

  const shoulderBridge = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.082, 0.24, 12, 18),
    effectiveTop === 'tanktop' ? skinMat : topMat
  );
  shoulderBridge.rotation.z = Math.PI / 2;
  shoulderBridge.scale.set(1.0, 1.0, 0.82);
  shoulderBridge.position.set(0, 1.3, 0);
  shoulderBridge.castShadow = true;
  group.add(shoulderBridge);

  // Accessories (Backpack, Cape, Purse, Chains)
  if (effectiveAccessory === 'backpack') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.16), accMat);
    pack.position.set(0, 1.14, -0.19);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.06), darkMat);
    flap.position.set(0, 1.08, -0.27);
    group.add(pack, flap);
  } else if (effectiveAccessory === 'cape') {
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.88, 0.025), accMat);
    cape.position.set(0, 0.92, -0.15);
    cape.rotation.x = 0.08;
    group.add(cape);
  } else if (effectiveAccessory === 'purse') {
    const purseGroup = new THREE.Group();

    // Handbag / purse main body
    const purseBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.17, 0.22), accMat);
    purseBody.position.set(-0.24, 0.79, 0.04);
    purseBody.rotation.y = 0.08;
    purseBody.rotation.z = -0.06;
    purseBody.castShadow = true;
    purseGroup.add(purseBody);

    // Metallic purse clasp / lock
    const claspMat = getStandardMat('#facc15', 0.2, 0.85);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.04), claspMat);
    clasp.position.set(-0.29, 0.82, 0.04);
    purseGroup.add(clasp);

    // Purse top tote handle
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.009, 8, 16, Math.PI),
      accMat
    );
    handle.rotation.y = Math.PI / 2;
    handle.position.set(-0.24, 0.9, 0.04);
    purseGroup.add(handle);

    // Cross-body shoulder strap
    const strapMat = getStandardMat(options.accessoryColor || '#334155', 0.5, 0.1);
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.68, 8), strapMat);
    strap.position.set(-0.12, 1.09, 0.06);
    strap.rotation.z = 0.44;
    strap.rotation.x = -0.08;
    purseGroup.add(strap);

    group.add(purseGroup);
  } else if (effectiveAccessory === 'chains') {
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.088, 0.014, 10, 24),
      getStandardMat(options.accessoryColor || '#facc15', 0.2, 0.9)
    );
    chain.rotation.x = Math.PI / 2 + 0.35;
    chain.position.set(0, 1.31, 0.035);
    group.add(chain);
  }

  // Belt & Pelvis Hip Transition
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.152, 0.045, 20), darkMat);
  belt.scale.set(1.0, 1.0, 0.68);
  belt.position.set(0, 0.88, 0);
  group.add(belt);

  const isDress = effectivePants === 'dress' || effectivePants === 'slacks';
  const isShorts = effectivePants === 'shorts';

  const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.12, 12, 18), pantsMat);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.scale.set(0.95, 1.0, 0.85);
  pelvis.position.set(0, 0.79, 0);
  group.add(pelvis);

  // Flared Dress Skirt (when dress is chosen)
  if (isDress) {
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.295, 0.46, 24),
      pantsMat
    );
    skirt.scale.set(1.0, 1.0, 0.84);
    skirt.position.set(0, 0.65, 0);
    skirt.castShadow = true;
    group.add(skirt);
  }

  // 3. Articulated Swinging Arms (armL & armR)
  const buildArm = (side: 1 | -1) => {
    const armGrp = new THREE.Group();
    armGrp.position.set(side * 0.215, 1.29, 0);

    const upperArmMat = effectiveTop === 'tanktop' ? skinMat : topMat;
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.2, 10, 16), upperArmMat);
    upperArm.position.set(0, -0.11, 0);
    upperArm.castShadow = true;
    armGrp.add(upperArm);

    const forearmMat =
      effectiveTop === 'hoodie' || effectiveTop === 'jacket' || effectiveTop === 'suit'
        ? topMat
        : skinMat;
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.2, 10, 16), forearmMat);
    forearm.position.set(0, -0.32, 0.015);
    forearm.rotation.x = -0.12;
    forearm.castShadow = true;
    armGrp.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), skinMat);
    hand.scale.set(0.75, 1.15, 0.9);
    hand.position.set(0, -0.45, 0.028);
    armGrp.add(hand);

    return armGrp;
  };

  const armL = buildArm(1);
  const armR = buildArm(-1);
  group.add(armL, armR);

  // 4. Articulated Legs with Contoured Thighs, Calves, and Sneakers (legL & legR)
  const buildLeg = (side: 1 | -1) => {
    const legGrp = new THREE.Group();
    legGrp.position.set(side * 0.095, 0.76, 0);

    const thighMat = isDress ? skinMat : pantsMat;
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.28, 12, 16), thighMat);
    thigh.position.set(0, -0.17, 0);
    thigh.castShadow = true;
    legGrp.add(thigh);

    const calfMat = isDress || isShorts ? skinMat : pantsMat;
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.054, 0.28, 12, 16), calfMat);
    calf.position.set(0, -0.47, 0);
    calf.castShadow = true;
    legGrp.add(calf);

    // Contoured Sneaker Shoe
    const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.13, 10, 16), shoeMat);
    shoeUpper.rotation.x = Math.PI / 2;
    shoeUpper.scale.set(1.05, 1.0, 0.78);
    shoeUpper.position.set(0, -0.69, 0.045);
    legGrp.add(shoeUpper);

    const shoeSole = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.14, 10, 16), soleMat);
    shoeSole.rotation.x = Math.PI / 2;
    shoeSole.scale.set(1.08, 1.02, 0.32);
    shoeSole.position.set(0, -0.735, 0.045);
    legGrp.add(shoeSole);

    return legGrp;
  };

  const legL = buildLeg(1);
  const legR = buildLeg(-1);
  group.add(legL, legR);

  const wScale = Math.max(0.2, Math.min(2.0, options.widthScale ?? 1.0));
  const hScale = Math.max(0.5, Math.min(2.0, options.heightScale ?? 1.0));
  group.scale.set(wScale, hScale, wScale);

  group.userData.headGroup = headGroup;

  return { group, legL, legR, armL, armR };
}

/**
 * Procedural California Street Utility Pole with crossarms, insulators, and transformer
 */
export function buildUtilityPole3DModel(): THREE.Group {
  const poleGroup = new THREE.Group();
  const woodMat = getStandardMat('#45230e', 0.9, 0.05);
  const chromeMat = getStandardMat('#94a3b8', 0.3, 0.7);
  const whiteMat = getStandardMat('#f8fafc', 0.2, 0.1);
  const darkMetal = getStandardMat('#334155', 0.4, 0.6);

  // Main Wooden Telephone Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 10.5, 8), woodMat);
  pole.position.y = 5.25;
  pole.castShadow = true;
  poleGroup.add(pole);

  // Cross-Arm Beam
  const crossarm = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 0.16), woodMat);
  crossarm.position.set(0, 9.6, 0);
  poleGroup.add(crossarm);

  // Diagonal braces
  for (const bx of [-0.65, 0.65]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.04), chromeMat);
    brace.position.set(bx * 0.5, 9.15, 0);
    brace.rotation.z = bx > 0 ? -0.55 : 0.55;
    poleGroup.add(brace);
  }

  // 4 Ceramic/Glass Wire Insulators on Crossarm
  for (const ix of [-1.5, -0.6, 0.6, 1.5]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.18, 8), whiteMat);
    ins.position.set(ix, 9.75, 0);
    poleGroup.add(ins);
  }

  // Cylindrical Electrical Transformer
  const trans = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), darkMetal);
  trans.position.set(0.42, 8.2, 0);
  const transCap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.12, 12), darkMetal);
  transCap.position.set(0.42, 8.7, 0);
  poleGroup.add(trans, transCap);

  return poleGroup;
}

/**
 * Procedural Evergreen Conifer Pine/Spruce Tree (replaces all palm trees!)
 * Tall tapered bark trunk with dense multi-tiered conical evergreen needles.
 */
export function buildCaliforniaPalm3DModel(height: number = 14): THREE.Group {
  const treeGroup = new THREE.Group();
  const trunkMat = getStandardMat('#45230e', 0.95, 0.04);
  const needleDarkMat = getStandardMat('#14532d', 0.82, 0.05);
  const needleMidMat = getStandardMat('#166534', 0.78, 0.05);
  const needleTipMat = getStandardMat('#15803d', 0.75, 0.05);

  const trunkH = height * 0.42;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.42, trunkH, 10),
    trunkMat
  );
  trunk.position.y = trunkH * 0.5;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  const tiers = 5;
  const foliageStart = height * 0.22;
  const foliageSpan = height * 0.78;
  for (let t = 0; t < tiers; t++) {
    const frac = t / (tiers - 1);
    const radius = (1 - frac * 0.72) * (height * 0.22);
    const coneH = (foliageSpan / tiers) * 1.55;
    const mat = t < 2 ? needleDarkMat : t < 4 ? needleMidMat : needleTipMat;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, coneH, 12), mat);
    cone.position.y = foliageStart + frac * (foliageSpan * 0.82) + coneH * 0.4;
    cone.castShadow = true;
    cone.receiveShadow = true;
    treeGroup.add(cone);
  }

  return treeGroup;
}

/**
 * Procedural Realistic 3D Airplane / Supersonic Jet Builder
 * Supports all 6 distinct, architecturally authentic aircraft configurations:
 * - 'cessna'   : High-wing strut-braced general aviation touring aircraft (Cessna 172S Skyhawk)
 * - 'mustang'  : WWII Merlin V12 fighter warbird with 4-blade prop, belly radiator scoop, 12 exhaust stacks & bubble canopy (P-51D Mustang)
 * - 'learjet'  : Swept low-wing T-tail twin rear-turbofan executive business jet (Gulfstream G700)
 * - 'airliner' : Wide-body commercial jetliner with under-wing high-bypass chevron turbofans & passenger cabin windows (Boeing 787-9 Dreamliner)
 * - 'raptor'   : 5th-gen chined stealth twin-engine air superiority fighter with canted V-tails & 2D TVC nozzles (F-22A Raptor)
 * - 'darkstar' : Hypersonic wave-rider scramjet reconnaissance aircraft with double-delta chined wings (SR-72 Darkstar)
 */
export function buildAirplane3DModel(
  style: string = 'cessna',
  colorHex: string = '#f8fafc',
  accentHex: string = '#dc2626'
): {
  group: THREE.Group;
  propeller: THREE.Group;
  afterburners: THREE.Mesh[];
  gearGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const gearGroup = new THREE.Group();
  gearGroup.name = 'landingGearGroup';
  group.add(gearGroup);

  const isStealth = style === 'raptor' || style === 'darkstar' || style === 'bomber';
  const isBareMetal = style === 'mustang';
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: isStealth ? 0.34 : isBareMetal ? 0.18 : 0.14,
    metalness: isStealth ? 0.58 : isBareMetal ? 0.82 : 0.24,
    clearcoat: isStealth ? 0.38 : 0.96,
    clearcoatRoughness: 0.08,
  });
  const accentMat = getStandardMat(accentHex, 0.24, 0.42);
  const darkMetal = getStandardMat('#1e293b', 0.32, 0.78);
  const gunmetalMat = getStandardMat('#334155', 0.38, 0.68);
  const chromeMat = getStandardMat('#e2e8f0', 0.12, 0.94);
  const tireMat = getStandardMat('#111827', 0.86, 0.08);
  const cockpitInteriorMat = getStandardMat('#0f172a', 0.7, 0.2);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: style === 'raptor' ? 0xca8a04 : 0x0f172a,
    transparent: true,
    opacity: style === 'raptor' ? 0.66 : 0.7,
    roughness: 0.05,
    metalness: style === 'raptor' ? 0.28 : 0.06,
    transmission: 0.7,
    clearcoat: 1.0,
  });

  const propeller = new THREE.Group();
  const afterburners: THREE.Mesh[] = [];

  // Control surfaces references for real-time deflection during pitch/roll/yaw
  let aileronL: THREE.Object3D | null = null;
  let aileronR: THREE.Object3D | null = null;
  let elevator: THREE.Object3D | null = null;
  let rudder: THREE.Object3D | null = null;

  // Helper: Build true tapered & swept airfoil wing geometry in XZ plane (+Z is forward leading edge, -Z is aft trailing edge)
  const buildTaperedAirfoilWing = (
    side: -1 | 1,
    span: number,
    rootChord: number,
    tipChord: number,
    sweepBackZ: number,
    thickness: number,
    mat: THREE.Material
  ) => {
    const shape = new THREE.Shape();
    const rLead = rootChord * 0.5;
    const rTrail = -rootChord * 0.5;
    const tLead = tipChord * 0.5 - sweepBackZ;
    const tTrail = -tipChord * 0.5 - sweepBackZ;

    if (side === 1) {
      shape.moveTo(0, rTrail);
      shape.lineTo(span, tTrail);
      shape.lineTo(span, tLead);
      shape.lineTo(0, rLead);
      shape.closePath();
    } else {
      shape.moveTo(0, rLead);
      shape.lineTo(-span, tLead);
      shape.lineTo(-span, tTrail);
      shape.lineTo(0, rTrail);
      shape.closePath();
    }

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness * 0.55,
      bevelEnabled: true,
      bevelThickness: thickness * 0.28,
      bevelSize: Math.min(rootChord, tipChord) * 0.08,
      bevelSegments: 4,
    });
    // Rotate +PI/2 around X so shape +Y maps to 3D +Z (forward) and -Y maps to 3D -Z (aft swept trailing edge)
    extrudeGeo.rotateX(Math.PI / 2);
    extrudeGeo.translate(0, thickness * 0.28, 0);
    const mesh = new THREE.Mesh(extrudeGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Helper: Build realistic hinged trailing-edge control surface (aileron / flaperon / elevator) flush & attached to wing/stabilizer
  const buildAttachedTrailingFlap = (
    side: -1 | 1,
    span: number,
    rootChord: number,
    tipChord: number,
    sweepBackZ: number,
    thickness: number,
    s0: number,
    s1: number,
    flapDepth: number,
    mat: THREE.Material
  ): THREE.Group => {
    const sm = (s0 + s1) * 0.5;
    const xAt = (s: number) => side * span * s;
    const chordAt = (s: number) => rootChord * (1 - s) + tipChord * s;
    // Tuck the hinge line slightly inside the wing's trailing edge so there is zero gap
    const zHingeAt = (s: number) => -chordAt(s) * 0.5 - sweepBackZ * s + chordAt(s) * 0.09;

    const pivotX = xAt(sm);
    const pivotZ = zHingeAt(sm);
    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(pivotX, 0, pivotZ);

    const x0 = xAt(s0) - pivotX;
    const z0 = zHingeAt(s0) - pivotZ;
    const x1 = xAt(s1) - pivotX;
    const z1 = zHingeAt(s1) - pivotZ;

    const shape = new THREE.Shape();
    if (side === 1) {
      shape.moveTo(x0, z0 - flapDepth);
      shape.lineTo(x1, z1 - flapDepth * 0.85);
      shape.lineTo(x1, z1 + 0.06);
      shape.lineTo(x0, z0 + 0.06);
      shape.closePath();
    } else {
      shape.moveTo(x0, z0 + 0.06);
      shape.lineTo(x1, z1 + 0.06);
      shape.lineTo(x1, z1 - flapDepth * 0.85);
      shape.lineTo(x0, z0 - flapDepth);
      shape.closePath();
    }

    const flapGeo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness * 0.42,
      bevelEnabled: true,
      bevelThickness: thickness * 0.18,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    flapGeo.rotateX(Math.PI / 2);
    flapGeo.translate(0, thickness * 0.21, 0);
    const flapMesh = new THREE.Mesh(flapGeo, mat);
    flapMesh.castShadow = true;
    pivotGroup.add(flapMesh);

    // Aerodynamic hinge fairing pods connecting wing trailing edge to control surface
    for (const frac of [0.22, 0.78]) {
      const hx = x0 + (x1 - x0) * frac;
      const hz = z0 + (z1 - z0) * frac;
      const fairing = new THREE.Mesh(
        new THREE.CapsuleGeometry(thickness * 0.36, flapDepth * 0.65, 6, 10),
        darkMetal
      );
      fairing.rotation.x = Math.PI / 2;
      fairing.position.set(hx, -thickness * 0.15, hz - flapDepth * 0.25);
      pivotGroup.add(fairing);
    }

    return pivotGroup;
  };

  // Helper: Build true tapered vertical tail fin in YZ plane (+Z forward leading edge, -Z aft swept trailing edge)
  const buildTaperedVerticalTail = (
    height: number,
    rootChord: number,
    tipChord: number,
    sweepBackZ: number,
    thickness: number,
    mat: THREE.Material
  ) => {
    const shape = new THREE.Shape();
    shape.moveTo(-rootChord * 0.5, 0);
    shape.lineTo(rootChord * 0.5, 0);
    shape.lineTo(tipChord * 0.5 - sweepBackZ, height);
    shape.lineTo(-tipChord * 0.5 - sweepBackZ, height);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness * 0.5,
      bevelEnabled: true,
      bevelThickness: thickness * 0.25,
      bevelSize: tipChord * 0.07,
      bevelSegments: 3,
    });
    // Rotate -PI/2 around Y so shape +X maps to 3D +Z (forward) and -sweepBackZ sweeps backward (-Z)
    geo.rotateY(-Math.PI / 2);
    geo.translate(thickness * 0.25, 0, 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  };

  // Helper: Build hinged rudder attached directly to the trailing edge of a vertical tail fin
  const buildAttachedRudderFlap = (
    height: number,
    rootChord: number,
    tipChord: number,
    sweepBackZ: number,
    thickness: number,
    rudderWidth: number,
    mat: THREE.Material
  ): THREE.Group => {
    const h0 = 0.06;
    const h1 = 0.94;
    const hm = 0.5;
    const yAt = (f: number) => height * f;
    const chordAt = (f: number) => rootChord * (1 - f) + tipChord * f;
    const zHingeAt = (f: number) => -chordAt(f) * 0.5 - sweepBackZ * f + chordAt(f) * 0.08;

    const pivotY = yAt(hm);
    const pivotZ = zHingeAt(hm);
    const rudderPivot = new THREE.Group();
    rudderPivot.position.set(0, pivotY, pivotZ);

    const yBot = yAt(h0) - pivotY;
    const zBot = zHingeAt(h0) - pivotZ;
    const yTop = yAt(h1) - pivotY;
    const zTop = zHingeAt(h1) - pivotZ;

    const shape = new THREE.Shape();
    shape.moveTo(zBot - rudderWidth, yBot);
    shape.lineTo(zBot + 0.06, yBot);
    shape.lineTo(zTop + 0.06, yTop);
    shape.lineTo(zTop - rudderWidth * 0.72, yTop);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness * 0.42,
      bevelEnabled: true,
      bevelThickness: thickness * 0.18,
      bevelSize: 0.025,
      bevelSegments: 2,
    });
    geo.rotateY(-Math.PI / 2);
    geo.translate(thickness * 0.21, 0, 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    rudderPivot.add(mesh);

    return rudderPivot;
  };

  // Helper: Build Lathe contoured fuselage along Z axis
  const buildContouredFuselageMesh = (
    zRadiusPairs: Array<[number, number]>,
    scaleX: number,
    scaleY: number,
    mat: THREE.Material,
    radialSegs: number = 32
  ) => {
    const pts = zRadiusPairs.map(([zPos, rad]) => new THREE.Vector2(Math.max(0.001, rad), zPos));
    const latheGeo = new THREE.LatheGeometry(pts, radialSegs);
    latheGeo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(latheGeo, mat);
    mesh.scale.set(scaleX, scaleY, 1.0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Helper to add realistic retractable landing gear assembly with articulated pivot hinge, oleo struts, wheel bay doors & spinning wheels into gearGroup
  const gearPivots: THREE.Group[] = [];
  const gearWheels: THREE.Mesh[] = [];
  const addDetailedWheelAssembly = (
    gx: number,
    gy: number,
    gz: number,
    strutLen: number,
    tireRadius: number,
    tireWidth: number,
    dualWheels: boolean = false,
    hasWheelPant: boolean = false
  ) => {
    const pivotY = gy + strutLen;
    const legPivot = new THREE.Group();
    legPivot.position.set(gx, pivotY, gz);
    legPivot.userData = {
      isNose: gx === 0,
      side: gx === 0 ? 0 : Math.sign(gx),
    };

    const upperStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.07, strutLen * 0.55, 14),
      darkMetal
    );
    upperStrut.position.set(0, -strutLen * 0.28, 0);
    const lowerOleo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, strutLen * 0.55, 14),
      chromeMat
    );
    lowerOleo.position.set(0, -strutLen * 0.72, 0);
    legPivot.add(upperStrut, lowerOleo);

    // Wheel-well bay door panel attached to strut so it folds flush when retracted
    if (!hasWheelPant) {
      const bayDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, strutLen * 0.68, tireRadius * 1.9),
        bodyMat
      );
      bayDoor.position.set(
        gx === 0 ? 0.24 : Math.sign(gx) * 0.26,
        -strutLen * 0.38,
        0
      );
      legPivot.add(bayDoor);
    }

    // Oleo torque link scissor
    const torqueUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, strutLen * 0.24, 0.14),
      gunmetalMat
    );
    torqueUpper.position.set(0, -strutLen * 0.56, -0.07);
    torqueUpper.rotation.x = 0.35;
    const torqueLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, strutLen * 0.24, 0.14),
      gunmetalMat
    );
    torqueLower.position.set(0, -strutLen * 0.78, -0.07);
    torqueLower.rotation.x = -0.35;
    legPivot.add(torqueUpper, torqueLower);

    if (hasWheelPant) {
      const pant = new THREE.Mesh(
        new THREE.CapsuleGeometry(tireRadius * 0.84, tireRadius * 1.75, 12, 18),
        bodyMat
      );
      pant.rotation.x = Math.PI / 2;
      pant.scale.set(0.68, 0.78, 1.0);
      pant.position.set(0, -strutLen + tireRadius * 0.22, -0.04);
      pant.castShadow = true;
      legPivot.add(pant);

      const pantStripe = new THREE.Mesh(
        new THREE.BoxGeometry(tireWidth * 1.48, 0.07, tireRadius * 2.45),
        accentMat
      );
      pantStripe.position.set(0, -strutLen + tireRadius * 0.28, -0.04);
      legPivot.add(pantStripe);
    }

    const wheelOffsets = dualWheels ? [-tireWidth * 0.75, tireWidth * 0.75] : [0];
    for (const wxOff of wheelOffsets) {
      const wheelGrp = new THREE.Group();
      wheelGrp.position.set(wxOff, -strutLen, 0);

      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 24),
        tireMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      wheelGrp.add(wheel);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(tireRadius * 0.5, tireRadius * 0.5, tireWidth * 1.08, 16),
        chromeMat
      );
      hub.rotation.z = Math.PI / 2;
      wheelGrp.add(hub);

      legPivot.add(wheelGrp);
      gearWheels.push(wheelGrp as unknown as THREE.Mesh);
    }

    gearGroup.add(legPivot);
    gearPivots.push(legPivot);
  };

  // Plane cockpit interior / seat removed so nothing sticks out of the planes
  const addCockpitInterior = (_dashY: number, _dashZ: number, _width: number = 0.96) => {};

  // Vibrant polarized sky-reflecting aviation cockpit glass (100% visibly clear with crisp specular sheen)
  const cockpitWindscreenMat = new THREE.MeshPhysicalMaterial({
    color: style === 'raptor' ? 0xd97706 : 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    roughness: 0.04,
    metalness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const buildAirplaneGlassQuad = (
    bl: [number, number, number],
    br: [number, number, number],
    tr: [number, number, number],
    tl: [number, number, number],
    mat: THREE.Material = cockpitWindscreenMat
  ) => {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      bl[0], bl[1], bl[2],
      br[0], br[1], br[2],
      tr[0], tr[1], tr[2],
      bl[0], bl[1], bl[2],
      tr[0], tr[1], tr[2],
      tl[0], tl[1], tl[2],
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = false;
    m.receiveShadow = true;
    m.renderOrder = 10;
    return m;
  };

  const buildAirplaneFrameStrut = (
    p1: [number, number, number],
    p2: [number, number, number],
    radius: number,
    mat: THREE.Material
  ) => {
    const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
    const v2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
    const dir = new THREE.Vector3().subVectors(v2, v1);
    const len = dir.length();
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, len + radius * 0.6, 10),
      mat
    );
    mesh.position.copy(v1).addScaledVector(dir, 0.5);
    if (len > 0.0001) {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
    mesh.castShadow = true;
    mesh.renderOrder = 10;
    return mesh;
  };

  // Helper: Calculate exact fuselage radius at any longitudinal Z coordinate by interpolating profile
  const getFuselageRadiusAtZ = (z: number, profile: Array<[number, number]>): number => {
    for (let i = 0; i < profile.length - 1; i++) {
      const [z0, r0] = profile[i];
      const [z1, r1] = profile[i + 1];
      const minZ = Math.min(z0, z1);
      const maxZ = Math.max(z0, z1);
      if (z >= minZ && z <= maxZ) {
        if (Math.abs(z1 - z0) < 0.0001) return r0;
        const t = (z - z0) / (z1 - z0);
        return r0 + t * (r1 - r0);
      }
    }
    return profile[profile.length - 1][1];
  };

  // Helper: Build a 100% conformal, fuselage-integrated 6-pane commercial/executive flight deck windscreen
  // Every single vertex lies on the exact surface of revolution of the fuselage!
  // Zero gaps, zero overhangs, zero glitching, rock-solid depth rendering!
  const buildConformalJetlinerFlightDeck = (
    profile: Array<[number, number]>,
    fuselageCenterY: number,
    scaleX: number,
    scaleY: number,
    zFrontSill: number,
    zRearBrow: number,
    maxThetaRad: number = 0.96,
    glassMaterial: THREE.Material = cockpitWindscreenMat,
    frameMaterial: THREE.Material = darkMetal
  ): THREE.Group => {
    const fdGroup = new THREE.Group();
    fdGroup.name = 'cockpitCanopy';
    fdGroup.renderOrder = 10;



    // Helper to evaluate exact surface position on fuselage with normal offset
    const getSurfPoint = (z: number, theta: number, offset: number = 0.035): [number, number, number] => {
      const r = getFuselageRadiusAtZ(z, profile);
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const normVec = new THREE.Vector3(sinT / scaleX, cosT / scaleY, 0).normalize();
      const px = r * scaleX * sinT + normVec.x * offset;
      const py = fuselageCenterY + r * scaleY * cosT + normVec.y * offset;
      const pz = z;
      return [px, py, pz];
    };

    // Helper: Build a curved conformal quad grid mesh
    const buildCurvedConformalPane = (
      z0: number,
      z1: number,
      t0: number,
      t1: number,
      mat: THREE.Material,
      gridU: number = 4,
      gridV: number = 4,
      offset: number = 0.035
    ): THREE.Mesh => {
      const positions: number[] = [];
      const indices: number[] = [];

      for (let iu = 0; iu <= gridU; iu++) {
        const u = iu / gridU;
        const curZ = THREE.MathUtils.lerp(z0, z1, u);
        for (let iv = 0; iv <= gridV; iv++) {
          const v = iv / gridV;
          const curT = THREE.MathUtils.lerp(t0, t1, v);
          const [px, py, pz] = getSurfPoint(curZ, curT, offset);
          positions.push(px, py, pz);
        }
      }

      const stride = gridV + 1;
      for (let iu = 0; iu < gridU; iu++) {
        for (let iv = 0; iv < gridV; iv++) {
          const a = iu * stride + iv;
          const b = a + 1;
          const c = (iu + 1) * stride + iv;
          const d = c + 1;
          if (t1 >= t0) {
            indices.push(a, c, b);
            indices.push(b, c, d);
          } else {
            indices.push(a, b, c);
            indices.push(b, d, c);
          }
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.renderOrder = 10;
      return mesh;
    };

    const deltaZ = zFrontSill - zRearBrow;
    const tA = maxThetaRad * 0.36; // A-pillar boundary
    const tB = maxThetaRad * 0.72; // B-pillar boundary
    const tC = maxThetaRad;        // Aft boundary

    // Z stations for windscreen sills & brows
    const zCenterSill = zFrontSill;
    const zCenterBrow = zRearBrow + deltaZ * 0.16;

    const zSideSill = zFrontSill - deltaZ * 0.18;
    const zSideBrow = zRearBrow + deltaZ * 0.04;

    const zAftSill = zFrontSill - deltaZ * 0.44;
    const zAftBrow = zRearBrow;

    const frameOffset = 0.038;
    const glassOffset = 0.035;

    for (const side of [-1, 1] as const) {
      const sign = side;
      const pane1 = buildCurvedConformalPane(
        zCenterBrow,
        zCenterSill,
        sign * 0.010,
        sign * tA,
        glassMaterial,
        4,
        4,
        glassOffset
      );
      const pane2 = buildCurvedConformalPane(
        zSideBrow,
        zSideSill,
        sign * tA,
        sign * tB,
        glassMaterial,
        4,
        4,
        glassOffset
      );
      const pane3 = buildCurvedConformalPane(
        zAftBrow,
        zAftSill,
        sign * tB,
        sign * tC,
        glassMaterial,
        4,
        4,
        glassOffset
      );
      fdGroup.add(pane1, pane2, pane3);
    }

    return fdGroup;
  };

  // Helper: Add a 100% hull-conformal flush passenger cabin window curved to match the fuselage surface normal
  // (Zero floating, zero protruding cylinders — sits flush with crisp metallic bezel on the aircraft skin!)
  const addConformalCabinWindowOnHull = (
    side: -1 | 1,
    fuselageCenterY: number,
    dy: number,
    wz: number,
    profile: Array<[number, number]>,
    scaleX: number,
    scaleY: number,
    winW: number,
    winH: number,
    frameMat: THREE.Material,
    paneMat: THREE.Material,
    isOval: boolean = false
  ) => {
    // 1. Calculate EXACT radius at this exact longitudinal station wz
    const r = getFuselageRadiusAtZ(wz, profile);
    const effRadiusY = Math.max(0.1, r * scaleY);
    const normY = THREE.MathUtils.clamp(dy / effRadiusY, -0.92, 0.92);
    const cosLat = Math.sqrt(Math.max(0.04, 1 - normY * normY));

    // Exact 3D point on the hull surface with clean proud clearance so it never clips into lathe chords
    const surfX = side * (r * scaleX * cosLat + 0.014);
    const surfY = fuselageCenterY + dy;
    const surfZ = wz;

    const winHolder = new THREE.Group();
    winHolder.position.set(surfX, surfY, surfZ);

    // Exact orthonormal right-handed tangent frame
    const normVec = new THREE.Vector3(side * cosLat / scaleX, normY / scaleY, 0).normalize();
    const upVec = new THREE.Vector3(-side * normY / scaleX, cosLat / scaleY, 0).normalize();
    // In right-handed coords: X x Y = Z. So Right = Up x Norm
    const rightVec = new THREE.Vector3().crossVectors(upVec, normVec).normalize();
    const rotMat = new THREE.Matrix4().makeBasis(rightVec, upVec, normVec);
    winHolder.quaternion.setFromRotationMatrix(rotMat);

    // Build curved conformal window geometry:
    // Vertices wrap along the cylindrical radius R = r * scaleY
    // Deviation from tangent plane is dz = - (y^2) / (2 * R)
    const segs = isOval ? 24 : 12;
    const R_eff = Math.max(0.2, r * scaleY);

    if (isOval) {
      // Signature Gulfstream 28-inch Panoramic Oval Window
      const bezelGeo = new THREE.RingGeometry(winW * 0.36, winW * 0.50, segs);
      const posAttr = bezelGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const ly = posAttr.getY(i) * (winH / winW);
        posAttr.setY(i, ly);
        posAttr.setZ(i, - (ly * ly) / (2 * R_eff));
      }
      bezelGeo.computeVertexNormals();
      const bezel = new THREE.Mesh(bezelGeo, frameMat);
      bezel.renderOrder = 11;
      winHolder.add(bezel);

      const paneGeo = new THREE.CircleGeometry(winW * 0.38, segs);
      const panePos = paneGeo.attributes.position;
      for (let i = 0; i < panePos.count; i++) {
        const ly = panePos.getY(i) * (winH / winW);
        panePos.setY(i, ly);
        panePos.setZ(i, - (ly * ly) / (2 * R_eff) + 0.002);
      }
      paneGeo.computeVertexNormals();
      const pane = new THREE.Mesh(paneGeo, paneMat);
      pane.renderOrder = 12;
      winHolder.add(pane);
    } else {
      // Boeing 787 Dreamliner Rounded-Corner Large Rectangular Window
      const hw = winW * 0.5;
      const hh = winH * 0.5;
      const shape = new THREE.Shape();
      const cr = Math.min(hw, hh) * 0.35;
      shape.moveTo(-hw + cr, -hh);
      shape.lineTo(hw - cr, -hh);
      shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
      shape.lineTo(hw, hh - cr);
      shape.quadraticCurveTo(hw, hh, hw - cr, hh);
      shape.lineTo(-hw + cr, hh);
      shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
      shape.lineTo(-hw, -hh + cr);
      shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);

      const frameGeo = new THREE.ShapeGeometry(shape, 8);
      const posAttr = frameGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const ly = posAttr.getY(i);
        posAttr.setZ(i, - (ly * ly) / (2 * R_eff));
      }
      frameGeo.computeVertexNormals();
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.renderOrder = 11;
      winHolder.add(frame);

      const inW = hw * 0.82;
      const inH = hh * 0.82;
      const inCr = cr * 0.82;
      const inShape = new THREE.Shape();
      inShape.moveTo(-inW + inCr, -inH);
      inShape.lineTo(inW - inCr, -inH);
      inShape.quadraticCurveTo(inW, -inH, inW, -inH + inCr);
      inShape.lineTo(inW, inH - inCr);
      inShape.quadraticCurveTo(inW, inH, inW - inCr, inH);
      inShape.lineTo(-inW + inCr, inH);
      inShape.quadraticCurveTo(-inW, inH, -inW, inH - inCr);
      inShape.lineTo(-inW, -inH + inCr);
      inShape.quadraticCurveTo(-inW, -inH, -inW + inCr, -inH);

      const inPaneGeo = new THREE.ShapeGeometry(inShape, 8);
      const inPos = inPaneGeo.attributes.position;
      for (let i = 0; i < inPos.count; i++) {
        const ly = inPos.getY(i);
        inPos.setZ(i, - (ly * ly) / (2 * R_eff) + 0.002);
      }
      inPaneGeo.computeVertexNormals();
      const pane = new THREE.Mesh(inPaneGeo, paneMat);
      pane.renderOrder = 12;
      winHolder.add(pane);
    }

    group.add(winHolder);
  };

  // Helper: Build a conformal, multi-section fighter aircraft canopy with a flat-raked 3-pane armored windscreen,
  // wide fuselage coaming sill rails (never pinched like an oval!), and an integrated aft dorsal spine fairing
  const buildConformalFighterCanopy = (cfg: {
    ySill: number;
    yPeak: number;
    zFront: number;
    zArch: number;
    zRear: number;
    wFront: number;
    wArch: number;
    wRear: number;
    frameMat: THREE.Material;
    spineMat: THREE.Material;
  }): THREE.Group => {
    const canopyGrp = new THREE.Group();
    canopyGrp.name = 'cockpitCanopy';

    const { ySill, yPeak, zFront, zArch, zRear, wFront, wArch, wRear, frameMat, spineMat } = cfg;
    const archH = yPeak - ySill;

    // 1. Dark recessed cockpit tub & anti-glare instrument coaming under the windscreen
    const tubLen = zFront - zRear;
    const tub = new THREE.Mesh(
      new THREE.BoxGeometry(wArch * 1.65, 0.14, tubLen * 0.86),
      cockpitInteriorMat
    );
    tub.position.set(0, ySill - 0.02, (zFront + zRear) * 0.5);
    canopyGrp.add(tub);

    // Hud combiner glass inside the forward windscreen
    const hudGlass = new THREE.Mesh(
      new THREE.BoxGeometry(wFront * 0.72, archH * 0.42, 0.015),
      new THREE.MeshPhysicalMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.38,
        roughness: 0.05,
      })
    );
    hudGlass.position.set(0, ySill + archH * 0.28, zFront - (zFront - zArch) * 0.58);
    hudGlass.rotation.x = -0.38;
    canopyGrp.add(hudGlass);

    // 2. Forward 3-Pane Raked Armored Windscreen (Flat angled center pane + angled side cheek panes)
    const cFrontBot: [number, number, number] = [0, ySill + 0.03, zFront];
    const cArchTop: [number, number, number] = [0, yPeak, zArch];
    const lFrontBot: [number, number, number] = [-wFront * 0.52, ySill + 0.02, zFront - (zFront - zArch) * 0.18];
    const rFrontBot: [number, number, number] = [wFront * 0.52, ySill + 0.02, zFront - (zFront - zArch) * 0.18];
    const lArchTop: [number, number, number] = [-wArch * 0.52, yPeak - archH * 0.14, zArch];
    const rArchTop: [number, number, number] = [wArch * 0.52, yPeak - archH * 0.14, zArch];
    const lArchSill: [number, number, number] = [-wArch, ySill, zArch];
    const rArchSill: [number, number, number] = [wArch, ySill, zArch];

    // Center flat-raked armored glass panel
    canopyGrp.add(
      buildAirplaneGlassQuad(lFrontBot, rFrontBot, rArchTop, lArchTop),
      // Left & right forward cheek windscreen panels
      buildAirplaneGlassQuad(lArchSill, lFrontBot, lArchTop, lArchSill),
      buildAirplaneGlassQuad(rFrontBot, rArchSill, rArchTop, rFrontBot)
    );

    // Windscreen structural frames & main forward canopy arch bow
    const strutR = 0.026;
    canopyGrp.add(
      buildAirplaneFrameStrut(lFrontBot, lArchTop, strutR, frameMat),
      buildAirplaneFrameStrut(rFrontBot, rArchTop, strutR, frameMat),
      buildAirplaneFrameStrut(lFrontBot, rFrontBot, strutR, frameMat),
      buildAirplaneFrameStrut(lArchSill, lFrontBot, strutR, frameMat),
      buildAirplaneFrameStrut(rFrontBot, rArchSill, strutR, frameMat),
      buildAirplaneFrameStrut(lArchSill, lArchTop, strutR * 1.15, frameMat),
      buildAirplaneFrameStrut(lArchTop, rArchTop, strutR * 1.15, frameMat),
      buildAirplaneFrameStrut(rArchTop, rArchSill, strutR * 1.15, frameMat)
    );

    // 3. Conformal Aft Teardrop Canopy Hood (Custom half-arch mesh from ySill upward so it NEVER pinches inward like an oval!)
    const segsZ = 18;
    const segsArc = 16;
    const hoodPositions: number[] = [];
    const hoodIndices: number[] = [];

    for (let iz = 0; iz <= segsZ; iz++) {
      const fz = iz / segsZ; // 0 at zArch -> 1 at zRear
      const curZ = THREE.MathUtils.lerp(zArch, zRear, fz);
      // Smooth aerodynamic teardrop profile along Z
      const widthScale = Math.pow(1 - Math.pow(fz, 1.65), 0.55);
      const heightScale = Math.pow(1 - Math.pow(fz, 1.45), 0.68);
      const halfW = THREE.MathUtils.lerp(wRear * 0.45, wArch, widthScale);
      const curH = archH * heightScale;

      for (let ia = 0; ia <= segsArc; ia++) {
        const fa = ia / segsArc; // 0 (left sill) -> 0.5 (top crown) -> 1 (right sill)
        const theta = (fa - 0.5) * Math.PI; // -PI/2 to +PI/2
        const vx = Math.sin(theta) * halfW;
        // Flattened crown at zArch to match the 3-pane windscreen top edge seamlessly
        const crownBlend = Math.max(0, 1 - fz * 2.5);
        const rawY = Math.cos(theta) * curH;
        const vy = ySill + (crownBlend > 0 ? Math.min(curH, rawY * (1 + crownBlend * 0.08)) : rawY);
        hoodPositions.push(vx, vy, curZ);
      }
    }

    for (let iz = 0; iz < segsZ; iz++) {
      for (let ia = 0; ia < segsArc; ia++) {
        const a = iz * (segsArc + 1) + ia;
        const b = a + 1;
        const c = (iz + 1) * (segsArc + 1) + ia;
        const d = c + 1;
        hoodPositions;
        hoodIndices.push(a, b, d, a, d, c);
      }
    }

    const hoodGeo = new THREE.BufferGeometry();
    hoodGeo.setAttribute('position', new THREE.Float32BufferAttribute(hoodPositions, 3));
    hoodGeo.setIndex(hoodIndices);
    hoodGeo.computeVertexNormals();
    const hoodMesh = new THREE.Mesh(hoodGeo, cockpitWindscreenMat);
    canopyGrp.add(hoodMesh);

    // 4. Flush Fuselage-Colored Canopy Sill Rails & Aft Dorsal Spine Fairing
    for (const side of [-1, 1] as const) {
      const sillStart: [number, number, number] = [side * wFront * 0.55, ySill - 0.01, zFront - 0.05];
      const sillMid: [number, number, number] = [side * (wArch + 0.02), ySill - 0.01, zArch];
      const sillEnd: [number, number, number] = [side * (wRear * 0.65), ySill - 0.01, zRear];
      canopyGrp.add(
        buildAirplaneFrameStrut(sillStart, sillMid, strutR * 1.45, spineMat),
        buildAirplaneFrameStrut(sillMid, sillEnd, strutR * 1.45, spineMat)
      );
    }

    // Streamlined dorsal spine fairing behind the canopy so it merges into the fuselage spine
    const dorsalFairing = new THREE.Mesh(
      new THREE.CylinderGeometry(wRear * 0.25, wRear * 0.72, 1.35, 14),
      spineMat
    );
    dorsalFairing.rotation.x = Math.PI / 2 - 0.14;
    dorsalFairing.scale.set(1.0, 0.55, 1.0);
    dorsalFairing.position.set(0, ySill + 0.06, zRear - 0.55);
    canopyGrp.add(dorsalFairing);

    return canopyGrp;
  };

  if (style === 'jetpack') {
    // =========================================================================
    // APEX QUANTUM EXO-JETPACK (ULTRA-FAST PLASMA EXO-SUIT)
    // =========================================================================
    // Backplate Frame & Carbon Harness
    const harnessPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 1.35, 0.42),
      darkMetal
    );
    harnessPlate.position.set(0, 1.35, 0.05);
    group.add(harnessPlate);

    const reactorOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.95, roughness: 0.1 })
    );
    reactorOrb.position.set(0, 1.45, 0.24);
    group.add(reactorOrb);

    const reactorLight = new THREE.PointLight(0x38bdf8, 2.5, 8);
    reactorLight.position.set(0, 1.45, 0.32);
    group.add(reactorLight);

    // Shoulder Straps & Waist Harness
    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.05, 8, 16, Math.PI * 1.1),
        gunmetalMat
      );
      strap.position.set(side * 0.22, 1.65, -0.1);
      strap.rotation.y = side * 0.2;
      group.add(strap);
    }

    // Twin High-Thrust Turbine Cylinders
    for (const side of [-1, 1]) {
      const turbineX = side * 0.58;
      const turbineY = 1.35;
      const turbineZ = 0.12;

      // Main Turbine Tube
      const turbineBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.36, 1.6, 20),
        bodyMat
      );
      turbineBody.position.set(turbineX, turbineY, turbineZ);
      group.add(turbineBody);

      // Accent Shell Ring
      const accentRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.3, 20),
        accentMat
      );
      accentRing.position.set(turbineX, turbineY + 0.35, turbineZ);
      group.add(accentRing);

      // Top Air Intake Cone & Fan Blades
      const intakeCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.4, 16),
        darkMetal
      );
      intakeCone.position.set(turbineX, turbineY + 0.9, turbineZ);
      group.add(intakeCone);

      const fanFan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.08, 12),
        chromeMat
      );
      fanFan.position.set(turbineX, turbineY + 0.72, turbineZ);
      propeller.add(fanFan);

      // Exhaust Nozzle
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.22, 0.45, 16),
        darkMetal
      );
      nozzle.position.set(turbineX, turbineY - 0.95, turbineZ);
      group.add(nozzle);

      // High-Thrust Plasma Afterburner Flame
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 1.8, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.88 })
      );
      flame.rotation.x = Math.PI;
      flame.position.set(turbineX, turbineY - 1.95, turbineZ);
      group.add(flame);
      afterburners.push(flame);

      // Stabilization Winglets
      const winglet = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.08, 0.32),
        accentMat
      );
      winglet.position.set(side * 0.95, turbineY + 0.2, turbineZ - 0.08);
      winglet.rotation.z = side * -0.15;
      winglet.rotation.y = side * 0.1;
      group.add(winglet);

      // Tip Nav LED
      const ledMat = new THREE.MeshBasicMaterial({ color: side === -1 ? 0xef4444 : 0x22c55e });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ledMat);
      led.position.set(side * 1.35, turbineY + 0.2, turbineZ - 0.08);
      group.add(led);
    }

    group.add(propeller);
    return {
      group,
      propeller,
      afterburners,
      gearGroup,
    };
  }

  if (style === 'cessna' || style === 'turboprop') {
    // =========================================================================
    // 1. CESSNA 172S SKYHAWK (High-Wing Touring Prop with Integrated Framed Cabin Greenhouse)
    // =========================================================================
    const isTurbo = style === 'turboprop';
    const fuselageProfile: Array<[number, number]> = [
      [-6.2, 0.08],
      [-4.8, 0.32],
      [-2.4, 0.58],
      [-0.6, 0.78],
      [1.4, 0.76],
      [2.2, 0.58],
      [3.6, 0.48],
      [4.6, 0.36],
      [4.95, 0.04],
    ];
    const mainFuselage = buildContouredFuselageMesh(fuselageProfile, 0.92, 0.96, bodyMat);
    mainFuselage.position.set(0, 1.82, 0);
    group.add(mainFuselage);

    for (const sx of [-0.36, 0.36]) {
      const intake = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.18, 0.12),
        cockpitInteriorMat
      );
      intake.position.set(sx, 1.76, 4.82);
      group.add(intake);
    }

    // Integrated Cessna High-Wing Framed Cabin Greenhouse (Replaces oval SphereGeometry!)
    const canopyGroup = new THREE.Group();
    canopyGroup.name = 'cockpitCanopy';

    // Lower cabin fuselage shoulder fairing & upper high-wing center roof section
    const lowerCabinShoulder = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.38, 3.4),
      bodyMat
    );
    lowerCabinShoulder.position.set(0, 1.88, 0.85);
    canopyGroup.add(lowerCabinShoulder);

    // Main cabin roof
    const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.11, 2.72), bodyMat);
    cabinRoof.position.set(0, 3.10, 0.45);
    canopyGroup.add(cabinRoof);

    // Solid Forward Roof Brow Bridge connecting cabin roof forward to windshield top header (Zero gaps!)
    const roofBrowBridge = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.11, 0.45),
      bodyMat
    );
    roofBrowBridge.position.set(0, 3.10, 1.70);
    canopyGroup.add(roofBrowBridge);

    // Solid Front Windshield Base Cowl Fairing connecting main fuselage smoothly to windshield sills (Zero gaps!)
    const dashCowlFairing = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.32, 0.85),
      bodyMat
    );
    dashCowlFairing.position.set(0, 2.38, 2.15);
    dashCowlFairing.rotation.x = -0.22;
    canopyGroup.add(dashCowlFairing);

    // Aft dorsal fuselage fairing behind rear window
    const aftDorsalFairing = buildAirplaneGlassQuad(
      [-0.52, 2.54, -1.72],
      [0.52, 2.54, -1.72],
      [0.64, 3.06, -0.88],
      [-0.64, 3.06, -0.88],
      bodyMat
    );
    canopyGroup.add(aftDorsalFairing);

    // Recessed dark cabin dashboard & interior ceiling
    const cessnaDash = new THREE.Mesh(
      new THREE.BoxGeometry(1.32, 0.18, 0.75),
      cockpitInteriorMat
    );
    cessnaDash.position.set(0, 2.48, 1.95);
    canopyGroup.add(cessnaDash);

    // 2-Pane V-Raked Sloped Front Windshield (elevated proud of engine cowling deck so 100% visible!)
    const wsSillCenter: [number, number, number] = [0, 2.54, 2.45];
    const wsRoofCenter: [number, number, number] = [0, 3.10, 1.58];
    canopyGroup.add(
      buildAirplaneFrameStrut(wsSillCenter, wsRoofCenter, 0.032, darkMetal)
    );

    for (const side of [-1, 1] as const) {
      const wsSillCorner: [number, number, number] = [side * 0.70, 2.52, 2.18];
      const wsRoofCorner: [number, number, number] = [side * 0.66, 3.10, 1.54];
      const bSill: [number, number, number] = [side * 0.72, 2.52, 0.35];
      const bRoof: [number, number, number] = [side * 0.66, 3.10, 0.35];
      const cSill: [number, number, number] = [side * 0.68, 2.52, -0.86];
      const cRoof: [number, number, number] = [side * 0.64, 3.08, -0.86];
      const dSill: [number, number, number] = [side * 0.54, 2.52, -1.68];

      // Raked Front Windshield Half-Pane
      const frontWsPane =
        side === 1
          ? buildAirplaneGlassQuad(wsSillCenter, wsSillCorner, wsRoofCorner, wsRoofCenter)
          : buildAirplaneGlassQuad(wsSillCorner, wsSillCenter, wsRoofCenter, wsRoofCorner);
      // Flush Front Pilot Door Window
      const doorWinPane =
        side === 1
          ? buildAirplaneGlassQuad(wsSillCorner, bSill, bRoof, wsRoofCorner)
          : buildAirplaneGlassQuad(bSill, wsSillCorner, wsRoofCorner, bRoof);
      // Flush Rear Passenger Cabin Window
      const rearPaxPane =
        side === 1
          ? buildAirplaneGlassQuad(bSill, cSill, cRoof, bRoof)
          : buildAirplaneGlassQuad(cSill, bSill, bRoof, cRoof);

      canopyGroup.add(frontWsPane, doorWinPane, rearPaxPane);

      // Flush Structural A-Pillar, B-Pillar, C-Pillar & Sill Frames
      canopyGroup.add(
        buildAirplaneFrameStrut(wsSillCorner, wsRoofCorner, 0.042, darkMetal),
        buildAirplaneFrameStrut(bSill, bRoof, 0.042, darkMetal),
        buildAirplaneFrameStrut(cSill, cRoof, 0.044, darkMetal),
        buildAirplaneFrameStrut(cRoof, dSill, 0.042, darkMetal),
        buildAirplaneFrameStrut(wsSillCenter, wsSillCorner, 0.034, darkMetal),
        buildAirplaneFrameStrut(wsSillCorner, bSill, 0.034, darkMetal),
        buildAirplaneFrameStrut(bSill, cSill, 0.034, darkMetal)
      );
    }
    group.add(canopyGroup);

    addCockpitInterior(2.18, 2.1, 1.15);

    for (const sx of [-0.82, 0.82]) {
      const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.15, 6.4), accentMat);
      stripe1.position.set(sx, 1.82, 0.15);
      const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 5.6), darkMetal);
      stripe2.position.set(sx, 1.62, -0.05);
      group.add(stripe1, stripe2);
    }

    const halfSpan = 7.8;
    const wingY = 2.86;
    const wingZ = 0.72;
    for (const side of [-1, 1] as const) {
      const wingPanel = new THREE.Group();
      wingPanel.position.set(side * 0.55, wingY, wingZ);
      wingPanel.rotation.z = side * 0.03;

      const airfoilMesh = buildTaperedAirfoilWing(side, halfSpan, 1.9, 1.25, 0.18, 0.18, bodyMat);
      wingPanel.add(airfoilMesh);

      const leadingStrip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.04, halfSpan, 12),
        accentMat
      );
      leadingStrip.rotation.z = Math.PI / 2;
      leadingStrip.rotation.y = side * 0.01;
      leadingStrip.position.set(side * (halfSpan * 0.5), 0.04, 0.82);
      wingPanel.add(leadingStrip);

      const aileronFlap = buildAttachedTrailingFlap(
        side,
        halfSpan,
        1.9,
        1.25,
        0.18,
        0.18,
        0.52,
        0.92,
        0.34,
        accentMat
      );
      wingPanel.add(aileronFlap);
      if (side === -1) aileronL = aileronFlap;
      else aileronR = aileronFlap;

      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 10, 10),
        new THREE.MeshBasicMaterial({ color: side === -1 ? 0xef4444 : 0x22c55e })
      );
      navLight.position.set(side * (halfSpan + 0.06), 0.05, -0.18);
      wingPanel.add(navLight);

      group.add(wingPanel);

      const strutFrom = new THREE.Vector3(side * 0.72, 1.28, wingZ + 0.08);
      const strutTo = new THREE.Vector3(side * 4.35, wingY + 0.02, wingZ + 0.08);
      const strutDir = new THREE.Vector3().subVectors(strutTo, strutFrom);
      const strutMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, strutDir.length(), 12),
        bodyMat
      );
      strutMesh.scale.set(0.55, 1.0, 1.45);
      strutMesh.position.copy(strutFrom).addScaledVector(strutDir, 0.5);
      strutMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strutDir.clone().normalize());
      strutMesh.castShadow = true;
      group.add(strutMesh);
    }

    const tailZ = -5.15;
    const vFin = buildTaperedVerticalTail(2.35, 1.95, 0.85, 0.85, 0.16, bodyMat);
    vFin.position.set(0, 1.95, tailZ);
    group.add(vFin);

    const rudderPivot = buildAttachedRudderFlap(2.35, 1.95, 0.85, 0.85, 0.16, 0.42, accentMat);
    rudderPivot.position.x += 0;
    rudderPivot.position.y += 1.95;
    rudderPivot.position.z += tailZ;
    group.add(rudderPivot);
    rudder = rudderPivot;

    const hStabY = 1.92;
    const hStabZ = tailZ - 0.15;
    const elevGroup = new THREE.Group();
    elevGroup.position.set(0, hStabY, hStabZ);
    for (const side of [-1, 1] as const) {
      const hStabWing = buildTaperedAirfoilWing(side, 2.35, 1.25, 0.68, 0.38, 0.11, bodyMat);
      hStabWing.position.set(0, hStabY, hStabZ);
      group.add(hStabWing);

      const elevFlap = buildAttachedTrailingFlap(
        side,
        2.35,
        1.25,
        0.68,
        0.38,
        0.11,
        0.12,
        0.94,
        0.3,
        accentMat
      );
      elevGroup.add(elevFlap);
    }
    group.add(elevGroup);
    elevator = elevGroup;

    propeller.position.set(0, 1.82, 4.92);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.68, 24), chromeMat);
    spinner.rotation.x = Math.PI / 2;
    spinner.position.z = 0.22;
    propeller.add(spinner);

    const tipYellow = getStandardMat('#facc15', 0.3, 0.2);
    const numBlades = isTurbo ? 5 : 3;
    for (let b = 0; b < numBlades; b++) {
      const bladeGrp = new THREE.Group();
      bladeGrp.rotation.z = (b * Math.PI * 2) / numBlades;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.36, 0.032), darkMetal);
      blade.position.y = 0.7;
      blade.rotation.y = 0.26;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.16, 0.035), tipYellow);
      tip.position.y = 1.32;
      tip.rotation.y = 0.26;
      bladeGrp.add(blade, tip);
      propeller.add(bladeGrp);
    }
    group.add(propeller);

    // Retractable Tricycle Landing Gear with Streamlined Wheel Pants
    addDetailedWheelAssembly(0, 0.3, 3.65, 1.15, 0.3, 0.16, false, !isTurbo);
    addDetailedWheelAssembly(-1.45, 0.32, 0.35, 1.15, 0.34, 0.18, false, !isTurbo);
    addDetailedWheelAssembly(1.45, 0.32, 0.35, 1.15, 0.34, 0.18, false, !isTurbo);
  } else if (style === 'mustang') {
    // =========================================================================
    // 2. NORTH AMERICAN P-51D MUSTANG — V12 Merlin Warbird, Belly Scoop, 4-Blade Prop & Conformal Framed Canopy
    // =========================================================================
    const fuselageProfile: Array<[number, number]> = [
      [-6.4, 0.08],
      [-5.1, 0.32],
      [-3.0, 0.56],
      [-0.8, 0.72],
      [1.4, 0.62],
      [3.4, 0.58],
      [4.85, 0.46],
      [5.35, 0.32],
      [5.45, 0.04],
    ];
    const fuselage = buildContouredFuselageMesh(fuselageProfile, 0.86, 1.08, bodyMat, 32);
    fuselage.position.set(0, 1.88, 0);
    group.add(fuselage);

    // Blue "Cripes A' Mighty" Nose Cowling Band & D-Day Invasion Stripes
    const noseBand = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.74, 2.2, 28), accentMat);
    noseBand.rotation.x = Math.PI / 2;
    noseBand.scale.set(0.87, 1.09, 1.0);
    noseBand.position.set(0, 1.88, 4.2);
    group.add(noseBand);

    // 12 V12 Rolls-Royce Packard Merlin Exhaust Stacks (6 per side)
    for (const side of [-1, 1]) {
      for (let eIdx = 0; eIdx < 6; eIdx++) {
        const stack = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.065, 0.28, 10),
          darkMetal
        );
        stack.rotation.z = side * -1.25;
        stack.rotation.y = side * -0.35;
        stack.position.set(side * 0.66, 2.02, 4.55 - eIdx * 0.34);
        group.add(stack);
      }
    }

    // Iconic Ventral Belly Meredith-Effect Radiator Scoop under Rear Wing Root
    const bellyScoop = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.52, 3.2), bodyMat);
    bellyScoop.position.set(0, 1.12, -1.25);
    const scoopMouth = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.42, 0.16), cockpitInteriorMat);
    scoopMouth.position.set(0, 1.1, 0.36);
    group.add(bellyScoop, scoopMouth);

    // Conformal P-51D Mustang 3-Pane Armored Windscreen & Teardrop Sliding Canopy (Proud on fuselage sill!)
    const canopyGroup = buildConformalFighterCanopy({
      ySill: 2.58,
      yPeak: 3.12,
      zFront: 1.72,
      zArch: 0.92,
      zRear: -1.35,
      wFront: 0.54,
      wArch: 0.56,
      wRear: 0.38,
      frameMat: chromeMat,
      spineMat: bodyMat,
    });
    group.add(canopyGroup);

    addCockpitInterior(2.22, 1.15, 0.88);

    // Laminar-Flow Low Wings with 6x .50-Cal Browning Machine Gun Barrels & Invasion Stripes
    const halfSpan = 7.9;
    for (const side of [-1, 1] as const) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.58, 1.38, 0.65);
      wingPivot.rotation.z = side * 0.07; // 5-degree dihedral

      const laminarWing = buildTaperedAirfoilWing(side, halfSpan, 2.35, 1.15, 0.45, 0.19, bodyMat);
      wingPivot.add(laminarWing);

      // Black & White D-Day Invasion Stripes on Wing
      const stripeW = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.22, 2.05),
        getStandardMat('#f8fafc', 0.3, 0.1)
      );
      stripeW.position.set(side * 2.4, 0.02, -0.15);
      const stripeB = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.23, 2.06),
        cockpitInteriorMat
      );
      stripeB.position.set(side * 2.4, 0.02, -0.15);
      wingPivot.add(stripeW, stripeB);

      // 3x .50-Caliber Machine Gun Barrels per Wing Leading Edge
      for (let gIdx = 0; gIdx < 3; gIdx++) {
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, 0.45, 10),
          gunmetalMat
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(side * (2.15 + gIdx * 0.26), 0.04, 1.18 - gIdx * 0.04);
        wingPivot.add(barrel);
      }

      const aileronFlap = buildAttachedTrailingFlap(
        side,
        halfSpan,
        2.35,
        1.15,
        0.45,
        0.19,
        0.52,
        0.92,
        0.36,
        accentMat
      );
      wingPivot.add(aileronFlap);
      if (side === -1) aileronL = aileronFlap;
      else aileronR = aileronFlap;

      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 10, 10),
        new THREE.MeshBasicMaterial({ color: side === -1 ? 0xef4444 : 0x22c55e })
      );
      navLight.position.set(side * (halfSpan + 0.05), 0.05, -0.45);
      wingPivot.add(navLight);

      group.add(wingPivot);
    }

    // Tall P-51D Dorsal Fin Fillet, Vertical Tail & Attached Hinged Rudder
    const vFin = buildTaperedVerticalTail(2.45, 2.15, 0.92, 0.65, 0.16, bodyMat);
    vFin.position.set(0, 1.95, -5.25);
    group.add(vFin);

    const rudderPivot = buildAttachedRudderFlap(2.45, 2.15, 0.92, 0.65, 0.16, 0.46, accentMat);
    rudderPivot.position.y += 1.95;
    rudderPivot.position.z += -5.25;
    group.add(rudderPivot);
    rudder = rudderPivot;

    const elevGroup = new THREE.Group();
    elevGroup.position.set(0, 1.96, -5.35);
    for (const side of [-1, 1] as const) {
      const hStab = buildTaperedAirfoilWing(side, 2.45, 1.25, 0.65, 0.32, 0.11, bodyMat);
      hStab.position.set(0, 1.96, -5.35);
      group.add(hStab);

      const elevFlap = buildAttachedTrailingFlap(
        side,
        2.45,
        1.25,
        0.65,
        0.32,
        0.11,
        0.12,
        0.94,
        0.32,
        accentMat
      );
      elevGroup.add(elevFlap);
    }
    group.add(elevGroup);
    elevator = elevGroup;

    // 4-Blade Hamilton Standard Propeller with Large Pointed Spinner Cone
    propeller.position.set(0, 1.88, 5.42);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.98, 28), accentMat);
    spinner.rotation.x = Math.PI / 2;
    spinner.position.z = 0.32;
    propeller.add(spinner);

    const tipYellow = getStandardMat('#facc15', 0.3, 0.2);
    for (let b = 0; b < 4; b++) {
      const bladeGrp = new THREE.Group();
      bladeGrp.rotation.z = (b * Math.PI) / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.58, 0.035), darkMetal);
      blade.position.y = 0.82;
      blade.rotation.y = 0.28;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.18, 0.038), tipYellow);
      tip.position.y = 1.54;
      tip.rotation.y = 0.28;
      bladeGrp.add(blade, tip);
      propeller.add(bladeGrp);
    }
    group.add(propeller);

    // Retractable Warbird Landing Gear
    addDetailedWheelAssembly(0, 0.32, 3.85, 1.15, 0.3, 0.16, false, false);
    addDetailedWheelAssembly(-1.85, 0.34, 0.85, 1.12, 0.36, 0.2, false, false);
    addDetailedWheelAssembly(1.85, 0.34, 0.85, 1.12, 0.36, 0.2, false, false);
  } else if (style === 'learjet') {
    // =========================================================================
    // 3. GULFSTREAM G700 EXECUTIVE JET — Contoured Lathe Fuselage, Flush 6-Pane Flight Deck & Hull-Tangent Oval Windows
    // =========================================================================
    const fuselageProfile: Array<[number, number]> = [
      [-8.2, 0.06],
      [-6.8, 0.45],
      [-5.2, 0.88],
      [-3.5, 1.06],
      [3.8, 1.08],
      [5.4, 0.88],
      [6.8, 0.52],
      [7.85, 0.18],
      [8.05, 0.03],
    ];
    const fuselage = buildContouredFuselageMesh(fuselageProfile, 1.0, 1.02, bodyMat, 36);
    fuselage.position.set(0, 1.88, 0);
    group.add(fuselage);

    const radomeCap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 24), accentMat);
    radomeCap.rotation.x = Math.PI / 2;
    radomeCap.position.set(0, 1.88, 7.65);
    group.add(radomeCap);

    // Executive jet cheatline stripe removed

    // Signature Gulfstream Panoramic Cabin Windows — Curved & rotated 100% conformal to the fuselage surface!
    const cabinWindowMat = new THREE.MeshPhysicalMaterial({
      color: 0x071324,
      roughness: 0.04,
      metalness: 0.24,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
    });
    for (const side of [-1, 1] as const) {
      for (let wIdx = 0; wIdx < 7; wIdx++) {
        const wz = 3.0 - wIdx * 1.0;
        addConformalCabinWindowOnHull(
          side,
          1.88,
          0.22,
          wz,
          fuselageProfile,
          1.0,
          1.02,
          0.52,
          0.38,
          chromeMat,
          cabinWindowMat,
          true
        );
      }
    }

    // Conformal 6-Pane Gulfstream G700 Flight Deck Windscreen sitting 100% flush on the tapered nose contour
    const g700FlightDeck = buildConformalJetlinerFlightDeck(
      fuselageProfile,
      1.88,
      1.0,
      1.02,
      6.35,
      4.70,
      0.96,
      cockpitWindscreenMat,
      darkMetal
    );
    group.add(g700FlightDeck);

    addCockpitInterior(2.24, 4.95, 1.1);

    const bellyFairing = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 5.2, 14, 20), bodyMat);
    bellyFairing.rotation.x = Math.PI / 2;
    bellyFairing.scale.set(1.68, 0.54, 1.0);
    bellyFairing.position.set(0, 1.12, -0.2);
    group.add(bellyFairing);

    const halfSpan = 8.8;
    for (const side of [-1, 1] as const) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.85, 1.24, 0.65);
      wingPivot.rotation.z = side * 0.06;

      const sweptWing = buildTaperedAirfoilWing(side, halfSpan, 3.2, 1.05, 3.15, 0.19, bodyMat);
      wingPivot.add(sweptWing);

      const aileronFlap = buildAttachedTrailingFlap(
        side,
        halfSpan,
        3.2,
        1.05,
        3.15,
        0.19,
        0.52,
        0.92,
        0.38,
        accentMat
      );
      wingPivot.add(aileronFlap);
      if (side === -1) aileronL = aileronFlap;
      else aileronR = aileronFlap;

      const winglet = buildTaperedVerticalTail(1.65, 1.1, 0.45, 0.65, 0.12, accentMat);
      winglet.position.set(side * halfSpan, 0.05, -3.15);
      winglet.rotation.z = side * -0.18;
      wingPivot.add(winglet);

      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        new THREE.MeshBasicMaterial({ color: side === -1 ? 0xef4444 : 0x22c55e })
      );
      navLight.position.set(side * (halfSpan + 0.06), 0.1, -3.15);
      wingPivot.add(navLight);

      group.add(wingPivot);
    }

    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 1.95), bodyMat);
      pylon.position.set(side * 1.22, 2.34, -3.65);
      pylon.rotation.z = side * 0.18;
      group.add(pylon);

      const nx = side * 1.82;
      const ny = 2.46;
      const nz = -3.65;

      const nacelle = buildContouredFuselageMesh(
        [
          [-1.65, 0.46],
          [-0.8, 0.58],
          [0.8, 0.6],
          [1.6, 0.53],
        ],
        1.0,
        1.0,
        bodyMat,
        28
      );
      nacelle.position.set(nx, ny, nz);
      group.add(nacelle);

      const intakeLip = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.065, 16, 28), chromeMat);
      intakeLip.position.set(nx, ny, nz + 1.58);
      group.add(intakeLip);

      const fanDisk = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), cockpitInteriorMat);
      fanDisk.position.set(nx, ny, nz + 1.48);
      const fanSpinner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 16), chromeMat);
      fanSpinner.rotation.x = Math.PI / 2;
      fanSpinner.position.set(nx, ny, nz + 1.56);
      group.add(fanDisk, fanSpinner);

      for (let fb = 0; fb < 16; fb++) {
        const ang = (fb / 16) * Math.PI * 2;
        const fBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.02), gunmetalMat);
        fBlade.position.set(nx + Math.cos(ang) * 0.24, ny + Math.sin(ang) * 0.24, nz + 1.51);
        fBlade.rotation.z = ang;
        fBlade.rotation.y = 0.38;
        group.add(fBlade);
      }

      const exhaustNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.72, 24), darkMetal);
      exhaustNozzle.rotation.x = Math.PI / 2;
      exhaustNozzle.position.set(nx, ny, nz - 1.85);
      group.add(exhaustNozzle);

      const burner = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 1.5, 16),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.75 })
      );
      burner.rotation.x = -Math.PI / 2;
      burner.position.set(nx, ny, nz - 2.55);
      group.add(burner);
      afterburners.push(burner);
    }

    const vTail = buildTaperedVerticalTail(3.15, 2.65, 1.25, 1.65, 0.18, bodyMat);
    vTail.position.set(0, 2.05, -5.65);
    group.add(vTail);

    const rudderPivot = buildAttachedRudderFlap(3.15, 2.65, 1.25, 1.65, 0.18, 0.48, accentMat);
    rudderPivot.position.y += 2.05;
    rudderPivot.position.z += -5.65;
    group.add(rudderPivot);
    rudder = rudderPivot;

    const tTailBullet = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 2.4, 10, 16), accentMat);
    tTailBullet.rotation.x = Math.PI / 2;
    tTailBullet.position.set(0, 5.15, -7.15);
    group.add(tTailBullet);

    const elevGroup = new THREE.Group();
    elevGroup.position.set(0, 5.15, -7.15);
    for (const side of [-1, 1] as const) {
      const hTailWing = buildTaperedAirfoilWing(side, 2.65, 1.35, 0.65, 0.85, 0.12, bodyMat);
      hTailWing.position.set(0, 5.15, -7.15);
      group.add(hTailWing);

      const elevFlap = buildAttachedTrailingFlap(
        side,
        2.65,
        1.35,
        0.65,
        0.85,
        0.12,
        0.1,
        0.94,
        0.34,
        accentMat
      );
      elevGroup.add(elevFlap);
    }
    group.add(elevGroup);
    elevator = elevGroup;

    group.add(propeller);

    // Retractable Dual-Wheel Executive Jet Landing Gear
    addDetailedWheelAssembly(0, 0.3, 5.45, 1.12, 0.28, 0.15, true, false);
    addDetailedWheelAssembly(-1.65, 0.32, -0.35, 1.05, 0.34, 0.18, true, false);
    addDetailedWheelAssembly(1.65, 0.32, -0.35, 1.05, 0.34, 0.18, true, false);
  } else if (style === 'airliner') {
    // =========================================================================
    // 4. BOEING 787-9 DREAMLINER WIDE-BODY COMMERCIAL AIRLINER
    //    Flush 6-Pane 787 Flight Deck Windscreen, Hull-Tangent Cabin Windows & High-Bypass Turbofans
    // =========================================================================
    const fuselageProfile: Array<[number, number]> = [
      [-11.5, 0.08],
      [-9.6, 0.65],
      [-7.4, 1.28],
      [-5.2, 1.54],
      [5.8, 1.56],
      [7.8, 1.32],
      [9.6, 0.82],
      [10.85, 0.32],
      [11.15, 0.04],
    ];
    const fuselage = buildContouredFuselageMesh(fuselageProfile, 1.0, 1.06, bodyMat, 36);
    fuselage.position.set(0, 2.45, 0);
    group.add(fuselage);

    // Dreamliner Wave Livery Belly & Cheatline removed

    // 14 Flush Hull-Conformal Passenger Cabin Windows + 2 Flush Entry Doors per Side
    const paxWinMat = new THREE.MeshPhysicalMaterial({
      color: 0x071426,
      emissive: 0x0369a1,
      emissiveIntensity: 0.14,
      roughness: 0.04,
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
    });
    for (const side of [-1, 1] as const) {
      for (let wIdx = 0; wIdx < 14; wIdx++) {
        const wz = 5.2 - wIdx * 0.82;
        addConformalCabinWindowOnHull(
          side,
          2.45,
          0.26,
          wz,
          fuselageProfile,
          1.0,
          1.06,
          0.28,
          0.38,
          darkMetal,
          paxWinMat,
          false
        );
      }

    }

    // Conformal 6-Pane Boeing 787-9 Dreamliner Flight Deck Windscreen sitting 100% flush on the tapered nose contour
    const b787FlightDeck = buildConformalJetlinerFlightDeck(
      fuselageProfile,
      2.45,
      1.0,
      1.06,
      9.75,
      7.65,
      1.05,
      cockpitWindscreenMat,
      darkMetal
    );
    group.add(b787FlightDeck);

    addCockpitInterior(2.85, 8.15, 1.45);

    // Swept Raked-Tip Supercritical Low Wings
    const halfSpan = 12.6;
    for (const side of [-1, 1] as const) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 1.32, 1.68, 1.15);
      wingPivot.rotation.z = side * 0.085; // Characteristic 787 upward wing flex

      const mainWing = buildTaperedAirfoilWing(side, halfSpan, 4.4, 1.15, 4.85, 0.24, bodyMat);
      wingPivot.add(mainWing);

      // Raked Wingtip Accent
      const rakedTip = buildTaperedAirfoilWing(side, 1.65, 1.15, 0.42, 1.25, 0.14, accentMat);
      rakedTip.position.set(side * halfSpan, 0.02, -4.85);
      wingPivot.add(rakedTip);

      const aileronFlap = buildAttachedTrailingFlap(
        side,
        halfSpan,
        4.4,
        1.15,
        4.85,
        0.24,
        0.54,
        0.93,
        0.48,
        gunmetalMat
      );
      wingPivot.add(aileronFlap);
      if (side === -1) aileronL = aileronFlap;
      else aileronR = aileronFlap;

      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 10, 10),
        new THREE.MeshBasicMaterial({ color: side === -1 ? 0xef4444 : 0x22c55e })
      );
      navLight.position.set(side * (halfSpan + 1.55), 0.08, -6.1);
      wingPivot.add(navLight);

      group.add(wingPivot);

      // Massive Under-Wing Pylon-Mounted High-Bypass GEnx Turbofan Engines
      const engX = side * 4.65;
      const engY = 1.24;
      const engZ = 1.45;

      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 2.2), bodyMat);
      pylon.position.set(engX, engY + 0.65, engZ - 0.35);
      group.add(pylon);

      const nacelle = buildContouredFuselageMesh(
        [
          [-1.65, 0.72],
          [-0.6, 0.88],
          [0.85, 0.92],
          [1.65, 0.82],
        ],
        1.0,
        1.0,
        bodyMat,
        28
      );
      nacelle.position.set(engX, engY, engZ);
      group.add(nacelle);

      const intakeLip = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.085, 16, 28), chromeMat);
      intakeLip.position.set(engX, engY, engZ + 1.62);
      const fanDisk = new THREE.Mesh(new THREE.CircleGeometry(0.78, 24), cockpitInteriorMat);
      fanDisk.position.set(engX, engY, engZ + 1.48);
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 18), chromeMat);
      spinner.rotation.x = Math.PI / 2;
      spinner.position.set(engX, engY, engZ + 1.58);
      group.add(intakeLip, fanDisk, spinner);

      for (let fb = 0; fb < 20; fb++) {
        const ang = (fb / 20) * Math.PI * 2;
        const fBlade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.68, 0.025), gunmetalMat);
        fBlade.position.set(engX + Math.cos(ang) * 0.36, engY + Math.sin(ang) * 0.36, engZ + 1.52);
        fBlade.rotation.z = ang;
        fBlade.rotation.y = 0.4;
        group.add(fBlade);
      }

      const exhaustCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.64, 0.95, 24),
        darkMetal
      );
      exhaustCore.rotation.x = Math.PI / 2;
      exhaustCore.position.set(engX, engY, engZ - 1.85);
      group.add(exhaustCore);

      const burner = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 1.6, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 })
      );
      burner.rotation.x = -Math.PI / 2;
      burner.position.set(engX, engY, engZ - 2.65);
      group.add(burner);
      afterburners.push(burner);
    }

    // Swept Commercial Tail Fin ( painted in airline accent livery ) & Horizontal Stabilizers
    const vTail = buildTaperedVerticalTail(4.35, 3.6, 1.35, 2.25, 0.24, accentMat);
    vTail.position.set(0, 2.85, -8.35);
    group.add(vTail);

    const rudderPivot = buildAttachedRudderFlap(4.35, 3.6, 1.35, 2.25, 0.24, 0.65, bodyMat);
    rudderPivot.position.y += 2.85;
    rudderPivot.position.z += -8.35;
    group.add(rudderPivot);
    rudder = rudderPivot;

    const elevGroup = new THREE.Group();
    elevGroup.position.set(0, 2.55, -8.85);
    for (const side of [-1, 1] as const) {
      const hStab = buildTaperedAirfoilWing(side, 4.2, 2.1, 0.82, 1.65, 0.16, bodyMat);
      hStab.position.set(0, 2.55, -8.85);
      group.add(hStab);

      const elevFlap = buildAttachedTrailingFlap(
        side,
        4.2,
        2.1,
        0.82,
        1.65,
        0.16,
        0.14,
        0.94,
        0.42,
        gunmetalMat
      );
      elevGroup.add(elevFlap);
    }
    group.add(elevGroup);
    elevator = elevGroup;

    group.add(propeller);

    // Retractable Heavy Wide-Body Airliner Dual-Wheel Landing Gear
    addDetailedWheelAssembly(0, 0.38, 7.85, 1.38, 0.38, 0.22, true, false);
    addDetailedWheelAssembly(-2.55, 0.4, -0.45, 1.35, 0.44, 0.26, true, false);
    addDetailedWheelAssembly(2.55, 0.4, -0.45, 1.35, 0.44, 0.26, true, false);
  } else {
    // =========================================================================
    // 5 & 6. F-22A RAPTOR STEALTH FIGHTER & SR-72 DARKSTAR HYPERSONIC JET
    // =========================================================================
    const isDarkstar = style === 'darkstar';
    const fuselageLen = isDarkstar ? 15.2 : 12.8;

    const chineFuselage = buildContouredFuselageMesh(
      [
        [-fuselageLen * 0.45, 0.55],
        [-fuselageLen * 0.2, 1.12],
        [fuselageLen * 0.15, 1.18],
        [fuselageLen * 0.38, 0.78],
        [fuselageLen * 0.58, 0.28],
        [fuselageLen * 0.68, 0.02],
      ],
      1.35,
      0.58,
      bodyMat,
      8
    );
    chineFuselage.position.set(0, 1.82, 0);
    group.add(chineFuselage);

    const dorsalSpine = buildContouredFuselageMesh(
      [
        [-fuselageLen * 0.42, 0.38],
        [-fuselageLen * 0.1, 0.72],
        [fuselageLen * 0.22, 0.68],
        [fuselageLen * 0.42, 0.15],
      ],
      1.18,
      0.48,
      gunmetalMat,
      6
    );
    dorsalSpine.position.set(0, 2.16, -0.2);
    group.add(dorsalSpine);

    for (const side of [-1, 1]) {
      const intakeDuct = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.76, 4.8),
        bodyMat
      );
      intakeDuct.position.set(side * 1.38, 1.64, 0.65);
      intakeDuct.rotation.z = side * -0.18;
      group.add(intakeDuct);

      const intakeMouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.66, 0.26),
        cockpitInteriorMat
      );
      intakeMouth.position.set(side * 1.38, 1.64, 3.06);
      intakeMouth.rotation.z = side * -0.18;
      intakeMouth.rotation.y = side * -0.26;
      group.add(intakeMouth);
    }

    // Conformal Stealth Fighter / Hypersonic Chined Canopy with Raked Windscreen & Dorsal Spine Integration (No oval sphere!)
    const fighterCanopy = buildConformalFighterCanopy({
      ySill: isDarkstar ? 2.52 : 2.56,
      yPeak: isDarkstar ? 3.05 : 3.16,
      zFront: isDarkstar ? 4.85 : 4.25,
      zArch: isDarkstar ? 3.15 : 2.75,
      zRear: isDarkstar ? 0.15 : -0.15,
      wFront: isDarkstar ? 0.56 : 0.62,
      wArch: isDarkstar ? 0.68 : 0.74,
      wRear: isDarkstar ? 0.46 : 0.48,
      frameMat: darkMetal,
      spineMat: gunmetalMat,
    });
    group.add(fighterCanopy);

    addCockpitInterior(2.28, 3.25, 0.92);

    const halfSpan = isDarkstar ? 6.6 : 7.6;
    for (const side of [-1, 1] as const) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 1.15, 1.78, 0.35);
      wingPivot.rotation.z = side * -0.025;

      const deltaWing = buildTaperedAirfoilWing(
        side,
        halfSpan,
        isDarkstar ? 5.6 : 4.8,
        isDarkstar ? 1.15 : 1.35,
        isDarkstar ? 2.85 : 1.95,
        0.16,
        bodyMat
      );
      wingPivot.add(deltaWing);

      const aileronFlap = buildAttachedTrailingFlap(
        side,
        halfSpan,
        isDarkstar ? 5.6 : 4.8,
        isDarkstar ? 1.15 : 1.35,
        isDarkstar ? 2.85 : 1.95,
        0.16,
        0.38,
        0.9,
        0.48,
        gunmetalMat
      );
      wingPivot.add(aileronFlap);
      if (side === -1) aileronL = aileronFlap;
      else aileronR = aileronFlap;

      // Under-Wing Rapid-Fire Rotary Cannon Pod & Multi-Tube Rocket Launcher Pods (Armed Bottom 2 Planes!)
      const gunPod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.65, 14), darkMetal);
      gunPod.rotation.x = Math.PI / 2;
      gunPod.position.set(side * 1.45, -0.22, 0.85);
      const gunMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.55, 12), chromeMat);
      gunMuzzle.rotation.x = Math.PI / 2;
      gunMuzzle.position.set(side * 1.45, -0.22, 1.85);
      wingPivot.add(gunPod, gunMuzzle);

      // Under-Wing Heavy Rocket Launcher Pod + Twin AGM Missiles
      const rocketPylon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.72), gunmetalMat);
      rocketPylon.position.set(side * 2.85, -0.18, -0.25);
      const rocketPod = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.55, 18), gunmetalMat);
      rocketPod.rotation.x = Math.PI / 2;
      rocketPod.position.set(side * 2.85, -0.36, -0.15);
      const rocketPodFace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.06, 18),
        new THREE.MeshBasicMaterial({ color: isDarkstar ? 0x38bdf8 : 0xef4444 })
      );
      rocketPodFace.rotation.x = Math.PI / 2;
      rocketPodFace.position.set(side * 2.85, -0.36, 0.64);
      wingPivot.add(rocketPylon, rocketPod, rocketPodFace);

      for (const mOff of [-0.45, 0.45]) {
        const missile = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.48, 12), darkMetal);
        missile.rotation.x = Math.PI / 2;
        missile.position.set(side * 4.15 + mOff * 0.35, -0.24, -0.55);
        const missileTip = new THREE.Mesh(
          new THREE.ConeGeometry(0.075, 0.26, 12),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        missileTip.rotation.x = Math.PI / 2;
        missileTip.position.set(side * 4.15 + mOff * 0.35, -0.24, 0.32);
        wingPivot.add(missile, missileTip);
      }

      const navLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 10, 10),
        new THREE.MeshBasicMaterial({ color: side === -1 ? 0xef4444 : 0x22c55e })
      );
      navLight.position.set(side * (halfSpan + 0.06), 0.04, isDarkstar ? -2.85 : -1.95);
      wingPivot.add(navLight);

      group.add(wingPivot);
    }

    const tailZ = -fuselageLen * 0.34;
    for (const side of [-1, 1] as const) {
      const vTailHolder = new THREE.Group();
      vTailHolder.position.set(side * 1.18, 1.95, tailZ);
      vTailHolder.rotation.z = side * (isDarkstar ? 0.26 : -0.44);

      const vTail = buildTaperedVerticalTail(2.65, 2.65, 1.15, 1.25, 0.14, gunmetalMat);
      vTailHolder.add(vTail);

      const tailRudder = buildAttachedRudderFlap(2.65, 2.65, 1.15, 1.25, 0.14, 0.42, accentMat);
      vTailHolder.add(tailRudder);
      if (side === 1) rudder = tailRudder;

      group.add(vTailHolder);
    }

    const stabilatorGroup = new THREE.Group();
    stabilatorGroup.position.set(0, 1.76, -fuselageLen * 0.42);
    for (const side of [-1, 1] as const) {
      const stabPanel = buildTaperedAirfoilWing(
        side,
        isDarkstar ? 1.85 : 2.65,
        isDarkstar ? 1.65 : 2.15,
        0.75,
        1.15,
        0.12,
        gunmetalMat
      );
      stabPanel.position.set(side * 1.15, 0, 0);
      stabilatorGroup.add(stabPanel);
    }
    group.add(stabilatorGroup);
    elevator = stabilatorGroup;

    for (const side of [-1, 1]) {
      const nx = side * 0.68;
      const ny = 1.76;
      const nz = -fuselageLen * 0.42;

      const tvcNozzle = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.58, 1.45),
        darkMetal
      );
      tvcNozzle.position.set(nx, ny, nz - 0.55);
      group.add(tvcNozzle);

      const burner = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 2.4, 18),
        new THREE.MeshBasicMaterial({
          color: isDarkstar ? 0x38bdf8 : 0xf97316,
          transparent: true,
          opacity: 0.86,
        })
      );
      burner.rotation.x = -Math.PI / 2;
      burner.position.set(nx, ny, nz - 2.25);
      group.add(burner);
      afterburners.push(burner);
    }

    group.add(propeller);

    // Retractable Supersonic Fighter / Darkstar Tricycle Landing Gear
    addDetailedWheelAssembly(0, 0.32, 4.15, 1.18, 0.3, 0.16, false, false);
    addDetailedWheelAssembly(-1.75, 0.34, -0.65, 1.15, 0.36, 0.22, false, false);
    addDetailedWheelAssembly(1.75, 0.34, -0.65, 1.15, 0.36, 0.22, false, false);
  }

  gearGroup.userData.pivots = gearPivots;
  gearGroup.userData.wheels = gearWheels;
  group.add(gearGroup);

  group.userData.controlSurfaces = {
    aileronL,
    aileronR,
    elevator,
    rudder,
  };
  group.userData.gearGroup = gearGroup;

  return { group, propeller, afterburners, gearGroup };
}

/**
 * Procedural Articulated 3D Heavy Tracked Caterpillar Excavator
 * For Terraforming, Digging Underground, and Constructing Buildings
 */
export function buildExcavator3DModel(): {
  group: THREE.Group;
  boomGroup: THREE.Group;
  armGroup: THREE.Group;
  bucketGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const catYellow = getStandardMat('#eab308', 0.32, 0.25);
  const darkSteel = getStandardMat('#1e293b', 0.5, 0.7);
  const trackMat = getStandardMat('#0f172a', 0.85, 0.3);
  const chromeMat = getStandardMat('#e2e8f0', 0.15, 0.9);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.68,
    roughness: 0.05,
    transmission: 0.72,
  });

  // 1. Dual Heavy Caterpillar Steel Tracks
  for (const tx of [-1.45, 1.45]) {
    const trackFrame = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 3.6, 12, 18), trackMat);
    trackFrame.rotation.x = Math.PI / 2;
    trackFrame.scale.set(0.65, 1, 1);
    trackFrame.position.set(tx, 0.5, 0);
    trackFrame.castShadow = true;
    group.add(trackFrame);

    for (let wz = -1.6; wz <= 1.6; wz += 0.8) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.58, 16), darkSteel);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(tx, 0.45, wz);
      group.add(roller);
    }
  }

  // Undercarriage Turntable H-Frame
  const undercarriage = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 3.2), darkSteel);
  undercarriage.position.set(0, 0.75, 0);
  group.add(undercarriage);

  // 2. Rotating Upper House Deck, Counterweight & Engine Hood
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.85, 1.15, 3.9), catYellow);
  deck.position.set(0, 1.55, -0.35);
  deck.castShadow = true;
  group.add(deck);

  const counterweight = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 1.25, 20, 1, false, Math.PI * 0.5, Math.PI), darkSteel);
  counterweight.position.set(0, 1.58, -2.15);
  group.add(counterweight);

  //Exhaust stack
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 12), darkSteel);
  exhaust.position.set(0.65, 2.55, -1.45);
  group.add(exhaust);

  // Operator Glass Cab on Left Side
  const cabFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.65, 1.75), darkSteel);
  cabFrame.position.set(0.78, 2.65, 0.45);
  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.48, 1.66), glassMat);
  cabGlass.position.set(0.78, 2.65, 0.45);
  group.add(cabFrame, cabGlass);

  // 3. Articulated Main Boom, Stick Arm & Toothed Digging Bucket
  const boomGroup = new THREE.Group();
  boomGroup.position.set(-0.25, 1.85, 1.15);

  const boomLower = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 3.4), catYellow);
  boomLower.position.set(0, 1.15, 1.35);
  boomLower.rotation.x = -0.58;
  boomLower.castShadow = true;
  boomGroup.add(boomLower);

  const hydraulicCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.4, 12), chromeMat);
  hydraulicCyl.position.set(0, 0.9, 0.95);
  hydraulicCyl.rotation.x = Math.PI / 2 - 0.65;
  boomGroup.add(hydraulicCyl);

  const armGroup = new THREE.Group();
  armGroup.position.set(0, 2.25, 2.75);

  const stickArm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 2.65), catYellow);
  stickArm.position.set(0, -0.85, 0.95);
  stickArm.rotation.x = 0.68;
  stickArm.castShadow = true;
  armGroup.add(stickArm);

  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(0, -1.75, 1.95);

  const bucketShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 1.15, 16, 1, false, 0, Math.PI * 1.15),
    darkSteel
  );
  bucketShell.rotation.z = Math.PI / 2;
  bucketShell.castShadow = true;
  bucketGroup.add(bucketShell);

  // Steel Digging Teeth
  for (let tx = -0.45; tx <= 0.45; tx += 0.225) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 8), chromeMat);
    tooth.rotation.x = Math.PI / 2;
    tooth.position.set(tx, -0.45, 0.58);
    bucketGroup.add(tooth);
  }

  armGroup.add(bucketGroup);
  boomGroup.add(armGroup);
  group.add(boomGroup);

  return { group, boomGroup, armGroup, bucketGroup };
}

/**
 * Procedural 3D Handheld Weapon Builder (Knife, Pistol, SMG, Rifle, Shotgun, Sniper, RPG)
 */
export function buildWeapon3DModel(weaponType: string): THREE.Group {
  const group = new THREE.Group();
  if (!weaponType || weaponType === 'unarmed') return group;

  const gunMetal = getStandardMat('#1e293b', 0.3, 0.8);
  const darkPolymer = getStandardMat('#090d16', 0.55, 0.25);
  const chromeBlade = getStandardMat('#e2e8f0', 0.15, 0.92);
  const oliveDrab = getStandardMat('#3f6212', 0.6, 0.2);
  const woodStock = getStandardMat('#78350f', 0.7, 0.1);

  if (weaponType === 'melee') {
    // Combat Knife
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.14, 12), darkPolymer);
    handle.rotation.x = Math.PI / 2;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), gunMetal);
    guard.position.set(0, 0, 0.07);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.26, 4), chromeBlade);
    blade.rotation.x = Math.PI / 2;
    blade.scale.set(0.35, 1, 1);
    blade.position.set(0, 0, 0.2);
    group.add(handle, guard, blade);
    return group;
  }

  if (weaponType === 'pistol') {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.13, 0.055), darkPolymer);
    grip.position.set(0, -0.05, 0);
    grip.rotation.x = -0.22;
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.22), gunMetal);
    slide.position.set(0, 0.02, 0.06);
    group.add(grip, slide);
    return group;
  }

  if (weaponType === 'grenade') {
    // M67 Frag Grenade
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), oliveDrab);
    body.scale.set(1.0, 1.25, 1.0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.04, 12), gunMetal);
    neck.position.set(0, 0.085, 0);
    const spoon = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.03), gunMetal);
    spoon.position.set(0, 0.04, 0.055);
    group.add(body, neck, spoon);
    return group;
  }

  if (weaponType === 'timebomb' || weaponType === 'remotebomb') {
    // C4 Demolition Charge Pack with LED Indicator
    const c4Mat = getStandardMat(weaponType === 'timebomb' ? '#b45309' : '#334155', 0.65, 0.15);
    const brick1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.2), c4Mat);
    const brick2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.2), c4Mat);
    brick1.position.set(-0.06, 0, 0);
    brick2.position.set(0.06, 0, 0);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.068, 0.05), darkPolymer);
    const ledColor = weaponType === 'timebomb' ? 0xef4444 : 0x38bdf8;
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 10, 10),
      new THREE.MeshBasicMaterial({ color: ledColor })
    );
    led.position.set(0, 0.045, 0);
    group.add(brick1, brick2, strap, led);
    return group;
  }

  if (weaponType === 'rpg') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.95, 16), oliveDrab);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.04, 0.2);
    const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.32, 14), oliveDrab);
    warhead.rotation.x = Math.PI / 2;
    warhead.position.set(0, 0.04, 0.78);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.14, 0.05), woodStock);
    grip.position.set(0, -0.04, 0.15);
    group.add(tube, warhead, grip);
    return group;
  }

  if (weaponType === 'minigun') {
    // M134 6-Barrel Electric Rotary Gatling Minigun
    const motorHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 18), darkPolymer);
    motorHousing.rotation.x = Math.PI / 2;
    motorHousing.position.set(0, 0.02, 0.12);

    const ammoDrum = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.24), oliveDrab);
    ammoDrum.position.set(0, -0.14, 0.12);

    const topCarryBar = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 16, Math.PI), gunMetal);
    topCarryBar.position.set(0, 0.13, 0.22);

    const barrelCluster = new THREE.Group();
    barrelCluster.position.set(0, 0.02, 0.28);
    for (let b = 0; b < 6; b++) {
      const ang = (b / 6) * Math.PI * 2;
      const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.68, 10), chromeBlade);
      bMesh.rotation.x = Math.PI / 2;
      bMesh.position.set(Math.cos(ang) * 0.055, Math.sin(ang) * 0.055, 0.34);
      barrelCluster.add(bMesh);
    }
    for (const clampZ of [0.18, 0.42, 0.62]) {
      const clampDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.028, 16), gunMetal);
      clampDisc.rotation.x = Math.PI / 2;
      clampDisc.position.set(0, 0, clampZ);
      barrelCluster.add(clampDisc);
    }
    group.add(motorHousing, ammoDrum, topCarryBar, barrelCluster);
    return group;
  }

  if (weaponType === 'nuke') {
    // Tactical Thermonuclear Doomsday Bomb Warhead with Glowing Core
    const yellowHazard = getStandardMat('#facc15', 0.25, 0.4);
    const redCoreMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 20), yellowHazard);
    casing.rotation.x = Math.PI / 2;
    casing.position.set(0, 0.04, 0.32);
    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 20), darkPolymer);
    noseCone.rotation.x = Math.PI / 2;
    noseCone.position.set(0, 0.04, 0.72);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.02, 10, 20), redCoreMat);
    glowRing.position.set(0, 0.04, 0.45);
    for (let f = 0; f < 4; f++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.16), darkPolymer);
      fin.rotation.z = (f * Math.PI) / 2;
      fin.position.set(0, 0.04, 0.08);
      group.add(fin);
    }
    group.add(casing, noseCone, glowRing);
    return group;
  }

  // SMG / Assault Rifle / Shotgun / Sniper
  const barrelLen = weaponType === 'sniper' ? 0.92 : weaponType === 'shotgun' ? 0.68 : weaponType === 'rifle' ? 0.62 : 0.38;
  const receiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.085, 0.36),
    weaponType === 'shotgun' ? woodStock : darkPolymer
  );
  receiver.position.set(0, 0.02, 0.12);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, barrelLen, 12), gunMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, 0.18 + barrelLen * 0.5);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.16, 0.065), gunMetal);
  mag.position.set(0, -0.07, 0.18);
  mag.rotation.x = 0.2;

  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.11, 0.24),
    weaponType === 'shotgun' ? woodStock : darkPolymer
  );
  stock.position.set(0, 0.0, -0.14);

  group.add(receiver, barrel, mag, stock);

  if (weaponType === 'sniper' || weaponType === 'rifle') {
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, weaponType === 'sniper' ? 0.28 : 0.14, 14),
      gunMetal
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.085, 0.14);
    group.add(scope);
  }

  if (weaponType === 'orbital_laser') {
    // High-Tech Orbital Ion Laser Target Designator
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.38), gunMetal);
    body.position.set(0, 0.03, 0.14);
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.04, 0.36);
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.08, 16), chromeBlade);
    dish.rotation.x = -Math.PI / 2;
    dish.position.set(0, 0.12, 0.18);
    group.add(body, lens, dish);
    return group;
  }

  if (weaponType === 'meteor_staff') {
    // Apocalypse Meteor Summoner Staff
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.45, 12), darkPolymer);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0.02, 0.35);
    const orb = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.12, 1),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    orb.position.set(0, 0.02, 1.12);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 10, 20), chromeBlade);
    ring.position.set(0, 0.02, 1.12);
    group.add(shaft, orb, ring);
    return group;
  }

  if (weaponType === 'gravity_hammer') {
    // Wrecking-Ball Kinetic Gravity Warhammer
    const handleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 1.25, 12), chromeBlade);
    handleShaft.rotation.x = Math.PI / 2;
    handleShaft.position.set(0, 0.02, 0.32);
    const headBlock = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.26), gunMetal);
    headBlock.position.set(0, 0.02, 0.96);
    const coreGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.4, 14),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    coreGlow.rotation.z = Math.PI / 2;
    coreGlow.position.set(0, 0.02, 0.96);
    group.add(handleShaft, headBlock, coreGlow);
    return group;
  }

  if (weaponType === 'cluster_launcher') {
    // M32-Style 6-Chamber Revolving Tactical Cluster Bomb Launcher
    const darkSteel = getStandardMat('#1e293b', 0.32, 0.82);
    const hazardBrass = getStandardMat('#d97706', 0.28, 0.78);
    const oliveMil = getStandardMat('#365314', 0.52, 0.35);

    // Rear Buttstock & Buffer Tube
    const stockTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 12), darkSteel);
    stockTube.rotation.x = Math.PI / 2;
    stockTube.position.set(0, 0.03, -0.12);
    const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.13, 0.04), darkPolymer);
    buttPad.position.set(0, 0.01, -0.25);

    // Pistol Grip & Receiver Frame
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.13, 0.055), darkPolymer);
    grip.position.set(0, -0.055, -0.01);
    grip.rotation.x = -0.24;

    // 6-Chamber Revolving Bomb Cylinder Drum
    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 0.03, 0.2);
    const centerAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 14), darkSteel);
    centerAxle.rotation.x = Math.PI / 2;
    drumGroup.add(centerAxle);
    for (let c = 0; c < 6; c++) {
      const ang = (c / 6) * Math.PI * 2;
      const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.26, 14), oliveMil);
      chamber.rotation.x = Math.PI / 2;
      chamber.position.set(Math.cos(ang) * 0.072, Math.sin(ang) * 0.072, 0);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0435, 0.0435, 0.035, 14), hazardBrass);
      band.rotation.x = Math.PI / 2;
      band.position.set(Math.cos(ang) * 0.072, Math.sin(ang) * 0.072, 0.09);
      drumGroup.add(chamber, band);
    }
    const frontShield = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.022, 18), darkSteel);
    frontShield.rotation.x = Math.PI / 2;
    frontShield.position.z = 0.135;
    const rearShield = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.022, 18), darkSteel);
    rearShield.rotation.x = Math.PI / 2;
    rearShield.position.z = -0.135;
    drumGroup.add(frontShield, rearShield);

    // Heavy Rifled Launch Barrel, Vented Heat Shroud, Foregrip & Top Sight Rail
    const barrelTube = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.48, 16), darkSteel);
    barrelTube.rotation.x = Math.PI / 2;
    barrelTube.position.set(0, 0.065, 0.54);
    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.054, 0.08, 16), chromeBlade);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.065, 0.79);
    const foreGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.12, 10), darkPolymer);
    foreGrip.position.set(0, -0.02, 0.56);
    foreGrip.rotation.x = 0.15;
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.42), darkSteel);
    topRail.position.set(0, 0.155, 0.34);

    group.add(stockTube, buttPad, grip, drumGroup, barrelTube, muzzleBrake, foreGrip, topRail);
    return group;
  }

  if (weaponType === 'grapple_gun') {
    // Hyper-Grapple Blink Launcher
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.34), gunMetal);
    body.position.set(0, 0.03, 0.14);
    const hookCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.18, 6),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    hookCone.rotation.x = Math.PI / 2;
    hookCone.position.set(0, 0.03, 0.38);
    group.add(body, hookCone);
    return group;
  }

  if (weaponType === 'firework_cannon') {
    // Festival Firework Star Bazooka
    const festiveMat = getStandardMat('#ec4899', 0.3, 0.4);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.88, 16), festiveMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.04, 0.28);
    const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.065, 0.14, 16), chromeBlade);
    flare.rotation.x = Math.PI / 2;
    flare.position.set(0, 0.04, 0.74);
    group.add(tube, flare);
    return group;
  }

  if (weaponType === 'chainsaw') {
    // Heavy-Duty Motorized Lumberjack Chainsaw
    const sawOrange = getStandardMat('#ea580c', 0.32, 0.25);
    const chainDark = getStandardMat('#1e293b', 0.4, 0.85);

    // 2-Stroke Engine Block & Starter Cover
    const engineBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.28), sawOrange);
    engineBody.position.set(0, 0.04, 0.12);
    const engineTop = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.26, 12), sawOrange);
    engineTop.rotation.x = Math.PI / 2;
    engineTop.position.set(0, 0.13, 0.12);
    const exhaustGuard = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.1), darkPolymer);
    exhaustGuard.position.set(0, 0.05, 0.23);

    // Rear Throttle Handle & Wrap-Around Front Grip Bar
    const rearHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.18), darkPolymer);
    rearHandle.position.set(0, 0.02, -0.08);
    const frontHandleBar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 8, 16, Math.PI * 1.25), darkPolymer);
    frontHandleBar.position.set(0, 0.09, 0.2);
    frontHandleBar.rotation.z = -0.35;

    // Long Tempered Steel Guide Bar + Rounded Nose Sprocket
    const guideBar = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.1, 0.64), chromeBlade);
    guideBar.position.set(0, 0.04, 0.56);
    const barNose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.018, 14), chromeBlade);
    barNose.rotation.z = Math.PI / 2;
    barNose.position.set(0, 0.04, 0.88);

    // Serrated Cutting Chain Teeth along Top and Bottom of Guide Bar
    for (let z = 0.28; z <= 0.86; z += 0.055) {
      const topTooth = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.03), chainDark);
      topTooth.position.set(0, 0.096, z);
      topTooth.rotation.x = 0.35;
      const botTooth = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.03), chainDark);
      botTooth.position.set(0, -0.016, z);
      botTooth.rotation.x = -0.35;
      group.add(topTooth, botTooth);
    }

    group.add(engineBody, engineTop, exhaustGuard, rearHandle, frontHandleBar, guideBar, barNose);
    return group;
  }

  return group;
}

/**
 * Builds a 3D Twin-Thruster Rocket Jetpack for the Player's Back
 */
export function buildPlayerJetpack3D(): THREE.Group {
  const group = new THREE.Group();
  const packMat = getStandardMat('#cbd5e1', 0.25, 0.85);
  const accentMat = getStandardMat('#ea580c', 0.35, 0.45);
  const darkMat = getStandardMat('#1e293b', 0.4, 0.7);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });

  const centerCore = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.14), darkMat);
  centerCore.position.set(0, 1.18, -0.18);
  group.add(centerCore);

  for (const sx of [-0.13, 0.13]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.46, 16), packMat);
    tank.position.set(sx, 1.18, -0.22);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.12, 16), accentMat);
    cap.position.set(sx, 1.46, -0.22);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.1, 14), darkMat);
    nozzle.position.set(sx, 0.91, -0.22);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.38, 12), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(sx, 0.68, -0.22);
    group.add(tank, cap, nozzle, flame);
  }
  return group;
}

/**
 * Procedural Realistic 3D Motorcycle Builder (10 Styles: Scooter, Cruiser, Cafe Racer, Dirt Bike,
 * Streetfighter, Superbike, Hypersport, V10 Tomahawk, Hubless Cyber Moto, and Afterburner Jet-Bike)
 */
export function buildMotorcycle3DModel(moto: MotorcycleVehicle): {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  steeringGroup: THREE.Group;
  afterburner?: THREE.Mesh;
} {
  const group = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const steeringGroup = new THREE.Group();
  group.add(steeringGroup);
  const style = moto.style || 'superbike';

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(moto.color),
    roughness: 0.18,
    metalness: 0.42,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const accentMat = getStandardMat(moto.accentColor || '#f8fafc', 0.25, 0.5);
  const chromeMat = getStandardMat('#e2e8f0', 0.12, 0.94);
  const goldForkMat = getStandardMat('#eab308', 0.2, 0.88);
  const darkMetal = getStandardMat('#1e293b', 0.38, 0.75);
  const tireMat = getStandardMat('#111827', 0.88, 0.08);
  const seatMat = getStandardMat(style === 'cafe_racer' ? '#78350f' : '#0f172a', 0.65, 0.1);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x091326,
    transparent: true,
    opacity: 0.65,
    roughness: 0.06,
    transmission: 0.7,
  });

  const isScooter = style === 'scooter';
  const isCruiser = style === 'cruiser';
  const isDirt = style === 'dirt_bike';
  const isTomahawk = style === 'tomahawk';
  const isCyber = style === 'cyber_moto';
  const isJet = style === 'jet_bike';
  const isFullFairing = style === 'superbike' || style === 'hypersport' || isCyber || isJet;

  const wheelRadius = isScooter ? 0.24 : isDirt ? 0.37 : 0.33;
  const frontZ = isCruiser || isJet ? 0.92 : isScooter ? 0.68 : 0.8;
  const rearZ = isCruiser || isJet ? -0.88 : isScooter ? -0.65 : -0.76;

  // Helper to build a detailed motorcycle wheel with YXZ rotation order (zero wobble!)
  const addMotoWheel = (wz: number, isFront: boolean, xOffset: number = 0) => {
    const wGrp = new THREE.Group();
    wGrp.rotation.order = 'YXZ';
    wGrp.position.set(xOffset, wheelRadius, wz);

    const tireTube = isFront ? 0.085 : style === 'superbike' || style === 'hypersport' || isJet ? 0.115 : 0.095;
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(wheelRadius - tireTube * 0.6, tireTube, 16, 28),
      tireMat
    );
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    wGrp.add(tire);

    if (isCyber) {
      // Glowing Hubless Rim Ring
      const glowRim = new THREE.Mesh(
        new THREE.TorusGeometry(wheelRadius - tireTube * 1.25, 0.022, 12, 28),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(moto.accentColor || '#06b6d4') })
      );
      glowRim.rotation.y = Math.PI / 2;
      wGrp.add(glowRim);
    } else {
      // Alloy Rim Ring, Hub, Spokes & Drilled Brake Rotor Disc
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(wheelRadius - tireTube * 1.15, 0.022, 10, 24),
        style === 'dirt_bike' ? goldForkMat : chromeMat
      );
      rim.rotation.y = Math.PI / 2;
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, tireTube * 1.5, 14),
        darkMetal
      );
      hub.rotation.z = Math.PI / 2;
      wGrp.add(rim, hub);

      // 6 Alloy Spokes
      for (let s = 0; s < 6; s++) {
        const spk = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, (wheelRadius - tireTube) * 1.75, 0.022),
          chromeMat
        );
        spk.rotation.x = (s * Math.PI) / 6;
        wGrp.add(spk);
      }

      // Brake Rotor Disc
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.52, wheelRadius * 0.52, 0.012, 20),
        chromeMat
      );
      rotor.rotation.z = Math.PI / 2;
      rotor.position.x = 0.065;
      wGrp.add(rotor);
    }

    group.add(wGrp);
    wheels.push(wGrp);
  };

  if (isTomahawk) {
    // Dodge Tomahawk V10: Dual close-coupled front & rear wheels!
    for (const ox of [-0.14, 0.14]) {
      addMotoWheel(frontZ, true, ox);
      addMotoWheel(rearZ, false, ox);
    }
  } else {
    addMotoWheel(frontZ, true, 0);
    addMotoWheel(rearZ, false, 0);
  }

  // 2. Front Telescopic Forks, Triple Clamps & Handlebars
  const forkRake = isCruiser ? 0.46 : 0.28;
  const forkTopY = isCruiser ? 1.08 : isDirt ? 1.06 : 0.92;
  const forkLen = Math.hypot(forkTopY - wheelRadius, frontZ * 0.32);

  for (const fx of [-0.11, 0.11]) {
    const forkTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.02, forkLen, 12),
      isDirt || style === 'superbike' ? goldForkMat : chromeMat
    );
    forkTube.position.set(fx, (wheelRadius + forkTopY) * 0.5, frontZ - 0.14);
    forkTube.rotation.x = -forkRake;
    forkTube.castShadow = true;
    group.add(forkTube);
  }

  // Front Mudguard Fender
  const frontFender = new THREE.Mesh(
    new THREE.CylinderGeometry(wheelRadius + 0.03, wheelRadius + 0.03, 0.16, 16, 1, true, -0.7, 1.4),
    bodyMat
  );
  frontFender.rotation.z = Math.PI / 2;
  frontFender.position.set(0, isDirt ? wheelRadius + 0.28 : wheelRadius + 0.02, frontZ);
  group.add(frontFender);

  // Handlebars, Grips & Mirrors
  const barY = isCruiser ? 1.18 : isFullFairing || style === 'cafe_racer' ? 0.92 : 1.04;
  const barZ = frontZ - 0.28;
  const handlebar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, isCruiser ? 0.78 : 0.66, 12),
    chromeMat
  );
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, barY, barZ);
  group.add(handlebar);

  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 10), seatMat);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(side * (isCruiser ? 0.36 : 0.3), barY, barZ - 0.02);
    group.add(grip);

    // Side Mirror
    const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8), darkMetal);
    mirrorStem.position.set(side * 0.3, barY + 0.07, barZ + 0.04);
    mirrorStem.rotation.z = side * -0.35;
    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.02), darkMetal);
    mirrorHead.position.set(side * 0.35, barY + 0.13, barZ + 0.04);
    group.add(mirrorStem, mirrorHead);
  }

  // 3. Engine Block, Trellis/Twin-Spar Frame, Fuel Tank & Fairings
  if (isScooter) {
    // Step-through Scooter Legshield, Floorboard & Rear Body Pod
    const legShield = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.18), bodyMat);
    legShield.position.set(0, 0.64, frontZ - 0.22);
    legShield.rotation.x = -0.22;
    const floorBoard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.58), darkMetal);
    floorBoard.position.set(0, 0.28, -0.02);
    const rearPod = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 12, 16), bodyMat);
    rearPod.rotation.x = Math.PI / 2;
    rearPod.position.set(0, 0.56, -0.45);
    const scooterScreen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.03), glassMat);
    scooterScreen.position.set(0, 1.15, barZ + 0.08);
    scooterScreen.rotation.x = -0.25;
    group.add(legShield, floorBoard, rearPod, scooterScreen);
  } else {
    // Engine Block & Crankcase
    const engineBlock = new THREE.Mesh(
      new THREE.BoxGeometry(isTomahawk ? 0.36 : 0.26, 0.38, isTomahawk ? 0.68 : 0.46),
      isTomahawk || isCruiser ? chromeMat : darkMetal
    );
    engineBlock.position.set(0, 0.48, 0.05);
    engineBlock.castShadow = true;
    group.add(engineBlock);

    // Sculpted Fuel Tank
    const tank = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, isJet ? 0.62 : 0.42, 14, 18),
      bodyMat
    );
    tank.rotation.x = Math.PI / 2 + 0.18;
    tank.scale.set(1.05, 0.85, 1.0);
    tank.position.set(0, 0.84, 0.16);
    tank.castShadow = true;
    group.add(tank);

    // Frame Spar / Trellis Bars
    for (const sx of [-0.14, 0.14]) {
      const spar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.72, 10),
        style === 'hypersport' || style === 'streetfighter' ? accentMat : darkMetal
      );
      spar.rotation.x = Math.PI / 2 + 0.35;
      spar.position.set(sx, 0.68, 0.12);
      group.add(spar);
    }

    // Aerodynamic Nose Fairing & Windscreen for Superbikes / Hypersports / Cyber / Jet
    if (isFullFairing) {
      const noseCowl = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.56, 16), bodyMat);
      noseCowl.rotation.x = Math.PI / 2 + 0.15;
      noseCowl.scale.set(0.92, 0.85, 1.0);
      noseCowl.position.set(0, 0.84, frontZ - 0.02);
      group.add(noseCowl);

      const windscreen = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 14),
        glassMat
      );
      windscreen.scale.set(0.88, 0.65, 1.65);
      windscreen.rotation.x = -0.38;
      windscreen.position.set(0, 0.98, frontZ - 0.18);
      group.add(windscreen);

      // Side Fairing Panels & MotoGP Aero Winglets
      for (const sx of [-0.17, 0.17]) {
        const sideFairing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.62), bodyMat);
        sideFairing.position.set(sx, 0.58, 0.22);
        sideFairing.rotation.x = 0.18;
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.18), accentMat);
        winglet.position.set(sx * 1.45, 0.74, frontZ - 0.12);
        winglet.rotation.z = sx > 0 ? -0.2 : 0.2;
        group.add(sideFairing, winglet);
      }
    }
  }

  // 4. Contoured Rider Saddle, Rear Tail Cowl & Swingarm
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.48), seatMat);
  seat.position.set(0, isCruiser ? 0.64 : 0.76, -0.28);
  const tailCowl = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.44, 12), bodyMat);
  tailCowl.rotation.x = -Math.PI / 2 + 0.22;
  tailCowl.scale.set(0.95, 0.65, 1.0);
  tailCowl.position.set(0, isCruiser ? 0.68 : 0.84, -0.66);
  group.add(seat, tailCowl);

  // Rear Swingarm & Footpegs
  for (const sx of [-0.12, 0.12]) {
    const swingArm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.56), darkMetal);
    swingArm.position.set(sx, wheelRadius + 0.04, rearZ * 0.55);
    swingArm.rotation.x = -0.12;
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8), chromeMat);
    peg.rotation.z = Math.PI / 2;
    peg.position.set(sx * 1.65, 0.36, -0.12);
    group.add(swingArm, peg);
  }

  // 5. Exhaust Pipes / Jet Turbine Nozzle & LED Headlight/Taillight
  let afterburner: THREE.Mesh | undefined;
  if (isJet) {
    const jetNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.38, 18), darkMetal);
    jetNozzle.rotation.x = Math.PI / 2;
    jetNozzle.position.set(0, 0.68, rearZ - 0.18);
    afterburner = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.75, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.88 })
    );
    afterburner.rotation.x = -Math.PI / 2;
    afterburner.position.set(0, 0.68, rearZ - 0.65);
    group.add(jetNozzle, afterburner);
  } else {
    for (const exSide of isCruiser || style === 'streetfighter' ? [-0.16, 0.16] : [0.16]) {
      const muffler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.038, 0.62, 14),
        chromeMat
      );
      muffler.rotation.x = Math.PI / 2 - 0.24;
      muffler.position.set(exSide, wheelRadius + 0.14, rearZ * 0.65);
      group.add(muffler);
    }
  }

  // Headlight & Taillight
  const headlight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 0.84, frontZ - 0.04);
  const taillight = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.045, 0.03),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  taillight.position.set(0, isCruiser ? 0.68 : 0.84, -0.86);
  group.add(headlight, taillight);

  return { group, wheels, steeringGroup, afterburner };
}

/**
 * Procedural Realistic Military Submunition Cluster Bomb
 * Modeled after BLU-97/B combined effects munition with steel body,
 * ballistic nose ogive, yellow ordnance hazard stripe, impact fuse pin,
 * and 4 aerodynamic stabilizing tail fins.
 */
export function buildRealisticClusterBombMesh(): THREE.Group {
  const group = new THREE.Group();
  const bombMetal = getStandardMat('#374151', 0.42, 0.65);
  const oliveCasing = getStandardMat('#3f4e38', 0.52, 0.35);
  const hazardYellow = getStandardMat('#f59e0b', 0.35, 0.2);
  const chromeFuse = getStandardMat('#e2e8f0', 0.15, 0.9);
  const finDark = getStandardMat('#1f2937', 0.45, 0.5);

  // Main Cylindrical Ordnance Body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.58, 16), oliveCasing);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);

  // Yellow Hazard / High-Explosive Identification Band
  const hazardBand = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.142, 0.08, 16), hazardYellow);
  hazardBand.rotation.x = Math.PI / 2;
  hazardBand.position.z = 0.18;
  group.add(hazardBand);

  // Ballistic Ogive Nose Cone
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), oliveCasing);
  nose.rotation.x = -Math.PI / 2;
  nose.scale.set(1.0, 1.35, 1.0);
  nose.position.z = 0.29;
  group.add(nose);

  // Nose Meplat & Impact Fuse Contact Pin
  const fusePin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.12, 12), chromeFuse);
  fusePin.rotation.x = Math.PI / 2;
  fusePin.position.z = 0.48;
  group.add(fusePin);

  // Tapered Tail Cone
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.18, 16), bombMetal);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.z = -0.38;
  group.add(tailCone);

  // 4 Cruciform Aerodynamic Stabilizer Tail Fins
  for (let f = 0; f < 4; f++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.22, 0.24), finDark);
    fin.rotation.z = (f * Math.PI) / 2;
    fin.position.set(0, 0, -0.42);
    group.add(fin);
  }

  // Ring Shroud / Retardation Chute Collar
  const tailRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 18), bombMetal);
  tailRing.position.z = -0.48;
  group.add(tailRing);

  return group;
}

/**
 * Procedural Realistic First-Person Arm & Fist Viewmodel
 * Articulated human arm anchored to the viewport edge with sleeve,
 * anatomical wrist, clenched fist, knuckles, and folded thumb.
 * Never looks like a detached floating rectangle!
 */
export function buildFirstPersonArmViewModel(
  skinColor: string = '#f1c27d',
  sleeveColor: string = '#0284c7'
): {
  group: THREE.Group;
  fistMesh: THREE.Group;
  forearmMesh: THREE.Mesh;
  sleeveMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.name = 'firstPersonArmViewModel';

  const skinMat = getStandardMat(skinColor, 0.52, 0.04);
  const clothMat = getStandardMat(sleeveColor, 0.72, 0.06);

  // Upper Forearm / Sleeve extending into screen from shoulder
  // Both arm and sleeve are strictly aligned on the center axis (X=0, Y=0) with openEnded cylinders
  // so no flat circular end caps or eccentric rims can ever stick out or cast dark rings!
  const sleeveGeo = new THREE.CylinderGeometry(0.086, 0.108, 0.34, 20, 1, true);
  sleeveGeo.rotateX(Math.PI / 2);
  const sleeveMesh = new THREE.Mesh(sleeveGeo, clothMat);
  sleeveMesh.position.set(0, 0, -0.34);
  sleeveMesh.castShadow = false;
  sleeveMesh.receiveShadow = false;
  group.add(sleeveMesh);

  // Smooth Forearm & Wrist (tapered cylinder entering seamlessly inside the sphere ball hand)
  const forearmGeo = new THREE.CylinderGeometry(0.062, 0.082, 0.36, 20, 1, true);
  forearmGeo.rotateX(Math.PI / 2);
  const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);
  forearmMesh.position.set(0, 0, -0.04);
  forearmMesh.castShadow = false;
  forearmMesh.receiveShadow = false;
  group.add(forearmMesh);

  // Smooth Spherical "Mii" Ball Hand (pure seamless sphere with matching skin tone and no shadows/rings)
  const handMesh = new THREE.Mesh(new THREE.SphereGeometry(0.092, 24, 24), skinMat);
  handMesh.position.set(0, 0, 0.18);
  handMesh.castShadow = false;
  handMesh.receiveShadow = false;
  group.add(handMesh);
  
  const fistMesh = handMesh as unknown as THREE.Group; // Keep reference for compatibility

  return { group, fistMesh, forearmMesh, sleeveMesh };
}



