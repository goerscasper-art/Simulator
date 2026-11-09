import * as THREE from 'three';
import { mergeBufferGeometries } from './world3DBuilder';

export interface BuiltCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY: number;
  name: string;
  isBuilding: boolean;
  isFurniture?: boolean;
  buildingId: string;
  destroyed?: boolean;
}

export interface WalkableSkyscraperData {
  id: string;
  name: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorH: number;
  numFloors: number;
  roofY: number;
  destroyed?: boolean;
}

export interface AnimatedBuildingDoor {
  buildingId: string;
  kind: 'hinged' | 'sliding';
  doorX: number;
  doorZ: number;
  doorW: number;
  hingePivot?: THREE.Object3D;
  slideLeft?: THREE.Object3D;
  slideRight?: THREE.Object3D;
  closedLeftX?: number;
  closedRightX?: number;
  openOffset?: number;
  openProgress: number;
  isHouse?: boolean;
}

export const HOUSE_ARCHETYPE_NAMES: string[] = [
  'Craftsman Bungalow',
  'Brick Colonial Two-Story',
  'Modernist Glass & Cedar Villa',
  'Tudor Revival Manor',
  'Spanish Mediterranean Villa',
  'Victorian Painted Lady',
  'Nordic A-Frame Chalet',
  'Cape Cod Shingle Cottage',
  'Mid-Century Modern Ranch',
  'Georgian Brick Townhouse',
  'French Provincial Chateau',
  'Industrial Loft Residence',
  'Dutch Colonial Gambrel Home',
  'Alpine Log Cabin Estate',
  'Coastal Hamptons Residence',
  'Southwest Adobe Hacienda',
  'Zen Timber Pavilion Home',
  'Neoclassical Columned Villa',
  'Prairie Cantilever Residence',
  'Ultra-Luxury Marble Villa',
];

const sharedWindowGlassMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.03,
  metalness: 0.06,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const sharedDarkFrameMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.35,
  metalness: 0.7,
});

const sharedWhiteTrimMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  roughness: 0.4,
  metalness: 0.1,
});

const sharedBrassMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  roughness: 0.2,
  metalness: 0.9,
});

const sharedChimneyBrickMat = new THREE.MeshStandardMaterial({
  color: 0x7f1d1d,
  roughness: 0.88,
});

const sharedStoneMat = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.9,
});

const sharedInteriorFloorMat = new THREE.MeshStandardMaterial({
  color: 0x78350f,
  roughness: 0.38,
  metalness: 0.04,
});

const sharedInteriorWallMat = new THREE.MeshStandardMaterial({
  color: 0xf5f5f4,
  roughness: 0.82,
});

const sharedDrivewayMat = new THREE.MeshStandardMaterial({
  color: 0x15803d,
  roughness: 0.92,
});

const sharedWalkwayMat = new THREE.MeshStandardMaterial({
  color: 0x15803d,
  roughness: 0.92,
});

const sharedFenceMat = new THREE.MeshStandardMaterial({
  color: 0xe2e8f0,
  roughness: 0.52,
});

const sharedLawnMat = new THREE.MeshStandardMaterial({
  color: 0x15803d,
  roughness: 0.92,
});

// Shared Furniture Materials (reused across all houses, skyscrapers, apartments & stores for zero material bloat)
const furnWoodDarkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.52 });
const furnWoodWarmMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.48 });
const furnFabricNavyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.78 });
const furnFabricSlateMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
const furnFabricCreamMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
const furnMattressMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
const furnBlanketMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.76 });
const furnScreenMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.15, metalness: 0.8 });
const furnChromeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.85 });
const furnGraniteMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.2 });
const furnPlantPotMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
const furnFoliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
const furnOfficeDeskMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.45, metalness: 0.15 });
const furnOfficePartitionMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65 });
const furnOfficeChairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
const furnCeilingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.82 });
const furnWarmLampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
const furnLampShadeMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.6 });
const furnTvDisplayMat = new THREE.MeshStandardMaterial({
  color: 0x1e3a8a,
  emissive: 0x0f172a,
  emissiveIntensity: 0.65,
  roughness: 0.12,
  metalness: 0.85,
});
const furnPillowAccentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.72 });
const furnCooktopMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2, metalness: 0.75 });
const furnBurnerRingMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

export type FamousLandmarkType =
  | 'wilshire_grand'
  | 'one_wtc'
  | 'ping_an'
  | 'salesforce'
  | 'willis_tower'
  | 'shanghai_tower'
  | 'empire_state';

// Shared unit geometries to avoid thousands of duplicate BufferGeometry allocations
const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
const unitCylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const sharedPyramidRoofGeo = (() => {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  geo.rotateY(Math.PI / 4);
  geo.computeVertexNormals();
  return geo;
})();

class MultiMaterialFurnitureBatcher {
  private boxBatches = new Map<THREE.Material, THREE.Matrix4[]>();
  private cylBatches = new Map<THREE.Material, THREE.Matrix4[]>();
  private dummy = new THREE.Object3D();

  addBox(
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rx: number = 0,
    ry: number = 0,
    rz: number = 0
  ) {
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(rx, ry, rz);
    this.dummy.scale.set(sx, sy, sz);
    this.dummy.updateMatrix();
    let list = this.boxBatches.get(mat);
    if (!list) {
      list = [];
      this.boxBatches.set(mat, list);
    }
    list.push(this.dummy.matrix.clone());
  }

  addCyl(
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    diamX: number,
    heightY: number,
    diamZ: number = diamX,
    rx: number = 0,
    ry: number = 0,
    rz: number = 0
  ) {
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(rx, ry, rz);
    this.dummy.scale.set(diamX, heightY, diamZ);
    this.dummy.updateMatrix();
    let list = this.cylBatches.get(mat);
    if (!list) {
      list = [];
      this.cylBatches.set(mat, list);
    }
    list.push(this.dummy.matrix.clone());
  }

  buildInto(targetGroup: THREE.Group) {
    for (const [mat, matrices] of this.boxBatches.entries()) {
      if (matrices.length === 0) continue;
      const inst = new THREE.InstancedMesh(unitBoxGeo, mat, matrices.length);
      inst.userData.isFurniture = true;
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      targetGroup.add(inst);
    }
    for (const [mat, matrices] of this.cylBatches.entries()) {
      if (matrices.length === 0) continue;
      const inst = new THREE.InstancedMesh(unitCylGeo, mat, matrices.length);
      inst.userData.isFurniture = true;
      for (let i = 0; i < matrices.length; i++) {
        inst.setMatrixAt(i, matrices[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      targetGroup.add(inst);
    }
  }
}

// Helper to stamp a detailed ergonomic swivel office chair with 5-star caster base, pneumatic lift, contoured seat, lumbar support, backrest, headrest & armrests
function addDetailedErgonomicChair(
  batch: MultiMaterialFurnitureBatcher,
  cx: number,
  floorY: number,
  cz: number,
  facingSignZ: 1 | -1 = 1,
  fabricMat: THREE.Material = furnOfficeChairMat
) {
  const backZ = cz - facingSignZ * 0.23;
  // Crossed 5-star chrome caster base legs + 4 wheel casters
  batch.addBox(furnChromeMat, cx, floorY + 0.09, cz, 0.54, 0.035, 0.06, 0, 0.55, 0);
  batch.addBox(furnChromeMat, cx, floorY + 0.09, cz, 0.54, 0.035, 0.06, 0, -0.55, 0);
  for (const [wx, wz] of [
    [-0.21, -0.14],
    [0.21, -0.14],
    [-0.21, 0.14],
    [0.21, 0.14],
  ]) {
    batch.addCyl(furnScreenMat, cx + wx, floorY + 0.04, cz + wz, 0.055, 0.05, 0.055);
  }
  // Pneumatic cylinder column & under-seat tilt mechanism
  batch.addCyl(furnChromeMat, cx, floorY + 0.25, cz, 0.065, 0.3, 0.065);
  batch.addBox(furnScreenMat, cx, floorY + 0.4, cz, 0.24, 0.05, 0.24);
  // Contoured padded seat cushion
  batch.addBox(fabricMat, cx, floorY + 0.46, cz, 0.52, 0.085, 0.5);
  // Chrome spine bar + contoured mesh backrest + lumbar pillow + adjustable headrest
  batch.addBox(furnChromeMat, cx, floorY + 0.68, backZ - facingSignZ * 0.03, 0.07, 0.48, 0.04);
  batch.addBox(fabricMat, cx, floorY + 0.78, backZ, 0.48, 0.54, 0.065);
  batch.addBox(furnFabricSlateMat, cx, floorY + 0.65, backZ + facingSignZ * 0.035, 0.42, 0.13, 0.04);
  batch.addBox(fabricMat, cx, floorY + 1.12, backZ + facingSignZ * 0.01, 0.26, 0.12, 0.06);
  // Left & Right T-shaped armrests (chrome vertical post + padded top)
  for (const side of [-1, 1]) {
    batch.addBox(furnChromeMat, cx + side * 0.27, floorY + 0.55, cz - facingSignZ * 0.04, 0.035, 0.2, 0.045);
    batch.addBox(furnScreenMat, cx + side * 0.27, floorY + 0.65, cz, 0.075, 0.035, 0.28);
  }
}

// Helper to stamp a detailed 3-seat tufted sofa with wood frame, legs, individual seat/back cushions, armrests & throw pillows
function addDetailedTuftedSofa(
  batch: MultiMaterialFurnitureBatcher,
  sx: number,
  floorY: number,
  sz: number,
  facingSignZ: 1 | -1,
  sofaMat: THREE.Material
) {
  const backZ = sz - facingSignZ * 0.38;
  // Solid walnut base frame + 4 tapered chrome legs
  batch.addBox(furnWoodDarkMat, sx, floorY + 0.2, sz, 2.68, 0.16, 0.94);
  for (const [lx, lz] of [
    [-1.24, -0.38],
    [1.24, -0.38],
    [-1.24, 0.38],
    [1.24, 0.38],
  ]) {
    batch.addCyl(furnChromeMat, sx + lx, floorY + 0.07, sz + lz, 0.05, 0.14, 0.05);
  }
  // Upholstered outer back & bolstered side arms
  batch.addBox(sofaMat, sx, floorY + 0.56, backZ, 2.68, 0.56, 0.18);
  batch.addBox(sofaMat, sx - 1.22, floorY + 0.44, sz, 0.24, 0.38, 0.96);
  batch.addBox(sofaMat, sx + 1.22, floorY + 0.44, sz, 0.24, 0.38, 0.96);
  // 3 Individual plush seat cushions & 3 tufted back cushions
  for (const cOff of [-0.74, 0, 0.74]) {
    batch.addBox(sofaMat, sx + cOff, floorY + 0.35, sz + facingSignZ * 0.04, 0.7, 0.15, 0.76);
    batch.addBox(sofaMat, sx + cOff, floorY + 0.58, backZ + facingSignZ * 0.13, 0.68, 0.34, 0.14);
  }
  // Angled decorative throw pillows on both ends
  batch.addBox(furnPillowAccentMat, sx - 0.94, floorY + 0.52, sz - facingSignZ * 0.12, 0.3, 0.28, 0.12, 0, 0, 0.22);
  batch.addBox(furnBlanketMat, sx + 0.94, floorY + 0.52, sz - facingSignZ * 0.12, 0.3, 0.28, 0.12, 0, 0, -0.22);
}

// Helper to stamp a detailed glass-and-walnut coffee table with lower magazine shelf, 4 legs, art books & centerpiece bowl
function addDetailedGlassCoffeeTable(
  batch: MultiMaterialFurnitureBatcher,
  tx: number,
  floorY: number,
  tz: number,
  w: number = 1.65,
  d: number = 0.84
) {
  batch.addBox(furnWoodDarkMat, tx, floorY + 0.4, tz, w, 0.045, d);
  batch.addBox(sharedWindowGlassMat, tx, floorY + 0.43, tz, w - 0.08, 0.03, d - 0.08);
  batch.addBox(furnWoodWarmMat, tx, floorY + 0.18, tz, w - 0.16, 0.035, d - 0.14);
  for (const [lx, lz] of [
    [-w * 0.44, -d * 0.42],
    [w * 0.44, -d * 0.42],
    [-w * 0.44, d * 0.42],
    [w * 0.44, d * 0.42],
  ]) {
    batch.addBox(furnWoodDarkMat, tx + lx, floorY + 0.21, tz + lz, 0.055, 0.38, 0.055);
  }
  // Stacked architectural books & chrome centerpiece bowl
  batch.addBox(furnPillowAccentMat, tx - 0.32, floorY + 0.46, tz - 0.06, 0.34, 0.04, 0.24, 0, 0.12, 0);
  batch.addBox(furnFabricNavyMat, tx - 0.3, floorY + 0.495, tz - 0.05, 0.28, 0.035, 0.2, 0, -0.08, 0);
  batch.addCyl(furnChromeMat, tx + 0.28, floorY + 0.47, tz + 0.05, 0.26, 0.07, 0.26);
}

// Helper to stamp a realistic indoor potted plant with ceramic planter, trunk & layered foliage
function addDetailedIndoorPlant(
  batch: MultiMaterialFurnitureBatcher,
  px: number,
  floorY: number,
  pz: number,
  scale: number = 1.0
) {
  batch.addCyl(furnPlantPotMat, px, floorY + 0.22 * scale, pz, 0.38 * scale, 0.42 * scale, 0.38 * scale);
  batch.addCyl(furnWoodDarkMat, px, floorY + 0.43 * scale, pz, 0.34 * scale, 0.03 * scale, 0.34 * scale);
  batch.addCyl(furnWoodWarmMat, px, floorY + 0.68 * scale, pz, 0.06 * scale, 0.52 * scale, 0.06 * scale);
  batch.addBox(furnFoliageMat, px, floorY + 0.98 * scale, pz, 0.48 * scale, 0.38 * scale, 0.48 * scale, 0.2, 0.4, 0.15);
  batch.addBox(furnFoliageMat, px - 0.12 * scale, floorY + 1.18 * scale, pz + 0.08 * scale, 0.36 * scale, 0.32 * scale, 0.36 * scale, -0.15, 0.7, 0.2);
  batch.addBox(furnFoliageMat, px + 0.12 * scale, floorY + 1.12 * scale, pz - 0.08 * scale, 0.34 * scale, 0.28 * scale, 0.34 * scale, 0.25, -0.5, -0.15);
}
const houseMaterialCache = new Map<
  number,
  {
    wallMat: THREE.MeshStandardMaterial;
    accentMat: THREE.MeshStandardMaterial;
    roofMat: THREE.MeshStandardMaterial;
    shutterMat: THREE.MeshStandardMaterial;
    doorMat: THREE.MeshStandardMaterial;
  }
>();

export function buildDetailedHouse20Types(options: {
  buildingId: string;
  typeIndex: number;
  name: string;
  cx: number;
  cz: number;
}): {
  group: THREE.Group;
  roofMeshes: THREE.Mesh[];
  colliders: BuiltCollider[];
  w: number;
  d: number;
  h: number;
  interiorStairsGroup: THREE.Group;
  mailboxPos: { x: number; z: number; homeX: number; homeZ: number; carX?: number; carZ?: number };
  stovePos: { x: number; z: number } | null;
  doorData: AnimatedBuildingDoor;
} {
  const { buildingId, name, cx, cz } = options;
  const tIdx = ((options.typeIndex % 20) + 20) % 20;

  const group = new THREE.Group();
  const interiorStairsGroup = new THREE.Group();
  group.add(interiorStairsGroup);
  const roofMeshes: THREE.Mesh[] = [];
  const colliders: BuiltCollider[] = [];

  // Per-archetype dimensions & palette
  const palettes: {
    wallHex: number;
    accentHex: number;
    roofHex: number;
    shutterHex: number;
    doorHex: number;
    w: number;
    d: number;
    h: number;
  }[] = [
    { wallHex: 0x1e3a5f, accentHex: 0xd97706, roofHex: 0x1e293b, shutterHex: 0x78350f, doorHex: 0x7c2d12, w: 14, d: 12, h: 4.0 }, // 0 Craftsman
    { wallHex: 0x991b1b, accentHex: 0xf8fafc, roofHex: 0x0f172a, shutterHex: 0x090d16, doorHex: 0x1e293b, w: 15, d: 12, h: 5.4 }, // 1 Brick Colonial
    { wallHex: 0xf8fafc, accentHex: 0xb45309, roofHex: 0x1e293b, shutterHex: 0x1e293b, doorHex: 0x92400e, w: 16, d: 13, h: 4.4 }, // 2 Modernist Glass
    { wallHex: 0xfef3c7, accentHex: 0x271203, roofHex: 0x292524, shutterHex: 0x271203, doorHex: 0x451a03, w: 15, d: 13, h: 5.2 }, // 3 Tudor Revival
    { wallHex: 0xffedd5, accentHex: 0x9a3412, roofHex: 0xc2410c, shutterHex: 0x431407, doorHex: 0x7c2d12, w: 16, d: 13, h: 4.3 }, // 4 Spanish Villa
    { wallHex: 0x115e59, accentHex: 0xfef08a, roofHex: 0x1e1b4b, shutterHex: 0xfacc15, doorHex: 0x881337, w: 14, d: 13, h: 5.6 }, // 5 Victorian Painted Lady
    { wallHex: 0x78350f, accentHex: 0x451a03, roofHex: 0x1c1917, shutterHex: 0x14532d, doorHex: 0xd97706, w: 14, d: 13, h: 4.6 }, // 6 Nordic A-Frame
    { wallHex: 0x64748b, accentHex: 0xf8fafc, roofHex: 0x334155, shutterHex: 0x1e3a8a, doorHex: 0xdc2626, w: 14, d: 11, h: 4.0 }, // 7 Cape Cod
    { wallHex: 0xd6d3d1, accentHex: 0x0d9488, roofHex: 0x27272a, shutterHex: 0x0f766e, doorHex: 0xf97316, w: 17, d: 12, h: 3.8 }, // 8 Mid-Century Ranch
    { wallHex: 0x7f1d1d, accentHex: 0xe2e8f0, roofHex: 0x18181b, shutterHex: 0x090d16, doorHex: 0x064e3b, w: 13, d: 13, h: 5.8 }, // 9 Georgian Townhouse
    { wallHex: 0xe7e5e4, accentHex: 0x44403c, roofHex: 0x1f2937, shutterHex: 0x334155, doorHex: 0x1e293b, w: 16, d: 13, h: 5.2 }, // 10 French Chateau
    { wallHex: 0x27272a, accentHex: 0x991b1b, roofHex: 0x09090b, shutterHex: 0x18181b, doorHex: 0xb45309, w: 15, d: 12, h: 4.8 }, // 11 Industrial Loft
    { wallHex: 0xb91c1c, accentHex: 0xffffff, roofHex: 0x1e293b, shutterHex: 0xf8fafc, doorHex: 0xf8fafc, w: 15, d: 12, h: 4.8 }, // 12 Dutch Colonial
    { wallHex: 0x5c3317, accentHex: 0x3b1704, roofHex: 0x14532d, shutterHex: 0x451a03, doorHex: 0x78350f, w: 15, d: 12, h: 4.2 }, // 13 Alpine Log Cabin
    { wallHex: 0x1e40af, accentHex: 0xffffff, roofHex: 0x334155, shutterHex: 0xffffff, doorHex: 0xf8fafc, w: 16, d: 13, h: 5.0 }, // 14 Coastal Hamptons
    { wallHex: 0xd97706, accentHex: 0x78350f, roofHex: 0x92400e, shutterHex: 0x0284c7, doorHex: 0x0284c7, w: 15, d: 13, h: 4.0 }, // 15 Southwest Adobe
    { wallHex: 0x292524, accentHex: 0xd97706, roofHex: 0x0f172a, shutterHex: 0x78350f, doorHex: 0xb45309, w: 15, d: 12, h: 4.2 }, // 16 Zen Pavilion
    { wallHex: 0xffffff, accentHex: 0xe2e8f0, roofHex: 0x1e293b, shutterHex: 0x14532d, doorHex: 0x0f172a, w: 17, d: 14, h: 5.6 }, // 17 Neoclassical Mansion
    { wallHex: 0x9a3412, accentHex: 0xfde68a, roofHex: 0x292524, shutterHex: 0x451a03, doorHex: 0x451a03, w: 17, d: 12, h: 4.1 }, // 18 Prairie Wright
    { wallHex: 0xf1f5f9, accentHex: 0x0f172a, roofHex: 0x0284c7, shutterHex: 0x0f172a, doorHex: 0x0284c7, w: 17, d: 14, h: 5.4 }, // 19 Luxury Penthouse Villa
  ];

  const spec = palettes[tIdx];
  const { w, d, h: houseH } = spec;
  const wallT = 0.28;
  const doorW = 1.45;
  const frontPartW = (w - doorW) * 0.5;

  let cachedMats = houseMaterialCache.get(tIdx);
  if (!cachedMats) {
    cachedMats = {
      wallMat: new THREE.MeshStandardMaterial({ color: spec.wallHex, roughness: 0.68 }),
      accentMat: new THREE.MeshStandardMaterial({ color: spec.accentHex, roughness: 0.55 }),
      roofMat: new THREE.MeshStandardMaterial({
        color: spec.roofHex,
        roughness: 0.6,
      }),
      shutterMat: new THREE.MeshStandardMaterial({ color: spec.shutterHex, roughness: 0.6 }),
      doorMat: new THREE.MeshStandardMaterial({ color: spec.doorHex, roughness: 0.45 }),
    };
    houseMaterialCache.set(tIdx, cachedMats);
  }
  const { wallMat, accentMat, roofMat, shutterMat, doorMat } = cachedMats;

  const addCol = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    maxY: number,
    suffix: string,
    isFurniture: boolean = false
  ) => {
    colliders.push({
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
      maxY,
      name: `${name} ${suffix}`,
      isBuilding: true,
      isFurniture,
      buildingId,
    });
  };

  // 1. Foundation Plinth (No artificial green plane, so the world grass texture extends seamlessly right up to the house)
  const lawnW = w + 8.6;
  const lawnD = d + 10.6;
  const lawnCenterZ = cz - 1.4;
  // 1. Foundation Plinth: Stone perimeter base under the house (top at Y=0.16, cleanly underneath the interior floor slab!)
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.16, d + 0.25), sharedStoneMat);
  foundation.position.set(cx, 0.08, cz);
  group.add(foundation);

  // 2. Interior Walkable Hardwood Floor (Y=0.16 to 0.22, top flush at Y=0.22 so player feet never sink and zero Z-fighting with stone base)
  const intFloor = new THREE.Mesh(new THREE.BoxGeometry(w - wallT * 0.5, 0.06, d - wallT * 0.5), sharedInteriorFloorMat);
  intFloor.position.set(cx, 0.19, cz);
  intFloor.receiveShadow = true;
  interiorStairsGroup.add(intFloor);

  // Front Doorway Transition Threshold Strip
  const doorwayThreshold = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.12, 0.03, wallT + 0.06), sharedWhiteTrimMat);
  doorwayThreshold.position.set(cx, 0.225, cz - d * 0.5);
  interiorStairsGroup.add(doorwayThreshold);

  // Clean Architectural Baseboards along All Interior Perimeter Walls (Hides all seams, looks polished & finished)
  const baseboardGeos: THREE.BufferGeometry[] = [];
  const baseH = 0.10;
  const baseT = 0.03;
  const baseY = 0.22 + baseH * 0.5;

  // Rear interior baseboard (North)
  const bbRear = new THREE.BoxGeometry(w - wallT * 2, baseH, baseT);
  bbRear.translate(cx, baseY, cz + d * 0.5 - wallT * 0.5 - baseT * 0.5);
  baseboardGeos.push(bbRear);

  // Front interior baseboard (West of door)
  const bbFrontW = new THREE.BoxGeometry(frontPartW - 0.1, baseH, baseT);
  bbFrontW.translate(cx - doorW * 0.5 - frontPartW * 0.5, baseY, cz - d * 0.5 + wallT * 0.5 + baseT * 0.5);
  baseboardGeos.push(bbFrontW);

  // Front interior baseboard (East of door)
  const bbFrontE = new THREE.BoxGeometry(frontPartW - 0.1, baseH, baseT);
  bbFrontE.translate(cx + doorW * 0.5 + frontPartW * 0.5, baseY, cz - d * 0.5 + wallT * 0.5 + baseT * 0.5);
  baseboardGeos.push(bbFrontE);

  // West interior baseboard
  const bbWest = new THREE.BoxGeometry(baseT, baseH, d - wallT * 2);
  bbWest.translate(cx - w * 0.5 + wallT * 0.5 + baseT * 0.5, baseY, cz);
  baseboardGeos.push(bbWest);

  // East interior baseboard
  const bbEast = new THREE.BoxGeometry(baseT, baseH, d - wallT * 2);
  bbEast.translate(cx + w * 0.5 - wallT * 0.5 - baseT * 0.5, baseY, cz);
  baseboardGeos.push(bbEast);

  const baseboardsMesh = new THREE.Mesh(mergeBufferGeometries(baseboardGeos), sharedWhiteTrimMat);
  interiorStairsGroup.add(baseboardsMesh);

  // Permanent Interior Plaster Ceiling Slab + Crown Molding + Recessed Warm LED Downlights (Always stays visible inside!)
  const intCeiling = new THREE.Mesh(new THREE.BoxGeometry(w - wallT * 0.5, 0.14, d - wallT * 0.5), furnCeilingMat);
  intCeiling.position.set(cx, houseH - 0.07, cz);
  interiorStairsGroup.add(intCeiling);

  for (const [lx, lz] of [
    [cx - w * 0.26, cz - d * 0.2],
    [cx + w * 0.26, cz - d * 0.18],
    [cx - w * 0.25, cz + d * 0.25],
    [cx + w * 0.26, cz + d * 0.25],
  ]) {
    const fixtureRing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12), furnChromeMat);
    fixtureRing.position.set(lx, houseH - 0.15, lz);
    const fixtureBulb = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12), furnWarmLampMat);
    fixtureBulb.position.set(lx, houseH - 0.16, lz);
    interiorStairsGroup.add(fixtureRing, fixtureBulb);
  }

  // Interior partition wall (with open hallway passage and clean white baseboard trim)
  const divW = w * 0.42;
  const intDivider = new THREE.Mesh(new THREE.BoxGeometry(divW, houseH - 0.22, 0.18), sharedInteriorWallMat);
  intDivider.position.set(cx - w * 0.5 + divW * 0.5 + 0.15, houseH * 0.5, cz + 0.8);
  const divBase1 = new THREE.Mesh(new THREE.BoxGeometry(divW, baseH, baseT), sharedWhiteTrimMat);
  divBase1.position.set(cx - w * 0.5 + divW * 0.5 + 0.15, baseY, cz + 0.8 - 0.09 - baseT * 0.5);
  const divBase2 = new THREE.Mesh(new THREE.BoxGeometry(divW, baseH, baseT), sharedWhiteTrimMat);
  divBase2.position.set(cx - w * 0.5 + divW * 0.5 + 0.15, baseY, cz + 0.8 + 0.09 + baseT * 0.5);
  interiorStairsGroup.add(intDivider, divBase1, divBase2);
  addCol(cx - w * 0.5 + 0.15, cx - w * 0.5 + divW + 0.15, cz + 0.65, cz + 0.95, houseH, 'Interior Wall');

  // 2B. HIGH-DETAIL REALISTIC RESIDENTIAL FURNITURE (Living Room, Kitchen/Dining, Bedroom)
  const sofaMat = tIdx % 3 === 0 ? furnFabricNavyMat : tIdx % 3 === 1 ? furnFabricSlateMat : furnFabricCreamMat;

  // --- LIVING ROOM (Front-West Zone: Sectional Plush Sofa with Cushions & Throw Pillows, Glass/Oak Coffee Table, Media Console, 4K TV, Floor Lamp, Indoor Palm) ---
  const livX = cx - w * 0.26;
  const livZ = cz - d * 0.2;
  const areaRugBorder = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.008, 2.6), furnWoodWarmMat);
  areaRugBorder.position.set(livX, 0.224, livZ);
  const areaRug = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.01, 2.3), accentMat);
  areaRug.position.set(livX, 0.228, livZ);
  areaRug.material.polygonOffset = true;
  areaRug.material.polygonOffsetFactor = -1;
  areaRug.material.polygonOffsetUnits = -1;

  // Plush 3-Seat Sectional Sofa with Individual Seat Cushions, Tufted Back Cushions, Chaise Ottoman, Throw Pillows & Tapered Wood Legs
  const sofaFrame = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.22, 0.96), furnWoodDarkMat);
  sofaFrame.position.set(livX, 0.32, livZ - 0.85);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.58, 0.2), sofaMat);
  sofaBack.position.set(livX, 0.72, livZ - 1.23);
  const sofaArmL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.98), sofaMat);
  sofaArmL.position.set(livX - 1.16, 0.56, livZ - 0.85);
  const sofaArmR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.98), sofaMat);
  sofaArmR.position.set(livX + 1.16, 0.56, livZ - 0.85);
  for (const [sxLeg, szLeg] of [
    [-1.14, -1.24],
    [1.14, -1.24],
    [-1.14, -0.44],
    [1.14, -0.44],
  ]) {
    const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.022, 0.2, 8), furnWoodDarkMat);
    sLeg.position.set(livX + sxLeg, 0.18, livZ + szLeg);
    interiorStairsGroup.add(sLeg);
  }
  for (let c = -1; c <= 1; c++) {
    const seatCush = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.78), sofaMat);
    seatCush.position.set(livX + c * 0.7, 0.49, livZ - 0.82);
    const backCush = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.38, 0.16), sofaMat);
    backCush.position.set(livX + c * 0.7, 0.74, livZ - 1.08);
    interiorStairsGroup.add(seatCush, backCush);
  }
  const throwPillowL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.14), furnPillowAccentMat);
  throwPillowL.position.set(livX - 0.88, 0.68, livZ - 0.96);
  throwPillowL.rotation.z = 0.22;
  const throwPillowR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.14), furnPillowAccentMat);
  throwPillowR.position.set(livX + 0.88, 0.68, livZ - 0.96);
  throwPillowR.rotation.z = -0.22;

  // Modern Glass & Walnut Coffee Table with Lower Shelf, 4 Sculpted Legs & Decorative Centerpiece
  const coffeeTop = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 0.74), sharedWindowGlassMat);
  coffeeTop.position.set(livX, 0.48, livZ + 0.05);
  const coffeeRim = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.04, 0.76), furnWoodDarkMat);
  coffeeRim.position.set(livX, 0.46, livZ + 0.05);
  const coffeeShelf = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.04, 0.62), furnWoodWarmMat);
  coffeeShelf.position.set(livX, 0.26, livZ + 0.05);
  for (const [cxLeg, czLeg] of [
    [-0.66, -0.31],
    [0.66, -0.31],
    [-0.66, 0.31],
    [0.66, 0.31],
  ]) {
    const cLeg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.05), furnWoodDarkMat);
    cLeg.position.set(livX + cxLeg, 0.31, livZ + 0.05 + czLeg);
    interiorStairsGroup.add(cLeg);
  }
  const coffeeBook = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.26), furnPillowAccentMat);
  coffeeBook.position.set(livX - 0.25, 0.52, livZ + 0.05);
  const coffeeBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.09, 10), furnChromeMat);
  coffeeBowl.position.set(livX + 0.24, 0.53, livZ + 0.05);

  // Entertainment Media Console with Cabinet Doors, Soundbar, Bookshelf Speakers & 65-inch Flat-Screen TV on Stand
  const tvConsole = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.52, 0.46), furnWoodDarkMat);
  tvConsole.position.set(livX, 0.44, cz + 0.42);
  const tvConsoleTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.48), furnGraniteMat);
  tvConsoleTop.position.set(livX, 0.71, cz + 0.42);
  for (const doorOffX of [-0.68, 0, 0.68]) {
    const cabDoor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.03), furnWoodWarmMat);
    cabDoor.position.set(livX + doorOffX, 0.44, cz + 0.18);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.03), sharedBrassMat);
    handle.position.set(livX + doorOffX, 0.56, cz + 0.16);
    interiorStairsGroup.add(cabDoor, handle);
  }
  const soundbar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.07, 0.1), furnScreenMat);
  soundbar.position.set(livX, 0.76, cz + 0.3);
  const tvPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.24), furnChromeMat);
  tvPedestal.position.set(livX, 0.78, cz + 0.42);
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.98, 0.05), furnScreenMat);
  tvFrame.position.set(livX, 1.32, cz + 0.42);
  const tvDisplay = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.9, 0.06), furnTvDisplayMat);
  tvDisplay.position.set(livX, 1.32, cz + 0.415);



  // Standing Floor Lamp next to Sofa
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 10), furnChromeMat);
  lampBase.position.set(livX + 1.48, 0.21, livZ - 0.95);
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.45, 8), furnChromeMat);
  lampPole.position.set(livX + 1.48, 0.92, livZ - 0.95);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.36, 12), furnLampShadeMat);
  lampShade.position.set(livX + 1.48, 1.62, livZ - 0.95);

  // Realistic Indoor Potted Fiddle-Leaf Plant
  const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.46, 10), furnPlantPotMat);
  plantPot.position.set(cx - w * 0.42, 0.41, cz - d * 0.38);
  const plantStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 6), furnWoodDarkMat);
  plantStem.position.set(cx - w * 0.42, 0.78, cz - d * 0.38);
  const plantBush1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 1), furnFoliageMat);
  plantBush1.position.set(cx - w * 0.42, 1.05, cz - d * 0.38);
  const plantBush2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 1), furnFoliageMat);
  plantBush2.position.set(cx - w * 0.42 + 0.16, 1.28, cz - d * 0.38 - 0.1);

  interiorStairsGroup.add(
    areaRugBorder,
    areaRug,
    sofaFrame,
    sofaBack,
    sofaArmL,
    sofaArmR,
    throwPillowL,
    throwPillowR,
    coffeeTop,
    coffeeRim,
    coffeeShelf,
    coffeeBook,
    coffeeBowl,
    tvConsole,
    tvConsoleTop,
    soundbar,
    tvPedestal,
    tvFrame,
    tvDisplay,
    lampBase,
    lampPole,
    lampShade,
    plantPot,
    plantStem,
    plantBush1,
    plantBush2
  );

  // --- KITCHEN & DINING AREA (East Zone: L-Shaped Granite Counters, Sink & Faucet, 4-Burner Stove & Hood, French-Door Fridge, Dining Table & 4 High-Back Chairs) ---
  const kitX = cx + w * 0.32;
  const counterX = cx + w * 0.5 - 0.72;
  const counterZ = cz + d * 0.16;
  const kitCounter = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.88, 3.3), furnWoodWarmMat);
  kitCounter.position.set(counterX, 0.62, counterZ);
  const kitCounterTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 3.38), furnGraniteMat);
  kitCounterTop.position.set(counterX, 1.09, counterZ);

  // Stainless Steel Sink Basin & Gooseneck Faucet
  const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.76), furnChromeMat);
  sinkBasin.position.set(counterX - 0.05, 1.13, counterZ - 0.75);
  const faucetPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8), furnChromeMat);
  faucetPipe.position.set(counterX + 0.22, 1.28, counterZ - 0.75);
  const faucetSpout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.03), furnChromeMat);
  faucetSpout.position.set(counterX + 0.14, 1.42, counterZ - 0.75);

  // 4-Burner Glass Induction Cooktop + Overhead Stainless Range Hood
  const cooktop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.82), furnCooktopMat);
  cooktop.position.set(counterX - 0.04, 1.13, counterZ + 0.65);
  for (const [bxOff, bzOff] of [
    [-0.16, -0.2],
    [0.14, -0.2],
    [-0.16, 0.2],
    [0.14, 0.2],
  ]) {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 10), furnBurnerRingMat);
    burner.position.set(counterX - 0.04 + bxOff, 1.135, counterZ + 0.65 + bzOff);
    interiorStairsGroup.add(burner);
  }
  const rangeHood = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.88), furnChromeMat);
  rangeHood.position.set(counterX - 0.02, 2.25, counterZ + 0.65);
  const hoodChimney = new THREE.Mesh(new THREE.BoxGeometry(0.32, Math.max(0.4, houseH - 2.45), 0.34), furnChromeMat);
  hoodChimney.position.set(counterX + 0.18, 2.36 + Math.max(0.4, houseH - 2.45) * 0.5, counterZ + 0.65);
  const upperCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.78, 1.45), furnWoodWarmMat);
  upperCabinet.position.set(counterX + 0.28, 2.38, counterZ - 0.65);
  const espressoMaker = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.26), furnScreenMat);
  espressoMaker.position.set(counterX + 0.12, 1.29, counterZ - 1.32);
  interiorStairsGroup.add(hoodChimney, upperCabinet, espressoMaker);

  // Double-Door Stainless Steel French-Door Refrigerator with Handles & Dispenser
  const fridgeZ = cz + d * 0.5 - 0.72;
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.98, 2.02, 0.94), furnChromeMat);
  fridge.position.set(counterX, 1.18, fridgeZ);
  const fridgeHandleL = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.65, 8), sharedDarkFrameMat);
  fridgeHandleL.position.set(counterX - 0.51, 1.42, fridgeZ - 0.06);
  const fridgeHandleR = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.65, 8), sharedDarkFrameMat);
  fridgeHandleR.position.set(counterX - 0.51, 1.42, fridgeZ + 0.06);
  const iceDispenser = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.2), furnScreenMat);
  iceDispenser.position.set(counterX - 0.49, 1.42, fridgeZ - 0.24);

  // Solid Walnut Dining Table with 4 Sculpted Legs, Table Runner & 4 Upholstered High-Back Chairs
  const dtX = kitX - 0.6;
  const dtZ = cz - d * 0.18;
  const diningTop = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.07, 1.18), furnWoodDarkMat);
  diningTop.position.set(dtX, 0.82, dtZ);
  const diningRunner = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.02, 0.34), furnFabricCreamMat);
  diningRunner.position.set(dtX, 0.86, dtZ);
  for (const [lxOff, lzOff] of [
    [-0.74, -0.48],
    [0.74, -0.48],
    [-0.74, 0.48],
    [0.74, 0.48],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.66, 0.07), furnWoodDarkMat);
    leg.position.set(dtX + lxOff, 0.48, dtZ + lzOff);
    interiorStairsGroup.add(leg);
  }

  interiorStairsGroup.add(
    kitCounter,
    kitCounterTop,
    sinkBasin,
    faucetPipe,
    faucetSpout,
    cooktop,
    rangeHood,
    fridge,
    fridgeHandleL,
    fridgeHandleR,
    iceDispenser,
    diningTop,
    diningRunner
  );

  for (const [chX, chZ, backOffsetX, backOffsetZ] of [
    [dtX - 0.92, dtZ, -0.2, 0],
    [dtX + 0.92, dtZ, 0.2, 0],
    [dtX, dtZ - 0.72, 0, -0.2],
    [dtX, dtZ + 0.72, 0, 0.2],
  ]) {
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), sofaMat);
    chairSeat.position.set(chX, 0.5, chZ);
    const chairBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.42), furnWoodWarmMat);
    chairBase.position.set(chX, 0.33, chZ);
    const chairBack = new THREE.Mesh(
      new THREE.BoxGeometry(backOffsetX !== 0 ? 0.07 : 0.44, 0.52, backOffsetZ !== 0 ? 0.07 : 0.44),
      furnWoodDarkMat
    );
    chairBack.position.set(chX + backOffsetX, 0.78, chZ + backOffsetZ);
    interiorStairsGroup.add(chairSeat, chairBase, chairBack);
  }

  // --- BEDROOM SUITE (Rear-West Zone: Tufted Platform Bed, Layered Duvet, 4 Pillows, 2 Nightstands with Lamps, Double-Door Wardrobe) ---
  const bedX = cx - w * 0.12;
  const bedZ = cz + d * 0.5 - 1.55;
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.32, 2.34), furnWoodDarkMat);
  bedFrame.position.set(bedX, 0.34, bedZ);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.24, 0.16), furnWoodDarkMat);
  headboard.position.set(bedX, 0.82, cz + d * 0.5 - 0.3);
  const headboardPad = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.92, 0.19), sofaMat);
  headboardPad.position.set(bedX, 0.88, cz + d * 0.5 - 0.29);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.26, 2.14), furnMattressMat);
  mattress.position.set(bedX, 0.62, bedZ - 0.04);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.28, 1.48), furnBlanketMat);
  blanket.position.set(bedX, 0.64, bedZ - 0.36);
  const blanketFold = new THREE.Mesh(new THREE.BoxGeometry(2.03, 0.3, 0.24), furnMattressMat);
  blanketFold.position.set(bedX, 0.65, bedZ + 0.32);
  const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.15, 0.44), furnMattressMat);
  pillowL.position.set(bedX - 0.48, 0.82, cz + d * 0.5 - 0.68);
  const pillowR = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.15, 0.44), furnMattressMat);
  pillowR.position.set(bedX + 0.48, 0.82, cz + d * 0.5 - 0.68);
  const accentPillowL = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.28), furnPillowAccentMat);
  accentPillowL.position.set(bedX - 0.48, 0.84, cz + d * 0.5 - 0.95);
  const accentPillowR = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.28), furnPillowAccentMat);
  accentPillowR.position.set(bedX + 0.48, 0.84, cz + d * 0.5 - 0.95);

  // Nightstand with Glowing Bedside Table Lamp
  const nsX = bedX + 1.42;
  const nsZ = cz + d * 0.5 - 0.55;
  const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.52), furnWoodWarmMat);
  nightstand.position.set(nsX, 0.48, nsZ);
  const nsTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.56), furnGraniteMat);
  nsTop.position.set(nsX, 0.78, nsZ);
  const nsLampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 8), furnChromeMat);
  nsLampBase.position.set(nsX, 0.9, nsZ);
  const nsLampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.24, 10), furnLampShadeMat);
  nsLampShade.position.set(nsX, 1.08, nsZ);

  // Detailed Double-Door Wardrobe Armoire with Brass Handles
  const wardX = cx - w * 0.5 + 0.52;
  const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(0.66, 2.02, 1.52), furnWoodDarkMat);
  wardrobe.position.set(wardX, 1.18, bedZ);
  const wardTrim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 1.58), furnWoodWarmMat);
  wardTrim.position.set(wardX, 2.21, bedZ);
  const wardHandle1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.04), sharedBrassMat);
  wardHandle1.position.set(wardX + 0.35, 1.22, bedZ - 0.08);
  const wardHandle2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.04), sharedBrassMat);
  wardHandle2.position.set(wardX + 0.35, 1.22, bedZ + 0.08);

  interiorStairsGroup.add(
    bedFrame,
    headboard,
    headboardPad,
    mattress,
    blanket,
    blanketFold,
    pillowL,
    pillowR,
    accentPillowL,
    accentPillowR,
    nightstand,
    nsTop,
    nsLampBase,
    nsLampShade,
    wardrobe,
    wardTrim,
    wardHandle1,
    wardHandle2
  );

  // Tag all furniture meshes in interiorStairsGroup added so far (after the 11 structural floor/ceiling/light/divider meshes)
  for (let i = 11; i < interiorStairsGroup.children.length; i++) {
    const ch = interiorStairsGroup.children[i];
    ch.userData.isFurniture = true;
  }

  // Solid Colliders for All House Interior Furniture so the player cannot walk through any object (destructible with guns & fists)!
  addCol(livX - 1.28, livX + 1.58, livZ - 1.34, livZ - 0.38, 1.2, 'Sofa & Lamp', true);
  addCol(livX - 0.74, livX + 0.74, livZ - 0.32, livZ + 0.42, 0.65, 'Coffee Table', true);
  addCol(livX - 1.1, livX + 1.1, cz + 0.18, cz + 0.68, 1.55, 'TV Stand', true);
  addCol(cx - w * 0.42 - 0.32, cx - w * 0.42 + 0.32, cz - d * 0.38 - 0.32, cz - d * 0.38 + 0.32, 1.35, 'Plant', true);
  addCol(cx + w * 0.5 - 1.35, cx + w * 0.5 - 0.15, cz + d * 0.16 - 1.68, cz + d * 0.5 - 0.22, 2.1, 'Kitchen Counter & Fridge', true);
  addCol(dtX - 1.15, dtX + 1.15, dtZ - 0.92, dtZ + 0.92, 1.05, 'Dining Table & Chairs', true);
  addCol(bedX - 1.1, bedX + 1.72, bedZ - 1.22, cz + d * 0.5 - 0.2, 1.3, 'Bed & Nightstand', true);
  addCol(cx - w * 0.5 + 0.18, cx - w * 0.5 + 0.88, bedZ - 0.78, bedZ + 0.78, 2.2, 'Wardrobe', true);

  // 3. Four Outer Walkable Walls with Precise Window Holes
  const doorHeaderH = Math.max(0.8, houseH - 2.6);
  const wallGeos: THREE.BufferGeometry[] = [];

  const winSpecs: { wx: number; wy: number; wz: number; winW: number; winH: number; rotY: number }[] = [
    // Front windows (outward facing -Z)
    { wx: cx - doorW * 0.5 - frontPartW * 0.5, wy: 1.85, wz: cz - d * 0.5, winW: 1.8, winH: 1.45, rotY: Math.PI },
    { wx: cx + doorW * 0.5 + frontPartW * 0.5, wy: 1.85, wz: cz - d * 0.5, winW: 1.8, winH: 1.45, rotY: Math.PI },
    // West windows (outward facing -X)
    { wx: cx - w * 0.5, wy: 1.85, wz: cz - d * 0.22, winW: 1.8, winH: 1.4, rotY: -Math.PI / 2 },
    { wx: cx - w * 0.5, wy: 1.85, wz: cz + d * 0.22, winW: 1.8, winH: 1.4, rotY: -Math.PI / 2 },
    // East window (outward facing +X)
    { wx: cx + w * 0.5, wy: 1.85, wz: cz, winW: 2.0, winH: 1.4, rotY: Math.PI / 2 },
    // Rear windows (outward facing +Z, unobstructed beside bed and dining)
    { wx: cx - w * 0.36, wy: 1.85, wz: cz + d * 0.5, winW: 2.0, winH: 1.45, rotY: 0 },
    { wx: cx + w * 0.28, wy: 1.85, wz: cz + d * 0.5, winW: 2.0, winH: 1.45, rotY: 0 },
  ];
  if (houseH >= 4.9) {
    winSpecs.push(
      { wx: cx - doorW * 0.5 - frontPartW * 0.5, wy: 3.95, wz: cz - d * 0.5, winW: 1.6, winH: 1.25, rotY: Math.PI },
      { wx: cx + doorW * 0.5 + frontPartW * 0.5, wy: 3.95, wz: cz - d * 0.5, winW: 1.6, winH: 1.25, rotY: Math.PI },
      { wx: cx, wy: 3.95, wz: cz - d * 0.5, winW: 1.5, winH: 1.25, rotY: Math.PI }
    );
  }

  const addWallWithHoles = (
    geos: THREE.BufferGeometry[],
    scx: number, scy: number, scz: number,
    sw: number, sh: number, st: number,
    isX: boolean,
    holes: { c: number; y: number; w: number; h: number }[]
  ) => {
    const baseY = scy - sh * 0.5;

    // Cluster holes that share the same horizontal column (within 0.2m)
    const columns: Array<{
      colC: number;
      colW: number;
      holes: { c: number; y: number; w: number; h: number }[];
    }> = [];

    const sortedHoles = [...holes].sort((a, b) => a.c - b.c);
    for (const h of sortedHoles) {
      const existingCol = columns.find((col) => Math.abs(col.colC - h.c) < 0.25);
      if (existingCol) {
        existingCol.holes.push(h);
        existingCol.colW = Math.max(existingCol.colW, h.w);
      } else {
        columns.push({ colC: h.c, colW: h.w, holes: [h] });
      }
    }

    columns.sort((a, b) => a.colC - b.colC);
    let curr = -sw / 2;

    for (const col of columns) {
      // 1. Solid wall section to the left of this column
      const gapW = col.colC - col.colW / 2 - curr;
      if (gapW > 0.05) {
        const g = isX ? new THREE.BoxGeometry(gapW, sh, st) : new THREE.BoxGeometry(st, sh, gapW);
        const mid = curr + gapW / 2;
        g.translate(isX ? scx + mid : scx, scy, isX ? scz : scz + mid);
        geos.push(g);
      }

      // 2. Vertical slices within this column (under, between, and above window openings)
      col.holes.sort((a, b) => a.y - b.y);
      let currLocalY = 0;

      for (const h of col.holes) {
        const holeBot = h.y - h.h / 2 - baseY;
        const holeTop = h.y + h.h / 2 - baseY;
        const sliceH = holeBot - currLocalY;
        if (sliceH > 0.05) {
          const g = isX ? new THREE.BoxGeometry(col.colW, sliceH, st) : new THREE.BoxGeometry(st, sliceH, col.colW);
          const midY = baseY + currLocalY + sliceH / 2;
          g.translate(isX ? scx + col.colC : scx, midY, isX ? scz : scz + col.colC);
          geos.push(g);
        }
        currLocalY = Math.max(currLocalY, holeTop);
      }

      // Top wall header above highest window in this column
      const topSliceH = sh - currLocalY;
      if (topSliceH > 0.05) {
        const g = isX ? new THREE.BoxGeometry(col.colW, topSliceH, st) : new THREE.BoxGeometry(st, topSliceH, col.colW);
        const midY = baseY + currLocalY + topSliceH / 2;
        g.translate(isX ? scx + col.colC : scx, midY, isX ? scz : scz + col.colC);
        geos.push(g);
      }

      curr = col.colC + col.colW / 2;
    }

    // 3. Solid wall section after the last column
    const lastW = sw / 2 - curr;
    if (lastW > 0.05) {
      const g = isX ? new THREE.BoxGeometry(lastW, sh, st) : new THREE.BoxGeometry(st, sh, lastW);
      const mid = curr + lastW / 2;
      g.translate(isX ? scx + mid : scx, scy, isX ? scz : scz + mid);
      geos.push(g);
    }
  };

  // Rear Wall
  addWallWithHoles(wallGeos, cx, houseH * 0.5, cz + d * 0.5, w, houseH, wallT, true, [
    { c: -w * 0.36, y: 1.85, w: 2.0, h: 1.45 },
    { c: w * 0.28, y: 1.85, w: 2.0, h: 1.45 },
  ]);
  // West Wall
  addWallWithHoles(wallGeos, cx - w * 0.5, houseH * 0.5, cz, d, houseH, wallT, false, [
    { c: -d * 0.22, y: 1.85, w: 1.8, h: 1.4 },
    { c: d * 0.22, y: 1.85, w: 1.8, h: 1.4 },
  ]);
  // East Wall
  addWallWithHoles(wallGeos, cx + w * 0.5, houseH * 0.5, cz, d, houseH, wallT, false, [
    { c: 0, y: 1.85, w: 2.0, h: 1.4 },
  ]);
  // Front Walls (Left and Right of Door)
  const fHolesL = [{ c: 0, y: 1.85, w: 1.8, h: 1.45 }];
  const fHolesR = [{ c: 0, y: 1.85, w: 1.8, h: 1.45 }];
  if (houseH >= 4.9) {
    fHolesL.push({ c: 0, y: 3.95, w: 1.6, h: 1.25 });
    fHolesR.push({ c: 0, y: 3.95, w: 1.6, h: 1.25 });
  }
  addWallWithHoles(wallGeos, cx - doorW * 0.5 - frontPartW * 0.5, houseH * 0.5, cz - d * 0.5, frontPartW, houseH, wallT, true, fHolesL);
  addWallWithHoles(wallGeos, cx + doorW * 0.5 + frontPartW * 0.5, houseH * 0.5, cz - d * 0.5, frontPartW, houseH, wallT, true, fHolesR);
  // Front Header (Above Door)
  const headerHoles = [];
  if (houseH >= 4.9) headerHoles.push({ c: 0, y: 3.95, w: 1.5, h: 1.25 });
  addWallWithHoles(wallGeos, cx, houseH - doorHeaderH * 0.5, cz - d * 0.5, doorW, doorHeaderH, wallT, true, headerHoles);

  const mergedWallsMesh = new THREE.Mesh(mergeBufferGeometries(wallGeos), wallMat);
  mergedWallsMesh.castShadow = true;
  mergedWallsMesh.receiveShadow = true;

  // Hinged front door on pivot group (starts closed, swings open and closed when entering/exiting the house!)
  const doorLeafW = doorW - 0.06;
  const doorLeafH = 2.38;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(cx - doorW * 0.5 + 0.03, 0.16, cz - d * 0.5);
  doorPivot.rotation.y = 0;
  doorPivot.userData.isAnimatedDoor = true;

  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW, doorLeafH, 0.08), doorMat);
  doorPanel.position.set(doorLeafW * 0.5, doorLeafH * 0.5, 0);
  doorPanel.userData.isAnimatedDoor = true;

  // Decorative recessed upper & lower door panels + brass doorknobs on both sides
  const upperInset = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW * 0.68, 0.82, 0.095), sharedWhiteTrimMat);
  upperInset.position.set(doorLeafW * 0.5, doorLeafH * 0.68, 0);
  upperInset.userData.isAnimatedDoor = true;
  const lowerInset = new THREE.Mesh(new THREE.BoxGeometry(doorLeafW * 0.68, 0.72, 0.095), sharedWhiteTrimMat);
  lowerInset.position.set(doorLeafW * 0.5, doorLeafH * 0.26, 0);
  lowerInset.userData.isAnimatedDoor = true;

  const knobOut = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), sharedBrassMat);
  knobOut.position.set(doorLeafW - 0.16, doorLeafH * 0.46, -0.065);
  knobOut.userData.isAnimatedDoor = true;
  const knobIn = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), sharedBrassMat);
  knobIn.position.set(doorLeafW - 0.16, doorLeafH * 0.46, 0.065);
  knobIn.userData.isAnimatedDoor = true;

  doorPivot.add(doorPanel, upperInset, lowerInset, knobOut, knobIn);

  // Crisp exterior door frame jambs & lintel
  const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorLeafH + 0.08, wallT + 0.06), sharedWhiteTrimMat);
  jambL.position.set(cx - doorW * 0.5, 0.16 + doorLeafH * 0.5, cz - d * 0.5);
  const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorLeafH + 0.08, wallT + 0.06), sharedWhiteTrimMat);
  jambR.position.set(cx + doorW * 0.5, 0.16 + doorLeafH * 0.5, cz - d * 0.5);
  const lintelTrim = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.2, 0.12, wallT + 0.08), sharedWhiteTrimMat);
  lintelTrim.position.set(cx, 0.16 + doorLeafH + 0.04, cz - d * 0.5);

  group.add(mergedWallsMesh, jambL, jambR, lintelTrim, doorPivot);

  addCol(cx - w * 0.5, cx + w * 0.5, cz + d * 0.5 - wallT, cz + d * 0.5 + wallT, houseH + 2.5, 'Rear');
  addCol(cx - w * 0.5 - wallT, cx - w * 0.5 + wallT, cz - d * 0.5, cz + d * 0.5, houseH + 2.5, 'West');
  addCol(cx + w * 0.5 - wallT, cx + w * 0.5 + wallT, cz - d * 0.5, cz + d * 0.5, houseH + 2.5, 'East');
  addCol(cx - w * 0.5, cx - doorW * 0.5, cz - d * 0.5 - wallT, cz - d * 0.5 + wallT, houseH + 2.5, 'Front L');
  addCol(cx + doorW * 0.5, cx + w * 0.5, cz - d * 0.5 - wallT, cz - d * 0.5 + wallT, houseH + 2.5, 'Front R');

  // 4. Detailed Architectural Windows with Dual-Sided Sills, Perimeter Casing, Mullions & Exterior Shutters
  // (100% authentic crystal-clear see-through windows visible from both inside and outside, exactly like skyscraper glass!)
  const wCount = winSpecs.length;
  const instTrim = new THREE.InstancedMesh(unitBoxGeo, sharedWhiteTrimMat, wCount * 5);
  const instGlass = new THREE.InstancedMesh(unitBoxGeo, sharedWindowGlassMat, wCount);
  instGlass.renderOrder = 1;
  instGlass.castShadow = false;
  instGlass.receiveShadow = false;
  const instMullion = new THREE.InstancedMesh(unitBoxGeo, sharedDarkFrameMat, wCount * 2);
  const instShutters = new THREE.InstancedMesh(unitBoxGeo, shutterMat, wCount * 2);
  const winDummy = new THREE.Object3D();
  const childDummy = new THREE.Object3D();
  winDummy.add(childDummy);

  winSpecs.forEach((ws, idx) => {
    // Window unit positioned centered in the wall opening cutout
    winDummy.position.set(ws.wx, ws.wy, ws.wz);
    winDummy.rotation.set(0, ws.rotY, 0);
    winDummy.scale.set(1, 1, 1);
    winDummy.updateMatrixWorld();

    const setPart = (inst: THREE.InstancedMesh, i: number, lx: number, ly: number, lz: number, sx: number, sy: number, sz: number) => {
      childDummy.position.set(lx, ly, lz);
      childDummy.scale.set(sx, sy, sz);
      childDummy.updateMatrixWorld();
      inst.setMatrixAt(i, childDummy.matrixWorld);
    };

    // Hollow Perimeter Casing & Sills (Center opening is 100% open and unobstructed!):
    // 1. Top Header Lintel Casing (above the glass opening)
    setPart(instTrim, idx * 5 + 0, 0, ws.winH * 0.5 + 0.035, 0, ws.winW + 0.14, 0.07, wallT + 0.04);
    // 2. Bottom Sill (extends indoors as interior ledge and outdoors as drip sill)
    setPart(instTrim, idx * 5 + 1, 0, -ws.winH * 0.5 - 0.04, 0, ws.winW + 0.28, 0.08, wallT + 0.14);
    // 3. Left Jamb Casing (flanking left of the glass opening)
    setPart(instTrim, idx * 5 + 2, -ws.winW * 0.5 - 0.035, 0, 0, 0.07, ws.winH, wallT + 0.04);
    // 4. Right Jamb Casing (flanking right of the glass opening)
    setPart(instTrim, idx * 5 + 3, ws.winW * 0.5 + 0.035, 0, 0, 0.07, ws.winH, wallT + 0.04);
    // 5. Interior Apron Molding (classic trim underneath the interior sill inside the room)
    setPart(instTrim, idx * 5 + 4, 0, -ws.winH * 0.5 - 0.10, -wallT * 0.5 - 0.015, ws.winW + 0.18, 0.05, 0.03);

    // 6. Crystal-Clear Transparent Window Glass (identical to skyscraper see-through glass, 100% see-through from both sides)
    setPart(instGlass, idx, 0, 0, 0, ws.winW, ws.winH, 0.015);

    // 7. Slim Divided-Lite Mullion Grid Bars (thin architectural divider bars leaving large clear glass view)
    setPart(instMullion, idx * 2, 0, 0, 0, 0.035, ws.winH, 0.038);
    setPart(instMullion, idx * 2 + 1, 0, 0, 0, ws.winW, 0.035, 0.038);

    // 8. Left & Right Exterior Shutters (resting flat on exterior siding flanking the window)
    setPart(instShutters, idx * 2, -ws.winW * 0.5 - 0.22, 0, wallT * 0.5 + 0.035, 0.36, ws.winH + 0.08, 0.05);
    setPart(instShutters, idx * 2 + 1, ws.winW * 0.5 + 0.22, 0, wallT * 0.5 + 0.035, 0.36, ws.winH + 0.08, 0.05);
  });
  instTrim.instanceMatrix.needsUpdate = true;
  instGlass.instanceMatrix.needsUpdate = true;
  instMullion.instanceMatrix.needsUpdate = true;
  instShutters.instanceMatrix.needsUpdate = true;
  group.add(instTrim, instGlass, instMullion, instShutters);

  // 5. Front Porch Deck, Columns, Overhang Awning, Front Walkway, Front Driveway & Lawn Fences
  const porchW = Math.min(w - 1.2, 7.6);
  const porchD = 2.6;
  const frontWallZ = cz - d * 0.5;
  const porchFrontZ = frontWallZ - porchD;
  const frontPlotEdgeZ = frontWallZ - 6.7;

  const porchDeck = new THREE.Mesh(new THREE.BoxGeometry(porchW, 0.24, porchD), accentMat);
  porchDeck.position.set(cx, 0.12, frontWallZ - porchD * 0.5);
  group.add(porchDeck);

  // Two stone steps leading from front walkway up onto front porch - Merged into single mesh!
  const step1Geo = new THREE.BoxGeometry(2.2, 0.16, 0.42);
  step1Geo.translate(cx, 0.08, porchFrontZ - 0.21);
  const step2Geo = new THREE.BoxGeometry(2.2, 0.08, 0.42);
  step2Geo.translate(cx, 0.04, porchFrontZ - 0.62);
  const stepsMesh = new THREE.Mesh(mergeBufferGeometries([step1Geo, step2Geo]), sharedStoneMat);
  group.add(stepsMesh);

  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.4, 0.22, porchD + 0.3), roofMat);
  porchRoof.position.set(cx, 2.85, frontWallZ - porchD * 0.5);
  group.add(porchRoof);
  roofMeshes.push(porchRoof);

  for (const colX of [cx - porchW * 0.44, cx + porchW * 0.44]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.7, 10), sharedWhiteTrimMat);
    col.position.set(colX, 1.45, porchFrontZ + 0.25);
    group.add(col);
  }

  // Keep driveway reference coordinates for fence gap & car spawn, without adding any flat green meshes so the world grass texture is identical everywhere
  const drivewayW = 4.2;
  const drivewayX = cx + w * 0.5 + 1.55;

  // 5B. Perimeter Property Fences Between the Lawns (Left Lawn Fence, Right Lawn Fence, Rear Fence & Front Picket Sections)
  const leftFenceX = cx - lawnW * 0.5 + 0.15;
  const rightFenceX = cx + lawnW * 0.5 - 0.15;
  const rearFenceZ = lawnCenterZ + lawnD * 0.5 - 0.15;
  const frontFenceZ = frontPlotEdgeZ + 0.15;
  const fenceH = 1.08;

  const fenceTransforms: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> = [];
  const addFenceBox = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    fenceTransforms.push({ x, y, z, sx, sy, sz });
  };

  // Helper to build a continuous post-and-rail picket fence segment along Z or X
  const buildFenceSpanZ = (fx: number, z1: number, z2: number) => {
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    const len = maxZ - minZ;
    if (len < 0.8) return;
    const midZ = (minZ + maxZ) * 0.5;
    // Top & bottom horizontal rails
    addFenceBox(fx, fenceH * 0.78, midZ, 0.07, 0.08, len);
    addFenceBox(fx, fenceH * 0.28, midZ, 0.07, 0.08, len);
    // Posts & vertical pickets along Z
    const postStep = 2.4;
    const numPosts = Math.max(2, Math.round(len / postStep) + 1);
    for (let i = 0; i < numPosts; i++) {
      const pz = minZ + (i / (numPosts - 1)) * len;
      addFenceBox(fx, fenceH * 0.54, pz, 0.14, fenceH * 1.08, 0.14);
    }
    const picketStep = 0.42;
    const numPickets = Math.floor(len / picketStep);
    for (let p = 1; p < numPickets; p++) {
      const pz = minZ + p * picketStep;
      addFenceBox(fx, fenceH * 0.5, pz, 0.04, fenceH * 0.96, 0.12);
    }
  };

  const buildFenceSpanX = (fz: number, x1: number, x2: number) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const len = maxX - minX;
    if (len < 0.8) return;
    const midX = (minX + maxX) * 0.5;
    // Top & bottom horizontal rails
    addFenceBox(midX, fenceH * 0.78, fz, len, 0.08, 0.07);
    addFenceBox(midX, fenceH * 0.28, fz, len, 0.08, 0.07);
    // Posts & vertical pickets along X
    const postStep = 2.4;
    const numPosts = Math.max(2, Math.round(len / postStep) + 1);
    for (let i = 0; i < numPosts; i++) {
      const px = minX + (i / (numPosts - 1)) * len;
      addFenceBox(px, fenceH * 0.54, fz, 0.14, fenceH * 1.08, 0.14);
    }
    const picketStep = 0.42;
    const numPickets = Math.floor(len / picketStep);
    for (let p = 1; p < numPickets; p++) {
      const px = minX + p * picketStep;
      addFenceBox(px, fenceH * 0.5, fz, 0.12, fenceH * 0.96, 0.04);
    }
  };

  // Left (West) Lawn Dividing Fence, Right (East) Lawn Dividing Fence, and Rear Backyard Fence
  buildFenceSpanZ(leftFenceX, frontFenceZ, rearFenceZ);
  buildFenceSpanZ(rightFenceX, frontFenceZ, rearFenceZ);
  buildFenceSpanX(rearFenceZ, leftFenceX, rightFenceX);

  // Front Lawn Picket Fence Sections (leaving open entrances for the Front Walkway and Front Driveway!)
  buildFenceSpanX(frontFenceZ, leftFenceX, cx - 1.15);
  buildFenceSpanX(frontFenceZ, cx + 1.15, drivewayX - drivewayW * 0.5 - 0.25);

  if (fenceTransforms.length > 0) {
    const instFence = new THREE.InstancedMesh(unitBoxGeo, sharedFenceMat, fenceTransforms.length);
    const fDummy = new THREE.Object3D();
    fenceTransforms.forEach((ft, idx) => {
      fDummy.position.set(ft.x, ft.y, ft.z);
      fDummy.rotation.set(0, 0, 0);
      fDummy.scale.set(ft.sx, ft.sy, ft.sz);
      fDummy.updateMatrix();
      instFence.setMatrixAt(idx, fDummy.matrix);
    });
    group.add(instFence);
  }

  // Register low colliders for side, rear & front lawn fences between properties
  addCol(leftFenceX - 0.15, leftFenceX + 0.15, frontFenceZ, rearFenceZ, fenceH, 'West Lawn Fence');
  addCol(rightFenceX - 0.15, rightFenceX + 0.15, frontFenceZ, rearFenceZ, fenceH, 'East Lawn Fence');
  addCol(leftFenceX, rightFenceX, rearFenceZ - 0.15, rearFenceZ + 0.15, fenceH, 'Rear Lawn Fence');
  addCol(leftFenceX, cx - 1.15, frontFenceZ - 0.15, frontFenceZ + 0.15, fenceH, 'Front West Lawn Fence');
  addCol(cx + 1.15, drivewayX - drivewayW * 0.5 - 0.25, frontFenceZ - 0.15, frontFenceZ + 0.15, fenceH, 'Front East Lawn Fence');

  // 6. Clean Pitched Pyramid Roof Fitted to Each House's Exact Footprint (Zero weird rectangles on top!)
  const peakH = tIdx === 6 ? 4.2 : tIdx % 2 === 0 ? 2.6 : 3.0;
  const roofPyr = new THREE.Mesh(sharedPyramidRoofGeo, roofMat);
  roofPyr.scale.set(w + 0.8, peakH, d + 0.8);
  roofPyr.position.set(cx, houseH + peakH * 0.5, cz);
  roofPyr.castShadow = true;
  roofPyr.receiveShadow = true;
  group.add(roofPyr);
  roofMeshes.push(roofPyr);

  const ensureShadows = (grp: THREE.Group) => {
    grp.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              m.shadowSide = THREE.DoubleSide;
            });
          } else {
            child.material.shadowSide = THREE.DoubleSide;
          }
        }
      }
    });
  };
  ensureShadows(group);
  ensureShadows(interiorStairsGroup);

  return {
    group,
    interiorStairsGroup,
    roofMeshes,
    colliders,
    w,
    d,
    h: houseH + 3.0,
    mailboxPos: {
      x: cx - 1.45,
      z: frontPlotEdgeZ + 0.65,
      homeX: cx,
      homeZ: cz - 2.2,
      carX: drivewayX,
      carZ: frontWallZ - 3.6,
    },
    stovePos: { x: counterX - 0.04, z: counterZ + 0.65 },
    doorData: {
      buildingId,
      kind: 'hinged',
      doorX: cx,
      doorZ: cz - d * 0.5,
      doorW,
      hingePivot: doorPivot,
      openProgress: 0,
      isHouse: true,
    },
  };
}

const sharedCityCementPlazaMat = new THREE.MeshStandardMaterial({
  color: 0x15803d, // Vibrant grass green like the rest of the map
  roughness: 0.92,
  metalness: 0.04,
});

const skyFacadeTexCache = new Map<string, THREE.CanvasTexture>();

// Untinted architectural clear glass tints for skyscraper window facades
const BUILDING_WINDOW_TINTS: {
  name: string;
  topRgba: string;
  midRgba: string;
  botRgba: string;
}[] = [
  {
    name: 'Clear Architectural Float Glass (Untinted)',
    topRgba: 'rgba(255, 255, 255, 0.18)',
    midRgba: 'rgba(241, 245, 249, 0.14)',
    botRgba: 'rgba(226, 232, 240, 0.16)',
  },
  {
    name: 'Neutral Clear Glazing (Untinted)',
    topRgba: 'rgba(248, 250, 252, 0.18)',
    midRgba: 'rgba(241, 245, 249, 0.14)',
    botRgba: 'rgba(226, 232, 240, 0.16)',
  },
  {
    name: 'Pure Low-Iron Architectural Glass (Untinted)',
    topRgba: 'rgba(255, 255, 255, 0.16)',
    midRgba: 'rgba(248, 250, 252, 0.12)',
    botRgba: 'rgba(241, 245, 249, 0.15)',
  },
  {
    name: 'Neutral Architectural Float (Untinted)',
    topRgba: 'rgba(241, 245, 249, 0.16)',
    midRgba: 'rgba(226, 232, 240, 0.13)',
    botRgba: 'rgba(203, 213, 225, 0.16)',
  },
];

function getSkyscraperWindowFacadeTexture(styleVariant: number, isDarkGrey: boolean): THREE.CanvasTexture {
  const tintIdx = Math.abs(styleVariant) % BUILDING_WINDOW_TINTS.length;
  const key = `sky_facade_seethrough_v6_${styleVariant}_${tintIdx}_${isDarkGrey ? 'dark' : 'light'}`;
  if (skyFacadeTexCache.has(key)) return skyFacadeTexCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  // Exclusively neutral architectural cladding & spandrels
  const claddingColors = isDarkGrey
    ? ['#334155', '#3f3f46', '#374151', '#475569']
    : ['#cbd5e1', '#e2e8f0', '#94a3b8', '#64748b', '#9ca3af', '#d4d4d8'];
  const spandrelColors = isDarkGrey
    ? ['#1e293b', '#27272a', '#1f2937', '#334155']
    : ['#94a3b8', '#cbd5e1', '#64748b', '#475569', '#71717a', '#9ca3af'];

  const cladHex = claddingColors[styleVariant % claddingColors.length];
  const spanHex = spandrelColors[styleVariant % spandrelColors.length];
  const tintSpec = BUILDING_WINDOW_TINTS[tintIdx];

  // Fill architectural frame background (opaque)
  ctx.fillStyle = cladHex;
  ctx.fillRect(0, 0, 512, 512);

  // Significantly smaller, realistic architectural window grid (14 floors / stories per texture tile, 16 bays)
  const cols = styleVariant % 2 === 0 ? 16 : 14;
  const rows = 14;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let row = 0; row < rows; row++) {
    const fy = row * cellH;

    // Horizontal architectural spandrel slab band between stories (opaque)
    ctx.fillStyle = spanHex;
    ctx.fillRect(0, fy, 512, 6);
    ctx.fillStyle = isDarkGrey ? '#64748b' : '#f1f5f9';
    ctx.fillRect(0, fy + 1, 512, 1);

    for (let col = 0; col < cols; col++) {
      const fx = col * cellW;
      const padX = 2;
      const padY = 7;
      const winW = cellW - padX * 2;
      const winH = cellH - padY - 2;
      const wx = fx + padX;
      const wy = fy + padY;

      // Thin recessed dark window frame border
      ctx.fillStyle = isDarkGrey ? '#0f172a' : '#334155';
      ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);

      // Deep dark interior backing
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(wx, wy, winW, winH);

      // Pure untinted architectural glass gradient (no blue, no green, no yellow)
      const glassGrad = ctx.createLinearGradient(wx, wy, wx + winW, wy + winH);
      glassGrad.addColorStop(0, tintSpec.topRgba);
      glassGrad.addColorStop(0.5, tintSpec.midRgba);
      glassGrad.addColorStop(1, tintSpec.botRgba);
      ctx.fillStyle = glassGrad;
      ctx.fillRect(wx, wy, winW, winH);

      // Subtle diagonal glass specular reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(wx + 1, wy + 1, Math.max(1, winW * 0.25), winH - 2);

      // Delicate center window mullion bar
      ctx.fillStyle = isDarkGrey ? '#475569' : '#94a3b8';
      ctx.fillRect(wx + Math.floor(winW * 0.5), wy, 1, winH);
    }
  }

  // Vertical structural pier / mullion lines
  ctx.fillStyle = isDarkGrey ? '#334155' : '#cbd5e1';
  for (let col = 0; col <= cols; col++) {
    ctx.fillRect(col * cellW - 1, 0, 2, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  skyFacadeTexCache.set(key, tex);
  return tex;
}

const skyWallMatCache = new Map<string, THREE.MeshStandardMaterial>();
const skySteelMatCache = new Map<number, THREE.MeshStandardMaterial>();
const skyDarkSteelMatCache = new Map<number, THREE.MeshStandardMaterial>();

// Realistic Architectural See-Through Glass for High-Rises & Skyscrapers (100% UNTINTED & Clear)
export const SKYSCRAPER_GLASS_TINTS = [
  { color: 0xffffff, opacity: 0.18, roughness: 0.03, metalness: 0.06 }, // Ultra-Clear Architectural Low-Iron Float Glass (Untinted)
  { color: 0xf8fafc, opacity: 0.18, roughness: 0.03, metalness: 0.06 }, // Clear Float Glass (Untinted)
  { color: 0xf1f5f9, opacity: 0.19, roughness: 0.04, metalness: 0.08 }, // Pure Neutral Architectural Glazing (Untinted)
  { color: 0xffffff, opacity: 0.17, roughness: 0.03, metalness: 0.05 }, // Crystal-Clear Neutral Glazing (Untinted)
];

const cachedSkyGlassMats = new Map<number, THREE.MeshStandardMaterial>();

export function getSkyscraperSeeThroughGlassMat(variantIndex: number): THREE.MeshStandardMaterial {
  const idx = ((variantIndex % SKYSCRAPER_GLASS_TINTS.length) + SKYSCRAPER_GLASS_TINTS.length) % SKYSCRAPER_GLASS_TINTS.length;
  if (cachedSkyGlassMats.has(idx)) return cachedSkyGlassMats.get(idx)!;
  const spec = SKYSCRAPER_GLASS_TINTS[idx];
  const mat = new THREE.MeshStandardMaterial({
    color: spec.color,
    transparent: true,
    opacity: spec.opacity,
    roughness: spec.roughness,
    metalness: spec.metalness,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  cachedSkyGlassMats.set(idx, mat);
  return mat;
}

/**
 * Builds a realistic, functioning 3D architectural curtain wall envelope with:
 * - Solid floor spandrel knee-walls (from floor slab up to window sill)
 * - Solid ceiling plenum header beams (at each floor level)
 * - 3D architectural vertical mullion fins & window sills with tangible depth
 * - REAL crystal-clear see-through transparent glass window panes
 * - Open ground-floor lobby doorway on South facade
 * - 3D roof parapet safety ledge
 * All merged into 1 solid frame mesh + 1 see-through glass mesh for optimal 60 FPS performance!
 */
export function buildCurtainWallFacade3D(options: {
  cx: number;
  cz: number;
  w: number;
  d: number;
  numFloors: number;
  floorH?: number;
  doorW?: number;
  wallT?: number;
  spandrelH?: number;
  headerH?: number;
  mullionW?: number;
  frameMat: THREE.Material;
  glassMat: THREE.Material;
  hasSouthDoor?: boolean;
}): { frameMesh: THREE.Mesh; glassMesh: THREE.Mesh } {
  const floorH = options.floorH ?? 4.5;
  const doorW = options.doorW ?? 4.8;
  const wallT = options.wallT ?? 0.36;
  const spandrelH = options.spandrelH ?? 1.15;
  const headerH = options.headerH ?? 0.62;
  const mullionW = options.mullionW ?? 0.12;
  const mullionD = wallT + 0.08;
  const { cx, cz, w, d, numFloors, hasSouthDoor = true } = options;
  const totalH = numFloors * floorH;
  const minX = cx - w * 0.5;
  const maxX = cx + w * 0.5;
  const minZ = cz - d * 0.5;
  const maxZ = cz + d * 0.5;
  const frontPartW = (w - doorW) * 0.5;
  const winH = floorH - spandrelH - headerH;

  // Realistic smaller window module width: ~0.9m to 1.0m bay grid for authentic architectural scale
  const targetBayW = 0.95;
  const numBaysX = Math.max(12, Math.round(w / targetBayW));
  const bayWX = w / numBaysX;
  const numBaysZ = Math.max(12, Math.round(d / targetBayW));
  const bayWZ = d / numBaysZ;

  // Intermediate horizontal transom dividing upper and lower window panes for authentic skyscraper scale
  const splitRatio = 0.68;
  const transomH = 0.06;
  const lowerH = winH * splitRatio - transomH * 0.5;
  const upperH = winH * (1.0 - splitRatio) - transomH * 0.5;

  const frameGeos: THREE.BufferGeometry[] = [];
  const glassGeos: THREE.BufferGeometry[] = [];

  // 1. Structural Spandrel Panels, Ceiling Headers, Vertical Mullions, Sills & See-Through Glass per Floor
  for (let f = 0; f < numFloors; f++) {
    const fy = f * floorH;
    const winY = fy + spandrelH + winH * 0.5;
    const lowerWinY = fy + spandrelH + lowerH * 0.5;
    const transomY = fy + spandrelH + lowerH + transomH * 0.5;
    const upperWinY = fy + spandrelH + lowerH + transomH + upperH * 0.5;

    // --- A. Horizontal Spandrels (Knee-Walls) and Ceiling Headers ---
    // North Wall:
    const spandrelN = new THREE.BoxGeometry(w, spandrelH, wallT);
    spandrelN.translate(cx, fy + spandrelH * 0.5, maxZ);
    frameGeos.push(spandrelN);

    const headerN = new THREE.BoxGeometry(w, headerH, wallT);
    headerN.translate(cx, fy + floorH - headerH * 0.5, maxZ);
    frameGeos.push(headerN);

    // West Wall:
    const spandrelW = new THREE.BoxGeometry(wallT, spandrelH, d);
    spandrelW.translate(minX, fy + spandrelH * 0.5, cz);
    frameGeos.push(spandrelW);

    const headerW = new THREE.BoxGeometry(wallT, headerH, d);
    headerW.translate(minX, fy + floorH - headerH * 0.5, cz);
    frameGeos.push(headerW);

    // East Wall:
    const spandrelE = new THREE.BoxGeometry(wallT, spandrelH, d);
    spandrelE.translate(maxX, fy + spandrelH * 0.5, cz);
    frameGeos.push(spandrelE);

    const headerE = new THREE.BoxGeometry(wallT, headerH, d);
    headerE.translate(maxX, fy + floorH - headerH * 0.5, cz);
    frameGeos.push(headerE);

    // South Wall:
    const headerS = new THREE.BoxGeometry(w, headerH, wallT);
    headerS.translate(cx, fy + floorH - headerH * 0.5, minZ);
    frameGeos.push(headerS);

    if (f === 0 && hasSouthDoor) {
      // Ground floor lobby entrance: leave doorW open
      const spandrelSL = new THREE.BoxGeometry(frontPartW, spandrelH, wallT);
      spandrelSL.translate(cx - doorW * 0.5 - frontPartW * 0.5, fy + spandrelH * 0.5, minZ);
      frameGeos.push(spandrelSL);

      const spandrelSR = new THREE.BoxGeometry(frontPartW, spandrelH, wallT);
      spandrelSR.translate(cx + doorW * 0.5 + frontPartW * 0.5, fy + spandrelH * 0.5, minZ);
      frameGeos.push(spandrelSR);
    } else {
      const spandrelS = new THREE.BoxGeometry(w, spandrelH, wallT);
      spandrelS.translate(cx, fy + spandrelH * 0.5, minZ);
      frameGeos.push(spandrelS);
    }

    // --- B. North Wall Window Bays: Vertical Mullions, Sills, Transoms & See-Through Glass ---
    for (let i = 0; i < numBaysX; i++) {
      const bx0 = minX + i * bayWX;
      const bx1 = minX + (i + 1) * bayWX;
      const bcX = (bx0 + bx1) * 0.5;
      const glassW = bayWX - mullionW;

      if (i < numBaysX - 1) {
        const mulN = new THREE.BoxGeometry(mullionW, winH, mullionD);
        mulN.translate(bx1, winY, maxZ);
        frameGeos.push(mulN);
      }

      const sillN = new THREE.BoxGeometry(glassW, 0.05, wallT + 0.05);
      sillN.translate(bcX, fy + spandrelH + 0.025, maxZ);
      const transomN = new THREE.BoxGeometry(glassW, transomH, wallT + 0.04);
      transomN.translate(bcX, transomY, maxZ);
      frameGeos.push(sillN, transomN);

      // Lower vision pane & Upper transom pane (smaller, realistic window units)
      const gLowerN = new THREE.BoxGeometry(glassW, lowerH, 0.04);
      gLowerN.translate(bcX, lowerWinY, maxZ);
      const gUpperN = new THREE.BoxGeometry(glassW, upperH, 0.04);
      gUpperN.translate(bcX, upperWinY, maxZ);
      glassGeos.push(gLowerN, gUpperN);
    }

    // --- C. South Wall Window Bays: Vertical Mullions, Sills, Transoms & See-Through Glass ---
    for (let i = 0; i < numBaysX; i++) {
      const bx0 = minX + i * bayWX;
      const bx1 = minX + (i + 1) * bayWX;
      const bcX = (bx0 + bx1) * 0.5;
      const glassW = bayWX - mullionW;
      const isDoorBay = f === 0 && hasSouthDoor && Math.abs(bcX - cx) < doorW * 0.5;
      const isDoorMullion = f === 0 && hasSouthDoor && Math.abs(bx1 - cx) < doorW * 0.5 - 0.05;

      if (!isDoorMullion && i < numBaysX - 1) {
        const mulS = new THREE.BoxGeometry(mullionW, winH, mullionD);
        mulS.translate(bx1, winY, minZ);
        frameGeos.push(mulS);
      }

      if (!isDoorBay) {
        const sillS = new THREE.BoxGeometry(glassW, 0.05, wallT + 0.05);
        sillS.translate(bcX, fy + spandrelH + 0.025, minZ);
        const transomS = new THREE.BoxGeometry(glassW, transomH, wallT + 0.04);
        transomS.translate(bcX, transomY, minZ);
        frameGeos.push(sillS, transomS);

        const gLowerS = new THREE.BoxGeometry(glassW, lowerH, 0.04);
        gLowerS.translate(bcX, lowerWinY, minZ);
        const gUpperS = new THREE.BoxGeometry(glassW, upperH, 0.04);
        gUpperS.translate(bcX, upperWinY, minZ);
        glassGeos.push(gLowerS, gUpperS);
      }
    }

    // --- D. West Wall Window Bays: Vertical Mullions, Sills, Transoms & See-Through Glass ---
    for (let j = 0; j < numBaysZ; j++) {
      const bz0 = minZ + j * bayWZ;
      const bz1 = minZ + (j + 1) * bayWZ;
      const bcZ = (bz0 + bz1) * 0.5;
      const glassD = bayWZ - mullionW;

      if (j < numBaysZ - 1) {
        const mulW = new THREE.BoxGeometry(mullionD, winH, mullionW);
        mulW.translate(minX, winY, bz1);
        frameGeos.push(mulW);
      }

      const sillW = new THREE.BoxGeometry(wallT + 0.05, 0.05, glassD);
      sillW.translate(minX, fy + spandrelH + 0.025, bcZ);
      const transomW = new THREE.BoxGeometry(wallT + 0.04, transomH, glassD);
      transomW.translate(minX, transomY, bcZ);
      frameGeos.push(sillW, transomW);

      const gLowerW = new THREE.BoxGeometry(0.04, lowerH, glassD);
      gLowerW.translate(minX, lowerWinY, bcZ);
      const gUpperW = new THREE.BoxGeometry(0.04, upperH, glassD);
      gUpperW.translate(minX, upperWinY, bcZ);
      glassGeos.push(gLowerW, gUpperW);
    }

    // --- E. East Wall Window Bays: Vertical Mullions, Sills, Transoms & See-Through Glass ---
    for (let j = 0; j < numBaysZ; j++) {
      const bz0 = minZ + j * bayWZ;
      const bz1 = minZ + (j + 1) * bayWZ;
      const bcZ = (bz0 + bz1) * 0.5;
      const glassD = bayWZ - mullionW;

      if (j < numBaysZ - 1) {
        const mulE = new THREE.BoxGeometry(mullionD, winH, mullionW);
        mulE.translate(maxX, winY, bz1);
        frameGeos.push(mulE);
      }

      const sillE = new THREE.BoxGeometry(wallT + 0.05, 0.05, glassD);
      sillE.translate(maxX, fy + spandrelH + 0.025, bcZ);
      const transomE = new THREE.BoxGeometry(wallT + 0.04, transomH, glassD);
      transomE.translate(maxX, transomY, bcZ);
      frameGeos.push(sillE, transomE);

      const gLowerE = new THREE.BoxGeometry(0.04, lowerH, glassD);
      gLowerE.translate(maxX, lowerWinY, bcZ);
      const gUpperE = new THREE.BoxGeometry(0.04, upperH, glassD);
      gUpperE.translate(maxX, upperWinY, bcZ);
      glassGeos.push(gLowerE, gUpperE);
    }
  }

  // 2. Continuous Corner Columns (Cap facade corner joints cleanly)
  const cornerSize = wallT + 0.04;
  for (const [colX, colZ] of [
    [minX, minZ],
    [maxX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
  ]) {
    const cornerCol = new THREE.BoxGeometry(cornerSize, totalH, cornerSize);
    cornerCol.translate(colX, totalH * 0.5, colZ);
    frameGeos.push(cornerCol);
  }

  // 3. Roof Parapet Ledges
  const parapetN = new THREE.BoxGeometry(w, 1.05, wallT);
  parapetN.translate(cx, totalH + 0.525, maxZ);
  frameGeos.push(parapetN);

  const parapetS = new THREE.BoxGeometry(w, 1.05, wallT);
  parapetS.translate(cx, totalH + 0.525, minZ);
  frameGeos.push(parapetS);

  const parapetW = new THREE.BoxGeometry(wallT, 1.05, d);
  parapetW.translate(minX, totalH + 0.525, cz);
  frameGeos.push(parapetW);

  const parapetE = new THREE.BoxGeometry(wallT, 1.05, d);
  parapetE.translate(maxX, totalH + 0.525, cz);
  frameGeos.push(parapetE);

  const mergedFrameGeo = mergeBufferGeometries(frameGeos);
  const mergedGlassGeo = mergeBufferGeometries(glassGeos);

  const frameMesh = new THREE.Mesh(mergedFrameGeo, options.frameMat);
  frameMesh.castShadow = true;
  frameMesh.receiveShadow = true;
  if (frameMesh.material instanceof THREE.Material) {
    frameMesh.material.shadowSide = THREE.DoubleSide;
  }

  const glassMesh = new THREE.Mesh(mergedGlassGeo, options.glassMat);
  glassMesh.castShadow = true;
  glassMesh.receiveShadow = true;
  if (glassMesh.material instanceof THREE.Material) {
    glassMesh.material.shadowSide = THREE.DoubleSide;
  }

  return { frameMesh, glassMesh };
}

export function buildWalkableSkyscraperWithStairs(options: {
  buildingId: string;
  name: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  numFloors: number;
  towerColorHex: number;
  isLaLandmarkTower?: boolean;
  landmarkType?: FamousLandmarkType;
  styleIndex?: number;
}): {
  group: THREE.Group;
  interiorStairsGroup: THREE.Group;
  colliders: BuiltCollider[];
  skyscraperData: WalkableSkyscraperData;
  mailboxPos: { x: number; z: number; homeX: number; homeZ: number; carX?: number; carZ?: number };
  doorData: AnimatedBuildingDoor;
} {
  const { buildingId, name, cx, cz, w, d, numFloors, isLaLandmarkTower, landmarkType, styleIndex = 0 } = options;
  const effectiveLandmark: FamousLandmarkType | undefined =
    landmarkType || (isLaLandmarkTower ? 'wilshire_grand' : undefined);
  const floorH = 4.5;
  const totalH = numFloors * floorH;
  const wallT = 0.45;
  const doorW = 4.8;
  const frontPartW = (w - doorW) * 0.5;

  const group = new THREE.Group();
  const interiorStairsGroup = new THREE.Group();
  group.add(interiorStairsGroup);
  const colliders: BuiltCollider[] = [];

  // 8 distinct skyscraper architectural styles + 10 see-through window tints!
  const sStyle = Math.abs(styleIndex) % 8;
  const isDarkGrey =
    effectiveLandmark === 'willis_tower' || (!effectiveLandmark && (sStyle === 4 || sStyle === 6));

  const frameColors = [
    0xcbd5e1, // 0 Brushed Silver-Grey
    0xd6d3d1, // 1 Warm Limestone Grey
    0xe2e8f0, // 2 Pearl Light Grey
    0x94a3b8, // 3 Architectural Pewter Grey
    0x475569, // 4 Dark Slate Grey
    0xcbd5e1, // 5 Light Aluminum Fin Grey
    0x52525b, // 6 Dark Zinc Grey
    0xd4d4d8, // 7 Platinum Grey
  ];
  const accentFrameColors = [
    0x94a3b8,
    0xa8a29e,
    0xcbd5e1,
    0x64748b,
    0x334155,
    0x94a3b8,
    0x3f3f46,
    0xa1a1aa,
  ];

  const primaryGreyHex =
    effectiveLandmark === 'willis_tower'
      ? 0x334155
      : effectiveLandmark === 'one_wtc' || effectiveLandmark === 'salesforce'
      ? 0xe2e8f0
      : effectiveLandmark === 'ping_an'
      ? 0xcbd5e1
      : isLaLandmarkTower
      ? 0xcbd5e1
      : frameColors[sStyle];
  const secondaryGreyHex =
    effectiveLandmark === 'willis_tower'
      ? 0x1e293b
      : effectiveLandmark
      ? 0x64748b
      : accentFrameColors[sStyle];

  let steelMat = skySteelMatCache.get(primaryGreyHex);
  if (!steelMat) {
    steelMat = new THREE.MeshStandardMaterial({
      color: primaryGreyHex,
      metalness: 0.45,
      roughness: 0.42,
    });
    skySteelMatCache.set(primaryGreyHex, steelMat);
  }
  let darkSteelMat = skyDarkSteelMatCache.get(secondaryGreyHex);
  if (!darkSteelMat) {
    darkSteelMat = new THREE.MeshStandardMaterial({
      color: secondaryGreyHex,
      metalness: 0.4,
      roughness: 0.48,
    });
    skyDarkSteelMatCache.set(secondaryGreyHex, darkSteelMat);
  }
  const floorSlabMat = sharedStoneMat;
  const stairStepMat = sharedStoneMat;
  const railMat = sharedWhiteTrimMat;

  const minX = cx - w * 0.5;
  const maxX = cx + w * 0.5;
  const minZ = cz - d * 0.5;
  const maxZ = cz + d * 0.5;

  // Solid Exterior Perimeter Colliders for Entire Tower Height (Ground lobby doorway open on South wall, upper window wall solid!)
  const addCol = (
    cMinX: number,
    cMaxX: number,
    cMinZ: number,
    cMaxZ: number,
    cMaxY: number,
    suffix: string,
    cMinY?: number,
    isFurniture: boolean = false
  ) => {
    colliders.push({
      minX: Math.min(cMinX, cMaxX),
      maxX: Math.max(cMinX, cMaxX),
      minZ: Math.min(cMinZ, cMaxZ),
      maxZ: Math.max(cMinZ, cMaxZ),
      minY: cMinY,
      maxY: cMaxY,
      name: `${name} ${suffix}`,
      isBuilding: true,
      isFurniture,
      buildingId,
    });
  };

  // Cap exterior wall colliders just below the roof deck (totalH - 0.1) so players on top of a skyscraper can jump off freely!
  const colliderTopY = totalH - 0.1;
  addCol(minX - wallT, maxX + wallT, maxZ - wallT, maxZ + wallT, colliderTopY, 'North Wall');
  addCol(minX - wallT, minX + wallT, minZ - wallT, maxZ + wallT, colliderTopY, 'West Wall');
  addCol(maxX - wallT, maxX + wallT, minZ - wallT, maxZ + wallT, colliderTopY, 'East Wall');
  addCol(minX - wallT, cx - doorW * 0.5, minZ - wallT, minZ + wallT, colliderTopY, 'South Left Wall');
  addCol(cx + doorW * 0.5, maxX + wallT, minZ - wallT, minZ + wallT, colliderTopY, 'South Right Wall');
  addCol(cx - doorW * 0.5, cx + doorW * 0.5, minZ - wallT, minZ + wallT, colliderTopY, 'South Upper Window Wall', floorH - 0.5);

  // Real Functioning 3D Architectural Curtain Wall with See-Through Glass Windows!
  const skyGlassMat = getSkyscraperSeeThroughGlassMat(styleIndex);
  const { frameMesh: curtainFrameMesh, glassMesh: curtainGlassMesh } = buildCurtainWallFacade3D({
    cx,
    cz,
    w,
    d,
    numFloors,
    floorH,
    doorW,
    wallT,
    frameMat: steelMat,
    glassMat: skyGlassMat,
    hasSouthDoor: true,
  });
  group.add(curtainFrameMesh, curtainGlassMesh);

  // Corner & Mid-Face Structural Grey Columns (Merged into single geometry to cut 18 draw calls to 1!)
  const colThickness =
    effectiveLandmark === 'ping_an'
      ? 1.55
      : sStyle === 1 || sStyle === 2
      ? 1.25
      : sStyle === 5
      ? 0.55
      : 0.9;
  const colPositions: [number, number][] = [
    [minX, minZ],
    [maxX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
    [cx - w * 0.25, minZ],
    [cx + w * 0.25, minZ],
    [cx - w * 0.25, maxZ],
    [cx + w * 0.25, maxZ],
    [minX, cz],
    [maxX, cz],
  ];
  if (sStyle === 1 || sStyle === 5 || effectiveLandmark === 'willis_tower' || effectiveLandmark === 'empire_state') {
    colPositions.push(
      [cx - w * 0.38, minZ],
      [cx + w * 0.38, minZ],
      [cx - w * 0.38, maxZ],
      [cx + w * 0.38, maxZ],
      [minX, cz - d * 0.28],
      [minX, cz + d * 0.28],
      [maxX, cz - d * 0.28],
      [maxX, cz + d * 0.28]
    );
  }
  const pillarGeos: THREE.BufferGeometry[] = [];
  for (const [colX, colZ] of colPositions) {
    const pGeo = new THREE.BoxGeometry(colThickness, totalH + 0.6, colThickness);
    pGeo.translate(colX, totalH * 0.5, colZ);
    pillarGeos.push(pGeo);
  }
  const pillarsMesh = new THREE.Mesh(mergeBufferGeometries(pillarGeos), steelMat);
  group.add(pillarsMesh);

  // Grand Ground-Floor Portico Canopy above South Lobby Entrance + Automatic Sliding Glass Doors
  const lobbyCanopy = new THREE.Mesh(new THREE.BoxGeometry(doorW + 4.4, 0.45, 3.2), darkSteelMat);
  lobbyCanopy.position.set(cx, floorH + 0.1, minZ - 1.4);
  const lobbySupportL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, floorH, 12), steelMat);
  lobbySupportL.position.set(cx - doorW * 0.5 - 1.6, floorH * 0.5, minZ - 2.6);
  const lobbySupportR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, floorH, 12), steelMat);
  lobbySupportR.position.set(cx + doorW * 0.5 + 1.6, floorH * 0.5, minZ - 2.6);

  const skyDoorLeafW = doorW * 0.5 + 0.04;
  const skyDoorLeafH = floorH - 0.35;
  const skyTransomBar = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.4, 0.35, wallT + 0.12), darkSteelMat);
  skyTransomBar.position.set(cx, floorH - 0.18, minZ);

  const buildAutoSlidingLeaf = (closedX: number, handleSide: 1 | -1) => {
    const leafGrp = new THREE.Group();
    leafGrp.position.set(closedX, 0.16, minZ);
    leafGrp.userData.isAnimatedDoor = true;
    const glassPane = new THREE.Mesh(
      new THREE.BoxGeometry(skyDoorLeafW - 0.12, skyDoorLeafH - 0.16, 0.06),
      sharedWindowGlassMat
    );
    glassPane.position.set(0, skyDoorLeafH * 0.5, 0);
    glassPane.userData.isAnimatedDoor = true;
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(skyDoorLeafW, 0.1, 0.09), steelMat);
    topRail.position.set(0, skyDoorLeafH - 0.05, 0);
    topRail.userData.isAnimatedDoor = true;
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(skyDoorLeafW, 0.12, 0.09), steelMat);
    botRail.position.set(0, 0.06, 0);
    botRail.userData.isAnimatedDoor = true;
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.75, 8), furnChromeMat);
    handleBar.position.set(handleSide * (skyDoorLeafW * 0.38), skyDoorLeafH * 0.45, 0);
    handleBar.userData.isAnimatedDoor = true;
    leafGrp.add(glassPane, topRail, botRail, handleBar);
    return leafGrp;
  };
  const skySlideLeft = buildAutoSlidingLeaf(cx - doorW * 0.25, 1);
  const skySlideRight = buildAutoSlidingLeaf(cx + doorW * 0.25, -1);

  group.add(lobbyCanopy, lobbySupportL, lobbySupportR, skyTransomBar, skySlideLeft, skySlideRight);

  // Stairwell shaft occupies East interior zone:
  const stairMinX = maxX - 5.6;
  const stairMidX = maxX - 3.2;
  const stairMaxX = maxX - 0.8;
  const stairStartZ = cz - 3.6;
  const stairEndZ = cz + 2.4; // 6.0m run per half-flight

  // Ground Lobby Floor Slab + High-Detail Executive Lobby Reception Desk, Dual Workstations, Waiting Lounge & Potted Trees
  const lobbySlab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), floorSlabMat);
  lobbySlab.position.set(cx, 0.08, cz);
  lobbySlab.receiveShadow = true;
  group.add(lobbySlab);

  const furnBatch = new MultiMaterialFurnitureBatcher();

  // --- 1. GRAND EXECUTIVE SKYSCRAPER LOBBY FURNITURE (Ground Floor fy = 0.16) ---
  const lobY = 0.16;
  const recX = cx - 2.5;
  const recZ = cz + d * 0.22;

  // Stepped Granite Plinth + Warm Walnut Fluted Concierge Desk + Raised Stone Transaction Countertop
  furnBatch.addBox(furnGraniteMat, recX, lobY + 0.07, recZ, 4.92, 0.14, 1.22);
  furnBatch.addBox(furnWoodWarmMat, recX, lobY + 0.52, recZ, 4.76, 0.78, 1.06);
  // Architectural Brass Fluting Strips along front facade of reception desk
  for (const bOff of [-1.8, -0.9, 0, 0.9, 1.8]) {
    furnBatch.addBox(sharedBrassMat, recX + bOff, lobY + 0.52, recZ - 0.54, 0.08, 0.76, 0.03);
  }
  // Overhanging Granite Transaction Top + Inner Lower Reception Desk Worktop
  furnBatch.addBox(furnGraniteMat, recX, lobY + 0.98, recZ - 0.28, 4.96, 0.12, 0.56);
  furnBatch.addBox(furnOfficeDeskMat, recX, lobY + 0.76, recZ + 0.18, 4.56, 0.06, 0.68);
  // Side Return Wings
  furnBatch.addBox(furnGraniteMat, recX - 2.38, lobY + 0.54, recZ + 0.1, 0.2, 0.92, 1.24);
  furnBatch.addBox(furnGraniteMat, recX + 2.38, lobY + 0.54, recZ + 0.1, 0.2, 0.92, 1.24);

  // Dual Receptionist Computer Terminals (Monitors with Stands & Glowing Screens, Keyboards, Desk Lamps & Check-in Tablet)
  for (const termX of [recX - 1.25, recX + 1.25]) {
    furnBatch.addBox(furnChromeMat, termX, lobY + 0.81, recZ + 0.06, 0.24, 0.03, 0.18);
    furnBatch.addBox(furnChromeMat, termX, lobY + 0.92, recZ + 0.04, 0.05, 0.22, 0.05);
    furnBatch.addBox(furnScreenMat, termX, lobY + 1.12, recZ + 0.05, 0.74, 0.44, 0.045);
    furnBatch.addBox(furnTvDisplayMat, termX, lobY + 1.12, recZ + 0.075, 0.68, 0.38, 0.015);
    furnBatch.addBox(furnScreenMat, termX, lobY + 0.8, recZ + 0.3, 0.42, 0.025, 0.15);
    furnBatch.addBox(furnScreenMat, termX + 0.3, lobY + 0.8, recZ + 0.3, 0.07, 0.02, 0.11);
    // Ergonomic Receptionist Swivel Chair behind each terminal
    addDetailedErgonomicChair(furnBatch, termX, lobY, recZ + 0.86, -1, furnOfficeChairMat);
  }
  // Warm Architectural Counter Lamps & Visitor Sign-In Kiosk on Transaction Ledge
  for (const lampX of [recX - 2.1, recX + 2.1]) {
    furnBatch.addCyl(sharedBrassMat, lampX, lobY + 1.16, recZ - 0.28, 0.14, 0.24, 0.14);
    furnBatch.addCyl(furnLampShadeMat, lampX, lobY + 1.34, recZ - 0.28, 0.26, 0.2, 0.26);
    furnBatch.addCyl(furnWarmLampMat, lampX, lobY + 1.28, recZ - 0.28, 0.12, 0.12, 0.12);
  }
  furnBatch.addBox(furnScreenMat, recX, lobY + 1.12, recZ - 0.26, 0.34, 0.24, 0.04, -0.35, 0, 0);
  furnBatch.addBox(furnTvDisplayMat, recX, lobY + 1.125, recZ - 0.268, 0.3, 0.2, 0.015, -0.35, 0, 0);

  // Luxury Lobby Waiting Lounge (Woven Area Rug, 2 Tufted 3-Seat Sofas, Glass/Walnut Coffee Table, Floor Lamps & Indoor Trees)
  const loungeX = minX + 2.6;
  furnBatch.addBox(furnWoodWarmMat, loungeX, lobY + 0.01, cz, 3.3, 0.016, 4.4);
  furnBatch.addBox(furnFabricNavyMat, loungeX, lobY + 0.018, cz, 3.05, 0.02, 4.15);
  addDetailedTuftedSofa(furnBatch, loungeX, lobY, cz - 1.5, 1, furnFabricSlateMat);
  addDetailedTuftedSofa(furnBatch, loungeX, lobY, cz + 1.5, -1, furnFabricSlateMat);
  addDetailedGlassCoffeeTable(furnBatch, loungeX, lobY, cz, 1.78, 0.88);
  // Standing Designer Floor Lamps next to Lobby Sofas
  for (const lzLamp of [cz - 1.5, cz + 1.5]) {
    furnBatch.addCyl(furnChromeMat, minX + 0.92, lobY + 0.03, lzLamp, 0.34, 0.05, 0.34);
    furnBatch.addCyl(furnChromeMat, minX + 0.92, lobY + 0.82, lzLamp, 0.04, 1.55, 0.04);
    furnBatch.addCyl(furnLampShadeMat, minX + 0.92, lobY + 1.62, lzLamp, 0.38, 0.34, 0.38);
  }
  // Indoor Potted Fiddle-Leaf Fig Trees flanking the Reception Desk & Front Entrance
  addDetailedIndoorPlant(furnBatch, recX - 3.0, lobY, recZ - 0.2, 1.15);
  addDetailedIndoorPlant(furnBatch, recX + 3.0, lobY, recZ - 0.2, 1.15);
  addDetailedIndoorPlant(furnBatch, minX + 1.1, lobY, minZ + 1.1, 1.1);

  // Solid Colliders for Skyscraper Lobby Columns, Reception Desk, Sofas & Upper Office Furniture
  addCol(cx - doorW * 0.5 - 1.85, cx - doorW * 0.5 - 1.35, minZ - 2.85, minZ - 2.35, floorH, 'Portico Column L');
  addCol(cx + doorW * 0.5 + 1.35, cx + doorW * 0.5 + 1.85, minZ - 2.85, minZ - 2.35, floorH, 'Portico Column R');
  addCol(cx - 4.9, cx - 0.1, cz + d * 0.22 - 0.6, cz + d * 0.22 + 0.6, 1.5, 'Lobby Reception Desk', undefined, true);
  addCol(minX + 1.2, minX + 4.0, cz - 2.0, cz - 1.0, 1.1, 'Lobby Sofa S', undefined, true);
  addCol(minX + 1.2, minX + 4.0, cz + 1.0, cz + 2.0, 1.1, 'Lobby Sofa N', undefined, true);
  addCol(minX + 1.7, minX + 3.5, cz - 0.45, cz + 0.45, 0.8, 'Lobby Table', undefined, true);

  const skyOfficeCenterX = minX + (w - 5.6) * 0.45;
  for (const [wx, wz] of [
    [skyOfficeCenterX - 3.2, cz - 3.2],
    [skyOfficeCenterX + 1.8, cz - 3.2],
    [skyOfficeCenterX - 3.2, cz + 0.6],
    [skyOfficeCenterX + 1.8, cz + 0.6],
  ]) {
    addCol(wx - 1.05, wx + 1.05, wz - 1.05, wz + 0.48, totalH, 'Office Workstation', floorH - 0.5, true);
  }
  addCol(skyOfficeCenterX - 4.8, skyOfficeCenterX + 3.4, cz - 1.4, cz - 1.2, totalH, 'Cubicle Partition', floorH - 0.5, true);
  addCol(skyOfficeCenterX - 2.7, skyOfficeCenterX + 1.5, maxZ - 3.35, maxZ - 1.85, totalH, 'Conference Table', floorH - 0.5, true);
  addCol(minX + 0.55, minX + 2.25, maxZ - 1.95, maxZ - 1.25, totalH, 'Filing Cabinets', floorH - 0.5, true);
  addCol(minX + 0.35, minX + 1.18, cz - 1.15, cz + 2.95, totalH, 'Office Bookcase & Printer', floorH - 0.5, true);

  // High-Performance InstancedMesh batches for all floors, spandrels, stair steps, stringers, handrails & DETAILED OFFICE FURNITURE!
  const stepsPerFlight = 10;
  const runLen = stairEndZ - stairStartZ; // 6.0m
  const halfH = floorH * 0.5; // 2.25m
  const slopeAngle = Math.atan2(halfH, runLen);
  const rampHyp = Math.hypot(runLen, halfH);
  const stepRun = runLen / stepsPerFlight;
  const stepRise = halfH / stepsPerFlight;
  const mainFloorW = w - 5.88; // Stops cleanly at stairMinX - 0.08 (leaves stairwell shaft 100% open!)
  const southLandingD = Math.max(0.4, (stairStartZ - 0.04) - (minZ + 0.2));
  const midLandingD = maxZ - 0.25 - stairEndZ;
  const eastStripW = Math.max(0.2, (maxX - 0.2) - (stairMaxX + 0.04));
  const cutoutLenZ = (maxZ - 0.2) - (stairStartZ - 0.04);

  const instSpandrels = new THREE.InstancedMesh(unitBoxGeo, steelMat, (numFloors + 1) * 4);
  const instSlabs = new THREE.InstancedMesh(unitBoxGeo, floorSlabMat, numFloors * 4 + 4);
  const instStairWalls = new THREE.InstancedMesh(unitBoxGeo, sharedInteriorWallMat, numFloors * 2 + 2);
  const instStringers = new THREE.InstancedMesh(unitBoxGeo, darkSteelMat, numFloors * 2);
  const instSteps = new THREE.InstancedMesh(unitBoxGeo, stairStepMat, numFloors * stepsPerFlight * 2);
  const instRails = new THREE.InstancedMesh(unitBoxGeo, railMat, numFloors * 2);

  const dummy = new THREE.Object3D();
  let spandrelIdx = 0;
  let slabIdx = 0;
  let stairWallIdx = 0;
  let stringerIdx = 0;
  let stepIdx = 0;
  let railIdx = 0;

  addCol(stairMinX - 0.12, stairMinX + 0.04, stairStartZ, maxZ - 0.2, totalH, 'Stairwell Wall', floorH - 0.5);

  for (let f = 0; f <= numFloors; f++) {
    const fy = f * floorH;

    // Exterior Grey Spandrel Band around the 4 outer perimeter walls ONLY (hollow inside so stairwell cutout is never blocked!)
    const isMechBelt = f > 0 && f % (sStyle % 2 === 0 ? 10 : 8) === 0;
    const bandOut = isMechBelt ? 0.32 : 0.16;
    const bandH = isMechBelt ? 0.78 : 0.32;
    const bandT = 0.52;
    // North & South exterior spandrel beams
    for (const zSide of [-1, 1]) {
      dummy.position.set(cx, fy, cz + zSide * (d * 0.5 + bandOut * 0.5 - 0.1));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(w + bandOut * 2, bandH, bandT);
      dummy.updateMatrix();
      instSpandrels.setMatrixAt(spandrelIdx++, dummy.matrix);
    }
    // West & East exterior spandrel beams
    for (const xSide of [-1, 1]) {
      dummy.position.set(cx + xSide * (w * 0.5 + bandOut * 0.5 - 0.1), fy, cz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(bandT, bandH, d + bandOut * 2);
      dummy.updateMatrix();
      instSpandrels.setMatrixAt(spandrelIdx++, dummy.matrix);
    }

    if (f > 0) {
      // 1. Main West Floor Slab (stops at stairMinX - 0.08 so the East stairwell cutout is completely open!)
      dummy.position.set(minX + 0.2 + mainFloorW * 0.5, fy, cz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(mainFloorW, 0.22, d - 0.4);
      dummy.updateMatrix();
      instSlabs.setMatrixAt(slabIdx++, dummy.matrix);

      // 2. South Landing Slab in front of stairwell (stops at stairStartZ - 0.04)
      dummy.position.set(maxX - 2.94, fy, minZ + 0.2 + southLandingD * 0.5);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(5.48, 0.22, southLandingD);
      dummy.updateMatrix();
      instSlabs.setMatrixAt(slabIdx++, dummy.matrix);

      // 3. Narrow East Wall Rim Strip (between stairMaxX and East curtain wall, framing the stairwell cutout cleanly)
      dummy.position.set(stairMaxX + 0.04 + eastStripW * 0.5, fy, (stairStartZ - 0.04 + maxZ - 0.2) * 0.5);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(eastStripW, 0.22, cutoutLenZ);
      dummy.updateMatrix();
      instSlabs.setMatrixAt(slabIdx++, dummy.matrix);

      if (f < numFloors) {
        // 4. Interior Stairwell Partition Wall (Encloses stairwell from main office floor)
        dummy.position.set(stairMinX - 0.04, fy + floorH * 0.5, (stairStartZ + maxZ - 0.2) * 0.5);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(0.18, floorH - 0.22, cutoutLenZ);
        dummy.updateMatrix();
        instStairWalls.setMatrixAt(stairWallIdx++, dummy.matrix);
      }

      // Populate High-Detail Office Furniture on Walkable Upper Floors
      if (f < numFloors) {
        const surfY = fy + 0.11;
        const officeCenterX = minX + mainFloorW * 0.45;
        const wsOffsets: [number, number][] = [
          [officeCenterX - 3.2, cz - 3.2],
          [officeCenterX + 1.8, cz - 3.2],
          [officeCenterX - 3.2, cz + 0.6],
          [officeCenterX + 1.8, cz + 0.6],
        ];
        for (const [wx, wz] of wsOffsets) {
          // 1. Executive Desk: Beveled Desktop Slab + Walnut Edge Trim + Left Tubular Steel Frame + Right 3-Drawer Pedestal + Modesty Panel
          furnBatch.addBox(furnWoodDarkMat, wx, surfY + 0.72, wz, 2.14, 0.04, 0.96);
          furnBatch.addBox(furnOfficeDeskMat, wx, surfY + 0.75, wz, 2.08, 0.04, 0.92);
          // Left steel leg frame
          furnBatch.addBox(furnChromeMat, wx - 0.96, surfY + 0.36, wz - 0.38, 0.06, 0.7, 0.06);
          furnBatch.addBox(furnChromeMat, wx - 0.96, surfY + 0.36, wz + 0.38, 0.06, 0.7, 0.06);
          furnBatch.addBox(furnChromeMat, wx - 0.96, surfY + 0.04, wz, 0.06, 0.05, 0.84);
          // Right 3-drawer filing pedestal with individual drawer faces & chrome pull handles
          furnBatch.addBox(furnGraniteMat, wx + 0.74, surfY + 0.35, wz, 0.52, 0.68, 0.86);
          for (const dRow of [0.16, 0.36, 0.56]) {
            furnBatch.addBox(furnOfficeDeskMat, wx + 0.74, surfY + dRow, wz - 0.44, 0.46, 0.16, 0.025);
            furnBatch.addBox(furnChromeMat, wx + 0.74, surfY + dRow + 0.02, wz - 0.46, 0.16, 0.02, 0.02);
          }
          // Front modesty privacy panel + under-desk PC workstation tower
          furnBatch.addBox(furnGraniteMat, wx - 0.22, surfY + 0.46, wz + 0.4, 1.38, 0.44, 0.035);
          furnBatch.addBox(furnScreenMat, wx - 0.76, surfY + 0.24, wz + 0.16, 0.22, 0.44, 0.42);
          furnBatch.addBox(furnTvDisplayMat, wx - 0.76, surfY + 0.36, wz - 0.055, 0.12, 0.03, 0.015);

          // 2. Dual Angled Widescreen Monitors on Articulated Stand + Mechanical Keyboard + Mouse + Coffee Mug + Desk Lamp
          furnBatch.addBox(furnChromeMat, wx - 0.1, surfY + 0.78, wz + 0.26, 0.28, 0.025, 0.18);
          furnBatch.addCyl(furnChromeMat, wx - 0.1, surfY + 0.92, wz + 0.28, 0.05, 0.26, 0.05);
          // Left Monitor (angled slightly right toward user)
          furnBatch.addBox(furnScreenMat, wx - 0.46, surfY + 1.06, wz + 0.22, 0.68, 0.42, 0.04, 0, 0.16, 0);
          furnBatch.addBox(furnTvDisplayMat, wx - 0.455, surfY + 1.06, wz + 0.20, 0.62, 0.36, 0.015, 0, 0.16, 0);
          // Right Monitor (angled slightly left toward user)
          furnBatch.addBox(furnScreenMat, wx + 0.26, surfY + 1.06, wz + 0.22, 0.68, 0.42, 0.04, 0, -0.16, 0);
          furnBatch.addBox(furnTvDisplayMat, wx + 0.255, surfY + 1.06, wz + 0.20, 0.62, 0.36, 0.015, 0, -0.16, 0);
          // Keyboard, Mousepad, Wireless Mouse, Document Stack, Coffee Mug & Task Lamp
          furnBatch.addBox(furnScreenMat, wx - 0.12, surfY + 0.785, wz - 0.14, 0.44, 0.022, 0.15);
          furnBatch.addBox(furnOfficePartitionMat, wx - 0.12, surfY + 0.798, wz - 0.14, 0.4, 0.01, 0.11);
          furnBatch.addBox(furnGraniteMat, wx + 0.24, surfY + 0.775, wz - 0.14, 0.22, 0.008, 0.2);
          furnBatch.addBox(furnScreenMat, wx + 0.24, surfY + 0.79, wz - 0.14, 0.065, 0.025, 0.1);
          furnBatch.addBox(furnMattressMat, wx - 0.76, surfY + 0.79, wz - 0.12, 0.26, 0.035, 0.32, 0, 0.08, 0);
          furnBatch.addCyl(furnPillowAccentMat, wx + 0.52, surfY + 0.82, wz - 0.18, 0.085, 0.1, 0.085);
          furnBatch.addCyl(furnChromeMat, wx + 0.82, surfY + 0.79, wz + 0.24, 0.15, 0.03, 0.15);
          furnBatch.addBox(furnChromeMat, wx + 0.82, surfY + 0.96, wz + 0.24, 0.03, 0.32, 0.03, 0.2, 0, 0);
          furnBatch.addBox(furnWarmLampMat, wx + 0.76, surfY + 1.1, wz + 0.16, 0.16, 0.035, 0.08);

          // 3. Detailed Ergonomic Swivel Office Chair
          addDetailedErgonomicChair(furnBatch, wx - 0.1, surfY, wz - 0.72, 1, furnOfficeChairMat);
        }

        // 4. Detailed Cubicle Privacy Partition System with Acoustic Panels, Aluminum Trim & Frosted Glass Clerestory
        const partX = officeCenterX - 0.7;
        const partZ = cz - 1.3;
        furnBatch.addBox(furnOfficePartitionMat, partX, surfY + 0.46, partZ, 8.2, 0.88, 0.12);
        furnBatch.addBox(furnChromeMat, partX, surfY + 0.91, partZ, 8.24, 0.04, 0.14);
        furnBatch.addBox(sharedWindowGlassMat, partX, surfY + 1.1, partZ, 8.12, 0.34, 0.05);
        furnBatch.addBox(furnChromeMat, partX, surfY + 1.28, partZ, 8.24, 0.04, 0.14);
        // Cross-divider wing & structural end posts
        furnBatch.addBox(furnOfficePartitionMat, partX, surfY + 0.46, partZ, 0.12, 0.88, 1.55);
        furnBatch.addBox(sharedWindowGlassMat, partX, surfY + 1.1, partZ, 0.05, 0.34, 1.5);
        for (const postOffX of [-4.1, 0, 4.1]) {
          furnBatch.addBox(furnGraniteMat, partX + postOffX, surfY + 0.66, partZ, 0.15, 1.3, 0.15);
        }

        // 5. Executive Boardroom Conference Suite on North Side of Floor
        const confX = officeCenterX - 0.6;
        const confZ = maxZ - 2.6;
        // Boardroom Area Rug
        furnBatch.addBox(furnFabricSlateMat, confX, surfY + 0.012, confZ, 4.6, 0.018, 2.2);
        // Boat-Shaped Walnut Conference Table with Granite Tech Power Trough & Twin Pedestal Columns
        furnBatch.addBox(furnWoodDarkMat, confX, surfY + 0.74, confZ, 4.2, 0.065, 1.44);
        furnBatch.addBox(furnWoodWarmMat, confX, surfY + 0.76, confZ, 4.08, 0.04, 1.32);
        furnBatch.addBox(furnGraniteMat, confX, surfY + 0.785, confZ, 2.4, 0.02, 0.24);
        for (const pedOffX of [-1.25, 1.25]) {
          furnBatch.addBox(furnChromeMat, confX + pedOffX, surfY + 0.03, confZ, 0.62, 0.04, 0.82);
          furnBatch.addBox(furnGraniteMat, confX + pedOffX, surfY + 0.38, confZ, 0.36, 0.68, 0.56);
        }
        // Conference Speakerphone + Open Laptops & Notepads on Boardroom Table
        furnBatch.addBox(furnScreenMat, confX, surfY + 0.81, confZ, 0.28, 0.04, 0.28, 0, Math.PI / 4, 0);
        for (const [lapX, lapZ, lapDir] of [
          [confX - 1.25, confZ - 0.42, 1],
          [confX + 1.25, confZ - 0.42, 1],
          [confX - 0.6, confZ + 0.42, -1],
        ] as [number, number, 1 | -1][]) {
          furnBatch.addBox(furnChromeMat, lapX, surfY + 0.79, lapZ, 0.34, 0.015, 0.24);
          furnBatch.addBox(furnScreenMat, lapX, surfY + 0.9, lapZ + lapDir * 0.11, 0.34, 0.22, 0.018, -lapDir * 0.2, 0, 0);
          furnBatch.addBox(furnTvDisplayMat, lapX, surfY + 0.9, lapZ + lapDir * 0.102, 0.3, 0.18, 0.01, -lapDir * 0.2, 0, 0);
        }
        // 6 Ergonomic Conference Chairs tucked neatly around the Conference Table (within collider bounds)
        for (const chOffX of [-1.3, 0, 1.3]) {
          addDetailedErgonomicChair(furnBatch, confX + chOffX, surfY, confZ - 0.78, 1, furnFabricNavyMat);
          addDetailedErgonomicChair(furnBatch, confX + chOffX, surfY, confZ + 0.78, -1, furnFabricNavyMat);
        }
        // Wall-Mounted 85-inch Presentation Display on North Wall behind Conference Table
        furnBatch.addBox(furnScreenMat, confX, surfY + 1.65, maxZ - 0.28, 2.35, 1.18, 0.06);
        furnBatch.addBox(furnTvDisplayMat, confX, surfY + 1.65, maxZ - 0.315, 2.24, 1.08, 0.015);
        furnBatch.addBox(furnWoodDarkMat, confX, surfY + 0.92, maxZ - 0.32, 2.5, 0.08, 0.26);

        // 6. Detailed 3-Drawer Steel Filing Cabinets, Bookcase with Colorful Binders, Copier & Water Cooler along West Wall
        for (const cabX of [minX + 0.98, minX + 1.84]) {
          furnBatch.addBox(furnOfficePartitionMat, cabX, surfY + 0.68, maxZ - 1.6, 0.8, 1.34, 0.62);
          furnBatch.addBox(furnGraniteMat, cabX, surfY + 1.36, maxZ - 1.6, 0.84, 0.04, 0.65);
          for (const dY of [0.24, 0.68, 1.12]) {
            furnBatch.addBox(furnOfficeDeskMat, cabX, surfY + dY, maxZ - 1.28, 0.72, 0.38, 0.025);
            furnBatch.addBox(furnChromeMat, cabX, surfY + dY + 0.06, maxZ - 1.26, 0.2, 0.025, 0.025);
          }
        }
        // Tall Walnut Office Bookcase stocked with rows of Binders & Books (West wall at cz - 0.2)
        const bkX = minX + 0.68;
        const bkZ = cz - 0.2;
        furnBatch.addBox(furnWoodDarkMat, bkX, surfY + 0.96, bkZ, 0.48, 1.9, 1.75);
        for (const shY of [0.42, 0.88, 1.34, 1.78]) {
          furnBatch.addBox(furnWoodWarmMat, bkX + 0.04, surfY + shY, bkZ, 0.44, 0.04, 1.66);
          furnBatch.addBox(furnBlanketMat, bkX + 0.06, surfY + shY + 0.16, bkZ - 0.45, 0.28, 0.28, 0.42);
          furnBatch.addBox(furnPillowAccentMat, bkX + 0.06, surfY + shY + 0.15, bkZ + 0.05, 0.28, 0.26, 0.36);
          furnBatch.addBox(furnMattressMat, bkX + 0.06, surfY + shY + 0.16, bkZ + 0.48, 0.28, 0.28, 0.38);
        }
        // Multifunction Office Copier/Printer + Chilled Water Cooler & Corner Plant (West wall at cz + 1.5 to cz + 2.6)
        const prX = minX + 0.78;
        const prZ = cz + 1.55;
        furnBatch.addBox(furnMattressMat, prX, surfY + 0.46, prZ, 0.68, 0.9, 0.66);
        furnBatch.addBox(furnScreenMat, prX, surfY + 0.95, prZ, 0.66, 0.1, 0.62);
        furnBatch.addBox(furnOfficePartitionMat, prX + 0.35, surfY + 0.32, prZ, 0.02, 0.52, 0.54);
        furnBatch.addBox(furnTvDisplayMat, prX + 0.35, surfY + 0.82, prZ - 0.16, 0.04, 0.12, 0.18, 0, 0, -0.3);
        // Water Cooler Dispenser
        const wcX = minX + 0.72;
        const wcZ = cz + 2.45;
        furnBatch.addBox(furnMattressMat, wcX, surfY + 0.48, wcZ, 0.38, 0.94, 0.38);
        furnBatch.addBox(furnScreenMat, wcX + 0.19, surfY + 0.68, wcZ, 0.03, 0.22, 0.22);
        furnBatch.addCyl(furnBlanketMat, wcX, surfY + 1.16, wcZ, 0.28, 0.42, 0.28);
        // Corner Office Plant
        addDetailedIndoorPlant(furnBatch, minX + 0.9, surfY, minZ + 1.0, 0.95);
      }
    }

    // Build 3D Stepped Staircase from Floor f to Floor f+1 (with 10 individual steps per half-flight!)
    if (f < numFloors) {
      // Flight 1 Stringer Support (Climbs North)
      dummy.position.set((stairMinX + stairMidX) * 0.5, fy + halfH * 0.5 - 0.08, (stairStartZ + stairEndZ) * 0.5);
      dummy.rotation.set(-slopeAngle, 0, 0);
      dummy.scale.set(2.3, 0.16, rampHyp);
      dummy.updateMatrix();
      instStringers.setMatrixAt(stringerIdx++, dummy.matrix);

      // Flight 2 Stringer Support (Climbs South)
      dummy.position.set((stairMidX + stairMaxX) * 0.5, fy + halfH + halfH * 0.5 - 0.08, (stairStartZ + stairEndZ) * 0.5);
      dummy.rotation.set(slopeAngle, 0, 0);
      dummy.scale.set(2.3, 0.16, rampHyp);
      dummy.updateMatrix();
      instStringers.setMatrixAt(stringerIdx++, dummy.matrix);

      // Handrail 1 & Handrail 2
      dummy.position.set(stairMinX + 0.08, fy + halfH * 0.5 + 0.5, (stairStartZ + stairEndZ) * 0.5);
      dummy.rotation.set(-slopeAngle, 0, 0);
      dummy.scale.set(0.08, 0.9, rampHyp);
      dummy.updateMatrix();
      instRails.setMatrixAt(railIdx++, dummy.matrix);

      dummy.position.set(stairMidX, fy + halfH + halfH * 0.5 + 0.5, (stairStartZ + stairEndZ) * 0.5);
      dummy.rotation.set(slopeAngle, 0, 0);
      dummy.scale.set(0.08, 0.9, rampHyp);
      dummy.updateMatrix();
      instRails.setMatrixAt(railIdx++, dummy.matrix);

      // North Mid-Landing Platform at fy + halfH
      dummy.position.set((stairMinX + stairMaxX) * 0.5, fy + halfH - 0.1, stairEndZ + midLandingD * 0.5);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(4.8, 0.24, midLandingD);
      dummy.updateMatrix();
      instSlabs.setMatrixAt(slabIdx++, dummy.matrix);

      // 10 Individual 3D Steps for Flight 1 + 10 Individual 3D Steps for Flight 2
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(2.32, stepRise, stepRun + 0.06);
      for (let st = 0; st < stepsPerFlight; st++) {
        dummy.position.set(
          (stairMinX + stairMidX) * 0.5,
          fy + (st + 0.5) * stepRise,
          stairStartZ + (st + 0.5) * stepRun
        );
        dummy.updateMatrix();
        instSteps.setMatrixAt(stepIdx++, dummy.matrix);

        dummy.position.set(
          (stairMidX + stairMaxX) * 0.5,
          fy + halfH + (st + 0.5) * stepRise,
          stairEndZ - (st + 0.5) * stepRun
        );
        dummy.updateMatrix();
        instSteps.setMatrixAt(stepIdx++, dummy.matrix);
      }
    }
  }
  instSpandrels.count = spandrelIdx;
  instSlabs.count = slabIdx;
  instStairWalls.count = stairWallIdx;
  instStringers.count = stringerIdx;
  instSteps.count = stepIdx;
  instRails.count = railIdx;
  group.add(instSpandrels);
  interiorStairsGroup.add(instSlabs, instStairWalls, instStringers, instSteps, instRails);
  furnBatch.buildInto(interiorStairsGroup);

  // Position all rooftop crowns on the main roof deck West of the stairwell cutout (stairMinX = maxX - 5.6)
  // so the stairwell opening onto the roof is 100% unobstructed!
  const roofDeckW = Math.max(12, w - 6.2);
  const roofDeckCx = minX + roofDeckW * 0.5 + 0.2;

  if (effectiveLandmark === 'wilshire_grand') {
    // =========================================================================
    // ICONIC DOWNTOWN LA LANDMARK CROWN (Wilshire Grand Sail Crown + Helipad + Architectural Spire)
    // =========================================================================
    const crownGlassMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.45,
      roughness: 0.25,
    });

    for (let tier = 0; tier < 5; tier++) {
      const tierW = roofDeckW * (0.92 - tier * 0.12);
      const tierD = d * (0.86 - tier * 0.12);
      const tierH = 4.2;
      const tierY = totalH + tier * 3.8 + tierH * 0.5;
      const crownTier = new THREE.Mesh(new THREE.BoxGeometry(tierW, tierH, tierD), crownGlassMat);
      crownTier.position.set(roofDeckCx - tier * 0.4, tierY, cz);
      group.add(crownTier);

      const trimRing = new THREE.Mesh(new THREE.BoxGeometry(tierW + 0.4, 0.24, tierD + 0.4), steelMat);
      trimRing.position.set(roofDeckCx - tier * 0.4, tierY + tierH * 0.5, cz);
      group.add(trimRing);
    }

    const sailRib = new THREE.Mesh(new THREE.BoxGeometry(1.2, 24.0, d * 0.78), steelMat);
    sailRib.position.set(roofDeckCx - roofDeckW * 0.18, totalH + 12.0, cz);
    sailRib.rotation.z = -0.22;
    group.add(sailRib);

    const helipadPad = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.8, 0.6, 32), darkSteelMat);
    helipadPad.position.set(roofDeckCx - 0.5, totalH + 19.5, cz);
    const helipadRing = new THREE.Mesh(new THREE.RingGeometry(4.6, 5.2, 32), steelMat);
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.set(roofDeckCx - 0.5, totalH + 19.85, cz);
    group.add(helipadPad, helipadRing);

    const mainSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.85, 45, 16), steelMat);
    mainSpire.position.set(roofDeckCx - roofDeckW * 0.2, totalH + 34.0, cz + d * 0.2);
    group.add(mainSpire);
  } else if (effectiveLandmark === 'one_wtc') {
    // =========================================================================
    // ONE WORLD TRADE CENTER (NEW YORK) — Chamfered Antiprism Facets + Octagonal Parapet Ring + 408ft Broadcast Spire
    // =========================================================================
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const chamferBlade = new THREE.Mesh(new THREE.BoxGeometry(3.2, totalH, 0.85), steelMat);
      chamferBlade.position.set(cx + sx * (w * 0.48), totalH * 0.5, cz + sz * (d * 0.48));
      chamferBlade.rotation.y = sx * sz > 0 ? Math.PI / 4 : -Math.PI / 4;
      group.add(chamferBlade);
    }
    const octParapet = new THREE.Mesh(new THREE.CylinderGeometry(roofDeckW * 0.44, roofDeckW * 0.48, 5.5, 8), steelMat);
    octParapet.position.set(roofDeckCx, totalH + 2.75, cz);
    const commRing = new THREE.Mesh(new THREE.CylinderGeometry(roofDeckW * 0.34, roofDeckW * 0.38, 3.8, 16), darkSteelMat);
    commRing.position.set(roofDeckCx, totalH + 7.2, cz);
    const needleSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 1.35, 58.0, 16), steelMat);
    needleSpire.position.set(roofDeckCx, totalH + 36.5, cz);
    const radome1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.8, 16), darkSteelMat);
    radome1.position.set(roofDeckCx, totalH + 18.0, cz);
    const radome2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.7, 16), darkSteelMat);
    radome2.position.set(roofDeckCx, totalH + 30.0, cz);
    group.add(octParapet, commRing, needleSpire, radome1, radome2);
  } else if (effectiveLandmark === 'ping_an') {
    // =========================================================================
    // PING AN FINANCE CENTER (TALLEST BUILDING IN SHENZHEN) — 8 Exterior Megacolumns + Tapered Pyramid-Diagrid Crown & Spire
    // =========================================================================
    for (let t = 0; t < 6; t++) {
      const ratio = 0.94 - t * 0.13;
      const tierH = 4.6;
      const tierBox = new THREE.Mesh(
        new THREE.BoxGeometry(roofDeckW * ratio, tierH, d * ratio * 0.88),
        t % 2 === 0 ? steelMat : darkSteelMat
      );
      tierBox.position.set(roofDeckCx, totalH + t * 4.2 + tierH * 0.5, cz);
      group.add(tierBox);
    }
    const pyrCone = new THREE.Mesh(new THREE.ConeGeometry(roofDeckW * 0.28, 16.0, 4), steelMat);
    pyrCone.rotation.y = Math.PI / 4;
    pyrCone.position.set(roofDeckCx, totalH + 31.5, cz);
    const shenzhenSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.65, 28.0, 12), steelMat);
    shenzhenSpire.position.set(roofDeckCx, totalH + 47.0, cz);
    group.add(pyrCone, shenzhenSpire);
  } else if (effectiveLandmark === 'salesforce') {
    // =========================================================================
    // SALESFORCE TOWER (SAN FRANCISCO) — Rounded Obelisk Sunshade Louvers + Sculpted Perforated Metal Crown
    // =========================================================================
    for (let c = 0; c < 4; c++) {
      const crownTier = new THREE.Mesh(
        new THREE.CylinderGeometry(roofDeckW * (0.44 - c * 0.04), roofDeckW * (0.47 - c * 0.04), 4.8, 16),
        c % 2 === 0 ? steelMat : skyGlassMat
      );
      crownTier.position.set(roofDeckCx, totalH + c * 4.5 + 2.4, cz);
      group.add(crownTier);
    }
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 14.0, 1.4), steelMat);
      fin.position.set(
        roofDeckCx + Math.cos(ang) * (roofDeckW * 0.34),
        totalH + 16.0,
        cz + Math.sin(ang) * (roofDeckW * 0.34)
      );
      fin.rotation.y = -ang;
      group.add(fin);
    }
  } else if (effectiveLandmark === 'willis_tower') {
    // =========================================================================
    // WILLIS (SEARS) TOWER (CHICAGO) — Dark Bundled-Tube Step-Back Massing + Twin White Broadcast Antennas
    // =========================================================================
    const stepTier1 = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.86, 16.0, d * 0.72), darkSteelMat);
    stepTier1.position.set(roofDeckCx, totalH + 8.0, cz);
    const stepTier2 = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.56, 14.0, d * 0.68), darkSteelMat);
    stepTier2.position.set(roofDeckCx, totalH + 22.0, cz);
    const antMat = sharedWhiteTrimMat;
    const westAntBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 8.0, 12), antMat);
    westAntBase.position.set(roofDeckCx, totalH + 33.0, cz - d * 0.16);
    const westAntMast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.65, 38.0, 12), antMat);
    westAntMast.position.set(roofDeckCx, totalH + 54.0, cz - d * 0.16);
    const eastAntBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 8.0, 12), antMat);
    eastAntBase.position.set(roofDeckCx, totalH + 33.0, cz + d * 0.16);
    const eastAntMast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.65, 36.0, 12), antMat);
    eastAntMast.position.set(roofDeckCx, totalH + 53.0, cz + d * 0.16);
    group.add(stepTier1, stepTier2, westAntBase, westAntMast, eastAntBase, eastAntMast);
  } else if (effectiveLandmark === 'shanghai_tower') {
    // =========================================================================
    // SHANGHAI TOWER — Twisting Tiered Megatower with Sky-Lobby Rings & Slanted Concave Crown
    // =========================================================================
    for (let t = 0; t < 5; t++) {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(roofDeckW * (0.44 - t * 0.04), roofDeckW * (0.46 - t * 0.04), 5.2, 20),
        t % 2 === 0 ? skyGlassMat : steelMat
      );
      cyl.position.set(roofDeckCx, totalH + t * 4.8 + 2.6, cz);
      group.add(cyl);
    }
    const crownSlant = new THREE.Mesh(new THREE.CylinderGeometry(roofDeckW * 0.28, roofDeckW * 0.32, 9.0, 20), steelMat);
    crownSlant.position.set(roofDeckCx, totalH + 27.0, cz);
    crownSlant.rotation.z = 0.22;
    group.add(crownSlant);
  } else if (effectiveLandmark === 'empire_state') {
    // =========================================================================
    // EMPIRE STATE BUILDING (NEW YORK) — Art Deco Limestone-Grey Setbacks + Mooring Mast & Needle Spire
    // =========================================================================
    for (let t = 0; t < 4; t++) {
      const tw = roofDeckW * (0.9 - t * 0.16);
      const td = d * (0.82 - t * 0.15);
      const setback = new THREE.Mesh(new THREE.BoxGeometry(tw, 5.2, td), t % 2 === 0 ? steelMat : darkSteelMat);
      setback.position.set(roofDeckCx, totalH + t * 5.0 + 2.6, cz);
      group.add(setback);
    }
    const mooringMast = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 16.0, 16), steelMat);
    mooringMast.position.set(roofDeckCx, totalH + 27.0, cz);
    const empireSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.85, 34.0, 16), steelMat);
    empireSpire.position.set(roofDeckCx, totalH + 51.0, cz);
    group.add(mooringMast, empireSpire);
  } else {
    // =========================================================================
    // 8 DISTINCT ARCHITECTURAL ROOF CROWNS SO SKYSCRAPERS DO NOT LOOK THE SAME!
    // =========================================================================
    if (sStyle === 0) {
      // Twin Communication Masts + Setback Mechanical Penthouse
      const crownBox = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.84, 4.0, d * 0.72), darkSteelMat);
      crownBox.position.set(roofDeckCx, totalH + 2.0, cz);
      const mast1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 16, 10), steelMat);
      mast1.position.set(roofDeckCx, totalH + 12.0, cz - d * 0.18);
      const mast2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 13, 10), steelMat);
      mast2.position.set(roofDeckCx, totalH + 10.5, cz + d * 0.18);
      group.add(crownBox, mast1, mast2);
    } else if (sStyle === 1) {
      // Classical Limestone Perimeter Cornice & Rooftop Chillers (4 perimeter beams so stairwell cutout stays open!)
      for (const zSide of [-1, 1]) {
        const cBeamZ = new THREE.Mesh(new THREE.BoxGeometry(w + 1.6, 1.1, 1.2), steelMat);
        cBeamZ.position.set(cx, totalH + 0.55, cz + zSide * (d * 0.5 + 0.2));
        group.add(cBeamZ);
      }
      for (const xSide of [-1, 1]) {
        const cBeamX = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, d + 1.6), steelMat);
        cBeamX.position.set(cx + xSide * (w * 0.5 + 0.2), totalH + 0.55, cz);
        group.add(cBeamX);
      }
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.88, 2.6, d * 0.78), darkSteelMat);
      parapet.position.set(roofDeckCx, totalH + 1.3, cz);
      group.add(parapet);
    } else if (sStyle === 2) {
      // Art-Deco 3-Tier Ziggurat Setback Crown + Tall Central Spire
      for (let t = 0; t < 3; t++) {
        const tw = roofDeckW * (0.88 - t * 0.2);
        const td = d * (0.8 - t * 0.18);
        const tierMesh = new THREE.Mesh(new THREE.BoxGeometry(tw, 3.4, td), t % 2 === 0 ? steelMat : darkSteelMat);
        tierMesh.position.set(roofDeckCx, totalH + t * 3.4 + 1.7, cz);
        group.add(tierMesh);
      }
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.55, 22, 12), steelMat);
      spire.position.set(roofDeckCx, totalH + 21.0, cz);
      group.add(spire);
    } else if (sStyle === 3) {
      // Slanted Architectural Wedge Fin Crown
      const wedgeBase = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.86, 5.2, d * 0.76), darkSteelMat);
      wedgeBase.position.set(roofDeckCx, totalH + 2.6, cz);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.9, 6.5, 1.2), steelMat);
      fin.position.set(roofDeckCx, totalH + 5.8, cz - d * 0.28);
      fin.rotation.z = 0.18;
      group.add(wedgeBase, fin);
    } else if (sStyle === 4) {
      // Dark-Grey Slate Tower with Circular Rooftop Helipad Deck
      const mech = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.8, 3.2, d * 0.68), darkSteelMat);
      mech.position.set(roofDeckCx, totalH + 1.6, cz);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.5, 0.5, 28), steelMat);
      pad.position.set(roofDeckCx, totalH + 3.45, cz);
      group.add(mech, pad);
    } else if (sStyle === 5) {
      // Cantilevered Sky-Frame Crown with Open Louver Pergola
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.9, 0.8, d * 0.84), steelMat);
      frameTop.position.set(roofDeckCx, totalH + 5.2, cz);
      for (const [px, pz] of [
        [roofDeckCx - roofDeckW * 0.4, cz - d * 0.36],
        [roofDeckCx + roofDeckW * 0.4, cz - d * 0.36],
        [roofDeckCx - roofDeckW * 0.4, cz + d * 0.36],
        [roofDeckCx + roofDeckW * 0.4, cz + d * 0.36],
      ]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.2, 0.9), darkSteelMat);
        post.position.set(px, totalH + 2.6, pz);
        group.add(post);
      }
      group.add(frameTop);
    } else if (sStyle === 6) {
      // Dual Cylindrical HVAC Cooling Towers + Mechanical Penthouse
      const mech = new THREE.Mesh(new THREE.BoxGeometry(roofDeckW * 0.84, 3.5, d * 0.55), darkSteelMat);
      mech.position.set(roofDeckCx, totalH + 1.75, cz);
      const cyl1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4.2, 20), steelMat);
      cyl1.position.set(roofDeckCx, totalH + 2.1, cz - 2.5);
      const cyl2 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4.2, 20), steelMat);
      cyl2.position.set(roofDeckCx, totalH + 2.1, cz + 2.5);
      group.add(mech, cyl1, cyl2);
    } else {
      // Tapered 4-Sided Pyramid Crown + Spire
      const pyr = new THREE.Mesh(new THREE.ConeGeometry(Math.min(roofDeckW, d) * 0.48, 9.5, 4), steelMat);
      pyr.rotation.y = Math.PI / 4;
      pyr.position.set(roofDeckCx, totalH + 4.75, cz);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 12, 8), darkSteelMat);
      mast.position.set(roofDeckCx, totalH + 14.5, cz);
      group.add(pyr, mast);
    }
  }

  const ensureShadows = (grp: THREE.Group) => {
    grp.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              m.shadowSide = THREE.DoubleSide;
            });
          } else {
            child.material.shadowSide = THREE.DoubleSide;
          }
        }
      }
    });
  };
  ensureShadows(group);
  ensureShadows(interiorStairsGroup);

  return {
    group,
    interiorStairsGroup,
    colliders,
    skyscraperData: {
      id: buildingId,
      name,
      cx,
      cz,
      w,
      d,
      minX,
      maxX,
      minZ,
      maxZ,
      floorH,
      numFloors,
      roofY: totalH,
    },
    mailboxPos: {
      x: cx + doorW * 0.5 + 2.2,
      z: minZ - 1.5,
      // Player spawns INSIDE the open skyscraper ground-floor lobby when claimed as their house; car spawns OUTSIDE in front of the entrance!
      homeX: cx - 2.5,
      homeZ: cz - 2.0,
      carX: cx,
      carZ: minZ - 7.5,
    },
    doorData: {
      buildingId,
      kind: 'sliding',
      doorX: cx,
      doorZ: minZ,
      doorW,
      slideLeft: skySlideLeft,
      slideRight: skySlideRight,
      closedLeftX: cx - doorW * 0.25,
      closedRightX: cx + doorW * 0.25,
      openOffset: doorW * 0.46,
      openProgress: 0,
    },
  };
}

/**
 * Builds a realistic multi-story Urban Apartment, Loft, or Residential High-Rise Building (5 to 14 stories)
 * with balconies, see-through tinted windows, concrete plaza pad, rooftop HVAC units, and walkable staircase.
 */
export function buildApartmentOrHighRiseBuilding(options: {
  buildingId: string;
  name: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  stories: number;
  styleIndex: number;
}): {
  group: THREE.Group;
  interiorStairsGroup: THREE.Group;
  colliders: BuiltCollider[];
  h: number;
  skyscraperData: WalkableSkyscraperData;
  mailboxPos: { x: number; z: number; homeX: number; homeZ: number; carX?: number; carZ?: number };
  doorData: AnimatedBuildingDoor;
} {
  const { buildingId, name, cx, cz, w, d, stories, styleIndex } = options;
  const floorH = 3.8;
  const totalH = stories * floorH;
  const wallT = 0.4;
  const doorW = 4.2;
  const frontPartW = (w - doorW) * 0.5;

  const group = new THREE.Group();
  const interiorStairsGroup = new THREE.Group();
  group.add(interiorStairsGroup);
  const colliders: BuiltCollider[] = [];

  // Exclusively blue-gray, grey, light grey, and dark grey palettes (zero orange or brown!)
  const facadePalettes = [
    { wall: 0xcbd5e1, trim: 0x64748b, balcony: 0x475569 }, // Light Grey & Blue-Gray High-Rise
    { wall: 0xe2e8f0, trim: 0x64748b, balcony: 0x94a3b8 }, // Cool Light Grey Condo
    { wall: 0x64748b, trim: 0xcbd5e1, balcony: 0x475569 }, // Blue-Gray Tower
    { wall: 0x94a3b8, trim: 0x475569, balcony: 0x334155 }, // Medium Blue-Gray Loft
    { wall: 0x71717a, trim: 0xd4d4d8, balcony: 0x52525b }, // Neutral Grey Tower
    { wall: 0x334155, trim: 0x94a3b8, balcony: 0x1e293b }, // Dark Grey & Slate Residential Tower
  ];
  const pal = facadePalettes[styleIndex % facadePalettes.length];

  let trimMat = skySteelMatCache.get(pal.trim);
  if (!trimMat) {
    trimMat = new THREE.MeshStandardMaterial({
      color: pal.trim,
      roughness: 0.55,
      metalness: 0.15,
    });
    skySteelMatCache.set(pal.trim, trimMat);
  }
  let balconyMat = skyDarkSteelMatCache.get(pal.balcony);
  if (!balconyMat) {
    balconyMat = new THREE.MeshStandardMaterial({
      color: pal.balcony,
      roughness: 0.4,
      metalness: 0.4,
    });
    skyDarkSteelMatCache.set(pal.balcony, balconyMat);
  }
  const roofMat = sharedStoneMat;
  const stairStepMat = sharedStoneMat;
  const railMat = sharedWhiteTrimMat;

  const minX = cx - w * 0.5;
  const maxX = cx + w * 0.5;
  const minZ = cz - d * 0.5;
  const maxZ = cz + d * 0.5;

  const addCol = (
    cMinX: number,
    cMaxX: number,
    cMinZ: number,
    cMaxZ: number,
    suffix: string,
    cMinY?: number,
    isFurniture: boolean = false
  ) => {
    colliders.push({
      minX: Math.min(cMinX, cMaxX),
      maxX: Math.max(cMinX, cMaxX),
      minZ: Math.min(cMinZ, cMaxZ),
      maxZ: Math.max(cMinZ, cMaxZ),
      minY: cMinY,
      maxY: totalH + 2.5,
      name: `${name} ${suffix}`,
      isBuilding: true,
      isFurniture,
      buildingId,
    });
  };

  addCol(minX - wallT, maxX + wallT, maxZ - wallT, maxZ + wallT, 'North Wall');
  addCol(minX - wallT, minX + wallT, minZ - wallT, maxZ + wallT, 'West Wall');
  addCol(maxX - wallT, maxX + wallT, minZ - wallT, maxZ + wallT, 'East Wall');
  addCol(minX - wallT, cx - doorW * 0.5, minZ - wallT, minZ + wallT, 'South Left');
  addCol(cx + doorW * 0.5, maxX + wallT, minZ - wallT, minZ + wallT, 'South Right');
  addCol(cx - doorW * 0.5, cx + doorW * 0.5, minZ - wallT, minZ + wallT, 'South Upper Window Wall', floorH - 0.5);

  // Ground Lobby Floor
  const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), trimMat);
  groundFloor.position.set(cx, 0.08, cz);
  groundFloor.receiveShadow = true;
  group.add(groundFloor);

  // Real Functioning 3D Architectural Curtain Wall with See-Through Glass Windows!
  const aptGlassMat = getSkyscraperSeeThroughGlassMat(styleIndex + 3);
  let aptFrameMat = skySteelMatCache.get(pal.wall);
  if (!aptFrameMat) {
    aptFrameMat = new THREE.MeshStandardMaterial({
      color: pal.wall,
      roughness: 0.42,
      metalness: 0.22,
    });
    skySteelMatCache.set(pal.wall, aptFrameMat);
  }
  const { frameMesh: aptFrameMesh, glassMesh: aptGlassMesh } = buildCurtainWallFacade3D({
    cx,
    cz,
    w,
    d,
    numFloors: stories,
    floorH,
    doorW,
    wallT,
    frameMat: aptFrameMat,
    glassMat: aptGlassMat,
    hasSouthDoor: true,
  });
  group.add(aptFrameMesh, aptGlassMesh);

  // Automatic Sliding Glass Doors for High-Rise Ground Lobby Entrance
  const aptDoorLeafW = doorW * 0.5 + 0.04;
  const aptDoorLeafH = floorH - 0.3;
  const aptTransomBar = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.3, 0.3, wallT + 0.1), balconyMat);
  aptTransomBar.position.set(cx, floorH - 0.15, minZ);
  const buildAptSlidingLeaf = (closedX: number, handleSide: 1 | -1) => {
    const leafGrp = new THREE.Group();
    leafGrp.position.set(closedX, 0.16, minZ);
    leafGrp.userData.isAnimatedDoor = true;
    const glassPane = new THREE.Mesh(
      new THREE.BoxGeometry(aptDoorLeafW - 0.1, aptDoorLeafH - 0.14, 0.055),
      sharedWindowGlassMat
    );
    glassPane.position.set(0, aptDoorLeafH * 0.5, 0);
    glassPane.userData.isAnimatedDoor = true;
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(aptDoorLeafW, 0.09, 0.08), trimMat);
    topRail.position.set(0, aptDoorLeafH - 0.045, 0);
    topRail.userData.isAnimatedDoor = true;
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(aptDoorLeafW, 0.1, 0.08), trimMat);
    botRail.position.set(0, 0.05, 0);
    botRail.userData.isAnimatedDoor = true;
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.68, 8), furnChromeMat);
    handleBar.position.set(handleSide * (aptDoorLeafW * 0.38), aptDoorLeafH * 0.45, 0);
    handleBar.userData.isAnimatedDoor = true;
    leafGrp.add(glassPane, topRail, botRail, handleBar);
    return leafGrp;
  };
  const aptSlideLeft = buildAptSlidingLeaf(cx - doorW * 0.25, 1);
  const aptSlideRight = buildAptSlidingLeaf(cx + doorW * 0.25, -1);
  group.add(aptTransomBar, aptSlideLeft, aptSlideRight);

  // Interior Walkable Floors + 3D Stepped Switchback Staircase on East Side (Instanced per building!)
  const stairMinX = maxX - 5.6;
  const stairMidX = maxX - 3.2;
  const stairMaxX = maxX - 0.8;
  const stairStartZ = cz - 3.6;
  const stairEndZ = cz + 2.4;

  const stepsPerFlight = 9;
  const runLen = stairEndZ - stairStartZ;
  const halfH = floorH * 0.5;
  const slopeAngle = Math.atan2(halfH, runLen);
  const rampHyp = Math.hypot(runLen, halfH);
  const stepRun = runLen / stepsPerFlight;
  const stepRise = halfH / stepsPerFlight;
  const mainFloorW = w - 5.88; // Stops cleanly at stairMinX - 0.08 so the East stairwell cutout is 100% open!
  const southLandingD = Math.max(0.4, (stairStartZ - 0.04) - (minZ + 0.2));
  const midLandingD = maxZ - 0.25 - stairEndZ;
  const eastStripW = Math.max(0.2, (maxX - 0.2) - (stairMaxX + 0.04));
  const cutoutLenZ = (maxZ - 0.2) - (stairStartZ - 0.04);

  const instTrimParts = new THREE.InstancedMesh(unitBoxGeo, trimMat, stories * 14 + 8);
  const instBalconyParts = new THREE.InstancedMesh(unitBoxGeo, balconyMat, stories * 6 + 4);
  const instSteps = new THREE.InstancedMesh(unitBoxGeo, stairStepMat, stories * stepsPerFlight * 2);
  const instRails = new THREE.InstancedMesh(unitBoxGeo, railMat, stories * 2);

  // High-Rise Apartment Detailed Multi-Part Furniture Batcher (Lobby + All Residential Floors!)
  const aptFurnBatch = new MultiMaterialFurnitureBatcher();

  const aptDummy = new THREE.Object3D();
  let trimIdx = 0;
  let balIdx = 0;
  let stepIdx = 0;
  let railIdx = 0;

  // Ground Lobby Concierge Front Desk (Walnut & Granite Counter, Monitor, Lamp, Chair) & Tufted Lounge Sofa
  const aptLobY = 0.16;
  const concX = cx - 2.2;
  const concZ = cz + d * 0.2;
  aptFurnBatch.addBox(furnGraniteMat, concX, aptLobY + 0.06, concZ, 3.84, 0.12, 1.04);
  aptFurnBatch.addBox(furnWoodWarmMat, concX, aptLobY + 0.48, concZ, 3.72, 0.74, 0.92);
  aptFurnBatch.addBox(furnGraniteMat, concX, aptLobY + 0.9, concZ - 0.22, 3.88, 0.1, 0.48);
  aptFurnBatch.addBox(furnOfficeDeskMat, concX, aptLobY + 0.72, concZ + 0.14, 3.5, 0.05, 0.56);
  aptFurnBatch.addBox(furnScreenMat, concX - 0.7, aptLobY + 1.04, concZ + 0.04, 0.68, 0.4, 0.045);
  aptFurnBatch.addBox(furnTvDisplayMat, concX - 0.7, aptLobY + 1.04, concZ + 0.065, 0.62, 0.34, 0.015);
  aptFurnBatch.addCyl(sharedBrassMat, concX + 1.35, aptLobY + 1.06, concZ - 0.22, 0.13, 0.22, 0.13);
  aptFurnBatch.addCyl(furnLampShadeMat, concX + 1.35, aptLobY + 1.22, concZ - 0.22, 0.24, 0.18, 0.24);
  addDetailedErgonomicChair(aptFurnBatch, concX - 0.7, aptLobY, concZ + 0.76, -1, furnOfficeChairMat);
  addDetailedTuftedSofa(aptFurnBatch, minX + 2.4, aptLobY, cz - 1.2, 1, furnFabricNavyMat);
  addDetailedIndoorPlant(aptFurnBatch, minX + 1.0, aptLobY, minZ + 1.0, 1.0);

  // Solid Colliders for Apartment Lobby & Upper Floor Furniture
  addCol(cx - 4.1, cx - 0.3, cz + d * 0.2 - 0.5, cz + d * 0.2 + 0.5, 'Concierge Desk', undefined, true);
  addCol(minX + 1.2, minX + 3.6, cz - 1.65, cz - 0.75, 'Lobby Sofa', undefined, true);
  const aptColCenterX = minX + mainFloorW * 0.45;
  addCol(aptColCenterX - 3.45, aptColCenterX - 0.95, cz - 2.66, cz - 1.74, 'Apartment Sofa', floorH - 0.5, true);
  addCol(aptColCenterX - 2.95, aptColCenterX - 1.45, cz - 1.31, cz - 0.59, 'Apartment Coffee Table', floorH - 0.5, true);
  addCol(aptColCenterX + 1.6, aptColCenterX + 2.8, cz - 2.8, cz - 0.2, 'Apartment Kitchen Island', floorH - 0.5, true);
  addCol(aptColCenterX - 2.85, aptColCenterX - 0.75, maxZ - 3.3, maxZ - 1.1, 'Apartment Bed', floorH - 0.5, true);

  for (let s = 0; s <= stories; s++) {
    const sy = s * floorH;
    if (s >= 1) {
      // Exterior Perimeter Ledge around the 4 outer walls ONLY (hollow inside so stairwell cutout is never blocked!)
      for (const zSide of [-1, 1]) {
        aptDummy.position.set(cx, sy, cz + zSide * (d * 0.5 + 0.05));
        aptDummy.rotation.set(0, 0, 0);
        aptDummy.scale.set(w + 0.4, 0.24, 0.5);
        aptDummy.updateMatrix();
        instTrimParts.setMatrixAt(trimIdx++, aptDummy.matrix);
      }
      for (const xSide of [-1, 1]) {
        aptDummy.position.set(cx + xSide * (w * 0.5 + 0.05), sy, cz);
        aptDummy.rotation.set(0, 0, 0);
        aptDummy.scale.set(0.5, 0.24, d + 0.4);
        aptDummy.updateMatrix();
        instTrimParts.setMatrixAt(trimIdx++, aptDummy.matrix);
      }

      // 1. Walkable Upper Main Floor Slab (stops cleanly at stairMinX - 0.08)
      aptDummy.position.set(minX + 0.2 + mainFloorW * 0.5, sy, cz);
      aptDummy.rotation.set(0, 0, 0);
      aptDummy.scale.set(mainFloorW, 0.22, d - 0.4);
      aptDummy.updateMatrix();
      instTrimParts.setMatrixAt(trimIdx++, aptDummy.matrix);

      // 2. South Landing Slab in front of stairwell (stops cleanly at stairStartZ - 0.04)
      aptDummy.position.set(maxX - 2.94, sy, minZ + 0.2 + southLandingD * 0.5);
      aptDummy.rotation.set(0, 0, 0);
      aptDummy.scale.set(5.48, 0.22, southLandingD);
      aptDummy.updateMatrix();
      instTrimParts.setMatrixAt(trimIdx++, aptDummy.matrix);

      // 3. Narrow East Wall Rim Strip framing the stairwell cutout
      aptDummy.position.set(stairMaxX + 0.04 + eastStripW * 0.5, sy, (stairStartZ - 0.04 + maxZ - 0.2) * 0.5);
      aptDummy.rotation.set(0, 0, 0);
      aptDummy.scale.set(eastStripW, 0.22, cutoutLenZ);
      aptDummy.updateMatrix();
      instTrimParts.setMatrixAt(trimIdx++, aptDummy.matrix);

      if (s < stories) {
        // 4. Interior Stairwell Partition Wall (Encloses stairwell from apartment suites)
        aptDummy.position.set(stairMinX - 0.04, sy + floorH * 0.5, (stairStartZ + maxZ - 0.2) * 0.5);
        aptDummy.rotation.set(0, 0, 0);
        aptDummy.scale.set(0.18, floorH - 0.22, cutoutLenZ);
        aptDummy.updateMatrix();
        instTrimParts.setMatrixAt(trimIdx++, aptDummy.matrix);
      }

      if (s < stories) {
        // High-Detail Apartment Living Room, Kitchen Island & Bedroom Suite on Floor s
        const surfY = sy + 0.11;
        const aptCenterX = minX + mainFloorW * 0.45;

        // 1. Living Room Area Rug + Tufted 3-Seat Sofa + Glass/Walnut Coffee Table
        aptFurnBatch.addBox(furnFabricCreamMat, aptCenterX - 2.2, surfY + 0.012, cz - 1.45, 2.8, 0.018, 2.1);
        addDetailedTuftedSofa(
          aptFurnBatch,
          aptCenterX - 2.2,
          surfY,
          cz - 2.2,
          1,
          s % 2 === 0 ? furnFabricNavyMat : furnFabricSlateMat
        );
        addDetailedGlassCoffeeTable(aptFurnBatch, aptCenterX - 2.2, surfY, cz - 0.95, 1.48, 0.7);

        // 2. Detailed Kitchen Island with Granite Countertop, Sink & Gooseneck Faucet, 4-Burner Cooktop & Barstools
        const islX = aptCenterX + 2.2;
        const islZ = cz - 1.5;
        aptFurnBatch.addBox(furnWoodWarmMat, islX, surfY + 0.43, islZ, 1.12, 0.84, 2.52);
        aptFurnBatch.addBox(furnGraniteMat, islX, surfY + 0.88, islZ, 1.24, 0.06, 2.64);
        // Stainless sink basin & faucet
        aptFurnBatch.addBox(furnChromeMat, islX - 0.04, surfY + 0.915, islZ - 0.65, 0.52, 0.025, 0.68);
        aptFurnBatch.addCyl(furnChromeMat, islX + 0.22, surfY + 1.06, islZ - 0.65, 0.04, 0.28, 0.04);
        aptFurnBatch.addBox(furnChromeMat, islX + 0.12, surfY + 1.19, islZ - 0.65, 0.18, 0.03, 0.03);
        // 4-Burner Glass Induction Cooktop
        aptFurnBatch.addBox(furnCooktopMat, islX - 0.04, surfY + 0.915, islZ + 0.55, 0.58, 0.025, 0.74);
        for (const [bxOff, bzOff] of [
          [-0.14, -0.18],
          [0.12, -0.18],
          [-0.14, 0.18],
          [0.12, 0.18],
        ]) {
          aptFurnBatch.addCyl(furnBurnerRingMat, islX - 0.04 + bxOff, surfY + 0.93, islZ + 0.55 + bzOff, 0.14, 0.015, 0.14);
        }
        // 2 Chrome & Padded Barstools tucked on the West side of Kitchen Island
        for (const stZ of [islZ - 0.55, islZ + 0.55]) {
          aptFurnBatch.addCyl(furnChromeMat, islX - 0.48, surfY + 0.02, stZ, 0.32, 0.03, 0.32);
          aptFurnBatch.addCyl(furnChromeMat, islX - 0.48, surfY + 0.31, stZ, 0.05, 0.56, 0.05);
          aptFurnBatch.addCyl(furnOfficeChairMat, islX - 0.48, surfY + 0.61, stZ, 0.34, 0.07, 0.34);
        }

        // 3. Detailed Master Bed with Wood Frame, Tufted Headboard, Mattress, Duvet Blanket, 4 Pillows & Nightstand Lamp
        const bedX = aptCenterX - 1.8;
        const bedZ = maxZ - 2.2;
        aptFurnBatch.addBox(furnWoodDarkMat, bedX, surfY + 0.18, bedZ, 2.08, 0.28, 2.18);
        aptFurnBatch.addBox(furnWoodDarkMat, bedX, surfY + 0.66, maxZ - 1.14, 2.12, 1.12, 0.14);
        aptFurnBatch.addBox(furnFabricSlateMat, bedX, surfY + 0.72, maxZ - 1.2, 1.94, 0.82, 0.1);
        aptFurnBatch.addBox(furnMattressMat, bedX, surfY + 0.42, bedZ - 0.04, 1.92, 0.24, 2.02);
        aptFurnBatch.addBox(furnBlanketMat, bedX, surfY + 0.44, bedZ - 0.32, 1.96, 0.25, 1.42);
        aptFurnBatch.addBox(furnMattressMat, bedX, surfY + 0.45, bedZ + 0.32, 1.97, 0.26, 0.22);
        for (const pOffX of [-0.46, 0.46]) {
          aptFurnBatch.addBox(furnMattressMat, bedX + pOffX, surfY + 0.58, maxZ - 1.48, 0.72, 0.13, 0.4);
          aptFurnBatch.addBox(furnPillowAccentMat, bedX + pOffX, surfY + 0.6, maxZ - 1.72, 0.48, 0.14, 0.24);
        }
        // Bedside Nightstand + Glowing Lamp
        aptFurnBatch.addBox(furnWoodWarmMat, bedX + 1.32, surfY + 0.28, maxZ - 1.38, 0.48, 0.52, 0.46);
        aptFurnBatch.addCyl(furnChromeMat, bedX + 1.32, surfY + 0.64, maxZ - 1.38, 0.14, 0.18, 0.14);
        aptFurnBatch.addCyl(furnLampShadeMat, bedX + 1.32, surfY + 0.8, maxZ - 1.38, 0.26, 0.2, 0.26);

        for (const bx of [cx - w * 0.28, cx + w * 0.28]) {
          for (const bz of [minZ - 0.75, maxZ + 0.75]) {
            aptDummy.position.set(bx, sy + 0.08, bz);
            aptDummy.rotation.set(0, 0, 0);
            aptDummy.scale.set(3.4, 0.16, 1.4);
            aptDummy.updateMatrix();
            instTrimParts.setMatrixAt(trimIdx++, aptDummy.matrix);

            aptDummy.position.set(bx, sy + 0.52, bz + (bz < cz ? -0.64 : 0.64));
            aptDummy.scale.set(3.4, 0.85, 0.12);
            aptDummy.updateMatrix();
            instBalconyParts.setMatrixAt(balIdx++, aptDummy.matrix);
          }
        }
      }
    }

    // Build 3D Stepped Staircase connecting Floor s -> Floor s+1
    if (s < stories) {
      aptDummy.position.set((stairMinX + stairMidX) * 0.5, sy + halfH * 0.5 - 0.08, (stairStartZ + stairEndZ) * 0.5);
      aptDummy.rotation.set(-slopeAngle, 0, 0);
      aptDummy.scale.set(2.3, 0.15, rampHyp);
      aptDummy.updateMatrix();
      instBalconyParts.setMatrixAt(balIdx++, aptDummy.matrix);

      aptDummy.position.set((stairMidX + stairMaxX) * 0.5, sy + halfH + halfH * 0.5 - 0.08, (stairStartZ + stairEndZ) * 0.5);
      aptDummy.rotation.set(slopeAngle, 0, 0);
      aptDummy.scale.set(2.3, 0.15, rampHyp);
      aptDummy.updateMatrix();
      instBalconyParts.setMatrixAt(balIdx++, aptDummy.matrix);

      aptDummy.position.set(stairMinX + 0.08, sy + halfH * 0.5 + 0.45, (stairStartZ + stairEndZ) * 0.5);
      aptDummy.rotation.set(-slopeAngle, 0, 0);
      aptDummy.scale.set(0.08, 0.85, rampHyp);
      aptDummy.updateMatrix();
      instRails.setMatrixAt(railIdx++, aptDummy.matrix);

      aptDummy.position.set((stairMinX + stairMaxX) * 0.5, sy + halfH - 0.1, stairEndZ + midLandingD * 0.5);
      aptDummy.rotation.set(0, 0, 0);
      aptDummy.scale.set(4.8, 0.22, midLandingD);
      aptDummy.updateMatrix();
      instTrimParts.setMatrixAt(trimIdx++, aptDummy.matrix);

      aptDummy.rotation.set(0, 0, 0);
      aptDummy.scale.set(2.32, stepRise, stepRun + 0.05);
      for (let st = 0; st < stepsPerFlight; st++) {
        aptDummy.position.set(
          (stairMinX + stairMidX) * 0.5,
          sy + (st + 0.5) * stepRise,
          stairStartZ + (st + 0.5) * stepRun
        );
        aptDummy.updateMatrix();
        instSteps.setMatrixAt(stepIdx++, aptDummy.matrix);

        aptDummy.position.set(
          (stairMidX + stairMaxX) * 0.5,
          sy + halfH + (st + 0.5) * stepRise,
          stairEndZ - (st + 0.5) * stepRun
        );
        aptDummy.updateMatrix();
        instSteps.setMatrixAt(stepIdx++, aptDummy.matrix);
      }
    }
  }
  instTrimParts.count = trimIdx;
  instBalconyParts.count = balIdx;
  instSteps.count = stepIdx;
  instRails.count = railIdx;
  group.add(instTrimParts, instBalconyParts);
  interiorStairsGroup.add(instSteps, instRails);
  aptFurnBatch.buildInto(interiorStairsGroup);

  const ensureShadows = (grp: THREE.Group) => {
    grp.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              m.shadowSide = THREE.DoubleSide;
            });
          } else {
            child.material.shadowSide = THREE.DoubleSide;
          }
        }
      }
    });
  };
  ensureShadows(group);
  ensureShadows(interiorStairsGroup);

  return {
    group,
    interiorStairsGroup,
    colliders,
    h: totalH + 2.5,
    skyscraperData: {
      id: buildingId,
      name,
      cx,
      cz,
      w,
      d,
      minX,
      maxX,
      minZ,
      maxZ,
      floorH,
      numFloors: stories,
      roofY: totalH,
    },
    mailboxPos: {
      x: cx + doorW * 0.5 + 1.8,
      z: minZ - 1.4,
      homeX: cx - 2.0,
      homeZ: cz - 1.5,
      carX: cx,
      carZ: minZ - 7.0,
    },
    doorData: {
      buildingId,
      kind: 'sliding',
      doorX: cx,
      doorZ: minZ,
      doorW,
      slideLeft: aptSlideLeft,
      slideRight: aptSlideRight,
      closedLeftX: cx - doorW * 0.25,
      closedRightX: cx + doorW * 0.25,
      openOffset: doorW * 0.46,
      openProgress: 0,
    },
  };
}

const storeSignTexCache = new Map<string, THREE.CanvasTexture>();

function getPrintedStoreSignTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  textHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const key = `${title}_${subtitle}_${bgHex}`;
  if (storeSignTexCache.has(key)) return storeSignTexCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 1024, 256);

  // Subtle architectural signboard border frame (non-glowing matte finish)
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 14;
  ctx.strokeRect(12, 12, 1000, 232);

  ctx.fillStyle = accentHex;
  ctx.fillRect(28, 178, 968, 6);

  ctx.fillStyle = textHex;
  ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 512, 104);

  ctx.fillStyle = accentHex;
  ctx.font = '600 32px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(subtitle, 512, 214);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  storeSignTexCache.set(key, tex);
  return tex;
}

export type CommercialArchetype =
  | 'grocery'
  | 'gas_station'
  | 'restaurant'
  | 'diner'
  | 'cafe'
  | 'hardware'
  | 'car_dealership'
  | 'motorcycle_dealership'
  | 'heli_showroom'
  | 'plane_hangar'
  | 'misc_store';

/**
 * Builds a Specific, Realistic, Walkable Commercial Store, Restaurant, Gas Station, Grocery Store, or Dealership
 * with Non-Glowing Printed Architectural Signboards, Plate-Glass Windows, Interior Aisles/Counters/Booths, and Forecourt Details.
 */
export function buildSpecificCommercialBuilding(options: {
  buildingId: string;
  archetype: CommercialArchetype;
  name: string;
  cx: number;
  cz: number;
  shopType?: string;
}): {
  group: THREE.Group;
  colliders: BuiltCollider[];
  w: number;
  d: number;
  h: number;
  mailboxPos: { x: number; z: number; homeX: number; homeZ: number; carX?: number; carZ?: number };
  isGrocery?: boolean;
  doorData: AnimatedBuildingDoor;
} {
  const { buildingId, archetype, name, cx, cz, shopType } = options;
  const group = new THREE.Group();
  const colliders: BuiltCollider[] = [];

  const addCol = (
    cMinX: number,
    cMaxX: number,
    cMinZ: number,
    cMaxZ: number,
    cMaxY: number,
    suffix: string,
    isFurniture: boolean = false
  ) => {
    colliders.push({
      minX: Math.min(cMinX, cMaxX),
      maxX: Math.max(cMinX, cMaxX),
      minZ: Math.min(cMinZ, cMaxZ),
      maxZ: Math.max(cMinZ, cMaxZ),
      maxY: cMaxY,
      name: `${name} ${suffix}`,
      isBuilding: true,
      isFurniture,
      buildingId,
    });
  };

  // Config by commercial archetype
  let w = 18;
  let d = 14;
  let bldgH = 4.8;
  let wallColor = 0xe2e8f0;
  let trimColor = 0x334155;
  let awningColor = 0x15803d;
  let signTitle = 'FRESH MARKET';
  let signSub = 'ORGANIC GROCERY & BAKERY';
  let signBg = '#14532d';
  let signText = '#f8fafc';
  let signAccent = '#86efac';

  if (archetype === 'grocery') {
    w = 20;
    d = 15;
    bldgH = 5.0;
    wallColor = 0xf5f5f4;
    trimColor = 0x7c2d12;
    awningColor = 0x15803d;
    signTitle = '🛒 FRESHMART GROCERY';
    signSub = 'ORGANIC PRODUCE · BUTCHER · BAKERY';
    signBg = '#14532d';
    signText = '#ffffff';
    signAccent = '#bbf7d0';
  } else if (archetype === 'gas_station') {
    w = 18;
    d = 10;
    bldgH = 4.2;
    wallColor = 0xf1f5f9;
    trimColor = 0x1e3a8a;
    awningColor = 0xdc2626;
    signTitle = 'METRO STAR FUEL & MART';
    signSub = '24 HR CONVENIENCE · UNLEADED $3.89 · DIESEL';
    signBg = '#1e3a8a';
    signText = '#ffffff';
    signAccent = '#fca5a5';
  } else if (archetype === 'restaurant') {
    w = 18;
    d = 14;
    bldgH = 4.8;
    wallColor = 0xffedd5;
    trimColor = 0x7c2d12;
    awningColor = 0x991b1b;
    signTitle = 'LA TRATTORIA BISTRO';
    signSub = 'WOOD-FIRED PIZZA · PASTA · PATIO DINING';
    signBg = '#451a03';
    signText = '#fef3c7';
    signAccent = '#fdba74';
  } else if (archetype === 'diner') {
    w = 18;
    d = 13;
    bldgH = 4.4;
    wallColor = 0xe2e8f0;
    trimColor = 0xb91c1c;
    awningColor = 0xdc2626;
    signTitle = 'ROUTE 66 DINER';
    signSub = 'CLASSIC BURGERS · MALT SHAKES · ALL-DAY BREAKFAST';
    signBg = '#7f1d1d';
    signText = '#ffffff';
    signAccent = '#fde047';
  } else if (archetype === 'cafe') {
    w = 16;
    d = 13;
    bldgH = 4.5;
    wallColor = 0xd6d3d1;
    trimColor = 0x292524;
    awningColor = 0x44403c;
    signTitle = 'ARTISAN ROASTERS';
    signSub = 'SMALL-BATCH ESPRESSO BAR & PASTRY KITCHEN';
    signBg = '#1c1917';
    signText = '#fef3c7';
    signAccent = '#d97706';
  } else if (archetype === 'hardware') {
    w = 19;
    d = 14;
    bldgH = 4.8;
    wallColor = 0x9a3412;
    trimColor = 0x334155;
    awningColor = 0xb45309;
    signTitle = 'METRO HARDWARE & SUPPLY';
    signSub = 'LUMBER · POWER TOOLS · GARDEN CENTER';
    signBg = '#292524';
    signText = '#ffffff';
    signAccent = '#fbbf24';
  } else if (archetype === 'car_dealership') {
    w = 20;
    d = 14;
    bldgH = 5.2;
    wallColor = 0xe2e8f0;
    trimColor = 0x334155;
    awningColor = 0x1e293b;
    signTitle = 'AUTO MOTORS SHOWROOM';
    signSub = 'LUXURY · SPORTS · PERFORMANCE VEHICLES';
    signBg = '#1e293b';
    signText = '#f8fafc';
    signAccent = '#94a3b8';
  } else if (archetype === 'heli_showroom') {
    w = 20;
    d = 14;
    bldgH = 5.2;
    wallColor = 0xcbd5e1;
    trimColor = 0x334155;
    awningColor = 0x0369a1;
    signTitle = 'AEROFLIGHT ROTORCRAFT';
    signSub = 'EXECUTIVE & TACTICAL HELICOPTER SHOWROOM';
    signBg = '#0f172a';
    signText = '#f8fafc';
    signAccent = '#7dd3fc';
  } else if (archetype === 'plane_hangar') {
    w = 22;
    d = 15;
    bldgH = 5.6;
    wallColor = 0xd4d4d8;
    trimColor = 0x3f3f46;
    awningColor = 0x334155;
    signTitle = 'SUPERSONIC JET HANGAR';
    signSub = 'AIRCRAFT · EXECUTIVE JETS · HYPERSONIC FLIGHT';
    signBg = '#18181b';
    signText = '#f8fafc';
    signAccent = '#cbd5e1';
  } else if (archetype === 'motorcycle_dealership') {
    w = 20;
    d = 14;
    bldgH = 5.2;
    wallColor = 0xe2e8f0;
    trimColor = 0x1e293b;
    awningColor = 0xb91c1c;
    signTitle = 'APEX MOTO & SUPERBIKES';
    signSub = 'CRUISERS · CAFE RACERS · TRACK SUPERBIKES';
    signBg = '#111827';
    signText = '#f8fafc';
    signAccent = '#ef4444';
  } else if (archetype === 'misc_store') {
    w = 20;
    d = 14;
    bldgH = 5.2;
    wallColor = 0xf1f5f9;
    trimColor = 0x312e81;
    awningColor = 0x6d28d9;
    signTitle = 'WONDER & MAYHEM EMPORIUM';
    signSub = 'DESTRUCTION GADGETS · JETPACKS · SPEED & FUN';
    signBg = '#1e1b4b';
    signText = '#f8fafc';
    signAccent = '#c084fc';
  }

  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.68 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.55 });
  const awningMat = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.65 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.45 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.5 });

  // For gas stations, shift the convenience store building slightly North so the pump canopy sits in front!
  const bldgCz = archetype === 'gas_station' ? cz + 3.2 : cz;
  const wallT = 0.3;
  const doorW = 1.65;
  const frontPartW = (w - doorW) * 0.5;

  // Omit flat lot pad so the world grass texture extends seamlessly right up to the building walls

  // Walkable Interior Floor Slab
  const fl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), floorMat);
  fl.position.set(cx, 0.07, bldgCz);
  fl.receiveShadow = true;
  if (shopType) {
    fl.userData = { isShop: true, shopType, name };
  }
  group.add(fl);

  // Outer Walls (North, West, East, and South with Wide Storefront Entrance & Display Windows)
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(w, bldgH, wallT), wallMat);
  wallN.position.set(cx, bldgH * 0.5, bldgCz + d * 0.5);
  wallN.castShadow = true;
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallT, bldgH, d), wallMat);
  wallW.position.set(cx - w * 0.5, bldgH * 0.5, bldgCz);
  wallW.castShadow = true;
  const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallT, bldgH, d), wallMat);
  wallE.position.set(cx + w * 0.5, bldgH * 0.5, bldgCz);
  wallE.castShadow = true;

  // Front South Wall: LowerKneeWall + Large Plate-Glass Storefront Windows + Upper Fascia Header
  const kneeH = 0.85;
  const winH = 2.25;
  const upperH = bldgH - kneeH - winH;
  const frontZ = bldgCz - d * 0.5;

  for (const side of [-1, 1]) {
    const partCenterX = cx + side * (doorW * 0.5 + frontPartW * 0.5);
    const knee = new THREE.Mesh(new THREE.BoxGeometry(frontPartW, kneeH, wallT), trimMat);
    knee.position.set(partCenterX, kneeH * 0.5, frontZ);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(frontPartW - 0.6, winH, 0.1), sharedWindowGlassMat);
    glass.position.set(partCenterX, kneeH + winH * 0.5, frontZ);
    const pierOuter = new THREE.Mesh(new THREE.BoxGeometry(0.45, winH, wallT), wallMat);
    pierOuter.position.set(cx + side * (w * 0.5 - 0.22), kneeH + winH * 0.5, frontZ);
    const pierInner = new THREE.Mesh(new THREE.BoxGeometry(0.45, winH, wallT), wallMat);
    pierInner.position.set(cx + side * (doorW * 0.5 + 0.22), kneeH + winH * 0.5, frontZ);
    group.add(knee, glass, pierOuter, pierInner);
  }

  const frontHeader = new THREE.Mesh(new THREE.BoxGeometry(w, upperH, wallT), wallMat);
  frontHeader.position.set(cx, bldgH - upperH * 0.5, frontZ);

  // Hinged commercial storefront door (narrow single-door entrance)
  const storeDoorLeafW = doorW - 0.08;
  const storeDoorLeafH = kneeH + winH - 0.14;
  const storeDoorPivot = new THREE.Group();
  storeDoorPivot.position.set(cx - doorW * 0.5 + 0.04, 0.14, frontZ);
  storeDoorPivot.rotation.y = 0;
  storeDoorPivot.userData.isAnimatedDoor = true;
  const storeDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(storeDoorLeafW, storeDoorLeafH, 0.07), trimMat);
  storeDoorFrame.position.set(storeDoorLeafW * 0.5, storeDoorLeafH * 0.5, 0);
  storeDoorFrame.userData.isAnimatedDoor = true;
  const storeDoorGlass = new THREE.Mesh(new THREE.BoxGeometry(storeDoorLeafW - 0.22, storeDoorLeafH - 0.32, 0.085), sharedWindowGlassMat);
  storeDoorGlass.position.set(storeDoorLeafW * 0.5, storeDoorLeafH * 0.54, 0);
  storeDoorGlass.userData.isAnimatedDoor = true;
  const storeDoorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.12), furnChromeMat);
  storeDoorHandle.position.set(storeDoorLeafW - 0.16, storeDoorLeafH * 0.45, 0);
  storeDoorHandle.userData.isAnimatedDoor = true;
  storeDoorPivot.add(storeDoorFrame, storeDoorGlass, storeDoorHandle);

  group.add(wallN, wallW, wallE, frontHeader, storeDoorPivot);

  addCol(cx - w * 0.5, cx + w * 0.5, bldgCz + d * 0.5 - wallT, bldgCz + d * 0.5 + wallT, bldgH + 1.5, 'North');
  addCol(cx - w * 0.5 - wallT, cx - w * 0.5 + wallT, bldgCz - d * 0.5, bldgCz + d * 0.5, bldgH + 1.5, 'West');
  addCol(cx + w * 0.5 - wallT, cx + w * 0.5 + wallT, bldgCz - d * 0.5, bldgCz + d * 0.5, bldgH + 1.5, 'East');
  addCol(cx - w * 0.5, cx - doorW * 0.5, frontZ - wallT, frontZ + wallT, bldgH + 1.5, 'Front L');
  addCol(cx + doorW * 0.5, cx + w * 0.5, frontZ - wallT, frontZ + wallT, bldgH + 1.5, 'Front R');

  // Roof Parapet Cornice & Sloped Storefront Fabric Awning
  const roofCornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.45, d + 0.8), trimMat);
  roofCornice.position.set(cx, bldgH + 0.22, bldgCz);
  const storeAwning = new THREE.Mesh(new THREE.BoxGeometry(w - 0.8, 0.28, 1.8), awningMat);
  storeAwning.position.set(cx, kneeH + winH + 0.15, frontZ - 0.85);
  storeAwning.rotation.x = 0.18;
  group.add(roofCornice, storeAwning);

  // Non-Glowing Printed Architectural Fascia Signboard (MeshStandardMaterial with crisp typography!)
  const signTex = getPrintedStoreSignTexture(signTitle, signSub, signBg, signText, signAccent);
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.52,
    metalness: 0.08,
  });
  const signBacking = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 1.25, 0.16), trimMat);
  signBacking.position.set(cx, bldgH - 0.78, frontZ - 0.1);
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.76, 1.18), signMat);
  signFace.position.set(cx, bldgH - 0.78, frontZ - 0.19);
  signFace.rotation.y = Math.PI; // Facing South (-Z) toward street!
  // Also add front-facing plane so it's readable from both -Z and +Z
  const signFaceSouth = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.76, 1.18), signMat);
  signFaceSouth.position.set(cx, bldgH - 0.78, frontZ - 0.195);
  group.add(signBacking, signFace, signFaceSouth);

  const storeFurnStartIdx = group.children.length;

  // Archetype-Specific Interior Furniture (Front Reception/Checkout Desks + Stocked Aisles of Merchandise!)
  if (archetype === 'grocery') {
    // Front Checkout Desk with Cash Register & Conveyor Belt + 3 Stocked Supermarket Shelving Aisles + Outdoor Produce Crates
    const checkoutDesk = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.02, 1.15), counterMat);
    checkoutDesk.position.set(cx - 4.6, 0.56, bldgCz - 3.8);
    const registerScreen = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.08), furnScreenMat);
    registerScreen.position.set(cx - 3.8, 1.28, bldgCz - 3.8);
    group.add(checkoutDesk, registerScreen);
    addCol(cx - 6.5, cx - 2.7, bldgCz - 4.4, bldgCz - 3.2, 1.5, 'Checkout Counter', true);

    for (const ax of [cx - 5.2, cx, cx + 5.2]) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 6.2), trimMat);
      rack.position.set(ax, 1.1, bldgCz + 1.2);
      group.add(rack);
      addCol(ax - 0.6, ax + 0.6, bldgCz - 1.9, bldgCz + 4.3, 2.2, 'Grocery Aisle', true);
      for (let sy = 0.5; sy <= 1.8; sy += 0.6) {
        const goods = new THREE.Mesh(
          new THREE.BoxGeometry(1.18, 0.28, 5.8),
          new THREE.MeshStandardMaterial({ color: sy > 1.2 ? 0xdc2626 : sy > 0.8 ? 0xeab308 : 0x16a34a, roughness: 0.6 })
        );
        goods.position.set(ax, sy, bldgCz + 1.2);
        group.add(goods);
      }
    }
    // Rear Refrigerated Dairy & Beverage Wall Cases
    const coolerWall = new THREE.Mesh(new THREE.BoxGeometry(w - 2.4, 2.35, 0.75), furnChromeMat);
    coolerWall.position.set(cx, 1.25, bldgCz + d * 0.5 - 0.55);
    group.add(coolerWall);
    addCol(cx - (w - 2.4) * 0.5, cx + (w - 2.4) * 0.5, bldgCz + d * 0.5 - 0.95, bldgCz + d * 0.5, 2.4, 'Cooler Cases', true);

    // Outdoor Produce Bins under awning
    for (const px of [cx - 5.5, cx + 5.5]) {
      const bin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.1), counterMat);
      bin.position.set(px, 0.42, frontZ - 0.9);
      const produce = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.25, 0.9),
        new THREE.MeshStandardMaterial({ color: px < cx ? 0xdc2626 : 0x16a34a, roughness: 0.7 })
      );
      produce.position.set(px, 0.85, frontZ - 0.9);
      group.add(bin, produce);
      addCol(px - 1.2, px + 1.2, frontZ - 1.45, frontZ - 0.35, 1.2, 'Produce Bin', true);
    }
  } else if (archetype === 'gas_station') {
    // Interior Convenience Store Front Cashier Desk + 3 Snack & Drink Shelving Aisles + Rear Beverage Coolers
    const frontDesk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.05, 1.05), counterMat);
    frontDesk.position.set(cx - 4.4, 0.58, bldgCz - 1.6);
    const cashReg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.38, 0.35), furnScreenMat);
    cashReg.position.set(cx - 3.6, 1.28, bldgCz - 1.6);
    group.add(frontDesk, cashReg);
    addCol(cx - 6.1, cx - 2.7, bldgCz - 2.15, bldgCz - 1.05, 1.5, 'Cashier Desk', true);

    for (const ax of [cx - 1.2, cx + 2.2, cx + 5.4]) {
      const aisleRack = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.85, 4.4), trimMat);
      aisleRack.position.set(ax, 0.98, bldgCz + 0.5);
      const snackTier1 = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.25, 4.1), awningMat);
      snackTier1.position.set(ax, 0.65, bldgCz + 0.5);
      const snackTier2 = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.25, 4.1), furnWoodWarmMat);
      snackTier2.position.set(ax, 1.35, bldgCz + 0.5);
      group.add(aisleRack, snackTier1, snackTier2);
      addCol(ax - 0.52, ax + 0.52, bldgCz - 1.7, bldgCz + 2.7, 2.0, 'Store Aisle', true);
    }

    // Drive-Through Fuel Canopy & 4 Detailed Gas Pump Islands in Front!
    const canopyZ = cz - 4.5;
    const canopyH = 4.6;
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.65, 7.2), trimMat);
    canopyRoof.position.set(cx, canopyH, canopyZ);
    const canopyBand = new THREE.Mesh(new THREE.BoxGeometry(17.7, 0.32, 7.4), awningMat);
    canopyBand.position.set(cx, canopyH + 0.1, canopyZ);
    group.add(canopyRoof, canopyBand);

    // Printed Sign on Fuel Canopy
    const canopySign = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 0.6), signMat);
    canopySign.position.set(cx, canopyH, canopyZ - 3.65);
    group.add(canopySign);

    const pumpBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const pumpTopMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 });

    for (const px of [cx - 5.8, cx - 1.9, cx + 1.9, cx + 5.8]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, canopyH, 12), sharedWhiteTrimMat);
      col.position.set(px, canopyH * 0.5, canopyZ);
      const island = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 3.2), sharedStoneMat);
      island.position.set(px, 0.09, canopyZ);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.85, 0.65), pumpBodyMat);
      pump.position.set(px, 1.0, canopyZ + 0.75);
      const pumpHeader = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.7), pumpTopMat);
      pumpHeader.position.set(px, 2.05, canopyZ + 0.75);
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.05, 10), bollardMat);
      bollard.position.set(px, 0.52, canopyZ - 1.35);
      group.add(col, island, pump, pumpHeader, bollard);
      addCol(px - 0.65, px + 0.65, canopyZ - 1.4, canopyZ + 1.4, 2.5, 'Fuel Pump', true);
    }
  } else if (archetype === 'restaurant' || archetype === 'diner' || archetype === 'cafe') {
    // Front Host Reception Desk + Service Counter + Bakery/Food Display Case + Dining Booths & Tables
    const hostDesk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.08, 0.95), furnWoodDarkMat);
    hostDesk.position.set(cx - 2.6, 0.58, bldgCz - d * 0.5 + 1.8);
    const posTerminal = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.36, 0.08), furnScreenMat);
    posTerminal.position.set(cx - 2.6, 1.28, bldgCz - d * 0.5 + 1.8);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 1.1, 1.2), counterMat);
    counter.position.set(cx, 0.6, bldgCz + d * 0.28);
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.67, 0.08, 1.28), furnGraniteMat);
    counterTop.position.set(cx, 1.18, bldgCz + d * 0.28);
    const displayCase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.62, 0.95), sharedWindowGlassMat);
    displayCase.position.set(cx + 2.4, 1.48, bldgCz + d * 0.28);
    group.add(hostDesk, posTerminal, counter, counterTop, displayCase);
    addCol(cx - 3.3, cx - 1.9, bldgCz - d * 0.5 + 1.3, bldgCz - d * 0.5 + 2.3, 1.4, 'Host Stand', true);
    addCol(cx - w * 0.33, cx + w * 0.33, bldgCz + d * 0.28 - 0.65, bldgCz + d * 0.28 + 0.65, 1.6, 'Service Counter', true);

    const tableMat = new THREE.MeshStandardMaterial({
      color: archetype === 'diner' ? 0xdc2626 : 0xf8fafc,
      roughness: 0.5,
    });
    for (const tx of [cx - 4.8, cx + 4.8]) {
      for (const tz of [bldgCz - 2.2, bldgCz + 0.6]) {
        const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 16), tableMat);
        tbl.position.set(tx, 0.82, tz);
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 0.8, 10), sharedDarkFrameMat);
        ped.position.set(tx, 0.4, tz);
        // Booth benches on North & South sides of each dining table
        const boothN = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 0.55), furnFabricNavyMat);
        boothN.position.set(tx, 0.42, tz + 1.05);
        const boothS = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 0.55), furnFabricNavyMat);
        boothS.position.set(tx, 0.42, tz - 1.05);
        group.add(tbl, ped, boothN, boothS);
        addCol(tx - 0.98, tx + 0.98, tz - 1.35, tz + 1.35, 1.1, 'Dining Booth', true);
      }
      // Outdoor Sidewalk Patio Umbrella Table
      const patZ = frontZ - 1.85;
      const pTbl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 14), sharedWhiteTrimMat);
      pTbl.position.set(tx, 0.78, patZ);
      const pPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.35, 8), sharedDarkFrameMat);
      pPole.position.set(tx, 1.18, patZ);
      const pUmb = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.55, 8), awningMat);
      pUmb.position.set(tx, 2.4, patZ);
      group.add(pTbl, pPole, pUmb);
      addCol(tx - 0.85, tx + 0.85, patZ - 0.85, patZ + 0.85, 2.4, 'Patio Table', true);
    }
  } else if (archetype === 'hardware') {
    // Front Hardware Checkout Desk with Register + 4 Stocked Tool, Paint & Lumber Shelving Aisles
    const frontDesk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.05, 1.15), counterMat);
    frontDesk.position.set(cx - 4.5, 0.58, bldgCz - 3.6);
    const regMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.08), furnScreenMat);
    regMonitor.position.set(cx - 3.4, 1.28, bldgCz - 3.6);
    group.add(frontDesk, regMonitor);
    addCol(cx - 6.6, cx - 2.4, bldgCz - 4.2, bldgCz - 3.0, 1.5, 'Hardware Counter', true);

    for (const ax of [cx - 6.0, cx - 2.0, cx + 2.0, cx + 6.0]) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.25, 5.8), trimMat);
      rack.position.set(ax, 1.18, bldgCz + 1.4);
      const toolBoxes = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.32, 5.4), awningMat);
      toolBoxes.position.set(ax, 0.75, bldgCz + 1.4);
      const lumberStack = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.32, 5.4), furnWoodWarmMat);
      lumberStack.position.set(ax, 1.55, bldgCz + 1.4);
      group.add(rack, toolBoxes, lumberStack);
      addCol(ax - 0.58, ax + 0.58, bldgCz - 1.5, bldgCz + 4.3, 2.3, 'Hardware Aisle', true);
    }
  } else {
    // Vehicle & Aircraft Showrooms: Front Sales Reception Desk with Dual Monitors + Accessory Aisles + Central Display Podium + Lounge Sofas
    const desk = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.05, 1.2), counterMat);
    desk.position.set(cx, 0.55, bldgCz + d * 0.28);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.08, 1.3), furnGraniteMat);
    deskTop.position.set(cx, 1.1, bldgCz + d * 0.28);
    const monL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.06), furnScreenMat);
    monL.position.set(cx - 1.4, 1.32, bldgCz + d * 0.28);
    const monR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.06), furnScreenMat);
    monR.position.set(cx + 1.4, 1.32, bldgCz + d * 0.28);
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 0.22, 24), trimMat);
    podium.position.set(cx, 0.18, bldgCz - 0.8);
    addCol(cx - 2.8, cx + 2.8, bldgCz + d * 0.28 - 0.65, bldgCz + d * 0.28 + 0.65, 1.5, 'Reception Desk', true);

    // Left & Right Parts/Gear Shelving Aisles + Customer Waiting Lounge
    for (const side of [-1, 1]) {
      const aisleX = cx + side * (w * 0.5 - 2.2);
      const gearAisle = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 4.8), trimMat);
      gearAisle.position.set(aisleX, 1.05, bldgCz + 0.6);
      const gearItems = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.3, 4.4), awningMat);
      gearItems.position.set(aisleX, 1.25, bldgCz + 0.6);
      const loungeSofa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.52, 0.9), furnFabricSlateMat);
      loungeSofa.position.set(cx + side * 5.6, 0.42, bldgCz - 3.6);
      group.add(gearAisle, gearItems, loungeSofa);
      addCol(aisleX - 0.55, aisleX + 0.55, bldgCz - 1.8, bldgCz + 3.0, 2.1, 'Showroom Aisle', true);
      addCol(cx + side * 5.6 - 1.2, cx + side * 5.6 + 1.2, bldgCz - 4.05, bldgCz - 3.15, 1.0, 'Lounge Sofa', true);
    }
    group.add(desk, deskTop, monL, monR, podium);
  }

  for (let i = storeFurnStartIdx; i < group.children.length; i++) {
    const ch = group.children[i];
    // Keep gas station overhead fuel canopy roof/band/sign structural while marking all desks, aisles, booths, tables, sofas & pumps as furniture
    if (archetype === 'gas_station' && ch.position.y >= 4.0) continue;
    ch.userData.isFurniture = true;
  }

  const ensureShadows = (grp: THREE.Group) => {
    grp.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              m.shadowSide = THREE.DoubleSide;
            });
          } else {
            child.material.shadowSide = THREE.DoubleSide;
          }
        }
      }
    });
  };
  ensureShadows(group);

  return {
    group,
    colliders,
    w,
    d: archetype === 'gas_station' ? 18 : d,
    h: bldgH + 1.2,
    mailboxPos: {
      x: cx + doorW * 0.5 + 1.6,
      z: frontZ - 1.3,
      homeX: cx,
      homeZ: bldgCz,
      carX: cx,
      carZ: frontZ - 5.5,
    },
    isGrocery: archetype === 'grocery',
    doorData: {
      buildingId,
      kind: 'hinged',
      doorX: cx,
      doorZ: frontZ,
      doorW,
      hingePivot: storeDoorPivot,
      openProgress: 0,
      isHouse: false,
    },
  };
}

let stopSignTex: THREE.CanvasTexture | null = null;
function getStopSignTexture(): THREE.CanvasTexture {
  if (stopSignTex) return stopSignTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 14;
  ctx.strokeRect(14, 14, 228, 228);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 78px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STOP', 128, 132);

  stopSignTex = new THREE.CanvasTexture(canvas);
  stopSignTex.colorSpace = THREE.SRGBColorSpace;
  return stopSignTex;
}

/**
 * Builds a realistic 3D Octagonal Red STOP Sign on a Steel Post for Road Intersections.
 */
export function buildStopSign3D(x: number, z: number, rotY: number = 0): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 2.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.35 })
  );
  post.position.y = 1.175;

  const signMat = new THREE.MeshStandardMaterial({
    map: getStopSignTexture(),
    roughness: 0.45,
  });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });

  const signOct = new THREE.Mesh(new THREE.CircleGeometry(0.46, 8), signMat);
  signOct.rotation.z = Math.PI / 8;
  signOct.position.set(0, 2.35, 0.04);

  const signBack = new THREE.Mesh(new THREE.CircleGeometry(0.46, 8), backMat);
  signBack.rotation.y = Math.PI;
  signBack.rotation.z = Math.PI / 8;
  signBack.position.set(0, 2.35, -0.04);

  grp.add(post, signOct, signBack);
  return grp;
}

/**
 * Computes exact walkable floor or stair height inside any non-destroyed skyscraper or multi-story building.
 */
export function getSkyscraperFloorOrStairHeight(
  px: number,
  py: number,
  pz: number,
  skyscrapers: WalkableSkyscraperData[]
): number | null {
  for (const s of skyscrapers) {
    if (s.destroyed) continue;
    if (px >= s.minX - 0.25 && px <= s.maxX + 0.25 && pz >= s.minZ - 0.25 && pz <= s.maxZ + 0.25) {
      const stairMinX = s.maxX - 5.6;
      const stairMidX = s.maxX - 3.2;
      const stairMaxX = s.maxX - 0.8;
      const stairStartZ = s.cz - 3.6;
      const stairEndZ = s.cz + 2.4;
      const runLen = stairEndZ - stairStartZ;
      const halfH = s.floorH * 0.5;

      const inFlight1 =
        px >= stairMinX - 0.45 &&
        px <= stairMidX + 0.3 &&
        pz >= stairStartZ - 0.45 &&
        pz <= stairEndZ + 0.35;
      const inNorthLanding =
        px >= stairMinX - 0.45 &&
        px <= stairMaxX + 0.45 &&
        pz >= stairEndZ - 0.35;
      const inFlight2 =
        px >= stairMidX - 0.3 &&
        px <= stairMaxX + 0.45 &&
        pz >= stairStartZ - 0.35 &&
        pz <= stairEndZ + 0.45;

      const candidates: number[] = [];
      // Only include flat ground floor (y = 0) when not actively on the bottom-floor Flight 1 stair ramp,
      // so y = 0 never competes with and blocks climbing the first flight of stairs from the bottom floor!
      if (!(inFlight1 && pz >= stairStartZ - 0.25 && py <= halfH + 0.4)) {
        candidates.push(0);
      }

      for (let f = 0; f <= s.numFloors; f++) {
        const fy = f * s.floorH;

        // Upper floor slab & South landing in front of stairwell
        if (f >= 1) {
          const onMainFloor = px <= stairMinX - 0.15;
          const onSouthLanding = pz <= stairStartZ - 0.15 || (px >= stairMidX - 0.2 && pz <= stairStartZ + 0.15);
          if (onMainFloor || onSouthLanding) {
            candidates.push(fy);
          }
        }

        if (f < s.numFloors) {
          // Flight 1 (Inner Lane: climbing North from stairStartZ at fy to stairEndZ at fy + halfH)
          if (inFlight1) {
            const t = Math.max(0, Math.min(1, (pz - (stairStartZ - 0.25)) / (runLen + 0.25)));
            candidates.push(fy + t * halfH);
          }

          // North Mid-Landing at fy + halfH
          if (inNorthLanding && !(inFlight2 && pz < stairEndZ - 0.15)) {
            candidates.push(fy + halfH);
          }

          // Flight 2 (Outer Lane: climbing South from stairEndZ at fy + halfH to stairStartZ at fy + floorH)
          if (inFlight2) {
            const t = Math.max(0, Math.min(1, ((stairEndZ + 0.15) - pz) / (runLen + 0.15)));
            candidates.push(fy + halfH + t * halfH);
          }
        }
      }

      // If above the roof (and not inside the open stairwell shaft cutout), treat the roof as a solid floor
      const inStairCutout =
        px >= stairMinX - 0.15 &&
        px <= stairMaxX + 0.15 &&
        pz >= stairStartZ - 0.15;
      if (py >= s.roofY - 0.5 && !inStairCutout) {
        return s.roofY;
      }

      // Select the valid surface candidate closest to the player's feet (allowing smooth 1.85m step-up and 2.6m step-down)
      let bestY: number | null = null;
      let bestDist = Infinity;
      for (const cY of candidates) {
        const diff = cY - py;
        if (diff <= 1.85 && diff >= -2.6) {
          // Prefer stepping up when on stairs so climbing feels effortless
          const score = diff >= 0 ? diff * 0.65 : Math.abs(diff);
          if (score < bestDist) {
            bestDist = score;
            bestY = cY;
          }
        }
      }
      return bestY;
    }
  }
  return null;
}
