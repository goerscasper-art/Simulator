import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Maximize2,
  Minimize2,
  MapPin,
  X,
  Compass,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ActiveVehicleType,
  CarPhysics,
  CarVehicle,
  CustomCharacterConfig,
  DisasterType,
  ExcavatorPhysics,
  HelicopterPhysics,
  MotorcyclePhysics,
  NPCData,
  PlanePhysics,
  PvpBattleConfig,
  ResolutionScale,
  FoodItem,
} from '../types/housesim';
import { WeatherSystem, WeatherType, WeatherStatusInfo } from '../utils/weatherSystem';
import { bgmManager } from '../utils/bgmManager';
import { RECIPES } from '../utils/cookingData';
import {
  buildAirplane3DModel,
  buildCar3DModel,
  buildExcavator3DModel,
  buildHelicopter3DModel,
  buildHumanCharacter3D,
  buildMotorcycle3DModel,
  buildPlayerJetpack3D,
  buildUtilityPole3DModel,
  buildCaliforniaPalm3DModel,
  buildWeapon3DModel,
  buildRealisticClusterBombMesh,
  buildFirstPersonArmViewModel,
  getWoodTexture,
  getRealisticGrassTexture,
  getModernWoodSlatTexture,
  getLimestoneStuccoTexture,
  getModernPaverTexture,
  getSidewalkTexture,
  mergeBufferGeometries,
} from '../utils/world3DBuilder';
import {
  buildApartmentOrHighRiseBuilding,
  buildDetailedHouse20Types,
  buildSpecificCommercialBuilding,
  buildStopSign3D,
  buildWalkableSkyscraperWithStairs,
  CommercialArchetype,
  FamousLandmarkType,
  getSkyscraperFloorOrStairHeight,
  HOUSE_ARCHETYPE_NAMES,
  WalkableSkyscraperData,
  AnimatedBuildingDoor,
} from '../utils/cityArchitectureBuilder';
import {
  buildPlatformerLevel,
  BuiltPlatformerLevel,
  ObbyPlatform,
  PLATFORMER_BASE_Y,
  TOTAL_PLATFORMER_LEVELS,
} from '../utils/platformerBuilder';
import { soundFX } from '../utils/soundEffects';
import {
  CITY_NPCS,
  CARS_CATALOG,
  DEFAULT_CUSTOM_CHARACTER,
  HELICOPTERS_CATALOG,
  MISC_ITEMS_CATALOG,
  MOTORCYCLES_CATALOG,
  PLANES_CATALOG,
  WEAPONS_CATALOG,
} from '../data/catalog';

interface VirtualHouseCanvasProps {
  ownedCars: CarVehicle[];
  activeCarId: string | null;
  activeMotorcycleId?: string | null;
  activeHeliId?: string | null;
  activePlaneId?: string | null;
  activeWeaponId?: string;
  activeMiscIds?: string[];
  customCharacter?: CustomCharacterConfig;
  carSpawnTrigger?: number;
  motorcycleSpawnTrigger?: number;
  heliSpawnTrigger?: number;
  planeSpawnTrigger?: number;
  superJumpTrigger?: number;
  resetBuildingsSignal?: number;
  isFirstPerson?: boolean;
  showMiniMap?: boolean;
  performanceMode?: boolean;
  isDrivingCar: boolean;
  onEnterCar: () => void;
  onExitCar: () => void;
  activeVehicle?: ActiveVehicleType;
  onEnterVehicle?: (type: 'car' | 'motorcycle' | 'helicopter' | 'plane') => void;
  onExitVehicle?: () => void;
  onAltitudeUpdate?: (altMeters: number) => void;
  initialHeliPos?: { x: number; y: number; z: number; rotationY: number };
  onSavePositions?: (
    playerPos: [number, number, number],
    carPos: { x: number; z: number; rotationY: number },
    boatPos?: { x: number; z: number; rotationY: number },
    heliPos?: { x: number; y: number; z: number; rotationY: number }
  ) => void;
  onInteractWithNPC: (npc: NPCData) => void;
  onOpenShop: (tab?: string) => void;
  onSpeedUpdate: (speedMph: number) => void;
  initialPlayerPos?: [number, number, number];
  initialCarPos?: { x: number; z: number; rotationY: number };
  respawnSignal?: number;
  isMenuOpen?: boolean;
  isTitleScreen?: boolean;
  talkingNpcId?: string | null;
  forcedWeather?: WeatherType | null;
  weatherCycleEnabled?: boolean;
  weatherCycleTrigger?: number;
  onWeatherStatusChange?: (status: WeatherStatusInfo) => void;
  resolutionScale?: ResolutionScale;
  onOpenCookingMenu: () => void;
  onGrabIngredients: () => void;
  onOpenRestaurantMenu?: (type: 'restaurant' | 'diner' | 'cafe', name: string) => void;
  activeFoodEffects: { type: string; value: number; endTime: number }[];
  healSignal?: number;
  healAmount?: number;
  onSelectWeapon?: (id: string) => void;
  onEatFood?: (food: FoodItem) => void;
  onQuestProgress?: (type: string, amount?: number) => void;
  onOpenQuestModal?: () => void;
  activeDisaster?: DisasterType;
  onActiveDisasterChange?: (disaster: DisasterType) => void;
  onFloodHeightUpdate?: (height: number) => void;
  onFloodCompleted?: () => void;
  policeModeEnabled?: boolean;
  wantedLevel?: number;
  onWantedLevelChange?: (level: number) => void;
  onWantedDecayTimerUpdate?: (secondsRemaining: number, maxSeconds: number) => void;
  zombieModeEnabled?: boolean;
  zombieMode?: boolean;
  invincibleMode?: boolean;
  npcTargetCount?: number;
  npcCount?: number;
  pvpConfig?: PvpBattleConfig;
  pvpStartTrigger?: number;
  pvpStartNonce?: number;
  onPvpRemainingEnemiesChange?: (count: number) => void;
  onPvpRemainingUpdate?: (count: number) => void;
  hostileNpcTrigger?: { npcId: string; timestamp: number } | null;
  hostileNpcId?: string;
  hostileNpcTriggerNonce?: number;
  onTalkToNpc?: (npc: NPCData) => void;
  onCloseNpcChat?: () => void;
  nukeTriggerSignal?: number;
  battleCountdown?: number | null;
  onBattleRoundEnd?: (winner: 'player' | 'enemy', enemyCount?: number) => void;
  platformerMode?: boolean;
  platformerLevel?: number;
  platformerNonce?: number;
  onPlatformerLevelChange?: (nextLevel: number) => void;
  onEarnMoney?: (amount: number, reason: string, worldPos?: { x: number; y: number; z: number }) => void;
  onProjectWorldToScreen?: (projector: (worldPos: { x: number; y: number; z: number }) => { x: number; y: number; visible: boolean } | null) => void;
}

export const calculateCappedPixelRatio = (isPerf: boolean, scale?: ResolutionScale): number => {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  if (scale === 'extra-low') return 0.58;
  if (scale === 'low') return 0.58;
  if (scale === 'balanced') return Math.min(1.25, Math.max(1.0, dpr));
  if (scale === 'high') return Math.min(1.25, Math.max(1.0, dpr));
  if (isPerf) return 0.58;
  return Math.min(1.25, Math.max(1.0, dpr));
};

interface SpatialMoneyPop {
  id: string;
  amount: number;
  reason?: string;
  x: number;
  y: number;
  z: number;
  age: number;
  maxAge: number;
  screenX: number;
  screenY: number;
  visible: boolean;
  opacity: number;
  scale: number;
}

const tempSpatialVec = new THREE.Vector3();

interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  name: string;
  isBuilding?: boolean;
  isFurniture?: boolean;
  destroyedYRanges?: [number, number][];
  buildingId?: string;
  destroyed?: boolean;
  isExcavatorBuilt?: boolean;
}

interface DestructibleBuilding {
  id: string;
  name: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  h: number;
  group: THREE.Group;
  interiorStairsGroup?: THREE.Group;
  destroyed: boolean;
  structuralDamage?: number;
  maxHealth?: number;
  damage?: number;
  chunkDamageGroup?: THREE.Group;
  collapsing?: boolean;
  collapseCausedByDisaster?: boolean;
  collapseProgress?: number;
  collapseVelY?: number;
  collapseTiltVel?: number;
  collapseTiltAngle?: number;
  collapseDirX?: number;
  collapseDirZ?: number;
  neutralizedForPlayer?: boolean;
  collapseAxisX?: number;
  collapseAxisZ?: number;
  rubbleGroup?: THREE.Group;
  isGrocery?: boolean;
  isRestaurant?: boolean;
  isDiner?: boolean;
  isCafe?: boolean;
  isHardware?: boolean;
  isGasStation?: boolean;
  isExcavatorBuilt?: boolean;
}

export const VirtualHouseCanvas: React.FC<VirtualHouseCanvasProps> = ({
  ownedCars,
  activeCarId,
  activeMotorcycleId = null,
  activeHeliId = null,
  activePlaneId = null,
  activeWeaponId = 'weapon-fist',
  activeMiscIds = [],
  customCharacter = DEFAULT_CUSTOM_CHARACTER,
  carSpawnTrigger = 0,
  motorcycleSpawnTrigger = 0,
  heliSpawnTrigger = 0,
  planeSpawnTrigger = 0,
  superJumpTrigger = 0,
  resetBuildingsSignal = 0,
  isFirstPerson = false,
  showMiniMap = false,
  performanceMode = true,
  isDrivingCar,
  onEnterCar,
  onExitCar,
  activeVehicle,
  onEnterVehicle,
  onExitVehicle,
  onAltitudeUpdate,
  initialHeliPos,
  onInteractWithNPC,
  onOpenShop,
  onSpeedUpdate,
  initialPlayerPos,
  initialCarPos,
  onSavePositions,
  respawnSignal,
  isMenuOpen = false,
  isTitleScreen = false,
  talkingNpcId = null,
  forcedWeather = null,
  weatherCycleEnabled = true,
  weatherCycleTrigger = 0,
  onWeatherStatusChange,
  resolutionScale = 'low',
  onOpenCookingMenu,
  onGrabIngredients,
  onOpenRestaurantMenu,
  activeFoodEffects = [],
  healSignal = 0,
  healAmount = 0,
  onSelectWeapon,
  onEatFood,
  onQuestProgress,
  onOpenQuestModal,
  activeDisaster = 'none',
  onActiveDisasterChange,
  onFloodHeightUpdate,
  onFloodCompleted,
  policeModeEnabled = true,
  wantedLevel = 0,
  onWantedLevelChange,
  onWantedDecayTimerUpdate,
  zombieModeEnabled = false,
  invincibleMode = false,
  npcTargetCount = 48,
  pvpConfig,
  pvpStartTrigger = 0,
  onPvpRemainingEnemiesChange,
  hostileNpcTrigger = null,
  onCloseNpcChat,
  nukeTriggerSignal = 0,
  battleCountdown = null,
  onBattleRoundEnd,
  platformerMode = false,
  platformerLevel = 1,
  platformerNonce = 0,
  onPlatformerLevelChange,
  onEarnMoney,
  onProjectWorldToScreen,
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sidewalkBoxesRef = useRef<{ minX: number; maxX: number; minZ: number; maxZ: number }[]>([]);
  const weatherSystemRef = useRef<WeatherSystem | null>(null);
  const onWeatherStatusChangeRef = useRef<((status: WeatherStatusInfo) => void) | undefined>(onWeatherStatusChange);

  // 3D Spatial Floating Money Popups Ref & State
  const spatialMoneyPopsRef = useRef<SpatialMoneyPop[]>([]);
  const [renderSpatialPops, setRenderSpatialPops] = useState<SpatialMoneyPop[]>([]);

  const addSpatialMoneyPop = useCallback((amount: number, reason?: string, worldPos?: { x: number; y: number; z: number }) => {
    let px = worldPos?.x;
    let py = worldPos?.y;
    let pz = worldPos?.z;

    if (px === undefined || py === undefined || pz === undefined) {
      const pW = getActivePlayerWorldPos();
      px = pW.x;
      py = pW.y + 2.2;
      pz = pW.z;
    }

    // Slight random horizontal scatter for simultaneous popups so they don't stack directly
    const jitterX = (Math.random() - 0.5) * 1.5;
    const jitterZ = (Math.random() - 0.5) * 1.5;

    spatialMoneyPopsRef.current.push({
      id: `${Date.now()}-${Math.random()}`,
      amount,
      reason,
      x: px + jitterX,
      y: py,
      z: pz + jitterZ,
      age: 0,
      maxAge: 2.6,
      screenX: -999,
      screenY: -999,
      visible: false,
      opacity: 0,
      scale: 0.5,
    });
  }, []);

  // Provide world-to-screen projector to parent
  useEffect(() => {
    if (onProjectWorldToScreen) {
      onProjectWorldToScreen((worldPos) => {
        if (!cameraRef.current || !rendererRef.current) return null;
        const vec = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
        vec.project(cameraRef.current);
        const x = (vec.x * 0.5 + 0.5) * rendererRef.current.domElement.clientWidth;
        const y = (vec.y * -0.5 + 0.5) * rendererRef.current.domElement.clientHeight;
        const visible = vec.z < 1 && Math.abs(vec.x) < 1 && Math.abs(vec.y) < 1;
        return { x, y, visible };
      });
    }
  }, [onProjectWorldToScreen]);

  // Dynamic Resolution & Device Pixel Ratio Capping hook
  useEffect(() => {
    if (rendererRef.current) {
      const pr = calculateCappedPixelRatio(Boolean(performanceMode), resolutionScale);
      rendererRef.current.setPixelRatio(pr);
      const isHighMode = resolutionScale === 'high';
      const isHighOrBalanced = resolutionScale === 'high' || resolutionScale === 'balanced';
      rendererRef.current.shadowMap.type = isHighOrBalanced ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
      rendererRef.current.shadowMap.needsUpdate = true;
      const canvas = rendererRef.current.domElement;
      if (isHighMode) {
        canvas.style.imageRendering = 'auto';
        canvas.style.setProperty('image-rendering', 'auto');
        canvas.classList.remove('pixelated-canvas');
      } else {
        canvas.style.imageRendering = 'pixelated';
        canvas.style.setProperty('image-rendering', 'pixelated');
        canvas.style.setProperty('image-rendering', '-moz-crisp-edges');
        canvas.style.setProperty('image-rendering', 'crisp-edges');
        canvas.classList.add('pixelated-canvas');
      }
    }
  }, [performanceMode, resolutionScale]);

  useEffect(() => {
    onWeatherStatusChangeRef.current = onWeatherStatusChange;
  }, [onWeatherStatusChange]);

  useEffect(() => {
    if (forcedWeather && weatherSystemRef.current) {
      weatherSystemRef.current.transitionTo(forcedWeather);
    }
  }, [forcedWeather]);

  useEffect(() => {
    if (weatherCycleEnabled !== undefined && weatherSystemRef.current) {
      weatherSystemRef.current.autoCycleEnabled = weatherCycleEnabled;
    }
  }, [weatherCycleEnabled]);

  useEffect(() => {
    if (weatherCycleTrigger > 0 && weatherSystemRef.current) {
      weatherSystemRef.current.cycleNext();
    }
  }, [weatherCycleTrigger]);

  const miniMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMiniMapEnlarged, setIsMiniMapEnlarged] = useState<boolean>(false);
  const isMiniMapEnlargedRef = useRef<boolean>(false);
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(1.0);
  const mapZoomLevelRef = useRef<number>(1.0);
  const [activeWaypoint, setActiveWaypoint] = useState<{ x: number; z: number } | null>(null);
  const waypointRef = useRef<{ x: number; z: number } | null>(null);
  const [waypointNotice, setWaypointNotice] = useState<string | null>(null);
  const latestFocusPosRef = useRef<{ x: number; z: number }>({ x: 596, z: 31 });
  const [activeDirectionInfo, setActiveDirectionInfo] = useState<{ distance: number; direction: string } | null>(null);

  const getCardinalDirection = (fromX: number, fromZ: number, toX: number, toZ: number): string => {
    // In our coordinate space: +Z is North, +X is West
    const dZ = toZ - fromZ; // North (+) / South (-)
    const dX = fromX - toX; // East (+) / West (-)
    const angleDeg = (Math.atan2(dX, dZ) * 180) / Math.PI;
    const normalized = (angleDeg + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return 'North ↑';
    if (normalized >= 22.5 && normalized < 67.5) return 'North-East ↗';
    if (normalized >= 67.5 && normalized < 112.5) return 'East →';
    if (normalized >= 112.5 && normalized < 157.5) return 'South-East ↘';
    if (normalized >= 157.5 && normalized < 202.5) return 'South ↓';
    if (normalized >= 202.5 && normalized < 247.5) return 'South-West ↙';
    if (normalized >= 247.5 && normalized < 292.5) return 'West ←';
    return 'North-West ↖';
  };

  const handleClearWaypoint = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    waypointRef.current = null;
    setActiveWaypoint(null);
    setActiveDirectionInfo(null);
    soundFX.playInteractChime();
    setWaypointNotice('✕ Waypoint Removed');
    setTimeout(() => setWaypointNotice(null), 2500);
  };

  const toggleMiniMapEnlarge = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsMiniMapEnlarged((prev) => {
      const next = !prev;
      isMiniMapEnlargedRef.current = next;
      if (next) {
        if (document.pointerLockElement) document.exitPointerLock?.();
      }
      return next;
    });
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMapZoomLevel((prev) => {
      const next = Math.min(2.5, Number((prev + 0.25).toFixed(2)));
      mapZoomLevelRef.current = next;
      return next;
    });
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMapZoomLevel((prev) => {
      const next = Math.max(0.5, Number((prev - 0.25).toFixed(2)));
      mapZoomLevelRef.current = next;
      return next;
    });
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMapZoomLevel(1.0);
    mapZoomLevelRef.current = 1.0;
  };

  const handleMiniMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const canvas = miniMapCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const W = canvas.width;
    const H = canvas.height;
    const halfW = W * 0.5;
    const halfH = H * 0.5;

    const isEnlarged = isMiniMapEnlargedRef.current;
    const baseScale = isEnlarged ? 1 / 2.6 : 1 / 4.2;
    const scale = baseScale * mapZoomLevelRef.current;

    const focusX = latestFocusPosRef.current.x;
    const focusZ = latestFocusPosRef.current.z;

    const wx = focusX + (halfW - clickX) / scale;
    const wz = focusZ + (halfH - clickY) / scale;

    if (waypointRef.current) {
      const currentWp = waypointRef.current;
      const distToExisting = Math.hypot(wx - currentWp.x, wz - currentWp.z);
      if (distToExisting < 25 / mapZoomLevelRef.current) {
        handleClearWaypoint();
        return;
      }
    }

    const newWp = { x: Math.round(wx), z: Math.round(wz) };
    waypointRef.current = newWp;
    setActiveWaypoint(newWp);
    soundFX.playPlaceObject();
    const distM = Math.round(Math.hypot(focusX - newWp.x, focusZ - newWp.z));
    const dir = getCardinalDirection(focusX, focusZ, newWp.x, newWp.z);
    setActiveDirectionInfo({ distance: distM, direction: dir });
    setWaypointNotice(`🎯 Waypoint Set: ${distM}m ${dir}`);
    setTimeout(() => setWaypointNotice(null), 3000);
  };

  const [nearbyPrompt, setNearbyPrompt] = useState<{ text: string; icon: string; actionId: string } | null>(null);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [playerHealth, setPlayerHealth] = useState<number>(100);
  const [carHealth, setCarHealth] = useState<number>(100);
  const [heliHealth, setHeliHealth] = useState<number>(100);
  const [planeHealth, setPlaneHealth] = useState<number>(100);
  const [explodingVehicleType, setExplodingVehicleType] = useState<'car' | 'motorcycle' | 'helicopter' | 'plane' | null>(null);
  const explodingVehicleTimerRef = useRef<number>(0);
  const [planeGearDown, setPlaneGearDown] = useState<boolean>(true);
  const [planeThrottlePct, setPlaneThrottlePct] = useState<number>(0);
  const [deathScreenInfo, setDeathScreenInfo] = useState<{ title?: string; subtitle?: string; reason?: string; cause?: string } | null>(null);

  const damageVehicle = (amount: number): number => {
    const roundedDmg = Math.round(amount);
    if (roundedDmg <= 0) return carHealthRef.current;

    const curVeh = stateRef.current.activeVehicle ?? (stateRef.current.isDrivingCar ? 'car' : null);
    if (!curVeh) return 100;

    let nextHp = 100;
    if (curVeh === 'car' || curVeh === 'motorcycle') {
      nextHp = Math.max(0, carHealthRef.current - roundedDmg);
      carHealthRef.current = nextHp;
      setCarHealth(nextHp);
    } else if (curVeh === 'helicopter') {
      nextHp = Math.max(0, heliHealthRef.current - roundedDmg);
      heliHealthRef.current = nextHp;
      setHeliHealth(nextHp);
    } else if (curVeh === 'plane') {
      nextHp = Math.max(0, planeHealthRef.current - roundedDmg);
      planeHealthRef.current = nextHp;
      setPlaneHealth(nextHp);
    }

    if (nextHp <= 0 && !isExplodingRef.current) {
      const pW = getActivePlayerWorldPos();
      triggerHouseExplosionRef.current?.(pW.x, pW.z, pW.y, 'VEHICLE DESTROYED', 'Vehicle integrity reduced to 0%.');
    }

    return nextHp;
  };
  const [remoteBombCount, setRemoteBombCount] = useState<number>(0);
  const [floodCountdownSec, setFloodCountdownSec] = useState<number | null>(null);
  const [floodHeightDisplay, setFloodHeightDisplay] = useState<{ current: number; max: number } | null>(null);

  const isAimingRef = useRef<boolean>(false);
  useEffect(() => {
    isAimingRef.current = isAiming;
  }, [isAiming]);
  const playerHealthRef = useRef<number>(100);
  const carHealthRef = useRef<number>(100);
  const heliHealthRef = useRef<number>(100);
  const planeHealthRef = useRef<number>(100);
  const carHitCooldownRef = useRef<number>(0);
  const planeGearDownRef = useRef<boolean>(true);
  const planeGearAnimRef = useRef<number>(0);
  const planeThrottlePctRef = useRef<number>(0);
  const heliYawVelRef = useRef<number>(0);
  const performExcavatorActionRef = useRef<
    ((mode: 'build' | 'skyscraper' | 'highrise' | 'road' | 'demolish') => void) | null
  >(null);
  const planeFlightDynRef = useRef<{
    pitchRate: number;
    rollRate: number;
    yawRate: number;
    aoa: number;
    stallFactor: number;
    throttle: number;
  }>({
    pitchRate: 0,
    rollRate: 0,
    yawRate: 0,
    aoa: 0,
    stallFactor: 0,
    throttle: 0,
  });
  const punchAnimTimerRef = useRef<number>(0);
  const punchHandSideRef = useRef<1 | -1>(1);
  const destructibleBuildingsRef = useRef<DestructibleBuilding[]>([]);
  const stovesRef = useRef<{ x: number; z: number; isExcavatorBuilt?: boolean }[]>([]);
  const groceriesRef = useRef<{ x: number; z: number }[]>([]);

  // Atmosphere, Sky & Performance Mode refs
  const activeLightingPresetRef = useRef<'golden' | 'day' | 'sunset' | 'night'>('day');
  const applyLightingPresetFnRef = useRef<((preset: 'golden' | 'day' | 'sunset' | 'night') => void) | null>(null);
  const applyPerformanceModeFnRef = useRef<((enabled: boolean) => void) | null>(null);
  const waterTexturesRef = useRef<THREE.CanvasTexture[]>([]);
  const cloudsGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    applyPerformanceModeFnRef.current?.(performanceMode);
  }, [performanceMode]);

  const isExplodingRef = useRef<boolean>(false);
  const isDeathByExplosionRef = useRef<boolean>(false);
  const isVoidFallRef = useRef<boolean>(false);
  const explosionTimerRef = useRef<number>(0);
  const explosionFocusPosRef = useRef<{ x: number; y: number; z: number }>({ x: -10.5, y: 0, z: 7.5 });
  const cameraShakeRef = useRef<number>(0);
  const [damageFlash, setDamageFlash] = useState(false);
  const damageFlashTimeoutRef = useRef<number | null>(null);
  const triggerDamageFlash = (intensity: number = 0.5) => {
    setDamageFlash(true);
    cameraShakeRef.current = Math.max(cameraShakeRef.current, intensity);
    if (damageFlashTimeoutRef.current) clearTimeout(damageFlashTimeoutRef.current);
    damageFlashTimeoutRef.current = window.setTimeout(() => {
      setDamageFlash(false);
    }, 350);
  };

  // Latest props reference for 60fps animation loop
  const stateRef = useRef({
    ownedCars,
    activeCarId,
    activeMotorcycleId,
    activeHeliId,
    activePlaneId,
    activeWeaponId,
    activeMiscIds,
    customCharacter,
    isFirstPerson,
    showMiniMap,
    performanceMode,
    isDrivingCar,
    onEnterCar,
    onExitCar,
    activeVehicle,
    onEnterVehicle,
    onExitVehicle,
    onAltitudeUpdate,
    onInteractWithNPC,
    onOpenShop,
    onSpeedUpdate,
    initialPlayerPos,
    initialCarPos,
    initialHeliPos,
    onSavePositions,
    isMenuOpen,
    isTitleScreen,
    talkingNpcId,
    resolutionScale,
    activeFoodEffects,
    onOpenCookingMenu,
    onGrabIngredients,
    onOpenRestaurantMenu,
    onSelectWeapon,
    onEatFood,
    onQuestProgress,
    onOpenQuestModal,
    activeDisaster,
    onActiveDisasterChange,
    onFloodHeightUpdate,
    onFloodCompleted,
    policeModeEnabled,
    wantedLevel,
    onWantedLevelChange,
    onWantedDecayTimerUpdate,
    zombieModeEnabled,
    zombieMode: zombieModeEnabled,
    invincibleMode,
    npcTargetCount,
    npcCount: npcTargetCount,
    pvpConfig,
    pvpStartTrigger,
    pvpStartNonce: pvpStartTrigger,
    onPvpRemainingEnemiesChange,
    onPvpRemainingUpdate: onPvpRemainingEnemiesChange,
    hostileNpcTrigger,
    hostileNpcId: hostileNpcTrigger?.npcId,
    hostileNpcTriggerNonce: hostileNpcTrigger?.timestamp,
    onTalkToNpc: onInteractWithNPC,
    onCloseNpcChat,
    nukeTriggerSignal,
    battleCountdown,
    onBattleRoundEnd,
    platformerMode,
    platformerLevel,
    platformerNonce,
    onPlatformerLevelChange,
    onEarnMoney,
  });

  useEffect(() => {
    stateRef.current = {
      ownedCars,
      activeCarId,
      activeMotorcycleId,
      activeHeliId,
      activePlaneId,
      activeWeaponId,
      activeMiscIds,
      customCharacter,
      isFirstPerson,
      showMiniMap,
      performanceMode,
      isDrivingCar,
      onEnterCar,
      onExitCar,
      activeVehicle,
      onEnterVehicle,
      onExitVehicle,
      onAltitudeUpdate,
      onInteractWithNPC,
      onTalkToNpc: onInteractWithNPC,
      onCloseNpcChat,
      onOpenShop,
      onSpeedUpdate,
      initialPlayerPos,
      initialCarPos,
      initialHeliPos,
      onSavePositions,
      isMenuOpen,
      isTitleScreen,
      talkingNpcId,
      resolutionScale,
      activeFoodEffects,
      onOpenCookingMenu,
      onGrabIngredients,
      onOpenRestaurantMenu,
      onSelectWeapon,
      onEatFood,
      onQuestProgress,
      onOpenQuestModal,
      activeDisaster,
      onActiveDisasterChange,
      onFloodHeightUpdate,
      onFloodCompleted,
      policeModeEnabled,
      wantedLevel,
      onWantedLevelChange,
      onWantedDecayTimerUpdate,
      zombieModeEnabled,
      zombieMode: zombieModeEnabled,
      invincibleMode,
      npcTargetCount,
      npcCount: npcTargetCount,
      pvpConfig,
      pvpStartTrigger,
      pvpStartNonce: pvpStartTrigger,
      onPvpRemainingEnemiesChange,
      onPvpRemainingUpdate: onPvpRemainingEnemiesChange,
      hostileNpcTrigger,
      hostileNpcId: hostileNpcTrigger?.npcId,
      hostileNpcTriggerNonce: hostileNpcTrigger?.timestamp,
      nukeTriggerSignal,
      battleCountdown,
      onBattleRoundEnd,
      platformerMode,
      platformerLevel,
      platformerNonce,
      onPlatformerLevelChange,
      onEarnMoney: (amount: number, reason: string, worldPos?: { x: number; y: number; z: number }) => {
        onEarnMoney?.(amount, reason, worldPos);
        if (reason !== 'Died') {
          addSpatialMoneyPop(amount, reason, worldPos);
        }
      },
    };
  });

  const detonateNukeFnRef = useRef<(() => void) | null>(null);
  const makeNpcHostileByIdFnRef = useRef<((npcId: string) => void) | null>(null);
  const setupPvpArenaFnRef = useRef<(() => void) | null>(null);
  const triggerHouseExplosionRef = useRef<((x: number, z: number, y?: number, title?: string, reason?: string) => void) | null>(null);

  useEffect(() => {
    if (nukeTriggerSignal > 0 && detonateNukeFnRef.current) {
      detonateNukeFnRef.current();
    }
  }, [nukeTriggerSignal]);

  useEffect(() => {
    if (hostileNpcTrigger && makeNpcHostileByIdFnRef.current) {
      makeNpcHostileByIdFnRef.current(hostileNpcTrigger.npcId);
    }
  }, [hostileNpcTrigger]);

  useEffect(() => {
    if (pvpStartTrigger > 0 && setupPvpArenaFnRef.current) {
      setupPvpArenaFnRef.current();
    }
  }, [pvpStartTrigger]);

  // Groups and Colliders Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const houseGroupRef = useRef<THREE.Group | null>(null);
  const houseRoofMeshesRef = useRef<THREE.Mesh[]>([]);
  const cityGroupRef = useRef<THREE.Group | null>(null);
  const activeCarGroupRef = useRef<THREE.Group | null>(null);
  const activeCarSpecRef = useRef<CarVehicle | null>(null);
  const carWheelsRef = useRef<THREE.Mesh[]>([]);
  const activeMotorcycleGroupRef = useRef<THREE.Group | null>(null);
  const motorcycleWheelsRef = useRef<THREE.Object3D[]>([]);
  const motorcycleSteeringGroupRef = useRef<THREE.Group | null>(null);
  const collidersRef = useRef<BoxCollider[]>([]);

  // Claimed Home / Mailbox & Skyscraper Elevators Registry
  // Default spawn is out on the Downtown Sidewalk (never inside a building by default!)
  const claimedHomeRef = useRef<{ name: string; x: number; z: number; carX: number; carZ: number }>({
    name: 'Downtown Sidewalk',
    x: 196,
    z: 6.8,
    carX: 204.0,
    carZ: 2.8,
  });
  const mailboxesRef = useRef<
    {
      name: string;
      x: number;
      z: number;
      homeX: number;
      homeZ: number;
      carX: number;
      carZ: number;
      isExcavatorBuilt?: boolean;
    }[]
  >([]);
  const skyscrapersRef = useRef<WalkableSkyscraperData[]>([]);

  // Functions to spawn cars, motorcycles, helicopters, planes, excavator, avatars, weapons, and reset buildings
  const spawnCarFnRef = useRef<((carId: string | null) => void) | null>(null);
  const spawnMotorcycleFnRef = useRef<((motoId: string) => void) | null>(null);
  const spawnHeliFnRef = useRef<((heliId: string) => void) | null>(null);
  const spawnPlaneFnRef = useRef<((planeId: string) => void) | null>(null);
  const spawnExcavatorFnRef = useRef<(() => void) | null>(null);
  const resetBuildingsFnRef = useRef<(() => void) | null>(null);
  const rebuildAvatarFnRef = useRef<((customCfg?: CustomCharacterConfig) => void) | null>(null);
  const equipWeaponFnRef = useRef<((weaponId: string) => void) | null>(null);

  useEffect(() => {
    if (carSpawnTrigger > 0 && activeCarId && spawnCarFnRef.current) {
      spawnCarFnRef.current(activeCarId);
    }
  }, [carSpawnTrigger, activeCarId]);

  useEffect(() => {
    if (motorcycleSpawnTrigger > 0 && activeMotorcycleId && spawnMotorcycleFnRef.current) {
      spawnMotorcycleFnRef.current(activeMotorcycleId);
    }
  }, [motorcycleSpawnTrigger, activeMotorcycleId]);

  useEffect(() => {
    if (superJumpTrigger > 0) {
      humanVelYRef.current = 64.0;
      soundFX.playLowPolyExplosion();
    }
  }, [superJumpTrigger]);

  useEffect(() => {
    if (healSignal > 0) {
      const nextHealth = Math.min(100, playerHealthRef.current + healAmount);
      setPlayerHealth(nextHealth);
      playerHealthRef.current = nextHealth;
    }
  }, [healSignal, healAmount]);

  useEffect(() => {
    if (heliSpawnTrigger > 0 && activeHeliId && spawnHeliFnRef.current) {
      spawnHeliFnRef.current(activeHeliId);
    }
  }, [heliSpawnTrigger, activeHeliId]);

  useEffect(() => {
    if (planeSpawnTrigger > 0 && activePlaneId && spawnPlaneFnRef.current) {
      spawnPlaneFnRef.current(activePlaneId);
    }
  }, [planeSpawnTrigger, activePlaneId]);


  useEffect(() => {
    if (resetBuildingsSignal > 0 && resetBuildingsFnRef.current) {
      resetBuildingsFnRef.current();
    }
  }, [resetBuildingsSignal]);

  useEffect(() => {
    if (rebuildAvatarFnRef.current) {
      rebuildAvatarFnRef.current(customCharacter);
    }
  }, [customCharacter]);

  useEffect(() => {
    if (equipWeaponFnRef.current && activeWeaponId) {
      equipWeaponFnRef.current(activeWeaponId);
    }
  }, [activeWeaponId]);

  // Vehicles Physics State
  const carPhysicsRef = useRef<CarPhysics>({
    x: initialCarPos?.x ?? 201.5,
    z: initialCarPos?.z ?? 14,
    rotationY: initialCarPos?.rotationY ?? 0,
    speed: 0,
    steering: 0,
  });

  const motorcyclePhysicsRef = useRef<MotorcyclePhysics>({
    x: 204.5,
    z: 14,
    rotationY: 0,
    speed: 0,
    steering: 0,
    leanAngle: 0,
    wheeliePitch: 0,
  });

  const helicopterPhysicsRef = useRef<HelicopterPhysics>({
    x: initialHeliPos?.x ?? 125,
    y: initialHeliPos?.y ?? 0.18,
    z: initialHeliPos?.z ?? -50,
    rotationY: initialHeliPos?.rotationY ?? 0,
    speed: 0,
    verticalSpeed: 0,
    tiltPitch: 0,
    tiltRoll: 0,
    rotorSpeed: 0,
  });

  const planePhysicsRef = useRef<PlanePhysics>({
    x: 125,
    y: 0.15,
    z: -115,
    rotationY: 0,
    speed: 0,
    verticalSpeed: 0,
    pitch: 0,
    roll: 0,
    propSpeed: 0,
  });
  const planeQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());

  const excavatorPhysicsRef = useRef<ExcavatorPhysics>({
    x: 188,
    y: 0,
    z: 14,
    rotationY: 0,
    speed: 0,
    steering: 0,
    boomAngle: 0,
    armAngle: 0,
    bucketAngle: 0,
  });

  // Vehicle Meshes Refs
  const activeHeliGroupRef = useRef<THREE.Group | null>(null);
  const mainRotorRef = useRef<THREE.Group | null>(null);
  const tailRotorRef = useRef<THREE.Group | null>(null);
  const heliBeaconLightRef = useRef<THREE.PointLight | null>(null);

  const activePlaneGroupRef = useRef<THREE.Group | null>(null);
  const planePropellerRef = useRef<THREE.Group | null>(null);
  const planeAfterburnersRef = useRef<THREE.Mesh[]>([]);

  const activeExcavatorGroupRef = useRef<THREE.Group | null>(null);
  const excavatorBoomRef = useRef<THREE.Group | null>(null);
  const excavatorArmRef = useRef<THREE.Group | null>(null);
  const excavatorBucketRef = useRef<THREE.Group | null>(null);
  const hasSpawnedCarRef = useRef(false);
  const hasSpawnedMotorcycleRef = useRef(false);
  const hasSpawnedHeliRef = useRef(false);
  const hasSpawnedPlaneRef = useRef(false);
  const hasSpawnedExcavatorRef = useRef(false);

  // Player Vertical Jump Physics
  const humanVelYRef = useRef<number>(0);
  const humanVelXZRef = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));

  // Human Position State (Default Spawn: Out on the Sidewalk in Downtown)
  const humanPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(
      initialPlayerPos ? initialPlayerPos[0] : 196,
      0,
      initialPlayerPos ? initialPlayerPos[2] : 6.8
    )
  );
  const humanRotRef = useRef<number>(0);

  const getActivePlayerWorldPos = (): { x: number; y: number; z: number } => {
    const curV = stateRef.current.activeVehicle ?? (stateRef.current.isDrivingCar ? 'car' : null);
    if (curV === 'car') {
      return { x: carPhysicsRef.current.x, y: 0.5, z: carPhysicsRef.current.z };
    }
    if (curV === 'motorcycle') {
      return { x: motorcyclePhysicsRef.current.x, y: 0.5, z: motorcyclePhysicsRef.current.z };
    }
    if (curV === 'helicopter') {
      return { x: helicopterPhysicsRef.current.x, y: helicopterPhysicsRef.current.y, z: helicopterPhysicsRef.current.z };
    }
    if (curV === 'plane') {
      return { x: planePhysicsRef.current.x, y: planePhysicsRef.current.y, z: planePhysicsRef.current.z };
    }
    return { x: humanPosRef.current.x, y: humanPosRef.current.y, z: humanPosRef.current.z };
  };

  // Camera Orbit & Zoom State (0.0 aligns directly with North-South avenues and downtown skyline)
  const cameraYawRef = useRef<number>(0.0);
  const cameraPitchRef = useRef<number>(0.35);
  const smoothCamYawRef = useRef<number>(0.0);
  const smoothCamPitchRef = useRef<number>(0.35);
  const smoothVehicleRotYRef = useRef<number>(0.0);
  const carCameraYawRef = useRef<number>(0.0);
  const prevVehicleModeRef = useRef<string | null>(null);
  const crashedVehicleTypeRef = useRef<string | null>(null);
  const cameraDistRef = useRef<number>(11.0);
  const isInsideBuildingRef = useRef<boolean>(false);
  const respawnProtectionTimerRef = useRef<number>(0);

  // Handle Vehicle Respawn Signal
  useEffect(() => {
    if (!respawnSignal || respawnSignal === 0) return;

    const px = humanPosRef.current.x;
    const pz = humanPosRef.current.z;

    // Reset Car right next to Player (never at the house!)
    spawnCarFnRef.current?.(activeCarId);
    carPhysicsRef.current.x = px + 4.2;
    carPhysicsRef.current.z = pz + 1.5;
    carPhysicsRef.current.rotationY = humanRotRef.current;
    carPhysicsRef.current.speed = 0;
    carPhysicsRef.current.steering = 0;
    if (activeCarGroupRef.current) {
      activeCarGroupRef.current.position.set(px + 4.2, 0, pz + 1.5);
      activeCarGroupRef.current.rotation.y = humanRotRef.current;
    }

    // Reset Helicopter to Airport Helipad
    helicopterPhysicsRef.current.x = 125;
    helicopterPhysicsRef.current.y = 0.18;
    helicopterPhysicsRef.current.z = -50;
    helicopterPhysicsRef.current.rotationY = 0;
    helicopterPhysicsRef.current.speed = 0;
    helicopterPhysicsRef.current.verticalSpeed = 0;
    helicopterPhysicsRef.current.tiltPitch = 0;
    helicopterPhysicsRef.current.tiltRoll = 0;
    if (activeHeliGroupRef.current) {
      activeHeliGroupRef.current.position.set(125, 0.18, -50);
      activeHeliGroupRef.current.rotation.set(0, 0, 0);
    }

    // Reset Airplane to Airport Runway
    planePhysicsRef.current.x = 125;
    planePhysicsRef.current.y = 0.15;
    planePhysicsRef.current.z = -115;
    planePhysicsRef.current.rotationY = 0;
    planePhysicsRef.current.speed = 0;
    planePhysicsRef.current.verticalSpeed = 0;
    planePhysicsRef.current.pitch = 0;
    planePhysicsRef.current.roll = 0;
    if (activePlaneGroupRef.current) {
      activePlaneGroupRef.current.position.set(125, 0.15, -115);
      activePlaneGroupRef.current.rotation.set(0, 0, 0);
    }

    // Reset Excavator near Home
    excavatorPhysicsRef.current.x = -18;
    excavatorPhysicsRef.current.y = 0;
    excavatorPhysicsRef.current.z = 22;
    excavatorPhysicsRef.current.rotationY = Math.PI / 2;
    excavatorPhysicsRef.current.speed = 0;
    if (activeExcavatorGroupRef.current) {
      activeExcavatorGroupRef.current.position.set(-18, 0, 22);
      activeExcavatorGroupRef.current.rotation.set(0, Math.PI / 2, 0);
    }
  }, [respawnSignal]);

  // Main Scene Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7ab8f5);
    sceneRef.current = scene;

    // Rich Natural Blue Sky Dome (10x Larger World radius = 9500m, horizon matched to 0x7ab8f5 fog)
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 32;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d')!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0.0, '#0c3b87');
    skyGrad.addColorStop(0.22, '#1d63c2');
    skyGrad.addColorStop(0.36, '#488fe0');
    skyGrad.addColorStop(0.46, '#7ab8f5');
    skyGrad.addColorStop(0.54, '#7ab8f5');
    skyGrad.addColorStop(1.0, '#7ab8f5');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 32, 512);
    const skyDomeTex = new THREE.CanvasTexture(skyCanvas);
    skyDomeTex.colorSpace = THREE.SRGBColorSpace;

    const skyDomeGeo = new THREE.SphereGeometry(9500, 32, 24);
    const skyDomeMat = new THREE.MeshBasicMaterial({
      map: skyDomeTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
    scene.add(skyDome);

    const sunVec = new THREE.Vector3();
    scene.fog = new THREE.FogExp2(0x7ab8f5, 0.00078);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.2, 2400);
    cameraRef.current = camera;
    camera.position.set(-6, 12, 18);

    const isPerfInitial = Boolean(stateRef.current.performanceMode);
    const isHighOrBalancedInitial = resolutionScale === 'high' || resolutionScale === 'balanced';
    const renderer = new THREE.WebGLRenderer({
      antialias: true, // Hardware MSAA smooths geometry edges in high/balanced modes
      powerPreference: 'high-performance',
      precision: 'highp', // Ensures 24-bit/32-bit depth float precision to completely eliminate Z-fighting
      stencil: false,
      depth: true,
    });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    renderer.setPixelRatio(
      calculateCappedPixelRatio(isPerfInitial, resolutionScale)
    );
    renderer.shadowMap.enabled = !isPerfInitial && resolutionScale !== 'extra-low';
    renderer.shadowMap.type = isHighOrBalancedInitial ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;

    container.innerHTML = '';
    const isPixelatedInitial = resolutionScale !== 'high';
    if (isPixelatedInitial) {
      renderer.domElement.style.imageRendering = 'pixelated';
      renderer.domElement.style.setProperty('image-rendering', 'pixelated');
      renderer.domElement.style.setProperty('image-rendering', '-moz-crisp-edges');
      renderer.domElement.style.setProperty('image-rendering', 'crisp-edges');
      renderer.domElement.classList.add('pixelated-canvas');
    } else {
      renderer.domElement.style.imageRendering = 'auto';
      renderer.domElement.style.setProperty('image-rendering', 'auto');
      renderer.domElement.classList.remove('pixelated-canvas');
    }
    container.appendChild(renderer.domElement);

    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    const hemiLight = new THREE.HemisphereLight(0x8ec5fc, 0x1e4620, 0.72);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.85);
    sunLight.position.set(45, 80, 40);
    sunLight.castShadow = !isPerfInitial && resolutionScale !== 'extra-low';
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 350;
    const d = 110;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.05;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.35);
    fillLight.position.set(-45, 50, -40);
    scene.add(fillLight);

    const starsCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 7800 + Math.random() * 400;
      const sinPhi = Math.sin(phi);
      starPos[i * 3] = r * sinPhi * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 100;
      starPos[i * 3 + 2] = r * sinPhi * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    const cloudsGroup = new THREE.Group();
    cloudsGroupRef.current = cloudsGroup;
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 256;
    cloudCanvas.height = 256;
    const cCtx = cloudCanvas.getContext('2d')!;
    const cGrad = cCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    cGrad.addColorStop(0.5, 'rgba(245, 250, 255, 0.3)');
    cGrad.addColorStop(0.8, 'rgba(225, 240, 255, 0.08)');
    cGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    cCtx.fillStyle = cGrad;
    cCtx.fillRect(0, 0, 256, 256);
    const cloudTex = new THREE.CanvasTexture(cloudCanvas);

    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      fog: true,
      toneMapped: false,
    });

    for (let c = 0; c < 40; c++) {
      const cx = (Math.random() - 0.5) * 4000;
      const cz = (Math.random() - 0.5) * 4000;
      const cy = 260 + Math.random() * 80;
      const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(220, 160), cloudMat);
      cMesh.rotation.x = -Math.PI / 2;
      cMesh.rotation.z = Math.random() * Math.PI;
      cMesh.position.set(cx, cy, cz);
      cloudsGroup.add(cMesh);
    }
    scene.add(cloudsGroup);

    const applyLightingPreset = (preset: 'golden' | 'day' | 'sunset' | 'night') => {
      let elevation = 58;
      let azimuth = -25;

      if (preset === 'golden' || preset === 'day') {
        elevation = 58;
        azimuth = -25;
        sunLight.color.setHex(0xfffaf0);
        sunLight.intensity = 1.85;
        sunLight.castShadow = true;
        hemiLight.color.setHex(0x8ec5fc);
        hemiLight.groundColor.setHex(0x1e4620);
        hemiLight.intensity = 0.72;
        fillLight.color.setHex(0x60a5fa);
        fillLight.intensity = 0.35;
        if (scene.fog) {
          (scene.fog as THREE.FogExp2).color.setHex(0x7ab8f5);
          (scene.fog as THREE.FogExp2).density = 0.00018;
        }
        renderer.toneMappingExposure = 0.88;
        starMat.opacity = 0;
        cloudMat.opacity = 0.45;
        cloudMat.color.setHex(0xffffff);
      } else if (preset === 'sunset') {
        elevation = 16;
        azimuth = -75;
        sunLight.color.setHex(0xf97316);
        sunLight.intensity = 1.6;
        sunLight.castShadow = true;
        hemiLight.color.setHex(0xfdba74);
        hemiLight.groundColor.setHex(0x451a03);
        hemiLight.intensity = 0.6;
        fillLight.color.setHex(0xc084fc);
        fillLight.intensity = 0.3;
        if (scene.fog) {
          (scene.fog as THREE.FogExp2).color.setHex(0xfb923c);
          (scene.fog as THREE.FogExp2).density = 0.0003;
        }
        renderer.toneMappingExposure = 0.85;
        starMat.opacity = 0.1;
        cloudMat.opacity = 0.5;
        cloudMat.color.setHex(0xfdba74);
      } else if (preset === 'night') {
        elevation = -18;
        azimuth = -80;
        sunLight.color.setHex(0x60a5fa);
        sunLight.intensity = 0.4;
        sunLight.castShadow = false;
        hemiLight.color.setHex(0x1e293b);
        hemiLight.groundColor.setHex(0x020617);
        hemiLight.intensity = 0.5;
        fillLight.color.setHex(0x38bdf8);
        fillLight.intensity = 0.25;
        if (scene.fog) {
          (scene.fog as THREE.FogExp2).color.setHex(0x040814);
          (scene.fog as THREE.FogExp2).density = 0.0004;
        }
        renderer.toneMappingExposure = 0.85;
        starMat.opacity = 0.95;
        cloudMat.opacity = 0.25;
        cloudMat.color.setHex(0x1e293b);
      }

      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth);
      sunVec.setFromSphericalCoords(1, phi, theta);
      sunLight.position.set(sunVec.x * 120, Math.max(15, sunVec.y * 120), sunVec.z * 120);
    };

    applyLightingPresetFnRef.current = applyLightingPreset;
    applyLightingPreset(activeLightingPresetRef.current);

    // Weather Simulation & Particle Engine (Permanently disabled & set to clear sunny sky per user request)
    const weatherSys = new WeatherSystem();
    weatherSys.autoCycleEnabled = false;
    weatherSys.setWeatherImmediate('sunny');
    weatherSystemRef.current = weatherSys;
    scene.add(weatherSys.weatherGroup);

    // Weather Atmospheric Palette Blending Constants
    const rainSkyColor = new THREE.Color(0x4a5d73);
    const rainSunColor = new THREE.Color(0xc2d4e8);
    const rainHemiSky = new THREE.Color(0x5d738c);
    const rainHemiGround = new THREE.Color(0x1f2824);
    const rainDomeTint = new THREE.Color(0x425263);
    const rainCloudColor = new THREE.Color(0x384554);

    const snowSkyColor = new THREE.Color(0x94a9bf);
    const snowSunColor = new THREE.Color(0xeef4fc);
    const snowHemiSky = new THREE.Color(0x9db3c9);
    const snowHemiGround = new THREE.Color(0x4a5460);
    const snowDomeTint = new THREE.Color(0x8ea2b8);
    const snowCloudColor = new THREE.Color(0xdae4f0);

    // 20-Minute Continuous Day & Night Cycle (1200 seconds per full 24-hour cycle)
    const DAY_NIGHT_CYCLE_SECONDS = 1200.0;
    const daySkyColor = new THREE.Color(0x7ab8f5);
    const sunsetSkyColor = new THREE.Color(0xf97316);
    const nightSkyColor = new THREE.Color(0x04091a);
    const daySunColor = new THREE.Color(0xfffaf0);
    const sunsetSunColor = new THREE.Color(0xfb923c);
    const nightMoonColor = new THREE.Color(0x60a5fa);
    const dayHemiSky = new THREE.Color(0x8ec5fc);
    const sunsetHemiSky = new THREE.Color(0xfdba74);
    const nightHemiSky = new THREE.Color(0x1e293b);
    const dayHemiGround = new THREE.Color(0x1e4620);
    const sunsetHemiGround = new THREE.Color(0x451a03);
    const nightHemiGround = new THREE.Color(0x020617);
    const dayDomeTint = new THREE.Color(0xffffff);
    const sunsetDomeTint = new THREE.Color(0xfdba74);
    const nightDomeTint = new THREE.Color(0x0b1528);

    const updateDayNightCycle = (_elapsedSec: number, focusX: number, focusZ: number, isPerfMode: boolean, focusY: number = 0) => {
      // Permanent Bright Sunny Daytime (User requested: Turn off nighttime and sunsets, remove sun setting, remove weather)
      sunLight.color.copy(daySunColor);
      sunLight.intensity = 1.95;
      hemiLight.color.copy(dayHemiSky);
      hemiLight.groundColor.copy(dayHemiGround);
      hemiLight.intensity = 0.78;
      scene.background = daySkyColor;
      if (scene.fog) {
        (scene.fog as THREE.FogExp2).color.copy(daySkyColor);
      }
      skyDomeMat.color.copy(dayDomeTint);
      starMat.opacity = 0;
      cloudMat.color.copy(dayDomeTint);
      cloudMat.opacity = 0.45;
      renderer.toneMappingExposure = 0.95;

      // Turn off weather system particle effects (rain, snow, lightning)
      if (weatherSys.weatherGroup.visible) {
        weatherSys.weatherGroup.visible = false;
      }

      const castShadowsNow = !isPerfMode;
      if (sunLight.castShadow !== castShadowsNow) {
        sunLight.castShadow = castShadowsNow;
      }
      sunLight.position.set(
        focusX + 48,
        focusY + 96,
        focusZ + 42
      );
      sunLight.target.position.set(focusX, focusY, focusZ);
      sunLight.target.updateMatrixWorld();
    };

    const applyPerformanceMode = (enabled: boolean) => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setPixelRatio(calculateCappedPixelRatio(enabled, stateRef.current.resolutionScale));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = !enabled;
      sunLight.castShadow = !enabled;
      renderer.shadowMap.needsUpdate = true;
      weatherSys.setPerformanceMode(enabled);
      cloudsGroup.visible = !enabled;
    };
    applyPerformanceModeFnRef.current = applyPerformanceMode;
    if (stateRef.current.performanceMode) {
      applyPerformanceMode(true);
    }

    // Master Colliders Registry
    const colliders: BoxCollider[] = [];
    const registerCollider = (
      minX: number,
      maxX: number,
      minZ: number,
      maxZ: number,
      name: string,
      isBuilding: boolean = false,
      maxY: number = 4.5,
      buildingId?: string
    ) => {
      colliders.push({
        minX: Math.min(minX, maxX),
        maxX: Math.max(minX, maxX),
        minZ: Math.min(minZ, maxZ),
        maxZ: Math.max(minZ, maxZ),
        maxY,
        name,
        isBuilding,
        buildingId,
        destroyed: false,
      });
    };

    mailboxesRef.current = [];
    skyscrapersRef.current = [];
    destructibleBuildingsRef.current = [];
    const buildingDoors: AnimatedBuildingDoor[] = [];

    // Ground Plane: Horizon-Spanning Seamless Terrain (24,000m x 24,000m so map edges are never visible!)
    const groundTex = getRealisticGrassTexture();
    groundTex.repeat.set(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.88,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: 8,
      polygonOffsetUnits: 8,
    });
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.1;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Dedicated Flat Grassland Map coordinates for Battle Mode at (3200, 3200) — seamlessly covered by the 24,000m groundMesh
    const PVP_ARENA_X = 3200;
    const PVP_ARENA_Z = 3200;
    let savedCityPlayerPos: { x: number; y: number; z: number } | null = null;
    let lastKnownCityPos: { x: number; y: number; z: number } = { x: 196, y: 0, z: 6.8 };

    // =========================================================================
    // 1. PAVED GREY CEMENT CITY SURFACES & COMPACT METROPOLITAN STREET GRID
    // =========================================================================
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x262930,
      roughness: 0.86,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const stripeYellow = new THREE.MeshBasicMaterial({ 
      color: 0xfacc15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const stripeWhite = new THREE.MeshBasicMaterial({ 
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const sidewalkTex = getSidewalkTexture();
    sidewalkTex.repeat.set(2, 2);
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      color: 0xd1d5db,
      roughness: 0.78,
      metalness: 0.04,
    });

    const cementCanvas = document.createElement('canvas');
    cementCanvas.width = 256;
    cementCanvas.height = 256;
    const cemCtx = cementCanvas.getContext('2d')!;
    cemCtx.fillStyle = '#8b929a';
    cemCtx.fillRect(0, 0, 256, 256);
    cemCtx.fillStyle = '#848b93';
    cemCtx.fillRect(0, 0, 128, 128);
    cemCtx.fillStyle = '#90979f';
    cemCtx.fillRect(128, 96, 128, 160);
    cemCtx.strokeStyle = '#767d85';
    cemCtx.lineWidth = 3;
    cemCtx.strokeRect(2, 2, 252, 252);
    cemCtx.beginPath();
    cemCtx.moveTo(128, 0);
    cemCtx.lineTo(128, 256);
    cemCtx.moveTo(0, 128);
    cemCtx.lineTo(256, 128);
    cemCtx.stroke();
    const cityCementTex = new THREE.CanvasTexture(cementCanvas);
    cityCementTex.wrapS = THREE.RepeatWrapping;
    cityCementTex.wrapT = THREE.RepeatWrapping;
    cityCementTex.repeat.set(16, 24);
    cityCementTex.colorSpace = THREE.SRGBColorSpace;

    const cityCementMat = new THREE.MeshStandardMaterial({
      map: cityCementTex,
      color: 0x949ba3,
      roughness: 0.85,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    });

    // Removed East and West concrete cement districts to keep downtown grass ground like the rest of the map per user request

    const roadRects: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
    const isPointOnRoad = (x: number, z: number, margin: number = 6) => {
      for (const r of roadRects) {
        if (
          x >= r.minX - margin &&
          x <= r.maxX + margin &&
          z >= r.minZ - margin &&
          z <= r.maxZ + margin
        ) {
          return true;
        }
      }
      return false;
    };
    const isNearAnyRoad = isPointOnRoad;

    const isRectNearAnyRoad = (cx: number, cz: number, w: number, d: number, margin: number = 7) => {
      const bMinX = cx - w * 0.5 - margin;
      const bMaxX = cx + w * 0.5 + margin;
      const bMinZ = cz - d * 0.5 - margin;
      const bMaxZ = cz + d * 0.5 + margin;
      for (const r of roadRects) {
        if (bMaxX >= r.minX && bMinX <= r.maxX && bMaxZ >= r.minZ && bMinZ <= r.maxZ) {
          return true;
        }
      }
      return false;
    };

    // =========================================================================
    // SEAMLESS METROPOLITAN & SUBURBAN ROAD NETWORK + CONNECTED SIDEWALKS
    // - Zero gap between roads and sidewalks (sidewalks sit 100% flush with asphalt edges)
    // - Zero gap between sidewalks at every intersection corner
    // - Consistent road pattern: Yellow dashed centerlines + Solid white edge lines + Crosswalks
    // =========================================================================
    sidewalkBoxesRef.current = [];
    const HW_X = 8.5;
    const HW_W = 11.0; // Spans X = 3.0 to X = 14.0
    const HW_WEST_EDGE = HW_X - HW_W * 0.5; // 3.0
    const HW_EAST_EDGE = HW_X + HW_W * 0.5; // 14.0
    const AVE_W = 9.0; // Spans ax - 4.5 to ax + 4.5
    const AVE_HALF = AVE_W * 0.5; // 4.5
    const SW_W = 2.6; // Uniform 2.6m wide concrete sidewalks
    const SW_H = 0.14;
    const SW_Y = 0.07;

    const mainRoadMesh = new THREE.Mesh(new THREE.PlaneGeometry(HW_W, 1200), roadMat);
    mainRoadMesh.rotation.x = -Math.PI / 2;
    mainRoadMesh.position.set(HW_X, 0.04, 0);
    mainRoadMesh.receiveShadow = true;
    mainRoadMesh.renderOrder = 2;
    scene.add(mainRoadMesh);

    roadRects.push({
      minX: HW_WEST_EDGE - SW_W,
      maxX: HW_EAST_EDGE + SW_W,
      minZ: -600,
      maxZ: 600,
    });

    const crossStreetZs = [
      -500, -420, -340, -260, -180, -100,
      0,
      100, 180, 260, 340, 420, 500,
    ];
    const eastStreetStartX = HW_EAST_EDGE; // 14.0
    const eastAvenueXs = [95, 255, 385, 515, 645];
    const westAvenueXs = [-645, -515, -385, -255, -95];
    const cityAvenueXs = [...westAvenueXs, ...eastAvenueXs];

    // City limits: streets terminate exactly at the outermost avenues/cross-streets, sealed with continuous sidewalk
    const eastStreetEndX = 645 + AVE_HALF; // 649.5 (flush with outer edge of East Avenue)
    const westStreetStartX = -645 - AVE_HALF; // -649.5 (flush with outer edge of West Avenue)
    const aveMinZ = -500 - 8.5 * 0.5; // -504.25 (flush with outer edge of South Cross-Street)
    const aveMaxZ = 500 + 8.5 * 0.5; // 504.25 (flush with outer edge of North Cross-Street)

    const yellowDashMats: THREE.Matrix4[] = [];
    const whiteEdgeMats: THREE.Matrix4[] = [];
    const zebraWhiteMats: THREE.Matrix4[] = [];
    const swSegMats: THREE.Matrix4[] = [];
    const roadSegmentMats: THREE.Matrix4[] = [];

    // Batched Stop Sign Pole (Grey) & Octagonal Stop Sign Plate (Red)
    const stopPostGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.82, 8);
    stopPostGeo.translate(0, 0.91, 0);
    const stopPostMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.4 });
    const stopPlateGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.03, 8);
    stopPlateGeo.rotateX(Math.PI / 2);
    stopPlateGeo.translate(0, 2.15, 0);
    const stopSignMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const stopSignMats: THREE.Matrix4[] = [];

    const roadDummy = new THREE.Object3D();
    const roadPropsGroup = new THREE.Group();
    scene.add(roadPropsGroup);

    const addYellowCenterDashesZ = (x: number, z1: number, z2: number) => {
      for (let z = z1 + 5.0; z <= z2 - 5.0; z += 13.0) {
        roadDummy.position.set(x, 0.07, z);
        roadDummy.rotation.set(-Math.PI / 2, 0, 0);
        roadDummy.scale.set(0.24, 5.2, 1);
        roadDummy.updateMatrix();
        yellowDashMats.push(roadDummy.matrix.clone());
      }
    };

    const addYellowCenterDashesX = (z: number, x1: number, x2: number) => {
      for (let x = x1 + 5.0; x <= x2 - 5.0; x += 13.0) {
        roadDummy.position.set(x, 0.07, z);
        roadDummy.rotation.set(-Math.PI / 2, 0, 0);
        roadDummy.scale.set(5.2, 0.24, 1);
        roadDummy.updateMatrix();
        yellowDashMats.push(roadDummy.matrix.clone());
      }
    };

    const addWhiteEdgeLinesZ = (westEdgeX: number, eastEdgeX: number, z1: number, z2: number) => {
      const len = z2 - z1;
      if (len <= 1.0) return;
      const midZ = (z1 + z2) * 0.5;
      for (const lx of [westEdgeX + 0.36, eastEdgeX - 0.36]) {
        roadDummy.position.set(lx, 0.065, midZ);
        roadDummy.rotation.set(-Math.PI / 2, 0, 0);
        roadDummy.scale.set(0.16, len, 1);
        roadDummy.updateMatrix();
        whiteEdgeMats.push(roadDummy.matrix.clone());
      }
    };

    const addWhiteEdgeLinesX = (southEdgeZ: number, northEdgeZ: number, x1: number, x2: number) => {
      const len = x2 - x1;
      if (len <= 1.0) return;
      const midX = (x1 + x2) * 0.5;
      for (const lz of [southEdgeZ + 0.36, northEdgeZ - 0.36]) {
        roadDummy.position.set(midX, 0.065, lz);
        roadDummy.rotation.set(-Math.PI / 2, 0, 0);
        roadDummy.scale.set(len, 0.16, 1);
        roadDummy.updateMatrix();
        whiteEdgeMats.push(roadDummy.matrix.clone());
      }
    };

    const addSidewalkBox = (minX: number, maxX: number, minZ: number, maxZ: number) => {
      if (maxX <= minX || maxZ <= minZ) return;
      const midX = (minX + maxX) * 0.5;
      const midZ = (minZ + maxZ) * 0.5;
      roadDummy.position.set(midX, SW_Y, midZ);
      roadDummy.rotation.set(0, 0, 0);
      roadDummy.scale.set(maxX - minX, SW_H, maxZ - minZ);
      roadDummy.updateMatrix();
      swSegMats.push(roadDummy.matrix.clone());
      sidewalkBoxesRef.current.push({
        minX: Math.min(minX, maxX),
        maxX: Math.max(minX, maxX),
        minZ: Math.min(minZ, maxZ),
        maxZ: Math.max(minZ, maxZ),
      });
    };

    const isPointOnSidewalk = (x: number, z: number, margin: number = 0.45): boolean => {
      const boxes = sidewalkBoxesRef.current;
      for (let i = 0; i < boxes.length; i++) {
        const sb = boxes[i];
        if (
          x >= sb.minX - margin &&
          x <= sb.maxX + margin &&
          z >= sb.minZ - margin &&
          z <= sb.maxZ + margin
        ) {
          return true;
        }
      }
      return false;
    };

    const clampToNearestSidewalk = (x: number, z: number): { x: number; z: number } => {
      const boxes = sidewalkBoxesRef.current;
      if (boxes.length === 0) return { x, z };
      if (isPointOnSidewalk(x, z, 0.2)) return { x, z };
      let bestDist = Infinity;
      let bestX = x;
      let bestZ = z;
      for (let i = 0; i < boxes.length; i++) {
        const sb = boxes[i];
        const cx = THREE.MathUtils.clamp(x, sb.minX, sb.maxX);
        const cz = THREE.MathUtils.clamp(z, sb.minZ, sb.maxZ);
        const d = Math.hypot(x - cx, z - cz);
        if (d < bestDist) {
          bestDist = d;
          bestX = cx;
          bestZ = cz;
        }
      }
      return { x: bestX, z: bestZ };
    };

    const addWalkableZone = (minX: number, maxX: number, minZ: number, maxZ: number) => {
      if (maxX <= minX || maxZ <= minZ) return;
      sidewalkBoxesRef.current.push({
        minX: Math.min(minX, maxX),
        maxX: Math.max(minX, maxX),
        minZ: Math.min(minZ, maxZ),
        maxZ: Math.max(minZ, maxZ),
      });
    };

    // Helper to add a full 4-way Zebra Crosswalk on all 4 approaches (North, South, East, West) of any intersection
    const addFourWayIntersectionCrosswalk = (ix: number, nsWidth: number, sz: number, ewWidth: number) => {
      const nsHalf = nsWidth * 0.5;
      const ewHalf = ewWidth * 0.5;
      const cwOffset = SW_W * 0.5; // 1.3m from curb edge, centered with the 2.6m sidewalks

      // 1. East & West Crosswalks (crossing the East-West Cross-Street)
      const ewHalfSpan = Math.floor((ewHalf - 0.6) / 1.2) * 1.2;
      for (let cwZ = -ewHalfSpan; cwZ <= ewHalfSpan + 0.001; cwZ += 1.2) {
        // West side of intersection (only if road continues West into city)
        if (ix > -640) {
          roadDummy.position.set(ix - nsHalf - cwOffset, 0.075, sz + cwZ);
          roadDummy.rotation.set(-Math.PI / 2, 0, 0);
          roadDummy.scale.set(2.2, 0.48, 1);
          roadDummy.updateMatrix();
          zebraWhiteMats.push(roadDummy.matrix.clone());
        }

        // East side of intersection (only if road continues East into city)
        if (ix < 640) {
          roadDummy.position.set(ix + nsHalf + cwOffset, 0.075, sz + cwZ);
          roadDummy.rotation.set(-Math.PI / 2, 0, 0);
          roadDummy.scale.set(2.2, 0.48, 1);
          roadDummy.updateMatrix();
          zebraWhiteMats.push(roadDummy.matrix.clone());
        }
      }

      // Add walkable crosswalk zones for East & West crosswalks across the East-West street (no 3D sidewalk mesh on road!)
      if (ix > -640) {
        addWalkableZone(ix - nsHalf - SW_W - 0.35, ix - nsHalf + 0.35, sz - ewHalf - 0.4, sz + ewHalf + 0.4);
      }
      if (ix < 640) {
        addWalkableZone(ix + nsHalf - 0.35, ix + nsHalf + SW_W + 0.35, sz - ewHalf - 0.4, sz + ewHalf + 0.4);
      }

      // 2. North & South Crosswalks (crossing the North-South Highway / Avenue)
      const nsHalfSpan = Math.floor((nsHalf - 0.6) / 1.2) * 1.2;
      for (let cwX = -nsHalfSpan; cwX <= nsHalfSpan + 0.001; cwX += 1.2) {
        // South side of intersection (only if road continues South into city)
        if (sz > -490) {
          roadDummy.position.set(ix + cwX, 0.075, sz - ewHalf - cwOffset);
          roadDummy.rotation.set(-Math.PI / 2, 0, 0);
          roadDummy.scale.set(0.48, 2.2, 1);
          roadDummy.updateMatrix();
          zebraWhiteMats.push(roadDummy.matrix.clone());
        }

        // North side of intersection (only if road continues North into city)
        if (sz < 490) {
          roadDummy.position.set(ix + cwX, 0.075, sz + ewHalf + cwOffset);
          roadDummy.rotation.set(-Math.PI / 2, 0, 0);
          roadDummy.scale.set(0.48, 2.2, 1);
          roadDummy.updateMatrix();
          zebraWhiteMats.push(roadDummy.matrix.clone());
        }
      }

      // Add walkable crosswalk zones for North & South crosswalks across the North-South avenue/highway (no 3D sidewalk mesh on road!)
      if (sz > -490) {
        addWalkableZone(ix - nsHalf - 0.4, ix + nsHalf + 0.4, sz - ewHalf - SW_W - 0.35, sz - ewHalf + 0.35);
      }
      if (sz < 490) {
        addWalkableZone(ix - nsHalf - 0.4, ix + nsHalf + 0.4, sz + ewHalf - 0.35, sz + ewHalf + SW_W + 0.35);
      }
    };

    // 1. Main Highway Sidewalks & Road Markings (Segmented cleanly at Cross-Streets with 0.0m gap!)
    let prevEastHwZ = -600;
    let prevWestHwZ = -600;
    for (const sz of crossStreetZs) {
      const stHalf = (sz === 0 ? 11.0 : 8.5) * 0.5;
      const segEndZ = sz - stHalf;
      if (segEndZ > prevEastHwZ) {
        // East Highway Sidewalk (flush from X = 14.0 to X = 16.6)
        addSidewalkBox(HW_EAST_EDGE, HW_EAST_EDGE + SW_W, prevEastHwZ, segEndZ);
        const lineStartZ = prevEastHwZ === -600 ? prevEastHwZ : prevEastHwZ + SW_W;
        const lineEndZ = segEndZ - SW_W;
        if (lineEndZ > lineStartZ) {
          addYellowCenterDashesZ(HW_X, lineStartZ, lineEndZ);
          addWhiteEdgeLinesZ(HW_WEST_EDGE, HW_EAST_EDGE, lineStartZ, lineEndZ);
        }
      }
      prevEastHwZ = sz + stHalf;

      if (segEndZ > prevWestHwZ) {
        addSidewalkBox(HW_WEST_EDGE - SW_W, HW_WEST_EDGE, prevWestHwZ, segEndZ);
      }
      prevWestHwZ = sz + stHalf;
    }
    addSidewalkBox(HW_EAST_EDGE, HW_EAST_EDGE + SW_W, prevEastHwZ, 600);
    addSidewalkBox(HW_WEST_EDGE - SW_W, HW_WEST_EDGE, prevWestHwZ, 600);
    addYellowCenterDashesZ(HW_X, prevEastHwZ + SW_W, 600);
    addWhiteEdgeLinesZ(HW_WEST_EDGE, HW_EAST_EDGE, prevEastHwZ + SW_W, 600);

    // 2. East-West Cross-Streets, Flush Sidewalks & Consistent Markings
    for (const sz of crossStreetZs) {
      const stW = sz === 0 ? 11.0 : 8.5;
      const stHalf = stW * 0.5;

      // East Cross-Street Asphalt (X: 14.0 to 670.0)
      const eastLen = eastStreetEndX - eastStreetStartX;
      const eastCenter = (eastStreetStartX + eastStreetEndX) * 0.5;
      roadDummy.position.set(eastCenter, 0.04, sz);
      roadDummy.rotation.set(-Math.PI / 2, 0, 0);
      roadDummy.scale.set(eastLen, stW, 1);
      roadDummy.updateMatrix();
      roadSegmentMats.push(roadDummy.matrix.clone());

      roadRects.push({
        minX: eastStreetStartX,
        maxX: eastStreetEndX,
        minZ: sz - stHalf - SW_W,
        maxZ: sz + stHalf + SW_W,
      });

      // West Cross-Street Asphalt (X: -670.0 to 3.0)
      const westEnd = HW_WEST_EDGE;
      const westLen = westEnd - westStreetStartX;
      const westCenter = (westStreetStartX + westEnd) * 0.5;
      roadDummy.position.set(westCenter, 0.04, sz);
      roadDummy.rotation.set(-Math.PI / 2, 0, 0);
      roadDummy.scale.set(westLen, stW, 1);
      roadDummy.updateMatrix();
      roadSegmentMats.push(roadDummy.matrix.clone());

      roadRects.push({
        minX: westStreetStartX,
        maxX: westEnd,
        minZ: sz - stHalf - SW_W,
        maxZ: sz + stHalf + SW_W,
      });

      // Full 4-way crosswalks at Main Highway intersection
      addFourWayIntersectionCrosswalk(HW_X, HW_W, sz, stW);

      // Full 4-way crosswalks at EVERY City Avenue intersection
      for (const ax of cityAvenueXs) {
        addFourWayIntersectionCrosswalk(ax, AVE_W, sz, stW);
      }

      if (Math.abs(sz) <= 500) {
        const stopXEast = HW_EAST_EDGE + SW_W + 0.45;
        const stopZNorth = sz + stHalf + SW_W + 0.45;
        roadDummy.position.set(stopXEast, 0, stopZNorth);
        roadDummy.rotation.set(0, -Math.PI / 2, 0);
        roadDummy.scale.set(1, 1, 1);
        roadDummy.updateMatrix();
        stopSignMats.push(roadDummy.matrix.clone());
        registerCollider(stopXEast - 0.25, stopXEast + 0.25, stopZNorth - 0.25, stopZNorth + 0.25, 'Stop Sign', false, 2.5);

        const stopXWest = HW_WEST_EDGE - SW_W - 0.45;
        const stopZSouth = sz - stHalf - SW_W - 0.45;
        roadDummy.position.set(stopXWest, 0, stopZSouth);
        roadDummy.rotation.set(0, Math.PI / 2, 0);
        roadDummy.scale.set(1, 1, 1);
        roadDummy.updateMatrix();
        stopSignMats.push(roadDummy.matrix.clone());
        registerCollider(stopXWest - 0.25, stopXWest + 0.25, stopZSouth - 0.25, stopZSouth + 0.25, 'Stop Sign', false, 2.5);

        for (const ax of cityAvenueXs) {
          const cornerNE_X = ax + AVE_HALF + SW_W + 0.45;
          const cornerNE_Z = sz + stHalf + SW_W + 0.45;
          roadDummy.position.set(cornerNE_X, 0, cornerNE_Z);
          roadDummy.rotation.set(0, 0, 0);
          roadDummy.scale.set(1, 1, 1);
          roadDummy.updateMatrix();
          stopSignMats.push(roadDummy.matrix.clone());
          registerCollider(cornerNE_X - 0.25, cornerNE_X + 0.25, cornerNE_Z - 0.25, cornerNE_Z + 0.25, 'Stop Sign', false, 2.5);

          const cornerSW_X = ax - AVE_HALF - SW_W - 0.45;
          const cornerSW_Z = sz - stHalf - SW_W - 0.45;
          roadDummy.position.set(cornerSW_X, 0, cornerSW_Z);
          roadDummy.rotation.set(0, Math.PI, 0);
          roadDummy.scale.set(1, 1, 1);
          roadDummy.updateMatrix();
          stopSignMats.push(roadDummy.matrix.clone());
          registerCollider(cornerSW_X - 0.25, cornerSW_X + 0.25, cornerSW_Z - 0.25, cornerSW_Z + 0.25, 'Stop Sign', false, 2.5);
        }
      }

      // East Cross-Street Sidewalks & Road Lines (Connecting corner-to-corner from Highway outer sidewalk X=16.6 to each Avenue outer sidewalk ax±7.1)
      let curRoadX = HW_EAST_EDGE; // 14.0
      let curSwX = HW_EAST_EDGE + SW_W; // 16.6 (Exact outer edge of East Highway Sidewalk!)
      for (const gapX of [...eastAvenueXs, eastStreetEndX]) {
        const isLast = gapX === eastStreetEndX;
        const roadEndX = isLast ? eastStreetEndX : gapX - AVE_HALF;
        const swEndX = isLast ? eastStreetEndX : gapX - AVE_HALF - SW_W;
        const lineStartX = curRoadX + SW_W;
        const lineEndX = isLast ? roadEndX : roadEndX - SW_W;
        if (lineEndX > lineStartX) {
          addYellowCenterDashesX(sz, lineStartX, lineEndX);
          addWhiteEdgeLinesX(sz - stHalf, sz + stHalf, lineStartX, lineEndX);
        }
        if (swEndX > curSwX) {
          // South & North sidewalks flush with cross-street edges (sz ± stHalf) and flush with N-S avenue sidewalks at corners!
          addSidewalkBox(curSwX, swEndX, sz - stHalf - SW_W, sz - stHalf);
          addSidewalkBox(curSwX, swEndX, sz + stHalf, sz + stHalf + SW_W);
        }
        curRoadX = gapX + AVE_HALF;
        curSwX = gapX + AVE_HALF + SW_W;
      }
      // Outer East Boundary: seal the end of cross-street with a continuous sidewalk cap
      addSidewalkBox(eastStreetEndX, eastStreetEndX + SW_W, sz - stHalf - SW_W, sz + stHalf + SW_W);

      // West Cross-Street Sidewalks & Road Lines (Connecting corner-to-corner across all West Avenues to West Highway Sidewalk X=0.4)
      let curWRoadX = westStreetStartX;
      let curWSwX = westStreetStartX;
      const westSwEnd = HW_WEST_EDGE - SW_W; // 0.4 (Exact outer edge of West Highway Sidewalk!)
      for (const gapX of [...westAvenueXs, westEnd]) {
        const isLast = gapX === westEnd;
        const roadEndX = isLast ? westEnd : gapX - AVE_HALF;
        const swEndX = isLast ? westSwEnd : gapX - AVE_HALF - SW_W;
        const lineStartX = curWRoadX === westStreetStartX ? curWRoadX : curWRoadX + SW_W;
        const lineEndX = roadEndX - SW_W;
        if (lineEndX > lineStartX) {
          addYellowCenterDashesX(sz, lineStartX, lineEndX);
          addWhiteEdgeLinesX(sz - stHalf, sz + stHalf, lineStartX, lineEndX);
        }
        if (swEndX > curWSwX) {
          addSidewalkBox(curWSwX, swEndX, sz - stHalf - SW_W, sz - stHalf);
          addSidewalkBox(curWSwX, swEndX, sz + stHalf, sz + stHalf + SW_W);
        }
        curWRoadX = gapX + AVE_HALF;
        curWSwX = gapX + AVE_HALF + SW_W;
      }
      // Outer West Boundary: seal the end of cross-street with a continuous sidewalk cap
      addSidewalkBox(westStreetStartX - SW_W, westStreetStartX, sz - stHalf - SW_W, sz + stHalf + SW_W);
    }

    // 3. North-South City Avenues, Flush Sidewalks & Consistent Road Markings
    for (const ax of cityAvenueXs) {
      roadRects.push({
        minX: ax - AVE_HALF - SW_W,
        maxX: ax + AVE_HALF + SW_W,
        minZ: aveMinZ,
        maxZ: aveMaxZ,
      });

      let curZ = aveMinZ;
      for (const sz of [...crossStreetZs, aveMaxZ]) {
        const isEnd = sz === aveMaxZ;
        const stHalf = isEnd ? 0 : (sz === 0 ? 11.0 : 8.5) * 0.5;
        const endZ = sz - stHalf;
        if (endZ > curZ) {
          const segLenZ = endZ - curZ;
          const midZ = (curZ + endZ) * 0.5;
          // Batched N-S Avenue Asphalt Segment
          roadDummy.position.set(ax, 0.04, midZ);
          roadDummy.rotation.set(-Math.PI / 2, 0, 0);
          roadDummy.scale.set(AVE_W, segLenZ, 1);
          roadDummy.updateMatrix();
          roadSegmentMats.push(roadDummy.matrix.clone());

          // Consistent Yellow Dashed Centerline + White Curb Edge Lines on every Avenue (stopping cleanly at crosswalks)!
          const lineStartZ = curZ === aveMinZ ? curZ : curZ + SW_W;
          const lineEndZ = isEnd ? endZ : endZ - SW_W;
          if (lineEndZ > lineStartZ) {
            addYellowCenterDashesZ(ax, lineStartZ, lineEndZ);
            addWhiteEdgeLinesZ(ax - AVE_HALF, ax + AVE_HALF, lineStartZ, lineEndZ);
          }

          // Flush West & East Avenue Sidewalks (running all the way to cross-street asphalt edges sz ± stHalf so corners connect 100% seamlessly!)
          addSidewalkBox(ax - AVE_HALF - SW_W, ax - AVE_HALF, curZ, endZ);
          addSidewalkBox(ax + AVE_HALF, ax + AVE_HALF + SW_W, curZ, endZ);
        }
        curZ = sz + stHalf;
      }

      // Outer North & South Boundaries: seal the ends of avenues with continuous sidewalk caps
      addSidewalkBox(ax - AVE_HALF - SW_W, ax + AVE_HALF + SW_W, aveMaxZ, aveMaxZ + SW_W);
      addSidewalkBox(ax - AVE_HALF - SW_W, ax + AVE_HALF + SW_W, aveMinZ - SW_W, aveMinZ);
    }

    // Render all road markings, asphalt & sidewalks in batched InstancedMeshes with frustumCulled = false (Reduces hundreds of draw calls to 5!)
    const allRoadsInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), roadMat, roadSegmentMats.length);
    allRoadsInst.frustumCulled = false;
    roadSegmentMats.forEach((m, idx) => allRoadsInst.setMatrixAt(idx, m));
    allRoadsInst.receiveShadow = true;
    allRoadsInst.renderOrder = 2;
    scene.add(allRoadsInst);

    const allStopPostsInst = new THREE.InstancedMesh(stopPostGeo, stopPostMat, stopSignMats.length);
    allStopPostsInst.frustumCulled = false;
    stopSignMats.forEach((m, idx) => allStopPostsInst.setMatrixAt(idx, m));
    scene.add(allStopPostsInst);

    const allStopSignsInst = new THREE.InstancedMesh(stopPlateGeo, stopSignMat, stopSignMats.length);
    allStopSignsInst.frustumCulled = false;
    stopSignMats.forEach((m, idx) => allStopSignsInst.setMatrixAt(idx, m));
    scene.add(allStopSignsInst);

    const allYellowDashesInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), stripeYellow, yellowDashMats.length);
    allYellowDashesInst.frustumCulled = false;
    yellowDashMats.forEach((m, idx) => allYellowDashesInst.setMatrixAt(idx, m));
    allYellowDashesInst.renderOrder = 3;
    scene.add(allYellowDashesInst);

    const allWhiteEdgesInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), stripeWhite, whiteEdgeMats.length);
    allWhiteEdgesInst.frustumCulled = false;
    whiteEdgeMats.forEach((m, idx) => allWhiteEdgesInst.setMatrixAt(idx, m));
    allWhiteEdgesInst.renderOrder = 3;
    scene.add(allWhiteEdgesInst);

    const allSidewalksInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), sidewalkMat, swSegMats.length);
    allSidewalksInst.frustumCulled = false;
    swSegMats.forEach((m, idx) => allSidewalksInst.setMatrixAt(idx, m));
    allSidewalksInst.receiveShadow = true;
    allSidewalksInst.renderOrder = 5;
    scene.add(allSidewalksInst);

    const allZebraInst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), stripeWhite, zebraWhiteMats.length);
    allZebraInst.frustumCulled = false;
    zebraWhiteMats.forEach((m, idx) => allZebraInst.setMatrixAt(idx, m));
    allZebraInst.renderOrder = 4;
    scene.add(allZebraInst);

    const origSidewalksArray = new Float32Array(allSidewalksInst.instanceMatrix.array);
    const origWhiteEdgesArray = new Float32Array(allWhiteEdgesInst.instanceMatrix.array);
    const initialRoadRectsCount = roadRects.length;

    // =========================================================================
    // 2. HOUSE GROUP & 2D SPATIAL HASH GRID FOR COLLIDERS
    // =========================================================================
    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    houseGroupRef.current = houseGroup;
    houseRoofMeshesRef.current = [];

    const COLLIDER_CELL_SIZE = 40;
    const colliderSpatialGrid = new Map<string, BoxCollider[]>();
    const addColliderToSpatialGrid = (col: BoxCollider) => {
      const minCellX = Math.floor(col.minX / COLLIDER_CELL_SIZE);
      const maxCellX = Math.floor(col.maxX / COLLIDER_CELL_SIZE);
      const minCellZ = Math.floor(col.minZ / COLLIDER_CELL_SIZE);
      const maxCellZ = Math.floor(col.maxZ / COLLIDER_CELL_SIZE);
      for (let gx = minCellX; gx <= maxCellX; gx++) {
        for (let gz = minCellZ; gz <= maxCellZ; gz++) {
          const key = `${gx}_${gz}`;
          let cell = colliderSpatialGrid.get(key);
          if (!cell) {
            cell = [];
            colliderSpatialGrid.set(key, cell);
          }
          cell.push(col);
        }
      }
    };

    // =========================================================================
    // 3. DENSE CITY (20 HOUSE TYPES ON UNIFORM GRID + FAMOUS SKYSCRAPERS CONNECTING BOTH DOWNTOWNS) & FOREST
    // =========================================================================
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);
    cityGroupRef.current = cityGroup;

    mailboxesRef.current = [];
    skyscrapersRef.current = [];
    destructibleBuildingsRef.current = [];
    let bldgCounter = 1;

    const BUILDING_CHUNK_SIZE = 120;
    const buildingSpatialGrid = new Map<string, DestructibleBuilding[]>();
    const destructibleBuildingsMap = new Map<string, DestructibleBuilding>();
    const registerDestructibleBuilding = (bldg: DestructibleBuilding) => {
      destructibleBuildingsRef.current.push(bldg);
      destructibleBuildingsMap.set(bldg.id, bldg);
      const minGx = Math.floor((bldg.cx - bldg.w * 0.5) / BUILDING_CHUNK_SIZE);
      const maxGx = Math.floor((bldg.cx + bldg.w * 0.5) / BUILDING_CHUNK_SIZE);
      const minGz = Math.floor((bldg.cz - bldg.d * 0.5) / BUILDING_CHUNK_SIZE);
      const maxGz = Math.floor((bldg.cz + bldg.d * 0.5) / BUILDING_CHUNK_SIZE);
      for (let gx = minGx; gx <= maxGx; gx++) {
        for (let gz = minGz; gz <= maxGz; gz++) {
          const key = `${gx}_${gz}`;
          let cell = buildingSpatialGrid.get(key);
          if (!cell) {
            cell = [];
            buildingSpatialGrid.set(key, cell);
          }
          cell.push(bldg);
        }
      }
    };

    const disableBuildingColliders = (bldgId: string, bldgObj?: DestructibleBuilding) => {
      const b = bldgObj || destructibleBuildingsMap.get(bldgId);
      for (const col of collidersRef.current) {
        // Destroy if ID matches, or if it's within the proximity of the building (safety fallback)
        let shouldDestroy = col.buildingId === bldgId;
        if (!shouldDestroy && b) {
          const colMidX = (col.minX + col.maxX) * 0.5;
          const colMidZ = (col.minZ + col.maxZ) * 0.5;
          if (
            Math.abs(colMidX - b.cx) <= b.w * 0.5 + 2.8 &&
            Math.abs(colMidZ - b.cz) <= b.d * 0.5 + 3.2
          ) {
            shouldDestroy = true;
          }
        }
        
        if (shouldDestroy) {
          col.destroyed = true;
        }
      }
      for (const sky of skyscrapersRef.current) {
        if (sky.id === bldgId) {
          sky.destroyed = true;
        }
      }
    };

    const sharedMbPostGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8);
    sharedMbPostGeo.translate(0, 0.55, 0);
    const sharedMbPostMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const sharedMbBoxGeo = new THREE.BoxGeometry(0.36, 0.28, 0.52);
    sharedMbBoxGeo.translate(0, 1.15, 0);
    const sharedMbBoxMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.35 });

    const createMailbox = (
      mx: number,
      mz: number,
      houseName: string,
      homeX: number,
      homeZ: number,
      parentGrp: THREE.Object3D = cityGroup,
      carX?: number,
      carZ?: number,
      buildingId?: string,
      isExcavatorBuilt?: boolean
    ) => {
      const safeCarX = carX ?? mx + 3.8;
      const safeCarZ = carZ ?? mz - 2.2;
      const mbGrp = new THREE.Group();
      mbGrp.position.set(mx, 0, mz);
      const mbPost = new THREE.Mesh(sharedMbPostGeo, sharedMbPostMat);
      const mbBox = new THREE.Mesh(sharedMbBoxGeo, sharedMbBoxMat);
      mbGrp.add(mbPost, mbBox);
      mbGrp.userData = { isMailbox: true, houseName, homeX, homeZ, carX: safeCarX, carZ: safeCarZ };
      parentGrp.add(mbGrp);
      const mbCol: BoxCollider = {
        minX: mx - 0.24,
        maxX: mx + 0.24,
        minZ: mz - 0.24,
        maxZ: mz + 0.24,
        minY: 0,
        maxY: 1.35,
        name: `${houseName} Mailbox`,
        isBuilding: false,
        buildingId,
        isExcavatorBuilt,
      };
      colliders.push(mbCol);
      addColliderToSpatialGrid(mbCol);
      mailboxesRef.current.push({
        name: houseName,
        x: mx,
        z: mz,
        homeX,
        homeZ,
        carX: safeCarX,
        carZ: safeCarZ,
        isExcavatorBuilt,
      });
    };

    // Helper to Spawn Specific, Realistic, Walkable Commercial Stores (Grocery, Gas Station, Restaurant, Diner, Cafe, Hardware, Dealerships)
    const spawnSpecificStore = (
      archetype: CommercialArchetype,
      name: string,
      cx: number,
      cz: number,
      shopType?: string
    ) => {
      if (isRectNearAnyRoad(cx, cz, 20, 18, 2.5)) return;
      for (const existing of destructibleBuildingsRef.current) {
        if (!existing.destroyed && Math.abs(existing.cx - cx) < 21 && Math.abs(existing.cz - cz) < 19) {
          return;
        }
      }
      const buildingId = `bldg-comm-${bldgCounter++}`;
      const builtStore = buildSpecificCommercialBuilding({
        buildingId,
        archetype,
        name,
        cx,
        cz,
        shopType,
      });
      cityGroup.add(builtStore.group);
      buildingDoors.push(builtStore.doorData);
      builtStore.colliders.forEach((c) => {
        colliders.push(c);
        addColliderToSpatialGrid(c);
      });
      if (builtStore.isGrocery) {
        groceriesRef.current.push({ x: cx, z: cz });
      }
      createMailbox(
        builtStore.mailboxPos.x,
        builtStore.mailboxPos.z,
        name,
        builtStore.mailboxPos.homeX,
        builtStore.mailboxPos.homeZ,
        builtStore.group,
        builtStore.mailboxPos.carX,
        builtStore.mailboxPos.carZ,
        buildingId
      );
      registerDestructibleBuilding({
        id: buildingId,
        name,
        cx,
        cz,
        w: builtStore.w,
        d: builtStore.d,
        h: builtStore.h,
        group: builtStore.group,
        destroyed: false,
        structuralDamage: 0,
        isGrocery: archetype === 'grocery',
        isRestaurant: archetype === 'restaurant',
        isDiner: archetype === 'diner',
        isCafe: archetype === 'cafe',
        isHardware: archetype === 'hardware',
        isGasStation: archetype === 'gas_station',
      });
    };

    // Specific Realistic Stores & Vehicle Dealerships near Main Road & Commercial District (Misc Store removed!)
    spawnSpecificStore('car_dealership', 'Auto Motors Dealership', 38, -34, 'cars');
    spawnSpecificStore('motorcycle_dealership', 'Apex Moto & Superbike Showroom', 38, -124, 'motorcycles');
    spawnSpecificStore('heli_showroom', 'AeroFlight Helicopter Showroom', 38, 34, 'helicopters');
    spawnSpecificStore('plane_hangar', 'Supersonic Jet & Plane Hangar', 38, -68, 'planes');
    spawnSpecificStore('grocery', 'FreshMart Organic Grocery & Bakery', 38, 68);
    spawnSpecificStore('gas_station', 'Starlight Fuel & Service Station', 38, -148);
    spawnSpecificStore('restaurant', 'Bella Notte Italian Trattoria', 66, -34);
    spawnSpecificStore('diner', 'Route 66 Classic Diner & Grill', 66, 34);
    spawnSpecificStore('cafe', 'Roast & Bean Artisan Coffeehouse', 66, 68);
    spawnSpecificStore('hardware', 'Apex Hardware & Lumber Co.', 66, -68);

    // Helper to Spawn Any of the 20 Detailed Architectural House Types
    // When built by an Excavator (isExcavatorBuilt = true), colliders are registered into colliderSpatialGrid so they are 100% solid for players & vehicles, while allowing the excavator itself to pass through without getting stuck!
    const spawnDetailedHouseOnGrid = (
      typeIdx: number,
      name: string,
      cx: number,
      cz: number,
      isExcavatorBuilt: boolean = false
    ) => {
      if (!isExcavatorBuilt && isRectNearAnyRoad(cx, cz, 20, 18, 2.5)) return;
      // Avoid overlapping existing destructible buildings
      for (const existing of destructibleBuildingsRef.current) {
        if (!existing.destroyed && Math.abs(existing.cx - cx) < 21 && Math.abs(existing.cz - cz) < 19) {
          return;
        }
      }
      const buildingId = `bldg-house-${bldgCounter++}`;
      const built = buildDetailedHouse20Types({
        buildingId,
        typeIndex: typeIdx,
        name,
        cx,
        cz,
      });
      cityGroup.add(built.group);
      buildingDoors.push(built.doorData);
      built.roofMeshes.forEach((rm) => houseRoofMeshesRef.current.push(rm));
      built.colliders.forEach((c) => {
        const colWithFlag: BoxCollider = { ...c, isExcavatorBuilt };
        colliders.push(colWithFlag);
        addColliderToSpatialGrid(colWithFlag);
      });
      if (built.stovePos) {
        stovesRef.current.push({ ...built.stovePos, isExcavatorBuilt });
      }
      createMailbox(
        built.mailboxPos.x,
        built.mailboxPos.z,
        name,
        built.mailboxPos.homeX,
        built.mailboxPos.homeZ,
        built.interiorStairsGroup,
        built.mailboxPos.carX,
        built.mailboxPos.carZ,
        buildingId,
        isExcavatorBuilt
      );
      registerDestructibleBuilding({
        id: buildingId,
        name,
        cx,
        cz,
        w: built.w,
        d: built.d,
        h: built.h,
        group: built.group,
        interiorStairsGroup: built.interiorStairsGroup,
        destroyed: false,
        structuralDamage: 0,
        isExcavatorBuilt,
      });
    };

    // Helper to Spawn Realistic Mid-Rise Apartment / High-Rise Condo Buildings (5 to 15 Floors)
    const spawnApartmentBuilding = (
      name: string,
      cx: number,
      cz: number,
      w: number,
      d: number,
      stories: number,
      styleIdx: number,
      isExcavatorBuilt: boolean = false
    ) => {
      if (!isExcavatorBuilt && isRectNearAnyRoad(cx, cz, w + 2, d + 2, 2.5)) return;
      for (const existing of destructibleBuildingsRef.current) {
        const padX = isExcavatorBuilt ? 2 : 8;
        const padZ = isExcavatorBuilt ? 2 : 12;
        if (
          !existing.destroyed &&
          Math.abs(existing.cx - cx) < (existing.w + w) * 0.5 + padX &&
          Math.abs(existing.cz - cz) < (existing.d + d) * 0.5 + padZ
        ) {
          return;
        }
      }
      const buildingId = `bldg-apt-${bldgCounter++}`;
      const builtApt = buildApartmentOrHighRiseBuilding({
        buildingId,
        name,
        cx,
        cz,
        w,
        d,
        stories,
        styleIndex: styleIdx,
      });
      builtApt.group.visible = true;
      if (builtApt.interiorStairsGroup) builtApt.interiorStairsGroup.visible = true;
      cityGroup.add(builtApt.group);
      buildingDoors.push(builtApt.doorData);
      builtApt.colliders.forEach((c) => {
        const colWithFlag: BoxCollider = { ...c, isExcavatorBuilt };
        colliders.push(colWithFlag);
        addColliderToSpatialGrid(colWithFlag);
      });
      skyscrapersRef.current.push(builtApt.skyscraperData);
      createMailbox(
        builtApt.mailboxPos.x,
        builtApt.mailboxPos.z,
        name,
        builtApt.mailboxPos.homeX,
        builtApt.mailboxPos.homeZ,
        builtApt.group,
        builtApt.mailboxPos.carX,
        builtApt.mailboxPos.carZ,
        buildingId,
        isExcavatorBuilt
      );
      registerDestructibleBuilding({
        id: buildingId,
        name,
        cx,
        cz,
        w,
        d,
        h: builtApt.h,
        group: builtApt.group,
        interiorStairsGroup: builtApt.interiorStairsGroup,
        destroyed: false,
        structuralDamage: 0,
        isExcavatorBuilt,
      });
    };

    // =========================================================================
    // 3B. WALKABLE MULTI-FLOOR SKYSCRAPERS WITH STAIRCASES & FAMOUS WORLD LANDMARKS
    // =========================================================================
    let skyStyleCounter = 0;
    const spawnWalkableStairSkyscraper = (
      name: string,
      cx: number,
      cz: number,
      w: number,
      d: number,
      numFloors: number,
      colorHex: number,
      isLaLandmarkTower: boolean = false,
      landmarkType?: FamousLandmarkType,
      isExcavatorBuilt: boolean = false,
      customStyleIdx?: number
    ) => {
      if (!isExcavatorBuilt && isRectNearAnyRoad(cx, cz, w + 2, d + 2, 2.5)) return;
      for (const existing of destructibleBuildingsRef.current) {
        const padX = isExcavatorBuilt ? 2 : 8;
        const padZ = isExcavatorBuilt ? 2 : 12;
        if (
          !existing.destroyed &&
          Math.abs(existing.cx - cx) < (existing.w + w) * 0.5 + padX &&
          Math.abs(existing.cz - cz) < (existing.d + d) * 0.5 + padZ
        ) {
          return;
        }
      }
      const buildingId = `bldg-sky-${bldgCounter++}`;
      const styleIdx = customStyleIdx !== undefined ? customStyleIdx : skyStyleCounter++;
      const builtSky = buildWalkableSkyscraperWithStairs({
        buildingId,
        name,
        cx,
        cz,
        w,
        d,
        numFloors,
        towerColorHex: colorHex,
        isLaLandmarkTower,
        landmarkType,
        styleIndex: styleIdx,
      });
      builtSky.group.visible = true;
      if (builtSky.interiorStairsGroup) builtSky.interiorStairsGroup.visible = true;
      cityGroup.add(builtSky.group);
      buildingDoors.push(builtSky.doorData);
      builtSky.colliders.forEach((c) => {
        const colWithFlag: BoxCollider = { ...c, isExcavatorBuilt };
        colliders.push(colWithFlag);
        addColliderToSpatialGrid(colWithFlag);
      });
      skyscrapersRef.current.push(builtSky.skyscraperData);
      createMailbox(
        builtSky.mailboxPos.x,
        builtSky.mailboxPos.z,
        name,
        builtSky.mailboxPos.homeX,
        builtSky.mailboxPos.homeZ,
        builtSky.group,
        builtSky.mailboxPos.carX,
        builtSky.mailboxPos.carZ,
        buildingId,
        isExcavatorBuilt
      );
      registerDestructibleBuilding({
        id: buildingId,
        name,
        cx,
        cz,
        w,
        d,
        h: numFloors * 4.5 + (isLaLandmarkTower || landmarkType ? 58.0 : 16.0),
        group: builtSky.group,
        interiorStairsGroup: builtSky.interiorStairsGroup,
        destroyed: false,
        structuralDamage: 0,
        isExcavatorBuilt,
      });
    };

    // 1. FAMOUS WORLD LANDMARK SKYSCRAPERS CONNECTING BOTH DOWNTOWNS:
    //    - Wilshire Grand LA Landmark Tower (58 Floors) at East Downtown Core (196, 34)
    //    - Ping An Finance Center (Tallest Building in Shenzhen · 66 Floors) at (132, 34)
    //    - One World Trade Center (New York · 62 Floors) at Central Bridge (-56, -34)
    //    - Salesforce Tower (San Francisco · 54 Floors) at Central Bridge (-152, -34)
    //    - Willis (Sears) Tower (Chicago · 56 Floors) at Central Bridge (-84, 34)
    //    - Shanghai Tower (60 Floors) at (66, -124)
    //    - Empire State Building (New York · 52 Floors) at West Connector (-216, 34)
    const downtownCenterX = 196;
    const downtownCenterZ = 34;
    spawnWalkableStairSkyscraper(
      'Wilshire Grand LA Landmark Tower (58 Floors)',
      downtownCenterX,
      downtownCenterZ,
      30,
      28,
      58,
      0xcbd5e1,
      true,
      'wilshire_grand'
    );
    spawnWalkableStairSkyscraper(
      'Ping An Finance Center · Shenzhen (66 Floors · Tallest Tower)',
      132,
      34,
      30,
      28,
      66,
      0xcbd5e1,
      false,
      'ping_an'
    );
    spawnWalkableStairSkyscraper(
      'One World Trade Center (62 Floors · Freedom Tower)',
      -56,
      -34,
      28,
      28,
      62,
      0xe2e8f0,
      false,
      'one_wtc'
    );
    spawnWalkableStairSkyscraper(
      'Salesforce Tower (54 Floors · Grand Obelisk)',
      -152,
      -34,
      28,
      26,
      54,
      0xe2e8f0,
      false,
      'salesforce'
    );
    spawnWalkableStairSkyscraper(
      'Willis Sears Tower (56 Floors · Bundled Tube Landmark)',
      -84,
      34,
      28,
      26,
      56,
      0x334155,
      false,
      'willis_tower'
    );
    spawnWalkableStairSkyscraper(
      'Shanghai Megatower (60 Floors · Tiered Sky-Lobby Tower)',
      66,
      -124,
      28,
      26,
      60,
      0xcbd5e1,
      false,
      'shanghai_tower'
    );
    spawnWalkableStairSkyscraper(
      'Empire State Building (52 Floors · Art Deco Spire)',
      -216,
      34,
      28,
      26,
      52,
      0xd6d3d1,
      false,
      'empire_state'
    );
    // Fill in the old downtown starter house spot (-20, 34) and (-20, -34) with towering walkable skyscrapers!
    spawnWalkableStairSkyscraper(
      'Central Plaza Landmark Skyscraper (52 Floors)',
      -20,
      34,
      24,
      22,
      52,
      0x94a3b8,
      false,
      'one_wtc'
    );
    spawnWalkableStairSkyscraper(
      'West Gateway Skyscraper (48 Floors)',
      -20,
      -34,
      24,
      22,
      48,
      0xcbd5e1,
      false,
      'salesforce'
    );

    // STREAMLINED HIGH-PERFORMANCE METROPOLITAN GRID (EXPANDED SUBURBS):
    const skyColors = [0xcbd5e1, 0xe2e8f0, 0x94a3b8, 0x64748b, 0x475569, 0x9ca3af, 0x334155, 0x3f3f46];
    const eastBlockXs = [38, 66, 132, 164, 196, 228, 292, 324, 356, 420, 452, 484, 548, 580, 612];
    const westBlockXs = [-612, -580, -548, -484, -452, -420, -356, -324, -292, -228, -196, -164, -132, -66, -38];
    const cityBlockXs = [...westBlockXs, ...eastBlockXs];
    const cityBlockZs = [
      -484, -452, -388, -364,
      -308, -284,
      -228, -204,
      -148, -124,
      -68, -34,
      34, 68,
      124, 148,
      204, 228,
      284, 308,
      364, 388, 452, 484,
    ];

    const commTypesCycle: { archetype: CommercialArchetype; title: string; shopType?: string }[] = [
      { archetype: 'grocery', title: 'FreshMart Supermarket & Produce' },
      { archetype: 'gas_station', title: 'Pacific Fuel & Service Station' },
      { archetype: 'restaurant', title: 'Bella Notte Trattoria & Grill' },
      { archetype: 'diner', title: 'Sunset Blvd Classic Diner' },
      { archetype: 'cafe', title: 'Artisan Roast Bakery & Cafe' },
      { archetype: 'hardware', title: 'Metro Hardware & Building Supply' },
      { archetype: 'motorcycle_dealership', title: 'Apex Moto & Superbike Showroom', shopType: 'motorcycles' },
    ];

    const westCoreX = -184;
    const westCoreZ = 0;

    const famousLandmarkCycle: { type: FamousLandmarkType; label: string }[] = [
      { type: 'one_wtc', label: 'One World Trade Center Tower' },
      { type: 'ping_an', label: 'Ping An Shenzhen Megatower' },
      { type: 'salesforce', label: 'Salesforce Obelisk Tower' },
      { type: 'willis_tower', label: 'Willis Bundled-Tube Tower' },
      { type: 'shanghai_tower', label: 'Shanghai Spiral Tower' },
      { type: 'empire_state', label: 'Empire State Art Deco Tower' },
    ];

    let skyIdx = 0;
    let aptIdx = 0;
    let commIdx = 0;
    let hCount = 0;

    for (let gxIdx = 0; gxIdx < cityBlockXs.length; gxIdx++) {
      for (let gzIdx = 0; gzIdx < cityBlockZs.length; gzIdx++) {
        const bx = cityBlockXs[gxIdx];
        const bz = cityBlockZs[gzIdx];

        if (bx === downtownCenterX && bz === downtownCenterZ) continue;

        const distEastCore = Math.hypot(bx - downtownCenterX, bz - 0);
        const distWestCore = Math.hypot(bx - westCoreX, bz - westCoreZ);
        // Distance to the Downtown Connector Bridge linking West Downtown (-352, 0) and East Downtown (196, 0)
        const clampedBridgeX = Math.max(westCoreX, Math.min(downtownCenterX, bx));
        const distConnectorBridge = Math.hypot(bx - clampedBridgeX, bz - 0);
        const distNearestCore = Math.min(distEastCore, distWestCore, distConnectorBridge);

        if (distNearestCore < 115) {
          // CONNECTED DOWNTOWN SKYSCRAPER CORRIDOR (Includes Famous Landmark Designs connecting both downtowns!):
          const distRatio = Math.min(1.0, distNearestCore / 115);
          const stories = Math.max(18, Math.round(48 - distRatio * 26) + ((gxIdx + gzIdx) % 5));
          const sColor = skyColors[skyIdx % skyColors.length];
          const isBridgeLandmark = bx >= -280 && bx <= 164 && Math.abs(bz) <= 130 && skyIdx % 3 === 0;
          const lmSpec = isBridgeLandmark ? famousLandmarkCycle[skyIdx % famousLandmarkCycle.length] : undefined;
          spawnWalkableStairSkyscraper(
            lmSpec
              ? `${lmSpec.label} #${skyIdx + 1} (${stories} Floors)`
              : `Metro Skyscraper Tower #${skyIdx + 1} (${stories} Floors)`,
            bx,
            bz,
            24 + (skyIdx % 3) * 2,
            21 + ((skyIdx + 1) % 3) * 2,
            stories,
            sColor,
            false,
            lmSpec?.type
          );
          skyIdx++;
        } else if (distNearestCore < 185 && (gxIdx + gzIdx) % 5 === 0) {
          // COMMERCIAL STORES
          const spec = commTypesCycle[commIdx % commTypesCycle.length];
          spawnSpecificStore(spec.archetype, `${spec.title} #${commIdx + 1}`, bx, bz, spec.shopType);
          commIdx++;
        } else if (distNearestCore < 190) {
          // HIGH-RISE & MID-RISE URBAN BELT (6 to 15 Stories in Blue-Gray, Grey, Light Grey & Dark Grey)
          const aptRatio = Math.min(1.0, Math.max(0, (distNearestCore - 115) / 75));
          const stories = Math.max(6, Math.round(15 - aptRatio * 8));
          const aptNames = [
            'Wilshire High-Rise Tower',
            'Sunset Glass Condominiums',
            'Grand Avenue High-Rise Lofts',
            'Pacific Tinted Plaza Residences',
            'Biltmore Metropolitan High-Rise',
            'Century Skyline Suites',
          ];
          const aptTitle = aptNames[aptIdx % aptNames.length];
          spawnApartmentBuilding(
            `${aptTitle} #${aptIdx + 1} (${stories} Stories)`,
            bx,
            bz,
            21,
            18,
            stories,
            aptIdx
          );
          aptIdx++;
        } else if ((gxIdx + gzIdx) % 14 === 0) {
          // Neighborhood corner store / diner / gas station
          const spec = commTypesCycle[commIdx % commTypesCycle.length];
          spawnSpecificStore(spec.archetype, `${spec.title} #${commIdx + 1}`, bx, bz, spec.shopType);
          commIdx++;
        } else {
          // EXPANDED RESIDENTIAL NEIGHBORHOODS: Hundreds of Detailed Architectural Homes with Lawns & Driveways!
          const archetypeIdx = (gxIdx * 7 + gzIdx * 13 + hCount * 3) % 20;
          const archetypeTitle = HOUSE_ARCHETYPE_NAMES[archetypeIdx];
          spawnDetailedHouseOnGrid(archetypeIdx, `${archetypeTitle} #${hCount + 1}`, bx, bz, false);
          hCount++;
        }
      }
    }

    // Default starter spawn is OUT ON THE SIDEWALK IN DOWNTOWN (never inside a building by default!)
    claimedHomeRef.current = {
      name: 'Downtown Sidewalk',
      x: 196,
      z: 6.8,
      carX: 204.0,
      carZ: 2.8,
    };
    if (
      Math.hypot(humanPosRef.current.x - 610, humanPosRef.current.z - 29) < 35 ||
      Math.hypot(humanPosRef.current.x - 596, humanPosRef.current.z - 31) < 35 ||
      Math.hypot(humanPosRef.current.x - -10.5, humanPosRef.current.z - 7.5) < 35 ||
      Math.hypot(humanPosRef.current.x - 196, humanPosRef.current.z - 14) < 12
    ) {
      humanPosRef.current.set(196, 0, 6.8);
      carPhysicsRef.current.x = 204.0;
      carPhysicsRef.current.z = 2.8;
      carPhysicsRef.current.rotationY = Math.PI / 2;
      motorcyclePhysicsRef.current.x = 207.5;
      motorcyclePhysicsRef.current.z = 2.8;
      excavatorPhysicsRef.current.x = 188.0;
      excavatorPhysicsRef.current.z = 2.8;
    }

    // =========================================================================
    // 3D. EVENLY SPACED REALISTIC TREES IN CITY, SUBURBS & OUTER FOREST
    //     - Zero clumping: generated on clean, evenly spaced grids with gentle organic offset
    //     - Balanced density in City & Suburbs (never overcrowded) + Outer Forest Perimeter
    //     - Cuttable with Chainsaw: leaves 3D stump behind, plays falling animation & resets on Reset World
    // =========================================================================
    const pineDarkMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.88, flatShading: true });
    const pineMidMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.86, flatShading: true });
    const pineTipMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.84, flatShading: true });
    const broadFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x1e5631, roughness: 0.84, flatShading: true });
    const broadFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.84, flatShading: true });
    const broadFoliageMat3 = new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 0.82, flatShading: true });
    const barkTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1b, roughness: 0.95 });
    const stumpHeartwoodMat = new THREE.MeshStandardMaterial({ color: 0xdbb882, roughness: 0.75 });

    // Stump Base (y: 0 to 0.78, always stays behind when tree is cut!) + Fresh-Cut Heartwood Top Ring merged into 1 geometry!
    const instStumpGeo = new THREE.CylinderGeometry(0.42, 0.64, 0.78, 8);
    instStumpGeo.translate(0, 0.39, 0);
    const instStumpCapGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.04, 8);
    instStumpCapGeo.translate(0, 0.78, 0);
    const instStumpCombinedGeo = mergeBufferGeometries([instStumpGeo, instStumpCapGeo]);

    // Upper Trunk (y: 0.76 to 6.36, pivots from stump when cut!)
    const instUpperTrunkGeo = new THREE.CylinderGeometry(0.18, 0.41, 5.6, 8);
    instUpperTrunkGeo.translate(0, 3.56, 0);

    // Realistic 3-Tiered Conifer / Pine Boughs - Merged into single BufferGeometry to cut draw calls!
    const instPineLowGeo = new THREE.ConeGeometry(3.8, 5.4, 9);
    instPineLowGeo.translate(0, 5.4, 0);
    const instPineMidGeo = new THREE.ConeGeometry(3.0, 4.8, 9);
    instPineMidGeo.translate(0, 8.0, 0);
    const instPineHighGeo = new THREE.ConeGeometry(2.0, 4.2, 9);
    instPineHighGeo.translate(0, 10.4, 0);
    const instPineFoliageGeo = mergeBufferGeometries([instPineLowGeo, instPineMidGeo, instPineHighGeo]);

    // Realistic 3-Cluster Broadleaf / Oak Organic Canopy + Branch Limbs - Merged into single BufferGeometry!
    const instBroadMainGeo = new THREE.IcosahedronGeometry(3.5, 1);
    instBroadMainGeo.translate(0, 7.3, 0);
    const instBroadLeftGeo = new THREE.IcosahedronGeometry(2.6, 1);
    instBroadLeftGeo.translate(-1.6, 6.4, 0.8);
    const instBroadRightGeo = new THREE.IcosahedronGeometry(2.5, 1);
    instBroadRightGeo.translate(1.6, 6.6, -0.8);
    const instBroadCanopyGeo = mergeBufferGeometries([instBroadMainGeo, instBroadLeftGeo, instBroadRightGeo]);

    interface ForestChunk {
      cx: number;
      cz: number;
      group: THREE.Group;
      pineStumpInst?: THREE.InstancedMesh;
      pineUpperTrunkInst?: THREE.InstancedMesh;
      pineFoliageInst?: THREE.InstancedMesh;
      broadStumpInst?: THREE.InstancedMesh;
      broadUpperTrunkInst?: THREE.InstancedMesh;
      broadCanopyInst?: THREE.InstancedMesh;
    }

    interface ForestTreeRecord {
      id: number;
      x: number;
      z: number;
      scale: number;
      rotY: number;
      isPine: boolean;
      chunk: ForestChunk;
      instIdx: number;
      origMatrix: THREE.Matrix4;
      cut: boolean;
      collider: BoxCollider;
    }

    interface FallingTreeAnim {
      group: THREE.Group;
      axis: THREE.Vector3;
      angle: number;
      vel: number;
      HoldTimer: number;
    }

    const forestChunks: ForestChunk[] = [];
    const forestTrees: ForestTreeRecord[] = [];
    const fallingTrees: FallingTreeAnim[] = [];
    const fallingTreesGroup = new THREE.Group();
    scene.add(fallingTreesGroup);

    const isTreeSpotBlocked = (x: number, z: number) => {
      if (isNearAnyRoad(x, z, 6.8)) return true;
      for (const bldg of destructibleBuildingsRef.current) {
        if (
          Math.abs(x - bldg.cx) < bldg.w * 0.5 + 4.2 &&
          Math.abs(z - bldg.cz) < bldg.d * 0.5 + 4.2
        ) {
          return true;
        }
      }
      return false;
    };

    const CHUNK_SIZE = 450;
    const chunkBuckets = new Map<
      string,
      {
        cx: number;
        cz: number;
        pines: { x: number; z: number; scale: number; rotY: number; mat: THREE.Matrix4; col: BoxCollider }[];
        broads: { x: number; z: number; scale: number; rotY: number; mat: THREE.Matrix4; col: BoxCollider }[];
      }
    >();
    const dummy = new THREE.Object3D();

    const candidateTreeCoords: [number, number, number][] = [];
    let treeSeedCounter = 1;

    // Pseudo-random deterministic hash for organic, non-uniform tree distribution
    const treeHash = (n: number) => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
      return x - Math.floor(x);
    };

    // 1. Organic Non-Uniform City & Park Trees (Scattered irregular pockets & groves)
    for (let i = 0; i < 95; i++) {
      const angle = i * 2.3999632 + treeHash(i * 3) * 0.85;
      const radius = 28 + Math.sqrt(i / 95) * 330 + (treeHash(i * 7) - 0.5) * 48;
      const tx = Math.cos(angle) * radius + (treeHash(i * 11) - 0.5) * 34;
      const tz = Math.sin(angle) * radius + (treeHash(i * 13) - 0.5) * 34;
      candidateTreeCoords.push([tx, tz, treeSeedCounter++]);
    }

    // 2. Non-Uniform Suburban Groves & Natural Clusters
    for (let i = 0; i < 240; i++) {
      const s = i + 200;
      const clusterCenterAngle = (i % 28) * 0.224 + treeHash(s * 5) * 6.28;
      const clusterDist = 260 + treeHash(s * 9) * 310;
      const localSpread = (treeHash(s * 17) - 0.5) * 65;
      const localSpreadZ = (treeHash(s * 19) - 0.5) * 65;
      const tx = Math.cos(clusterCenterAngle) * clusterDist + localSpread;
      const tz = Math.sin(clusterCenterAngle) * clusterDist + localSpreadZ;
      candidateTreeCoords.push([tx, tz, treeSeedCounter++]);
    }

    // 3. Dense Full-Map Forest Coverage across the flat land with feathered circular outer perimeter (no hard square box!)
    const gridStep = 18;
    for (let gx = -1176; gx <= 1176; gx += gridStep) {
      for (let gz = -1176; gz <= 1176; gz += gridStep) {
        const s = treeSeedCounter++;
        const jx = gx + (treeHash(s * 17) - 0.5) * 19.5;
        const jz = gz + (treeHash(s * 23) - 0.5) * 19.5;
        const radialDist = Math.hypot(jx, jz);
        if (radialDist > 1020) {
          const keepProb = Math.max(0, 1 - (radialDist - 1020) / 480);
          if (treeHash(s * 41) > keepProb) continue;
        }
        candidateTreeCoords.push([jx, jz, s]);
      }
    }

    // 4. Extra Organic Woodland Clusters for natural density variation across the inner forest
    for (let i = 0; i < 1800; i++) {
      const s = i + 20000;
      const angle = treeHash(s * 29) * Math.PI * 2;
      const rad = Math.sqrt(treeHash(s * 31)) * 1180;
      const tx = Math.cos(angle) * rad;
      const tz = Math.sin(angle) * rad;
      candidateTreeCoords.push([tx, tz, treeSeedCounter++]);
    }

    // 5. Extended Horizon Woodland Ring (1000m to 2650m radius): feathers smoothly into the atmospheric fog so no tree edge is ever visible!
    for (let i = 0; i < 4500; i++) {
      const s = i + 40000;
      const angle = i * 2.3999632 + (treeHash(s * 13) - 0.5) * 0.25;
      const t = Math.pow(treeHash(s * 19), 0.72); // Higher density near 1000m, tapering organically toward 2650m
      const rad = 980 + t * 1670;
      const tx = Math.cos(angle) * rad + (treeHash(s * 37) - 0.5) * 35;
      const tz = Math.sin(angle) * rad + (treeHash(s * 43) - 0.5) * 35;
      if (Math.hypot(tx - PVP_ARENA_X, tz - PVP_ARENA_Z) < 1450) continue;
      candidateTreeCoords.push([tx, tz, treeSeedCounter++]);
    }

    for (let i = 0; i < candidateTreeCoords.length; i++) {
      const [gx, gz, seed] = candidateTreeCoords[i];
      if (isTreeSpotBlocked(gx, gz)) continue;

      const ckx = Math.floor(gx / CHUNK_SIZE);
      const ckz = Math.floor(gz / CHUNK_SIZE);
      const key = `${ckx}_${ckz}`;
      let bucket = chunkBuckets.get(key);
      if (!bucket) {
        bucket = {
          cx: (ckx + 0.5) * CHUNK_SIZE,
          cz: (ckz + 0.5) * CHUNK_SIZE,
          pines: [],
          broads: [],
        };
        chunkBuckets.set(key, bucket);
      }

      const scale = 0.82 + ((seed * 13) % 10) * 0.065;
      const rotY = ((seed * 47) % 628) * 0.01;
      dummy.position.set(gx, 0, gz);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      const tCol: BoxCollider = {
        minX: gx - 0.52 * scale,
        maxX: gx + 0.52 * scale,
        minZ: gz - 0.52 * scale,
        maxZ: gz + 0.52 * scale,
        minY: 0,
        maxY: 12.0 * scale,
        name: 'Forest Tree',
        isBuilding: false,
      };
      if (Math.abs(gx) <= 1200 && Math.abs(gz) <= 1200) {
        colliders.push(tCol);
      }

      if (seed % 2 === 0) {
        bucket.broads.push({ x: gx, z: gz, scale, rotY, mat: dummy.matrix.clone(), col: tCol });
      } else {
        bucket.pines.push({ x: gx, z: gz, scale, rotY, mat: dummy.matrix.clone(), col: tCol });
      }
    }

    let treeIdSeq = 1;
    chunkBuckets.forEach((b) => {
      const cGrp = new THREE.Group();
      const fChunk: ForestChunk = { cx: b.cx, cz: b.cz, group: cGrp };

      if (b.pines.length > 0) {
        const cnt = b.pines.length;
        const pStump = new THREE.InstancedMesh(instStumpCombinedGeo, barkTrunkMat, cnt);
        const pTrunk = new THREE.InstancedMesh(instUpperTrunkGeo, barkTrunkMat, cnt);
        const pFoliage = new THREE.InstancedMesh(instPineFoliageGeo, pineDarkMat, cnt);
        [pStump, pTrunk, pFoliage].forEach((im) => {
          im.frustumCulled = false;
        });
        b.pines.forEach((item, idx) => {
          pStump.setMatrixAt(idx, item.mat);
          pTrunk.setMatrixAt(idx, item.mat);
          pFoliage.setMatrixAt(idx, item.mat);
          forestTrees.push({
            id: treeIdSeq++,
            x: item.x,
            z: item.z,
            scale: item.scale,
            rotY: item.rotY,
            isPine: true,
            chunk: fChunk,
            instIdx: idx,
            origMatrix: item.mat,
            cut: false,
            collider: item.col,
          });
        });
        fChunk.pineStumpInst = pStump;
        fChunk.pineUpperTrunkInst = pTrunk;
        fChunk.pineFoliageInst = pFoliage;
        cGrp.add(pStump, pTrunk, pFoliage);
      }

      if (b.broads.length > 0) {
        const cnt = b.broads.length;
        const bStump = new THREE.InstancedMesh(instStumpCombinedGeo, barkTrunkMat, cnt);
        const bTrunk = new THREE.InstancedMesh(instUpperTrunkGeo, barkTrunkMat, cnt);
        const bCanopy = new THREE.InstancedMesh(instBroadCanopyGeo, broadFoliageMat1, cnt);
        [bStump, bTrunk, bCanopy].forEach((im) => {
          im.frustumCulled = false;
        });
        b.broads.forEach((item, idx) => {
          bStump.setMatrixAt(idx, item.mat);
          bTrunk.setMatrixAt(idx, item.mat);
          bCanopy.setMatrixAt(idx, item.mat);
          forestTrees.push({
            id: treeIdSeq++,
            x: item.x,
            z: item.z,
            scale: item.scale,
            rotY: item.rotY,
            isPine: false,
            chunk: fChunk,
            instIdx: idx,
            origMatrix: item.mat,
            cut: false,
            collider: item.col,
          });
        });
        fChunk.broadStumpInst = bStump;
        fChunk.broadUpperTrunkInst = bTrunk;
        fChunk.broadCanopyInst = bCanopy;
        cGrp.add(bStump, bTrunk, bCanopy);
      }

      cityGroup.add(cGrp);
      forestChunks.push(fChunk);
    });

    // Helper to Cut Down a Tree with the Chainsaw: leaves the 3D stump behind and spawns a falling tree animation!
    const zeroScaleMat = new THREE.Matrix4().makeScale(0, 0, 0);
    const cutDownTree = (tree: ForestTreeRecord, cutterX: number, cutterZ: number) => {
      if (tree.cut) return;
      tree.cut = true;
      // Keep the low tree stump solid (maxY = 0.82m) so the player can't walk through the stump unless jumping!
      tree.collider.maxY = 0.82 * tree.scale;

      const ch = tree.chunk;
      const idx = tree.instIdx;
      if (tree.isPine) {
        ch.pineUpperTrunkInst?.setMatrixAt(idx, zeroScaleMat);
        ch.pineFoliageInst?.setMatrixAt(idx, zeroScaleMat);
        if (ch.pineUpperTrunkInst) ch.pineUpperTrunkInst.instanceMatrix.needsUpdate = true;
        if (ch.pineFoliageInst) ch.pineFoliageInst.instanceMatrix.needsUpdate = true;
      } else {
        ch.broadUpperTrunkInst?.setMatrixAt(idx, zeroScaleMat);
        ch.broadCanopyInst?.setMatrixAt(idx, zeroScaleMat);
        if (ch.broadUpperTrunkInst) ch.broadUpperTrunkInst.instanceMatrix.needsUpdate = true;
        if (ch.broadCanopyInst) ch.broadCanopyInst.instanceMatrix.needsUpdate = true;
      }

      // Build animated falling upper tree group pivoting at the stump cut plane (y = 0.78 * scale)
      const fallGrp = new THREE.Group();
      const pivotY = 0.78 * tree.scale;
      fallGrp.position.set(tree.x, pivotY, tree.z);

      const innerGrp = new THREE.Group();
      innerGrp.position.y = -pivotY;
      innerGrp.rotation.y = tree.rotY;
      innerGrp.scale.setScalar(tree.scale);

      const trunkMesh = new THREE.Mesh(instUpperTrunkGeo, barkTrunkMat);
      innerGrp.add(trunkMesh);
      if (tree.isPine) {
        innerGrp.add(new THREE.Mesh(instPineFoliageGeo, pineDarkMat));
      } else {
        innerGrp.add(new THREE.Mesh(instBroadCanopyGeo, broadFoliageMat1));
      }
      fallGrp.add(innerGrp);
      fallingTreesGroup.add(fallGrp);

      let dx = tree.x - cutterX;
      let dz = tree.z - cutterZ;
      const dLen = Math.hypot(dx, dz) || 1;
      dx /= dLen;
      dz /= dLen;

      fallingTrees.push({
        group: fallGrp,
        axis: new THREE.Vector3(dz, 0, -dx).normalize(),
        angle: 0.04,
        vel: 0.55,
        HoldTimer: 0,
      });
    };

    const cutNearestTreeAt = (bladeX: number, bladeZ: number, _dirX: number, _dirZ: number) => {
      let bestTree: ForestTreeRecord | null = null;
      let bestDist = 4.2;
      const px = humanPosRef.current.x;
      const pz = humanPosRef.current.z;
      for (const t of forestTrees) {
        if (t.cut) continue;
        const dBlade = Math.hypot(t.x - bladeX, t.z - bladeZ);
        const dPlayer = Math.hypot(t.x - px, t.z - pz);
        const d = Math.min(dBlade, dPlayer);
        if (d < bestDist) {
          bestDist = d;
          bestTree = t;
        }
      }
      if (bestTree) {
        cutDownTree(bestTree, px, pz);
        soundFX.playPlaceObject();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.2);
      }
    };

    const destroyTreesInRect = (minX: number, maxX: number, minZ: number, maxZ: number) => {
      const dirtyChunks = new Set<ForestChunk>();
      for (const t of forestTrees) {
        if (t.x >= minX && t.x <= maxX && t.z >= minZ && t.z <= maxZ) {
          t.cut = true;
          t.collider.destroyed = true;
          const ch = t.chunk;
          const idx = t.instIdx;
          if (t.isPine) {
            ch.pineStumpInst?.setMatrixAt(idx, zeroScaleMat);
            ch.pineUpperTrunkInst?.setMatrixAt(idx, zeroScaleMat);
            ch.pineFoliageInst?.setMatrixAt(idx, zeroScaleMat);
          } else {
            ch.broadStumpInst?.setMatrixAt(idx, zeroScaleMat);
            ch.broadUpperTrunkInst?.setMatrixAt(idx, zeroScaleMat);
            ch.broadCanopyInst?.setMatrixAt(idx, zeroScaleMat);
          }
          dirtyChunks.add(ch);
        }
      }
      dirtyChunks.forEach((ch) => {
        if (ch.pineStumpInst) ch.pineStumpInst.instanceMatrix.needsUpdate = true;
        if (ch.pineUpperTrunkInst) ch.pineUpperTrunkInst.instanceMatrix.needsUpdate = true;
        if (ch.pineFoliageInst) ch.pineFoliageInst.instanceMatrix.needsUpdate = true;
        if (ch.broadStumpInst) ch.broadStumpInst.instanceMatrix.needsUpdate = true;
        if (ch.broadUpperTrunkInst) ch.broadUpperTrunkInst.instanceMatrix.needsUpdate = true;
        if (ch.broadCanopyInst) ch.broadCanopyInst.instanceMatrix.needsUpdate = true;
      });
    };

    const resetAllTrees = () => {
      while (fallingTreesGroup.children.length > 0) {
        fallingTreesGroup.remove(fallingTreesGroup.children[0]);
      }
      fallingTrees.length = 0;

      const dirtyChunks = new Set<ForestChunk>();
      for (const tree of forestTrees) {
        if (!tree.cut && !tree.collider.destroyed) continue;
        tree.cut = false;
        tree.collider.destroyed = false;
        tree.collider.maxY = 12.0 * tree.scale;
        const ch = tree.chunk;
        const idx = tree.instIdx;
        if (tree.isPine) {
          ch.pineStumpInst?.setMatrixAt(idx, tree.origMatrix);
          ch.pineUpperTrunkInst?.setMatrixAt(idx, tree.origMatrix);
          ch.pineFoliageInst?.setMatrixAt(idx, tree.origMatrix);
        } else {
          ch.broadStumpInst?.setMatrixAt(idx, tree.origMatrix);
          ch.broadUpperTrunkInst?.setMatrixAt(idx, tree.origMatrix);
          ch.broadCanopyInst?.setMatrixAt(idx, tree.origMatrix);
        }
        dirtyChunks.add(ch);
      }
      dirtyChunks.forEach((ch) => {
        if (ch.pineStumpInst) ch.pineStumpInst.instanceMatrix.needsUpdate = true;
        if (ch.pineUpperTrunkInst) ch.pineUpperTrunkInst.instanceMatrix.needsUpdate = true;
        if (ch.pineFoliageInst) ch.pineFoliageInst.instanceMatrix.needsUpdate = true;
        if (ch.broadStumpInst) ch.broadStumpInst.instanceMatrix.needsUpdate = true;
        if (ch.broadUpperTrunkInst) ch.broadUpperTrunkInst.instanceMatrix.needsUpdate = true;
        if (ch.broadCanopyInst) ch.broadCanopyInst.instanceMatrix.needsUpdate = true;
      });
    };

    // Save original matrices and rotations on all building meshes so Reset World restores carved chunks 100%
    const saveBuildingOriginalState = (root: THREE.Object3D) => {
      root.traverse((obj) => {
        if ((obj as THREE.InstancedMesh).isInstancedMesh) {
          const im = obj as THREE.InstancedMesh;
          im.userData.originalMatrices = new Float32Array(im.instanceMatrix.array);
        } else if ((obj as THREE.Mesh).isMesh) {
          obj.userData.origRot = obj.rotation.clone();
        }
      });
    };
    for (const bldg of destructibleBuildingsRef.current) {
      saveBuildingOriginalState(bldg.group);
    }

    // Pre-compute and freeze static world matrices for all city & house meshes to avoid 60FPS matrix recalculations
    const freezeStaticGroupMatrices = (root: THREE.Object3D) => {
      root.updateMatrixWorld(true);
      root.traverse((obj) => {
        if (obj !== root) {
          obj.matrixAutoUpdate = false;
        }
      });
    };
    freezeStaticGroupMatrices(cityGroup);
    freezeStaticGroupMatrices(houseGroup);
    for (const d of buildingDoors) {
      if (d.hingePivot) {
        d.hingePivot.matrixAutoUpdate = true;
        d.hingePivot.traverse((c) => {
          c.matrixAutoUpdate = true;
        });
      }
      if (d.slideLeft) {
        d.slideLeft.matrixAutoUpdate = true;
        d.slideLeft.traverse((c) => {
          c.matrixAutoUpdate = true;
        });
      }
      if (d.slideRight) {
        d.slideRight.matrixAutoUpdate = true;
        d.slideRight.traverse((c) => {
          c.matrixAutoUpdate = true;
        });
      }
    }

    collidersRef.current = colliders;

    // Populate 2D Spatial Hash Grid of Colliders (40m x 40m cells) for O(1) Instant Collision Lookups!
    colliderSpatialGrid.clear();
    for (const col of colliders) {
      addColliderToSpatialGrid(col);
    }
    const getNearbyColliders = (x: number, z: number): BoxCollider[] => {
      const gx = Math.floor(x / COLLIDER_CELL_SIZE);
      const gz = Math.floor(z / COLLIDER_CELL_SIZE);
      return colliderSpatialGrid.get(`${gx}_${gz}`) || [];
    };

    const MAP_BOUND = 1188.0;

    const isPointBlockedByCollider = (cx: number, cz: number, radius: number, py: number = 0): boolean => {
      if (stateRef.current.pvpConfig?.active) {
        return Math.abs(cx - 3200) + radius > 1350 || Math.abs(cz - 3200) + radius > 1350;
      }
      if (Math.abs(cx) + radius > MAP_BOUND || Math.abs(cz) + radius > MAP_BOUND) {
        return true;
      }
      const nearby = getNearbyColliders(cx, cz);
      for (const col of nearby) {
        if (col.destroyed) continue;
        if (col.name === 'Forest Tree' && stateRef.current.resolutionScale === 'extra-low') continue;
        if (col.buildingId) {
          const b = destructibleBuildingsMap.get(col.buildingId);
          if (b && (b.destroyed || b.collapsing || b.group.position.y <= -0.8)) {
            col.destroyed = true;
            continue;
          }
        }
        if (col.minY !== undefined && py < col.minY) continue;
        if (col.maxY !== undefined && py > col.maxY) continue;
        if (
          cx + radius > col.minX &&
          cx - radius < col.maxX &&
          cz + radius > col.minZ &&
          cz - radius < col.maxZ
        ) {
          return true;
        }
      }
      return false;
    };

    const isPointInsideAnyBuildingFootprint = (px: number, pz: number, padding: number = 1.6): DestructibleBuilding | null => {
      for (const bldg of destructibleBuildingsRef.current) {
        if (bldg.destroyed) continue;
        if (
          Math.abs(px - bldg.cx) < bldg.w * 0.5 + padding &&
          Math.abs(pz - bldg.cz) < bldg.d * 0.5 + padding
        ) {
          return bldg;
        }
      }
      return null;
    };

    const isLineOfSightClear = (p1: THREE.Vector3, p2: THREE.Vector3, sampleDist: number = 0.5): boolean => {
      const dist = p1.distanceTo(p2);
      if (dist < sampleDist) return true;

      // 1. House/Building Wall Check: If shooter is outside and target is inside a house (or vice versa), house walls block all shots!
      const bldg1 = isPointInsideAnyBuildingFootprint(p1.x, p1.z, 0.1);
      const bldg2 = isPointInsideAnyBuildingFootprint(p2.x, p2.z, 0.1);
      if ((bldg1 && !bldg2) || (!bldg1 && bldg2) || (bldg1 && bldg2 && bldg1.id !== bldg2.id)) {
        return false;
      }

      // 2. Fine Raycast Sampling: Test along trajectory for wall colliders and building footprints
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const numSamples = Math.floor(dist / sampleDist);
      const testPos = new THREE.Vector3();
      for (let i = 1; i <= numSamples; i++) {
        testPos.copy(p1).addScaledVector(dir, i * sampleDist);
        if (isPointBlockedByCollider(testPos.x, testPos.z, 0.2, testPos.y)) {
          return false;
        }
        const hitBldg = isPointInsideAnyBuildingFootprint(testPos.x, testPos.z, 0.1);
        if (hitBldg && testPos.y <= hitBldg.h + 0.5) {
          return false;
        }
      }
      return true;
    };

    // Guaranteed Exterior Vehicle Spawn Finder: NEVER spawns a car, motorcycle, plane, or helicopter inside a building or wall!
    const findSafeExteriorVehicleSpot = (
      originX: number,
      originZ: number,
      preferredX?: number,
      preferredZ?: number
    ): { x: number; z: number } => {
      if (
        preferredX !== undefined &&
        preferredZ !== undefined &&
        !isPointInsideAnyBuildingFootprint(preferredX, preferredZ, 1.8) &&
        !isPointBlockedByCollider(preferredX, preferredZ, 1.8, 0)
      ) {
        return { x: preferredX, z: preferredZ };
      }

      // If the player is currently inside a skyscraper, house, or store, anchor the vehicle search OUTSIDE the building's front plaza!
      let anchorX = originX;
      let anchorZ = originZ;
      const enclosingBldg = isPointInsideAnyBuildingFootprint(originX, originZ, 2.2);
      if (enclosingBldg) {
        anchorX = enclosingBldg.cx + 4.5;
        anchorZ = enclosingBldg.cz - enclosingBldg.d * 0.5 - 5.5;
      }

      const candidateOffsets: Array<[number, number]> = [
        [0, 0],
        [4.5, 1.5],
        [-4.5, 1.5],
        [0, -5.5],
        [5.5, -4.5],
        [-5.5, -4.5],
        [8.5, 0],
        [-8.5, 0],
        [0, 7.5],
        [10.5, -5.5],
        [-10.5, -5.5],
        [14.0, 0],
        [-14.0, 0],
        [0, -11.0],
        [18.0, 0],
        [-18.0, 0],
      ];

      for (const [ox, oz] of candidateOffsets) {
        const tx = anchorX + ox;
        const tz = anchorZ + oz;
        if (
          !isPointInsideAnyBuildingFootprint(tx, tz, 1.8) &&
          !isPointBlockedByCollider(tx, tz, 1.8, 0)
        ) {
          return { x: tx, z: tz };
        }
      }

      return { x: -4.5, z: 15.2 };
    };

    // Guaranteed Safe Player Spot Finder:
    // - Never places the player inside a wall collider
    // - Never places the player inside a skyscraper or building UNLESS that building is their claimed home!
    const findSafePlayerSpot = (
      preferredX: number,
      preferredZ: number,
      allowClaimedBuilding: boolean = true
    ): { x: number; z: number } => {
      const checkPlayerCandidate = (tx: number, tz: number) => {
        if (isPointBlockedByCollider(tx, tz, 0.45, 0)) return false;
        const bldg = isPointInsideAnyBuildingFootprint(tx, tz, 0.25);
        if (bldg) {
          if (!allowClaimedBuilding || bldg.name !== claimedHomeRef.current.name) {
            return false;
          }
        }
        return true;
      };

      if (checkPlayerCandidate(preferredX, preferredZ)) {
        return { x: preferredX, z: preferredZ };
      }

      const offsets: Array<[number, number]> = [
        [0, -2.5],
        [2.5, 0],
        [-2.5, 0],
        [0, 2.5],
        [3.5, -3.5],
        [-3.5, -3.5],
        [0, -5.5],
        [5.5, 0],
        [-5.5, 0],
        [0, -8.5],
      ];
      for (const [ox, oz] of offsets) {
        const tx = preferredX + ox;
        const tz = preferredZ + oz;
        if (checkPlayerCandidate(tx, tz)) {
          return { x: tx, z: tz };
        }
      }
      return { x: claimedHomeRef.current.x, z: claimedHomeRef.current.z };
    };

    // Validate initial player & car positions on load:
    // Player ALWAYS spawns outside on the sidewalk by default, NEVER inside a building or wall!
    const safeInitPlayer = findSafePlayerSpot(humanPosRef.current.x, humanPosRef.current.z, false);
    humanPosRef.current.set(safeInitPlayer.x, 0, safeInitPlayer.z);
    lastKnownCityPos = { x: safeInitPlayer.x, y: 0, z: safeInitPlayer.z };
    const safeInitCar = findSafeExteriorVehicleSpot(
      safeInitPlayer.x,
      safeInitPlayer.z,
      carPhysicsRef.current.x,
      carPhysicsRef.current.z
    );
    carPhysicsRef.current.x = safeInitCar.x;
    carPhysicsRef.current.z = safeInitCar.z;

    // =========================================================================
    // 4. WALKING NPCS ON ALL SIDEWALKS + PROVOKED-ONLY COMBAT + UNIFORM HEALTH BARS
    // =========================================================================
    const npcMeshes: {
      group: THREE.Group;
      data: NPCData;
      legL: THREE.Group;
      legR: THREE.Group;
      armL: THREE.Group;
      armR: THREE.Group;
      dead: boolean;
      respawnTimer: number;
      health: number;
      maxHealth: number;
      healthBarFill: THREE.Mesh;
      healthBarGroup: THREE.Group;
      isHostile: boolean;
      attackCooldown: number;
      weaponMesh: THREE.Group | null;
      bloodPool?: THREE.Mesh;
    }[] = [];

    const npcSkins = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
    const npcHairs = ['#1c1917', '#451a03', '#78350f', '#3f3f46', '#92400e'];

    // Generate 75+ Suburban Neighborhood NPCs walking along sidewalks throughout all North, South, East & West Suburbs!
    const suburbanFirstNames = ['Liam', 'Emma', 'Noah', 'Olivia', 'Ethan', 'Ava', 'Lucas', 'Sophia', 'Mason', 'Isabella', 'Logan', 'Mia', 'Caleb', 'Harper', 'Nathan', 'Evelyn', 'Ryan', 'Abigail', 'Owen', 'Ella'];
    const suburbanLastNames = ['Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez'];
    const suburbanPersonas: {
      role: string;
      personality: NPCData['personality'];
      personalityTrait: string;
      backstory: string;
      dialogues: string[];
    }[] = [
      {
        role: 'Burned-Out Corporate Litigator',
        personality: 'mean',
        personalityTrait: 'Foul-mouthed, vicious, aggressive & brutally insulting',
        backstory:
          'Billed 90 hours a week for twelve years to pay for a divorce settlement, hates everyone on sight, and curses out strangers on the sidewalk.',
        dialogues: [
          'What the fuck are you looking at, dipshit? Take a step closer and I will sue your broke ass and knock your teeth out.',
          'Get the hell out of my way, jackass—I have zero patience for ugly, brainless clowns like you today.',
          'Shut your damn mouth and piss off, loser! Looking at your stupid face is ruining my whole afternoon.',
        ],
      },
      {
        role: 'Estranged Eldest Sibling',
        personality: 'friendly',
        personalityTrait: 'Guilt-ridden, empathetic & over-apologetic',
        backstory:
          'Stopped speaking to their younger brother two years ago after a bitter argument over their late mother’s estate, and drafts texts every day that they never send.',
        dialogues: [
          'I typed out a whole apology text to my brother this morning, stared at it for ten minutes, and deleted it again.',
          'Everyone thinks I am the calm, responsible one in the family, which just means nobody ever asks how I am actually doing.',
          'How do you fix a fallout with family when both of you are too stubborn to admit who started it?',
        ],
      },
      {
        role: 'Insomniac Night-Shift Paramedic',
        personality: 'quirky',
        personalityTrait: 'Gallows humor, hyper-observant & caffeine-fueled',
        backstory:
          'Just came off a 36-hour rotation and cannot switch their brain off from emergency mode. Uses dark humor to mask how much they care about strangers.',
        dialogues: [
          'I have had four espressos since dawn and my hands are still steadier than my personal life.',
          'The weirdest part of working night shifts is trying to have normal small talk when you have not slept since Tuesday.',
          'My friends stopped inviting me to dinner because I either fall asleep at the table or tell stories that ruin their appetite.',
        ],
      },
      {
        role: 'Closeted Romance Novelist',
        personality: 'friendly',
        personalityTrait: 'Daydreaming, dramatic & hopelessly romantic',
        backstory:
          'Tells their family they work in data entry, but actually writes bestselling paperback romance novels under a pseudonym while nursing an unrequited crush on their best friend.',
        dialogues: [
          'My parents still think I do spreadsheet auditing for a living—if they ever found out my pen name, Thanksgiving would be over forever.',
          'I write happy endings for a living, yet I cannot even work up the nerve to tell my best friend how I feel.',
          'Do you believe people actually change for love, or is that just something I make up to hit my word count?',
        ],
      },
      {
        role: 'Broke Vintage Guitar Collector',
        personality: 'mean',
        personalityTrait: 'Vulgar, hostile, defensive & ruthlessly insulting',
        backstory:
          'Spent their rent money on a 1968 guitar and now roams the neighborhood swearing at and insulting anyone who looks in their direction.',
        dialogues: [
          'Fuck off, dumbass! What are you staring at with that goofy-ass haircut?',
          'You look like the most pathetic little shit on this entire block—get lost before I rearrange your face.',
          'Keep walking, jackass! Nobody wants to hear a single fucking word coming out of your stupid mouth.',
        ],
      },
      {
        role: 'Paranoid Forensic Accountant',
        personality: 'mean',
        personalityTrait: 'Belligerent, cursing, paranoid & quick to insult',
        backstory:
          'Convinced everyone on the street is a total idiot out to get them, and swears aggressively at anyone who gets within talking distance.',
        dialogues: [
          'Back the fuck up, you creepy bastard! Why the hell are you standing so close to me, dipshit?',
          'Did somebody pay your dumb ass to bother me, or were you just born a complete fucking moron?',
          'Piss off, scumbag—get your ugly face away from me before I beat some sense into you!',
        ],
      },
      {
        role: 'Retired Pro Boxer Turned Youth Coach',
        personality: 'friendly',
        personalityTrait: 'Protective, blunt & quietly philosophical',
        backstory:
          'Walked away from the ring after a detached retina and now runs a free after-school gym to keep neighborhood kids from making the mistakes they made at nineteen.',
        dialogues: [
          'Taking a punch is easy; watching a kid with real talent throw their future away over pride is what actually hurts.',
          'My left shoulder still clicks every time the weather changes, just a little souvenir from the title fight I lost in the ninth round.',
          'You carry yourself like someone who has been in a few scrapes—just make sure you know what you are fighting for.',
        ],
      },
      {
        role: 'Jealous Twin & Sous-Chef',
        personality: 'mean',
        personalityTrait: 'Bitter, foul-mouthed, explosive & viciously rude',
        backstory:
          'Channels all their family resentment into cursing out strangers on the street and insulting their appearance.',
        dialogues: [
          'Holy shit, look at this absolute fucking bozo walking up to me. Piss off, loser!',
          'I have had a miserable damn day and your ugly-ass face just made it ten times worse, jackass.',
          'Say one more fucking word to me, idiot, and I will knock you flat on your ass right here!',
        ],
      },
    ];
    const suburbanColors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#4f46e5', '#be185d', '#0d9488'];
    const generatedSuburbanNpcs: NPCData[] = [];

    // Place NPCs along every residential cross-street and suburban avenue sidewalk!
    const suburbanCrossZs = [-980, -820, -660, -500, -340, -180, -100, 100, 180, 340, 500, 660, 820, 980];
    const suburbanZonesX = [-780, -580, -380, -180, -60, 50, 160, 360, 560, 760];
    let subNpcIdx = 0;
    for (let zi = 0; zi < suburbanCrossZs.length; zi++) {
      const sz = suburbanCrossZs[zi];
      for (const sideOff of [5.55, -5.55]) {
        const swZ = sz + sideOff;
        for (let xi = 0; xi < suburbanZonesX.length; xi++) {
          const startX = suburbanZonesX[xi];
          const patrolSpan = 140;
          const fName = suburbanFirstNames[subNpcIdx % suburbanFirstNames.length];
          const lName = suburbanLastNames[(subNpcIdx * 3) % suburbanLastNames.length];
          const persona = suburbanPersonas[subNpcIdx % suburbanPersonas.length];
          generatedSuburbanNpcs.push({
            id: `npc-suburb-${subNpcIdx + 1}`,
            name: `${fName} ${lName}`,
            role: persona.role,
            outfitColor: suburbanColors[subNpcIdx % suburbanColors.length],
            position: [startX, 0, swZ],
            rotationY: Math.PI / 2,
            personality: persona.personality,
            personalityTrait: persona.personalityTrait,
            backstory: persona.backstory,
            maxHealth: 500,
            weaponType: 'unarmed',
            waypoints: [
              [startX, swZ],
              [Math.min(890, startX + patrolSpan), swZ],
              [Math.max(-890, startX - patrolSpan), swZ],
            ],
            currentWaypointIdx: 1,
            dialogueList: persona.dialogues,
            hostileLines: [
              `That is it, dipshit—I'm beating your ass with my bare hands!`,
              `Put your fucking fists up right now, jackass!`,
            ],
          });
          subNpcIdx++;
        }
      }
    }

    const ALL_WORLD_NPCS: NPCData[] = [...CITY_NPCS, ...generatedSuburbanNpcs];

    // Strictly snap all NPC initial positions and waypoints to sidewalks (never inside buildings or roads!)
    ALL_WORLD_NPCS.forEach((npc) => {
      if (!npc.waypoints || npc.waypoints.length === 0) return;
      const cleanWps: [number, number][] = [];
      for (const wp of npc.waypoints) {
        const swPos = clampToNearestSidewalk(wp[0], wp[1]);
        cleanWps.push([swPos.x, swPos.z]);
      }
      npc.waypoints = cleanWps;
      const initPos = clampToNearestSidewalk(npc.position[0], npc.position[2]);
      npc.position = [initPos.x, 0, initPos.z];
    });

    // Guarantee no two NPCs share the same opening line!
    const assignedOpeningLines = new Set<string>();
    const uniqueOpeningTemplates = [
      (n: NPCData) => `Hey, I'm ${n.name}. Working as a ${n.role.toLowerCase()} has had my head spinning all week—what's on your mind?`,
      (n: NPCData) => `Oh, hey there. I'm ${n.name}. ${n.backstory || 'Just trying to keep my life together one day at a time.'}`,
      (n: NPCData) => `Look, between my job as a ${n.role.toLowerCase()} and everything else going on, I barely slept last night. I'm ${n.name}, by the way.`,
      (n: NPCData) => `Hey! Name's ${n.name}. People think being a ${n.role.toLowerCase()} is simple, but honestly it's a lot to juggle.`,
      (n: NPCData) => `Wait, were you trying to get my attention? I'm ${n.name}—sorry, I was totally lost in thought about work.`,
      (n: NPCData) => `Hi, I'm ${n.name}. Honestly, after a long shift as a ${n.role.toLowerCase()}, it's nice just to pause and talk to someone new.`,
    ];
    ALL_WORLD_NPCS.forEach((npc, idx) => {
      const uniqueLines: string[] = [];
      for (const candidate of npc.dialogueList || []) {
        if (!assignedOpeningLines.has(candidate)) {
          assignedOpeningLines.add(candidate);
          uniqueLines.push(candidate);
          break;
        }
      }
      if (uniqueLines.length === 0) {
        const tmpl = uniqueOpeningTemplates[idx % uniqueOpeningTemplates.length];
        let customLine = tmpl(npc);
        if (assignedOpeningLines.has(customLine)) {
          customLine = `${customLine} (#${idx + 1})`;
        }
        assignedOpeningLines.add(customLine);
        uniqueLines.push(customLine);
      }
      npc.dialogueList = uniqueLines;
      const builtNpc = buildHumanCharacter3D({
        skinColor: npcSkins[idx % npcSkins.length],
        topColor: npc.outfitColor,
        pantsColor: idx % 2 === 0 ? '#1e293b' : '#334155',
        shoeColor: '#0f172a',
        hairColor: npcHairs[idx % npcHairs.length],
        hasCap: idx % 3 === 0,
        hasSunglasses: idx % 2 === 1,
      });
      const npcGrp = builtNpc.group;
      npcGrp.position.set(npc.position[0], 0, npc.position[2]);

      // Floating 3D Health Bar above NPC head — HIDDEN until health starts to drain, and same color (#10b981) for everyone!
      const maxHP = npc.maxHealth || 100;
      const hbGroup = new THREE.Group();
      hbGroup.position.set(0, 2.25, 0);
      hbGroup.visible = false; // Only show on an NPC if it starts to drain!
      const hbBg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
      );
      const hbFill = new THREE.Mesh(
        new THREE.PlaneGeometry(0.86, 0.08),
        new THREE.MeshBasicMaterial({
          color: 0x10b981,
          side: THREE.DoubleSide,
        })
      );
      hbFill.position.z = 0.01;
      hbGroup.add(hbBg, hbFill);
      npcGrp.add(hbGroup);

      // No one hurts you unless you hurt them first! All NPCs start peaceful.
      const startsHostile = false;
      const wMesh: THREE.Group | null = null;

      scene.add(npcGrp);
      npcMeshes.push({
        group: npcGrp,
        data: npc,
        legL: builtNpc.legL,
        legR: builtNpc.legR,
        armL: builtNpc.armL,
        armR: builtNpc.armR,
        dead: false,
        respawnTimer: 0,
        health: maxHP,
        maxHealth: maxHP,
        healthBarFill: hbFill,
        healthBarGroup: hbGroup,
        isHostile: startsHostile,
        attackCooldown: 0.8 + Math.random() * 0.6,
        weaponMesh: wMesh,
      });
    });

    const makeNpcHostile = (npcItem: (typeof npcMeshes)[0]) => {
      if (npcItem.dead) return;
      npcItem.isHostile = true;
      // Keep everyone's health bar the exact same color (#10b981)
      (npcItem.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
      // NPCs use their bare fists in a fight — no guns outside Battle Mode!
      if (npcItem.weaponMesh) {
        npcItem.armR.remove(npcItem.weaponMesh);
        npcItem.weaponMesh = null;
      }
      if (stateRef.current.talkingNpcId === npcItem.data.id) {
        stateRef.current.onCloseNpcChat?.();
      }
    };

    // Blood Splatter & Bullet Projectile Groups
    const bloodGroup = new THREE.Group();
    scene.add(bloodGroup);
    interface BloodParticle {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
    }
    const bloodParticles: BloodParticle[] = [];

    const triggerBloodSplatter = (bx: number, by: number, bz: number, count: number = 18) => {
      const bloodMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });
      const darkBloodMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
      for (let i = 0; i < count; i++) {
        const sz = 0.06 + Math.random() * 0.1;
        const drop = new THREE.Mesh(
          new THREE.DodecahedronGeometry(sz, 0),
          i % 2 === 0 ? bloodMat : darkBloodMat
        );
        drop.position.set(
          bx + (Math.random() - 0.5) * 0.4,
          by + (Math.random() - 0.5) * 0.4,
          bz + (Math.random() - 0.5) * 0.4
        );
        bloodGroup.add(drop);
        const angle = Math.random() * Math.PI * 2;
        const spd = 2.0 + Math.random() * 6.5;
        bloodParticles.push({
          mesh: drop,
          vel: new THREE.Vector3(Math.cos(angle) * spd, 2.2 + Math.random() * 4.5, Math.sin(angle) * spd),
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4,
        });
      }
      return undefined;
    };

    let currentWantedStars = 0;
    let wantedDecayTimer = 0;
    let lastReportedDecaySec = -1;
    const clearWantedStarsAndPolice = () => {
      currentWantedStars = 0;
      wantedDecayTimer = 0;
      lastReportedDecaySec = -1;
      stateRef.current.onWantedLevelChange?.(0);
      stateRef.current.onWantedDecayTimerUpdate?.(0, 60.0);
      for (const pc of policeCruisers) {
        pc.destroyed = true;
        pc.group.visible = false;
      }
      for (const po of policeOfficers) {
        po.dead = true;
        po.group.visible = false;
      }
      for (const npc of npcMeshes) {
        npc.isHostile = false;
      }
      while (policeGroup.children.length > 0) {
        policeGroup.remove(policeGroup.children[0]);
      }
      policeCruisers.length = 0;
      policeOfficers.length = 0;
    };
    const reportPlayerCrime = (starsToAdd: number = 1) => {
      const cur = stateRef.current;
      if (!cur.policeModeEnabled || cur.pvpConfig?.active) return;
      if (cur.activeDisaster && cur.activeDisaster !== 'none') return;
      const baseStars = Math.max(currentWantedStars, cur.wantedLevel || 0);
      const newWanted = Math.min(5, Math.max(1, baseStars + starsToAdd));
      currentWantedStars = newWanted;
      // One star disappears every 1 minute (60 seconds)!
      wantedDecayTimer = 60.0;
      lastReportedDecaySec = 60;
      cur.onWantedDecayTimerUpdate?.(60, 60.0);
      if (newWanted !== (cur.wantedLevel || 0)) {
        cur.onWantedLevelChange?.(newWanted);
      }
      soundFX.playSirenWail();
    };

    const applyRandomDeathPose = (
      group: THREE.Group,
      limbs?: {
        legL?: THREE.Object3D;
        legR?: THREE.Object3D;
        armL?: THREE.Object3D;
        armR?: THREE.Object3D;
      },
      groundY: number = 0.22,
      impulseDistance: number = 0.45
    ) => {
      // Pick a completely random compass direction (0 to 360 degrees / 0 to 2*PI radians)
      const randYaw = Math.random() * Math.PI * 2;
      // 50% chance falling on back (-PI/2), 50% chance falling forward on stomach (+PI/2)
      const isFallingOnBack = Math.random() < 0.5;
      const randPitch = isFallingOnBack ? -Math.PI / 2 : Math.PI / 2;
      // Slight natural roll / tilt on the floor
      const randRoll = (Math.random() - 0.5) * 0.35;

      group.rotation.order = 'YXZ';
      group.rotation.set(randPitch, randYaw, randRoll);
      group.position.y = groundY;

      // Small randomized impulse displacement in that fall direction
      const shift = (Math.random() * 0.35 + 0.25) * impulseDistance;
      group.position.x += Math.sin(randYaw) * shift;
      group.position.z += Math.cos(randYaw) * shift;

      // Natural sprawled limbs for a ragdoll death effect
      if (limbs) {
        if (limbs.legL) {
          limbs.legL.rotation.set(
            (Math.random() - 0.5) * 0.35,
            0,
            (Math.random() - 0.2) * 0.4
          );
        }
        if (limbs.legR) {
          limbs.legR.rotation.set(
            (Math.random() - 0.5) * 0.35,
            0,
            -(Math.random() - 0.2) * 0.4
          );
        }
        if (limbs.armL) {
          limbs.armL.rotation.set(
            isFallingOnBack ? -0.2 - Math.random() * 0.7 : 0.2 + Math.random() * 0.7,
            0,
            0.3 + Math.random() * 0.6
          );
        }
        if (limbs.armR) {
          limbs.armR.rotation.set(
            isFallingOnBack ? -0.2 - Math.random() * 0.7 : 0.2 + Math.random() * 0.7,
            0,
            -0.3 - Math.random() * 0.6
          );
        }
      }
    };

    const killNpcWithBlood = (
      npcItem: (typeof npcMeshes)[0],
      hitSource?: string,
      dmgOrigin?: { x: number; z: number }
    ) => {
      if (npcItem.dead) return;
      npcItem.dead = true;
      npcItem.health = 0;
      npcItem.healthBarGroup.visible = false;
      npcItem.respawnTimer = 18.0;
      const nx = npcItem.group.position.x;
      const nz = npcItem.group.position.z;
      const ny = npcItem.group.position.y;
      triggerBloodSplatter(nx, ny + 1.1, nz, 22);

      // Apply random fall direction and ragdoll death pose so NPCs fall in different directions
      const groundY = ny > 0.6 ? ny : 0.22;
      applyRandomDeathPose(
        npcItem.group,
        {
          legL: npcItem.legL,
          legR: npcItem.legR,
          armL: npcItem.armL,
          armR: npcItem.armR,
        },
        groundY
      );

      soundFX.playLowPolyExplosion();
      const isDisaster =
        hitSource === 'natural_disaster' ||
        hitSource === 'Meteor Shower' ||
        hitSource === 'meteor_shower' ||
        hitSource === 'flood';
      if (!isDisaster) {
        reportPlayerCrime(1);
        const npcFirstName = npcItem.data.name.split(' ')[0];
        stateRef.current.onEarnMoney?.(2000, `Killed ${npcFirstName}`, { x: npcItem.group.position.x, y: 1.5, z: npcItem.group.position.z });
      }
    };

    const damageNpc = (
      npcItem: (typeof npcMeshes)[0],
      dmg: number,
      sourceName: string,
      dmgOrigin?: { x: number; z: number }
    ) => {
      if (npcItem.dead) return;
      npcItem.health = Math.max(0, npcItem.health - dmg);
      const ratio = Math.max(0.01, npcItem.health / npcItem.maxHealth);
      // Show health bar ONLY once health starts to drain, and keep uniform color (#10b981)
      npcItem.healthBarGroup.visible = npcItem.health < npcItem.maxHealth && npcItem.health > 0;
      npcItem.healthBarFill.scale.x = ratio;
      npcItem.healthBarFill.position.x = -0.43 * (1 - ratio);
      (npcItem.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
      triggerBloodSplatter(npcItem.group.position.x, 1.15, npcItem.group.position.z, 10);
      const isDisaster =
        sourceName === 'natural_disaster' ||
        sourceName === 'Meteor Shower' ||
        sourceName === 'meteor_shower' ||
        sourceName === 'flood';
      // Anyone who you attack starts attacking you and battling you, UNLESS it was caused by natural disaster
      if (!isDisaster) {
        makeNpcHostile(npcItem);
      }
      if (npcItem.health <= 0) {
        killNpcWithBlood(npcItem, isDisaster ? 'natural_disaster' : sourceName, dmgOrigin);
      }
    };

    // =========================================================================
    // 4B. NPC TRAFFIC CARS ON ROADS (Run into them -> Both Cars Explode!)
    // =========================================================================
    const npcCarsGroup = new THREE.Group();
    scene.add(npcCarsGroup);

    interface NpcTrafficCar {
      id: string;
      carSpec: CarVehicle;
      group: THREE.Group;
      wheels: THREE.Object3D[];
      x: number;
      z: number;
      rotationY: number;
      speed: number;
      axis: 'z' | 'x';
      laneCoord: number;
      dirSign: 1 | -1;
      minBound: number;
      maxBound: number;
      destroyed: boolean;
      hijacked?: boolean;
      respawnTimer: number;
      stopTimer: number;
      lastStopCoord: number;
      initX: number;
      initZ: number;
      initRotY: number;
      initSpeed: number;
    }
    const npcTrafficCars: NpcTrafficCar[] = [];

    interface ParkedPlayerCar {
      carSpec: CarVehicle;
      group: THREE.Group;
      wheels: THREE.Mesh[];
      x: number;
      z: number;
      rotationY: number;
      destroyed: boolean;
    }
    const parkedCars: ParkedPlayerCar[] = [];

    const archiveActiveCarIfPresent = () => {
      if (hasSpawnedCarRef.current && activeCarGroupRef.current && activeCarGroupRef.current.visible) {
        activeCarGroupRef.current.position.set(carPhysicsRef.current.x, 0, carPhysicsRef.current.z);
        activeCarGroupRef.current.rotation.set(0, carPhysicsRef.current.rotationY, 0);
        parkedCars.push({
          carSpec: activeCarSpecRef.current || CARS_CATALOG[0],
          group: activeCarGroupRef.current,
          wheels: carWheelsRef.current,
          x: carPhysicsRef.current.x,
          z: carPhysicsRef.current.z,
          rotationY: carPhysicsRef.current.rotationY,
          destroyed: false,
        });
        activeCarGroupRef.current = null;
      }
    };

    const npcTrafficRoutes: {
      axis: 'z' | 'x';
      laneCoord: number;
      dirSign: 1 | -1;
      startPos: number;
      minB: number;
      maxB: number;
      spd: number;
      carIdx: number;
    }[] = [
      // Main Highway North & South Lanes (Highway spans X = 3.0 to 14.0, Z = -600 to 600)
      { axis: 'z', laneCoord: 5.75, dirSign: 1, startPos: -90, minB: -480, maxB: 480, spd: 18, carIdx: 0 },
      { axis: 'z', laneCoord: 5.75, dirSign: 1, startPos: 75, minB: -480, maxB: 480, spd: 19, carIdx: 1 },
      { axis: 'z', laneCoord: 11.25, dirSign: -1, startPos: 120, minB: -480, maxB: 480, spd: 17, carIdx: 2 },
      { axis: 'z', laneCoord: 11.25, dirSign: -1, startPos: -55, minB: -480, maxB: 480, spd: 16, carIdx: 3 },
      // East-Side City Avenues (X = 95, 255, 385; avenues span Z: -360 to 360)
      { axis: 'z', laneCoord: 95 - 2.25, dirSign: 1, startPos: -140, minB: -330, maxB: 330, spd: 14, carIdx: 4 },
      { axis: 'z', laneCoord: 95 + 2.25, dirSign: -1, startPos: 110, minB: -330, maxB: 330, spd: 15, carIdx: 0 },
      { axis: 'z', laneCoord: 255 - 2.25, dirSign: 1, startPos: -60, minB: -330, maxB: 330, spd: 15, carIdx: 1 },
      { axis: 'z', laneCoord: 255 + 2.25, dirSign: -1, startPos: 150, minB: -330, maxB: 330, spd: 14, carIdx: 2 },
      { axis: 'z', laneCoord: 385 - 2.25, dirSign: 1, startPos: -95, minB: -330, maxB: 330, spd: 14, carIdx: 3 },
      { axis: 'z', laneCoord: 385 + 2.25, dirSign: -1, startPos: 80, minB: -330, maxB: 330, spd: 15, carIdx: 4 },
      // West-Side City Avenues (X = -95, -255, -385; avenues span Z: -360 to 360)
      { axis: 'z', laneCoord: -95 - 2.25, dirSign: 1, startPos: -120, minB: -330, maxB: 330, spd: 14, carIdx: 0 },
      { axis: 'z', laneCoord: -95 + 2.25, dirSign: -1, startPos: 90, minB: -330, maxB: 330, spd: 15, carIdx: 1 },
      { axis: 'z', laneCoord: -255 - 2.25, dirSign: 1, startPos: -50, minB: -330, maxB: 330, spd: 14, carIdx: 2 },
      { axis: 'z', laneCoord: -255 + 2.25, dirSign: -1, startPos: 130, minB: -330, maxB: 330, spd: 15, carIdx: 3 },
      // East Cross-Streets (Z = -100, 0, 100, 180; streets span X: 14.0 to 410.0)
      { axis: 'x', laneCoord: 0 + 2.25, dirSign: 1, startPos: 65, minB: 24, maxB: 395, spd: 14, carIdx: 4 },
      { axis: 'x', laneCoord: 0 - 2.25, dirSign: -1, startPos: 240, minB: 24, maxB: 395, spd: 14, carIdx: 0 },
      { axis: 'x', laneCoord: -100 + 2.25, dirSign: 1, startPos: 130, minB: 24, maxB: 395, spd: 13, carIdx: 1 },
      { axis: 'x', laneCoord: -100 - 2.25, dirSign: -1, startPos: 320, minB: 24, maxB: 395, spd: 13, carIdx: 2 },
      { axis: 'x', laneCoord: 100 + 2.25, dirSign: 1, startPos: 160, minB: 24, maxB: 395, spd: 13, carIdx: 3 },
      { axis: 'x', laneCoord: 180 - 2.25, dirSign: -1, startPos: 280, minB: 24, maxB: 395, spd: 13, carIdx: 4 },
      // West Cross-Streets (Z = -100, 0, 100; streets span X: -410.0 to 3.0)
      { axis: 'x', laneCoord: 0 + 2.25, dirSign: 1, startPos: -240, minB: -395, maxB: -15, spd: 14, carIdx: 1 },
      { axis: 'x', laneCoord: 0 - 2.25, dirSign: -1, startPos: -80, minB: -395, maxB: -15, spd: 14, carIdx: 2 },
      { axis: 'x', laneCoord: 100 + 2.25, dirSign: 1, startPos: -160, minB: -395, maxB: -15, spd: 13, carIdx: 3 },
    ];

    npcTrafficRoutes.forEach((rt, idx) => {
      const carSpec = CARS_CATALOG[rt.carIdx % CARS_CATALOG.length];
      const builtTrafficCar = buildCar3DModel(carSpec);
      const initX = rt.axis === 'z' ? rt.laneCoord : rt.startPos;
      const initZ = rt.axis === 'z' ? rt.startPos : rt.laneCoord;
      const rotY =
        rt.axis === 'z' ? (rt.dirSign === 1 ? 0 : Math.PI) : rt.dirSign === 1 ? Math.PI / 2 : -Math.PI / 2;

      builtTrafficCar.group.position.set(initX, 0, initZ);
      builtTrafficCar.group.rotation.y = rotY;
      npcCarsGroup.add(builtTrafficCar.group);

      npcTrafficCars.push({
        id: `npc_traffic_${idx}`,
        carSpec,
        group: builtTrafficCar.group,
        wheels: builtTrafficCar.wheels,
        x: initX,
        z: initZ,
        rotationY: rotY,
        initX: initX,
        initZ: initZ,
        initRotY: rotY,
        initSpeed: rt.spd,
        speed: rt.spd,
        axis: rt.axis,
        laneCoord: rt.laneCoord,
        dirSign: rt.dirSign,
        minBound: rt.minB,
        maxBound: rt.maxB,
        destroyed: false,
        respawnTimer: 0,
        stopTimer: 0,
        lastStopCoord: -99999,
      });
    });

    // =========================================================================
    // 5. HUMAN PLAYER CHARACTER (Customizable Individual Attributes + Weapon)
    // =========================================================================
    const playerContainer = new THREE.Group();
    playerContainer.position.copy(humanPosRef.current);
    scene.add(playerContainer);
    playerGroupRef.current = playerContainer;
    const playerGrp = playerContainer;

    // Direct Vertical Drop-Shadow under the player for 3D platforming depth perception
    const playerDropShadowGroup = new THREE.Group();
    playerDropShadowGroup.visible = false;
    const dropShadowDiscMat = new THREE.MeshBasicMaterial({
      color: 0x050811,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const dropShadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), dropShadowDiscMat);
    dropShadowDisc.rotation.x = -Math.PI / 2;
    playerDropShadowGroup.add(dropShadowDisc);
    scene.add(playerDropShadowGroup);

    let pLegL = new THREE.Group();
    let pLegR = new THREE.Group();
    let pArmL = new THREE.Group();
    let pArmR = new THREE.Group();
    let playerWeaponMesh: THREE.Group | null = null;
    let playerMuzzleFlash: THREE.Mesh | null = null;
    let playerJetpackMesh: THREE.Group | null = null;
    let punchAnimTimer = 0;

    // 1st-Person Viewmodel Group so weapon & attack animations are clearly visible in 1st-Person too!
    const fpWeaponGroup = new THREE.Group();
    fpWeaponGroup.visible = false;
    scene.add(fpWeaponGroup);
    let fpWeaponMesh: THREE.Group | null = null;
    let fpMuzzleFlash: THREE.Mesh | null = null;

    const weaponAnimState = {
      type: 'unarmed',
      timer: 0,
      duration: 0.28,
      muzzleTimer: 0,
      handSide: 1 as 1 | -1,
    };

    const triggerWeaponUseAnimation = (wType: string) => {
      weaponAnimState.type = wType;
      weaponAnimState.handSide = (weaponAnimState.handSide * -1) as 1 | -1;
      if (wType === 'gravity_hammer') {
        weaponAnimState.duration = 0.46;
        weaponAnimState.timer = 0.46;
        punchAnimTimer = 0.46;
      } else if (wType === 'melee') {
        weaponAnimState.duration = 0.34;
        weaponAnimState.timer = 0.34;
        punchAnimTimer = 0.34;
      } else if (wType === 'unarmed') {
        weaponAnimState.duration = 0.26;
        weaponAnimState.timer = 0.26;
        punchAnimTimer = 0.26;
      } else if (wType === 'chainsaw') {
        weaponAnimState.duration = 0.2;
        weaponAnimState.timer = 0.2;
        punchAnimTimer = 0.2;
      } else if (wType === 'grenade' || wType === 'timebomb' || wType === 'remotebomb') {
        weaponAnimState.duration = 0.36;
        weaponAnimState.timer = 0.36;
        punchAnimTimer = 0.36;
      } else if (wType === 'orbital_laser' || wType === 'meteor_staff') {
        weaponAnimState.duration = 0.42;
        weaponAnimState.timer = 0.42;
        punchAnimTimer = 0.42;
      } else {
        // Firearms, Shotgun, Sniper, RPG, Minigun, Cluster Launcher, Firework Cannon, Grapple Gun
        const isHeavyGun =
          wType === 'rpg' ||
          wType === 'shotgun' ||
          wType === 'sniper' ||
          wType === 'cluster_launcher' ||
          wType === 'firework_cannon';
        const dur = wType === 'minigun' ? 0.11 : wType === 'smg' ? 0.13 : isHeavyGun ? 0.3 : 0.2;
        weaponAnimState.duration = dur;
        weaponAnimState.timer = dur;
        weaponAnimState.muzzleTimer = 0.08;
        punchAnimTimer = dur;
      }
    };

    const discoLight = new THREE.PointLight(0xd946ef, 0, 18);
    scene.add(discoLight);

    const spawnPlayerWeapon = (weaponId: string) => {
      if (playerWeaponMesh) {
        pArmR.remove(playerWeaponMesh);
        playerWeaponMesh = null;
        playerMuzzleFlash = null;
      }
      while (fpWeaponGroup.children.length > 0) {
        fpWeaponGroup.remove(fpWeaponGroup.children[0]);
      }
      fpWeaponMesh = null;
      fpMuzzleFlash = null;

      const miscGadget = (MISC_ITEMS_CATALOG || []).find((m) => m.weaponPayload?.id === weaponId)?.weaponPayload;
      const wData = (WEAPONS_CATALOG || []).find((w) => w.id === weaponId) || miscGadget;
      const wType = !weaponId || weaponId === 'weapon-fist' || !wData ? 'unarmed' : wData.type;
      weaponAnimState.type = wType;

      if (wType !== 'unarmed') {
        const wMesh = buildWeapon3DModel(wType);
        wMesh.position.set(0, -0.56, 0.26);
        wMesh.rotation.x = Math.PI / 2;

        const mFlash = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.16, 0),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        mFlash.position.set(0, 0.08, 0.55);
        mFlash.visible = false;
        wMesh.add(mFlash);

        pArmR.add(wMesh);
        playerWeaponMesh = wMesh;
        playerMuzzleFlash = mFlash;

        const fpMesh = buildWeapon3DModel(wType);
        const fpFlash = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.14, 0),
          new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        fpFlash.position.set(0, 0.08, 0.55);
        fpFlash.visible = false;
        fpMesh.add(fpFlash);
        fpWeaponGroup.add(fpMesh);
        fpWeaponMesh = fpMesh;
        fpMuzzleFlash = fpFlash;
      } else {
        // First-person articulated human arm & fist viewmodel (never a floating detached box!)
        const cfg = stateRef.current.customCharacter || DEFAULT_CUSTOM_CHARACTER;
        const armBuilt = buildFirstPersonArmViewModel(cfg.skinColor, cfg.topColor);
        fpWeaponGroup.add(armBuilt.group);
        fpWeaponMesh = armBuilt.group;
      }
    };
    equipWeaponFnRef.current = spawnPlayerWeapon;

    const spawnPlayerAvatar = (customCfg?: CustomCharacterConfig) => {
      while (playerContainer.children.length > 0) {
        playerContainer.remove(playerContainer.children[0]);
      }
      const cfg = customCfg || stateRef.current.customCharacter || DEFAULT_CUSTOM_CHARACTER;
      const built = buildHumanCharacter3D({
        skinColor: cfg.skinColor,
        topColor: cfg.topColor,
        secondaryTopColor: cfg.secondaryTopColor,
        pantsColor: cfg.pantsColor,
        shoeColor: cfg.shoeColor,
        hairColor: cfg.hairColor,
        eyeColor: cfg.eyeColor,
        hairStyle: cfg.hairStyle,
        facialHair: cfg.facialHair,
        topStyle: cfg.topStyle,
        pantsStyle: cfg.pantsStyle,
        hatStyle: cfg.hatStyle,
        hatColor: cfg.hatColor,
        glassesStyle: cfg.glassesStyle,
        glassesColor: cfg.glassesColor,
        accessory: cfg.accessory,
        accessoryColor: cfg.accessoryColor,
        heightScale: cfg.heightScale,
        widthScale: cfg.widthScale,
      });
      built.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
        }
      });
      playerContainer.add(built.group);
      pLegL = built.legL;
      pLegR = built.legR;
      pArmL = built.armL;
      pArmR = built.armR;

      playerJetpackMesh = buildPlayerJetpack3D();
      playerJetpackMesh.visible = (stateRef.current.activeMiscIds || []).includes('misc-jetpack');
      built.group.add(playerJetpackMesh);

      spawnPlayerWeapon(stateRef.current.activeWeaponId || 'weapon-fist');
    };
    rebuildAvatarFnRef.current = spawnPlayerAvatar;
    spawnPlayerAvatar(customCharacter);

    const attachHeadlightSpotlightsToCar = (carGrp: THREE.Group) => {
      // Removed lighting effects for cars as requested
    };

    // =========================================================================
    // 6. EXTERIOR VEHICLE SPAWNING (Cars & Motorcycles ALWAYS spawn outside buildings, NEVER in walls!)
    // =========================================================================
    const spawnCarNextToPlayer = (targetCarId: string | null) => {
      const activeData =
        CARS_CATALOG.find((c) => c.id === targetCarId) ||
        stateRef.current.ownedCars.find((c) => c.id === targetCarId) ||
        CARS_CATALOG[0];

      if (stateRef.current.activeVehicle === 'car' || stateRef.current.isDrivingCar) {
        stateRef.current.onExitVehicle?.();
        stateRef.current.onExitCar?.();
      }

      archiveActiveCarIfPresent();

      const modelData = buildCar3DModel(activeData);
      attachHeadlightSpotlightsToCar(modelData.group);
      const isPvpActive = Boolean(stateRef.current.pvpConfig?.active);
      const safeSpot = isPvpActive
        ? { x: humanPosRef.current.x, z: humanPosRef.current.z }
        : findSafeExteriorVehicleSpot(
            humanPosRef.current.x + 4.2,
            humanPosRef.current.z + 1.5
          );
      const spawnX = safeSpot.x;
      const spawnZ = safeSpot.z;
      const spawnRotY = isPvpActive ? 0 : humanRotRef.current;

      modelData.group.position.set(spawnX, 0, spawnZ);
      modelData.group.rotation.y = spawnRotY;
      modelData.group.visible = true;
      scene.add(modelData.group);

      activeCarGroupRef.current = modelData.group;
      activeCarSpecRef.current = activeData;
      carWheelsRef.current = modelData.wheels;
      hasSpawnedCarRef.current = true;

      carPhysicsRef.current.x = spawnX;
      carPhysicsRef.current.z = spawnZ;
      carPhysicsRef.current.rotationY = spawnRotY;
      carPhysicsRef.current.speed = 0;
      carPhysicsRef.current.steering = 0;
      carHealthRef.current = 100;
      setCarHealth(100);
      stateRef.current.onSpeedUpdate?.(0);
    };
    spawnCarFnRef.current = spawnCarNextToPlayer;

    const spawnMotorcycleNextToPlayer = (targetMotoId: string) => {
      const motoData =
        MOTORCYCLES_CATALOG.find((m) => m.id === targetMotoId) || MOTORCYCLES_CATALOG[0];

      if (activeMotorcycleGroupRef.current) {
        scene.remove(activeMotorcycleGroupRef.current);
        activeMotorcycleGroupRef.current = null;
      }

      const isPvpActive = Boolean(stateRef.current.pvpConfig?.active);
      const safeSpot = isPvpActive
        ? { x: humanPosRef.current.x, z: humanPosRef.current.z }
        : findSafeExteriorVehicleSpot(
            humanPosRef.current.x + 2.8,
            humanPosRef.current.z + 1.5
          );
      const spawnX = safeSpot.x;
      const spawnZ = safeSpot.z;
      const spawnRotY = isPvpActive ? 0 : humanRotRef.current;

      if (isPvpActive) {
        if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
        if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = false;
        if (activePlaneGroupRef.current) activePlaneGroupRef.current.visible = false;
        if (activeExcavatorGroupRef.current) activeExcavatorGroupRef.current.visible = false;
      }

      const builtMoto = buildMotorcycle3DModel(motoData);
      builtMoto.group.rotation.order = 'YXZ';
      builtMoto.group.position.set(spawnX, 0, spawnZ);
      builtMoto.group.rotation.set(0, spawnRotY, 0);
      builtMoto.group.visible = true;
      scene.add(builtMoto.group);

      activeMotorcycleGroupRef.current = builtMoto.group;
      motorcycleWheelsRef.current = builtMoto.wheels;
      motorcycleSteeringGroupRef.current = builtMoto.steeringGroup;
      hasSpawnedMotorcycleRef.current = true;

      motorcyclePhysicsRef.current.x = spawnX;
      motorcyclePhysicsRef.current.z = spawnZ;
      motorcyclePhysicsRef.current.rotationY = spawnRotY;
      motorcyclePhysicsRef.current.speed = 0;
      motorcyclePhysicsRef.current.steering = 0;
      motorcyclePhysicsRef.current.leanAngle = 0;
      motorcyclePhysicsRef.current.wheeliePitch = 0;
    };
    spawnMotorcycleFnRef.current = spawnMotorcycleNextToPlayer;

    const spawnHelicopterNextToPlayer = (targetHeliId: string) => {
      const hData =
        HELICOPTERS_CATALOG.find((h) => h.id === targetHeliId) || HELICOPTERS_CATALOG[0];

      if (activeHeliGroupRef.current) {
        scene.remove(activeHeliGroupRef.current);
        activeHeliGroupRef.current = null;
      }

      const isPvpActive = Boolean(stateRef.current.pvpConfig?.active);
      const safeSpot = isPvpActive
        ? { x: humanPosRef.current.x, z: humanPosRef.current.z }
        : findSafeExteriorVehicleSpot(
            humanPosRef.current.x + 6.0,
            humanPosRef.current.z - 1.5
          );
      const spawnX = safeSpot.x;
      const spawnZ = safeSpot.z;
      const spawnY = isPvpActive ? 22.0 : Math.max(0.18, humanPosRef.current.y + 0.18);

      if (isPvpActive) {
        if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
        if (activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = false;
        if (activePlaneGroupRef.current) activePlaneGroupRef.current.visible = false;
        if (activeExcavatorGroupRef.current) activeExcavatorGroupRef.current.visible = false;
      }

      const heliModelData = buildHelicopter3DModel(hData.style, hData.color, hData.accentColor);
      const heliMeshGroup = heliModelData.group;
      heliMeshGroup.rotation.order = 'YXZ';
      heliMeshGroup.position.set(spawnX, spawnY, spawnZ);
      heliMeshGroup.rotation.set(0, humanRotRef.current, 0);
      scene.add(heliMeshGroup);

      activeHeliGroupRef.current = heliMeshGroup;
      mainRotorRef.current = heliModelData.mainRotor;
      tailRotorRef.current = heliModelData.tailRotor;
      heliBeaconLightRef.current = heliModelData.beaconLight;
      hasSpawnedHeliRef.current = true;

      helicopterPhysicsRef.current.x = spawnX;
      helicopterPhysicsRef.current.y = spawnY;
      helicopterPhysicsRef.current.z = spawnZ;
      helicopterPhysicsRef.current.rotationY = humanRotRef.current;
      helicopterPhysicsRef.current.speed = 0;
      helicopterPhysicsRef.current.verticalSpeed = 0;
      helicopterPhysicsRef.current.tiltPitch = 0;
      helicopterPhysicsRef.current.tiltRoll = 0;
      heliHealthRef.current = 100;
      setHeliHealth(100);
    };
    spawnHeliFnRef.current = spawnHelicopterNextToPlayer;

    const spawnPlaneNextToPlayer = (targetPlaneId: string) => {
      const pData =
        PLANES_CATALOG.find((p) => p.id === targetPlaneId) || PLANES_CATALOG[0];

      if (activePlaneGroupRef.current) {
        scene.remove(activePlaneGroupRef.current);
        activePlaneGroupRef.current = null;
      }

      const isPvpActive = Boolean(stateRef.current.pvpConfig?.active);
      let spawnX = PVP_ARENA_X;
      let spawnZ = PVP_ARENA_Z - 120;
      let spawnY = 45.0;
      let spawnRotY = 0;

      if (!isPvpActive) {
        // Find an open road/boulevard centerline near the player and orient the aircraft down the longest clear runway path!
        const px = humanPosRef.current.x;
        const pz = humanPosRef.current.z;
        let nearestStreetZ = crossStreetZs[0];
        let minDz = Math.abs(pz - nearestStreetZ);
        for (const sz of crossStreetZs) {
          const d = Math.abs(pz - sz);
          if (d < minDz) {
            minDz = d;
            nearestStreetZ = sz;
          }
        }
        const allAvenues = [HW_X, ...cityAvenueXs];
        let nearestAveX = allAvenues[0];
        let minDx = Math.abs(px - nearestAveX);
        for (const ax of allAvenues) {
          const d = Math.abs(px - ax);
          if (d < minDx) {
            minDx = d;
            nearestAveX = ax;
          }
        }

        let candX = px;
        let candZ = pz;
        if (minDz <= minDx && minDz < 28) {
          candX = px;
          candZ = nearestStreetZ;
        } else if (minDx < 28) {
          candX = nearestAveX;
          candZ = pz;
        }
        const safeSpot = findSafeExteriorVehicleSpot(px, pz, candX, candZ);
        spawnX = safeSpot.x;
        spawnZ = safeSpot.z;
        spawnY = 0.15;

        // Evaluate the 4 cardinal runway headings (E, W, N, S) to pick the direction with the longest clear takeoff path
        const candidateHeadings = [Math.PI / 2, -Math.PI / 2, 0, Math.PI];
        let bestHeading = Math.abs( Math.sin(humanRotRef.current) ) >= Math.abs( Math.cos(humanRotRef.current) )
          ? (Math.sin(humanRotRef.current) >= 0 ? Math.PI / 2 : -Math.PI / 2)
          : (Math.cos(humanRotRef.current) >= 0 ? 0 : Math.PI);
        let bestClearDist = -1;

        for (const hdg of candidateHeadings) {
          const dirX = Math.sin(hdg);
          const dirZ = Math.cos(hdg);
          let clearDist = 120;
          for (let d = 6; d <= 120; d += 6) {
            const tx = spawnX + dirX * d;
            const tz = spawnZ + dirZ * d;
            if (isPointInsideAnyBuildingFootprint(tx, tz, 3.2)) {
              clearDist = d;
              break;
            }
          }
          // Slight tie-breaker bonus for aligning with the road axis the plane is sitting on
          const onEastWestStreet = Math.abs(spawnZ - nearestStreetZ) < 6.0;
          const axisBonus = onEastWestStreet && Math.abs(dirX) > 0.5 ? 15 : !onEastWestStreet && Math.abs(dirZ) > 0.5 ? 15 : 0;
          if (clearDist + axisBonus > bestClearDist) {
            bestClearDist = clearDist + axisBonus;
            bestHeading = hdg;
          }
        }
        spawnRotY = bestHeading;
      }

      if (isPvpActive) {
        if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
        if (activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = false;
        if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = false;
        if (activeExcavatorGroupRef.current) activeExcavatorGroupRef.current.visible = false;
      }

      const planeModelData = buildAirplane3DModel(pData.style, pData.color, pData.accentColor);
      const planeMeshGroup = planeModelData.group;
      planeMeshGroup.rotation.order = 'YXZ';
      planeMeshGroup.position.set(spawnX, spawnY, spawnZ);
      planeMeshGroup.rotation.set(0, spawnRotY, 0);
      scene.add(planeMeshGroup);

      activePlaneGroupRef.current = planeMeshGroup;
      planePropellerRef.current = planeModelData.propeller;
      planeAfterburnersRef.current = planeModelData.afterburners;
      hasSpawnedPlaneRef.current = true;

      planePhysicsRef.current.x = spawnX;
      planePhysicsRef.current.y = spawnY;
      planePhysicsRef.current.z = spawnZ;
      planePhysicsRef.current.rotationY = spawnRotY;
      planePhysicsRef.current.speed = 0;
      planePhysicsRef.current.verticalSpeed = 0;
      planePhysicsRef.current.pitch = 0;
      planePhysicsRef.current.roll = 0;
      planeHealthRef.current = 100;
      setPlaneHealth(100);
      planeQuatRef.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), spawnRotY);
      planeFlightDynRef.current = {
        pitchRate: 0,
        rollRate: 0,
        yawRate: 0,
        aoa: 0,
        stallFactor: 0,
        throttle: 0,
      };
      // Always spawn planes with landing gear DOWN (press G to retract with animation!)
      planeGearDownRef.current = true;
      planeGearAnimRef.current = 0;
      setPlaneGearDown(true);
      planeThrottlePctRef.current = 0;
      setPlaneThrottlePct(0);

      // Automatically board the spawned aircraft on the runway with camera aligned smoothly behind it for an elegant launch!
      smoothVehicleRotYRef.current = spawnRotY;
      cameraYawRef.current = 0;
      smoothCamYawRef.current = 0;
      cameraPitchRef.current = 0.24;
      smoothCamPitchRef.current = 0.24;
      stateRef.current.onEnterVehicle ? stateRef.current.onEnterVehicle('plane') : stateRef.current.onEnterCar();
    };
    spawnPlaneFnRef.current = spawnPlaneNextToPlayer;

    const spawnExcavatorNextToPlayer = () => {
      if (activeExcavatorGroupRef.current) {
        scene.remove(activeExcavatorGroupRef.current);
        activeExcavatorGroupRef.current = null;
      }
      const isPvpActive = Boolean(stateRef.current.pvpConfig?.active);
      const spawnX = isPvpActive ? humanPosRef.current.x : humanPosRef.current.x - 5.2;
      const spawnZ = isPvpActive ? humanPosRef.current.z : humanPosRef.current.z + 2.0;

      if (isPvpActive) {
        if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
        if (activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = false;
        if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = false;
        if (activePlaneGroupRef.current) activePlaneGroupRef.current.visible = false;
      }

      const excModelData = buildExcavator3DModel();
      excModelData.group.position.set(spawnX, 0, spawnZ);
      excModelData.group.rotation.y = humanRotRef.current;
      scene.add(excModelData.group);

      activeExcavatorGroupRef.current = excModelData.group;
      excavatorBoomRef.current = excModelData.boomGroup;
      excavatorArmRef.current = excModelData.armGroup;
      excavatorBucketRef.current = excModelData.bucketGroup;
      hasSpawnedExcavatorRef.current = true;

      excavatorPhysicsRef.current.x = spawnX;
      excavatorPhysicsRef.current.y = 0;
      excavatorPhysicsRef.current.z = spawnZ;
      excavatorPhysicsRef.current.rotationY = humanRotRef.current;
      excavatorPhysicsRef.current.speed = 0;
    };
    spawnExcavatorFnRef.current = spawnExcavatorNextToPlayer;

    const projectilesGroup = new THREE.Group();
    scene.add(projectilesGroup);

    // =========================================================================
    // NATURAL DISASTERS, POLICE PURSUIT UNITS & PVP BATTLE ARENA SYSTEMS
    // =========================================================================
    // Rising Flood Water 3D Plane
    const floodWaterGeo = new THREE.PlaneGeometry(10000, 10000, 8, 8);
    const floodWaterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      metalness: 0.35,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });
    const floodWaterMesh = new THREE.Mesh(floodWaterGeo, floodWaterMat);
    floodWaterMesh.rotation.x = -Math.PI / 2;
    floodWaterMesh.position.set(0, -5, 0);
    floodWaterMesh.visible = false;
    scene.add(floodWaterMesh);
    let floodWaterY = 0;
    let floodCountdownTimer = 30.0;
    let lastDisplayedFloodCountdown: number | null = null;
    let lastActiveDisaster: string = 'none';
    let playerAirbornePeakY = 0;

    const resetFloodToCountdown = () => {
      floodWaterY = 0;
      floodCountdownTimer = 30.0;
      floodWaterMesh.position.y = -5;
      floodWaterMesh.visible = false;
      lastDisplayedFloodCountdown = 30;
      setFloodCountdownSec(30);
      setFloodHeightDisplay(null);
      stateRef.current.onFloodHeightUpdate?.(0);
    };

    // Natural Disasters Elements Registry
    const tornadoGroup = new THREE.Group();
    const tornadoRings: THREE.Mesh[] = [];
    const tornadoPos = { x: 0, z: 0, vx: 0, vz: 0, timer: 0 };
    let meteorSpawnTimer = 0;
    let earthquakePulseTimer = 0;

    // Police Pursuit Units (Cruisers + Armed Foot Officers)
    const policeGroup = new THREE.Group();
    scene.add(policeGroup);
    const policeCruisers: {
      group: THREE.Group;
      wheels: THREE.Object3D[];
      x: number;
      z: number;
      rotY: number;
      speed: number;
      health: number;
      maxHealth: number;
      destroyed: boolean;
      deployedOfficers: boolean;
      sirenTimer: number;
      collisionCooldown?: number;
      healthBarFill: THREE.Mesh;
      healthBarGroup: THREE.Group;
    }[] = [];

    const policeOfficers: {
      group: THREE.Group;
      legL: THREE.Group;
      legR: THREE.Group;
      armL: THREE.Group;
      armR: THREE.Group;
      weaponMesh?: THREE.Group;
      health: number;
      maxHealth: number;
      dead: boolean;
      shootCooldown: number;
      shootAnimTimer?: number;
      muzzleFlash?: THREE.Mesh;
      healthBarFill: THREE.Mesh;
      healthBarGroup: THREE.Group;
    }[] = [];

    const spawnPoliceCruiserNearPlayer = () => {
      if (stateRef.current.pvpConfig?.active) return;
      const pPos = getActivePlayerWorldPos();
      let sx = pPos.x + 150;
      let sz = pPos.z + 150;
      for (let attempt = 0; attempt < 15; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 100;
        const testX = pPos.x + Math.cos(angle) * dist;
        const testZ = pPos.z + Math.sin(angle) * dist;
        if (
          Math.hypot(testX - pPos.x, testZ - pPos.z) >= 120 &&
          !isPointInsideAnyBuildingFootprint(testX, testZ, 2.0) &&
          !isPointBlockedByCollider(testX, testZ, 2.0, 0)
        ) {
          sx = testX;
          sz = testZ;
          break;
        }
      }
      const built = buildCar3DModel({
        id: 'car-police-cruiser',
        name: 'Interceptor Police Cruiser',
        modelStyle: 'police_cruiser',
        category: 'police',
        price: 0,
        color: '#111827',
        maxSpeed: 165,
        acceleration: 9,
        handling: 9,
        description: 'Police Pursuit Cruiser',
      });
      built.group.position.set(sx, 0, sz);

      const hbGroup = new THREE.Group();
      hbGroup.visible = false;
      const hbFill = new THREE.Mesh(
        new THREE.PlaneGeometry(1.92, 0.16),
        new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide })
      );

      policeGroup.add(built.group);
      policeCruisers.push({
        group: built.group,
        wheels: built.wheels,
        x: sx,
        z: sz,
        rotY: Math.atan2(pPos.x - sx, pPos.z - sz),
        speed: 60,
        health: 100,
        maxHealth: 100,
        destroyed: false,
        deployedOfficers: false,
        sirenTimer: Math.random() * 0.8,
        collisionCooldown: 0,
        healthBarFill: hbFill,
        healthBarGroup: hbGroup,
      });
    };

    const spawnPoliceOfficerAt = (rawOx: number, rawOz: number) => {
      if (stateRef.current.pvpConfig?.active) return;
      let ox = rawOx;
      let oz = rawOz;
      if (isPointInsideAnyBuildingFootprint(ox, oz, 0.4)) {
        const safe = findSafeExteriorVehicleSpot(ox, oz);
        ox = safe.x;
        oz = safe.z;
      }
      const built = buildHumanCharacter3D({
        skinColor: '#f1c27d',
        topColor: '#1e3a8a',
        pantsColor: '#0f172a',
        shoeColor: '#000000',
        hairColor: '#1c1917',
        hasCap: true,
        hasSunglasses: true,
      });
      const wModel = buildWeapon3DModel('rifle');
      wModel.position.set(0, -0.56, 0.14);
      // Pre-rotate weapon by +90 deg on X so when armR is raised (-90 deg X), the gun barrel points horizontally forward (+Z), never up!
      wModel.rotation.x = Math.PI / 2;
      const poMuzzle = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      poMuzzle.position.set(0, 0.02, 0.56);
      poMuzzle.visible = false;
      wModel.add(poMuzzle);
      built.armR.add(wModel);
      built.armR.rotation.x = -0.85;
      wModel.rotation.x = 0.85;
      built.armL.rotation.x = -0.78;
      built.armL.rotation.z = 0.22;
      built.group.position.set(ox, 0, oz);

      const hbGroup = new THREE.Group();
      hbGroup.position.set(0, 2.4, 0);
      const hbBg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
      );
      const hbFill = new THREE.Mesh(
        new THREE.PlaneGeometry(1.52, 0.14),
        new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide })
      );
      hbFill.position.z = 0.01;
      hbGroup.add(hbBg, hbFill);
      built.group.add(hbGroup);

      policeGroup.add(built.group);
      policeOfficers.push({
        group: built.group,
        legL: built.legL,
        legR: built.legR,
        armL: built.armL,
        armR: built.armR,
        weaponMesh: wModel,
        health: 500,
        maxHealth: 500,
        dead: false,
        shootCooldown: 0.5 + Math.random() * 0.5,
        shootAnimTimer: 0,
        muzzleFlash: poMuzzle,
        healthBarFill: hbFill,
        healthBarGroup: hbGroup,
      });
    };

    const damagePoliceOfficer = (
      po: (typeof policeOfficers)[0],
      damage: number,
      _weaponName: string = 'Weapon',
      isNaturalDisaster: boolean = false
    ) => {
      if (po.dead) return;
      po.health = Math.max(0, po.health - damage);
      const ratio = Math.max(0.001, po.health / po.maxHealth);
      po.healthBarFill.scale.x = ratio;
      po.healthBarFill.position.x = -(1 - ratio) * 0.76;
      (po.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(
        ratio > 0.5 ? 0x3b82f6 : ratio > 0.25 ? 0xf59e0b : 0xef4444
      );
      soundFX.playPlaceObject();
      triggerBloodSplatter(po.group.position.x, 1.2, po.group.position.z, 14);

      if (po.health <= 0) {
        po.dead = true;
        po.healthBarGroup.visible = false;
        if (po.muzzleFlash) po.muzzleFlash.visible = false;
        const poy = po.group.position.y;
        const groundY = poy > 0.6 ? poy : 0.18;
        applyRandomDeathPose(
          po.group,
          { legL: po.legL, legR: po.legR, armL: po.armL, armR: po.armR },
          groundY
        );
        triggerBloodSplatter(po.group.position.x, groundY + 0.5, po.group.position.z, 32);
        soundFX.playLowPolyExplosion();
        if (!isNaturalDisaster) {
          reportPlayerCrime(1);
          stateRef.current.onEarnMoney?.(4000, 'Killed Cop', { x: po.group.position.x, y: 1.5, z: po.group.position.z });
        }
      }
    };

    let damagePlayerNearCarExplosionRef: ((carX: number, carY: number, carZ: number, blastRadius?: number) => void) | null = null;

    const damagePoliceCruiser = (pc: (typeof policeCruisers)[0], _damage: number, _weaponName: string = 'Weapon') => {
      if (pc.destroyed) return;
      pc.destroyed = true;
      pc.health = 0;
      pc.healthBarGroup.visible = false;
      pc.group.visible = false;
      spawnDebrisBurst(pc.x, 1.0, pc.z, 34);
      soundFX.playExplosion();
      damagePlayerNearCarExplosionRef?.(pc.x, 1.0, pc.z, 7.0);
      reportPlayerCrime(1);
      stateRef.current.onEarnMoney?.(6000, 'Destroyed Police Car', { x: pc.x, y: 1.0, z: pc.z });
    };

    let clearAllBombsAndProjectilesRef: (() => void) | null = null;

    const damagePvpEnemy = (pe: (typeof pvpEnemies)[0], damage: number) => {
      if (pe.dead) return;
      const effectiveDamage = damage;
      pe.health = Math.max(0, pe.health - effectiveDamage);
      const ratio = Math.max(0.001, pe.health / pe.maxHealth);
      pe.healthBarFill.scale.x = ratio;
      pe.healthBarFill.position.x = -(1 - ratio) * (pe.kind === 'on_foot' ? 0.86 : 1.2);
      (pe.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(
        ratio > 0.5 ? 0xef4444 : ratio > 0.25 ? 0xf59e0b : 0xd97706
      );
      if (pe.kind === 'on_foot') {
        triggerBloodSplatter(pe.x, 1.15, pe.z, 10);
      }
      soundFX.playPlaceObject();

      if (pe.health <= 0) {
        pe.dead = true;
        pe.healthBarGroup.visible = false;
        if (pe.muzzleFlash) pe.muzzleFlash.visible = false;
        if (pe.kind === 'on_foot') {
          // Bloody fall-down death animation in a completely random direction!
          triggerBloodSplatter(pe.x, 1.1, pe.z, 22);
          applyRandomDeathPose(
            pe.group,
            { legL: pe.legL, legR: pe.legR, armL: pe.armL, armR: pe.armR },
            0.22
          );
          soundFX.playLowPolyExplosion();
        } else {
          pe.group.visible = false;
          spawnDebrisBurst(pe.x, pe.y + 0.8, pe.z, 48);
          soundFX.playExplosion();
          if (pe.kind === 'car') {
            damagePlayerNearCarExplosionRef?.(pe.x, pe.y + 0.8, pe.z, 7.0);
          }
        }
        const alive = pvpEnemies.filter((e) => !e.dead).length;
        stateRef.current.onPvpRemainingUpdate?.(alive);
        stateRef.current.onPvpRemainingEnemiesChange?.(alive);
        if (alive === 0 && !pvpRoundEnded) {
          pvpRoundEnded = true;
          soundFX.playApplause?.();
          stateRef.current.onBattleRoundEnd?.('player', pvpEnemies.length);
        }
      }
    };

    // PvP Battle Arena Enemies (Elite Foot Soldiers with customizable weapons)
    let pvpRoundEnded = false;
    const pvpArenaGroup = new THREE.Group();
    scene.add(pvpArenaGroup);
    const pvpEnemies: {
      kind: 'on_foot' | 'car' | 'helicopter' | 'plane';
      group: THREE.Group;
      x: number;
      y: number;
      z: number;
      rotY: number;
      speed: number;
      health: number;
      maxHealth: number;
      dead: boolean;
      attackCooldown: number;
      shootAnimTimer?: number;
      muzzleFlash?: THREE.Mesh;
      strafeDir?: number;
      strafeTimer?: number;
      lineOffsetX?: number;
      isHeavyRpg?: boolean;
      weaponType?: string;
      weaponName?: string;
      isMelee?: boolean;
      legL?: THREE.Group;
      legR?: THREE.Group;
      armL?: THREE.Group;
      armR?: THREE.Group;
      weaponMesh?: THREE.Group;
      mainRotor?: THREE.Object3D | null;
      tailRotor?: THREE.Object3D | null;
      healthBarFill: THREE.Mesh;
      healthBarGroup: THREE.Group;
    }[] = [];

    const clearPvpEnemies = () => {
      while (pvpArenaGroup.children.length > 0) {
        pvpArenaGroup.remove(pvpArenaGroup.children[0]);
      }
      pvpEnemies.length = 0;
    };

    const startPvpBattleArena = () => {
      const cfg = stateRef.current.pvpConfig;
      clearPvpEnemies();
      clearAllBombsAndProjectilesRef?.();
      if (!cfg || !cfg.active) {
        cityGroup.visible = true;
        houseGroup.visible = true;
        return;
      }

      // Save exact city coordinates before teleporting to the dedicated Battle Mode grassland map at (3200, 3200)
      if (!savedCityPlayerPos) {
        const curWorldPos = getActivePlayerWorldPos();
        savedCityPlayerPos = {
          x: Math.abs(curWorldPos.x) < 1500 ? curWorldPos.x : lastKnownCityPos.x,
          y: Math.max(0, curWorldPos.y < 320 ? curWorldPos.y : lastKnownCityPos.y),
          z: Math.abs(curWorldPos.z) < 1500 ? curWorldPos.z : lastKnownCityPos.z,
        };
      }

      // Hide all city buildings, houses, streets, sidewalks, stop signs, cars, police, and trees!
      cityGroup.visible = false;
      houseGroup.visible = false;
      mainRoadMesh.visible = false;
      roadPropsGroup.visible = false;
      allRoadsInst.visible = false;
      allStopPostsInst.visible = false;
      allStopSignsInst.visible = false;
      allYellowDashesInst.visible = false;
      allWhiteEdgesInst.visible = false;
      allSidewalksInst.visible = false;
      allZebraInst.visible = false;
      excavatorRoadsGroup.visible = false;
      fallingTreesGroup.visible = false;
      policeGroup.visible = false;
      npcCarsGroup.visible = false;
      for (const tc of npcTrafficCars) tc.group.visible = false;
      for (const pk of parkedCars) pk.group.visible = false;
      for (const pc of policeCruisers) pc.group.visible = false;
      for (const po of policeOfficers) po.group.visible = false;
      for (const n of npcMeshes) n.group.visible = false;
      for (const ch of forestChunks) ch.group.visible = false;

      if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
      if (activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = false;
      if (activeHeliGroupRef.current && cfg.playerMode !== 'helicopter') activeHeliGroupRef.current.visible = false;
      if (activePlaneGroupRef.current && cfg.playerMode !== 'plane') activePlaneGroupRef.current.visible = false;

      // Teleport Player to the Dedicated Grassland Battle Arena Map at (PVP_ARENA_X, PVP_ARENA_Z) facing +Z
      isExplodingRef.current = false;
      isDeathByExplosionRef.current = false;
      isVoidFallRef.current = false;
      explosionTimerRef.current = 0;
      setDeathScreenInfo(null);
      playerContainer.visible = true;
      playerGrp.rotation.set(0, 0, 0);
      playerHealthRef.current = 100;
      setPlayerHealth(100);
      carHealthRef.current = 100;
      setCarHealth(100);
      heliHealthRef.current = 100;
      setHeliHealth(100);
      planeHealthRef.current = 100;
      setPlaneHealth(100);
      cameraYawRef.current = 0;
      smoothCamYawRef.current = 0;
      carCameraYawRef.current = 0;
      humanPosRef.current.set(PVP_ARENA_X, 0, PVP_ARENA_Z);
      playerContainer.position.set(PVP_ARENA_X, 0, PVP_ARENA_Z);

      if (cfg.playerMode === 'foot') {
        stateRef.current.onExitVehicle?.();
        humanPosRef.current.set(PVP_ARENA_X, 0, PVP_ARENA_Z);
        humanVelYRef.current = 0;
        humanRotRef.current = 0;
        playerContainer.position.set(PVP_ARENA_X, 0, PVP_ARENA_Z);
        playerGrp.rotation.set(0, 0, 0);
      } else if (cfg.playerMode === 'helicopter') {
        hasSpawnedHeliRef.current = true;
        spawnHelicopterNextToPlayer(cfg.playerVehicleId || stateRef.current.activeHeliId || 'heli-apache');
        helicopterPhysicsRef.current.x = PVP_ARENA_X;
        helicopterPhysicsRef.current.y = 22;
        helicopterPhysicsRef.current.z = PVP_ARENA_Z;
        helicopterPhysicsRef.current.speed = 0;
        helicopterPhysicsRef.current.verticalSpeed = 0;
        helicopterPhysicsRef.current.rotationY = 0;
        smoothVehicleRotYRef.current = 0;
        if (activeHeliGroupRef.current) {
          activeHeliGroupRef.current.visible = true;
          activeHeliGroupRef.current.position.set(PVP_ARENA_X, 22, PVP_ARENA_Z);
          activeHeliGroupRef.current.rotation.set(0, 0, 0);
        }
        stateRef.current.onEnterVehicle?.('helicopter');
      } else if (cfg.playerMode === 'plane') {
        hasSpawnedPlaneRef.current = true;
        spawnPlaneNextToPlayer(cfg.playerVehicleId || stateRef.current.activePlaneId || 'plane-darkstar');
        planePhysicsRef.current.x = PVP_ARENA_X;
        planePhysicsRef.current.y = 45;
        planePhysicsRef.current.z = PVP_ARENA_Z - 120;
        planePhysicsRef.current.speed = 65;
        planePhysicsRef.current.rotationY = 0;
        planePhysicsRef.current.pitch = 0;
        planePhysicsRef.current.roll = 0;
        planeQuatRef.current.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
        planeFlightDynRef.current.throttle = 0.5;
        smoothVehicleRotYRef.current = 0;
        if (activePlaneGroupRef.current) {
          activePlaneGroupRef.current.visible = true;
          activePlaneGroupRef.current.position.set(PVP_ARENA_X, 45, PVP_ARENA_Z - 120);
          activePlaneGroupRef.current.rotation.set(0, 0, 0);
        }
        stateRef.current.onEnterVehicle?.('plane');
      }

      pvpRoundEnded = false;
      const count = typeof cfg.enemyCount === 'number'
        ? Math.max(1, Math.min(50, cfg.enemyCount))
        : (cfg.enemyGroups && cfg.enemyGroups.length > 0)
        ? cfg.enemyGroups.reduce((acc, g) => acc + g.count, 0)
        : 12;

      const enemyWeaponId = cfg.enemyWeaponId || 'weapon-fist';
      const enemyWeaponObj = (WEAPONS_CATALOG || []).find((w) => w.id === enemyWeaponId);
      const enemyWeaponType = enemyWeaponObj?.type || 'rifle';
      const isMeleeWeapon = enemyWeaponType === 'unarmed' || enemyWeaponType === 'melee' || enemyWeaponType === 'chainsaw';
      const isRpg = enemyWeaponType === 'rpg';
      const isMinigun = enemyWeaponType === 'minigun';
      const isShotgun = enemyWeaponType === 'shotgun';
      const isSniper = enemyWeaponType === 'sniper';

      const spacing = Math.max(1.8, Math.min(3.2, 55 / Math.max(1, count)));
      const baseZ = 38;

      for (let i = 0; i < count; i++) {
        const lineOffsetX = (i - (count - 1) * 0.5) * spacing;
        const ex = PVP_ARENA_X + lineOffsetX;
        const ez = PVP_ARENA_Z + baseZ + (i % 2 === 1 ? 4 : 0);
        const maxHP = 500;

        const hbGroup = new THREE.Group();
        hbGroup.position.set(0, 2.4, 0);
        const hbBg = new THREE.Mesh(
          new THREE.PlaneGeometry(1.8, 0.22),
          new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
        );
        const hbFill = new THREE.Mesh(
          new THREE.PlaneGeometry(1.72, 0.16),
          new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
        );
        hbFill.position.z = 0.01;
        hbGroup.add(hbBg, hbFill);

        const built = buildHumanCharacter3D({
          skinColor: '#e0ac69',
          topColor: isRpg ? '#7f1d1d' : isMinigun ? '#b45309' : isMeleeWeapon ? '#475569' : '#991b1b',
          pantsColor: '#1c1917',
          shoeColor: '#09090b',
          hairColor: '#18181b',
          hasCap: true,
          hasSunglasses: true,
        });

        const wModel = buildWeapon3DModel(enemyWeaponType);
        wModel.position.set(0, -0.56, 0.14);
        wModel.rotation.x = isMeleeWeapon ? 0.35 : 0.85;

        const peMuzzle = new THREE.Mesh(
          new THREE.OctahedronGeometry(isRpg ? 0.22 : isMinigun ? 0.15 : 0.17, 0),
          new THREE.MeshBasicMaterial({ color: isRpg ? 0xf97316 : 0xfef08a })
        );
        peMuzzle.position.set(0, 0.02, isRpg ? 0.72 : isMinigun ? 0.68 : isSniper ? 0.85 : 0.56);
        peMuzzle.visible = false;
        if (!isMeleeWeapon) wModel.add(peMuzzle);

        built.armR.add(wModel);
        built.armR.rotation.x = isMeleeWeapon ? -0.55 : -0.85;
        built.armL.rotation.x = isMeleeWeapon ? -0.55 : -0.78;
        built.armL.rotation.z = 0.22;
        built.group.add(hbGroup);
        built.group.position.set(ex, 0, ez);
        pvpArenaGroup.add(built.group);

        pvpEnemies.push({
          kind: 'on_foot',
          group: built.group,
          x: ex,
          y: 0,
          z: ez,
          rotY: Math.atan2(PVP_ARENA_X - ex, PVP_ARENA_Z - ez),
          speed: isMeleeWeapon ? 11.2 : 9.2 + (i % 3) * 0.8,
          health: maxHP,
          maxHealth: maxHP,
          dead: false,
          attackCooldown: 0.25 + Math.random() * 0.45,
          shootAnimTimer: 0,
          muzzleFlash: peMuzzle,
          strafeDir: i % 2 === 0 ? 1 : -1,
          strafeTimer: 1.2 + Math.random() * 1.5,
          lineOffsetX,
          isHeavyRpg: isRpg,
          weaponType: enemyWeaponType,
          weaponName: enemyWeaponObj?.name || 'Enemy Soldier',
          isMelee: isMeleeWeapon,
          legL: built.legL,
          legR: built.legR,
          armL: built.armL,
          armR: built.armR,
          weaponMesh: wModel,
          healthBarFill: hbFill,
          healthBarGroup: hbGroup,
        });
      }
      stateRef.current.onPvpRemainingUpdate?.(count);
      stateRef.current.onPvpRemainingEnemiesChange?.(count);
    };
    let lastPvpNonce = stateRef.current.pvpStartNonce || 0;
    let lastPvpActive = Boolean(stateRef.current.pvpConfig?.active);
    let lastHostileTriggerNonce = stateRef.current.hostileNpcTriggerNonce || 0;
    let lastZombieMode = Boolean(stateRef.current.zombieMode);

    // =========================================================================
    // ROBLOX OBBY PLATFORMER MODE (50 FIXED LEVELS HIGH ABOVE THE CITY)
    // =========================================================================
    const platformerGroup = new THREE.Group();
    scene.add(platformerGroup);
    let activeObbyLevel: BuiltPlatformerLevel | null = null;
    let lastPlatformerActive = false;
    let lastPlatformerLevel = 0;
    let lastPlatformerNonce = 0;
    let platformerCoyoteTimer = 0;
    let groundCoyoteTimer = 0;
    let isFallingToCityInPlatformer = false;
    let platformerFallTimer = 0;

    const obbyNpcs: {
      group: THREE.Group;
      armL: THREE.Object3D;
      armR: THREE.Object3D;
      legL: THREE.Object3D;
      legR: THREE.Object3D;
      x: number;
      y: number;
      z: number;
      rotY: number;
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      health: number;
      maxHealth: number;
      dead: boolean;
      punchCooldown: number;
      punchAnimTimer: number;
      handSide: number;
      healthBarGroup: THREE.Group;
      healthBarFill: THREE.Mesh;
    }[] = [];

    const clearPlatformerLevel = () => {
      while (platformerGroup.children.length > 0) {
        platformerGroup.remove(platformerGroup.children[0]);
      }
      obbyNpcs.length = 0;
      activeObbyLevel = null;
    };

    const damageObbyNpc = (
      onpc: (typeof obbyNpcs)[0],
      damage: number,
      attackerX: number,
      attackerZ: number
    ) => {
      if (onpc.dead) return;
      onpc.health = Math.max(0, onpc.health - damage);
      const ratio = Math.max(0.001, onpc.health / onpc.maxHealth);
      onpc.healthBarFill.scale.x = ratio;
      onpc.healthBarFill.position.x = -(1 - ratio) * 0.86;
      (onpc.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(
        ratio > 0.5 ? 0xef4444 : ratio > 0.25 ? 0xf59e0b : 0xd97706
      );
      triggerBloodSplatter(onpc.x, onpc.y + 1.15, onpc.z, 10);
      soundFX.playPlaceObject();

      // Knockback away from player punch while keeping NPC on their platform
      const kx = onpc.x - attackerX;
      const kz = onpc.z - attackerZ;
      const kDist = Math.hypot(kx, kz) || 1;
      onpc.x = Math.max(onpc.minX, Math.min(onpc.maxX, onpc.x + (kx / kDist) * 0.65));
      onpc.z = Math.max(onpc.minZ, Math.min(onpc.maxZ, onpc.z + (kz / kDist) * 0.65));
      onpc.group.position.set(onpc.x, onpc.y, onpc.z);

      if (onpc.health <= 0) {
        onpc.dead = true;
        onpc.healthBarGroup.visible = false;
        triggerBloodSplatter(onpc.x, onpc.y + 1.1, onpc.z, 22);
        applyRandomDeathPose(
          onpc.group,
          { legL: onpc.legL, legR: onpc.legR, armL: onpc.armL, armR: onpc.armR },
          onpc.y + 0.22,
          0.25
        );
      }
    };

    const setCityGroundVisibilityForPlatformer = (visible: boolean) => {
      groundMesh.visible = visible;
      cityGroup.visible = visible;
      houseGroup.visible = visible;
      mainRoadMesh.visible = visible;
      roadPropsGroup.visible = visible;
      allRoadsInst.visible = visible;
      allStopPostsInst.visible = visible;
      allStopSignsInst.visible = visible;
      allYellowDashesInst.visible = visible;
      allWhiteEdgesInst.visible = visible;
      allSidewalksInst.visible = visible;
      allZebraInst.visible = visible;
      excavatorRoadsGroup.visible = visible;
      fallingTreesGroup.visible = visible;
      if (!visible) {
        policeGroup.visible = false;
        npcCarsGroup.visible = false;
        cloudsGroup.visible = false;
        for (const tc of npcTrafficCars) tc.group.visible = false;
        for (const pk of parkedCars) pk.group.visible = false;
        for (const pc of policeCruisers) pc.group.visible = false;
        for (const po of policeOfficers) po.group.visible = false;
        for (const n of npcMeshes) n.group.visible = false;
        for (const ch of forestChunks) ch.group.visible = false;
      }
    };

    const startPlatformerLevel = (levelNum: number, isRespawnFromDeath: boolean = false) => {
      clearPlatformerLevel();
      clearAllBombsAndProjectilesRef?.();

      if (!savedCityPlayerPos) {
        const curWorldPos = getActivePlayerWorldPos();
        savedCityPlayerPos = {
          x: Math.abs(curWorldPos.x) < 1500 ? curWorldPos.x : lastKnownCityPos.x,
          y: Math.max(0, curWorldPos.y < 320 ? curWorldPos.y : lastKnownCityPos.y),
          z: Math.abs(curWorldPos.z) < 1500 ? curWorldPos.z : lastKnownCityPos.z,
        };
      }

      // Ensure player is on foot with fists only!
      stateRef.current.onExitVehicle?.();
      spawnPlayerWeapon('weapon-fist');
      if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
      if (activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = false;
      if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = false;
      if (activePlaneGroupRef.current) activePlaneGroupRef.current.visible = false;
      if (activeExcavatorGroupRef.current) activeExcavatorGroupRef.current.visible = false;

      // Hide ground and city so you only see the platforms high in the sky
      setCityGroundVisibilityForPlatformer(false);
      isFallingToCityInPlatformer = false;
      platformerFallTimer = 0;

      const builtLevel = buildPlatformerLevel(levelNum);
      activeObbyLevel = builtLevel;
      platformerGroup.add(builtLevel.group);

      // Spawn Fist-Fighting Obby Brawler NPCs (for levels > 25)
      builtLevel.npcSpawns.forEach((sp, idx) => {
        const builtNpc = buildHumanCharacter3D({
          skinColor: idx % 2 === 0 ? '#e0ac69' : '#f1c27d',
          topColor: sp.outfitColor,
          pantsColor: '#18181b',
          shoeColor: '#09090b',
          hairColor: '#1c1917',
          hasCap: idx % 2 === 0,
          hasSunglasses: true,
        });
        const hbGroup = new THREE.Group();
        hbGroup.position.set(0, 2.35, 0);
        const hbBg = new THREE.Mesh(
          new THREE.PlaneGeometry(1.8, 0.22),
          new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
        );
        const hbFill = new THREE.Mesh(
          new THREE.PlaneGeometry(1.72, 0.16),
          new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
        );
        hbFill.position.z = 0.01;
        hbGroup.add(hbBg, hbFill);

        builtNpc.group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
          }
        });
        builtNpc.armL.rotation.x = -0.65;
        builtNpc.armR.rotation.x = -0.65;
        builtNpc.group.add(hbGroup);
        builtNpc.group.position.set(sp.x, sp.y, sp.z);
        builtNpc.group.rotation.y = Math.PI; // Face toward incoming player (-Z)
        platformerGroup.add(builtNpc.group);

        obbyNpcs.push({
          group: builtNpc.group,
          armL: builtNpc.armL,
          armR: builtNpc.armR,
          legL: builtNpc.legL,
          legR: builtNpc.legR,
          x: sp.x,
          y: sp.y,
          z: sp.z,
          rotY: Math.PI,
          minX: sp.minX,
          maxX: sp.maxX,
          minZ: sp.minZ,
          maxZ: sp.maxZ,
          health: sp.maxHealth,
          maxHealth: sp.maxHealth,
          dead: false,
          punchCooldown: 0.35,
          punchAnimTimer: 0,
          handSide: 1,
          healthBarGroup: hbGroup,
          healthBarFill: hbFill,
        });
      });

      // Teleport player to the start platform of this level facing +Z
      isExplodingRef.current = false;
      isDeathByExplosionRef.current = false;
      isVoidFallRef.current = false;
      explosionTimerRef.current = 0;
      setDeathScreenInfo(null);
      playerHealthRef.current = 100;
      setPlayerHealth(100);
      humanPosRef.current.set(builtLevel.startPos.x, builtLevel.startPos.y, builtLevel.startPos.z);
      humanVelYRef.current = 0;
      playerAirbornePeakY = builtLevel.startPos.y;
      platformerCoyoteTimer = 0.095;
      humanRotRef.current = 0;
      cameraYawRef.current = 0;
      smoothCamYawRef.current = 0;
      // Set an elevated 3D platformer camera angle (~25deg downward pitch) for clear depth & gap perception
      cameraPitchRef.current = 0.44;
      smoothCamPitchRef.current = 0.44;
      playerContainer.position.set(builtLevel.startPos.x, builtLevel.startPos.y, builtLevel.startPos.z);
      playerContainer.rotation.set(0, 0, 0);
      playerGrp.rotation.set(0, 0, 0);
      playerGrp.position.set(0, 0, 0);
      playerContainer.visible = !stateRef.current.isFirstPerson;
      updateDayNightCycle(
        clock.elapsedTime,
        builtLevel.startPos.x,
        builtLevel.startPos.z,
        Boolean(stateRef.current.performanceMode),
        builtLevel.startPos.y
      );

      if (isRespawnFromDeath) {
        addSpatialMoneyPop(-10000, 'Died', {
          x: builtLevel.startPos.x,
          y: builtLevel.startPos.y + 1.8,
          z: builtLevel.startPos.z,
        });
      }
    };

    // =========================================================================
    // MULTI-LAYERED REALISTIC EXPLOSION & PHYSICS BUILDING DESTRUCTION SYSTEM
    // =========================================================================
    const explosionGroup = new THREE.Group();
    scene.add(explosionGroup);

    const explosionLight = new THREE.PointLight(0xff6600, 0, 42);
    scene.add(explosionLight);

    // =========================================================================
    // 3D WAYPOINT NAVIGATION BEACON PILLAR (ALWAYS VISIBLE THROUGH ALL BUILDINGS)
    // =========================================================================
    const waypointGroup = new THREE.Group();
    waypointGroup.visible = false;
    waypointGroup.renderOrder = 9999;
    scene.add(waypointGroup);

    // 1. Sky-High Translucent Luminous Energy Beam
    const wpBeamGeom = new THREE.CylinderGeometry(1.6, 2.4, 280, 24);
    const wpBeamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const wpBeamMesh = new THREE.Mesh(wpBeamGeom, wpBeamMat);
    wpBeamMesh.position.y = 140;
    wpBeamMesh.renderOrder = 9999;
    waypointGroup.add(wpBeamMesh);

    // 2. Ultra-Bright Inner Core Laser Beam
    const wpCoreGeom = new THREE.CylinderGeometry(0.45, 0.45, 285, 16);
    const wpCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false,
    });
    const wpCoreMesh = new THREE.Mesh(wpCoreGeom, wpCoreMat);
    wpCoreMesh.position.y = 142.5;
    wpCoreMesh.renderOrder = 9999;
    waypointGroup.add(wpCoreMesh);

    // 3. Floating 3D Navigation Diamond
    const wpDiamondGeom = new THREE.OctahedronGeometry(2.6, 0);
    const wpDiamondMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false,
    });
    const wpDiamondMesh = new THREE.Mesh(wpDiamondGeom, wpDiamondMat);
    wpDiamondMesh.position.y = 14;
    wpDiamondMesh.renderOrder = 9999;
    waypointGroup.add(wpDiamondMesh);

    // 4. Floating Concentric Hologram Rings
    const wpRing1Geom = new THREE.RingGeometry(3.8, 4.8, 32);
    const wpRing1Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    });
    const wpRing1 = new THREE.Mesh(wpRing1Geom, wpRing1Mat);
    wpRing1.rotation.x = -Math.PI / 2;
    wpRing1.position.y = 5.5;
    wpRing1.renderOrder = 9999;
    waypointGroup.add(wpRing1);

    const wpRing2Geom = new THREE.RingGeometry(5.5, 6.5, 32);
    const wpRing2Mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
    });
    const wpRing2 = new THREE.Mesh(wpRing2Geom, wpRing2Mat);
    wpRing2.rotation.x = -Math.PI / 2;
    wpRing2.position.y = 22;
    wpRing2.renderOrder = 9999;
    waypointGroup.add(wpRing2);

    // 5. Ground Concentric Target Reticle Rings
    const wpGroundOuterMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    });
    const wpGroundOuter = new THREE.Mesh(new THREE.RingGeometry(5.0, 6.0, 36), wpGroundOuterMat);
    wpGroundOuter.rotation.x = -Math.PI / 2;
    wpGroundOuter.position.y = 0.14;
    wpGroundOuter.renderOrder = 9999;
    waypointGroup.add(wpGroundOuter);

    const wpGroundInnerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
      depthWrite: false,
    });
    const wpGroundInner = new THREE.Mesh(new THREE.CircleGeometry(2.0, 32), wpGroundInnerMat);
    wpGroundInner.rotation.x = -Math.PI / 2;
    wpGroundInner.position.y = 0.15;
    wpGroundInner.renderOrder = 9999;
    waypointGroup.add(wpGroundInner);

    // 6. Navigation Beacon Point Light
    const wpLight = new THREE.PointLight(0x00f0ff, 3.5, 50);
    wpLight.position.y = 6;
    waypointGroup.add(wpLight);

    interface ExplosionParticle {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      rotVel: THREE.Vector3;
      life: number;
      maxLife: number;
      initialScale: number;
      expandRate?: number;
      gravityMult?: number;
      noGroundBounce?: boolean;
      floorY?: number;
    }
    const explosionParticles: ExplosionParticle[] = [];

    const spawnDebrisBurst = (bx: number, by: number, bz: number, rawShardCount: number = 56) => {
      const isExtraFast = stateRef.current.resolutionScale === 'extra-low';
      const isPerf = Boolean(stateRef.current.performanceMode);
      const shardCount = isExtraFast
        ? Math.max(4, Math.floor(rawShardCount * 0.15))
        : isPerf
        ? Math.max(12, Math.floor(rawShardCount * 0.45))
        : rawShardCount;
      explosionLight.position.set(bx, by + 2.0, bz);
      explosionLight.intensity = isPerf ? 18 : 34;
      const dToFocus = Math.hypot(bx - latestFocusPosRef.current.x, bz - latestFocusPosRef.current.z);
      if (dToFocus < 75.0 && stateRef.current.activeDisaster !== ('tornado' as any)) {
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.9 * (1 - dToFocus / 75.0));
      }
      if (dToFocus < 140.0) {
        soundFX.playLowPolyExplosion();
      }

      // 1. White-Hot Thermal Detonation Core Flash
      const coreMesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.6, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      coreMesh.position.set(bx, by + 1.1, bz);
      explosionGroup.add(coreMesh);
      explosionParticles.push({
        mesh: coreMesh,
        vel: new THREE.Vector3(0, 1.2, 0),
        rotVel: new THREE.Vector3(8, 10, 7),
        life: 0,
        maxLife: 0.45,
        initialScale: 1.4,
        expandRate: 2.8,
        gravityMult: 0,
      });

      // 2. Supersonic Expanding Ground Shockwave Ring
      const shockRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.4, 0.28, 10, 32),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.85 })
      );
      shockRing.rotation.x = Math.PI / 2;
      shockRing.position.set(bx, Math.max(0.25, by + 0.3), bz);
      explosionGroup.add(shockRing);
      explosionParticles.push({
        mesh: shockRing,
        vel: new THREE.Vector3(0, 0.2, 0),
        rotVel: new THREE.Vector3(0, 0, 4),
        life: 0,
        maxLife: 0.65,
        initialScale: 1.0,
        expandRate: 9.5,
        gravityMult: 0,
        noGroundBounce: true,
      });

      // 3. Secondary Rolling Fireball Plumes (Orange, Crimson, Bright Amber)
      const fireballColors = [0xff5500, 0xff2200, 0xff9900, 0xfacc15];
      const fireballCount = Math.max(4, Math.floor(shardCount * 0.25));
      for (let f = 0; f < fireballCount; f++) {
        const fbMat = new THREE.MeshBasicMaterial({
          color: fireballColors[f % fireballColors.length],
        });
        const fbMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.85 + Math.random() * 0.75, 1),
          fbMat
        );
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * 1.8;
        fbMesh.position.set(
          bx + Math.cos(ang) * rad,
          by + 0.8 + Math.random() * 1.6,
          bz + Math.sin(ang) * rad
        );
        explosionGroup.add(fbMesh);
        explosionParticles.push({
          mesh: fbMesh,
          vel: new THREE.Vector3(
            Math.cos(ang) * (2.5 + Math.random() * 5.0),
            3.5 + Math.random() * 6.5,
            Math.sin(ang) * (2.5 + Math.random() * 5.0)
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6
          ),
          life: 0,
          maxLife: 0.75 + Math.random() * 0.45,
          initialScale: 1.15,
          expandRate: 1.8,
          gravityMult: -0.15,
        });
      }

      // 4. Volumetric Rising Black/Charcoal Smoke Clouds
      const smokeColors = [0x1e293b, 0x0f172a, 0x334155, 0x27272a];
      const smokeCount = Math.max(6, Math.floor(shardCount * 0.32));
      for (let s = 0; s < smokeCount; s++) {
        const smMat = new THREE.MeshStandardMaterial({
          color: smokeColors[s % smokeColors.length],
          roughness: 0.95,
          flatShading: true,
        });
        const smMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.9 + Math.random() * 0.85, 1),
          smMat
        );
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * 2.4;
        smMesh.position.set(
          bx + Math.cos(ang) * rad,
          by + 1.2 + Math.random() * 2.2,
          bz + Math.sin(ang) * rad
        );
        explosionGroup.add(smMesh);
        explosionParticles.push({
          mesh: smMesh,
          vel: new THREE.Vector3(
            Math.cos(ang) * (1.8 + Math.random() * 4.2),
            4.5 + Math.random() * 6.5,
            Math.sin(ang) * (1.8 + Math.random() * 4.2)
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 3.5,
            (Math.random() - 0.5) * 3.5,
            (Math.random() - 0.5) * 3.5
          ),
          life: 0,
          maxLife: 1.45 + Math.random() * 0.85,
          initialScale: 1.1,
          expandRate: 1.45,
          gravityMult: -0.22,
          noGroundBounce: true,
        });
      }

      // 5. High-Velocity Glowing Sparks & Incandescent Embers
      const sparkCount = Math.max(8, Math.floor(shardCount * 0.45));
      for (let sp = 0; sp < sparkCount; sp++) {
        const sparkMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.12, 0.48),
          new THREE.MeshBasicMaterial({ color: sp % 2 === 0 ? 0xfef08a : 0xffedd5 })
        );
        sparkMesh.position.set(bx, by + 1.0, bz);
        explosionGroup.add(sparkMesh);
        const angle = Math.random() * Math.PI * 2;
        const spd = 12.0 + Math.random() * 22.0;
        const up = 6.0 + Math.random() * 16.0;
        explosionParticles.push({
          mesh: sparkMesh,
          vel: new THREE.Vector3(Math.cos(angle) * spd, up, Math.sin(angle) * spd),
          rotVel: new THREE.Vector3(18, 18, 18),
          life: 0,
          maxLife: 0.65 + Math.random() * 0.55,
          initialScale: 1.0,
          gravityMult: 0.85,
        });
      }

      // 6. Heavy Tumbling Concrete, Glass & Scorched Steel Shards (Bounce on Ground!)
      const shardColors = [0xff4500, 0xffaa00, 0x475569, 0x334155, 0x94a3b8, 0x1e293b, 0x64748b];
      for (let i = 0; i < shardCount; i++) {
        const col = shardColors[i % shardColors.length];
        const pMat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.45,
          metalness: i % 3 === 0 ? 0.65 : 0.15,
          flatShading: true,
        });
        const geo =
          i % 3 === 0
            ? new THREE.BoxGeometry(0.38 + Math.random() * 0.45, 0.16 + Math.random() * 0.25, 0.35 + Math.random() * 0.4)
            : new THREE.TetrahedronGeometry(0.28 + Math.random() * 0.34, 0);
        const pMesh = new THREE.Mesh(geo, pMat);
        pMesh.position.set(
          bx + (Math.random() - 0.5) * 2.2,
          by + 0.6 + Math.random() * 1.8,
          bz + (Math.random() - 0.5) * 2.2
        );
        explosionGroup.add(pMesh);
        const angle = Math.random() * Math.PI * 2;
        const spd = 5.5 + Math.random() * 15.5;
        const up = 5.0 + Math.random() * 13.0;
        explosionParticles.push({
          mesh: pMesh,
          vel: new THREE.Vector3(Math.cos(angle) * spd, up, Math.sin(angle) * spd),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 16
          ),
          life: 0,
          maxLife: 1.25 + Math.random() * 0.75,
          initialScale: 1.0,
          gravityMult: 1.0,
          floorY: Math.max(0.12, by - 0.4),
        });
      }
    };

    // Separate Non-Explosive Furniture Break & Splintering Animation (for Punching, Melee, Chainsaw, or Shooting with Bullets)
    const spawnFurnitureBreakEffect = (
      bx: number,
      by: number,
      bz: number,
      sampledColors: number[],
      rawPieceCount: number = 14,
      floorSurfaceY: number = 0.12
    ) => {
      const isExtraFast = stateRef.current.resolutionScale === 'extra-low';
      const isPerf = Boolean(stateRef.current.performanceMode);
      const count = isExtraFast
        ? Math.max(2, Math.floor(rawPieceCount * 0.2))
        : isPerf
        ? Math.max(6, Math.floor(rawPieceCount * 0.55))
        : rawPieceCount;
      const fallbackWoodPalette = [0x854d0e, 0xa16207, 0x78350f, 0xd6d3d1, 0x64748b, 0xb45309];
      const palette = sampledColors.length > 0 ? [...sampledColors, ...fallbackWoodPalette] : fallbackWoodPalette;

      // 1. Tumbling Wooden Planks, Broken Chair/Table Legs & Upholstery Cushion Chunks
      for (let i = 0; i < count; i++) {
        const col = palette[i % palette.length];
        const pMat = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.75,
          metalness: 0.08,
          flatShading: true,
        });
        const shapeKind = i % 4;
        const geo =
          shapeKind === 0
            ? new THREE.BoxGeometry(0.42 + Math.random() * 0.28, 0.045 + Math.random() * 0.03, 0.12 + Math.random() * 0.08) // Wooden plank / slat
            : shapeKind === 1
            ? new THREE.CylinderGeometry(0.032, 0.026, 0.36 + Math.random() * 0.2, 6) // Broken furniture leg / dowel
            : shapeKind === 2
            ? new THREE.BoxGeometry(0.24 + Math.random() * 0.16, 0.12 + Math.random() * 0.1, 0.22 + Math.random() * 0.15) // Cushion / drawer block
            : new THREE.TetrahedronGeometry(0.11 + Math.random() * 0.09, 0); // Wood chip splinter

        const pMesh = new THREE.Mesh(geo, pMat);
        pMesh.position.set(
          bx + (Math.random() - 0.5) * 0.9,
          by + (Math.random() - 0.2) * 0.55,
          bz + (Math.random() - 0.5) * 0.9
        );
        pMesh.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        explosionGroup.add(pMesh);

        const angle = Math.random() * Math.PI * 2;
        const spd = 2.2 + Math.random() * 4.8;
        const up = 2.4 + Math.random() * 4.5;
        explosionParticles.push({
          mesh: pMesh,
          vel: new THREE.Vector3(Math.cos(angle) * spd, up, Math.sin(angle) * spd),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14
          ),
          life: 0,
          maxLife: 0.85 + Math.random() * 0.45,
          initialScale: 1.0,
          gravityMult: 0.95,
          floorY: floorSurfaceY,
        });
      }

      // 2. Subtle Sawdust / Fabric Dust Puff (No fire, no explosion flash, no black smoke!)
      const dustCount = isExtraFast ? 1 : isPerf ? 2 : 4;
      for (let d = 0; d < dustCount; d++) {
        const dustMat = new THREE.MeshStandardMaterial({
          color: d % 2 === 0 ? 0xe7e5e4 : 0xd6d3d1,
          roughness: 0.95,
          transparent: true,
          opacity: 0.55,
          flatShading: true,
        });
        const dustMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.22 + Math.random() * 0.14, 0),
          dustMat
        );
        const ang = Math.random() * Math.PI * 2;
        dustMesh.position.set(
          bx + Math.cos(ang) * 0.35,
          by + 0.15 + Math.random() * 0.35,
          bz + Math.sin(ang) * 0.35
        );
        explosionGroup.add(dustMesh);
        explosionParticles.push({
          mesh: dustMesh,
          vel: new THREE.Vector3(
            Math.cos(ang) * (0.9 + Math.random() * 1.4),
            1.1 + Math.random() * 1.6,
            Math.sin(ang) * (0.9 + Math.random() * 1.4)
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3
          ),
          life: 0,
          maxLife: 0.45 + Math.random() * 0.25,
          initialScale: 0.9,
          expandRate: 1.15,
          gravityMult: -0.05,
          noGroundBounce: true,
        });
      }
    };

    // =========================================================================
    // DESTROY FURNITURE IN HOUSES & ALL BUILDINGS (SPLINTERS ON PUNCH/SHOOT, EXPLODES ON BOMB!)
    // =========================================================================
    const destroyedFurnitureZones: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number }[] = [];

    const destroyFurnitureAt = (
      hitX: number,
      hitY: number,
      hitZ: number,
      hitRadius: number = 0.85,
      isExplosive: boolean = false
    ): boolean => {
      // Find nearby furniture colliders (colliders with isFurniture = true)
      const nearbyFurnitureCols = getNearbyColliders(hitX, hitZ).filter(
        (c) => c.isFurniture && !c.destroyed
      );

      // Check if hit point is inside or near an active furniture collider
      const targetCol = nearbyFurnitureCols.find((c) => {
        const cMinY = (c.minY ?? 0) - 0.4;
        const cMaxY = (c.maxY ?? 18.0) + 0.6;
        return (
          hitX >= c.minX - 0.45 &&
          hitX <= c.maxX + 0.45 &&
          hitZ >= c.minZ - 0.45 &&
          hitZ <= c.maxZ + 0.45 &&
          hitY >= cMinY &&
          hitY <= cMaxY
        );
      });

      // Target bounding volume for destruction
      let boxMinX: number;
      let boxMaxX: number;
      let boxMinZ: number;
      let boxMaxZ: number;
      let boxMinY: number;
      let boxMaxY: number;

      if (targetCol) {
        boxMinX = targetCol.minX - 0.35;
        boxMaxX = targetCol.maxX + 0.35;
        boxMinZ = targetCol.minZ - 0.35;
        boxMaxZ = targetCol.maxZ + 0.35;
        boxMinY = (targetCol.minY ?? 0) - 0.35;
        boxMaxY = (targetCol.maxY ?? 18.0) + 0.5;
      } else {
        boxMinX = hitX - hitRadius;
        boxMaxX = hitX + hitRadius;
        boxMinZ = hitZ - hitRadius;
        boxMaxZ = hitZ + hitRadius;
        boxMinY = hitY - 1.1;
        boxMaxY = hitY + 1.6;
      }

      // Collect all active (visible, non-zero scale) furniture parts inside this volume
      let destroyedCount = 0;
      const sampledColors: number[] = [];
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;

      const fMat = new THREE.Matrix4();
      const fPos = new THREE.Vector3();
      const fQuat = new THREE.Quaternion();
      const fScale = new THREE.Vector3();

      for (const bldg of destructibleBuildingsRef.current) {
        if (bldg.destroyed) continue;
        if (
          Math.abs(hitX - bldg.cx) > bldg.w * 0.5 + 5.0 ||
          Math.abs(hitZ - bldg.cz) > bldg.d * 0.5 + 5.0 ||
          hitY > bldg.h + 2.5
        ) {
          continue;
        }

        bldg.group.traverse((child) => {
          if ((child as THREE.InstancedMesh).isInstancedMesh && child.userData.isFurniture) {
            const im = child as THREE.InstancedMesh;
            let imModified = false;
            for (let idx = 0; idx < im.count; idx++) {
              im.getMatrixAt(idx, fMat);
              fMat.decompose(fPos, fQuat, fScale);
              if (fScale.lengthSq() < 0.001) continue; // Already destroyed / scale zero!

              if (
                fPos.x >= boxMinX &&
                fPos.x <= boxMaxX &&
                fPos.z >= boxMinZ &&
                fPos.z <= boxMaxZ &&
                fPos.y >= boxMinY &&
                fPos.y <= boxMaxY
              ) {
                // Destroy this instance
                fScale.set(0, 0, 0);
                fMat.compose(fPos, fQuat, fScale);
                im.setMatrixAt(idx, fMat);
                imModified = true;
                destroyedCount++;
                sumX += fPos.x;
                sumY += fPos.y;
                sumZ += fPos.z;

                const colHex = (im.material as THREE.MeshStandardMaterial)?.color?.getHex?.();
                if (colHex !== undefined && sampledColors.length < 8) {
                  sampledColors.push(colHex);
                }
              }
            }
            if (imModified) {
              im.instanceMatrix.needsUpdate = true;
            }
          } else if ((child as THREE.Mesh).isMesh && child.userData.isFurniture && child.visible) {
            const m = child as THREE.Mesh;
            const my = m.position.y;
            const mx = m.position.x;
            const mz = m.position.z;

            if (
              mx >= boxMinX &&
              mx <= boxMaxX &&
              mz >= boxMinZ &&
              mz <= boxMaxZ &&
              my >= boxMinY &&
              my <= boxMaxY
            ) {
              // Destroy this mesh
              m.visible = false;
              destroyedCount++;
              sumX += mx;
              sumY += my;
              sumZ += mz;

              const colHex = (m.material as THREE.MeshStandardMaterial)?.color?.getHex?.();
              if (colHex !== undefined && sampledColors.length < 8) {
                sampledColors.push(colHex);
              }
            }
          }
        });
      }

      // CRITICAL: If no active furniture parts were found or destroyed,
      // this area is already empty / destroyed! DO NOT SPAWN ANY PARTICLES!
      if (destroyedCount === 0) {
        if (targetCol) {
          targetCol.destroyed = true;
        }
        return false;
      }

      // Mark the target collider as destroyed so it never blocks player or bullets again
      if (targetCol) {
        targetCol.destroyed = true;
      }
      // Also mark any overlapping furniture colliders as destroyed
      for (const col of nearbyFurnitureCols) {
        if (
          col.minX >= boxMinX - 0.2 &&
          col.maxX <= boxMaxX + 0.2 &&
          col.minZ >= boxMinZ - 0.2 &&
          col.maxZ <= boxMaxZ + 0.2
        ) {
          col.destroyed = true;
        }
      }

      // Record this destroyed zone
      destroyedFurnitureZones.push({
        minX: boxMinX,
        maxX: boxMaxX,
        minZ: boxMinZ,
        maxZ: boxMaxZ,
        minY: boxMinY,
        maxY: boxMaxY,
      });

      const burstX = sumX / destroyedCount;
      const burstY = Math.max(0.35, sumY / destroyedCount);
      const burstZ = sumZ / destroyedCount;

      if (isExplosive) {
        spawnDebrisBurst(burstX, burstY + 0.35, burstZ, Math.min(24, 10 + destroyedCount * 2));
        soundFX.playLowPolyExplosion();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.22);
      } else {
        spawnFurnitureBreakEffect(
          burstX,
          burstY + 0.2,
          burstZ,
          sampledColors,
          Math.min(16, 8 + Math.floor(destroyedCount * 1.5)),
          Math.max(0.12, burstY - 0.4)
        );
        soundFX.playPlaceObject();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.05);
      }
      return true;
    };

    // =========================================================================
    // REALISTIC BUILDING CHUNK DAMAGE & PHYSICS COLLAPSE SIMULATION
    // Explosions, vehicle crashes, and excavator demolitions carve structural
    // chunks and trigger a dramatic progressive multi-burst collapse into rubble
    // with ZERO floating poles or leftover pieces stuck in the air!
    // =========================================================================
    const damageBuildingStructurally = (
      blastX: number,
      blastY: number,
      blastZ: number,
      radius: number,
      impactDamage: number = 65,
      isNaturalDisaster: boolean = false
    ) => {
      const blastCenter = new THREE.Vector3(blastX, blastY, blastZ);
      const dummyMat = new THREE.Matrix4();
      const instPos = new THREE.Vector3();
      const instQuat = new THREE.Quaternion();
      const instScale = new THREE.Vector3();

      for (const bldg of destructibleBuildingsRef.current) {
        if (bldg.destroyed) continue;
        const nearX = Math.max(bldg.cx - bldg.w * 0.5, Math.min(blastX, bldg.cx + bldg.w * 0.5));
        const nearZ = Math.max(bldg.cz - bldg.d * 0.5, Math.min(blastZ, bldg.cz + bldg.d * 0.5));
        const distXZ = Math.hypot(blastX - nearX, blastZ - nearZ);

        if (distXZ <= radius + 2.5 && blastY <= bldg.h + radius) {
          // Unfreeze building matrices so individual chunks and physics collapse can animate smoothly
          bldg.group.matrixAutoUpdate = true;
          bldg.group.updateMatrixWorld(true);

          const isHouseOrStore = bldg.h < 35;
          const chunkRadius = Math.max(4.5, radius * 0.75);
          let carvedPieces = 0;

          bldg.group.traverse((child) => {
            child.matrixAutoUpdate = true;
            if ((child as THREE.InstancedMesh).isInstancedMesh) {
              const im = child as THREE.InstancedMesh;
              if (!im.userData.originalMatrices) {
                im.userData.originalMatrices = new Float32Array(im.instanceMatrix.array);
              }
              let modified = false;
              for (let idx = 0; idx < im.count; idx++) {
                im.getMatrixAt(idx, dummyMat);
                dummyMat.decompose(instPos, instQuat, instScale);
                if (instScale.lengthSq() < 0.0001) continue;
                const worldP = instPos.clone().applyMatrix4(im.matrixWorld);
                const d = worldP.distanceTo(blastCenter);
                if (d <= chunkRadius) {
                  // Carve out missing chunk from the building's instanced facade/mullions/floors!
                  instScale.set(0, 0, 0);
                  dummyMat.compose(instPos, instQuat, instScale);
                  im.setMatrixAt(idx, dummyMat);
                  modified = true;
                  carvedPieces++;
                } else if (d <= chunkRadius * 1.45) {
                  // Bend and fracture adjacent structural pieces around the missing chunk!
                  const bendQ = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler(
                      (Math.random() - 0.5) * 0.35,
                      (Math.random() - 0.5) * 0.35,
                      (Math.random() - 0.5) * 0.35
                    )
                  );
                  instQuat.multiply(bendQ);
                  instScale.multiplyScalar(0.88);
                  dummyMat.compose(instPos, instQuat, instScale);
                  im.setMatrixAt(idx, dummyMat);
                  modified = true;
                }
              }
              if (modified) {
                im.instanceMatrix.needsUpdate = true;
              }
            } else if ((child as THREE.Mesh).isMesh && child !== bldg.group) {
              const m = child as THREE.Mesh;
              const worldP = new THREE.Vector3();
              m.getWorldPosition(worldP);
              const d = worldP.distanceTo(blastCenter);
              m.geometry.computeBoundingSphere();
              const geoRad = m.geometry.boundingSphere?.radius || 1.0;

              if (d <= chunkRadius * 0.95 && geoRad < Math.max(bldg.w, bldg.h) * 0.42) {
                // Blow out individual window panes, wall panels, or interior furniture in the blast zone!
                m.visible = false;
                carvedPieces++;
              } else if (d <= chunkRadius * 1.35 && geoRad < Math.max(bldg.w, bldg.h) * 0.55) {
                // Visually fracture and tilt damaged sections
                m.rotation.x += (Math.random() - 0.5) * 0.22;
                m.rotation.z += (Math.random() - 0.5) * 0.22;
              }
            }
          });

          const clampedX = Math.max(bldg.cx - bldg.w * 0.46, Math.min(blastX, bldg.cx + bldg.w * 0.46));
          const clampedY = Math.max(1.2, Math.min(blastY, bldg.h - 1.5));
          const clampedZ = Math.max(bldg.cz - bldg.d * 0.46, Math.min(blastZ, bldg.cz + bldg.d * 0.46));

          // Multi-point explosive debris burst across the structure (like the skyscraper bomb animation, with NO glitchy rebar poles!)
          spawnDebrisBurst(clampedX, clampedY, clampedZ, Math.min(54, 26 + carvedPieces * 2));
          if (isHouseOrStore) {
            spawnDebrisBurst(bldg.cx, Math.min(bldg.h * 0.55, 4.5), bldg.cz, 38);
          }

          // Accumulate structural damage -> Buildings collapse in the opposite direction of the impact!
          const maxStructuralHp = bldg.maxHealth || (bldg.h > 45 ? 140 : 55);
          bldg.maxHealth = maxStructuralHp;
          bldg.damage = (bldg.damage || 0) + impactDamage;

          if (bldg.damage >= maxStructuralHp && !bldg.collapsing) {
            const toBldgX = bldg.cx - blastX;
            const toBldgZ = bldg.cz - blastZ;
            const blastDist = Math.hypot(toBldgX, toBldgZ);
            const dirX = blastDist > 0.01 ? toBldgX / blastDist : (Math.random() - 0.5) * 0.4;
            const dirZ = blastDist > 0.01 ? toBldgZ / blastDist : (Math.random() - 0.5) * 0.4;

            bldg.collapsing = true;
            bldg.collapseCausedByDisaster = isNaturalDisaster;
            bldg.collapseVelY = isHouseOrStore ? 5.5 : 8.5;
            bldg.collapseTiltAngle = 0;
            bldg.collapseTiltVel = 0.28;
            bldg.collapseDirX = dirX;
            bldg.collapseDirZ = dirZ;
            bldg.group.position.y = Math.min(0, bldg.group.position.y);
            bldg.group.rotation.set(0, 0, 0);

            // Disable solid wall colliders once the building begins collapsing & award +1 Wanted Star for destroying a building!
            disableBuildingColliders(bldg.id, bldg);
            if (!isNaturalDisaster) {
              reportPlayerCrime(1);
              if (isHouseOrStore) {
                stateRef.current.onEarnMoney?.(4000, 'Destroyed House', { x: bldg.cx, y: 3.5, z: bldg.cz });
              } else {
                stateRef.current.onEarnMoney?.(5000, 'Destroyed Skyscraper', { x: bldg.cx, y: 8.5, z: bldg.cz });
              }
            }
          }
        }
      }
    };

    const damageOrCollapseBuildingAt = (
      blastX: number,
      blastY: number,
      blastZ: number,
      radius: number,
      forceMult: number = 0.7
    ) => {
      damageBuildingStructurally(blastX, blastY, blastZ, radius, Math.round(forceMult * 100));
    };

    const triggerPlayerDeath = (_title: string = 'You died', _reason: string = '', isExplosion: boolean = false, isVoidFall: boolean = false, crashedVehicleType: string | null = null) => {
      if (isExplodingRef.current) return;
      const pW = getActivePlayerWorldPos();
      stateRef.current.onEarnMoney?.(-10000, 'Died', { x: pW.x, y: pW.y + 1.8, z: pW.z });
      if (stateRef.current.activeDisaster && stateRef.current.activeDisaster !== 'none') {
        stateRef.current.onActiveDisasterChange?.('none');
      }

      if (!stateRef.current.pvpConfig?.active) {
        bgmManager.stopAbruptly();
      }

      const curVeh = stateRef.current.activeVehicle ?? (stateRef.current.isDrivingCar ? 'car' : null);
      if (curVeh === 'motorcycle' || crashedVehicleType === 'motorcycle') {
        _title = 'You died';
        _reason = '';
      }
      
      isExplodingRef.current = true;
      isDeathByExplosionRef.current = isExplosion;
      isVoidFallRef.current = isVoidFall;
      explosionTimerRef.current = stateRef.current.platformerMode ? 2.5 : 4.8;
      triggerDamageFlash();

      // Force vehicle disappearance
      if (crashedVehicleType === 'plane' && activePlaneGroupRef.current) {
        activePlaneGroupRef.current.visible = false;
        scene.remove(activePlaneGroupRef.current);
        activePlaneGroupRef.current = null;
        hasSpawnedPlaneRef.current = false;
      } else if (crashedVehicleType === 'helicopter' && activeHeliGroupRef.current) {
        activeHeliGroupRef.current.visible = false;
        scene.remove(activeHeliGroupRef.current);
        activeHeliGroupRef.current = null;
        hasSpawnedHeliRef.current = false;
      }

      const pPos = getActivePlayerWorldPos();
      humanPosRef.current.set(pPos.x, pPos.y, pPos.z);
      explosionFocusPosRef.current = {
        x: pPos.x,
        y: pPos.y,
        z: pPos.z,
      };

      setDeathScreenInfo({ title: 'You died', subtitle: '' });
      clearWantedStarsAndPolice();

      destructibleBuildingsRef.current.forEach((bldg) => {
        if (bldg.collapsing) {
          bldg.neutralizedForPlayer = true;
        }
      });
      clearAllBombsAndProjectilesRef?.();

      if (isExplosion) {
        playerContainer.visible = false;
        spawnDebrisBurst(pPos.x, pPos.y + 0.8, pPos.z, 48);
        soundFX.playExplosion();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.95);
      } else if (stateRef.current.platformerMode && isVoidFall) {
        playerContainer.visible = true;
        playerGrp.rotation.x = 0;
        pLegL.rotation.set(0, 0, 0);
        pLegR.rotation.set(0, 0, 0);
        pArmL.rotation.set(0, 0, 0);
        pArmR.rotation.set(0, 0, 0);
        if (!(_title.includes('FALL') || isVoidFall)) soundFX.playLowPolyExplosion();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.25);
      } else {
        const isAirVehicle = Boolean(crashedVehicleType === 'plane' || crashedVehicleType === 'helicopter');
        if (isAirVehicle) {
          playerContainer.visible = false;
        } else {
          playerContainer.visible = true;
          playerGrp.rotation.x = -Math.PI / 2;
          humanPosRef.current.set(pPos.x, stateRef.current.platformerMode ? pPos.y + 0.22 : 0.22, pPos.z);
          playerContainer.position.set(pPos.x, stateRef.current.platformerMode ? pPos.y : 0, pPos.z);
        }
        pLegL.rotation.set(0, 0, 0);
        pLegR.rotation.set(0, 0, 0);
        pArmL.rotation.set(0, 0, 0);
        pArmR.rotation.set(0, 0, 0);
        triggerBloodSplatter(pPos.x, isAirVehicle ? pPos.y : 0.8, pPos.z, 24);
        if (!(_title.includes('FALL') || isVoidFall)) soundFX.playLowPolyExplosion();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.25);
      }

      humanVelYRef.current = 0;
      playerAirbornePeakY = 0;

      if (stateRef.current.activeVehicle) {
        stateRef.current.onExitVehicle ? stateRef.current.onExitVehicle() : stateRef.current.onExitCar();
      }

      if (stateRef.current.pvpConfig?.active && !pvpRoundEnded) {
        pvpRoundEnded = true;
        stateRef.current.onBattleRoundEnd?.('enemy');
      }

      // Reset NPC hostility
      npcMeshes.forEach((npc) => {
        npc.isHostile = false;
      });
    };

    const triggerPlayerAttackerDeath = (_attackerName: string) => {
      if (stateRef.current.invincibleMode && !stateRef.current.platformerMode) return;
      triggerPlayerDeath('You died', '', false);
    };

    const triggerHouseExplosion = (
      crashX: number,
      crashZ: number,
      crashY: number = 1.0,
      _deathTitle: string = 'You died',
      _deathReason: string = ''
    ) => {
      if (isExplodingRef.current) return;
      const pW = getActivePlayerWorldPos();
      stateRef.current.onEarnMoney?.(-10000, 'Died', { x: pW.x, y: pW.y + 1.8, z: pW.z });
      if (!stateRef.current.pvpConfig?.active) {
        bgmManager.stopAbruptly();
      }
      const curVeh = stateRef.current.activeVehicle ?? (stateRef.current.isDrivingCar ? 'car' : null);
      crashedVehicleTypeRef.current = curVeh;

      // When cars/vehicles explode, always set vehicle health to 0 (100% red damage!) and keep damage bar visible!
      if (curVeh === 'helicopter') {
        heliHealthRef.current = 0;
        setHeliHealth(0);
        setExplodingVehicleType('helicopter');
        explodingVehicleTimerRef.current = 2.6;
      } else if (curVeh === 'plane') {
        planeHealthRef.current = 0;
        setPlaneHealth(0);
        setExplodingVehicleType('plane');
        explodingVehicleTimerRef.current = 2.6;
      } else if (curVeh === 'motorcycle') {
        carHealthRef.current = 0;
        setCarHealth(0);
        setExplodingVehicleType('motorcycle');
        explodingVehicleTimerRef.current = 2.6;
      } else {
        carHealthRef.current = 0;
        setCarHealth(0);
        setExplodingVehicleType('car');
        explodingVehicleTimerRef.current = 4.8;
      }

      isExplodingRef.current = true;
      isDeathByExplosionRef.current = true;
      isVoidFallRef.current = false;
      explosionTimerRef.current = 4.8;
      explosionFocusPosRef.current = { x: crashX, y: crashY, z: crashZ };

      setDeathScreenInfo({ title: 'You died', subtitle: '' });
      clearWantedStarsAndPolice();
      destructibleBuildingsRef.current.forEach((bldg) => {
        if (bldg.collapsing) {
          bldg.neutralizedForPlayer = true;
        }
      });
      clearAllBombsAndProjectilesRef?.();

      spawnDebrisBurst(crashX, crashY + 0.5, crashZ, 64);
      soundFX.playExplosion();
      cameraShakeRef.current = Math.max(cameraShakeRef.current, 1.1);

      // Hide Player and Vehicle Immediately in fiery blast
      playerContainer.visible = false;
      if (activePlaneGroupRef.current) {
        activePlaneGroupRef.current.visible = false;
        scene.remove(activePlaneGroupRef.current);
        activePlaneGroupRef.current = null;
        hasSpawnedPlaneRef.current = false;
      }
      if (activeHeliGroupRef.current) {
        activeHeliGroupRef.current.visible = false;
        scene.remove(activeHeliGroupRef.current);
        activeHeliGroupRef.current = null;
        hasSpawnedHeliRef.current = false;
      }
      if (activeCarGroupRef.current) {
        triggerCarExplosionAt(crashX, Math.max(0.5, crashY), crashZ, 52);
        activeCarGroupRef.current.visible = false;
        scene.remove(activeCarGroupRef.current);
        activeCarGroupRef.current = null;
        hasSpawnedCarRef.current = false;
      }
      if (activeMotorcycleGroupRef.current) {
        triggerCarExplosionAt(crashX, Math.max(0.5, crashY), crashZ, 42);
        activeMotorcycleGroupRef.current.visible = false;
        scene.remove(activeMotorcycleGroupRef.current);
        activeMotorcycleGroupRef.current = null;
        hasSpawnedMotorcycleRef.current = false;
      }

      prevVehicleModeRef.current = null;
      stateRef.current.onExitVehicle ? stateRef.current.onExitVehicle() : stateRef.current.onExitCar();

      humanVelYRef.current = 0;
      playerAirbornePeakY = 0;
      npcMeshes.forEach((npc) => {
        npc.isHostile = false;
      });

      if (stateRef.current.pvpConfig?.active && !pvpRoundEnded) {
        pvpRoundEnded = true;
        stateRef.current.onBattleRoundEnd?.('enemy');
      }
    };
    triggerHouseExplosionRef.current = triggerHouseExplosion;

    // Proximity Damage from Car Explosions (damages player partially if within 7.0m blast radius)
    const damagePlayerNearCarExplosion = (
      carX: number,
      carY: number,
      carZ: number,
      blastRadius: number = 7.0
    ) => {
      if (isExplodingRef.current) return;
      if (stateRef.current.invincibleMode && !stateRef.current.platformerMode) return;

      const curVeh = stateRef.current.activeVehicle ?? (stateRef.current.isDrivingCar ? 'car' : null);

      let pX = humanPosRef.current.x;
      let pY = humanPosRef.current.y;
      let pZ = humanPosRef.current.z;

      if (curVeh === 'car' && hasSpawnedCarRef.current) {
        pX = carPhysicsRef.current.x;
        pY = 0.5;
        pZ = carPhysicsRef.current.z;
      } else if (curVeh === 'motorcycle' && hasSpawnedMotorcycleRef.current) {
        pX = motorcyclePhysicsRef.current.x;
        pY = 0.5;
        pZ = motorcyclePhysicsRef.current.z;
      } else if (curVeh === 'helicopter' && hasSpawnedHeliRef.current) {
        pX = helicopterPhysicsRef.current.x;
        pY = helicopterPhysicsRef.current.y;
        pZ = helicopterPhysicsRef.current.z;
      } else if (curVeh === 'plane' && hasSpawnedPlaneRef.current) {
        pX = planePhysicsRef.current.x;
        pY = planePhysicsRef.current.y;
        pZ = planePhysicsRef.current.z;
      }

      const dist = Math.hypot(pX - carX, pZ - carZ);
      const distY = Math.abs(pY - carY);
      if (dist > blastRadius || distY > blastRadius) return;

      const distFactor = Math.max(0, 1 - dist / blastRadius);
      // Partial damage: at 7.0m ~12 HP, point-blank ~36 HP (does not one-shot a healthy 100 HP player)
      const playerDmg = Math.round(12 + distFactor * 24);

      cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.45 + distFactor * 0.45);
      triggerDamageFlash();
      soundFX.playLowPolyExplosion();

      if (!curVeh) {
        const nextHp = Math.max(0, playerHealthRef.current - playerDmg);
        playerHealthRef.current = nextHp;
        setPlayerHealth(nextHp);

        // Concussive shockwave push away from the car explosion
        if (dist > 0.05) {
          const pushAngle = Math.atan2(pZ - carZ, pX - carX);
          const pushForce = 0.35 + distFactor * 1.35;
          humanPosRef.current.x += Math.cos(pushAngle) * pushForce;
          humanPosRef.current.z += Math.sin(pushAngle) * pushForce;
          playerContainer.position.x = humanPosRef.current.x;
          playerContainer.position.z = humanPosRef.current.z;
        }
        humanVelYRef.current = Math.max(humanVelYRef.current, 2.2 * distFactor);

        if (nextHp <= 0) {
          triggerPlayerDeath('You died', '', false);
        }
      } else if (curVeh === 'motorcycle') {
        const nextHp = Math.max(0, playerHealthRef.current - Math.round(playerDmg * 0.7));
        playerHealthRef.current = nextHp;
        setPlayerHealth(nextHp);

        const nextBikeHp = Math.max(0, carHealthRef.current - playerDmg * 2);
        carHealthRef.current = nextBikeHp;
        setCarHealth(nextBikeHp);

        if (nextBikeHp <= 0) {
          triggerHouseExplosion(
            motorcyclePhysicsRef.current.x,
            motorcyclePhysicsRef.current.z,
            0,
            'MOTORCYCLE TOTALED',
            'Your motorcycle was disabled by an adjacent car blast.'
          );
        } else if (nextHp <= 0) {
          triggerPlayerDeath('You died', '', false);
        }
      } else if (curVeh === 'car') {
        const carDmg = Math.round(14 + distFactor * 24);
        const nextCarHp = Math.max(0, carHealthRef.current - carDmg);
        carHealthRef.current = nextCarHp;
        setCarHealth(nextCarHp);

        if (nextCarHp <= 0) {
          triggerHouseExplosion(
            carPhysicsRef.current.x,
            carPhysicsRef.current.z,
            0,
            'CAR DESTROYED IN EXPLOSION',
            'Your vehicle integrity reached 0% from an adjacent explosion.'
          );
        }
      } else if (curVeh === 'helicopter') {
        const heliDmg = Math.round(14 + distFactor * 24);
        const nextHeliHp = Math.max(0, heliHealthRef.current - heliDmg);
        heliHealthRef.current = nextHeliHp;
        setHeliHealth(nextHeliHp);
        if (nextHeliHp <= 0) {
          triggerHouseExplosion(
            helicopterPhysicsRef.current.x,
            helicopterPhysicsRef.current.z,
            helicopterPhysicsRef.current.y,
            'HELICOPTER DAMAGED BY BLAST',
            'Your helicopter was brought down by a vehicle explosion.'
          );
        }
      } else if (curVeh === 'plane') {
        const planeDmg = Math.round(14 + distFactor * 24);
        const nextPlaneHp = Math.max(0, planeHealthRef.current - planeDmg);
        planeHealthRef.current = nextPlaneHp;
        setPlaneHealth(nextPlaneHp);
        if (nextPlaneHp <= 0) {
          triggerHouseExplosion(
            planePhysicsRef.current.x,
            planePhysicsRef.current.z,
            planePhysicsRef.current.y,
            'PLANE DAMAGED BY BLAST',
            'Your airplane was brought down by a vehicle explosion.'
          );
        }
      }
    };

    damagePlayerNearCarExplosionRef = damagePlayerNearCarExplosion;

    const triggerCarExplosionAt = (carX: number, carY: number, carZ: number, shardCount: number = 46) => {
      spawnDebrisBurst(carX, carY, carZ, shardCount);
      soundFX.playExplosion();
      damagePlayerNearCarExplosion(carX, carY, carZ, 7.0);
    };

    // Bomb, C4, Grenade & Rocket Explosion Handler:
    // Destroys ALL vehicles in blast radius, carves realistic chunks / collapses buildings, and eliminates NPCs/players!
    const triggerBombExplosion = (
      blastX: number,
      blastY: number,
      blastZ: number,
      radius: number,
      isNaturalDisaster: boolean = false,
      exemptPlayer: boolean = false
    ) => {
      const isDisaster = isNaturalDisaster;
      spawnDebrisBurst(blastX, blastY, blastZ, 58);

      // 0. Realistic Structural Building Chunk Damage, Furniture Explosion & Physics Collapse!
      destroyFurnitureAt(blastX, blastY, blastZ, radius * 0.85, true);
      damageBuildingStructurally(blastX, blastY, blastZ, radius, radius >= 16 ? 180 : 95, isDisaster);

      // 1. Eliminate NPCs within blast radius (+1 star per kill via killNpcWithBlood)
      for (const npcItem of npcMeshes) {
        if (npcItem.dead) continue;
        const dNpc = Math.hypot(npcItem.group.position.x - blastX, npcItem.group.position.z - blastZ);
        if (dNpc <= radius * 1.15) {
          killNpcWithBlood(npcItem, isDisaster ? 'meteor_shower' : 'explosion', { x: blastX, z: blastZ });
        }
      }

      // 2. Explode any NPC Traffic Cars & Parked Cars within blast radius (+1 star per car destroyed)
      for (const tc of npcTrafficCars) {
        if (tc.destroyed) continue;
        const dCar = Math.hypot(tc.x - blastX, tc.z - blastZ);
        if (dCar <= radius * 1.25) {
          tc.destroyed = true;
          tc.respawnTimer = 16.0;
          tc.group.visible = false;
          triggerCarExplosionAt(tc.x, 1.0, tc.z, 46);
          if (!isDisaster) {
            reportPlayerCrime(1);
            stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: tc.x, y: 1.0, z: tc.z });
          }
        }
      }
      for (const pk of parkedCars) {
        if (pk.destroyed) continue;
        const dPk = Math.hypot(pk.x - blastX, pk.z - blastZ);
        if (dPk <= radius * 1.25) {
          pk.destroyed = true;
          pk.group.visible = false;
          scene.remove(pk.group);
          triggerCarExplosionAt(pk.x, 1.0, pk.z, 46);
          if (!isDisaster) {
            reportPlayerCrime(1);
            stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: pk.x, y: 1.0, z: pk.z });
          }
        }
      }

      // 2B. Explode Police Cruisers & Officers in Blast Radius (+1 star per cop or police car destroyed)
      for (const pc of policeCruisers) {
        if (pc.destroyed) continue;
        const dP = Math.hypot(pc.x - blastX, pc.z - blastZ);
        if (dP <= radius * 1.25) {
          pc.destroyed = true;
          pc.group.visible = false;
          triggerCarExplosionAt(pc.x, 1.0, pc.z, 46);
          if (!isDisaster) {
            reportPlayerCrime(1);
            stateRef.current.onEarnMoney?.(6000, 'Destroyed Police Car', { x: pc.x, y: 1.0, z: pc.z });
          }
        }
      }
      for (const po of policeOfficers) {
        if (po.dead) continue;
        const dPo = Math.hypot(po.group.position.x - blastX, po.group.position.z - blastZ);
        if (dPo <= radius * 1.15) {
          po.dead = true;
          po.health = 0;
          po.healthBarGroup.visible = false;
          if (po.muzzleFlash) po.muzzleFlash.visible = false;
          const poy = po.group.position.y;
          const groundY = poy > 0.6 ? poy : 0.18;
          applyRandomDeathPose(
            po.group,
            { legL: po.legL, legR: po.legR, armL: po.armL, armR: po.armR },
            groundY
          );
          triggerBloodSplatter(po.group.position.x, groundY + 0.5, po.group.position.z, 24);
          if (!isDisaster) {
            reportPlayerCrime(1);
            stateRef.current.onEarnMoney?.(4000, 'Killed Cop', { x: po.group.position.x, y: 1.5, z: po.group.position.z });
          }
        }
      }

      // 2C. Damage PvP Arena Enemies in Blast Radius (uses damagePvpEnemy so on_foot NPCs have bloody death animation!)
      for (const pe of pvpEnemies) {
        if (pe.dead) continue;
        const dPe = Math.hypot(pe.x - blastX, pe.z - blastZ);
        if (dPe <= radius * 1.25) {
          damagePvpEnemy(pe, 260);
        }
      }

      // 3. Destroy Player's Vehicles (Car, Motorcycle, Helicopter, Plane, Excavator) within blast radius!
      const cur = stateRef.current;
      const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);

      if (hasSpawnedCarRef.current && activeCarGroupRef.current && activeCarGroupRef.current.visible) {
        const dPlayerCar = Math.hypot(carPhysicsRef.current.x - blastX, carPhysicsRef.current.z - blastZ);
        if (dPlayerCar <= radius * 1.25) {
          if (curVehicle === 'car' && exemptPlayer) {
            // Player is safely shielded inside their vehicle from their own strike
          } else {
            carHealthRef.current = 0;
            setCarHealth(0);
            setExplodingVehicleType('car');
            explodingVehicleTimerRef.current = 2.6;
            if (curVehicle === 'car') {
              triggerHouseExplosion(
                carPhysicsRef.current.x,
                carPhysicsRef.current.z,
                0,
                'DESTROYED BY EXPLOSIVE BLAST',
                'Your car was obliterated by a bomb detonation.'
              );
              return;
            } else {
              triggerCarExplosionAt(carPhysicsRef.current.x, 1.0, carPhysicsRef.current.z, 48);
              hasSpawnedCarRef.current = false;
              activeCarGroupRef.current.visible = false;
              scene.remove(activeCarGroupRef.current);
              activeCarGroupRef.current = null;
              if (!isDisaster) {
                reportPlayerCrime(1);
              }
            }
          }
        }
      }

      if (hasSpawnedMotorcycleRef.current && activeMotorcycleGroupRef.current && activeMotorcycleGroupRef.current.visible) {
        const dMoto = Math.hypot(motorcyclePhysicsRef.current.x - blastX, motorcyclePhysicsRef.current.z - blastZ);
        if (dMoto <= radius * 1.25) {
          if (curVehicle === 'motorcycle' && exemptPlayer) {
            // Player is safely shielded inside their vehicle from their own strike
          } else {
            carHealthRef.current = 0;
            setCarHealth(0);
            setExplodingVehicleType('motorcycle');
            explodingVehicleTimerRef.current = 2.6;
            if (curVehicle === 'motorcycle') {
              triggerHouseExplosion(
                motorcyclePhysicsRef.current.x,
                motorcyclePhysicsRef.current.z,
                0,
                'DESTROYED BY EXPLOSIVE BLAST',
                'Your motorcycle was destroyed in a bomb explosion.'
              );
              return;
            } else {
              spawnDebrisBurst(motorcyclePhysicsRef.current.x, 0.9, motorcyclePhysicsRef.current.z, 44);
              hasSpawnedMotorcycleRef.current = false;
              activeMotorcycleGroupRef.current.visible = false;
            }
          }
        }
      }

      if (hasSpawnedHeliRef.current && activeHeliGroupRef.current && activeHeliGroupRef.current.visible) {
        const dHeli = Math.hypot(
          helicopterPhysicsRef.current.x - blastX,
          helicopterPhysicsRef.current.y - blastY,
          helicopterPhysicsRef.current.z - blastZ
        );
        if (dHeli <= radius * 1.35) {
          if (curVehicle === 'helicopter') {
            if (!exemptPlayer) {
              const blastDmg = Math.max(25, (1 - dHeli / (radius * 1.35)) * 90);
              const nextHeliHp = Math.max(0, heliHealthRef.current - blastDmg);
              heliHealthRef.current = nextHeliHp;
              setHeliHealth(nextHeliHp);
              cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.7);
              if (nextHeliHp <= 0) {
                setExplodingVehicleType('helicopter');
                triggerHouseExplosion(
                  helicopterPhysicsRef.current.x,
                  helicopterPhysicsRef.current.z,
                  helicopterPhysicsRef.current.y,
                  'HELICOPTER DESTROYED BY BLAST',
                  'Your helicopter was destroyed by an explosive blast.'
                );
                return;
              }
            }
          } else {
            spawnDebrisBurst(
              helicopterPhysicsRef.current.x,
              helicopterPhysicsRef.current.y + 1.0,
              helicopterPhysicsRef.current.z,
              52
            );
            hasSpawnedHeliRef.current = false;
            activeHeliGroupRef.current.visible = false;
          }
        }
      }

      if (hasSpawnedPlaneRef.current && activePlaneGroupRef.current && activePlaneGroupRef.current.visible) {
        const dPlane = Math.hypot(
          planePhysicsRef.current.x - blastX,
          planePhysicsRef.current.y - blastY,
          planePhysicsRef.current.z - blastZ
        );
        if (dPlane <= radius * 1.35) {
          if (curVehicle === 'plane') {
            if (!exemptPlayer) {
              const blastDmg = Math.max(25, (1 - dPlane / (radius * 1.35)) * 90);
              const nextPlaneHp = Math.max(0, planeHealthRef.current - blastDmg);
              planeHealthRef.current = nextPlaneHp;
              setPlaneHealth(nextPlaneHp);
              cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.7);
              if (nextPlaneHp <= 0) {
                setExplodingVehicleType('plane');
                triggerHouseExplosion(
                  planePhysicsRef.current.x,
                  planePhysicsRef.current.z,
                  planePhysicsRef.current.y,
                  'AIRCRAFT DESTROYED IN BLAST',
                  'Your airplane was destroyed by an explosive detonation.'
                );
                return;
              }
            }
          } else {
            spawnDebrisBurst(
              planePhysicsRef.current.x,
              planePhysicsRef.current.y + 1.0,
              planePhysicsRef.current.z,
              54
            );
            hasSpawnedPlaneRef.current = false;
            activePlaneGroupRef.current.visible = false;
          }
        }
      }

      // Excavator is invincible and never destroyed by explosions!

      // 4. Kill / Damage Player if on foot within blast radius (unless explicitly exempt)
      if (!curVehicle && !exemptPlayer) {
        const dPlayer = Math.hypot(humanPosRef.current.x - blastX, humanPosRef.current.z - blastZ);
        const dY = Math.abs(humanPosRef.current.y - blastY);
        if (dPlayer <= radius && dY <= radius) {
          if (cur.pvpConfig?.active) {
            const nextHp = Math.max(0, playerHealthRef.current - 10);
            playerHealthRef.current = nextHp;
            setPlayerHealth(nextHp);
            if (nextHp <= 0) {
              triggerPlayerDeath(
                'KILLED IN EXPLOSION',
                'You were caught inside a lethal explosive blast radius.',
                false
              );
            }
          } else if (!cur.platformerMode) {
            // City mode: double effective health (takes 50 damage, allowing a healthy player with 100 HP to survive a blast)
            const nextHp = Math.max(0, playerHealthRef.current - 50);
            playerHealthRef.current = nextHp;
            setPlayerHealth(nextHp);
            cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.75);
            triggerDamageFlash();
            if (nextHp <= 0) {
              triggerPlayerDeath(
                'KILLED IN EXPLOSION',
                'You were caught inside a lethal explosive blast radius.',
                false
              );
            }
          } else {
            triggerPlayerDeath(
              'KILLED IN EXPLOSION',
              'You were caught inside a lethal explosive blast radius.',
              false
            );
          }
        }
      }
    };

    const destroyBuildingsInRadius = (blastX: number, blastY: number, blastZ: number, radius: number) => {
      damageBuildingStructurally(blastX, blastY, blastZ, radius, 160);
    };

    const resetNpcsAndTrafficToSpawn = () => {
      // 1. Reset all pedestrians back to original positions & peaceful state
      for (const npcObj of npcMeshes) {
        npcObj.dead = false;
        npcObj.isHostile = false;
        npcObj.health = npcObj.maxHealth;
        npcObj.healthBarGroup.visible = false;
        npcObj.healthBarFill.scale.x = 1;
        npcObj.healthBarFill.position.x = 0;
        (npcObj.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
        const [origX, origY, origZ] = npcObj.data.position;
        npcObj.group.position.set(origX, origY, origZ);
        npcObj.group.rotation.set(0, npcObj.data.rotationY || 0, 0);
        if (npcObj.data.waypoints && npcObj.data.waypoints.length > 0) {
          npcObj.data.currentWaypointIdx = 0;
        }
        if (npcObj.weaponMesh) {
          npcObj.armR.remove(npcObj.weaponMesh);
          npcObj.weaponMesh = null;
        }
        npcObj.legL.rotation.set(0, 0, 0);
        npcObj.legR.rotation.set(0, 0, 0);
        npcObj.armL.rotation.set(0, 0, 0);
        npcObj.armR.rotation.set(0, 0, 0);
        npcObj.group.visible = true;
      }

      // 2. Reset all traffic cars & player car back to original spawn coordinates & heading
      for (const tc of npcTrafficCars) {
        tc.destroyed = false;
        tc.hijacked = false;
        tc.respawnTimer = 0;
        tc.x = tc.initX;
        tc.z = tc.initZ;
        tc.speed = tc.initSpeed;
        tc.rotationY = tc.initRotY;
        tc.group.position.set(tc.initX, 0, tc.initZ);
        tc.group.rotation.set(0, tc.initRotY, 0);
        tc.group.visible = true;
      }
      for (const pk of parkedCars) {
        scene.remove(pk.group);
      }
      parkedCars.length = 0;

      // Do NOT spawn player vehicles at the house on death/reset; vehicles only spawn manually!
      hasSpawnedCarRef.current = false;
      if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
      hasSpawnedMotorcycleRef.current = false;
      if (activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = false;
      hasSpawnedHeliRef.current = false;
      if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = false;
      hasSpawnedPlaneRef.current = false;
      if (activePlaneGroupRef.current) activePlaneGroupRef.current.visible = false;
      hasSpawnedExcavatorRef.current = false;
      if (activeExcavatorGroupRef.current) activeExcavatorGroupRef.current.visible = false;
    };

    resetBuildingsFnRef.current = () => {
      // 0. Remove any custom Excavator-Built Houses, Colliders, Mailboxes & Stoves
      for (let i = destructibleBuildingsRef.current.length - 1; i >= 0; i--) {
        const bldg = destructibleBuildingsRef.current[i];
        if (bldg.isExcavatorBuilt) {
          disableBuildingColliders(bldg.id, bldg);
          cityGroup.remove(bldg.group);
          destructibleBuildingsRef.current.splice(i, 1);
        }
      }
      for (const col of collidersRef.current) {
        if (col.isExcavatorBuilt) {
          col.destroyed = true;
        }
      }
      collidersRef.current = collidersRef.current.filter((c) => !c.isExcavatorBuilt);
      mailboxesRef.current = mailboxesRef.current.filter((m) => !m.isExcavatorBuilt);
      stovesRef.current = stovesRef.current.filter((s) => !s.isExcavatorBuilt);

      // 1. Reset ALL Original Buildings & Carved Chunks
      for (const bldg of destructibleBuildingsRef.current) {
        bldg.destroyed = false;
        bldg.collapsing = false;
        bldg.damage = 0;
        bldg.structuralDamage = 0;
        bldg.collapseVelY = 0;
        bldg.collapseTiltAngle = 0;
        bldg.collapseTiltVel = 0;
        bldg.group.position.set(0, 0, 0);
        bldg.group.rotation.set(0, 0, 0);
        bldg.group.visible = true;
        bldg.group.traverse((c) => {
          if (c.userData?.isBlastCavity) {
            c.visible = false;
          } else {
            c.visible = true;
            if ((c as THREE.InstancedMesh).isInstancedMesh) {
              const im = c as THREE.InstancedMesh;
              const origMats = im.userData.origMatrices || im.userData.originalMatrices;
              if (origMats) {
                im.instanceMatrix.array.set(origMats);
                im.instanceMatrix.needsUpdate = true;
              }
            } else if ((c as THREE.Mesh).isMesh && c.userData.origRot) {
              c.rotation.copy(c.userData.origRot);
            }
          }
        });
      }
      freezeStaticGroupMatrices(cityGroup);
      freezeStaticGroupMatrices(houseGroup);
      for (const col of collidersRef.current) {
        col.destroyed = false;
        col.destroyedYRanges = undefined;
      }
      for (const sky of skyscrapersRef.current) {
        sky.destroyed = false;
      }

      // 1.5. Clear any custom Excavator-Built Roads & restore original sidewalks/white curb lines
      while (excavatorRoadsGroup.children.length > 0) {
        excavatorRoadsGroup.remove(excavatorRoadsGroup.children[0]);
      }
      roadRects.length = initialRoadRectsCount;
      allSidewalksInst.instanceMatrix.array.set(origSidewalksArray);
      allSidewalksInst.instanceMatrix.needsUpdate = true;
      allWhiteEdgesInst.instanceMatrix.array.set(origWhiteEdgesArray);
      allWhiteEdgesInst.instanceMatrix.needsUpdate = true;

      // 2. Reset ALL Cut & Falling Trees across the entire forest
      resetAllTrees();

      // 3 & 4. Reset ALL NPCs, Enemies & Traffic Cars back to their initial positions!
      resetNpcsAndTrafficToSpawn();

      // 5. Clear ALL Active Bombs, Projectiles & Explosion Debris
      while (projectilesGroup.children.length > 0) {
        projectilesGroup.remove(projectilesGroup.children[0]);
      }
      activeBombs.length = 0;
      activeProjectiles.length = 0;
      setRemoteBombCount(0);

      while (explosionGroup.children.length > 0) {
        explosionGroup.remove(explosionGroup.children[0]);
      }
      explosionParticles.length = 0;
      explosionLight.intensity = 0;
      isExplodingRef.current = false;
      isDeathByExplosionRef.current = false;
      isVoidFallRef.current = false;
      explosionTimerRef.current = 0;
      cameraShakeRef.current = 0;
      setDeathScreenInfo(null);

      // 6. Restore Player Health & Reset All Vehicle Physics and Spawn States
      playerHealthRef.current = 100;
      setPlayerHealth(100);
      carHealthRef.current = 100;
      setCarHealth(100);
      heliHealthRef.current = 100;
      setHeliHealth(100);
      planeHealthRef.current = 100;
      setPlaneHealth(100);

      hasSpawnedCarRef.current = false;
      if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
      carPhysicsRef.current = { x: 201.5, z: 14, rotationY: 0, speed: 0, steering: 0 };

      hasSpawnedMotorcycleRef.current = false;
      if (activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = false;
      motorcyclePhysicsRef.current = {
        x: 204.5,
        z: 14,
        rotationY: 0,
        speed: 0,
        steering: 0,
        leanAngle: 0,
        wheeliePitch: 0,
      };

      hasSpawnedHeliRef.current = false;
      if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = false;
      helicopterPhysicsRef.current = {
        x: 125,
        y: 0.18,
        z: -50,
        rotationY: 0,
        speed: 0,
        verticalSpeed: 0,
        tiltPitch: 0,
        tiltRoll: 0,
        rotorSpeed: 0,
      };

      hasSpawnedPlaneRef.current = false;
      if (activePlaneGroupRef.current) activePlaneGroupRef.current.visible = false;
      planePhysicsRef.current = {
        x: 125,
        y: 0.15,
        z: -115,
        rotationY: 0,
        speed: 0,
        verticalSpeed: 0,
        pitch: 0,
        roll: 0,
        propSpeed: 0,
      };
      planeQuatRef.current.identity();
      planeFlightDynRef.current = {
        pitchRate: 0,
        rollRate: 0,
        yawRate: 0,
        aoa: 0,
        stallFactor: 0,
        throttle: 0,
      };
      planeThrottlePctRef.current = 0;
      setPlaneThrottlePct(0);
      planeGearDownRef.current = true;
      setPlaneGearDown(true);

      hasSpawnedExcavatorRef.current = false;
      if (activeExcavatorGroupRef.current) activeExcavatorGroupRef.current.visible = false;
      excavatorPhysicsRef.current = {
        x: 188,
        y: 0,
        z: 14,
        rotationY: 0,
        speed: 0,
        steering: 0,
        boomAngle: 0,
        armAngle: 0,
        bucketAngle: 0,
      };

      // 7. Clear All Police Pursuit Units & Blood Stains
      while (policeGroup.children.length > 0) {
        policeGroup.remove(policeGroup.children[0]);
      }
      policeCruisers.length = 0;
      policeOfficers.length = 0;

      while (bloodGroup.children.length > 0) {
        bloodGroup.remove(bloodGroup.children[0]);
      }
      bloodParticles.length = 0;

      // 8. Clear Battle Mode Arena, Waypoints & Restore All World Meshes
      clearPvpEnemies();
      waypointRef.current = null;
      setActiveWaypoint(null);
      setActiveDirectionInfo(null);
      setWaypointNotice(null);
      waypointGroup.visible = false;

      cityGroup.visible = true;
      houseGroup.visible = true;
      mainRoadMesh.visible = true;
      roadPropsGroup.visible = true;
      allRoadsInst.visible = true;
      allStopPostsInst.visible = true;
      allStopSignsInst.visible = true;
      allYellowDashesInst.visible = true;
      allWhiteEdgesInst.visible = true;
      allSidewalksInst.visible = true;
      allZebraInst.visible = true;
      npcCarsGroup.visible = true;
      excavatorRoadsGroup.visible = true;
      fallingTreesGroup.visible = true;
      policeGroup.visible = true;
      for (const ch of forestChunks) ch.group.visible = true;

      // 9. Reset Claimed Home, Camera Orientation & Player Position back to Default Downtown Sidewalk Spawn (outside any building!)
      claimedHomeRef.current = {
        name: 'Downtown Sidewalk',
        x: 196,
        z: 6.8,
        carX: 204.0,
        carZ: 2.8,
      };
      const safeHome = findSafePlayerSpot(claimedHomeRef.current.x, claimedHomeRef.current.z, false);
      humanPosRef.current.set(safeHome.x, 0, safeHome.z);
      playerContainer.position.set(safeHome.x, 0, safeHome.z);
      playerContainer.rotation.set(0, 0, 0);
      playerContainer.visible = true;
      playerGrp.position.set(0, 0, 0);
      playerGrp.rotation.set(0, 0, 0);
      humanRotRef.current = 0;
      humanVelYRef.current = 0;
      cameraYawRef.current = 0.0;
      cameraPitchRef.current = 0.65;
      smoothCamYawRef.current = 0.0;
      smoothCamPitchRef.current = 0.65;
      smoothVehicleRotYRef.current = 0.0;
      prevVehicleModeRef.current = null;
      isAimingRef.current = false;
      setIsAiming(false);

      // 10. Reset Natural Disasters, Tornadoes & Rising Flood Water
      floodWaterY = 0;
      floodCountdownTimer = 30.0;
      floodWaterMesh.visible = false;
      setFloodCountdownSec(null);
      setFloodHeightDisplay(null);
      stateRef.current.onFloodHeightUpdate?.(0);
      tornadoGroup.visible = false;
      tornadoPos.x = 28;
      tornadoPos.z = -28;
      tornadoPos.timer = 0;

      lastCullX = -99999;
      updateActiveAreaVisibility(safeHome.x, safeHome.z, false);
      soundFX.playPlaceObject();
    };

    // =========================================================================
    // 7. WEAPONS, BOMBS (REMOTE/TIMED/GRENADE), CONTINUOUS CHAINSAW & EXCAVATOR ACTIONS
    // =========================================================================
    const keys = new Set<string>();
    let lastShotTime = 0;
    let chainsawHolding = false;
    let chainsawCutCooldown = 0;

    const excavatorRoadsGroup = new THREE.Group();
    scene.add(excavatorRoadsGroup);

    interface ProjectileRecord {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
      isExplosive: boolean;
      isNpcBullet?: boolean;
      isDisaster?: boolean;
      alreadyHitTarget?: boolean;
      damage: number;
      weaponName: string;
    }
    const activeProjectiles: ProjectileRecord[] = [];

    interface PlantedBombRecord {
      mesh: THREE.Group;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      type: 'grenade' | 'timebomb' | 'remotebomb';
      timer: number;
      exploded: boolean;
      minFloorY?: number;
    }
    const activeBombs: PlantedBombRecord[] = [];

    clearAllBombsAndProjectilesRef = () => {
      for (const b of activeBombs) {
        if (!b) continue;
        b.exploded = true;
        if (b.mesh) projectilesGroup.remove(b.mesh);
      }
      activeBombs.length = 0;
      for (const p of activeProjectiles) {
        if (!p) continue;
        if (p.mesh) projectilesGroup.remove(p.mesh);
      }
      activeProjectiles.length = 0;
      while (projectilesGroup.children.length > 0) {
        projectilesGroup.remove(projectilesGroup.children[0]);
      }
      setRemoteBombCount(0);
    };

    const detonateAllRemoteBombs = () => {
      let detonatedAny = false;
      for (const b of activeBombs) {
        if (!b) continue;
        if (!b.exploded && b.type === 'remotebomb') {
          b.exploded = true;
          if (b.mesh) projectilesGroup.remove(b.mesh);
          triggerBombExplosion(b.pos.x, b.pos.y, b.pos.z, 18.0);
          detonatedAny = true;
        }
      }
      if (detonatedAny) {
        setRemoteBombCount(0);
      }
    };

    // =========================================================================
    // THERMONUCLEAR BOMB DETONATION: DESTROYS EVERY BUILDING, NPC, VEHICLE & TREE ON THE MAP!
    // =========================================================================
    const detonateNuclearBomb = () => {
      const cur = stateRef.current;
      const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);
      const nukeX =
        curVehicle === 'plane'
          ? planePhysicsRef.current.x
          : curVehicle === 'helicopter'
          ? helicopterPhysicsRef.current.x
          : curVehicle === 'car'
          ? carPhysicsRef.current.x
          : humanPosRef.current.x;
      const nukeZ =
        curVehicle === 'plane'
          ? planePhysicsRef.current.z
          : curVehicle === 'helicopter'
          ? helicopterPhysicsRef.current.z
          : curVehicle === 'car'
          ? carPhysicsRef.current.z
          : humanPosRef.current.z;

      soundFX.playExplosion();
      cameraShakeRef.current = 4.5;
      explosionLight.position.set(nukeX, 65, nukeZ);
      explosionLight.intensity = 120;

      // 1. Colossal Multi-Stage Thermonuclear Mushroom Cloud & Shockwave
      const flashDome = new THREE.Mesh(
        new THREE.SphereGeometry(28, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
      );
      flashDome.position.set(nukeX, 10, nukeZ);
      explosionGroup.add(flashDome);
      explosionParticles.push({
        mesh: flashDome,
        vel: new THREE.Vector3(0, 6, 0),
        rotVel: new THREE.Vector3(0, 2, 0),
        life: 0,
        maxLife: 2.5,
        initialScale: 1.0,
        expandRate: 14.0,
        gravityMult: 0,
        noGroundBounce: true,
      });

      const stemMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(14, 26, 160, 20),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 })
      );
      stemMesh.position.set(nukeX, 75, nukeZ);
      explosionGroup.add(stemMesh);
      explosionParticles.push({
        mesh: stemMesh,
        vel: new THREE.Vector3(0, 12, 0),
        rotVel: new THREE.Vector3(0, 1.5, 0),
        life: 0,
        maxLife: 2.5,
        initialScale: 1.0,
        expandRate: 2.2,
        gravityMult: 0,
        noGroundBounce: true,
      });

      const capMesh = new THREE.Mesh(
        new THREE.SphereGeometry(52, 24, 20),
        new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.92 })
      );
      capMesh.scale.set(1.5, 0.72, 1.5);
      capMesh.position.set(nukeX, 155, nukeZ);
      explosionGroup.add(capMesh);
      explosionParticles.push({
        mesh: capMesh,
        vel: new THREE.Vector3(0, 16, 0),
        rotVel: new THREE.Vector3(0, 1.2, 0),
        life: 0,
        maxLife: 2.5,
        initialScale: 1.0,
        expandRate: 3.5,
        gravityMult: 0,
        noGroundBounce: true,
      });

      const nukeRing = new THREE.Mesh(
        new THREE.TorusGeometry(24, 3.2, 16, 48),
        new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.95 })
      );
      nukeRing.rotation.x = Math.PI / 2;
      nukeRing.position.set(nukeX, 4.0, nukeZ);
      explosionGroup.add(nukeRing);
      explosionParticles.push({
        mesh: nukeRing,
        vel: new THREE.Vector3(0, 0.5, 0),
        rotVel: new THREE.Vector3(0, 0, 5),
        life: 0,
        maxLife: 2.4,
        initialScale: 1.0,
        expandRate: 28.0,
        gravityMult: 0,
        noGroundBounce: true,
      });

      // 2. Collapse EVERY Building on the Entire Map Straight Down!
      for (const bldg of destructibleBuildingsRef.current) {
        if (!bldg.destroyed && !bldg.collapsing) {
          bldg.group.matrixAutoUpdate = true;
          bldg.collapsing = true;
          bldg.collapseVelY = 18.0;
          bldg.collapseTiltAngle = 0;
          bldg.collapseTiltVel = 0;
          bldg.group.position.y = Math.min(0, bldg.group.position.y);
          bldg.group.rotation.set(0, 0, 0);
        }
      }
      for (const col of collidersRef.current) {
        if (col.isBuilding) col.destroyed = true;
      }
      for (const sky of skyscrapersRef.current) {
        sky.destroyed = true;
      }

      // 3. Destroy EVERY Tree & Stump on the Entire Map!
      for (const t of forestTrees) {
        t.cut = true;
        t.collider.destroyed = true;
        const ch = t.chunk;
        const idx = t.instIdx;
        if (t.isPine) {
          ch.pineStumpInst?.setMatrixAt(idx, zeroScaleMat);
          ch.pineUpperTrunkInst?.setMatrixAt(idx, zeroScaleMat);
          ch.pineFoliageInst?.setMatrixAt(idx, zeroScaleMat);
        } else {
          ch.broadStumpInst?.setMatrixAt(idx, zeroScaleMat);
          ch.broadUpperTrunkInst?.setMatrixAt(idx, zeroScaleMat);
          ch.broadCanopyInst?.setMatrixAt(idx, zeroScaleMat);
        }
      }
      for (const ch of forestChunks) {
        if (ch.pineStumpInst) ch.pineStumpInst.instanceMatrix.needsUpdate = true;
        if (ch.pineUpperTrunkInst) ch.pineUpperTrunkInst.instanceMatrix.needsUpdate = true;
        if (ch.pineFoliageInst) ch.pineFoliageInst.instanceMatrix.needsUpdate = true;
        if (ch.broadStumpInst) ch.broadStumpInst.instanceMatrix.needsUpdate = true;
        if (ch.broadUpperTrunkInst) ch.broadUpperTrunkInst.instanceMatrix.needsUpdate = true;
        if (ch.broadCanopyInst) ch.broadCanopyInst.instanceMatrix.needsUpdate = true;
      }

      // 4. Kill EVERY NPC on the Map!
      for (const npcItem of npcMeshes) {
        if (!npcItem.dead) {
          killNpcWithBlood(npcItem, 'natural_disaster');
        }
      }

      // 5. Destroy EVERY Traffic Car, Police Cruiser & Officer on the Map!
      for (const tc of npcTrafficCars) {
        if (!tc.destroyed) {
          tc.destroyed = true;
          tc.respawnTimer = 30.0;
          tc.group.visible = false;
        }
      }
      for (const pc of policeCruisers) {
        pc.destroyed = true;
        pc.group.visible = false;
      }
      for (const po of policeOfficers) {
        po.dead = true;
        po.group.visible = false;
      }

      // 6. Vaporize Player & Active Vehicle!
      triggerHouseExplosion(nukeX, nukeZ, 2.0, 'You died', '');
    };
    detonateNukeFnRef.current = detonateNuclearBomb;

    // Fire Aircraft Weapons (for Bottom Two Helicopters: heli-apache, heli-hypersonic & Bottom Two Planes: plane-raptor, plane-darkstar)
    let lastVehicleGunTime = 0;
    let lastVehicleRocketTime = 0;
    const fireAircraftOrdnance = (mode: 'gun' | 'rocket') => {
      const cur = stateRef.current;
      if (cur.isMenuOpen) return;
      if (cur.pvpConfig?.active && cur.battleCountdown !== null && cur.battleCountdown !== undefined && cur.battleCountdown > 0) return;
      const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);
      const now = performance.now() / 1000;

      if (curVehicle === 'helicopter') {
        const hId = cur.activeHeliId || '';
        if (hId !== 'heli-apache' && hId !== 'heli-hypersonic') return;
        if (mode === 'gun' && now - lastVehicleGunTime < 0.065) return;
        if (mode === 'rocket' && now - lastVehicleRocketTime < 0.22) return;
        if (mode === 'gun') lastVehicleGunTime = now;
        else lastVehicleRocketTime = now;

        const hp = helicopterPhysicsRef.current;
        const heliQuat = new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), hp.rotationY)
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), hp.tiltPitch));
        const fwd = new THREE.Vector3(0, -0.06, 1).applyQuaternion(heliQuat).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(heliQuat).normalize();

        if (mode === 'gun') {
          soundFX.playMinigunBurst();
          for (const side of [-0.6, 0.6]) {
            const origin = new THREE.Vector3(hp.x, hp.y + 0.35, hp.z)
              .addScaledVector(fwd, 3.2)
              .addScaledVector(right, side);
            const bMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.11, 8, 8),
              new THREE.MeshBasicMaterial({ color: 0xfef08a })
            );
            bMesh.position.copy(origin);
            projectilesGroup.add(bMesh);
            activeProjectiles.push({
              mesh: bMesh,
              vel: fwd.clone().multiplyScalar(175),
              life: 0,
              maxLife: 2.2,
              isExplosive: false,
              damage: 55,
              weaponName: 'Helicopter Rotary Cannon',
            });
          }
        } else {
          soundFX.playLowPolyExplosion();
          for (const side of [-1.55, 1.55]) {
            const origin = new THREE.Vector3(hp.x, hp.y + 0.55, hp.z)
              .addScaledVector(fwd, 2.5)
              .addScaledVector(right, side);
            const rMesh = new THREE.Mesh(
              new THREE.CylinderGeometry(0.14, 0.14, 0.9, 8),
              new THREE.MeshBasicMaterial({ color: 0xf97316 })
            );
            rMesh.rotation.x = Math.PI / 2;
            rMesh.position.copy(origin);
            projectilesGroup.add(rMesh);
            activeProjectiles.push({
              mesh: rMesh,
              vel: fwd.clone().multiplyScalar(135),
              life: 0,
              maxLife: 3.2,
              isExplosive: true,
              damage: 240,
              weaponName: 'Hydra-70 Helicopter Rocket',
            });
          }
        }
      } else if (curVehicle === 'plane') {
        const pId = cur.activePlaneId || '';
        if (pId !== 'plane-raptor' && pId !== 'plane-darkstar') return;
        if (mode === 'gun' && now - lastVehicleGunTime < 0.055) return;
        if (mode === 'rocket' && now - lastVehicleRocketTime < 0.2) return;
        if (mode === 'gun') lastVehicleGunTime = now;
        else lastVehicleRocketTime = now;

        const pp = planePhysicsRef.current;
        const planeQuat = new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), pp.rotationY)
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pp.pitch))
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -pp.roll));
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(planeQuat).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(planeQuat).normalize();
        const baseSpd = Math.max(190, pp.speed * 0.5 + 160);

        if (mode === 'gun') {
          soundFX.playMinigunBurst();
          for (const side of [-1.1, 1.1]) {
            const origin = new THREE.Vector3(pp.x, pp.y + 0.9, pp.z)
              .addScaledVector(fwd, 4.5)
              .addScaledVector(right, side);
            const bMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.13, 8, 8),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
            );
            bMesh.position.copy(origin);
            projectilesGroup.add(bMesh);
            activeProjectiles.push({
              mesh: bMesh,
              vel: fwd.clone().multiplyScalar(baseSpd + 90),
              life: 0,
              maxLife: 2.5,
              isExplosive: false,
              damage: 65,
              weaponName: 'Jet Vulcan Rotary Cannon',
            });
          }
        } else {
          soundFX.playLowPolyExplosion();
          for (const side of [-2.8, 2.8]) {
            const origin = new THREE.Vector3(pp.x, pp.y + 0.7, pp.z)
              .addScaledVector(fwd, 3.2)
              .addScaledVector(right, side);
            const rMesh = new THREE.Mesh(
              new THREE.CylinderGeometry(0.16, 0.16, 1.1, 8),
              new THREE.MeshBasicMaterial({ color: 0xf97316 })
            );
            rMesh.rotation.x = Math.PI / 2;
            rMesh.position.copy(origin);
            projectilesGroup.add(rMesh);
            activeProjectiles.push({
              mesh: rMesh,
              vel: fwd.clone().multiplyScalar(baseSpd + 60),
              life: 0,
              maxLife: 3.6,
              isExplosive: true,
              damage: 280,
              weaponName: 'Aircraft Strike Rocket',
            });
          }
        }
      }
    };

    // =========================================================================
    // EXACT BOUNDING BOX (OBB) & NPC COLLISION MATH (Exact Model Dimensions)
    // - Cars: Width 1.92m (halfW = 0.96m), Length 4.48m (halfL = 2.24m), Height 1.45m
    // - Motorcycles: Width 0.84m (halfW = 0.42m), Length 2.16m (halfL = 1.08m)
    // - Human Characters: Width 0.50m, Depth 0.28m, Height 1.78m -> Exact Collision Radius = 0.26m
    // =========================================================================

    // 1. Exact Car OBB vs NPC Cylinder
    const checkCarCollidesWithNpc = (
      carX: number,
      carZ: number,
      carRotY: number,
      halfW: number,
      halfL: number,
      npcX: number,
      npcZ: number,
      npcRadius: number = 0.26
    ): boolean => {
      const dx = npcX - carX;
      const dz = npcZ - carZ;
      const maxReach = halfL + npcRadius + 0.1;
      if (dx * dx + dz * dz > maxReach * maxReach) return false;

      const sinR = Math.sin(carRotY);
      const cosR = Math.cos(carRotY);
      const localFwd = dx * sinR + dz * cosR;
      const localLat = dx * cosR - dz * sinR;

      const clampFwd = Math.max(-halfL, Math.min(halfL, localFwd));
      const clampLat = Math.max(-halfW, Math.min(halfW, localLat));
      const distSq = (localFwd - clampFwd) ** 2 + (localLat - clampLat) ** 2;
      return distSq < npcRadius * npcRadius;
    };

    // 2. Exact Car OBB vs Car OBB (2D Separating Axis Theorem - SAT)
    const checkCarCollidesWithCar = (
      x1: number,
      z1: number,
      rot1: number,
      halfW1: number,
      halfL1: number,
      x2: number,
      z2: number,
      rot2: number,
      halfW2: number,
      halfL2: number
    ): boolean => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const maxReach = halfL1 + halfL2 + 0.5;
      if (dx * dx + dz * dz > maxReach * maxReach) return false;

      // Box 1 unit vectors (lateral and forward)
      const u1LatX = Math.cos(rot1);
      const u1LatZ = -Math.sin(rot1);
      const u1FwdX = Math.sin(rot1);
      const u1FwdZ = Math.cos(rot1);

      // Box 2 unit vectors (lateral and forward)
      const u2LatX = Math.cos(rot2);
      const u2LatZ = -Math.sin(rot2);
      const u2FwdX = Math.sin(rot2);
      const u2FwdZ = Math.cos(rot2);

      // Axis 1: Box 1 Lateral
      const dist1Lat = Math.abs(dx * u1LatX + dz * u1LatZ);
      const proj1Lat =
        halfW1 +
        halfW2 * Math.abs(u2LatX * u1LatX + u2LatZ * u1LatZ) +
        halfL2 * Math.abs(u2FwdX * u1LatX + u2FwdZ * u1LatZ);
      if (dist1Lat > proj1Lat) return false;

      // Axis 2: Box 1 Forward
      const dist1Fwd = Math.abs(dx * u1FwdX + dz * u1FwdZ);
      const proj1Fwd =
        halfL1 +
        halfW2 * Math.abs(u2LatX * u1FwdX + u2LatZ * u1FwdZ) +
        halfL2 * Math.abs(u2FwdX * u1FwdX + u2FwdZ * u1FwdZ);
      if (dist1Fwd > proj1Fwd) return false;

      // Axis 3: Box 2 Lateral
      const dist2Lat = Math.abs(dx * u2LatX + dz * u2LatZ);
      const proj2Lat =
        halfW2 +
        halfW1 * Math.abs(u1LatX * u2LatX + u1LatZ * u2LatZ) +
        halfL1 * Math.abs(u1FwdX * u2LatX + u1FwdZ * u2LatZ);
      if (dist2Lat > proj2Lat) return false;

      // Axis 4: Box 2 Forward
      const dist2Fwd = Math.abs(dx * u2FwdX + dz * u2FwdZ);
      const proj2Fwd =
        halfL2 +
        halfW1 * Math.abs(u1LatX * u2FwdX + u1LatZ * u2FwdZ) +
        halfL1 * Math.abs(u1FwdX * u2FwdX + u1FwdZ * u2FwdZ);
      if (dist2Fwd > proj2Fwd) return false;

      return true;
    };

    // 3. Exact 3D Point in Car Oriented Bounding Box
    const checkPointInCarBox = (
      px: number,
      py: number,
      pz: number,
      carX: number,
      carZ: number,
      carRotY: number,
      halfW: number = 0.96,
      halfL: number = 2.24,
      carH: number = 1.45
    ): boolean => {
      if (py < -0.2 || py > carH + 0.15) return false;
      const dx = px - carX;
      const dz = pz - carZ;
      if (dx * dx + dz * dz > (halfL + 0.3) ** 2) return false;
      const sinR = Math.sin(carRotY);
      const cosR = Math.cos(carRotY);
      const localFwd = Math.abs(dx * sinR + dz * cosR);
      const localLat = Math.abs(dx * cosR - dz * sinR);
      return localFwd <= halfL + 0.05 && localLat <= halfW + 0.05;
    };

    // 4. Helper to place Excavator-built buildings on preset grid on the SIDE of roads (never in middle of roads)
    const findRoadSidePresetPlot = (
      targetX: number,
      targetZ: number,
      w: number,
      d: number,
      dirX: number,
      dirZ: number,
      gridStep: number = 32
    ): { x: number; z: number } => {
      const overlapsRoad = (cx: number, cz: number) => {
        const minX = cx - w * 0.5 - 1.5;
        const maxX = cx + w * 0.5 + 1.5;
        const minZ = cz - d * 0.5 - 1.5;
        const maxZ = cz + d * 0.5 + 1.5;
        for (const r of roadRects) {
          if (maxX > r.minX && minX < r.maxX && maxZ > r.minZ && minZ < r.maxZ) {
            return r;
          }
        }
        return null;
      };

      const overlapsBuilding = (cx: number, cz: number) => {
        for (const b of destructibleBuildingsRef.current) {
          if (b.destroyed || b.collapsing) continue;
          if (
            Math.abs(b.cx - cx) < (b.w + w) * 0.48 &&
            Math.abs(b.cz - cz) < (b.d + d) * 0.48
          ) {
            return true;
          }
        }
        return false;
      };

      let candX = Math.round(targetX / gridStep) * gridStep;
      let candZ = Math.round(targetZ / gridStep) * gridStep;

      const roadHit = overlapsRoad(candX, candZ);
      if (roadHit) {
        const roadIsNS = (roadHit.maxZ - roadHit.minZ) >= (roadHit.maxX - roadHit.minX);
        if (roadIsNS) {
          const placeEast = targetX >= (roadHit.minX + roadHit.maxX) * 0.5 || dirX > 0;
          candX = placeEast ? roadHit.maxX + w * 0.5 + 2.5 : roadHit.minX - w * 0.5 - 2.5;
          candZ = Math.round(targetZ / gridStep) * gridStep;
        } else {
          const placeNorth = targetZ >= (roadHit.minZ + roadHit.maxZ) * 0.5 || dirZ > 0;
          candZ = placeNorth ? roadHit.maxZ + d * 0.5 + 2.5 : roadHit.minZ - d * 0.5 - 2.5;
          candX = Math.round(targetX / gridStep) * gridStep;
        }
      }

      if (overlapsRoad(candX, candZ) || overlapsBuilding(candX, candZ)) {
        const offsets = [gridStep, -gridStep, gridStep * 2, -gridStep * 2, gridStep * 3, -gridStep * 3];
        for (const off of offsets) {
          const testZ = candZ + off;
          if (!overlapsRoad(candX, testZ) && !overlapsBuilding(candX, testZ)) {
            candZ = testZ;
            break;
          }
          const testX = candX + off;
          if (!overlapsRoad(testX, candZ) && !overlapsBuilding(testX, candZ)) {
            candX = testX;
            break;
          }
        }
      }

      return { x: candX, z: candZ };
    };

    // 5. Helper to validate and attach excavator-built roads seamlessly to the asphalt edges of existing roads
    const findValidRoadAttachment = (
      targetX: number,
      targetZ: number,
      roadLen: number = 26.0
    ): {
      snapX: number;
      snapZ: number;
      isEastWest: boolean;
      roadWidth: number;
      isEndExtension: boolean;
      branchDir: 1 | -1;
      hostRoad: { minX: number; maxX: number; minZ: number; maxZ: number };
    } | null => {
      type RoadCandidate = {
        snapX: number;
        snapZ: number;
        isEastWest: boolean;
        roadWidth: number;
        isEndExtension: boolean;
        branchDir: 1 | -1;
        hostRoad: { minX: number; maxX: number; minZ: number; maxZ: number };
        dist: number;
      };

      const candidates: RoadCandidate[] = [];

      for (const r of roadRects) {
        const isHostEW = (r.maxX - r.minX) >= (r.maxZ - r.minZ);

        if (isHostEW) {
          // Host road runs East-West: r.minZ and r.maxZ include SW_W (2.6m) sidewalks on both sides
          const hostAsphaltW = Math.max(8.5, (r.maxZ - r.minZ) - SW_W * 2);
          const westX = r.minX - roadLen * 0.5;
          const eastX = r.maxX + roadLen * 0.5;
          const centerZ = (r.minZ + r.maxZ) * 0.5;

          candidates.push({
            snapX: westX,
            snapZ: centerZ,
            isEastWest: true,
            roadWidth: hostAsphaltW,
            isEndExtension: true,
            branchDir: -1,
            hostRoad: r,
            dist: Math.hypot(westX - targetX, centerZ - targetZ),
          });
          candidates.push({
            snapX: eastX,
            snapZ: centerZ,
            isEastWest: true,
            roadWidth: hostAsphaltW,
            isEndExtension: true,
            branchDir: 1,
            hostRoad: r,
            dist: Math.hypot(eastX - targetX, centerZ - targetZ),
          });

          // Sides of East-West road: perpendicular branch (runs North-South with AVE_W = 9.0, connecting directly to host asphalt edge!)
          const branchW = AVE_W;
          const roadLength = r.maxX - r.minX;
          if (roadLength >= branchW * 1.5) {
            const baseSnapX = Math.round(targetX / 6.5) * 6.5;
            for (const stepOff of [0, -6.5, 6.5, -13.0, 13.0, -19.5, 19.5, -26.0, 26.0, -32.5, 32.5]) {
              const snappedX = baseSnapX + stepOff;
              if (snappedX >= r.minX + branchW * 0.5 && snappedX <= r.maxX - branchW * 0.5) {
                const hostNorthAsphaltZ = r.maxZ - SW_W;
                const hostSouthAsphaltZ = r.minZ + SW_W;
                const northZ = hostNorthAsphaltZ + roadLen * 0.5;
                const southZ = hostSouthAsphaltZ - roadLen * 0.5;
                candidates.push({
                  snapX: snappedX,
                  snapZ: northZ,
                  isEastWest: false,
                  roadWidth: branchW,
                  isEndExtension: false,
                  branchDir: 1,
                  hostRoad: r,
                  dist: Math.hypot(snappedX - targetX, northZ - targetZ),
                });
                candidates.push({
                  snapX: snappedX,
                  snapZ: southZ,
                  isEastWest: false,
                  roadWidth: branchW,
                  isEndExtension: false,
                  branchDir: -1,
                  hostRoad: r,
                  dist: Math.hypot(snappedX - targetX, southZ - targetZ),
                });
              }
            }
          }
        } else {
          // Host road runs North-South: r.minX and r.maxX include SW_W (2.6m) sidewalks on both sides
          const hostAsphaltW = Math.max(8.5, (r.maxX - r.minX) - SW_W * 2);
          const southZ = r.minZ - roadLen * 0.5;
          const northZ = r.maxZ + roadLen * 0.5;
          const centerX = (r.minX + r.maxX) * 0.5;

          candidates.push({
            snapX: centerX,
            snapZ: southZ,
            isEastWest: false,
            roadWidth: hostAsphaltW,
            isEndExtension: true,
            branchDir: -1,
            hostRoad: r,
            dist: Math.hypot(centerX - targetX, southZ - targetZ),
          });
          candidates.push({
            snapX: centerX,
            snapZ: northZ,
            isEastWest: false,
            roadWidth: hostAsphaltW,
            isEndExtension: true,
            branchDir: 1,
            hostRoad: r,
            dist: Math.hypot(centerX - targetX, northZ - targetZ),
          });

          // Sides of North-South road: perpendicular branch (runs East-West with 8.5m width, connecting directly to host asphalt edge!)
          const branchW = 8.5;
          const roadLength = r.maxZ - r.minZ;
          if (roadLength >= branchW * 1.5) {
            const baseSnapZ = Math.round(targetZ / 6.5) * 6.5;
            for (const stepOff of [0, -6.5, 6.5, -13.0, 13.0, -19.5, 19.5, -26.0, 26.0, -32.5, 32.5]) {
              const snappedZ = baseSnapZ + stepOff;
              if (snappedZ >= r.minZ + branchW * 0.5 && snappedZ <= r.maxZ - branchW * 0.5) {
                const hostEastAsphaltX = r.maxX - SW_W;
                const hostWestAsphaltX = r.minX + SW_W;
                const eastX = hostEastAsphaltX + roadLen * 0.5;
                const westX = hostWestAsphaltX - roadLen * 0.5;
                candidates.push({
                  snapX: eastX,
                  snapZ: snappedZ,
                  isEastWest: true,
                  roadWidth: branchW,
                  isEndExtension: false,
                  branchDir: 1,
                  hostRoad: r,
                  dist: Math.hypot(eastX - targetX, snappedZ - targetZ),
                });
                candidates.push({
                  snapX: westX,
                  snapZ: snappedZ,
                  isEastWest: true,
                  roadWidth: branchW,
                  isEndExtension: false,
                  branchDir: -1,
                  hostRoad: r,
                  dist: Math.hypot(westX - targetX, snappedZ - targetZ),
                });
              }
            }
          }
        }
      }

      // Filter candidates within reach of excavator (within 42m)
      const reachable = candidates.filter((c) => c.dist <= 42.0);
      reachable.sort((a, b) => a.dist - b.dist);

      // Check space (does not hit standing buildings or other roads, and parallel roads must be at least two roads apart!)
      for (const cand of reachable) {
        const candW = cand.isEastWest ? roadLen : cand.roadWidth;
        const candD = cand.isEastWest ? cand.roadWidth : roadLen;
        const minX = cand.snapX - candW * 0.5 + 0.3;
        const maxX = cand.snapX + candW * 0.5 - 0.3;
        const minZ = cand.snapZ - candD * 0.5 + 0.3;
        const maxZ = cand.snapZ + candD * 0.5 - 0.3;

        // Outer bounds of the new road including its sidewalks
        const fullMinX = cand.snapX - candW * 0.5 - (cand.isEastWest ? 0 : SW_W);
        const fullMaxX = cand.snapX + candW * 0.5 + (cand.isEastWest ? 0 : SW_W);
        const fullMinZ = cand.snapZ - candD * 0.5 - (cand.isEastWest ? SW_W : 0);
        const fullMaxZ = cand.snapZ + candD * 0.5 + (cand.isEastWest ? SW_W : 0);
        // Require at least two full road widths of spacing between parallel roads built off of other roads
        const minTwoRoadsSpacing = cand.roadWidth * 2.0;

        const hitsBuilding = destructibleBuildingsRef.current.some(
          (b) =>
            !b.destroyed &&
            !b.collapsing &&
            maxX > b.cx - b.w * 0.5 &&
            minX < b.cx + b.w * 0.5 &&
            maxZ > b.cz - b.d * 0.5 &&
            minZ < b.cz + b.d * 0.5
        );
        if (hitsBuilding) continue;

        const hitsOrTooCloseToOtherRoad = roadRects.some((other) => {
          if (other === cand.hostRoad) return false;
          const oMinX = other.minX + 0.5;
          const oMaxX = other.maxX - 0.5;
          const oMinZ = other.minZ + 0.5;
          const oMaxZ = other.maxZ - 0.5;
          // 1. Direct physical overlap check
          if (maxX > oMinX && minX < oMaxX && maxZ > oMinZ && minZ < oMaxZ) {
            return true;
          }

          // 2. Parallel road spacing check: roads built off of other roads must be at least two roads apart!
          const otherIsEW = (other.maxX - other.minX) >= (other.maxZ - other.minZ);
          if (otherIsEW === cand.isEastWest) {
            if (!cand.isEastWest) {
              // Both roads run North-South: check if their Z spans overlap or are on the same side of the host road
              const zSpanOverlap = fullMaxZ + 4.0 > other.minZ && fullMinZ - 4.0 < other.maxZ;
              if (zSpanOverlap) {
                const clearGapX = Math.max(other.minX - fullMaxX, fullMinX - other.maxX);
                if (clearGapX < minTwoRoadsSpacing) return true;
              }
            } else {
              // Both roads run East-West: check if their X spans overlap or are on the same side of the host road
              const xSpanOverlap = fullMaxX + 4.0 > other.minX && fullMinX - 4.0 < other.maxX;
              if (xSpanOverlap) {
                const clearGapZ = Math.max(other.minZ - fullMaxZ, fullMinZ - other.maxZ);
                if (clearGapZ < minTwoRoadsSpacing) return true;
              }
            }
          }
          return false;
        });
        if (hitsOrTooCloseToOtherRoad) continue;

        return cand;
      }

      return null;
    };

    const fireEquippedWeapon = (isDirectClick: boolean = false) => {
      const cur = stateRef.current;
      if (cur.isMenuOpen) return;
      if (cur.talkingNpcId) {
        cur.onCloseNpcChat?.();
      }
      if (cur.pvpConfig?.active && cur.battleCountdown !== null && cur.battleCountdown !== undefined && cur.battleCountdown > 0) return;
      const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);
      if (curVehicle === 'helicopter' || curVehicle === 'plane') {
        fireAircraftOrdnance('gun');
        return;
      }
      if (curVehicle) return;

      // In Platformer Mode, you can ONLY use your fists (no guns or gadgets!)
      const wId = cur.platformerMode ? 'weapon-fist' : (cur.activeWeaponId || 'weapon-fist');
      const miscGadget = (MISC_ITEMS_CATALOG || []).find((m) => m.weaponPayload?.id === wId)?.weaponPayload;
      const wData = (WEAPONS_CATALOG || []).find((w) => w.id === wId) || miscGadget || (WEAPONS_CATALOG || [])[0];
      if (!wData) return;

      const now = performance.now() / 1000;
      const minCooldown = isDirectClick ? Math.min(0.09, (wData.fireRate || 0.25) * 0.45) : (wData.fireRate || 0.25);
      if (now - lastShotTime < minCooldown) return;
      lastShotTime = now;

      camera.updateMatrixWorld();
      const shootDir = new THREE.Vector3();
      camera.getWorldDirection(shootDir);
      shootDir.normalize();

      playerContainer.rotation.y = Math.atan2(shootDir.x, shootDir.z);
      humanRotRef.current = playerContainer.rotation.y;

      // Trigger distinct 3D & 1st-person animation for the equipped weapon!
      triggerWeaponUseAnimation(wData.type);

      // Nuclear Bomb Weapon
      if (wData.type === 'nuke') {
        detonateNuclearBomb();
        return;
      }

      // 0. Miscellaneous Store Gadgets (Destruction, Fun & Speed!)
      if (wData.type === 'orbital_laser') {
        // Compute forward horizontal direction vector safely
        const fwdX =
          Math.abs(shootDir.x) > 0.001 || Math.abs(shootDir.z) > 0.001
            ? shootDir.x
            : Math.sin(humanRotRef.current);
        const fwdZ =
          Math.abs(shootDir.x) > 0.001 || Math.abs(shootDir.z) > 0.001
            ? shootDir.z
            : Math.cos(humanRotRef.current);
        const fwdLen = Math.hypot(fwdX, fwdZ) || 1.0;
        const normDirX = fwdX / fwdLen;
        const normDirZ = fwdZ / fwdLen;

        // Position Orbital Ion Laser Beacon far away from the player (55 meters out)
        // so the lethal blast radius (26m) is well clear of the player (29m safe clearance),
        // plus pass exemptPlayer: true to guarantee zero self-damage.
        const targetDist = 55.0;
        const strikeX = humanPosRef.current.x + normDirX * targetDist;
        const strikeZ = humanPosRef.current.z + normDirZ * targetDist;

        soundFX.playLowPolyExplosion();

        // 1. High-Tech Orbital Ion Laser Target Beacon Pod on Ground
        const beaconPod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.85, 0.6, 16),
          new THREE.MeshBasicMaterial({ color: 0x0284c7 })
        );
        beaconPod.position.set(strikeX, 0.3, strikeZ);
        explosionGroup.add(beaconPod);
        explosionParticles.push({
          mesh: beaconPod,
          vel: new THREE.Vector3(0, 0, 0),
          rotVel: new THREE.Vector3(0, 5, 0),
          life: 0,
          maxLife: 1.4,
          initialScale: 1.0,
        });

        // 2. Vertical Guidance Beacon Beam reaching straight into orbit
        const guideBeam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 500, 16),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95 })
        );
        guideBeam.position.set(strikeX, 250, strikeZ);
        explosionGroup.add(guideBeam);
        explosionParticles.push({
          mesh: guideBeam,
          vel: new THREE.Vector3(0, 0, 0),
          rotVel: new THREE.Vector3(0, 10, 0),
          life: 0,
          maxLife: 1.35,
          initialScale: 1.0,
        });

        // 3. Sky-Piercing Colossal Ion Laser Beam Pillar (Outer plasma envelope)
        const beamMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(3.6, 3.6, 450, 24),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 })
        );
        beamMesh.position.set(strikeX, 225, strikeZ);
        explosionGroup.add(beamMesh);
        explosionParticles.push({
          mesh: beamMesh,
          vel: new THREE.Vector3(0, 0, 0),
          rotVel: new THREE.Vector3(0, 8, 0),
          life: 0,
          maxLife: 1.35,
          initialScale: 1.0,
        });

        // 4. Ultra-intense White-Cyan Core Laser Column
        const coreMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 1.6, 450, 16),
          new THREE.MeshBasicMaterial({ color: 0xf0fdf4 })
        );
        coreMesh.position.set(strikeX, 225, strikeZ);
        explosionGroup.add(coreMesh);
        explosionParticles.push({
          mesh: coreMesh,
          vel: new THREE.Vector3(0, 0, 0),
          rotVel: new THREE.Vector3(0, -6, 0),
          life: 0,
          maxLife: 1.15,
          initialScale: 1.0,
        });

        // 5. Dual Expanding Ion Blast Shockwave Rings
        const ringMesh = new THREE.Mesh(
          new THREE.TorusGeometry(7.5, 0.65, 12, 32),
          new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
        );
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(strikeX, 0.4, strikeZ);
        explosionGroup.add(ringMesh);
        explosionParticles.push({
          mesh: ringMesh,
          vel: new THREE.Vector3(0, 1.2, 0),
          rotVel: new THREE.Vector3(0, 0, 6),
          life: 0,
          maxLife: 1.1,
          initialScale: 2.6,
        });

        const outerRingMesh = new THREE.Mesh(
          new THREE.TorusGeometry(12.0, 0.45, 12, 32),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        outerRingMesh.rotation.x = Math.PI / 2;
        outerRingMesh.position.set(strikeX, 0.45, strikeZ);
        explosionGroup.add(outerRingMesh);
        explosionParticles.push({
          mesh: outerRingMesh,
          vel: new THREE.Vector3(0, 0.6, 0),
          rotVel: new THREE.Vector3(0, 0, -4),
          life: 0,
          maxLife: 1.3,
          initialScale: 2.2,
        });

        // Trigger massive explosion far away from player (55m away, 26m radius, exemptPlayer: true)
        triggerBombExplosion(strikeX, 1.0, strikeZ, 26.0, false, true);
        return;
      }

      if (wData.type === 'meteor_staff') {
        punchAnimTimer = 0.35;
        const centerTargetX = humanPosRef.current.x + shootDir.x * 24.0;
        const centerTargetZ = humanPosRef.current.z + shootDir.z * 24.0;
        soundFX.playLowPolyExplosion();

        for (let m = 0; m < 6; m++) {
          const offsetX = (Math.random() - 0.5) * 22.0;
          const offsetZ = (Math.random() - 0.5) * 22.0;
          const startY = 85.0 + m * 14.0;
          const meteorMesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.45, 1),
            new THREE.MeshBasicMaterial({ color: m % 2 === 0 ? 0xf97316 : 0xef4444 })
          );
          meteorMesh.position.set(centerTargetX + offsetX - 18.0, startY, centerTargetZ + offsetZ - 12.0);
          projectilesGroup.add(meteorMesh);

          activeProjectiles.push({
            mesh: meteorMesh,
            vel: new THREE.Vector3(18.0, -68.0, 12.0),
            life: 0,
            maxLife: 3.0,
            isExplosive: true,
            damage: 280,
            weaponName: wData.name,
          });
        }
        return;
      }

      if (wData.type === 'gravity_hammer') {
        punchAnimTimer = 0.35;
        pArmR.rotation.x = -Math.PI * 0.65;

        // Compute forward horizontal direction vector safely
        const fwdX =
          Math.abs(shootDir.x) > 0.001 || Math.abs(shootDir.z) > 0.001
            ? shootDir.x
            : Math.sin(humanRotRef.current);
        const fwdZ =
          Math.abs(shootDir.x) > 0.001 || Math.abs(shootDir.z) > 0.001
            ? shootDir.z
            : Math.cos(humanRotRef.current);
        const fwdLen = Math.hypot(fwdX, fwdZ) || 1.0;
        const normDirX = fwdX / fwdLen;
        const normDirZ = fwdZ / fwdLen;

        // Position Wrecking Gravity Ball impact far enough away (28 meters out)
        // so the lethal blast radius (14m) is well clear of the player (14m safe buffer),
        // plus pass exemptPlayer: true to guarantee zero self-damage.
        const slamDist = 28.0;
        const slamX = humanPosRef.current.x + normDirX * slamDist;
        const slamZ = humanPosRef.current.z + normDirZ * slamDist;

        soundFX.playLowPolyExplosion();

        // 1. Kinetic energy trail spheres surging from hammer to impact location
        for (let t = 1; t <= 4; t++) {
          const frac = t / 5;
          const trailX = humanPosRef.current.x + normDirX * (slamDist * frac);
          const trailZ = humanPosRef.current.z + normDirZ * (slamDist * frac);
          const trailMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.45 + frac * 0.35, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xc084fc })
          );
          trailMesh.position.set(trailX, 0.6 + frac * 0.3, trailZ);
          explosionGroup.add(trailMesh);
          explosionParticles.push({
            mesh: trailMesh,
            vel: new THREE.Vector3(0, 0.4, 0),
            rotVel: new THREE.Vector3(4, 4, 4),
            life: 0,
            maxLife: 0.55 + frac * 0.2,
            initialScale: 1.4,
          });
        }

        // 2. Colossal Kinetic Wrecking Gravity Ball orb slamming into the ground
        const ballMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.4, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xa855f7 })
        );
        ballMesh.position.set(slamX, 1.4, slamZ);
        explosionGroup.add(ballMesh);
        explosionParticles.push({
          mesh: ballMesh,
          vel: new THREE.Vector3(0, 1.8, 0),
          rotVel: new THREE.Vector3(8, 12, 6),
          life: 0,
          maxLife: 0.95,
          initialScale: 1.8,
        });

        const innerDarkCore = new THREE.Mesh(
          new THREE.SphereGeometry(0.75, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x3b0764 })
        );
        innerDarkCore.position.set(slamX, 1.4, slamZ);
        explosionGroup.add(innerDarkCore);
        explosionParticles.push({
          mesh: innerDarkCore,
          vel: new THREE.Vector3(0, 1.8, 0),
          rotVel: new THREE.Vector3(-6, 8, -4),
          life: 0,
          maxLife: 0.95,
          initialScale: 1.8,
        });

        // 3. Expanding purple seismic gravity shockwave rings
        const waveMesh = new THREE.Mesh(
          new THREE.TorusGeometry(5.5, 0.55, 12, 28),
          new THREE.MeshBasicMaterial({ color: 0xa855f7 })
        );
        waveMesh.rotation.x = Math.PI / 2;
        waveMesh.position.set(slamX, 0.35, slamZ);
        explosionGroup.add(waveMesh);
        explosionParticles.push({
          mesh: waveMesh,
          vel: new THREE.Vector3(0, 0.8, 0),
          rotVel: new THREE.Vector3(0, 0, 10),
          life: 0,
          maxLife: 0.85,
          initialScale: 2.6,
        });

        const outerWaveMesh = new THREE.Mesh(
          new THREE.TorusGeometry(8.5, 0.4, 12, 28),
          new THREE.MeshBasicMaterial({ color: 0xd8b4fe })
        );
        outerWaveMesh.rotation.x = Math.PI / 2;
        outerWaveMesh.position.set(slamX, 0.4, slamZ);
        explosionGroup.add(outerWaveMesh);
        explosionParticles.push({
          mesh: outerWaveMesh,
          vel: new THREE.Vector3(0, 0.5, 0),
          rotVel: new THREE.Vector3(0, 0, -8),
          life: 0,
          maxLife: 0.95,
          initialScale: 2.2,
        });

        // Trigger seismic gravity detonation safely far away (28m away, 14m radius, exemptPlayer: true)
        triggerBombExplosion(slamX, 0.8, slamZ, 14.0, false, true);
        return;
      }

      if (wData.type === 'cluster_launcher') {
        soundFX.playLowPolyExplosion();
        const safeClusterSpawn = movePersonWithWallCollision(
          humanPosRef.current.x,
          humanPosRef.current.z,
          humanPosRef.current.y,
          shootDir.x * 0.95,
          shootDir.z * 0.95,
          0.25
        );
        for (let c = 0; c < 6; c++) {
          const bGrp = buildRealisticClusterBombMesh();
          const startPos = new THREE.Vector3(
            safeClusterSpawn.x,
            humanPosRef.current.y + 1.3,
            safeClusterSpawn.z
          );
          bGrp.position.copy(startPos);

          const spreadX = shootDir.x * (16 + c * 2.5) + (Math.random() - 0.5) * 10;
          const spreadY = 7.5 + Math.random() * 5.0;
          const spreadZ = shootDir.z * (16 + c * 2.5) + (Math.random() - 0.5) * 10;
          const velVec = new THREE.Vector3(spreadX, spreadY, spreadZ);
          bGrp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velVec.clone().normalize());

          projectilesGroup.add(bGrp);

          activeBombs.push({
            mesh: bGrp,
            pos: startPos,
            vel: velVec,
            type: 'grenade',
            timer: 1.4 + c * 0.22,
            exploded: false,
            minFloorY: humanPosRef.current.y,
          });
        }
        return;
      }

      if (wData.type === 'firework_cannon') {
        soundFX.playLowPolyExplosion();
        const burstX = humanPosRef.current.x + shootDir.x * 26.0;
        const burstY = Math.max(22.0, humanPosRef.current.y + 28.0 + shootDir.y * 25.0);
        const burstZ = humanPosRef.current.z + shootDir.z * 26.0;
        const fwColors = [0xfde047, 0xf43f5e, 0x38bdf8, 0xc084fc, 0x4ade80, 0xfb923c];

        for (let s = 0; s < 48; s++) {
          const col = fwColors[s % fwColors.length];
          const starMesh = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.42, 0),
            new THREE.MeshBasicMaterial({ color: col })
          );
          starMesh.position.set(burstX, burstY, burstZ);
          explosionGroup.add(starMesh);

          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const spd = 12.0 + Math.random() * 16.0;
          explosionParticles.push({
            mesh: starMesh,
            vel: new THREE.Vector3(
              Math.sin(phi) * Math.cos(theta) * spd,
              Math.cos(phi) * spd + 6.0,
              Math.sin(phi) * Math.sin(theta) * spd
            ),
            rotVel: new THREE.Vector3(8, 8, 8),
            life: 0,
            maxLife: 1.6 + Math.random() * 0.6,
            initialScale: 1.3,
          });
        }
        return;
      }

      if (wData.type === 'grapple_gun') {
        soundFX.playPlaceObject();
        const zipDist = 34.0;
        const destX = humanPosRef.current.x + shootDir.x * zipDist;
        const destZ = humanPosRef.current.z + shootDir.z * zipDist;
        if (!isPointBlockedByCollider(destX, destZ, 0.45, Math.max(0, humanPosRef.current.y + shootDir.y * 18.0))) {
          humanPosRef.current.x = destX;
          humanPosRef.current.z = destZ;
        } else {
          humanPosRef.current.x += shootDir.x * 12.0;
          humanPosRef.current.z += shootDir.z * 12.0;
        }
        humanVelYRef.current = Math.max(14.5, shootDir.y * 36.0 + 12.0);
        playerContainer.position.copy(humanPosRef.current);
        return;
      }

      const foodStrengthEffect = (cur.activeFoodEffects || []).find(
        (e) => e.type === 'strength' && e.endTime > Date.now()
      );
      const foodStrengthMult = foodStrengthEffect ? foodStrengthEffect.value : 1.0;

      // 1. Melee / Punch ('unarmed', 'melee', or 'chainsaw')
      if (wData.type === 'unarmed' || wData.type === 'melee' || wData.type === 'chainsaw') {
        punchAnimTimer = wData.type === 'chainsaw' ? 0.16 : 0.25;
        pArmR.rotation.x = -Math.PI / 2;
        const dmg = (wData.type === 'unarmed' ? (cur.zombieMode ? 15 : 14) : (wData.damage || 55)) * foodStrengthMult;
        for (const npcItem of npcMeshes) {
          if (npcItem.dead) continue;
          const dx = npcItem.group.position.x - humanPosRef.current.x;
          const dz = npcItem.group.position.z - humanPosRef.current.z;
          const dist = Math.hypot(dx, dz);
          if (dist <= wData.range + 0.28) {
            damageNpc(npcItem, dmg, wData.name, { x: humanPosRef.current.x, z: humanPosRef.current.z });
          }
        }
        for (const po of policeOfficers) {
          if (po.dead) continue;
          const dx = po.group.position.x - humanPosRef.current.x;
          const dz = po.group.position.z - humanPosRef.current.z;
          if (Math.hypot(dx, dz) <= wData.range + 0.28) {
            damagePoliceOfficer(po, dmg, wData.name);
          }
        }
        for (const pc of policeCruisers) {
          if (pc.destroyed) continue;
          if (checkCarCollidesWithNpc(pc.x, pc.z, pc.rotY, 0.96, 2.24, humanPosRef.current.x, humanPosRef.current.z, wData.range + 0.2)) {
            damagePoliceCruiser(pc, dmg, wData.name);
          }
        }
        for (const pe of pvpEnemies) {
          if (pe.dead) continue;
          const dx = pe.x - humanPosRef.current.x;
          const dz = pe.z - humanPosRef.current.z;
          if (Math.hypot(dx, dz) <= wData.range + 0.35) {
            damagePvpEnemy(pe, dmg);
          }
        }
        for (const onpc of obbyNpcs) {
          if (onpc.dead) continue;
          const dx = onpc.x - humanPosRef.current.x;
          const dz = onpc.z - humanPosRef.current.z;
          const dy = Math.abs(onpc.y - humanPosRef.current.y);
          if (Math.hypot(dx, dz) <= wData.range + 0.75 && dy <= 2.2) {
            damageObbyNpc(onpc, dmg, humanPosRef.current.x, humanPosRef.current.z);
          }
        }
        if (wData.type === 'chainsaw') {
          cutNearestTreeAt(
            humanPosRef.current.x + shootDir.x * 1.4,
            humanPosRef.current.z + shootDir.z * 1.4,
            shootDir.x,
            shootDir.z
          );
          soundFX.playPlaceObject();
        }
        // Destroy any furniture in houses or buildings in front of the player when punching/swinging!
        destroyFurnitureAt(
          humanPosRef.current.x + shootDir.x * 1.05,
          humanPosRef.current.y + 0.6,
          humanPosRef.current.z + shootDir.z * 1.05,
          0.75
        );
        return;
      }

      // 2. Throwable & Planted Explosives ('grenade', 'timebomb', 'remotebomb')
      if (wData.type === 'grenade' || wData.type === 'timebomb' || wData.type === 'remotebomb') {
        const bombMesh = buildWeapon3DModel(wData.type);
        bombMesh.scale.setScalar(1.6);
        const safeBombSpawn = movePersonWithWallCollision(
          humanPosRef.current.x,
          humanPosRef.current.z,
          humanPosRef.current.y,
          shootDir.x * 0.95,
          shootDir.z * 0.95,
          0.25
        );
        const startPos = new THREE.Vector3(
          safeBombSpawn.x,
          humanPosRef.current.y + 1.25,
          safeBombSpawn.z
        );
        bombMesh.position.copy(startPos);
        projectilesGroup.add(bombMesh);

        const throwVel =
          wData.type === 'grenade'
            ? new THREE.Vector3(shootDir.x * 22, Math.max(4.5, shootDir.y * 18 + 6.5), shootDir.z * 22)
            : new THREE.Vector3(shootDir.x * 4.5, 1.5, shootDir.z * 4.5);

        activeBombs.push({
          mesh: bombMesh,
          pos: startPos,
          vel: throwVel,
          type: wData.type,
          timer: wData.type === 'grenade' ? 2.5 : wData.type === 'timebomb' ? 5.0 : 999999,
          exploded: false,
          minFloorY: humanPosRef.current.y,
        });

        if (wData.type === 'remotebomb') {
          const remoteCount = activeBombs.filter((b) => !b.exploded && b.type === 'remotebomb').length;
          setRemoteBombCount(remoteCount);
        }
        soundFX.playPlaceObject();
        return;
      }

      // 3. Firearms, Minigun & Rocket Launcher ('pistol', 'smg', 'rifle', 'minigun', 'shotgun', 'sniper', 'rpg')
      if (wData.type === 'minigun') {
        soundFX.playMinigunBurst();
      } else {
        soundFX.playLowPolyExplosion();
      }

      // Universal 3D Aim-Assist + Point-Blank / Short-Range Instant Hit Detection across NPCs, Police Officers & Battle Mode Enemies!
      // Fixes 3rd-person downward camera angle so bullets never plunge into the ground 2.5m in front of the player,
      // and guarantees shots always register even when NPCs/Police/Enemies are simultaneously shooting or fighting!
      const isExplosive = wData.type === 'rpg';
      const weaponDamage = (wData.damage || 45) * foodStrengthMult;
      const effectiveDamage = weaponDamage * (wData.type === 'shotgun' ? 2.2 : 1.0);
      const maxRange = Math.max(45, wData.range || 85);

      const flatShootLen = Math.hypot(shootDir.x, shootDir.z) || 1;
      const flatShootX = shootDir.x / flatShootLen;
      const flatShootZ = shootDir.z / flatShootLen;

      // In 3rd-person camera mode, the camera sits above the player looking down; level out the default aim vector
      // so bullets fly horizontally at chest height unless aiming steeply up or down!
      let aimDir = shootDir.clone();
      if (!cur.isFirstPerson && aimDir.y < 0.06 && aimDir.y > -0.78 && humanPosRef.current.y < 3.0) {
        aimDir.set(flatShootX, 0, flatShootZ).normalize();
      }

      const px = humanPosRef.current.x;
      const py = humanPosRef.current.y;
      const pz = humanPosRef.current.z;

      type AimCandidate = {
        kind: 'npc' | 'police' | 'pvp';
        x: number;
        y: number;
        z: number;
        dist2D: number;
        dot: number;
        lateralDist: number;
        npcRef?: (typeof npcMeshes)[0];
        poRef?: (typeof policeOfficers)[0];
        peRef?: (typeof pvpEnemies)[0];
      };

      let bestShortTarget = null as AimCandidate | null;
      let bestConeTarget = null as AimCandidate | null;
      let bestConeScore = Infinity;

      const evaluateCandidate = (cand: AimCandidate) => {
        const dy = Math.abs(cand.y - py);
        // 1. Short-range / point-blank check (< 5.2m in front or < 2.0m all-around)
        if (cand.dist2D < 5.2 && dy < 3.5 && (cand.dot > 0.2 || cand.dist2D < 2.0)) {
          if (!bestShortTarget || cand.dist2D < bestShortTarget.dist2D) {
            bestShortTarget = cand;
          }
        }
        // 2. Medium/Long-range aiming cone check (up to maxRange)
        if (cand.dist2D <= maxRange && cand.dot > 0.75 && cand.lateralDist < 2.4 && dy < 28.0) {
          const score = cand.lateralDist * 3.5 + cand.dist2D * 0.08;
          if (score < bestConeScore) {
            bestConeScore = score;
            bestConeTarget = cand;
          }
        }
      };

      for (const npcItem of npcMeshes) {
        if (npcItem.dead || !npcItem.group.visible) continue;
        const dx = npcItem.group.position.x - px;
        const dz = npcItem.group.position.z - pz;
        const dist2D = Math.hypot(dx, dz);
        const dot = dist2D < 0.01 ? 1.0 : (dx / dist2D) * flatShootX + (dz / dist2D) * flatShootZ;
        const lateralDist = Math.abs(dx * flatShootZ - dz * flatShootX);
        evaluateCandidate({
          kind: 'npc',
          x: npcItem.group.position.x,
          y: npcItem.group.position.y,
          z: npcItem.group.position.z,
          dist2D,
          dot,
          lateralDist,
          npcRef: npcItem,
        });
      }

      for (const po of policeOfficers) {
        if (po.dead) continue;
        const dx = po.group.position.x - px;
        const dz = po.group.position.z - pz;
        const dist2D = Math.hypot(dx, dz);
        const dot = dist2D < 0.01 ? 1.0 : (dx / dist2D) * flatShootX + (dz / dist2D) * flatShootZ;
        const lateralDist = Math.abs(dx * flatShootZ - dz * flatShootX);
        evaluateCandidate({
          kind: 'police',
          x: po.group.position.x,
          y: po.group.position.y,
          z: po.group.position.z,
          dist2D,
          dot,
          lateralDist,
          poRef: po,
        });
      }

      for (const pe of pvpEnemies) {
        if (pe.dead) continue;
        const dx = pe.x - px;
        const dz = pe.z - pz;
        const dist2D = Math.hypot(dx, dz);
        const dot = dist2D < 0.01 ? 1.0 : (dx / dist2D) * flatShootX + (dz / dist2D) * flatShootZ;
        const lateralDist = Math.abs(dx * flatShootZ - dz * flatShootX);
        evaluateCandidate({
          kind: 'pvp',
          x: pe.x,
          y: pe.y,
          z: pe.z,
          dist2D,
          dot,
          lateralDist,
          peRef: pe,
        });
      }

      const chosenTarget = (bestShortTarget || bestConeTarget) as AimCandidate | null;
      let alreadyDamagedImmediate = false;

      if (chosenTarget) {
        const toTarget = new THREE.Vector3(
          chosenTarget.x - px,
          (chosenTarget.y + 1.15) - (py + 1.35),
          chosenTarget.z - pz
        );
        if (toTarget.lengthSq() > 0.001) {
          aimDir = toTarget.normalize();
        }

        // Apply immediate hit registration for short-range or non-explosive direct sightline shots so bullets NEVER fail to register!
        if (bestShortTarget || (!isExplosive && chosenTarget.lateralDist < 1.65)) {
          const hitTarget = (bestShortTarget || chosenTarget) as AimCandidate;
          if (hitTarget.kind === 'npc' && hitTarget.npcRef) {
            damageNpc(hitTarget.npcRef, effectiveDamage, wData.name, { x: px, z: pz });
            alreadyDamagedImmediate = true;
          } else if (hitTarget.kind === 'police' && hitTarget.poRef) {
            damagePoliceOfficer(hitTarget.poRef, effectiveDamage, wData.name);
            alreadyDamagedImmediate = true;
          } else if (hitTarget.kind === 'pvp' && hitTarget.peRef) {
            damagePvpEnemy(hitTarget.peRef, effectiveDamage);
            alreadyDamagedImmediate = true;
          }

          if (isExplosive && bestShortTarget) {
            triggerBombExplosion(hitTarget.x, hitTarget.y + 1.0, hitTarget.z, 18.0);
            return;
          }
        }
      }

      const origin = new THREE.Vector3(
        px,
        py + 1.35,
        pz
      ).addScaledVector(aimDir, 0.25);


      const pellets = wData.type === 'shotgun' ? 6 : wData.type === 'minigun' ? 2 : 1;
      for (let p = 0; p < pellets; p++) {
        const dir = aimDir.clone();
        if (pellets > 1) {
          const spread = wData.type === 'minigun' ? 0.024 : 0.08;
          dir.x += (Math.random() - 0.5) * spread;
          dir.y += (Math.random() - 0.5) * spread;
          dir.z += (Math.random() - 0.5) * spread;
          dir.normalize();
        }

        const bulletMesh = new THREE.Mesh(
          isExplosive
            ? new THREE.CylinderGeometry(0.1, 0.1, 0.65, 8)
            : new THREE.SphereGeometry(wData.type === 'minigun' ? 0.085 : 0.07, 8, 8),
          new THREE.MeshBasicMaterial({
            color: isExplosive ? 0xf97316 : wData.type === 'minigun' ? 0xfde047 : 0xfef08a,
          })
        );
        if (isExplosive) bulletMesh.rotation.x = Math.PI / 2;
        bulletMesh.position.copy(origin);
        projectilesGroup.add(bulletMesh);

        activeProjectiles.push({
          mesh: bulletMesh,
          vel: dir.multiplyScalar(isExplosive ? 78 : wData.type === 'minigun' ? 155 : 115),
          life: 0,
          maxLife: Math.max(0.8, maxRange / (isExplosive ? 78 : 115)),
          isExplosive,
          alreadyHitTarget: alreadyDamagedImmediate && p === 0,
          damage: weaponDamage,
          weaponName: wData.name,
        });
      }
    };
    const performExcavatorAction = (
      mode: 'build' | 'skyscraper' | 'highrise' | 'road' | 'demolish'
    ) => {
      const excPhys = excavatorPhysicsRef.current;
      const dirX = Math.sin(excPhys.rotationY);
      const dirZ = Math.cos(excPhys.rotationY);
      const forwardDist = mode === 'skyscraper' || mode === 'highrise' ? 18.0 : 9.0;
      const targetX = excPhys.x + dirX * forwardDist;
      const targetZ = excPhys.z + dirZ * forwardDist;

      // Animate excavator arm scoop
      excPhys.armAngle = 0.6;
      excPhys.bucketAngle = 0.8;
      setTimeout(() => {
        excPhys.armAngle = 0.1;
        excPhys.bucketAngle = 0.15;
      }, 450);

      if (mode === 'demolish') {
        destroyBuildingsInRadius(excPhys.x + dirX * 8.0, 2.0, excPhys.z + dirZ * 8.0, 18.0);
        return;
      }

      if (mode === 'road') {
        // Roads built by excavator match regular map roads 100%: exact same width, single yellow dashed centerlines (5.2m x 0.24m every 13m),
        // continuous 0.16m white curb edge lines, and flush 2.6m concrete sidewalks!
        const roadLen = 26.0;
        const swWidth = SW_W; // 2.6m

        const attachment = findValidRoadAttachment(targetX, targetZ, roadLen);
        if (!attachment) {
          soundFX.playPlaceObject();
          setWaypointNotice('⚠️ Roads can only be built attached to the ends or sides of other roads (with space)!');
          setTimeout(() => setWaypointNotice(null), 3500);
          return;
        }

        const { snapX, snapZ, isEastWest, roadWidth, isEndExtension, branchDir } = attachment;

        const segGrp = new THREE.Group();
        const w = isEastWest ? roadLen : roadWidth;
        const d = isEastWest ? roadWidth : roadLen;

        // Destroy any trees in the way of the new road + sidewalks!
        const newRect = {
          minX: snapX - w * 0.5 - (isEastWest ? 0 : swWidth),
          maxX: snapX + w * 0.5 + (isEastWest ? 0 : swWidth),
          minZ: snapZ - d * 0.5 - (isEastWest ? swWidth : 0),
          maxZ: snapZ + d * 0.5 + (isEastWest ? swWidth : 0),
        };
        destroyTreesInRect(newRect.minX - 2.0, newRect.maxX + 2.0, newRect.minZ - 2.0, newRect.maxZ + 2.0);

        // Always open/remove any existing sidewalk & white curb line across the new road's asphalt footprint (both in InstancedMeshes AND in excavator-built road meshes)!
        {
          const openMinX = isEastWest
            ? snapX - w * 0.5 - (branchDir === 1 ? swWidth + 0.35 : 0.25)
            : snapX - roadWidth * 0.5 - 0.08;
          const openMaxX = isEastWest
            ? snapX + w * 0.5 + (branchDir === -1 ? swWidth + 0.35 : 0.25)
            : snapX + roadWidth * 0.5 + 0.08;
          const openMinZ = isEastWest
            ? snapZ - roadWidth * 0.5 - 0.08
            : snapZ - d * 0.5 - (branchDir === 1 ? swWidth + 0.35 : 0.25);
          const openMaxZ = isEastWest
            ? snapZ + roadWidth * 0.5 + 0.08
            : snapZ + d * 0.5 + (branchDir === -1 ? swWidth + 0.35 : 0.25);

          const createTaggedSidewalkMesh = (sMinX: number, sMaxX: number, sMinZ: number, sMaxZ: number) => {
            const sx = sMaxX - sMinX;
            const sz = sMaxZ - sMinZ;
            const m = new THREE.Mesh(new THREE.BoxGeometry(sx, SW_H, sz), sidewalkMat);
            m.position.set((sMinX + sMaxX) * 0.5, SW_Y, (sMinZ + sMaxZ) * 0.5);
            m.receiveShadow = true;
            m.renderOrder = 5;
            m.userData = { isSidewalk: true, minX: sMinX, maxX: sMaxX, minZ: sMinZ, maxZ: sMaxZ };
            return m;
          };

          const createTaggedWhiteEdgeMesh = (eMinX: number, eMaxX: number, eMinZ: number, eMaxZ: number) => {
            const ex = eMaxX - eMinX;
            const ez = eMaxZ - eMinZ;
            const m = new THREE.Mesh(new THREE.PlaneGeometry(ex, ez), stripeWhite);
            m.rotation.x = -Math.PI / 2;
            m.position.set((eMinX + eMaxX) * 0.5, 0.065, (eMinZ + eMaxZ) * 0.5);
            m.renderOrder = 3;
            m.userData = { isWhiteEdge: true, minX: eMinX, maxX: eMaxX, minZ: eMinZ, maxZ: eMaxZ };
            return m;
          };

          const tmpM = new THREE.Matrix4();
          const tmpPos = new THREE.Vector3();
          const tmpQuat = new THREE.Quaternion();
          const tmpScale = new THREE.Vector3();

          // 1A. Open gap in allSidewalksInst where the new road connects
          let swModified = false;
          for (let i = 0; i < allSidewalksInst.count; i++) {
            allSidewalksInst.getMatrixAt(i, tmpM);
            tmpM.decompose(tmpPos, tmpQuat, tmpScale);
            if (tmpScale.lengthSq() < 0.001) continue;
            const sMinX = tmpPos.x - tmpScale.x * 0.5;
            const sMaxX = tmpPos.x + tmpScale.x * 0.5;
            const sMinZ = tmpPos.z - tmpScale.z * 0.5;
            const sMaxZ = tmpPos.z + tmpScale.z * 0.5;
            if (sMaxX > openMinX && sMinX < openMaxX && sMaxZ > openMinZ && sMinZ < openMaxZ) {
              swModified = true;
              if (!isEastWest) {
                const leftLen = Math.max(0, openMinX - sMinX);
                const rightLen = Math.max(0, sMaxX - openMaxX);
                if (leftLen > 0.1) {
                  tmpPos.x = sMinX + leftLen * 0.5;
                  tmpScale.x = leftLen;
                  tmpM.compose(tmpPos, tmpQuat, tmpScale);
                  allSidewalksInst.setMatrixAt(i, tmpM);
                  if (rightLen > 0.1) {
                    segGrp.add(createTaggedSidewalkMesh(openMaxX, sMaxX, sMinZ, sMaxZ));
                  }
                } else if (rightLen > 0.1) {
                  tmpPos.x = openMaxX + rightLen * 0.5;
                  tmpScale.x = rightLen;
                  tmpM.compose(tmpPos, tmpQuat, tmpScale);
                  allSidewalksInst.setMatrixAt(i, tmpM);
                } else {
                  allSidewalksInst.setMatrixAt(i, zeroScaleMat);
                }
              } else {
                const southLen = Math.max(0, openMinZ - sMinZ);
                const northLen = Math.max(0, sMaxZ - openMaxZ);
                if (southLen > 0.1) {
                  tmpPos.z = sMinZ + southLen * 0.5;
                  tmpScale.z = southLen;
                  tmpM.compose(tmpPos, tmpQuat, tmpScale);
                  allSidewalksInst.setMatrixAt(i, tmpM);
                  if (northLen > 0.1) {
                    segGrp.add(createTaggedSidewalkMesh(sMinX, sMaxX, openMaxZ, sMaxZ));
                  }
                } else if (northLen > 0.1) {
                  tmpPos.z = openMaxZ + northLen * 0.5;
                  tmpScale.z = northLen;
                  tmpM.compose(tmpPos, tmpQuat, tmpScale);
                  allSidewalksInst.setMatrixAt(i, tmpM);
                } else {
                  allSidewalksInst.setMatrixAt(i, zeroScaleMat);
                }
              }
            }
          }
          if (swModified) allSidewalksInst.instanceMatrix.needsUpdate = true;

          // 1B. Also open gap in any previously split or excavator-built sidewalk meshes inside excavatorRoadsGroup!
          const existingSwMeshes: THREE.Mesh[] = [];
          excavatorRoadsGroup.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh && obj.userData?.isSidewalk) {
              existingSwMeshes.push(obj as THREE.Mesh);
            }
          });
          for (const swMesh of existingSwMeshes) {
            const { minX: sMinX, maxX: sMaxX, minZ: sMinZ, maxZ: sMaxZ } = swMesh.userData;
            if (sMaxX > openMinX && sMinX < openMaxX && sMaxZ > openMinZ && sMinZ < openMaxZ) {
              const parentGrp = swMesh.parent || segGrp;
              parentGrp.remove(swMesh);
              if (!isEastWest) {
                if (openMinX - sMinX > 0.1) {
                  parentGrp.add(createTaggedSidewalkMesh(sMinX, openMinX, sMinZ, sMaxZ));
                }
                if (sMaxX - openMaxX > 0.1) {
                  parentGrp.add(createTaggedSidewalkMesh(openMaxX, sMaxX, sMinZ, sMaxZ));
                }
              } else {
                if (openMinZ - sMinZ > 0.1) {
                  parentGrp.add(createTaggedSidewalkMesh(sMinX, sMaxX, sMinZ, openMinZ));
                }
                if (sMaxZ - openMaxZ > 0.1) {
                  parentGrp.add(createTaggedSidewalkMesh(sMinX, sMaxX, openMaxZ, sMaxZ));
                }
              }
            }
          }

          // 2A. Open gap in allWhiteEdgesInst where the new road connects
          let weModified = false;
          for (let i = 0; i < allWhiteEdgesInst.count; i++) {
            allWhiteEdgesInst.getMatrixAt(i, tmpM);
            tmpM.decompose(tmpPos, tmpQuat, tmpScale);
            if (tmpScale.lengthSq() < 0.001) continue;
            const eMinX = tmpPos.x - tmpScale.x * 0.5;
            const eMaxX = tmpPos.x + tmpScale.x * 0.5;
            const eMinZ = tmpPos.z - tmpScale.y * 0.5;
            const eMaxZ = tmpPos.z + tmpScale.y * 0.5;
            if (eMaxX > openMinX && eMinX < openMaxX && eMaxZ > openMinZ && eMinZ < openMaxZ) {
              weModified = true;
              if (!isEastWest) {
                const leftLen = Math.max(0, openMinX - eMinX);
                const rightLen = Math.max(0, eMaxX - openMaxX);
                if (leftLen > 0.1) {
                  tmpPos.x = eMinX + leftLen * 0.5;
                  tmpScale.x = leftLen;
                  tmpM.compose(tmpPos, tmpQuat, tmpScale);
                  allWhiteEdgesInst.setMatrixAt(i, tmpM);
                  if (rightLen > 0.1) {
                    segGrp.add(createTaggedWhiteEdgeMesh(openMaxX, eMaxX, eMinZ, eMaxZ));
                  }
                } else if (rightLen > 0.1) {
                  tmpPos.x = openMaxX + rightLen * 0.5;
                  tmpScale.x = rightLen;
                  tmpM.compose(tmpPos, tmpQuat, tmpScale);
                  allWhiteEdgesInst.setMatrixAt(i, tmpM);
                } else {
                  allWhiteEdgesInst.setMatrixAt(i, zeroScaleMat);
                }
              } else {
                const southLen = Math.max(0, openMinZ - eMinZ);
                const northLen = Math.max(0, eMaxZ - openMaxZ);
                if (southLen > 0.1) {
                  tmpPos.z = eMinZ + southLen * 0.5;
                  tmpScale.y = southLen;
                  tmpM.compose(tmpPos, tmpQuat, tmpScale);
                  allWhiteEdgesInst.setMatrixAt(i, tmpM);
                  if (northLen > 0.1) {
                    segGrp.add(createTaggedWhiteEdgeMesh(eMinX, eMaxX, openMaxZ, eMaxZ));
                  }
                } else if (northLen > 0.1) {
                  tmpPos.z = openMaxZ + northLen * 0.5;
                  tmpScale.y = northLen;
                  tmpM.compose(tmpPos, tmpQuat, tmpScale);
                  allWhiteEdgesInst.setMatrixAt(i, tmpM);
                } else {
                  allWhiteEdgesInst.setMatrixAt(i, zeroScaleMat);
                }
              }
            }
          }
          if (weModified) allWhiteEdgesInst.instanceMatrix.needsUpdate = true;

          // 2B. Also open gap in any previously split or excavator-built white curb edge lines inside excavatorRoadsGroup!
          const existingWeMeshes: THREE.Mesh[] = [];
          excavatorRoadsGroup.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh && obj.userData?.isWhiteEdge) {
              existingWeMeshes.push(obj as THREE.Mesh);
            }
          });
          for (const weMesh of existingWeMeshes) {
            const { minX: eMinX, maxX: eMaxX, minZ: eMinZ, maxZ: eMaxZ } = weMesh.userData;
            if (eMaxX > openMinX && eMinX < openMaxX && eMaxZ > openMinZ && eMinZ < openMaxZ) {
              const parentGrp = weMesh.parent || segGrp;
              parentGrp.remove(weMesh);
              if (!isEastWest) {
                if (openMinX - eMinX > 0.1) {
                  parentGrp.add(createTaggedWhiteEdgeMesh(eMinX, openMinX, eMinZ, eMaxZ));
                }
                if (eMaxX - openMaxX > 0.1) {
                  parentGrp.add(createTaggedWhiteEdgeMesh(openMaxX, eMaxX, eMinZ, eMaxZ));
                }
              } else {
                if (openMinZ - eMinZ > 0.1) {
                  parentGrp.add(createTaggedWhiteEdgeMesh(eMinX, eMaxX, eMinZ, openMinZ));
                }
                if (eMaxZ - openMaxZ > 0.1) {
                  parentGrp.add(createTaggedWhiteEdgeMesh(eMinX, eMaxX, openMaxZ, eMaxZ));
                }
              }
            }
          }
        }

        // Asphalt surface identical to regular map roads (y = 0.04, roadMat, renderOrder = 2)
        const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
        asphalt.rotation.x = -Math.PI / 2;
        asphalt.position.set(snapX, 0.04, snapZ);
        asphalt.receiveShadow = true;
        asphalt.renderOrder = 2;
        segGrp.add(asphalt);

        // For T-intersections, trim the first SW_W (2.6m) of sidewalks and edge lines so they meet the host road's sidewalk corner-to-corner
        const trimStart = isEndExtension ? 0 : swWidth;
        const effectiveSwLen = roadLen - trimStart;
        const swCenterShift = isEndExtension ? 0 : branchDir * (trimStart * 0.5);
        const swCenterX = isEastWest ? snapX + swCenterShift : snapX;
        const swCenterZ = isEastWest ? snapZ : snapZ + swCenterShift;

        // Connected flush 2.6m concrete sidewalks on both sides (tagged so future roads built off this road also carve its sidewalk!)
        const swOffset = roadWidth * 0.5 + swWidth * 0.5;
        for (const sideSign of [-1, 1]) {
          const sCx = isEastWest ? swCenterX : snapX + sideSign * swOffset;
          const sCz = isEastWest ? snapZ + sideSign * swOffset : swCenterZ;
          const sW = isEastWest ? effectiveSwLen : swWidth;
          const sD = isEastWest ? swWidth : effectiveSwLen;
          const swMesh = new THREE.Mesh(new THREE.BoxGeometry(sW, SW_H, sD), sidewalkMat);
          swMesh.position.set(sCx, SW_Y, sCz);
          swMesh.receiveShadow = true;
          swMesh.renderOrder = 5;
          swMesh.userData = {
            isSidewalk: true,
            minX: sCx - sW * 0.5,
            maxX: sCx + sW * 0.5,
            minZ: sCz - sD * 0.5,
            maxZ: sCz + sD * 0.5,
          };
          segGrp.add(swMesh);
        }

        // Single yellow dashed centerlines (5.2m long x 0.24m wide at y = 0.07, spaced every 13.0m) — identical to regular roads!
        for (const dashOffset of [-6.5, 6.5]) {
          const dashMesh = new THREE.Mesh(
            isEastWest ? new THREE.PlaneGeometry(5.2, 0.24) : new THREE.PlaneGeometry(0.24, 5.2),
            stripeYellow
          );
          dashMesh.rotation.x = -Math.PI / 2;
          dashMesh.position.set(
            isEastWest ? snapX + dashOffset : snapX,
            0.07,
            isEastWest ? snapZ : snapZ + dashOffset
          );
          dashMesh.renderOrder = 3;
          segGrp.add(dashMesh);
        }

        // Solid white curb edge lines (0.16m wide at 0.36m inset from asphalt edge, y = 0.065) — tagged for future carving!
        for (const edgeOff of [-roadWidth * 0.5 + 0.36, roadWidth * 0.5 - 0.36]) {
          const eCx = isEastWest ? swCenterX : snapX + edgeOff;
          const eCz = isEastWest ? snapZ + edgeOff : swCenterZ;
          const eW = isEastWest ? effectiveSwLen : 0.16;
          const eD = isEastWest ? 0.16 : effectiveSwLen;
          const eLine = new THREE.Mesh(new THREE.PlaneGeometry(eW, eD), stripeWhite);
          eLine.rotation.x = -Math.PI / 2;
          eLine.position.set(eCx, 0.065, eCz);
          eLine.renderOrder = 3;
          eLine.userData = {
            isWhiteEdge: true,
            minX: eCx - eW * 0.5,
            maxX: eCx + eW * 0.5,
            minZ: eCz - eD * 0.5,
            maxZ: eCz + eD * 0.5,
          };
          segGrp.add(eLine);
        }

        // Add Zebra Crosswalk at the mouth of a new T-intersection branch (matching regular intersections)
        if (!isEndExtension) {
          const cwHalfSpan = Math.floor((roadWidth * 0.5 - 0.6) / 1.2) * 1.2;
          const mouthOffset = -branchDir * (roadLen * 0.5 - swWidth * 0.5);
          for (let cwOff = -cwHalfSpan; cwOff <= cwHalfSpan + 0.001; cwOff += 1.2) {
            const zBar = new THREE.Mesh(
              isEastWest ? new THREE.PlaneGeometry(2.2, 0.48) : new THREE.PlaneGeometry(0.48, 2.2),
              stripeWhite
            );
            zBar.rotation.x = -Math.PI / 2;
            zBar.position.set(
              isEastWest ? snapX + mouthOffset : snapX + cwOff,
              0.075,
              isEastWest ? snapZ + cwOff : snapZ + mouthOffset
            );
            zBar.renderOrder = 4;
            segGrp.add(zBar);
          }
        }

        excavatorRoadsGroup.add(segGrp);
        roadRects.push(newRect);
        soundFX.playPlaceObject();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.25);
        return;
      }

      if (mode === 'skyscraper') {
        // Build a Walkable Multi-Floor Skyscraper snapped onto a PRESET GRID alongside the road (never in the middle of any road!)
        const randomizedSkyscraperPool: {
          title: string;
          landmarkType?: FamousLandmarkType;
          isLaLandmark?: boolean;
          styleIdx: number;
          colorHex: number;
          minFloors: number;
          maxFloors: number;
          w: number;
          d: number;
        }[] = [
          {
            title: 'Wilshire Grand Spire Skyscraper',
            landmarkType: 'wilshire_grand',
            isLaLandmark: true,
            styleIdx: 0,
            colorHex: 0xcbd5e1,
            minFloors: 36,
            maxFloors: 56,
            w: 28,
            d: 26,
          },
          {
            title: 'One World Trade Freedom Tower',
            landmarkType: 'one_wtc',
            styleIdx: 1,
            colorHex: 0xe2e8f0,
            minFloors: 38,
            maxFloors: 58,
            w: 28,
            d: 28,
          },
          {
            title: 'Ping An Chevron Megatower',
            landmarkType: 'ping_an',
            styleIdx: 2,
            colorHex: 0xcbd5e1,
            minFloors: 40,
            maxFloors: 60,
            w: 28,
            d: 26,
          },
          {
            title: 'Salesforce Obelisk Skyscraper',
            landmarkType: 'salesforce',
            styleIdx: 3,
            colorHex: 0xe2e8f0,
            minFloors: 34,
            maxFloors: 52,
            w: 26,
            d: 24,
          },
          {
            title: 'Willis Bundled-Tube Skyscraper',
            landmarkType: 'willis_tower',
            styleIdx: 4,
            colorHex: 0x334155,
            minFloors: 36,
            maxFloors: 54,
            w: 28,
            d: 26,
          },
          {
            title: 'Shanghai Tiered Sky-Lobby Tower',
            landmarkType: 'shanghai_tower',
            styleIdx: 5,
            colorHex: 0x94a3b8,
            minFloors: 38,
            maxFloors: 56,
            w: 28,
            d: 26,
          },
          {
            title: 'Empire State Art Deco Skyscraper',
            landmarkType: 'empire_state',
            styleIdx: 2,
            colorHex: 0xd6d3d1,
            minFloors: 34,
            maxFloors: 50,
            w: 28,
            d: 24,
          },
          {
            title: 'Sapphire Diagrid Glass Skyscraper',
            styleIdx: 4,
            colorHex: 0x64748b,
            minFloors: 24,
            maxFloors: 44,
            w: 24,
            d: 22,
          },
          {
            title: 'Obsidian Executive Curtain-Wall Tower',
            styleIdx: 0,
            colorHex: 0x475569,
            minFloors: 26,
            maxFloors: 46,
            w: 26,
            d: 22,
          },
          {
            title: 'Titanium Vertical-Ribbed Skyscraper',
            styleIdx: 1,
            colorHex: 0x9ca3af,
            minFloors: 28,
            maxFloors: 48,
            w: 24,
            d: 24,
          },
          {
            title: 'Metropolitan Setback Crown Tower',
            styleIdx: 2,
            colorHex: 0xcbd5e1,
            minFloors: 26,
            maxFloors: 44,
            w: 26,
            d: 24,
          },
          {
            title: 'Century Horizontal-Mullion Skyscraper',
            styleIdx: 5,
            colorHex: 0x3f3f46,
            minFloors: 24,
            maxFloors: 42,
            w: 24,
            d: 22,
          },
        ];
        const chosen =
          randomizedSkyscraperPool[Math.floor(Math.random() * randomizedSkyscraperPool.length)];
        const floors =
          chosen.minFloors +
          Math.floor(Math.random() * (chosen.maxFloors - chosen.minFloors + 1));

        // Locate preset plot on the side of the road & destroy any trees in the footprint
        const plot = findRoadSidePresetPlot(targetX, targetZ, chosen.w, chosen.d, dirX, dirZ, 32);
        destroyTreesInRect(
          plot.x - chosen.w * 0.5 - 4.0,
          plot.x + chosen.w * 0.5 + 4.0,
          plot.z - chosen.d * 0.5 - 4.0,
          plot.z + chosen.d * 0.5 + 4.0
        );

        spawnWalkableStairSkyscraper(
          `${chosen.title} (${floors} Floors)`,
          plot.x,
          plot.z,
          chosen.w,
          chosen.d,
          floors,
          chosen.colorHex,
          Boolean(chosen.isLaLandmark),
          chosen.landmarkType,
          true,
          chosen.styleIdx
        );
        freezeStaticGroupMatrices(cityGroup);
        lastCullX = -99999;
        soundFX.playPlaceObject();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.35);
        return;
      }

      if (mode === 'highrise') {
        // Build a Walkable Multi-Floor High-Rise Building snapped onto a PRESET GRID alongside the road (never in the middle of any road!)
        const highRiseTitles = [
          'Wilshire High-Rise Tower',
          'Sunset Glass Condominiums',
          'Grand Avenue High-Rise Lofts',
          'Pacific Tinted Plaza Residences',
          'Biltmore Metropolitan High-Rise',
          'Century Skyline Suites',
          'Apex Architectural High-Rise',
          'Harbor View Glass High-Rise',
        ];
        const randStyle = Math.floor(Math.random() * 12);
        const stories = 7 + Math.floor(Math.random() * 9); // 7 to 15 stories
        const w = 20 + (randStyle % 3) * 2;
        const d = 18 + ((randStyle + 1) % 2) * 2;
        const title = highRiseTitles[Math.floor(Math.random() * highRiseTitles.length)];

        // Locate preset plot on the side of the road & destroy any trees in the footprint
        const plot = findRoadSidePresetPlot(targetX, targetZ, w, d, dirX, dirZ, 32);
        destroyTreesInRect(
          plot.x - w * 0.5 - 4.0,
          plot.x + w * 0.5 + 4.0,
          plot.z - d * 0.5 - 4.0,
          plot.z + d * 0.5 + 4.0
        );

        spawnApartmentBuilding(
          `${title} (${stories} Stories)`,
          plot.x,
          plot.z,
          w,
          d,
          stories,
          randStyle,
          true
        );
        freezeStaticGroupMatrices(cityGroup);
        lastCullX = -99999;
        soundFX.playPlaceObject();
        cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.3);
        return;
      }

      if (mode === 'build') {
        // Snap to Preset Residential Grid on the side of the road & destroy any trees in the house/lawn footprint!
        const randType = Math.floor(Math.random() * 20);
        const typeTitle = HOUSE_ARCHETYPE_NAMES[randType];
        const plot = findRoadSidePresetPlot(targetX, targetZ, 20, 18, dirX, dirZ, 28);
        destroyTreesInRect(plot.x - 16.0, plot.x + 16.0, plot.z - 18.0, plot.z + 16.0);

        spawnDetailedHouseOnGrid(randType, `${typeTitle} (${Math.round(plot.x)}, ${Math.round(plot.z)})`, plot.x, plot.z, true);
        freezeStaticGroupMatrices(cityGroup);
        lastCullX = -99999;
        soundFX.playPlaceObject();
      }
    };
    performExcavatorActionRef.current = performExcavatorAction;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Never intercept Shift or Escape in the canvas keydown listener — they toggle the main menu!
      if (
        e.key === 'Escape' ||
        e.key === 'Shift' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight'
      ) {
        return;
      }

      const k = e.key.toLowerCase();
      keys.add(k);

      // Auto pointer lock on any key down in-game to guarantee full rotational freedom of camera
      if (!stateRef.current.isMenuOpen && !stateRef.current.talkingNpcId) {
        if (document.pointerLockElement !== renderer.domElement) {
          try {
            const reqLock = renderer.domElement.requestPointerLock as unknown as (opts?: {
              unadjustedMovement?: boolean;
            }) => Promise<void> | void;
            reqLock?.call(renderer.domElement, { unadjustedMovement: true });
          } catch {}
        }
      }

      if (k === 'i' || k === 'j' || k === 'k' || k === 'l') {
        e.preventDefault();
      }

      // 'G' Key: Toggle Retractable Landing Gear when piloting a Plane, or Detonate Planted Remote Bombs on foot!
      if (k === 'g' && !e.repeat) {
        const curV = stateRef.current.activeVehicle;
        if (curV === 'plane') {
          e.preventDefault();
          planeGearDownRef.current = !planeGearDownRef.current;
          setPlaneGearDown(planeGearDownRef.current);
          soundFX.playCarEngineStart();
          return;
        }
        detonateAllRemoteBombs();
      }

      // Spacebar Jump when on foot!
      if ((k === ' ' || e.code === 'Space') && !e.repeat) {
        const cur = stateRef.current;
        const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);
        if (
          !curVehicle &&
          !cur.isMenuOpen &&
          (groundCoyoteTimer > 0 || Math.abs(humanVelYRef.current) < 1.25 || (cur.platformerMode && platformerCoyoteTimer > 0))
        ) {
          e.preventDefault();
          groundCoyoteTimer = 0;
          if (cur.platformerMode) {
            humanVelYRef.current = 10.4;
            platformerCoyoteTimer = 0;
          } else {
            const miscList = cur.activeMiscIds || [];
            const foodJumpEffect = (cur.activeFoodEffects || []).find(
              (ef) => ef.type === 'jump' && ef.endTime > Date.now()
            );
            const foodJumpMult = foodJumpEffect ? foodJumpEffect.value : 1.0;
            const jumpBoost =
              (miscList.includes('misc-speed-boots')
                ? 17.5
                : miscList.includes('misc-low-gravity')
                ? 14.2
                : 9.2) * foodJumpMult;
            humanVelYRef.current = jumpBoost;
          }
        }
      }

      // Excavator Action Keys:

      // 'R' Key: Fire Aircraft Rockets when piloting armed Helicopter or Plane!
      if (k === 'r' && !e.repeat && !stateRef.current.isMenuOpen) {
        const curV = stateRef.current.activeVehicle;
        if (curV === 'helicopter' || curV === 'plane') {
          e.preventDefault();
          fireAircraftOrdnance('rocket');
          return;
        }
      }

      // Press T to talk to nearest pedestrian with AI Chat
      if (k === 't' && !e.repeat && !stateRef.current.isMenuOpen && !stateRef.current.platformerMode) {
        const curV = stateRef.current.activeVehicle ?? (stateRef.current.isDrivingCar ? 'car' : null);
        if (!curV) {
          let nearestPed: (typeof npcMeshes)[0] | null = null;
          let minPedDist = 6.5;
          for (const n of npcMeshes) {
            if (n.dead || !n.group.visible) continue;
            const d = humanPosRef.current.distanceTo(n.group.position);
            if (d < minPedDist) {
              minPedDist = d;
              nearestPed = n;
            }
          }
          if (nearestPed) {
            e.preventDefault();
            stateRef.current.onTalkToNpc?.(nearestPed.data);
            return;
          }
        }
      }

      // 'E' Key Interaction (Note: Planes & Helicopters ONLY exit on [F] so [E] is dedicated to Throttle Up / Ascend!)
      if (k === 'e' && !e.repeat && !stateRef.current.platformerMode) {
        const cur = stateRef.current;
        const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);

        // 1. If inside Car:
        if (curVehicle === 'car') {
          e.preventDefault();
          // Maintain momentum when exiting: do not zero out speed!
          carPhysicsRef.current.steering = 0;
          const vx = carPhysicsRef.current.x;
          const vz = carPhysicsRef.current.z;
          if (activeCarGroupRef.current) {
            activeCarGroupRef.current.visible = true;
            activeCarGroupRef.current.position.set(vx, 0, vz);
            activeCarGroupRef.current.rotation.set(0, carPhysicsRef.current.rotationY, 0);
          }
          const exitSpot = findSafePlayerSpot(
            vx + Math.sin(carPhysicsRef.current.rotationY + Math.PI / 2) * 2.8,
            vz + Math.cos(carPhysicsRef.current.rotationY + Math.PI / 2) * 2.8,
            false
          );
          playerContainer.position.set(exitSpot.x, 0, exitSpot.z);
          humanPosRef.current.copy(playerContainer.position);
          const lookYaw = Math.atan2(vx - exitSpot.x, vz - exitSpot.z);
          humanRotRef.current = lookYaw;
          playerGrp.rotation.set(0, lookYaw, 0);
          cameraYawRef.current = lookYaw;
          smoothCamYawRef.current = lookYaw;
          cameraPitchRef.current = 0.35;
          smoothCamPitchRef.current = 0.35;
          prevVehicleModeRef.current = null;
          cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
          soundFX.playCarEngineStart();
          return;
        }

        // 1B. If riding Motorcycle:
        if (curVehicle === 'motorcycle') {
          e.preventDefault();
          // Maintain momentum when exiting: do not zero out speed!
          motorcyclePhysicsRef.current.steering = 0;
          const vx = motorcyclePhysicsRef.current.x;
          const vz = motorcyclePhysicsRef.current.z;
          if (activeMotorcycleGroupRef.current) {
            activeMotorcycleGroupRef.current.visible = true;
            activeMotorcycleGroupRef.current.position.set(vx, 0, vz);
          }
          const exitSpot = findSafePlayerSpot(
            vx + Math.sin(motorcyclePhysicsRef.current.rotationY + Math.PI / 2) * 2.0,
            vz + Math.cos(motorcyclePhysicsRef.current.rotationY + Math.PI / 2) * 2.0,
            false
          );
          playerContainer.position.set(exitSpot.x, 0, exitSpot.z);
          humanPosRef.current.copy(playerContainer.position);
          const lookYaw = Math.atan2(vx - exitSpot.x, vz - exitSpot.z);
          humanRotRef.current = lookYaw;
          playerGrp.rotation.set(0, lookYaw, 0);
          cameraYawRef.current = lookYaw;
          smoothCamYawRef.current = lookYaw;
          cameraPitchRef.current = 0.35;
          smoothCamPitchRef.current = 0.35;
          prevVehicleModeRef.current = null;
          cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
          soundFX.playCarEngineStart();
          return;
        }


        // 3 & 4. If inside Plane or Helicopter: E is Throttle Up (Plane) / Ascend (Helicopter) — NEVER exit on E! Only F exits!
        if (curVehicle === 'plane' || curVehicle === 'helicopter') {
          return;
        }

        // 4B. On Foot: Check Boarding Parked Car or Hijacking NPC Traffic Car / Police Cruiser by pressing [E]!
        if (!curVehicle && !isExplodingRef.current) {
          let bestDist = 5.6;
          let bestKind: 'active_car' | 'parked_car' | 'traffic_car' | 'police_car' | null = null;
          let bestParkedIdx = -1;
          let bestTrafficCar: NpcTrafficCar | null = null;
          let bestPoliceCar: (typeof policeCruisers)[0] | null = null;

          if (hasSpawnedCarRef.current && activeCarGroupRef.current && activeCarGroupRef.current.visible) {
            const dActive = Math.hypot(
              humanPosRef.current.x - carPhysicsRef.current.x,
              humanPosRef.current.z - carPhysicsRef.current.z
            );
            if (dActive < 4.8 && dActive < bestDist) {
              bestDist = dActive;
              bestKind = 'active_car';
            }
          }

          for (let i = 0; i < parkedCars.length; i++) {
            const pk = parkedCars[i];
            if (pk.destroyed || !pk.group.visible) continue;
            const dPk = Math.hypot(humanPosRef.current.x - pk.x, humanPosRef.current.z - pk.z);
            if (dPk < 4.8 && dPk < bestDist) {
              bestDist = dPk;
              bestKind = 'parked_car';
              bestParkedIdx = i;
            }
          }

          for (const tc of npcTrafficCars) {
            if (tc.destroyed || tc.hijacked || !tc.group.visible) continue;
            const dTc = Math.hypot(tc.x - humanPosRef.current.x, tc.z - humanPosRef.current.z);
            if (dTc < bestDist) {
              bestDist = dTc;
              bestKind = 'traffic_car';
              bestTrafficCar = tc;
            }
          }

          for (const pc of policeCruisers) {
            if (pc.destroyed || !pc.group.visible) continue;
            const dPc = Math.hypot(pc.x - humanPosRef.current.x, pc.z - humanPosRef.current.z);
            if (dPc < bestDist) {
              bestDist = dPc;
              bestKind = 'police_car';
              bestPoliceCar = pc;
            }
          }

          if (bestKind === 'active_car') {
            e.preventDefault();
            carPhysicsRef.current.speed = 0;
            carPhysicsRef.current.steering = 0;
            smoothVehicleRotYRef.current = carPhysicsRef.current.rotationY;
            carCameraYawRef.current = carPhysicsRef.current.rotationY;
            cur.onEnterVehicle ? cur.onEnterVehicle('car') : cur.onEnterCar();
            soundFX.playCarEngineStart();
            return;
          }

          if (bestKind === 'parked_car' && bestParkedIdx >= 0) {
            e.preventDefault();
            const chosen = parkedCars.splice(bestParkedIdx, 1)[0];
            archiveActiveCarIfPresent();
            activeCarGroupRef.current = chosen.group;
            activeCarGroupRef.current.visible = true;
            activeCarSpecRef.current = chosen.carSpec;
            carWheelsRef.current = chosen.wheels;
            hasSpawnedCarRef.current = true;
            carPhysicsRef.current.x = chosen.x;
            carPhysicsRef.current.z = chosen.z;
            carPhysicsRef.current.rotationY = chosen.rotationY;
            carPhysicsRef.current.speed = 0;
            carPhysicsRef.current.steering = 0;
            smoothVehicleRotYRef.current = chosen.rotationY;
            carCameraYawRef.current = chosen.rotationY;
            carHealthRef.current = 100;
            setCarHealth(100);
            cur.onEnterVehicle ? cur.onEnterVehicle('car') : cur.onEnterCar();
            soundFX.playCarEngineStart();
            return;
          }

          if (bestKind === 'traffic_car' && bestTrafficCar) {
            e.preventDefault();
            bestTrafficCar.hijacked = true;
            bestTrafficCar.destroyed = true;
            bestTrafficCar.respawnTimer = 999999;
            bestTrafficCar.group.visible = false;

            archiveActiveCarIfPresent();

            const hijackedModel = buildCar3DModel(bestTrafficCar.carSpec);
            attachHeadlightSpotlightsToCar(hijackedModel.group);
            hijackedModel.group.position.set(bestTrafficCar.x, 0, bestTrafficCar.z);
            hijackedModel.group.rotation.y = bestTrafficCar.rotationY;
            hijackedModel.group.visible = true;
            scene.add(hijackedModel.group);

            activeCarGroupRef.current = hijackedModel.group;
            activeCarSpecRef.current = bestTrafficCar.carSpec;
            carWheelsRef.current = hijackedModel.wheels;
            hasSpawnedCarRef.current = true;

            carPhysicsRef.current.x = bestTrafficCar.x;
            carPhysicsRef.current.z = bestTrafficCar.z;
            carPhysicsRef.current.rotationY = bestTrafficCar.rotationY;
            carPhysicsRef.current.speed = 0;
            carPhysicsRef.current.steering = 0;
            smoothVehicleRotYRef.current = bestTrafficCar.rotationY;
            carCameraYawRef.current = bestTrafficCar.rotationY;
            carHealthRef.current = 100;
            setCarHealth(100);

            reportPlayerCrime(1);
            cur.onEnterVehicle ? cur.onEnterVehicle('car') : cur.onEnterCar();
            soundFX.playCarEngineStart();
            return;
          }

          if (bestKind === 'police_car' && bestPoliceCar) {
            e.preventDefault();
            bestPoliceCar.destroyed = true;
            bestPoliceCar.group.visible = false;

            archiveActiveCarIfPresent();

            const policeSpec: CarVehicle = {
              id: 'car-police-cruiser',
              name: 'Interceptor Police Cruiser',
              modelStyle: 'police_cruiser',
              category: 'police',
              price: 0,
              color: '#111827',
              maxSpeed: 165,
              acceleration: 9,
              handling: 9,
              description: 'Police Pursuit Cruiser',
            };
            const hijackedModel = buildCar3DModel(policeSpec);
            attachHeadlightSpotlightsToCar(hijackedModel.group);
            hijackedModel.group.position.set(bestPoliceCar.x, 0, bestPoliceCar.z);
            hijackedModel.group.rotation.y = bestPoliceCar.rotY;
            hijackedModel.group.visible = true;
            scene.add(hijackedModel.group);

            activeCarGroupRef.current = hijackedModel.group;
            activeCarSpecRef.current = policeSpec;
            carWheelsRef.current = hijackedModel.wheels;
            hasSpawnedCarRef.current = true;

            carPhysicsRef.current.x = bestPoliceCar.x;
            carPhysicsRef.current.z = bestPoliceCar.z;
            carPhysicsRef.current.rotationY = bestPoliceCar.rotY;
            carPhysicsRef.current.speed = 0;
            carPhysicsRef.current.steering = 0;
            smoothVehicleRotYRef.current = bestPoliceCar.rotY;
            carCameraYawRef.current = bestPoliceCar.rotY;
            carHealthRef.current = 100;
            setCarHealth(100);

            reportPlayerCrime(1);
            cur.onEnterVehicle ? cur.onEnterVehicle('car') : cur.onEnterCar();
            soundFX.playCarEngineStart();
            return;
          }
        }

        // 4C. Check if near a peaceful Pedestrian NPC to talk to them with AI Chat by pressing [E]!
        let nearestPed: (typeof npcMeshes)[0] | null = null;
        let minPedDist = 3.4;
        for (const n of npcMeshes) {
          if (n.dead || n.isHostile || !n.group.visible) continue;
          const d = humanPosRef.current.distanceTo(n.group.position);
          if (d < minPedDist) {
            minPedDist = d;
            nearestPed = n;
          }
        }
        if (nearestPed && !cur.zombieMode) {
          e.preventDefault();
          cur.onTalkToNpc?.(nearestPed.data);
          return;
        }



        // 6. Check Boarding Plane (only if spawned!)
        if (hasSpawnedPlaneRef.current) {
          const planeDist = Math.hypot(
            humanPosRef.current.x - planePhysicsRef.current.x,
            humanPosRef.current.z - planePhysicsRef.current.z
          );
          if (planeDist < 6.5) {
            e.preventDefault();
            cur.onEnterVehicle ? cur.onEnterVehicle('plane') : cur.onEnterCar();
            soundFX.playCarEngineStart();
            return;
          }
        }

        // 7. Check Boarding Helicopter (only if spawned!)
        if (hasSpawnedHeliRef.current) {
          const heliDist = Math.hypot(
            humanPosRef.current.x - helicopterPhysicsRef.current.x,
            humanPosRef.current.y - helicopterPhysicsRef.current.y,
            humanPosRef.current.z - helicopterPhysicsRef.current.z
          );
          if (heliDist < 6.5) {
            e.preventDefault();
            cur.onEnterVehicle ? cur.onEnterVehicle('helicopter') : cur.onEnterCar();
            soundFX.playHelicopterThump();
            return;
          }
        }


        // 9. Check Boarding Motorcycle (only if spawned!)
        if (hasSpawnedMotorcycleRef.current) {
          const motoDist = Math.hypot(
            humanPosRef.current.x - motorcyclePhysicsRef.current.x,
            humanPosRef.current.z - motorcyclePhysicsRef.current.z
          );
          if (motoDist < 3.6) {
            e.preventDefault();
            cur.onEnterVehicle ? cur.onEnterVehicle('motorcycle') : cur.onEnterCar();
            soundFX.playCarEngineStart();
            return;
          }
        }

        // 10. Check NPC Interaction (Nobody attacks you unless you attack them!)
        for (const npc of npcMeshes) {
          if (npc.dead || npc.isHostile) continue;
          const dist = humanPosRef.current.distanceTo(npc.group.position);
          if (dist < 3.4) {
            cur.onInteractWithNPC(npc.data);
            soundFX.playInteractChime();
            return;
          }
        }



        // 12. Check Grocery Interaction
        for (const g of groceriesRef.current) {
          if (Math.hypot(humanPosRef.current.x - g.x, humanPosRef.current.z - g.z) < 6.0 && humanPosRef.current.y < 3) {
            e.preventDefault();
            cur.onGrabIngredients();
            return;
          }
        }

        // 11. Check Interactive Shops, Restaurants, and Vehicle Showrooms
        const px = curVehicle === 'car' ? carPhysicsRef.current.x
                 : curVehicle === 'motorcycle' ? motorcyclePhysicsRef.current.x
                 : curVehicle === 'helicopter' ? helicopterPhysicsRef.current.x
                 : curVehicle === 'plane' ? planePhysicsRef.current.x
                 : humanPosRef.current.x;
        const pz = curVehicle === 'car' ? carPhysicsRef.current.z
                 : curVehicle === 'motorcycle' ? motorcyclePhysicsRef.current.z
                 : curVehicle === 'helicopter' ? helicopterPhysicsRef.current.z
                 : curVehicle === 'plane' ? planePhysicsRef.current.z
                 : humanPosRef.current.z;

        for (const bldg of destructibleBuildingsRef.current) {
          if (bldg.destroyed) continue;
          const dist = Math.hypot(px - bldg.cx, pz - bldg.cz);
          if (dist < 9.5) {
            // Check vehicle showrooms
            if (bldg.name.includes('Auto Motors')) {
              cur.onOpenShop('cars');
              return;
            }
            if (bldg.name.includes('Apex Moto') || bldg.name.includes('Superbike')) {
              cur.onOpenShop('motorcycles');
              return;
            }
            if (bldg.name.includes('AeroFlight')) {
              cur.onOpenShop('helicopters');
              return;
            }
            if (bldg.name.includes('Supersonic')) {
              cur.onOpenShop('planes');
              return;
            }

            // Check food/drink shops
            if (bldg.isRestaurant) {
              e.preventDefault();
              if (cur.onOpenRestaurantMenu) {
                cur.onOpenRestaurantMenu('restaurant', bldg.name);
              }
              return;
            }
            if (bldg.isDiner) {
              e.preventDefault();
              if (cur.onOpenRestaurantMenu) {
                cur.onOpenRestaurantMenu('diner', bldg.name);
              }
              return;
            }
            if (bldg.isCafe) {
              e.preventDefault();
              if (cur.onOpenRestaurantMenu) {
                cur.onOpenRestaurantMenu('cafe', bldg.name);
              }
              return;
            }
            if (bldg.isHardware) {
              e.preventDefault();
              const toolsList = ['weapon-chainsaw', 'misc-gravity-hammer', 'weapon-timebomb'];
              const curW = cur.activeWeaponId || '';
              let nextToolIdx = toolsList.indexOf(curW) + 1;
              if (nextToolIdx >= toolsList.length) nextToolIdx = 0;
              const nextToolId = toolsList[nextToolIdx];

              if (cur.onSelectWeapon) {
                cur.onSelectWeapon(nextToolId);
                let toolName = 'High-Tech Tool';
                if (nextToolId === 'weapon-chainsaw') toolName = 'Lumberjack Chainsaw 🪚';
                if (nextToolId === 'misc-gravity-hammer') toolName = 'Gravity Hammer 🔨';
                if (nextToolId === 'weapon-timebomb') toolName = 'Timebomb C4 💣';

                 cur.onInteractWithNPC({
                  id: 'hardware-clerk',
                  name: 'Apex Clerk 🛠️',
                  role: 'Store Manager',
                  outfitColor: '#ea580c',
                  dialogueList: [`Equipped free ${toolName}! Press E again to cycle to another tool!`],
                  position: [0, 0, 0],
                  rotationY: 0,
                  waypoints: [],
                  currentWaypointIdx: 0,
                });
                soundFX.playPlaceObject();
              }
              return;
            }
            if (bldg.isGasStation) {
              e.preventDefault();
              if (curVehicle) {
                carHealthRef.current = 100;
                setCarHealth(100);
                cur.onInteractWithNPC({
                  id: 'gas-attendant',
                  name: 'Service Attendant ⛽',
                  role: 'Station Attendant',
                  outfitColor: '#dc2626',
                  dialogueList: ['Vehicle refueled and fully repaired! Drive safe! 🚗💨'],
                  position: [0, 0, 0],
                  rotationY: 0,
                  waypoints: [],
                  currentWaypointIdx: 0,
                });
                soundFX.playInteractChime();
              } else {
                const speedSnack = RECIPES.find((r) => r.id === 'sandwich') || RECIPES[0];
                if (cur.onEatFood && speedSnack) {
                  cur.onEatFood({
                    ...speedSnack,
                    name: 'Starlight Energy Fuel ⚡',
                    emoji: '🥤',
                    effect: { type: 'speed', duration: 45, value: 1.4 },
                  });
                  cur.onInteractWithNPC({
                    id: 'gas-attendant',
                    name: 'Service Attendant ⚡',
                    role: 'Station Attendant',
                    outfitColor: '#dc2626',
                    dialogueList: ['Grabbed a Starlight Energy Fuel Drink ⚡! Enjoy the extra speed on foot!'],
                    position: [0, 0, 0],
                    rotationY: 0,
                    waypoints: [],
                    currentWaypointIdx: 0,
                  });
                  soundFX.playInteractChime();
                }
              }
              return;
            }
          }
        }
      }

      // 'F' Key: Disembark Any Vehicle
      if (k === 'f' && !e.repeat) {
        const cur = stateRef.current;
        const curVehicle = cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null);
        if (curVehicle === 'car') {
          e.preventDefault();
          // Maintain momentum when exiting: do not zero out speed!
          carPhysicsRef.current.steering = 0;
          const vx = carPhysicsRef.current.x;
          const vz = carPhysicsRef.current.z;
          if (activeCarGroupRef.current) {
            activeCarGroupRef.current.visible = true;
            activeCarGroupRef.current.position.set(vx, 0, vz);
            activeCarGroupRef.current.rotation.set(0, carPhysicsRef.current.rotationY, 0);
          }
          const exitSpot = findSafePlayerSpot(
            vx + Math.sin(carPhysicsRef.current.rotationY + Math.PI / 2) * 2.8,
            vz + Math.cos(carPhysicsRef.current.rotationY + Math.PI / 2) * 2.8,
            false
          );
          playerContainer.position.set(exitSpot.x, 0, exitSpot.z);
          humanPosRef.current.copy(playerContainer.position);
          const lookYaw = Math.atan2(vx - exitSpot.x, vz - exitSpot.z);
          humanRotRef.current = lookYaw;
          playerGrp.rotation.set(0, lookYaw, 0);
          cameraYawRef.current = lookYaw;
          smoothCamYawRef.current = lookYaw;
          cameraPitchRef.current = 0.35;
          smoothCamPitchRef.current = 0.35;
          prevVehicleModeRef.current = null;
          cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
          soundFX.playCarEngineStart();
          return;
        }
        if (curVehicle === 'motorcycle') {
          e.preventDefault();
          // Maintain momentum when exiting: do not zero out speed!
          motorcyclePhysicsRef.current.steering = 0;
          const vx = motorcyclePhysicsRef.current.x;
          const vz = motorcyclePhysicsRef.current.z;
          if (activeMotorcycleGroupRef.current) {
            activeMotorcycleGroupRef.current.visible = true;
            activeMotorcycleGroupRef.current.position.set(vx, 0, vz);
          }
          const exitSpot = findSafePlayerSpot(
            vx + Math.sin(motorcyclePhysicsRef.current.rotationY + Math.PI / 2) * 2.0,
            vz + Math.cos(motorcyclePhysicsRef.current.rotationY + Math.PI / 2) * 2.0,
            false
          );
          playerContainer.position.set(exitSpot.x, 0, exitSpot.z);
          humanPosRef.current.copy(playerContainer.position);
          const lookYaw = Math.atan2(vx - exitSpot.x, vz - exitSpot.z);
          humanRotRef.current = lookYaw;
          playerGrp.rotation.set(0, lookYaw, 0);
          cameraYawRef.current = lookYaw;
          smoothCamYawRef.current = lookYaw;
          cameraPitchRef.current = 0.35;
          smoothCamPitchRef.current = 0.35;
          prevVehicleModeRef.current = null;
          cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
          soundFX.playCarEngineStart();
          return;
        }
        if (curVehicle === 'helicopter' || curVehicle === 'plane') {
          e.preventDefault();
          const vx = curVehicle === 'plane' ? planePhysicsRef.current.x : helicopterPhysicsRef.current.x;
          const vy = curVehicle === 'plane' ? planePhysicsRef.current.y : helicopterPhysicsRef.current.y;
          const vz = curVehicle === 'plane' ? planePhysicsRef.current.z : helicopterPhysicsRef.current.z;
          if (curVehicle === 'helicopter') {
            helicopterPhysicsRef.current.speed = 0;
            helicopterPhysicsRef.current.verticalSpeed = 0;
            if (activeHeliGroupRef.current) {
              activeHeliGroupRef.current.visible = true;
              activeHeliGroupRef.current.position.set(vx, vy, vz);
              const canopy = activeHeliGroupRef.current.getObjectByName('cockpitCanopy');
              if (canopy) canopy.visible = true;
            }
          } else {
            // Maintain momentum when exiting plane: do not zero out speed! Keep flying in current direction with active collision!
            hasSpawnedPlaneRef.current = true;
            if (activePlaneGroupRef.current) {
              activePlaneGroupRef.current.visible = true;
              activePlaneGroupRef.current.position.set(vx, vy, vz);
              const canopy = activePlaneGroupRef.current.getObjectByName('cockpitCanopy');
              if (canopy) canopy.visible = true;
            }
          }
          const exitSpot = findSafePlayerSpot(vx + 4.0, vz, false);
          playerContainer.position.set(exitSpot.x, Math.max(0, vy - 0.18), exitSpot.z);
          humanPosRef.current.copy(playerContainer.position);
          const lookYaw = Math.atan2(vx - exitSpot.x, vz - exitSpot.z);
          humanRotRef.current = lookYaw;
          playerGrp.rotation.set(0, lookYaw, 0);
          cameraYawRef.current = lookYaw;
          smoothCamYawRef.current = lookYaw;
          cameraPitchRef.current = 0.35;
          smoothCamPitchRef.current = 0.35;
          prevVehicleModeRef.current = null;
          cur.onExitVehicle ? cur.onExitVehicle() : cur.onExitCar();
          soundFX.playCarEngineStart();
          return;
        }
      }

      if (k === 'h' && stateRef.current.isDrivingCar) {
        soundFX.playCarHorn();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };

    // Direct 1:1 Mouse Viewpoint Rotation (Zero Acceleration, Instant Response) + Right-Click Aiming
    let pointerPos = { x: 0, y: 0 };
    let hasPointerPos = false;
    let isHoldingLeftClick = false;
    let isHoldingRightClick = false;

    const onPointerDown = (e: PointerEvent) => {
      if (isMiniMapEnlargedRef.current) return;
      pointerPos = { x: e.clientX, y: e.clientY };
      hasPointerPos = true;
      if (e.button === 0) {
        isHoldingLeftClick = true;
      }
      if (e.button === 2) {
        isHoldingRightClick = true;
        if (!stateRef.current.isMenuOpen) {
          const curV = stateRef.current.activeVehicle ?? (stateRef.current.isDrivingCar ? 'car' : null);
          if (!curV) {
            isAimingRef.current = true;
            setIsAiming(true);
          }
        }
      }
      if (!stateRef.current.isMenuOpen) {
        if (stateRef.current.talkingNpcId) {
          stateRef.current.onCloseNpcChat?.();
        }
        try {
          if (document.pointerLockElement !== renderer.domElement) {
            const reqLock = renderer.domElement.requestPointerLock as unknown as (opts?: {
              unadjustedMovement?: boolean;
            }) => Promise<void> | void;
            const res = reqLock?.call(renderer.domElement, { unadjustedMovement: true });
            if (res && typeof (res as Promise<void>).catch === 'function') {
              (res as Promise<void>).catch(() => {
                renderer.domElement.requestPointerLock?.();
              });
            }
          }
        } catch {
          // Ignore pointer lock restrictions in sandboxed iframes
        }
        const curV = stateRef.current.activeVehicle ?? (stateRef.current.isDrivingCar ? 'car' : null);
        if (curV === 'helicopter' || curV === 'plane') {
          if (e.button === 0) fireAircraftOrdnance('gun');
          else if (e.button === 2) fireAircraftOrdnance('rocket');
        } else if (!curV) {
          if (e.button === 0) {
            chainsawHolding = true;
            fireEquippedWeapon(true);
          }
        }
      }
    };

    const onPointerLeave = () => {
      hasPointerPos = false;
      chainsawHolding = false;
      isHoldingLeftClick = false;
      isHoldingRightClick = false;
      isAimingRef.current = false;
      setIsAiming(false);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        pointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        hasPointerPos = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (stateRef.current.isMenuOpen || stateRef.current.talkingNpcId) {
        hasPointerPos = false;
        return;
      }
      if (e.touches.length === 1) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;
        if (!hasPointerPos) {
          pointerPos = { x: tx, y: ty };
          hasPointerPos = true;
          return;
        }
        const dx = tx - pointerPos.x;
        const dy = ty - pointerPos.y;
        pointerPos = { x: tx, y: ty };
        cameraYawRef.current -= dx * 0.003;
        cameraPitchRef.current = Math.max(-1.52, Math.min(1.52, cameraPitchRef.current + dy * 0.0024));
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (stateRef.current.isMenuOpen || stateRef.current.talkingNpcId) {
        hasPointerPos = false;
        return;
      }

      let dx = 0;
      let dy = 0;
      if (document.pointerLockElement === renderer.domElement) {
        dx = e.movementX || 0;
        dy = e.movementY || 0;
      } else if (!hasPointerPos) {
        pointerPos = { x: e.clientX, y: e.clientY };
        hasPointerPos = true;
        return;
      } else {
        dx = e.clientX - pointerPos.x;
        dy = e.clientY - pointerPos.y;
        pointerPos = { x: e.clientX, y: e.clientY };
      }

      // Pure 1:1 linear sensitivity with zero acceleration or smoothing — full vertical range!
      const sensitivity = 0.0028;
      cameraYawRef.current -= dx * sensitivity;
      cameraPitchRef.current = Math.max(
        -1.52,
        Math.min(1.52, cameraPitchRef.current + dy * sensitivity)
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 0) {
        chainsawHolding = false;
        isHoldingLeftClick = false;
      }
      if (e.button === 2) {
        isHoldingRightClick = false;
        isAimingRef.current = false;
        setIsAiming(false);
        return;
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Scroll Wheel Zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistRef.current = Math.max(3.5, Math.min(26.0, cameraDistRef.current + e.deltaY * 0.015));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // =========================================================================
    // 8. 60FPS SIMULATION WITH COLLISION DETECTION & INTERIOR VIEW CAMERA
    // =========================================================================
    let animId = 0;
    const clock = new THREE.Clock();
    let accumulatedTravelDist = 0;
    const lastTravelPos = { x: 596, z: 31 };
    let smoothDt = 1 / 60;
    let walkPhase = 0;
    let planePitchHoldTime = 0;
    let lastPlanePitchDir = 0;
    let saveTimer = 0;
    let lastReportedSpeed = -1;
    let lastSpeedHudTime = 0;
    let lastReportedAlt = -1;
    let lastPromptActionId = '';

    const updateSpeedIfChanged = (spd: number, nowSec: number = clock.elapsedTime, forceImmediate: boolean = false) => {
      if (
        spd !== lastReportedSpeed &&
        (forceImmediate || spd === 0 || nowSec <= 0 || Math.abs(nowSec - lastSpeedHudTime) >= 0.03)
      ) {
        lastReportedSpeed = spd;
        if (nowSec > 0) lastSpeedHudTime = nowSec;
        stateRef.current.onSpeedUpdate(spd);
      }
    };
    const updateAltIfChanged = (alt: number) => {
      if (alt !== lastReportedAlt) {
        lastReportedAlt = alt;
        stateRef.current.onAltitudeUpdate?.(alt);
      }
    };
    const updatePromptIfChanged = (promptObj: { text: string; icon: string; actionId: string } | null) => {
      const nextKey = promptObj ? `${promptObj.actionId}:${promptObj.text}` : '';
      if (nextKey !== lastPromptActionId) {
        lastPromptActionId = nextKey;
        setNearbyPrompt(promptObj);
      }
    };

    // Fast O(1) Spatial-Grid Axis-Aligned Bounding Box Collision Check (Respects destroyed state, building minY/maxY & Map Invisible Barrier)
    const checkCollision = (cx: number, cz: number, radius: number, py: number = 0): boolean => {
      if (stateRef.current.platformerMode) {
        return false;
      }
      if (stateRef.current.pvpConfig?.active) {
        return Math.abs(cx - PVP_ARENA_X) + radius > 1100 || Math.abs(cz - PVP_ARENA_Z) + radius > 1100;
      }
      if (Math.abs(cx) + radius > MAP_BOUND || Math.abs(cz) + radius > MAP_BOUND) {
        return true;
      }
      const nearby = getNearbyColliders(cx, cz);
      for (const col of nearby) {
        if (col.destroyed) continue;
        if (col.name === 'Forest Tree' && stateRef.current.resolutionScale === 'extra-low') continue;
        if (col.buildingId) {
          const b = destructibleBuildingsMap.get(col.buildingId);
          if (b && (b.destroyed || b.collapsing || b.group.position.y <= -0.8)) {
            col.destroyed = true;
            continue;
          }
        }
        if (col.minY !== undefined && py < col.minY) continue;
        if (col.maxY !== undefined && py > col.maxY) continue;
        if (col.destroyedYRanges?.some(([rMin, rMax]) => py >= rMin && py <= rMax)) continue;
        if (
          cx + radius > col.minX &&
          cx - radius < col.maxX &&
          cz + radius > col.minZ &&
          cz - radius < col.maxZ
        ) {
          return true;
        }
      }
      return false;
    };

    // Person movement with solid wall collision & sliding (only enters buildings through open doorways, zero wall clipping!)
    const movePersonWithWallCollision = (
      x: number,
      z: number,
      py: number,
      dx: number,
      dz: number,
      radius: number = 0.34
    ): { x: number; z: number } => {
      if (!checkCollision(x + dx, z + dz, radius, py)) {
        return { x: x + dx, z: z + dz };
      }
      let nextX = x;
      let nextZ = z;
      if (!checkCollision(x + dx, z, radius, py)) {
        nextX = x + dx;
      }
      if (!checkCollision(nextX, z + dz, radius, py)) {
        nextZ = z + dz;
      }
      return { x: nextX, z: nextZ };
    };

    // Vehicle building & wall collision check (prevents cars/motorcycles/police/zombie cars from entering or passing through buildings!)
    const findVehicleBuildingOrWallCollider = (
      cx: number,
      cz: number,
      radius: number = 1.2,
      ignoreExcavatorBuilt: boolean = false
    ): BoxCollider | null => {
      if (stateRef.current.pvpConfig?.active) return null;
      // Block vehicles from entering the footprint of any standing building (only people on foot can enter doorways!)
      for (const bldg of destructibleBuildingsRef.current) {
        if (bldg.destroyed || bldg.collapsing || bldg.group.position.y <= -0.8) continue;
        if (
          Math.abs(cx - bldg.cx) < bldg.w * 0.5 + radius &&
          Math.abs(cz - bldg.cz) < bldg.d * 0.5 + radius
        ) {
          if (ignoreExcavatorBuilt) {
            const hasExcCol = getNearbyColliders(cx, cz).some(
              (c) => c.buildingId === bldg.id && c.isExcavatorBuilt
            );
            if (hasExcCol) continue;
          }
          return {
            minX: bldg.cx - bldg.w * 0.5,
            maxX: bldg.cx + bldg.w * 0.5,
            minZ: bldg.cz - bldg.d * 0.5,
            maxZ: bldg.cz + bldg.d * 0.5,
            maxY: bldg.h,
            name: bldg.name,
            isBuilding: true,
            buildingId: bldg.id,
          };
        }
      }
      const nearby = getNearbyColliders(cx, cz);
      for (const col of nearby) {
        if (col.destroyed) continue;
        if (col.name === 'Forest Tree' && stateRef.current.resolutionScale === 'extra-low') continue;
        if (ignoreExcavatorBuilt && col.isExcavatorBuilt) continue;
        if (col.buildingId) {
          const b = destructibleBuildingsMap.get(col.buildingId);
          if (b && (b.destroyed || b.collapsing || b.group.position.y <= -0.8)) {
            col.destroyed = true;
            continue;
          }
        }
        if ((col.maxY ?? 18.0) <= 0.5) continue;
        if (
          cx + radius > col.minX &&
          cx - radius < col.maxX &&
          cz + radius > col.minZ &&
          cz - radius < col.maxZ
        ) {
          return col;
        }
      }
      return null;
    };

    // Near-Player Active Area Culling (Spatial Chunk Queries for O(1) Building Visibility Lookups)
    let lastCullX = -99999;
    let lastCullZ = -99999;
    let lastCullTimer = 0;
    let lastShadowX = -99999;
    let lastShadowZ = -99999;
    let lastDisplayedHp = 100;
    let miniMapFrameTick = 0;
    let activeVisibleBuildings = new Set<DestructibleBuilding>();

    const updateActiveAreaVisibility = (focusX: number, focusZ: number, isFlyingHigh: boolean) => {
      const isPerf = Boolean(stateRef.current.performanceMode);
      const isExtraFast = stateRef.current.resolutionScale === 'extra-low';
      const isPvp = Boolean(stateRef.current.pvpConfig?.active);
      const isPlat = Boolean(stateRef.current.platformerMode);
      const isTitle = Boolean(stateRef.current.isTitleScreen);
      const targetFar = isTitle
        ? 3200
        : isPvp || isPlat
        ? 950
        : isPerf
        ? isFlyingHigh
          ? 420
          : 280
        : isFlyingHigh
        ? 800
        : 500;
      if (Math.abs(camera.far - targetFar) > 15) {
        camera.far = targetFar;
        camera.updateProjectionMatrix();
      }
      if (scene.fog) {
        (scene.fog as THREE.FogExp2).density = isTitle
          ? 0.00088
          : isPlat
          ? 0.00022
          : isPvp
          ? 0.0008
          : isFlyingHigh
          ? 0.0011
          : 0.0015;
      }
      if (isPvp) return;
      if (isPlat && !isFallingToCityInPlatformer) return;

      // On the Title Screen drone shot, use ultra-smooth 60FPS aerial LOD:
      // Show skyscrapers/high-rises & Downtown core buildings with interior meshes hidden,
      // and pause microscopic pedestrians, traffic cars, clouds & dynamic shadows for zero frame drops!
      if (isTitle) {
        sunLight.castShadow = false;
        cloudsGroup.visible = false;
        npcCarsGroup.visible = false;
        policeGroup.visible = false;
        playerContainer.visible = false;
        const droneCenterX = 115;
        const droneCenterZ = -10;
        const titleVisible = new Set<DestructibleBuilding>();
        for (const bldg of destructibleBuildingsRef.current) {
          if (bldg.destroyed) {
            bldg.group.visible = false;
            continue;
          }
          const distToDroneCenter = Math.hypot(bldg.cx - droneCenterX, bldg.cz - droneCenterZ);
          const showInDroneShot = (bldg.h >= 22 && distToDroneCenter <= 600) || distToDroneCenter <= 190;
          if (showInDroneShot) {
            titleVisible.add(bldg);
            if (!bldg.group.visible) bldg.group.visible = true;
          } else if (bldg.group.visible) {
            bldg.group.visible = false;
          }
          if (bldg.interiorStairsGroup && bldg.interiorStairsGroup.visible) {
            bldg.interiorStairsGroup.visible = false;
          }
        }
        activeVisibleBuildings = titleVisible;
        for (const chunk of forestChunks) {
          const distChunk = Math.hypot(chunk.cx - droneCenterX, chunk.cz - droneCenterZ);
          const vis = !isExtraFast && distChunk <= 1650;
          if (chunk.group.visible !== vis) chunk.group.visible = vis;
        }
        for (const n of npcMeshes) {
          if (n.group.visible) n.group.visible = false;
        }
        return;
      }

      const castShadowsTarget = !isPerf && !isExtraFast;
      if (sunLight.castShadow !== castShadowsTarget) {
        sunLight.castShadow = castShadowsTarget;
      }
      cloudsGroup.visible = !isPerf && !isExtraFast;
      if (!npcCarsGroup.visible) npcCarsGroup.visible = true;
      if (!policeGroup.visible) policeGroup.visible = true;
      if (!playerContainer.visible && !stateRef.current.activeVehicle && !stateRef.current.isDrivingCar) {
        playerContainer.visible = true;
      }
      for (const n of npcMeshes) {
        if (!n.group.visible) n.group.visible = true;
      }

      const renderRadius = isExtraFast
        ? (isFlyingHigh ? 180 : 110)
        : isPerf
        ? (isFlyingHigh ? 300 : 180)
        : isFlyingHigh
        ? 540
        : 380;
      const stairsLodRadius = isExtraFast ? 25 : isPerf ? 60 : 150;

      const minGx = Math.floor((focusX - renderRadius) / BUILDING_CHUNK_SIZE);
      const maxGx = Math.floor((focusX + renderRadius) / BUILDING_CHUNK_SIZE);
      const minGz = Math.floor((focusZ - renderRadius) / BUILDING_CHUNK_SIZE);
      const maxGz = Math.floor((focusZ + renderRadius) / BUILDING_CHUNK_SIZE);

      const newVisible = new Set<DestructibleBuilding>();
      for (let gx = minGx; gx <= maxGx; gx++) {
        for (let gz = minGz; gz <= maxGz; gz++) {
          const list = buildingSpatialGrid.get(`${gx}_${gz}`);
          if (list) {
            for (let i = 0; i < list.length; i++) {
              const bldg = list[i];
              if (bldg.destroyed) {
                bldg.group.visible = false;
                continue;
              }
              const dist = Math.hypot(bldg.cx - focusX, bldg.cz - focusZ);
              if (dist <= renderRadius) {
                newVisible.add(bldg);
                if (!bldg.group.visible) bldg.group.visible = true;
                if (bldg.interiorStairsGroup) {
                  const stairsVis = dist <= stairsLodRadius;
                  if (bldg.interiorStairsGroup.visible !== stairsVis) {
                    bldg.interiorStairsGroup.visible = stairsVis;
                  }
                }
              }
            }
          }
        }
      }

      // Hide buildings that left render range
      activeVisibleBuildings.forEach((bldg) => {
        if (!newVisible.has(bldg)) {
          bldg.group.visible = false;
          if (bldg.interiorStairsGroup) bldg.interiorStairsGroup.visible = false;
        }
      });
      activeVisibleBuildings = newVisible;

      const treeCullPad = isExtraFast ? 35 : isPerf ? 80 : 220;
      for (const chunk of forestChunks) {
        const dist = Math.hypot(chunk.cx - focusX, chunk.cz - focusZ);
        const vis = !isExtraFast && (dist <= renderRadius + treeCullPad);
        if (chunk.group.visible !== vis) {
          chunk.group.visible = vis;
        }
      }
    };

    // Initialize Downtown visibility and camera framing immediately on load
    const initX = humanPosRef.current.x;
    const initZ = humanPosRef.current.z;
    playerContainer.position.set(initX, 0, initZ);
    updateDayNightCycle(0, initX, initZ, Boolean(stateRef.current.performanceMode));
    updateActiveAreaVisibility(initX, initZ, false);
    lastCullX = initX;
    lastCullZ = initZ;
    let titleDroneAngle = 0.48;
    let lastTitleFrameMs = (typeof performance === 'undefined' ? Date : performance).now();
    let titleSmoothDt = 1 / 60;
    let wasInTitleScreen = Boolean(stateRef.current.isTitleScreen);
    if (wasInTitleScreen) {
      const droneFocusX = 115;
      const droneFocusY = 24;
      const droneFocusZ = -10;
      const droneRadius = 320;
      const droneY = 190;
      camera.position.set(
        droneFocusX + Math.cos(titleDroneAngle) * droneRadius,
        droneY,
        droneFocusZ + Math.sin(titleDroneAngle) * droneRadius
      );
      camera.lookAt(droneFocusX, droneFocusY, droneFocusZ);
    } else {
      const initPitch = cameraPitchRef.current;
      const initDist = cameraDistRef.current;
      camera.position.set(
        initX,
        1.5 + Math.sin(initPitch) * initDist,
        initZ - Math.cos(initPitch) * initDist
      );
      camera.lookAt(initX, 1.5, initZ);
    }

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const cur = stateRef.current;

      // COMPLETELY PAUSE GAME & STOP TIME WHEN MENU OR TITLE SCREEN IS OPEN!
      if (cur.isMenuOpen) {
        keys.clear();
        isHoldingLeftClick = false;
        isHoldingRightClick = false;
        chainsawHolding = false;
        const nowMs = (typeof performance === 'undefined' ? Date : performance).now();
        // Keep clock.oldTime synced to current time without advancing clock.elapsedTime so time is 100% frozen!
        clock.oldTime = nowMs;

        if (cur.isTitleScreen) {
          if (!wasInTitleScreen) {
            wasInTitleScreen = true;
            lastTitleFrameMs = nowMs;
            updateActiveAreaVisibility(humanPosRef.current.x, humanPosRef.current.z, true);
          }
          if (scene.fog) {
            (scene.fog as THREE.FogExp2).density = 0.00088;
          }
          const rawTitleDt = Math.min(0.05, Math.max(0.001, (nowMs - lastTitleFrameMs) / 1000));
          lastTitleFrameMs = nowMs;
          titleSmoothDt = titleSmoothDt * 0.88 + rawTitleDt * 0.12;
          titleDroneAngle += titleSmoothDt * 0.04;
          const droneFocusX = 115;
          const droneFocusY = 24;
          const droneFocusZ = -10;
          const droneRadius = 320;
          const droneY = 190 + Math.sin(titleDroneAngle * 0.8) * 6;
          camera.position.set(
            droneFocusX + Math.cos(titleDroneAngle) * droneRadius,
            droneY,
            droneFocusZ + Math.sin(titleDroneAngle) * droneRadius
          );
          camera.lookAt(droneFocusX, droneFocusY, droneFocusZ);
        } else if (wasInTitleScreen) {
          wasInTitleScreen = false;
          const px = humanPosRef.current.x;
          const pz = humanPosRef.current.z;
          updateActiveAreaVisibility(px, pz, false);
          const pitch = cameraPitchRef.current;
          const dist = cameraDistRef.current;
          camera.position.set(
            px,
            1.5 + Math.sin(pitch) * dist,
            pz - Math.cos(pitch) * dist
          );
          camera.lookAt(px, 1.5, pz);
        }

        renderer.render(scene, camera);
        return;
      }

      if (wasInTitleScreen) {
        wasInTitleScreen = false;
        lastCullX = -99999;
        updateActiveAreaVisibility(humanPosRef.current.x, humanPosRef.current.z, false);
      }

      const rawDt = Math.min(clock.getDelta(), 0.05);
      smoothDt = smoothDt * 0.82 + rawDt * 0.18;
      const dt = smoothDt;

      // Initialize PvP Battle Arena immediately before vehicle/camera updates so frame 1 positions are exact!
      if (cur.pvpConfig?.active && (cur.pvpStartNonce !== lastPvpNonce || !lastPvpActive)) {
        lastPvpNonce = cur.pvpStartNonce || 0;
        lastPvpActive = true;
        startPvpBattleArena();
      }

      // Initialize or Update Roblox Obby Platformer Mode Level!
      if (cur.platformerMode) {
        const targetLvl = Math.max(1, Math.min(TOTAL_PLATFORMER_LEVELS, cur.platformerLevel || 1));
        const targetNonce = cur.platformerNonce || 0;
        if (!lastPlatformerActive || targetLvl !== lastPlatformerLevel || targetNonce !== lastPlatformerNonce) {
          lastPlatformerActive = true;
          lastPlatformerLevel = targetLvl;
          lastPlatformerNonce = targetNonce;
          startPlatformerLevel(targetLvl);
        }
      } else if (lastPlatformerActive) {
        lastPlatformerActive = false;
        lastPlatformerLevel = 0;
        isFallingToCityInPlatformer = false;
        clearPlatformerLevel();
        setCityGroundVisibilityForPlatformer(true);
        npcCarsGroup.visible = true;
        policeGroup.visible = true;
        cloudsGroup.visible = !cur.performanceMode;
        for (const pk of parkedCars) {
          if (!pk.destroyed) pk.group.visible = true;
        }
        for (const ch of forestChunks) ch.group.visible = true;
        const returnSpot = savedCityPlayerPos || { ...lastKnownCityPos };
        savedCityPlayerPos = null;
        humanPosRef.current.set(returnSpot.x, returnSpot.y, returnSpot.z);
        humanVelYRef.current = 0;
        playerAirbornePeakY = returnSpot.y;
        playerContainer.position.set(returnSpot.x, returnSpot.y, returnSpot.z);
        playerContainer.visible = !cur.isFirstPerson;
        camera.position.set(returnSpot.x, returnSpot.y + 1.65, returnSpot.z - 3.5);
        camera.lookAt(returnSpot.x, returnSpot.y + 1.5, returnSpot.z + 5);
        lastCullX = -99999;
        lastCullZ = -99999;
        updateActiveAreaVisibility(returnSpot.x, returnSpot.z, false);
      }

      // Advance moving platforms & obstacles in Platformer Mode before player physics so moving-platform carry is exact!
      if (cur.platformerMode && activeObbyLevel) {
        const obbyT = clock.elapsedTime;
        if (Array.isArray(activeObbyLevel.platforms)) {
          for (const p of activeObbyLevel.platforms) {
            if (!p) continue;
            p.prevX = p.curX;
            p.prevY = p.curY;
            p.prevZ = p.curZ;
            if (p.moveType === 'horiz_x') {
              p.curX = p.baseX + Math.sin(obbyT * p.moveSpeed + p.movePhase) * p.moveAmp;
            } else if (p.moveType === 'horiz_z') {
              p.curZ = p.baseZ + Math.sin(obbyT * p.moveSpeed + p.movePhase) * p.moveAmp;
            } else if (p.moveType === 'vert_y') {
              p.curY = p.baseY + Math.sin(obbyT * p.moveSpeed + p.movePhase) * p.moveAmp;
            }
            if (p.moveType !== 'none' && p.mesh) {
              p.mesh.position.set(p.curX, p.curY - p.h * 0.5, p.curZ);
            }
          }
        }
        if (Array.isArray(activeObbyLevel.hazards)) {
          for (const h of activeObbyLevel.hazards) {
            if (!h) continue;
            if (h.moveAxis === 'x') {
              h.curX = h.baseX + Math.sin(obbyT * h.moveSpeed + h.movePhase) * h.moveAmp;
              if (h.mesh) h.mesh.position.x = h.curX;
            } else if (h.moveAxis === 'y') {
              h.curY = h.baseY + Math.sin(obbyT * h.moveSpeed + h.movePhase) * h.moveAmp;
              if (h.mesh) h.mesh.position.y = h.curY;
            } else if (h.moveAxis === 'z') {
              h.curZ = h.baseZ + Math.sin(obbyT * h.moveSpeed + h.movePhase) * h.moveAmp;
              if (h.mesh) h.mesh.position.z = h.curZ;
            }
            if (h.kind === 'laser_spinner') {
              h.spinnerAngle = (h.spinnerAngle || 0) + (h.spinnerSpeed || 1.8) * dt;
              if (h.laserBarMesh) {
                h.laserBarMesh.rotation.y = h.spinnerAngle;
              }
            }
          }
        }
        if (activeObbyLevel.portalRing) {
          activeObbyLevel.portalRing.rotation.z += 2.2 * dt;
        }
      }

      const curVehicle = cur.platformerMode ? null : (cur.activeVehicle ?? (cur.isDrivingCar ? 'car' : null));

      // Expire temporary exploded-vehicle damage bar timer
      if (explodingVehicleTimerRef.current > 0) {
        explodingVehicleTimerRef.current = Math.max(0, explodingVehicleTimerRef.current - dt);
        if (explodingVehicleTimerRef.current <= 0) {
          setExplodingVehicleType(null);
          if (!curVehicle && !isExplodingRef.current) {
            carHealthRef.current = 100;
            setCarHealth(100);
            heliHealthRef.current = 100;
            setHeliHealth(100);
            planeHealthRef.current = 100;
            setPlaneHealth(100);
          }
        }
      }

      // Invincible Mode keeps player at 100 HP at all times (disabled in Platformer Mode); otherwise slow continuous health regeneration
      if (cur.invincibleMode && !cur.platformerMode) {
        if (playerHealthRef.current < 100) {
          playerHealthRef.current = 100;
          lastDisplayedHp = 100;
          setPlayerHealth(100);
        }
      } else if (playerHealthRef.current > 0 && playerHealthRef.current < 100 && !isExplodingRef.current) {
        playerHealthRef.current = Math.min(100, playerHealthRef.current + (15 / 60) * dt);
        const roundedHp = Math.round(playerHealthRef.current);
        if (roundedHp !== lastDisplayedHp) {
          lastDisplayedHp = roundedHp;
          setPlayerHealth(playerHealthRef.current);
        }
      }

      // Determine active viewer world coordinates for Near-Player Area Rendering & Shadow Map following
      const focusX = isExplodingRef.current
        ? explosionFocusPosRef.current.x
        : curVehicle === 'car'
        ? carPhysicsRef.current.x
        : curVehicle === 'motorcycle'
        ? motorcyclePhysicsRef.current.x
        : curVehicle === 'helicopter'
        ? helicopterPhysicsRef.current.x
        : curVehicle === 'plane'
        ? planePhysicsRef.current.x
        : humanPosRef.current.x;
      const focusZ = isExplodingRef.current
        ? explosionFocusPosRef.current.z
        : curVehicle === 'car'
        ? carPhysicsRef.current.z
        : curVehicle === 'motorcycle'
        ? motorcyclePhysicsRef.current.z
        : curVehicle === 'helicopter'
        ? helicopterPhysicsRef.current.z
        : curVehicle === 'plane'
        ? planePhysicsRef.current.z
        : humanPosRef.current.z;
      latestFocusPosRef.current.x = focusX;
      latestFocusPosRef.current.z = focusZ;

      // Accumulate travel distance for Quests
      const travelDist = Math.hypot(focusX - lastTravelPos.x, focusZ - lastTravelPos.z);
      if (travelDist > 0.05 && travelDist < 60.0) {
        accumulatedTravelDist += travelDist;
        if (accumulatedTravelDist >= 20.0) {
          const batch = Math.floor(accumulatedTravelDist);
          accumulatedTravelDist -= batch;
          cur.onQuestProgress?.('drive_distance', batch);
        }
      }
      lastTravelPos.x = focusX;
      lastTravelPos.z = focusZ;
      const focusY = isExplodingRef.current
        ? explosionFocusPosRef.current.y
        : curVehicle === 'helicopter'
        ? helicopterPhysicsRef.current.y
        : curVehicle === 'plane'
        ? planePhysicsRef.current.y
        : humanPosRef.current.y;
      const isFlyingHigh =
        (curVehicle === 'helicopter' && helicopterPhysicsRef.current.y > 28) ||
        (curVehicle === 'plane' && planePhysicsRef.current.y > 28);

      if (!cur.platformerMode && !cur.pvpConfig?.active && Math.abs(focusX) < 1500 && focusY < 320) {
        lastKnownCityPos = {
          x: focusX,
          y: Math.max(0, focusY),
          z: focusZ,
        };
      }

      // Advance weather simulation, particle kinematics, and smooth cross-fade rotation
      weatherSys.update(dt, focusX, focusY, focusZ);

      // Time-throttled area visibility, 20-minute day/night cycle & shadow updates
      lastCullTimer += dt;
      if (lastCullTimer >= 0.16 || lastCullX === -99999) {
        lastCullTimer = 0;
        lastCullX = focusX;
        lastCullZ = focusZ;
        updateActiveAreaVisibility(focusX, focusZ, isFlyingHigh);
        updateDayNightCycle(clock.elapsedTime, focusX, focusZ, Boolean(cur.performanceMode), focusY);
        lastShadowX = focusX;
        lastShadowZ = focusZ;
        if (onWeatherStatusChangeRef.current) {
          onWeatherStatusChangeRef.current(weatherSys.getStatusInfo());
        }
      } else if (weatherSys.inTransition || weatherSys.lightningFlashIntensity > 0) {
        // Run continuous lighting update during active weather transitions or lightning flashes
        updateDayNightCycle(clock.elapsedTime, focusX, focusZ, Boolean(cur.performanceMode), focusY);
      }

      // Smooth Right-Click Aim Zoom
      const targetFov = isAimingRef.current && !curVehicle ? (cur.isFirstPerson ? 26 : 30) : 50;
      if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(1, dt * 12));
        camera.updateProjectionMatrix();
      }

      // =======================================================================
      // CAMERA ROTATION CONTROLS (I, J, K, L Keys & Smooth Camera Interpolation)
      // =======================================================================
      if (carHitCooldownRef.current > 0) {
        carHitCooldownRef.current = Math.max(0, carHitCooldownRef.current - dt);
      }

      if (prevVehicleModeRef.current !== curVehicle) {
        if (curVehicle && !prevVehicleModeRef.current) {
          // Entering a vehicle: set cameraYawRef to 0 so it represents relative offset from vehicle heading
          cameraYawRef.current = 0;
          smoothCamYawRef.current = 0;
          const initVehRot =
            curVehicle === 'car'
              ? carPhysicsRef.current.rotationY
              : curVehicle === 'motorcycle'
              ? motorcyclePhysicsRef.current.rotationY
              : curVehicle === 'helicopter'
              ? helicopterPhysicsRef.current.rotationY
              : curVehicle === 'plane'
              ? planePhysicsRef.current.rotationY
              : 0;
          smoothVehicleRotYRef.current = initVehRot;
          carCameraYawRef.current = initVehRot;
        } else if (!curVehicle && prevVehicleModeRef.current) {
          // Exiting a vehicle: ensure ALL vehicle meshes & cockpit canopies are restored to visible!
          let vehX = humanPosRef.current.x;
          let vehZ = humanPosRef.current.z;
          if (prevVehicleModeRef.current === 'car') {
            carPhysicsRef.current.steering = 0;
            vehX = carPhysicsRef.current.x;
            vehZ = carPhysicsRef.current.z;
            if (hasSpawnedCarRef.current && activeCarGroupRef.current && !isExplodingRef.current) {
              activeCarGroupRef.current.visible = true;
              activeCarGroupRef.current.position.set(vehX, 0, vehZ);
              activeCarGroupRef.current.rotation.set(0, carPhysicsRef.current.rotationY, 0);
            }
          } else if (prevVehicleModeRef.current === 'helicopter') {
            vehX = helicopterPhysicsRef.current.x;
            vehZ = helicopterPhysicsRef.current.z;
            if (hasSpawnedHeliRef.current && activeHeliGroupRef.current && !isExplodingRef.current) {
              activeHeliGroupRef.current.visible = true;
              activeHeliGroupRef.current.position.set(vehX, helicopterPhysicsRef.current.y, vehZ);
              const canopy = activeHeliGroupRef.current.getObjectByName('cockpitCanopy');
              if (canopy) canopy.visible = true;
            }
          } else if (prevVehicleModeRef.current === 'plane') {
            // Keep momentum so autonomous flight continues forward towards buildings and obstacles!
            vehX = planePhysicsRef.current.x;
            vehZ = planePhysicsRef.current.z;
            if (hasSpawnedPlaneRef.current && activePlaneGroupRef.current && !isExplodingRef.current) {
              activePlaneGroupRef.current.visible = true;
              activePlaneGroupRef.current.position.set(vehX, planePhysicsRef.current.y, vehZ);
              const canopy = activePlaneGroupRef.current.getObjectByName('cockpitCanopy');
              if (canopy) canopy.visible = true;
            }
          } else if (prevVehicleModeRef.current === 'motorcycle') {
             vehX = motorcyclePhysicsRef.current.x;
            vehZ = motorcyclePhysicsRef.current.z;
            if (hasSpawnedMotorcycleRef.current && activeMotorcycleGroupRef.current && !isExplodingRef.current) {
              activeMotorcycleGroupRef.current.visible = true;
              activeMotorcycleGroupRef.current.position.set(vehX, 0, vehZ);
            }
          }
          const dxVeh = vehX - humanPosRef.current.x;
          const dzVeh = vehZ - humanPosRef.current.z;
          if (Math.hypot(dxVeh, dzVeh) > 0.25) {
            const lookAtVehYaw = Math.atan2(dxVeh, dzVeh);
            cameraYawRef.current = lookAtVehYaw;
            smoothCamYawRef.current = lookAtVehYaw;
            humanRotRef.current = lookAtVehYaw;
          } else {
            const lastVehRot = smoothVehicleRotYRef.current;
            cameraYawRef.current = lastVehRot + cameraYawRef.current;
            smoothCamYawRef.current = cameraYawRef.current;
          }
        }
        prevVehicleModeRef.current = curVehicle;
      }

      if (!cur.isMenuOpen) {
        const camRotSpeed = 2.2;
        const camPitchSpeed = 1.5;
        if (keys.has('j')) {
          cameraYawRef.current += camRotSpeed * dt;
        }
        if (keys.has('l')) {
          cameraYawRef.current -= camRotSpeed * dt;
        }
        if (keys.has('i')) {
          cameraPitchRef.current = Math.max(-1.52, cameraPitchRef.current - camPitchSpeed * dt);
        }
        if (keys.has('k')) {
          cameraPitchRef.current = Math.min(1.52, cameraPitchRef.current + camPitchSpeed * dt);
        }
      }

      // Smooth frame-rate-independent interpolation for camera angles & active vehicle heading (eliminates all turning ticks!)
      const camLerp = 1 - Math.exp(-20.0 * dt);
      smoothCamYawRef.current = THREE.MathUtils.lerp(smoothCamYawRef.current, cameraYawRef.current, camLerp);
      smoothCamPitchRef.current = THREE.MathUtils.lerp(smoothCamPitchRef.current, cameraPitchRef.current, camLerp);

      // --- ANIMATE CHAINSAW-CUT FALLING TREES ---
      for (let i = fallingTrees.length - 1; i >= 0; i--) {
        const ft = fallingTrees[i];
        ft.vel += 2.65 * dt; // Gravity-driven angular acceleration as tree tips over
        ft.angle += ft.vel * dt;
        ft.group.rotation.set(0, 0, 0);
        ft.group.rotateOnWorldAxis(ft.axis, Math.min(Math.PI * 0.48, ft.angle));
        if (ft.angle >= Math.PI * 0.48) {
          ft.HoldTimer += dt;
          if (ft.HoldTimer === dt) {
            soundFX.playLowPolyExplosion();
            cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.28);
          }
          if (ft.HoldTimer > 1.8) {
            fallingTreesGroup.remove(ft.group);
            fallingTrees.splice(i, 1);
          }
        }
      }

      // --- UPDATE ALL EXPLOSION PARTICLES & FLASH LIGHT (Fireballs, Smoke, Shockwaves, Sparks & Debris!) ---
      if (explosionLight.intensity > 0) {
        explosionLight.intensity = Math.max(0, explosionLight.intensity - dt * 26);
      }
      for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        if (!p || !p.mesh) {
          explosionParticles.splice(i, 1);
          continue;
        }
        p.life += dt;
        const progress = p.life / p.maxLife;
        if (progress >= 1) {
          if (p.mesh) {
            explosionGroup.remove(p.mesh);
            p.mesh.geometry?.dispose();
            (p.mesh.material as THREE.Material)?.dispose();
          }
          explosionParticles.splice(i, 1);
          continue;
        }
        const grav = p.gravityMult !== undefined ? p.gravityMult : 1.0;
        p.vel.y -= 18.0 * grav * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        const floorBounceY = p.floorY !== undefined ? p.floorY : 0.12;
        if (!p.noGroundBounce && p.mesh.position.y < floorBounceY) {
          p.mesh.position.y = floorBounceY;
          p.vel.y = -p.vel.y * 0.35;
          p.vel.x *= 0.65;
          p.vel.z *= 0.65;
        }
        p.mesh.rotation.x += p.rotVel.x * dt;
        p.mesh.rotation.y += p.rotVel.y * dt;
        p.mesh.rotation.z += p.rotVel.z * dt;
        if (p.expandRate) {
          const s = p.initialScale * (1 + progress * p.expandRate) * Math.max(0.05, 1 - Math.pow(progress, 1.8));
          p.mesh.scale.setScalar(Math.max(0.01, s));
        } else {
          const s = Math.max(0.01, p.initialScale * (1 - progress));
          p.mesh.scale.setScalar(s);
        }
      }

      // --- REALISTIC PHYSICS-SIMULATED BUILDING COLLAPSE (Houses & Skyscrapers crumble completely with zero floating poles!) ---
      for (const bldg of destructibleBuildingsRef.current) {
        if (!bldg.collapsing) continue;
        const maxCollapseDepth = bldg.h + 3.5;
        if (-bldg.group.position.y < maxCollapseDepth) {
          bldg.collapseVelY = (bldg.collapseVelY || 1.8) + 14.5 * dt;
          bldg.collapseTiltVel = (bldg.collapseTiltVel || 0.15) + 0.28 * dt;
          bldg.collapseTiltAngle = Math.min(0.65, (bldg.collapseTiltAngle || 0) + bldg.collapseTiltVel * dt);

          bldg.group.position.y = Math.max(-maxCollapseDepth, bldg.group.position.y - bldg.collapseVelY * dt);
          bldg.group.rotation.x = (bldg.collapseDirX || 0.5) * bldg.collapseTiltAngle;
          bldg.group.rotation.z = (bldg.collapseDirZ || 0.5) * bldg.collapseTiltAngle;
          bldg.group.updateMatrixWorld(true);

          if (Math.random() < 0.45) {
            spawnDebrisBurst(
              bldg.cx + (Math.random() - 0.5) * bldg.w * 0.75,
              Math.max(0.8, Math.min(bldg.h, bldg.h + bldg.group.position.y * 0.85)),
              bldg.cz + (Math.random() - 0.5) * bldg.d * 0.75,
              18
            );
          }
        } else {
          bldg.collapsing = false;
          bldg.destroyed = true;
          bldg.group.visible = false;
          disableBuildingColliders(bldg.id, bldg);
        }
      }

      // --- ACTIVE VEHICLE CRASH / DEATH RESPAWN SEQUENCE (All houses & objects stay on screen!) ---
      if (isExplodingRef.current) {
        explosionTimerRef.current -= dt;

        const isAirCrash =
          (crashedVehicleTypeRef.current === 'plane' ||
           crashedVehicleTypeRef.current === 'helicopter') &&
          isDeathByExplosionRef.current;

        if (isAirCrash || isDeathByExplosionRef.current) {
          // BOTH THE PLANE/HELICOPTER AND PLAYER MUST DISAPPEAR COMPLETELY!
          playerContainer.visible = false;
          if (activePlaneGroupRef.current) {
            activePlaneGroupRef.current.visible = false;
            scene.remove(activePlaneGroupRef.current);
            activePlaneGroupRef.current = null;
            hasSpawnedPlaneRef.current = false;
          }
          if (activeHeliGroupRef.current) {
            activeHeliGroupRef.current.visible = false;
            scene.remove(activeHeliGroupRef.current);
            activeHeliGroupRef.current = null;
            hasSpawnedHeliRef.current = false;
          }

          // Camera smoothly frames the explosion fireball and smoke debris in the air or ground
          const focusPos = explosionFocusPosRef.current;
          const camTarget = new THREE.Vector3(focusPos.x, focusPos.y + 0.5, focusPos.z);
          const camDist = 14.0;
          const camPos = new THREE.Vector3(
            focusPos.x - Math.sin(smoothCamYawRef.current) * camDist,
            focusPos.y + 3.8,
            focusPos.z - Math.cos(smoothCamYawRef.current) * camDist
          );
          camera.up.set(0, 1, 0);
          camera.position.lerp(camPos, Math.min(1, dt * 7.0));
          camera.lookAt(camTarget);
        } else if (stateRef.current.platformerMode && isVoidFallRef.current) {
          playerContainer.visible = true;
          playerGrp.rotation.x = 0;
          humanPosRef.current.y -= 25.0 * dt; // Keep falling endlessly into the void
          playerContainer.position.copy(humanPosRef.current);

          const camTarget = new THREE.Vector3(humanPosRef.current.x, humanPosRef.current.y + 0.5, humanPosRef.current.z);
          const camPos = new THREE.Vector3(humanPosRef.current.x, humanPosRef.current.y + 3.2, humanPosRef.current.z - 4.8);
          camera.position.lerp(camPos, Math.min(1, dt * 10.0));
          camera.lookAt(camTarget);
        } else {
          // Ground death (fallen ragdoll body on ground)
          playerContainer.visible = true;
          playerGrp.rotation.x = -Math.PI / 2;
          const fallenY = humanPosRef.current.y;
          playerContainer.position.set(humanPosRef.current.x, fallenY, humanPosRef.current.z);

          const camTarget = new THREE.Vector3(humanPosRef.current.x, fallenY + 0.13, humanPosRef.current.z);
          const camPos = new THREE.Vector3(humanPosRef.current.x, fallenY + 2.28, humanPosRef.current.z - 3.5);
          camera.up.set(0, 1, 0);
          camera.position.lerp(camPos, Math.min(1, dt * 8.0));
          camera.lookAt(camTarget);
        }

        if (cameraShakeRef.current > 0) {
          cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 1.6);
          camera.position.x += (Math.random() - 0.5) * cameraShakeRef.current * 0.5;
          camera.position.y += (Math.random() - 0.5) * cameraShakeRef.current * 0.5;
        }

        if (explosionTimerRef.current > 0) {
          if (!stateRef.current.platformerMode) {
            // Ensure all houses, buildings, and objects around the crash site remain visible during the explosion
            updateActiveAreaVisibility(explosionFocusPosRef.current.x, explosionFocusPosRef.current.z, false);
          }
          updateSpeedIfChanged(0);
          renderer.render(scene, camera);
          return;
        }

        // Respawn timer finished: clear Death Screen & restore player!
        isExplodingRef.current = false;
        isDeathByExplosionRef.current = false;
        isVoidFallRef.current = false;
        crashedVehicleTypeRef.current = null;
        stateRef.current.onExitVehicle ? stateRef.current.onExitVehicle() : stateRef.current.onExitCar();
        stateRef.current.activeVehicle = null;
        prevVehicleModeRef.current = null;
        playerGrp.rotation.set(0, 0, 0);
        playerGrp.position.set(0, 0, 0);
        playerContainer.visible = true;
        console.log('DEBUG: Respawning player at', humanPosRef.current);
        setDeathScreenInfo(null);
        playerHealthRef.current = 100;
        setPlayerHealth(100);
        carHealthRef.current = 100;
        setCarHealth(100);
        respawnProtectionTimerRef.current = 4.0;
        destructibleBuildingsRef.current.forEach((bldg) => {
          if (bldg.collapsing) {
            bldg.neutralizedForPlayer = true;
          }
        });
        clearAllBombsAndProjectilesRef?.();

        while (explosionGroup.children.length > 0) {
          explosionGroup.remove(explosionGroup.children[0]);
        }
        explosionParticles.length = 0;
        explosionLight.intensity = 0;

        if (cur.platformerMode) {
          // Teleport back to the start of the platformer level the player died on!
          startPlatformerLevel(Math.max(1, Math.min(TOTAL_PLATFORMER_LEVELS, cur.platformerLevel || 1)), true);
          if (!cur.pvpConfig?.active) {
            bgmManager.restartCurrentModeAbruptly('platformer');
          }
          updateSpeedIfChanged(0);
          renderer.render(scene, camera);
          return;
        }

        const isDefaultSidewalkClaim = claimedHomeRef.current.name === 'Downtown Sidewalk';
        const safeHomeSpot = findSafePlayerSpot(
          claimedHomeRef.current.x,
          claimedHomeRef.current.z,
          !isDefaultSidewalkClaim
        );
        const hx = safeHomeSpot.x;
        const hz = safeHomeSpot.z;
        clearWantedStarsAndPolice();

        humanPosRef.current.set(hx, 0, hz);
        humanVelYRef.current = 0;
        playerAirbornePeakY = 0;
        playerContainer.position.set(hx, 0, hz);
        playerGrp.position.set(0, 0, 0);
        playerContainer.rotation.set(0, 0, 0);
        playerContainer.visible = !cur.isFirstPerson;
        cameraYawRef.current = 0.0;
        respawnProtectionTimerRef.current = 4.0;

        addSpatialMoneyPop(-10000, 'Died', { x: hx, y: 1.8, z: hz });
        if (!cur.pvpConfig?.active) {
          bgmManager.restartCurrentModeAbruptly('city');
        }



        lastCullX = hx;
        lastCullZ = hz;
        lastCullTimer = 0;
        updateActiveAreaVisibility(hx, hz, false);
        lastShadowX = hx;
        lastShadowZ = hz;
        sunLight.position.set(hx + 45, 80, hz + 40);
        sunLight.target.position.set(hx, 0, hz);
        sunLight.target.updateMatrixWorld();

        // Do NOT spawn vehicles at the house when you die — vehicles only spawn manually when requested!
        hasSpawnedCarRef.current = false;
        if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
        hasSpawnedMotorcycleRef.current = false;
        if (activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = false;
        hasSpawnedHeliRef.current = false;
        if (activeHeliGroupRef.current) {
          activeHeliGroupRef.current.visible = false;
          scene.remove(activeHeliGroupRef.current);
          activeHeliGroupRef.current = null;
        }
        hasSpawnedPlaneRef.current = false;
        if (activePlaneGroupRef.current) {
          activePlaneGroupRef.current.visible = false;
          scene.remove(activePlaneGroupRef.current);
          activePlaneGroupRef.current = null;
        }
        hasSpawnedExcavatorRef.current = false;
        if (activeExcavatorGroupRef.current) {
          activeExcavatorGroupRef.current.visible = false;
          scene.remove(activeExcavatorGroupRef.current);
          activeExcavatorGroupRef.current = null;
        }

        // In zombie mode, if you die, reset zombie and car positions back to spawn
        if (cur.zombieMode) {
          resetNpcsAndTrafficToSpawn();
        }

        soundFX.playCarEngineStart();
        updateSpeedIfChanged(0);
      }

      // =======================================================================
      // 0. AUTONOMOUS AIRBORNE HELICOPTER HOVER & ROTOR SPINNING WHEN PLAYER IS OUTSIDE
      //    When exiting a helicopter in mid-air, the blades keep spinning continuously at flight RPM!
      // =======================================================================
      if (
        curVehicle !== 'helicopter' &&
        hasSpawnedHeliRef.current &&
        activeHeliGroupRef.current &&
        activeHeliGroupRef.current.visible
      ) {
        const heliPhys = helicopterPhysicsRef.current;
        const isAirborne = heliPhys.y > 0.35 || activeHeliGroupRef.current.position.y > 0.35;
        if (isAirborne) {
          // Keep rotor blades spinning continuously even when outside the helicopter!
          if (mainRotorRef.current) mainRotorRef.current.rotation.y += 48.0 * dt;
          if (tailRotorRef.current) tailRotorRef.current.rotation.x += 56.0 * dt;

          if (heliBeaconLightRef.current) {
            heliBeaconLightRef.current.intensity = Math.sin(clock.getElapsedTime() * 7) > 0.4 ? 0.35 : 0;
          }

          // Gentle aerodynamic micro-hover bobbing so the helicopter feels realistic and alive suspended in mid-air
          const hoverY = heliPhys.y + Math.sin(clock.getElapsedTime() * 2.2) * 0.04;
          activeHeliGroupRef.current.position.set(heliPhys.x, hoverY, heliPhys.z);
        }
      }

      // =======================================================================
      // 0B. AUTONOMOUS CAR MOMENTUM WHEN PLAYER EXITS
      //     Car keeps traveling forward in its direction with rolling friction deceleration & wheel rotation
      // =======================================================================
      if (
        curVehicle !== 'car' &&
        hasSpawnedCarRef.current &&
        activeCarGroupRef.current &&
        activeCarGroupRef.current.visible &&
        Math.abs(carPhysicsRef.current.speed) > 0.05
      ) {
        const cPhys = carPhysicsRef.current;
        const carSpdWorld = cPhys.speed * 0.447; // MPH to m/s
        const fwdX = Math.sin(cPhys.rotationY);
        const fwdZ = Math.cos(cPhys.rotationY);
        const candX = cPhys.x + fwdX * carSpdWorld * dt;
        const candZ = cPhys.z + fwdZ * carSpdWorld * dt;

        // Check building/wall collision while coasting
        const hitCol = findVehicleBuildingOrWallCollider(candX, candZ, 1.2);
        if (hitCol) {
          cPhys.speed = -cPhys.speed * 0.25;
          if (Math.abs(cPhys.speed) < 2) cPhys.speed = 0;
        } else {
          cPhys.x = candX;
          cPhys.z = candZ;
        }

        activeCarGroupRef.current.position.set(cPhys.x, 0, cPhys.z);
        activeCarGroupRef.current.rotation.set(0, cPhys.rotationY, 0);

        // Spin wheels while coasting
        if (carWheelsRef.current && carWheelsRef.current.length > 0) {
          const wheelRoll = (carSpdWorld / 0.35) * dt;
          carWheelsRef.current.forEach((w) => {
            w.rotation.x = (w.rotation.x + wheelRoll) % (Math.PI * 2);
          });
        }

        // Realistic rolling friction deceleration
        const rollingFriction = 9.5 * dt;
        if (cPhys.speed > 0) {
          cPhys.speed = Math.max(0, cPhys.speed - rollingFriction);
        } else {
          cPhys.speed = Math.min(0, cPhys.speed + rollingFriction);
        }
      }
      // =======================================================================
      // 0D. AUTONOMOUS MOTORCYCLE MOMENTUM WHEN PLAYER EXITS
      //     Motorcycle keeps traveling forward in its direction with rolling friction deceleration & wheel rotation
      // =======================================================================
      if (
        curVehicle !== 'motorcycle' &&
        hasSpawnedMotorcycleRef.current &&
        activeMotorcycleGroupRef.current &&
        activeMotorcycleGroupRef.current.visible &&
        Math.abs(motorcyclePhysicsRef.current.speed) > 0.05
      ) {
        const mPhys = motorcyclePhysicsRef.current;
        const motoSpdWorld = mPhys.speed * 0.447; // MPH to m/s
        const fwdX = Math.sin(mPhys.rotationY);
        const fwdZ = Math.cos(mPhys.rotationY);
        const candX = mPhys.x + fwdX * motoSpdWorld * dt;
        const candZ = mPhys.z + fwdZ * motoSpdWorld * dt;

        // Check building/wall collision while coasting
        const hitCol = findVehicleBuildingOrWallCollider(candX, candZ, 0.85);
        if (hitCol) {
          mPhys.speed = -mPhys.speed * 0.3;
          if (Math.abs(mPhys.speed) < 2.5) mPhys.speed = 0;
        } else {
          mPhys.x = candX;
          mPhys.z = candZ;
        }

        activeMotorcycleGroupRef.current.position.set(mPhys.x, 0, mPhys.z);
        activeMotorcycleGroupRef.current.rotation.set(0, mPhys.rotationY, 0);

        // Spin wheels while coasting
        if (motorcycleWheelsRef.current && motorcycleWheelsRef.current.length > 0) {
          const wheelRoll = (motoSpdWorld / 0.31) * dt;
          motorcycleWheelsRef.current.forEach((w) => {
            w.rotation.order = 'YXZ';
            w.rotation.x = (w.rotation.x + wheelRoll) % (Math.PI * 2);
          });
        }

        // Realistic rolling friction deceleration
        const rollingFriction = 12.0 * dt;
        if (mPhys.speed > 0) {
          mPhys.speed = Math.max(0, mPhys.speed - rollingFriction);
        } else {
          mPhys.speed = Math.min(0, mPhys.speed + rollingFriction);
        }
      }

      // =======================================================================
      // 0C. AUTONOMOUS PLANE MOMENTUM WHEN PLAYER EXITS
      //     Plane keeps flying forward in its direction with realistic aerodynamic glide & propeller spin,
      //     RETAINING full collision detection with buildings, skyscrapers & ground to cause massive explosions!
      // =======================================================================
      if (
        curVehicle !== 'plane' &&
        hasSpawnedPlaneRef.current &&
        activePlaneGroupRef.current &&
        activePlaneGroupRef.current.visible &&
        Math.abs(planePhysicsRef.current.speed) > 0.1
      ) {
        const pPhys = planePhysicsRef.current;
        const q = planeQuatRef.current;
        const fwdDir = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
        const worldSpd =
          pPhys.speed <= 600 ? pPhys.speed * 0.447 : 268.2 + (pPhys.speed - 600) * 0.16;
        const moveVel = fwdDir.clone().multiplyScalar(worldSpd);

        const isAirborne = pPhys.y > 0.35;
        const prevX = pPhys.x;
        const prevY = pPhys.y;
        const prevZ = pPhys.z;

        let nextPX = prevX + moveVel.x * dt;
        let nextPZ = prevZ + moveVel.z * dt;
        let nextPY = prevY;

        if (isAirborne) {
          // Mid-air: keep flying along heading with gentle aerodynamic glide
          pPhys.speed = Math.max(0, pPhys.speed * Math.exp(-0.012 * dt));
          const glideSink = pPhys.speed > 25 ? 0 : -3.5;
          nextPY = Math.max(0.15, prevY + (moveVel.y + glideSink) * dt);

          if (planePropellerRef.current) {
            planePropellerRef.current.rotation.z += Math.max(16.0, (pPhys.speed / 20.0) * 45.0) * dt;
          }
        } else {
          // On ground/runway: roll along heading with rolling friction
          nextPY = 0.15;
          pPhys.speed = Math.max(0, pPhys.speed - 12.0 * dt);

          if (planePropellerRef.current && pPhys.speed > 0.5) {
            planePropellerRef.current.rotation.z += (pPhys.speed / 10.0) * 20.0 * dt;
          }
        }

        // --- CONTINUOUS SWEPT-SEGMENT COLLISION WITH BUILDINGS, SKYSCRAPERS & GROUND ---
        const wingSpanMargin = 5.2;
        const segMinX = Math.min(prevX, nextPX) - wingSpanMargin;
        const segMaxX = Math.max(prevX, nextPX) + wingSpanMargin;
        const segMinZ = Math.min(prevZ, nextPZ) - wingSpanMargin;
        const segMaxZ = Math.max(prevZ, nextPZ) + wingSpanMargin;
        const segMinY = Math.min(prevY, nextPY);
        const segMaxY = Math.max(prevY, nextPY) + 2.8;

        // 1. Check all city destructible buildings (houses, apartments, commercial, industrial, towers)
        let hitDestructibleBldg: DestructibleBuilding | undefined = undefined;
        if (!cur.pvpConfig?.active) {
          for (const b of destructibleBuildingsRef.current) {
            if (b.destroyed || b.collapsing) continue;
            const bMinX = b.cx - b.w * 0.5;
            const bMaxX = b.cx + b.w * 0.5;
            const bMinZ = b.cz - b.d * 0.5;
            const bMaxZ = b.cz + b.d * 0.5;
            const bHeight = b.h ?? 20.0;
            if (
              segMaxX >= bMinX &&
              segMinX <= bMaxX &&
              segMaxZ >= bMinZ &&
              segMinZ <= bMaxZ &&
              segMinY <= bHeight + 2.0 &&
              segMaxY >= -1.0
            ) {
              hitDestructibleBldg = b;
              break;
            }
          }
        }

        // 2. Check all skyscrapers in the city
        let hitSkyscraper: WalkableSkyscraperData | undefined = undefined;
        if (!hitDestructibleBldg && !cur.pvpConfig?.active) {
          for (const s of skyscrapersRef.current) {
            if (s.destroyed) continue;
            if (
              segMaxX >= s.minX &&
              segMinX <= s.maxX &&
              segMaxZ >= s.minZ &&
              segMinZ <= s.maxZ &&
              segMinY <= s.roofY + 2.0
            ) {
              hitSkyscraper = s;
              break;
            }
          }
        }

        // 3. Check all registered building/house/wall colliders
        let hitBldgCollider: BoxCollider | undefined = undefined;
        if (!hitDestructibleBldg && !hitSkyscraper && !cur.pvpConfig?.active) {
          for (const col of collidersRef.current) {
            if (col.destroyed) continue;
            const topLimit = col.maxY ?? 36.0;
            if (
              segMaxX >= col.minX &&
              segMinX <= col.maxX &&
              segMaxZ >= col.minZ &&
              segMinZ <= col.maxZ &&
              segMinY <= topLimit + 1.2 &&
              segMaxY >= (col.minY ?? 0) - 1.0
            ) {
              hitBldgCollider = col;
              break;
            }
          }
        }

        // 4. Ground / runway crash (any impact with terrain while moving fast or sinking)
        const isGroundCrash = nextPY <= 0.38 && (isAirborne || Math.abs(pPhys.speed) > 1.5 || moveVel.y < -1.5);

        // 5. Car collision check (traffic cars, parked cars, police cruisers)
        let hitAutoCar: { x: number; z: number; onHit: () => void } | null = null;
        if (!cur.pvpConfig?.active && nextPY <= 2.6) {
          for (const tc of npcTrafficCars) {
            if (!tc.destroyed && Math.hypot(nextPX - tc.x, nextPZ - tc.z) < 3.2) {
              hitAutoCar = {
                x: tc.x,
                z: tc.z,
                onHit: () => {
                  tc.destroyed = true;
                  tc.respawnTimer = 16.0;
                  tc.group.visible = false;
                  spawnDebrisBurst(tc.x, 1.0, tc.z, 48);
                  reportPlayerCrime(1);
                },
              };
              break;
            }
          }
          if (!hitAutoCar) {
            for (const pk of parkedCars) {
              if (!pk.destroyed && Math.hypot(nextPX - pk.x, nextPZ - pk.z) < 3.2) {
                hitAutoCar = {
                  x: pk.x,
                  z: pk.z,
                  onHit: () => {
                    pk.destroyed = true;
                    pk.group.visible = false;
                    spawnDebrisBurst(pk.x, 1.0, pk.z, 48);
                  },
                };
                break;
              }
            }
          }
          if (!hitAutoCar) {
            for (const pc of policeCruisers) {
              if (!pc.destroyed && Math.hypot(nextPX - pc.x, nextPZ - pc.z) < 3.2) {
                hitAutoCar = {
                  x: pc.x,
                  z: pc.z,
                  onHit: () => {
                    damagePoliceCruiser(pc, 999, 'Airplane Collision');
                  },
                };
                break;
              }
            }
          }
        }

        if (hitDestructibleBldg || hitSkyscraper || hitBldgCollider || isGroundCrash || hitAutoCar) {
          if (hitAutoCar) {
            hitAutoCar.onHit();
          }
          const impactX = (prevX + nextPX) * 0.5;
          const impactY = Math.max(0.5, (prevY + nextPY) * 0.5);
          const impactZ = (prevZ + nextPZ) * 0.5;

          // Collapse destructible building if hit
          const directBldg =
            hitDestructibleBldg ||
            (hitSkyscraper?.id
              ? destructibleBuildingsRef.current.find((b) => b.id === hitSkyscraper!.id)
              : undefined) ||
            (hitBldgCollider?.buildingId
              ? destructibleBuildingsRef.current.find((b) => b.id === hitBldgCollider!.buildingId)
              : undefined);

          if (directBldg && !directBldg.collapsing) {
            directBldg.damage = 9999;
            directBldg.collapsing = true;
            directBldg.collapseVelY = 8.5;
            directBldg.collapseTiltAngle = 0;
            directBldg.group.position.y = Math.min(0, directBldg.group.position.y);
            directBldg.group.rotation.set(0, 0, 0);
            disableBuildingColliders(directBldg.id, directBldg);
          }

          // Trigger massive bomb explosion & structural damage
          damageBuildingStructurally(impactX, impactY, impactZ, 60.0, 999);
          triggerBombExplosion(impactX, impactY, impactZ, 38.0);
          soundFX.playExplosion();
          spawnDebrisBurst(impactX, impactY, impactZ, 60);

          // Stop momentum & hide crashed plane
          pPhys.speed = 0;
          if (activePlaneGroupRef.current) {
            activePlaneGroupRef.current.visible = false;
          }
          hasSpawnedPlaneRef.current = false;
        } else {
          pPhys.x = nextPX;
          pPhys.y = nextPY;
          pPhys.z = nextPZ;

          if (pPhys.y <= 0.18) {
            pPhys.y = 0.15;
          }

          activePlaneGroupRef.current.position.set(pPhys.x, pPhys.y, pPhys.z);
          activePlaneGroupRef.current.quaternion.copy(q);
        }
      }

      // =======================================================================
      // 0D. AUTONOMOUS HELICOPTER MOMENTUM WHEN PLAYER EXITS
      //     Helicopter keeps moving in its direction/tilt with realistic inertia,
      //     retaining full collision detection with buildings and ground!
      // =======================================================================
      if (
        curVehicle !== 'helicopter' &&
        hasSpawnedHeliRef.current &&
        activeHeliGroupRef.current &&
        activeHeliGroupRef.current.visible &&
        (Math.abs(helicopterPhysicsRef.current.speed) > 0.1 || helicopterPhysicsRef.current.y > 0.3)
      ) {
        const heliPhys = helicopterPhysicsRef.current;
        const prevHX = heliPhys.x;
        const prevHY = heliPhys.y;
        const prevHZ = heliPhys.z;

        const worldHeliSpd = heliPhys.speed * 0.447;
        const nextHX = prevHX + Math.sin(heliPhys.rotationY) * worldHeliSpd * dt;
        const nextHZ = prevHZ + Math.cos(heliPhys.rotationY) * worldHeliSpd * dt;
        const nextHY = Math.max(0.18, prevHY + heliPhys.verticalSpeed * dt);

        heliPhys.speed = Math.max(0, heliPhys.speed * Math.exp(-0.018 * dt));
        heliPhys.verticalSpeed -= 9.8 * dt;

        const hitHeliBldg = getNearbyColliders(nextHX, nextHZ).find(
          (col) =>
            !col.destroyed &&
            col.isBuilding &&
            nextHY < (col.maxY ?? 18.0) - 0.5 &&
            nextHX + 2.2 > col.minX &&
            nextHX - 2.2 < col.maxX &&
            nextHZ + 2.2 > col.minZ &&
            nextHZ - 2.2 < col.maxZ
        );

        if (nextHY <= 0.19 || hitHeliBldg) {
          triggerBombExplosion(nextHX, nextHY, nextHZ, 22.0);
          soundFX.playExplosion();
          spawnDebrisBurst(nextHX, Math.max(0.5, nextHY), nextHZ, 50);
          heliPhys.speed = 0;
          heliPhys.verticalSpeed = 0;
          if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = false;
          hasSpawnedHeliRef.current = false;
        } else {
          heliPhys.x = nextHX;
          heliPhys.y = nextHY;
          heliPhys.z = nextHZ;
          activeHeliGroupRef.current.position.set(nextHX, nextHY, nextHZ);
        }
      }

      // =======================================================================
      // 1A. DRIVEABLE HELICOPTER SIMULATION (E Ascend, Q Descend, Slower Fast-Heli Accel, Progressive Forward Tilt)
      // =======================================================================
      if (curVehicle === 'helicopter') {
        playerContainer.visible = false;
        const heliPhys = helicopterPhysicsRef.current;
        const hSpec =
          HELICOPTERS_CATALOG.find((h) => h.id === cur.activeHeliId) || HELICOPTERS_CATALOG[0];

        const maxVertSpd = hSpec.climbRate;
        const maxFwdSpd = hSpec.maxSpeed;
        const yawRate = 0.52;
        const isHeliCountdownFrozen = Boolean(
          cur.pvpConfig?.active && cur.battleCountdown !== null && cur.battleCountdown !== undefined && cur.battleCountdown > 0
        );

        // Check surface height (ground or skyscraper roof)
        let surfaceY = 0.18;
        if (!cur.pvpConfig?.active) {
          for (const s of skyscrapersRef.current) {
            if (
              !s.destroyed &&
              heliPhys.x >= s.minX &&
              heliPhys.x <= s.maxX &&
              heliPhys.z >= s.minZ &&
              heliPhys.z <= s.maxZ &&
              heliPhys.y >= s.roofY - 2.5
            ) {
              surfaceY = Math.max(surfaceY, s.roofY + 0.18);
            }
          }
          for (const b of destructibleBuildingsRef.current) {
            if (
              !b.destroyed &&
              !b.collapsing &&
              Math.abs(heliPhys.x - b.cx) <= b.w * 0.5 + 0.8 &&
              Math.abs(heliPhys.z - b.cz) <= b.d * 0.5 + 0.8 &&
              heliPhys.y >= b.h - 2.5
            ) {
              surfaceY = Math.max(surfaceY, b.h + 0.18);
            }
          }
        }

        // E = Ascend, Q = Descend! Smooth gradual collective lift (not jolty or too fast)
        const effectiveMaxVertSpd = Math.min(13.5, maxVertSpd * 0.42);
        let targetHeliVertSpd = 0;
        if (!isHeliCountdownFrozen && (keys.has('e') || keys.has(' '))) {
          targetHeliVertSpd = effectiveMaxVertSpd;
        } else if (!isHeliCountdownFrozen && keys.has('q')) {
          targetHeliVertSpd = -effectiveMaxVertSpd * 0.85;
        }
        const heliVertSmoothRate = targetHeliVertSpd !== 0 ? 2.4 : 3.2;
        heliPhys.verticalSpeed = THREE.MathUtils.lerp(
          heliPhys.verticalSpeed,
          targetHeliVertSpd,
          1 - Math.exp(-heliVertSmoothRate * dt)
        );
        if (Math.abs(heliPhys.verticalSpeed) < 0.02 && targetHeliVertSpd === 0) {
          heliPhys.verticalSpeed = 0;
        }

        // Progressive acceleration that slows down as speed increases toward maxFwdSpd
        const heliSpdRatio = Math.min(1.0, Math.abs(heliPhys.speed) / Math.max(1, maxFwdSpd));
        const heliSpeedTaper = Math.max(0.15, Math.pow(1.0 - heliSpdRatio, 0.85));
        const baseHeliAccel = 24.0 + Math.pow(maxFwdSpd, 0.56) * 2.6;
        const heliAccel = baseHeliAccel * heliSpeedTaper;
        if (!isHeliCountdownFrozen && (keys.has('w') || keys.has('arrowup'))) {
          heliPhys.speed = Math.min(maxFwdSpd, heliPhys.speed + heliAccel * dt);
        } else if (!isHeliCountdownFrozen && (keys.has('s') || keys.has('arrowdown'))) {
          heliPhys.speed = Math.max(-maxFwdSpd * 0.35, heliPhys.speed - baseHeliAccel * 0.75 * dt);
        } else {
          heliPhys.speed *= Math.pow(0.45, dt);
          if (Math.abs(heliPhys.speed) < 0.08) heliPhys.speed = 0;
        }

        // Forward pitch tilt increases the faster the helicopter goes! Super-fast helicopters tilt much further forward at high speed.
        const absHeliSpd = Math.abs(heliPhys.speed);
        const speedPitchMag = Math.min(0.68, (absHeliSpd / Math.max(85, maxFwdSpd)) * (0.28 + Math.min(0.38, maxFwdSpd / 650)));
        const targetPitch =
          heliPhys.speed > 0.5
            ? speedPitchMag + (!isHeliCountdownFrozen && (keys.has('w') || keys.has('arrowup')) ? 0.06 : 0)
            : heliPhys.speed < -0.5
            ? -speedPitchMag * 0.65
            : 0;
        heliPhys.tiltPitch = THREE.MathUtils.lerp(heliPhys.tiltPitch, targetPitch, 4.2 * dt);

        // Smooth horizontal turning on A/D with a slight, noticeable bank/tilt in the direction the helicopter is turning!
        const heliTurnLeft = !isHeliCountdownFrozen && (keys.has('a') || keys.has('arrowleft'));
        const heliTurnRight = !isHeliCountdownFrozen && (keys.has('d') || keys.has('arrowright'));
        const targetHeliYawVel = heliTurnLeft && !heliTurnRight ? yawRate : heliTurnRight && !heliTurnLeft ? -yawRate : 0;
        heliYawVelRef.current = THREE.MathUtils.lerp(heliYawVelRef.current, targetHeliYawVel, Math.min(1, dt * 6.5));
        heliPhys.rotationY += heliYawVelRef.current * dt;
        const isHeliAirborne = heliPhys.y > surfaceY + 0.08;
        const targetHeliRoll = isHeliAirborne ? -(heliYawVelRef.current / yawRate) * 0.22 : 0;
        heliPhys.tiltRoll = THREE.MathUtils.lerp(heliPhys.tiltRoll, targetHeliRoll, Math.min(1, dt * 6.0));

        heliPhys.y = Math.max(surfaceY, Math.min(620.0, heliPhys.y + heliPhys.verticalSpeed * 0.55 * dt));
        if (heliPhys.y <= surfaceY + 0.02) {
          if (heliPhys.verticalSpeed < -6.0) {
            const slamSpd = Math.abs(heliPhys.verticalSpeed) * 3.5;
            const dmg = (slamSpd / 150.0) * 100.0;
            const nextHeliHp = Math.max(0, heliHealthRef.current - dmg);
            heliHealthRef.current = nextHeliHp;
            setHeliHealth(nextHeliHp);
            soundFX.playPlaceObject();
            cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.5, slamSpd * 0.005));
            if (nextHeliHp <= 0) {
              setExplodingVehicleType('helicopter');
              triggerHouseExplosion(
                heliPhys.x,
                heliPhys.z,
                heliPhys.y,
                'HARD LANDING CRASH',
                'Your helicopter slammed into the ground and was destroyed.'
              );
              renderer.render(scene, camera);
              return;
            }
          }
          heliPhys.y = surfaceY;
          if (heliPhys.verticalSpeed < 0) heliPhys.verticalSpeed = 0;
        }

        const worldHeliMoveSpd = heliPhys.speed * 0.447;
        const nextHX = heliPhys.x + Math.sin(heliPhys.rotationY) * worldHeliMoveSpd * dt;
        const nextHZ = heliPhys.z + Math.cos(heliPhys.rotationY) * worldHeliMoveSpd * dt;

        // Check solid building & skyscraper glass crash at ANY building height up to col.maxY!
        const hitBldg = getNearbyColliders(nextHX, nextHZ).find(
          (col) =>
            !col.destroyed &&
            col.isBuilding &&
            heliPhys.y < (col.maxY ?? 18.0) - 0.5 &&
            nextHX + 2.2 > col.minX &&
            nextHX - 2.2 < col.maxX &&
            nextHZ + 2.2 > col.minZ &&
            nextHZ - 2.2 < col.maxZ
        );
        if (hitBldg) {
          const impactSpd = Math.hypot(heliPhys.speed, heliPhys.verticalSpeed * 2.5);
          if (impactSpd >= 150.0) {
            heliHealthRef.current = 0;
            setHeliHealth(0);
            setExplodingVehicleType('helicopter');
            triggerBombExplosion(nextHX, heliPhys.y, nextHZ, 22.0);
            triggerHouseExplosion(
              heliPhys.x,
              heliPhys.z,
              heliPhys.y,
              'HIGH-SPEED HELICOPTER COLLISION',
              `Impact speed of ${Math.round(impactSpd)} MPH totaled your helicopter.`
            );
            renderer.render(scene, camera);
            return;
          } else if (impactSpd > 5.0) {
            const dmg = (impactSpd / 150.0) * 100.0;
            const nextHeliHp = Math.max(0, heliHealthRef.current - dmg);
            heliHealthRef.current = nextHeliHp;
            setHeliHealth(nextHeliHp);
            soundFX.playPlaceObject();
            cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.65, impactSpd * 0.005));
            if (nextHeliHp <= 0) {
              setExplodingVehicleType('helicopter');
              triggerHouseExplosion(
                heliPhys.x,
                heliPhys.z,
                heliPhys.y,
                'HELICOPTER TOTALED',
                'Accumulated collision damage destroyed your helicopter.'
              );
              renderer.render(scene, camera);
              return;
            }
          }
          heliPhys.speed = -heliPhys.speed * 0.35;
        } else {
          const minBoundX = cur.pvpConfig?.active ? PVP_ARENA_X - 1100 : -MAP_BOUND;
          const maxBoundX = cur.pvpConfig?.active ? PVP_ARENA_X + 1100 : MAP_BOUND;
          const minBoundZ = cur.pvpConfig?.active ? PVP_ARENA_Z - 1100 : -MAP_BOUND;
          const maxBoundZ = cur.pvpConfig?.active ? PVP_ARENA_Z + 1100 : MAP_BOUND;
          if (nextHX < minBoundX || nextHX > maxBoundX || nextHZ < minBoundZ || nextHZ > maxBoundZ) {
            heliPhys.speed = 0;
          }
          heliPhys.x = Math.max(minBoundX, Math.min(maxBoundX, nextHX));
          heliPhys.z = Math.max(minBoundZ, Math.min(maxBoundZ, nextHZ));
          humanPosRef.current.set(heliPhys.x, heliPhys.y, heliPhys.z);
        }

        let heliRotDiff = heliPhys.rotationY - smoothVehicleRotYRef.current;
        while (heliRotDiff < -Math.PI) heliRotDiff += Math.PI * 2;
        while (heliRotDiff > Math.PI) heliRotDiff -= Math.PI * 2;
        smoothVehicleRotYRef.current += heliRotDiff * (1 - Math.exp(-16.0 * dt));

        // Explicit Quaternion multiplication: World Yaw (Y) * Local Pitch (X) * Local Turn Bank Roll (Z)
        const heliQuat = new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), smoothVehicleRotYRef.current)
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), heliPhys.tiltPitch))
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), heliPhys.tiltRoll));

        if (activeHeliGroupRef.current) {
          activeHeliGroupRef.current.position.set(heliPhys.x, heliPhys.y, heliPhys.z);
          activeHeliGroupRef.current.quaternion.copy(heliQuat);
          const canopyMesh = activeHeliGroupRef.current.getObjectByName('cockpitCanopy');
          if (canopyMesh) canopyMesh.visible = !cur.isFirstPerson;
        }

        if (mainRotorRef.current) mainRotorRef.current.rotation.y += 48.0 * dt;
        if (tailRotorRef.current) tailRotorRef.current.rotation.x += 56.0 * dt;

        if (heliBeaconLightRef.current) {
          heliBeaconLightRef.current.intensity = Math.sin(clock.getElapsedTime() * 7) > 0.4 ? 0.35 : 0;
        }

        if (Math.random() < 0.18) {
          soundFX.playHelicopterThump();
        }

        const roundedHeliSpd = Math.round(Math.abs(heliPhys.speed));
        lastReportedSpeed = roundedHeliSpd;
        cur.onSpeedUpdate(roundedHeliSpd);
        // Report altitude in FEET (1 meter = 3.28084 feet)
        updateAltIfChanged(Math.round(Math.max(0, heliPhys.y - 0.18) * 3.28084));

        if (cur.isFirstPerson) {
          // Hide helicopter fuselage in 1st-person view so cockpit geometry never blocks the camera!
          if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = false;
          // 1st-Person Helicopter Cockpit View: unobstructed & smoothly rotatable relative to helicopter's direction!
          const lookPitch = THREE.MathUtils.clamp(smoothCamPitchRef.current - 0.35, -1.48, 1.48);
          const relYaw = smoothCamYawRef.current;
          const localEye = new THREE.Vector3(0, 1.85, 2.35).applyQuaternion(heliQuat);
          const localLookDir = new THREE.Vector3(
            Math.sin(relYaw) * Math.cos(lookPitch),
            -Math.sin(lookPitch),
            Math.cos(relYaw) * Math.cos(lookPitch)
          )
            .multiplyScalar(90.0)
            .applyQuaternion(heliQuat);
          const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(heliQuat);
          camera.position.set(
            heliPhys.x + localEye.x,
            heliPhys.y + localEye.y,
            heliPhys.z + localEye.z
          );
          camera.up.copy(localUp);
          camera.lookAt(
            camera.position.x + localLookDir.x,
            camera.position.y + localLookDir.y,
            camera.position.z + localLookDir.z
          );
        } else {
          if (activeHeliGroupRef.current) activeHeliGroupRef.current.visible = true;
          camera.up.set(0, 1, 0);
          const yaw = smoothVehicleRotYRef.current + smoothCamYawRef.current;
          const pitch = THREE.MathUtils.clamp(smoothCamPitchRef.current, -1.35, 1.48);
          const dist = Math.max(9.5, cameraDistRef.current + Math.min(14, heliPhys.y * 0.15));

          const camTarget = new THREE.Vector3(heliPhys.x, heliPhys.y + 1.2, heliPhys.z);
          const camOffset = new THREE.Vector3(
            heliPhys.x - Math.sin(yaw) * Math.cos(pitch) * dist,
            Math.max(0.25, heliPhys.y + Math.sin(pitch) * dist + 1.4),
            heliPhys.z - Math.cos(yaw) * Math.cos(pitch) * dist
          );
          camera.position.lerp(camOffset, 1 - Math.exp(-14.0 * dt));
          camera.lookAt(camTarget);
        }

      // =======================================================================
      // 1B. REALISTIC AERODYNAMIC AIRPLANE / SUPERSONIC JET FLIGHT SIMULATION
      //     - Persistent Throttle: E = Increase Throttle, Q = Decrease Throttle (holds setting until changed!)
      //     - High Momentum: Airplanes preserve momentum and glide smoothly without losing speed rapidly
      //     - Retractable Landing Gear: Press G to raise/lower landing gear
      //     - Gradual Roll & Full Inverted Flight: Smoothly banks on A/D and can roll 360° upside down!
      //     - High-Speed Crash (>150 MPH): Crashing into buildings or ground at >150 MPH explodes aircraft
      // =======================================================================
      } else if (curVehicle === 'plane') {
        playerContainer.visible = false;
        const planePhys = planePhysicsRef.current;
        const dyn = planeFlightDynRef.current;
        const pSpec =
          PLANES_CATALOG.find((p) => p.id === cur.activePlaneId) || PLANES_CATALOG[0];

        const maxPlaneSpd = pSpec.maxSpeed;
        const isAirborne = planePhys.y > 0.22;
        const isPlaneCountdownFrozen = Boolean(
          cur.pvpConfig?.active && cur.battleCountdown !== null && cur.battleCountdown !== undefined && cur.battleCountdown > 0
        );

        // Aircraft-specific takeoff & stall speeds (MPH)
        const takeoffSpd = pSpec.style === 'jetpack' ? 10 : 18;
        const stallSpd = pSpec.style === 'jetpack' ? 0 : 12;

        // 1. MANUAL THROTTLE CONTROL: E increases throttle, Q decreases throttle (no automatic thrust increase!)
        if (!isPlaneCountdownFrozen && keys.has('e')) {
          dyn.throttle = Math.min(1.0, dyn.throttle + (pSpec.style === 'jetpack' ? 0.75 : 0.55) * dt);
        } else if (!isPlaneCountdownFrozen && keys.has('q')) {
          dyn.throttle = Math.max(0.0, dyn.throttle - 0.45 * dt);
        }

        const newThrottlePct = Math.round(dyn.throttle * 100);
        if (newThrottlePct !== planeThrottlePctRef.current) {
          planeThrottlePctRef.current = newThrottlePct;
          setPlaneThrottlePct(newThrottlePct);
        }

        // Fast launch acceleration that progressively slows down as speed increases toward maxPlaneSpd!
        const targetThrottleSpd = isPlaneCountdownFrozen ? 0 : dyn.throttle * maxPlaneSpd;
        const spdRatio = Math.min(1.0, Math.abs(planePhys.speed) / Math.max(1, maxPlaneSpd));
        const planeSpeedTaper = Math.max(0.15, Math.pow(1.0 - spdRatio, 0.85));
        const basePlaneAccel = 24.0 + pSpec.acceleration * 0.45;
        const realisticAccel = basePlaneAccel * planeSpeedTaper;

        if (isPlaneCountdownFrozen) {
          planePhys.speed = 0;
        } else if (planePhys.speed < targetThrottleSpd) {
          planePhys.speed = Math.min(targetThrottleSpd, planePhys.speed + realisticAccel * dt);
        } else {
          // Gentle coasting / momentum preservation (or braking if Q is actively held at 0% throttle)
          if (keys.has('q') && dyn.throttle <= 0.01) {
            const brakeDecel = Math.max(18.0, basePlaneAccel * 0.9);
            planePhys.speed = Math.max(0, planePhys.speed - brakeDecel * dt);
          } else {
            const gentleDragRate = (isAirborne ? 0.016 : 0.055) + Math.max(0, -Math.sin(planePhys.pitch)) * 0.04;
            planePhys.speed = Math.max(
              targetThrottleSpd,
              planePhys.speed * Math.exp(-gentleDragRate * dt)
            );
            if (!isAirborne && dyn.throttle <= 0.005 && planePhys.speed < 0.2) {
              planePhys.speed = 0;
            }
          }
        }

        // Gravity-induced speed change in dives / climbs when airborne
        if (isAirborne && !isPlaneCountdownFrozen) {
          const pitchGravityAccel = Math.sin(planePhys.pitch) * 8.0;
          planePhys.speed = Math.max(0, Math.min(maxPlaneSpd * 1.15, planePhys.speed + pitchGravityAccel * dt));
        }

        // 2. AERODYNAMIC CONTROL AUTHORITY
        const airspeedAuthority = pSpec.style === 'jetpack' ? 1.3 : Math.min(1.15, Math.max(0.75, planePhys.speed / takeoffSpd));
        dyn.stallFactor = 0;

        // 3. AIRPLANE STEERING RELATIVE TO THE PLANE'S ORIENTATION (INVERTED UP/DOWN CONTROLS LIKE REAL PLANES!)
        // S, ArrowDown, or Space = pull back on yoke -> pitch UP
        // W or ArrowUp = push forward on yoke -> pitch DOWN
        // A or ArrowLeft = tilt/roll LEFT, D or ArrowRight = tilt/roll RIGHT (NO turning, just tilt side to side!)
        const pitchPullUp = !isPlaneCountdownFrozen && (keys.has('s') || keys.has('arrowdown') || keys.has(' '));
        const pitchPushDown = !isPlaneCountdownFrozen && (keys.has('w') || keys.has('arrowup'));
        const rollLeft = !isPlaneCountdownFrozen && (keys.has('a') || keys.has('arrowleft'));
        const rollRight = !isPlaneCountdownFrozen && (keys.has('d') || keys.has('arrowright'));

        const maxPitchRate = (0.74 + pSpec.handling * 0.08) * airspeedAuthority;
        const maxRollRate = (1.1 + pSpec.handling * 0.14) * airspeedAuthority;

        // Target Pitch: S/Down pulls nose UP, W/Up pushes nose DOWN (inverted like real planes!)
        // Starts out slow when first pressed and progressively accelerates to a faster turning speed as held
        const inputPitchDir = pitchPullUp && !pitchPushDown ? -1 : pitchPushDown && !pitchPullUp ? 1 : 0;
        if (inputPitchDir !== 0) {
          if (inputPitchDir !== lastPlanePitchDir) {
            planePitchHoldTime = 0;
            lastPlanePitchDir = inputPitchDir;
          }
          planePitchHoldTime = Math.min(1.0, planePitchHoldTime + dt * 1.25);
          // Progressive ease-in curve: starts at 18% of max pitch speed and accelerates up to 100%
          const rampCurve = 0.18 + 0.82 * Math.pow(planePitchHoldTime, 1.65);
          const targetPitchRate = inputPitchDir * maxPitchRate * rampCurve;
          const pitchAccelBlend = 1 - Math.exp(-(2.4 + 5.8 * planePitchHoldTime) * dt);
          dyn.pitchRate = THREE.MathUtils.lerp(dyn.pitchRate, targetPitchRate, pitchAccelBlend);
        } else {
          planePitchHoldTime = Math.max(0, planePitchHoldTime - dt * 4.0);
          if (planePitchHoldTime === 0) lastPlanePitchDir = 0;
          dyn.pitchRate = THREE.MathUtils.lerp(dyn.pitchRate, 0, 1 - Math.exp(-4.2 * dt));
          if (Math.abs(dyn.pitchRate) < 0.002) {
            dyn.pitchRate = 0;
          }
        }

        // Target Roll: Side-to-side bank tilt on A/D, which aerodynamically turns the plane left or right in the direction it is tilting!
        let targetRollRate = 0;
        if (rollLeft && !rollRight) {
          targetRollRate = maxRollRate;
        } else if (rollRight && !rollLeft) {
          targetRollRate = -maxRollRate;
        }
        dyn.rollRate = THREE.MathUtils.lerp(dyn.rollRate, targetRollRate, Math.min(1, dt * 5.0));

        const q = planeQuatRef.current;

        // Apply local rotational deltas to orientation quaternion based off the plane's position
        // 1. Pitch around local X (Wings): W pitches nose DOWN, S pitches nose UP
        if (Math.abs(dyn.pitchRate) > 0.001) {
          const deltaPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dyn.pitchRate * dt);
          q.multiply(deltaPitch);
        }
        // 2. Roll around local Z (Fuselage): A/D tilts from side to side
        if (Math.abs(dyn.rollRate) > 0.001) {
          const deltaRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -dyn.rollRate * dt);
          q.multiply(deltaRoll);
        }
        q.normalize();

        // 3. Banked-Turn Steering: Plane turns left or right depending on which direction it is tilted!
        const preTurnFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
        const preTurnUp = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize();
        const horizLeft = new THREE.Vector3(preTurnFwd.z, 0, -preTurnFwd.x);
        let bankTurnYawRate = 0;
        if (horizLeft.lengthSq() > 0.0001) {
          horizLeft.normalize();
          // Positive when tilted left, negative when tilted right
          const bankTilt = preTurnUp.dot(horizLeft);
          const speedTurnFactor = Math.min(1.25, Math.max(0.25, planePhys.speed / 35.0));
          bankTurnYawRate = bankTilt * (0.95 + pSpec.handling * 0.18) * speedTurnFactor;
        }
        if (!isAirborne && planePhys.speed > 0.5) {
          const groundSteer = (rollLeft ? 1 : 0) - (rollRight ? 1 : 0);
          bankTurnYawRate += groundSteer * (0.85 + pSpec.handling * 0.15) * Math.min(1.0, planePhys.speed / 15.0);
        }
        dyn.yawRate = bankTurnYawRate;
        if (Math.abs(bankTurnYawRate) > 0.0005) {
          const worldYawDelta = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            bankTurnYawRate * dt
          );
          q.premultiply(worldYawDelta);
          q.normalize();
        }

        // Extract orientation vectors in world coordinates
        const fwdDir = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
        const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize();
        const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize();

        // Sync Euler angles for HUD / instruments
        planePhys.rotationY = Math.atan2(fwdDir.x, fwdDir.z);
        planePhys.pitch = -Math.asin(THREE.MathUtils.clamp(fwdDir.y, -1, 1));
        planePhys.roll = Math.atan2(rightDir.y, upDir.y);

        // Smooth, elegant runway takeoff rotation & aerodynamic lift!
        // As the aircraft accelerates past rotation speed (takeoffSpd) on the ground, gently rotate nose upward for a graceful liftoff
        if (!isAirborne && planePhys.speed >= takeoffSpd * 1.15 && !pitchPushDown && dyn.throttle > 0.25) {
          const autoRotateRate = Math.min(0.28, ((planePhys.speed - takeoffSpd) / 35.0) * 0.22);
          if (planePhys.pitch > -0.14) {
            const gentleLiftRot = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(1, 0, 0),
              -autoRotateRate * dt
            );
            q.multiply(gentleLiftRot);
            q.normalize();
          }
        }

        // Recompute orientation vectors after any smooth runway rotation assist
        fwdDir.set(0, 0, 1).applyQuaternion(q).normalize();
        upDir.set(0, 1, 0).applyQuaternion(q).normalize();
        rightDir.set(1, 0, 0).applyQuaternion(q).normalize();
        planePhys.rotationY = Math.atan2(fwdDir.x, fwdDir.z);
        planePhys.pitch = -Math.asin(THREE.MathUtils.clamp(fwdDir.y, -1, 1));
        planePhys.roll = Math.atan2(rightDir.y, upDir.y);

        // 4. AERODYNAMIC FORWARD THRUST, LIFT & CLIMBING
        const worldPlaneSpd =
          planePhys.speed <= 600
            ? planePhys.speed * 0.447
            : 268.2 + (planePhys.speed - 600) * 0.16;

        // Forward motion strictly along the direction the plane's nose is facing!
        const moveVel = fwdDir.clone().multiplyScalar(worldPlaneSpd);

        // Smooth aerodynamic wing lift: builds progressively from rotation speed so liftoff is silky-smooth
        if (planePhys.speed > takeoffSpd * 0.85) {
          const liftCoeff = THREE.MathUtils.smoothstep(planePhys.speed, takeoffSpd * 0.85, takeoffSpd * 1.65);
          const wingLift = Math.max(0.25, upDir.y) * (isAirborne ? 9.8 : 11.4) * liftCoeff;
          moveVel.y += wingLift - (isAirborne ? 9.8 : 9.2);
        }

        const nextPX = planePhys.x + (isPlaneCountdownFrozen ? 0 : moveVel.x * dt);
        const nextPY = Math.max(
          0.15,
          planePhys.y + (isPlaneCountdownFrozen ? 0 : (isAirborne ? moveVel.y : Math.max(0, moveVel.y)) * dt)
        );
        const nextPZ = planePhys.z + (isPlaneCountdownFrozen ? 0 : moveVel.z * dt);

        // Check ground impact crash if diving into the ground at high speed
        if (isAirborne && nextPY <= 0.16) {
          const isSevereGroundImpact =
            planePhys.speed > 150 &&
            (moveVel.y < -7.5 ||
              fwdDir.y < -0.35 ||
              Math.abs(planePhys.roll) > 0.85);
          if (isSevereGroundImpact) {
            planeHealthRef.current = 0;
            setPlaneHealth(0);
            setExplodingVehicleType('plane');
            triggerHouseExplosion(
              planePhys.x,
              planePhys.z,
              0.5,
              'AIRCRAFT CRASHED AT HIGH SPEED',
              `Your aircraft impacted the ground at ${Math.round(planePhys.speed)} MPH.`
            );
            renderer.render(scene, camera);
            return;
          } else if (planePhys.speed > 35.0 && (moveVel.y < -3.5 || Math.abs(planePhys.roll) > 0.55)) {
            const dmg = (planePhys.speed / 150.0) * 55.0;
            const nextPlaneHp = Math.max(0, planeHealthRef.current - dmg);
            planeHealthRef.current = nextPlaneHp;
            setPlaneHealth(nextPlaneHp);
            soundFX.playPlaceObject();
            cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.65, planePhys.speed * 0.005));
            if (nextPlaneHp <= 0) {
              setExplodingVehicleType('plane');
              triggerHouseExplosion(
                planePhys.x,
                planePhys.z,
                0.5,
                'AIRCRAFT CRASH LANDING',
                'Your aircraft broke apart on hard impact.'
              );
              renderer.render(scene, camera);
              return;
            }
          }
        }

        planePhys.y = Math.max(0.15, Math.min(1250.0, nextPY));

        // While rolling on the runway, keep wings level with the pavement while allowing nose pitch up for takeoff!
        if (planePhys.y <= 0.18) {
          planePhys.y = 0.15;
          planePhys.roll = THREE.MathUtils.lerp(planePhys.roll, 0, Math.min(1, dt * 12));
          const clampedRunwayPitch = THREE.MathUtils.clamp(planePhys.pitch, -0.32, 0.04);
          planePhys.pitch = THREE.MathUtils.lerp(planePhys.pitch, clampedRunwayPitch, Math.min(1, dt * 10));
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), planePhys.rotationY).multiply(
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), planePhys.pitch)
          );
        }

        // Solid building collision check
        const hitBldg = getNearbyColliders(nextPX, nextPZ).find(
          (col) =>
            !col.destroyed &&
            col.isBuilding &&
            planePhys.y < (col.maxY ?? 18.0) - 0.5 &&
            nextPX + 2.5 > col.minX &&
            nextPX - 2.5 < col.maxX &&
            nextPZ + 2.5 > col.minZ &&
            nextPZ - 2.5 < col.maxZ
        );

        // Solid car collision check (NPC traffic, parked cars, police cruisers, and parked player cars)
        let hitCarExplode: { x: number; z: number; onHit: () => void } | null = null;
        if (!cur.pvpConfig?.active && planePhys.y <= 2.6) {
          for (const tc of npcTrafficCars) {
            if (!tc.destroyed && Math.hypot(nextPX - tc.x, nextPZ - tc.z) < 3.2) {
              hitCarExplode = {
                x: tc.x,
                z: tc.z,
                onHit: () => {
                  tc.destroyed = true;
                  tc.respawnTimer = 16.0;
                  tc.group.visible = false;
                  triggerCarExplosionAt(tc.x, 1.0, tc.z, 48);
                  reportPlayerCrime(1);
                  stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: tc.x, y: 1.0, z: tc.z });
                },
              };
              break;
            }
          }
          if (!hitCarExplode) {
            for (const pk of parkedCars) {
              if (!pk.destroyed && Math.hypot(nextPX - pk.x, nextPZ - pk.z) < 3.2) {
                hitCarExplode = {
                  x: pk.x,
                  z: pk.z,
                  onHit: () => {
                    pk.destroyed = true;
                    pk.group.visible = false;
                    triggerCarExplosionAt(pk.x, 1.0, pk.z, 48);
                    stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: pk.x, y: 1.0, z: pk.z });
                  },
                };
                break;
              }
            }
          }
          if (!hitCarExplode) {
            for (const pc of policeCruisers) {
              if (!pc.destroyed && Math.hypot(nextPX - pc.x, nextPZ - pc.z) < 3.2) {
                hitCarExplode = {
                  x: pc.x,
                  z: pc.z,
                  onHit: () => {
                    damagePoliceCruiser(pc, 999, 'Airplane Collision');
                  },
                };
                break;
              }
            }
          }
          if (!hitCarExplode && hasSpawnedCarRef.current && activeCarGroupRef.current && activeCarGroupRef.current.visible) {
            if (Math.hypot(nextPX - carPhysicsRef.current.x, nextPZ - carPhysicsRef.current.z) < 3.2) {
              hitCarExplode = {
                x: carPhysicsRef.current.x,
                z: carPhysicsRef.current.z,
                onHit: () => {
                  if (activeCarGroupRef.current) activeCarGroupRef.current.visible = false;
                  triggerCarExplosionAt(carPhysicsRef.current.x, 1.0, carPhysicsRef.current.z, 48);
                },
              };
            }
          }
        }

        if (hitBldg || hitCarExplode) {
          if (hitCarExplode) {
            hitCarExplode.onHit();
          }
          if (hitBldg && hitBldg.buildingId) {
            const directBldg = destructibleBuildingsRef.current.find((b) => b.id === hitBldg.buildingId);
            if (directBldg && !directBldg.collapsing) {
              directBldg.damage = 9999;
              directBldg.collapsing = true;
              directBldg.collapseVelY = 8.5;
              directBldg.collapseTiltAngle = 0;
              directBldg.group.position.y = Math.min(0, directBldg.group.position.y);
              directBldg.group.rotation.set(0, 0, 0);
              disableBuildingColliders(directBldg.id, directBldg);
            }
          }
          if (planePhys.speed >= 150.0) {
            planeHealthRef.current = 0;
            setPlaneHealth(0);
            setExplodingVehicleType('plane');
            damageBuildingStructurally(nextPX, planePhys.y, nextPZ, 38.0, 999);
            triggerBombExplosion(nextPX, planePhys.y, nextPZ, 26.0);
            triggerHouseExplosion(
              planePhys.x,
              planePhys.z,
              planePhys.y,
              hitCarExplode ? 'AIRCRAFT COLLIDED WITH VEHICLE' : 'HIGH-SPEED AIRCRAFT COLLISION',
              hitCarExplode ? 'Your airplane collided with a vehicle.' : 'Your airplane impacted a structure at extreme speed.'
            );
            renderer.render(scene, camera);
            return;
          } else {
            const dmg = (planePhys.speed / 150.0) * 100.0;
            const nextPlaneHp = Math.max(0, planeHealthRef.current - dmg);
            planeHealthRef.current = nextPlaneHp;
            setPlaneHealth(nextPlaneHp);
            soundFX.playPlaceObject();
            cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.65, planePhys.speed * 0.005));
            if (nextPlaneHp <= 0) {
              setExplodingVehicleType('plane');
              triggerHouseExplosion(
                planePhys.x,
                planePhys.z,
                planePhys.y,
                'AIRCRAFT TOTALED',
                'Accumulated collision damage destroyed your aircraft.'
              );
              renderer.render(scene, camera);
              return;
            }
            planePhys.speed = -planePhys.speed * 0.35;
          }
        } else {
          const minBoundX = cur.pvpConfig?.active ? PVP_ARENA_X - 1100 : -MAP_BOUND;
          const maxBoundX = cur.pvpConfig?.active ? PVP_ARENA_X + 1100 : MAP_BOUND;
          const minBoundZ = cur.pvpConfig?.active ? PVP_ARENA_Z - 1100 : -MAP_BOUND;
          const maxBoundZ = cur.pvpConfig?.active ? PVP_ARENA_Z + 1100 : MAP_BOUND;
          planePhys.x = Math.max(minBoundX, Math.min(maxBoundX, nextPX));
          planePhys.z = Math.max(minBoundZ, Math.min(maxBoundZ, nextPZ));
          humanPosRef.current.set(planePhys.x, planePhys.y, planePhys.z);
        }

        if (activePlaneGroupRef.current) {
          activePlaneGroupRef.current.visible = !cur.isFirstPerson;
          activePlaneGroupRef.current.position.set(planePhys.x, planePhys.y, planePhys.z);
          activePlaneGroupRef.current.quaternion.copy(q);
          const canopyMesh = activePlaneGroupRef.current.getObjectByName('cockpitCanopy');
          if (canopyMesh) canopyMesh.visible = !cur.isFirstPerson;

          // Animate movable aerodynamic control surfaces (ailerons, elevators, rudder)
          const ctrl = activePlaneGroupRef.current.userData?.controlSurfaces;
          if (ctrl) {
            const ailAngle = THREE.MathUtils.clamp(dyn.rollRate * 0.35, -0.42, 0.42);
            const elevAngle = THREE.MathUtils.clamp(dyn.pitchRate * 0.45, -0.45, 0.45);
            const rudAngle = THREE.MathUtils.clamp(dyn.yawRate * 0.4, -0.45, 0.45);
            if (ctrl.aileronL) ctrl.aileronL.rotation.x = ailAngle;
            if (ctrl.aileronR) ctrl.aileronR.rotation.x = -ailAngle;
            if (ctrl.elevator) ctrl.elevator.rotation.x = elevAngle;
            if (ctrl.rudder) ctrl.rudder.rotation.y = rudAngle;
          }

          // Animate Retractable Landing Gear (Press [G] to fold up / extend down smoothly!)
          const targetGearAnim = planeGearDownRef.current ? 0.0 : 1.0;
          planeGearAnimRef.current = THREE.MathUtils.lerp(
            planeGearAnimRef.current,
            targetGearAnim,
            Math.min(1, dt * 3.2)
          );
          if (Math.abs(planeGearAnimRef.current - targetGearAnim) < 0.005) {
            planeGearAnimRef.current = targetGearAnim;
          }
          const gearGrp = activePlaneGroupRef.current.userData?.gearGroup as THREE.Group | undefined;
          if (gearGrp) {
            const anim = planeGearAnimRef.current;
            gearGrp.visible = anim < 0.98;
            const pivots = gearGrp.userData?.pivots as THREE.Group[] | undefined;
            if (pivots) {
              for (const legPivot of pivots) {
                if (legPivot.userData?.isNose) {
                  legPivot.rotation.x = -anim * 1.48;
                } else {
                  const side = legPivot.userData?.side || 1;
                  legPivot.rotation.z = -side * anim * 1.45;
                }
              }
            }
            const wheels = gearGrp.userData?.wheels as THREE.Object3D[] | undefined;
            if (wheels && planePhys.y <= 0.35 && anim < 0.5 && Math.abs(planePhys.speed) > 0.2) {
              const wheelSpin = worldPlaneSpd * 3.1 * dt;
              for (const wObj of wheels) {
                wObj.rotation.x = (wObj.rotation.x + wheelSpin) % (Math.PI * 2);
              }
            }
          }
        }

        if (planePropellerRef.current) {
          planePropellerRef.current.rotation.z += (14.0 + Math.abs(planePhys.speed) * 0.95) * dt;
        }
        if (planeAfterburnersRef.current.length > 0) {
          const burnerScale = dyn.throttle > 0.5 ? 0.8 + dyn.throttle * 0.5 + Math.sin(clock.getElapsedTime() * 40) * 0.15 : 0.4;
          planeAfterburnersRef.current.forEach((ab) => {
            ab.visible = planePhys.speed > 15 || dyn.throttle > 0.1;
            ab.scale.set(1, 1, burnerScale);
          });
        }

        cur.onSpeedUpdate(Math.round(Math.abs(planePhys.speed)));
        // Report altitude in FEET (1 meter = 3.28084 feet)
        cur.onAltitudeUpdate?.(Math.round(planePhys.y * 3.28084));

        if (activePlaneGroupRef.current) {
          const flightStick = activePlaneGroupRef.current.getObjectByName('cockpitFlightStick');
          if (flightStick) {
            flightStick.rotation.x = -planePhys.pitch * 0.75;
            flightStick.rotation.z = -planePhys.roll * 0.65;
          }
          const throttleLever = activePlaneGroupRef.current.getObjectByName('cockpitThrottleLever');
          if (throttleLever) {
            throttleLever.position.z = 0.28 + dyn.throttle * 0.14;
            throttleLever.rotation.x = -0.3 + dyn.throttle * 0.6;
          }
        }

        if (cur.isFirstPerson) {
          // 1st-Person Realistic Cockpit View: pilot eye point with full user-adjustable head look!
          const pilotEyeLocal = new THREE.Vector3(
            0,
            pSpec.style === 'jetpack' ? 1.45 : 1.22,
            pSpec.style === 'jetpack' ? 0.1 : 0.68
          );
          const eyeWorld = pilotEyeLocal.clone().applyQuaternion(q).add(new THREE.Vector3(planePhys.x, planePhys.y, planePhys.z));
          camera.position.copy(eyeWorld);

          // Head-look free view angles controlled by mouse/pointer
          const headYaw = smoothCamYawRef.current;
          const headPitch = THREE.MathUtils.clamp(smoothCamPitchRef.current - 0.35, -1.45, 1.45);

          const headQuat = q.clone()
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), headYaw))
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), headPitch));

          const lookDir = new THREE.Vector3(0, 0, 1).applyQuaternion(headQuat).normalize();
          const headUp = new THREE.Vector3(0, 1, 0).applyQuaternion(headQuat).normalize();
          camera.up.copy(headUp);
          camera.lookAt(camera.position.clone().addScaledVector(lookDir, 60));
        } else {
          // 3rd-Person Dynamic Flight Chase Camera with full user-adjustable orbit angle and zoom!
          const userDist = Math.max(7.5, Math.min(50.0, cameraDistRef.current + Math.min(14, Math.abs(planePhys.speed) * 0.035)));
          const camTarget = new THREE.Vector3(planePhys.x, planePhys.y + 1.2, planePhys.z);

          // Orbit relative to airplane heading + user mouse yaw & pitch
          const totalOrbitYaw = planePhys.rotationY + smoothCamYawRef.current;
          const orbitPitch = THREE.MathUtils.clamp(smoothCamPitchRef.current, -1.35, 1.48);

          const camPos = new THREE.Vector3(
            planePhys.x - Math.sin(totalOrbitYaw) * Math.cos(orbitPitch) * userDist,
            Math.max(planePhys.y + 0.4, camTarget.y + Math.sin(orbitPitch) * userDist),
            planePhys.z - Math.cos(totalOrbitYaw) * Math.cos(orbitPitch) * userDist
          );

          camera.up.lerp(upDir, Math.min(1, dt * 6.0));
          camera.position.lerp(camPos, Math.min(1, dt * 10.5));
          camera.lookAt(camTarget);
        }

      // =======================================================================
      // 1D. RIDING MOTORCYCLE SIMULATION (Tilts INTO turn direction, explodes ONLY if > 150 MPH or > 150 combined MPH!)
      // =======================================================================
      } else if (curVehicle === 'motorcycle') {
        const motoPhys = motorcyclePhysicsRef.current;
        const activeMoto =
          MOTORCYCLES_CATALOG.find((m) => m.id === cur.activeMotorcycleId) ||
          MOTORCYCLES_CATALOG[0];

        const hasNitroMoto = (cur.activeMiscIds || []).includes('misc-nitro-injector');
        const maxSpd = activeMoto.maxSpeed * (hasNitroMoto ? 1.25 : 1.0);
        const baseMotoAccel = (14.0 + activeMoto.acceleration * 3.3) * (hasNitroMoto ? 2.5 : 1.0);
        const motoSpdRatio = Math.min(1.0, Math.abs(motoPhys.speed) / Math.max(1, maxSpd));
        const motoSpeedTaper = Math.max(0.15, Math.pow(1.0 - motoSpdRatio, 0.85));
        const accelRate = baseMotoAccel * motoSpeedTaper;
        const brakeDecel = Math.max(28.0, baseMotoAccel * 1.9);

        if (keys.has('w') || keys.has('arrowup')) {
          if (motoPhys.speed < -0.5) {
            motoPhys.speed = Math.min(0, motoPhys.speed + brakeDecel * dt);
          } else {
            motoPhys.speed = Math.min(maxSpd, motoPhys.speed + accelRate * dt);
          }
        } else if (keys.has('s') || keys.has('arrowdown')) {
          if (motoPhys.speed > 0.5) {
            motoPhys.speed = Math.max(0, motoPhys.speed - brakeDecel * dt);
          } else {
            motoPhys.speed = Math.max(-25, motoPhys.speed - accelRate * 0.75 * dt);
          }
        } else {
          const drag = 0.35 + (Math.abs(motoPhys.speed) / Math.max(100, maxSpd)) * 0.32;
          motoPhys.speed *= Math.exp(-drag * dt);
          if (Math.abs(motoPhys.speed) < 0.12) motoPhys.speed = 0;
        }

        // Spacebar on Motorcycle: Front-wheelie when moving forward, or rear brake when coasting!
        const targetWheelie =
          keys.has(' ') && (keys.has('w') || keys.has('arrowup')) && motoPhys.speed > 12.0
            ? -0.34
            : 0.0;
        motoPhys.wheeliePitch = THREE.MathUtils.lerp(motoPhys.wheeliePitch ?? 0, targetWheelie, Math.min(1, dt * 7.5));

        const absSpd = Math.abs(motoPhys.speed);
        const highSpeedDamp = 1.0 / (1.0 + absSpd * 0.012);
        const maxSteer = 0.52 * (0.35 + 0.65 * highSpeedDamp);
        const steerBuildRate = (0.95 + activeMoto.handling * 0.35) * 2.0;
        const steerReturnRate = 4.5;

        const steerLeft = keys.has('a') || keys.has('arrowleft');
        const steerRight = keys.has('d') || keys.has('arrowright');

        if (steerLeft && !steerRight) {
          const target = -maxSteer;
          const rate = motoPhys.steering > 0 ? steerReturnRate : steerBuildRate;
          motoPhys.steering = THREE.MathUtils.lerp(motoPhys.steering, target, Math.min(1, rate * dt));
        } else if (steerRight && !steerLeft) {
          const target = maxSteer;
          const rate = motoPhys.steering < 0 ? steerReturnRate : steerBuildRate;
          motoPhys.steering = THREE.MathUtils.lerp(motoPhys.steering, target, Math.min(1, rate * dt));
        } else {
          motoPhys.steering = THREE.MathUtils.lerp(motoPhys.steering, 0, Math.min(1, steerReturnRate * dt));
          if (Math.abs(motoPhys.steering) < 0.003) motoPhys.steering = 0;
        }

        // Dynamic cornering lean angle IN THE SAME DIRECTION you are turning!
        // Steering left (steering < 0) leans left; steering right (steering > 0) leans right.
        const speedLeanFactor = Math.min(1.0, absSpd / 28.0);
        const targetLean = motoPhys.steering * 1.18 * speedLeanFactor;
        motoPhys.leanAngle = THREE.MathUtils.lerp(motoPhys.leanAngle, targetLean, Math.min(1, dt * 8.5));

        const worldMotoMoveSpd = motoPhys.speed * 0.52;
        if (absSpd > 0.1) {
          const wheelBaseFactor = Math.min(1.0, absSpd / 8.0);
          const turnRate = (1.85 + activeMoto.handling * 0.32) * wheelBaseFactor;
          motoPhys.rotationY -= motoPhys.steering * Math.sign(motoPhys.speed) * turnRate * dt;
        }

        const stepDist = Math.abs(worldMotoMoveSpd * dt);
        const steps = Math.min(10, Math.max(1, Math.ceil(stepDist / 2.0)));
        const subDt = dt / steps;

        for (let s = 0; s < steps; s++) {
          let nextX = motoPhys.x + Math.sin(motoPhys.rotationY) * worldMotoMoveSpd * subDt;
          let nextZ = motoPhys.z + Math.cos(motoPhys.rotationY) * worldMotoMoveSpd * subDt;

          const motoMinBoundX = cur.pvpConfig?.active ? PVP_ARENA_X - 1100 : -MAP_BOUND;
          const motoMaxBoundX = cur.pvpConfig?.active ? PVP_ARENA_X + 1100 : MAP_BOUND;
          const motoMinBoundZ = cur.pvpConfig?.active ? PVP_ARENA_Z - 1100 : -MAP_BOUND;
          const motoMaxBoundZ = cur.pvpConfig?.active ? PVP_ARENA_Z + 1100 : MAP_BOUND;
          if (nextX < motoMinBoundX || nextX > motoMaxBoundX || nextZ < motoMinBoundZ || nextZ > motoMaxBoundZ) {
            nextX = Math.max(motoMinBoundX, Math.min(motoMaxBoundX, nextX));
            nextZ = Math.max(motoMinBoundZ, Math.min(motoMaxBoundZ, nextZ));
            motoPhys.x = nextX;
            motoPhys.z = nextZ;
            motoPhys.speed = 0;
            break;
          }

          if (Math.abs(motoPhys.speed) > 3.0) {
            for (const npcItem of npcMeshes) {
              if (!npcItem.dead && checkCarCollidesWithNpc(nextX, nextZ, motoPhys.rotationY, 0.42, 1.08, npcItem.group.position.x, npcItem.group.position.z, 0.26)) {
                killNpcWithBlood(npcItem, 'motorcycle', { x: nextX, z: nextZ });
                const remHp = damageVehicle(5);
                if (remHp <= 0) {
                  triggerHouseExplosion(nextX, nextZ, 0, 'MOTORCYCLE TOTALED', 'Vehicle integrity reduced to 0%.');
                  break;
                }
              }
            }
            if (carHealthRef.current <= 0 || isExplodingRef.current) break;
            for (const po of policeOfficers) {
              if (!po.dead && checkCarCollidesWithNpc(nextX, nextZ, motoPhys.rotationY, 0.42, 1.08, po.group.position.x, po.group.position.z, 0.26)) {
                damagePoliceOfficer(po, Math.abs(motoPhys.speed) * 3.0, 'Motorcycle Impact');
                const remHp = damageVehicle(5);
                if (remHp <= 0) {
                  triggerHouseExplosion(nextX, nextZ, 0, 'MOTORCYCLE TOTALED', 'Vehicle integrity reduced to 0%.');
                  break;
                }
              }
            }
          }

          const hitNpcTraffic = npcTrafficCars.find(
            (tc) => !tc.destroyed && checkCarCollidesWithCar(nextX, nextZ, motoPhys.rotationY, 0.42, 1.08, tc.x, tc.z, tc.rotationY, 0.96, 2.24)
          );
          const hitPoliceCarMoto = !hitNpcTraffic
            ? policeCruisers.find((pc) => !pc.destroyed && checkCarCollidesWithCar(nextX, nextZ, motoPhys.rotationY, 0.42, 1.08, pc.x, pc.z, pc.rotY, 0.96, 2.24))
            : undefined;
          const hitOtherCarMoto = hitNpcTraffic || hitPoliceCarMoto;
          if (hitOtherCarMoto) {
            const combinedSpeed = Math.abs(motoPhys.speed) + Math.abs(hitOtherCarMoto.speed);
            if (combinedSpeed > 150.0) {
              hitOtherCarMoto.destroyed = true;
              if ('respawnTimer' in hitOtherCarMoto) hitOtherCarMoto.respawnTimer = 16.0;
              hitOtherCarMoto.group.visible = false;
              triggerCarExplosionAt(hitOtherCarMoto.x, 1.0, hitOtherCarMoto.z, 42);
              reportPlayerCrime(1);
              if (hitPoliceCarMoto) {
                stateRef.current.onEarnMoney?.(6000, 'Destroyed Police Car', { x: nextX, y: 1.0, z: nextZ });
              } else {
                stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: hitOtherCarMoto.x, y: 1.0, z: hitOtherCarMoto.z });
              }
              triggerHouseExplosion(
                motoPhys.x,
                motoPhys.z,
                0,
                'HIGH-SPEED MOTORCYCLE COLLISION',
                `Combined impact speed of ${Math.round(combinedSpeed)} MPH exceeded 150 MPH!`
              );
              renderer.render(scene, camera);
              return;
            } else {
              const dmg = ((combinedSpeed / 150.0) * 100.0) * 2;
              const nextCarHp = Math.max(0, carHealthRef.current - dmg);
              carHealthRef.current = nextCarHp;
              setCarHealth(nextCarHp);
              soundFX.playPlaceObject();
              cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.6, combinedSpeed * 0.004));
              if (nextCarHp <= 0) {
                hitOtherCarMoto.destroyed = true;
                if ('respawnTimer' in hitOtherCarMoto) hitOtherCarMoto.respawnTimer = 16.0;
                hitOtherCarMoto.group.visible = false;
                triggerCarExplosionAt(hitOtherCarMoto.x, 1.0, hitOtherCarMoto.z, 42);
                reportPlayerCrime(1);
                if (hitPoliceCarMoto) {
                  stateRef.current.onEarnMoney?.(6000, 'Destroyed Police Car', { x: nextX, y: 1.0, z: nextZ });
                } else {
                  stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: hitOtherCarMoto.x, y: 1.0, z: hitOtherCarMoto.z });
                }
                triggerHouseExplosion(
                  motoPhys.x,
                  motoPhys.z,
                  0,
                  'MOTORCYCLE TOTALED',
                  'Accumulated collision damage destroyed your motorcycle.'
                );
                renderer.render(scene, camera);
                return;
              }
              if (hitPoliceCarMoto) {
                const pcFwdX = Math.sin(hitPoliceCarMoto.rotY);
                const pcFwdZ = Math.cos(hitPoliceCarMoto.rotY);
                const fwdDot = (nextX - hitPoliceCarMoto.x) * pcFwdX + (nextZ - hitPoliceCarMoto.z) * pcFwdZ;
                hitPoliceCarMoto.speed =
                  fwdDot >= 0
                    ? -Math.max(6, Math.abs(hitPoliceCarMoto.speed) * 0.35)
                    : Math.max(0, hitPoliceCarMoto.speed * 0.25);
                hitPoliceCarMoto.collisionCooldown = 0.65;
              }
              motoPhys.speed = -motoPhys.speed * 0.35;
              break;
            }
          }

          const hitCol = findVehicleBuildingOrWallCollider(nextX, nextZ, 0.85);

          if (hitCol) {
            const impactSpd = Math.abs(motoPhys.speed);
            if (impactSpd >= 150.0) {
              if (hitCol.isBuilding) {
                // Motorcycles going 150+ MPH colliding with a house or skyscraper have the exact same effect as bombs!
                triggerBombExplosion(nextX, 1.5, nextZ, 20.0);
              }
              triggerHouseExplosion(
                motoPhys.x,
                motoPhys.z,
                0,
                'You died',
                ''
              );
              renderer.render(scene, camera);
              return;
            } else {
              if (impactSpd > 8.0) {
                const dmg = ((impactSpd / 150.0) * 100.0) * 2;
                const nextCarHp = Math.max(0, carHealthRef.current - dmg);
                carHealthRef.current = nextCarHp;
                setCarHealth(nextCarHp);
                soundFX.playPlaceObject();
                cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.5, impactSpd * 0.004));
                if (nextCarHp <= 0) {
                  triggerHouseExplosion(
                    motoPhys.x,
                    motoPhys.z,
                    0,
                    'You died',
                    ''
                  );
                  renderer.render(scene, camera);
                  return;
                }
              }
              motoPhys.speed = -motoPhys.speed * 0.3;
              break;
            }
          } else {
            motoPhys.x = nextX;
            motoPhys.z = nextZ;
          }
        }

        let motoRotDiff = motoPhys.rotationY - smoothVehicleRotYRef.current;
        while (motoRotDiff < -Math.PI) motoRotDiff += Math.PI * 2;
        while (motoRotDiff > Math.PI) motoRotDiff -= Math.PI * 2;
        smoothVehicleRotYRef.current += motoRotDiff * (1 - Math.exp(-16.0 * dt));

        const motoQuat = new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), smoothVehicleRotYRef.current)
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), motoPhys.wheeliePitch))
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), motoPhys.leanAngle));

        if (activeMotorcycleGroupRef.current) {
          activeMotorcycleGroupRef.current.position.set(motoPhys.x, 0, motoPhys.z);
          activeMotorcycleGroupRef.current.quaternion.copy(motoQuat);
        }
        if (motorcycleSteeringGroupRef.current) {
          motorcycleSteeringGroupRef.current.rotation.y = -motoPhys.steering * 0.55;
        }

        const wheelRoll = (worldMotoMoveSpd / 0.31) * dt;
        motorcycleWheelsRef.current.forEach((w) => {
          w.rotation.order = 'YXZ';
          w.rotation.x = (w.rotation.x + wheelRoll) % (Math.PI * 2);
          w.rotation.y = 0;
          w.rotation.z = 0;
        });

        // Position Player Rider on Motorcycle Saddle in 3rd-Person View!
        playerContainer.visible = !cur.isFirstPerson;
        if (!cur.isFirstPerson) {
          const saddleOffset = new THREE.Vector3(0, 0.32, -0.18).applyQuaternion(motoQuat);
          playerContainer.position.set(
            motoPhys.x + saddleOffset.x,
            saddleOffset.y,
            motoPhys.z + saddleOffset.z
          );
          playerContainer.quaternion.copy(motoQuat);
          pLegL.rotation.x = -0.65;
          pLegR.rotation.x = -0.65;
          pArmL.rotation.x = -0.95;
          pArmR.rotation.x = -0.95;
        }
        humanPosRef.current.set(motoPhys.x, 0, motoPhys.z);

        const roundedSpd = Math.round(Math.abs(motoPhys.speed));
        updateSpeedIfChanged(roundedSpd, clock.elapsedTime, roundedSpd === Math.round(maxSpd));

        // Unlocked free-look camera relative to motorcycle's direction (both 1st and 3rd person!)
        if (cur.isFirstPerson) {
          const lookPitch = THREE.MathUtils.clamp(smoothCamPitchRef.current - 0.35, -1.48, 1.48);
          const relYaw = smoothCamYawRef.current;
          const localEye = new THREE.Vector3(0, 1.38, 0.15).applyQuaternion(motoQuat);
          const localLookDir = new THREE.Vector3(
            Math.sin(relYaw) * Math.cos(lookPitch),
            -Math.sin(lookPitch),
            Math.cos(relYaw) * Math.cos(lookPitch)
          )
            .multiplyScalar(35.0)
            .applyQuaternion(motoQuat);
          const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(motoQuat);
          camera.position.set(motoPhys.x + localEye.x, localEye.y, motoPhys.z + localEye.z);
          camera.up.copy(localUp);
          camera.lookAt(
            camera.position.x + localLookDir.x,
            camera.position.y + localLookDir.y,
            camera.position.z + localLookDir.z
          );
        } else {
          camera.up.set(0, 1, 0);
          const chaseDist = Math.max(5.5, cameraDistRef.current * 0.78);
          const yaw = smoothVehicleRotYRef.current + smoothCamYawRef.current;
          const pitch = THREE.MathUtils.clamp(smoothCamPitchRef.current, -1.35, 1.48);
          const camTarget = new THREE.Vector3(motoPhys.x, 1.15, motoPhys.z);
          camera.position.set(
            motoPhys.x - Math.sin(yaw) * Math.cos(pitch) * chaseDist,
            Math.max(0.25, Math.sin(pitch) * chaseDist + 1.15),
            motoPhys.z - Math.cos(yaw) * Math.cos(pitch) * chaseDist
          );
          camera.lookAt(camTarget);
        }

      // =======================================================================
      // 1E. DRIVING CAR SIMULATION (Proportional Damage System & >150 MPH Instant Explosion!)
      // =======================================================================
      } else if (curVehicle === 'car') {
        camera.up.set(0, 1, 0);
        playerContainer.visible = false;
        const carPhys = carPhysicsRef.current;

        const activeCar =
          activeCarSpecRef.current ||
          CARS_CATALOG.find((c) => c.id === cur.activeCarId) ||
          cur.ownedCars.find((c) => c.id === cur.activeCarId) ||
          cur.ownedCars[0] ||
          CARS_CATALOG[0];

        const hasNitroCar = (cur.activeMiscIds || []).includes('misc-nitro-injector');
        const maxSpd = activeCar.maxSpeed * (hasNitroCar ? 1.25 : 1.0);
        // Progressive acceleration that starts strong and slows down as speed increases toward maxSpd
        const baseCarAccel = (12.0 + activeCar.acceleration * 3.0) * (hasNitroCar ? 2.5 : 1.0);
        const carSpdRatio = Math.min(1.0, Math.abs(carPhys.speed) / Math.max(1, maxSpd));
        const carSpeedTaper = Math.max(0.15, Math.pow(1.0 - carSpdRatio, 0.85));
        const accelRate = baseCarAccel * carSpeedTaper;
        const brakeDecel = Math.max(26.0, baseCarAccel * 1.8);
        const isCarCountdownFrozen = Boolean(
          cur.pvpConfig?.active && cur.battleCountdown !== null && cur.battleCountdown !== undefined && cur.battleCountdown > 0
        );

        if (isCarCountdownFrozen) {
          carPhys.speed = 0;
        } else if (keys.has(' ')) {
          if (Math.abs(carPhys.speed) < 1.0) {
            carPhys.speed = 0;
          } else {
            carPhys.speed -= Math.sign(carPhys.speed) * brakeDecel * 1.35 * dt;
          }
        } else if (keys.has('w') || keys.has('arrowup')) {
          if (carPhys.speed < -0.5) {
            carPhys.speed = Math.min(0, carPhys.speed + brakeDecel * dt);
          } else {
            carPhys.speed = Math.min(maxSpd, carPhys.speed + accelRate * dt);
          }
        } else if (keys.has('s') || keys.has('arrowdown')) {
          if (carPhys.speed > 0.5) {
            carPhys.speed = Math.max(0, carPhys.speed - brakeDecel * dt);
          } else {
            carPhys.speed = Math.max(-Math.min(45, maxSpd * 0.35), carPhys.speed - accelRate * 0.85 * dt);
          }
        } else {
          // Smooth natural coasting deceleration
          const drag = 0.35 + (Math.abs(carPhys.speed) / Math.max(100, maxSpd)) * 0.35;
          carPhys.speed *= Math.exp(-drag * dt);
          if (Math.abs(carPhys.speed) < 0.12) carPhys.speed = 0;
        }

        // Smooth, progressive steering (does NOT snap immediately to full lock)
        const absSpd = Math.abs(carPhys.speed);
        const highSpeedDamp = 1.0 / (1.0 + absSpd * 0.015);
        const maxSteer = 0.48 * (0.32 + 0.68 * highSpeedDamp);
        const steerBuildRate = (0.85 + activeCar.handling * 0.3) * 1.85;
        const steerReturnRate = 3.8;

        const steerLeft = keys.has('a') || keys.has('arrowleft');
        const steerRight = keys.has('d') || keys.has('arrowright');

        if (steerLeft && !steerRight) {
          const target = -maxSteer;
          const rate = carPhys.steering > 0 ? steerReturnRate : steerBuildRate;
          carPhys.steering = THREE.MathUtils.lerp(carPhys.steering, target, Math.min(1, rate * dt));
        } else if (steerRight && !steerLeft) {
          const target = maxSteer;
          const rate = carPhys.steering < 0 ? steerReturnRate : steerBuildRate;
          carPhys.steering = THREE.MathUtils.lerp(carPhys.steering, target, Math.min(1, rate * dt));
        } else {
          carPhys.steering = THREE.MathUtils.lerp(carPhys.steering, 0, Math.min(1, steerReturnRate * dt));
          if (Math.abs(carPhys.steering) < 0.003) carPhys.steering = 0;
        }

        // Direct 1:1 linear conversion from MPH to world meters/sec with zero speed cap!
        const worldCarMoveSpd = carPhys.speed * 0.52;

        if (absSpd > 0.1) {
          // Ackermann wheelbase turning geometry: angular rate scales smoothly with forward motion
          const wheelBaseFactor = Math.min(1.0, absSpd / 10.0);
          const turnRate = (1.65 + activeCar.handling * 0.28) * wheelBaseFactor;
          carPhys.rotationY -= carPhys.steering * Math.sign(carPhys.speed) * turnRate * dt;
        }

        const stepDist = Math.abs(worldCarMoveSpd * dt);
        const steps = Math.min(12, Math.max(1, Math.ceil(stepDist / 2.2)));
        const subDt = dt / steps;

        for (let s = 0; s < steps; s++) {
          let nextCarX = carPhys.x + Math.sin(carPhys.rotationY) * worldCarMoveSpd * subDt;
          let nextCarZ = carPhys.z + Math.cos(carPhys.rotationY) * worldCarMoveSpd * subDt;

          // Stop car at the invisible map barrier so you cannot drive off the map!
          const carMinBoundX = cur.pvpConfig?.active ? PVP_ARENA_X - 1100 : -MAP_BOUND;
          const carMaxBoundX = cur.pvpConfig?.active ? PVP_ARENA_X + 1100 : MAP_BOUND;
          const carMinBoundZ = cur.pvpConfig?.active ? PVP_ARENA_Z - 1100 : -MAP_BOUND;
          const carMaxBoundZ = cur.pvpConfig?.active ? PVP_ARENA_Z + 1100 : MAP_BOUND;
          if (nextCarX < carMinBoundX || nextCarX > carMaxBoundX || nextCarZ < carMinBoundZ || nextCarZ > carMaxBoundZ) {
            nextCarX = Math.max(carMinBoundX, Math.min(carMaxBoundX, nextCarX));
            nextCarZ = Math.max(carMinBoundZ, Math.min(carMaxBoundZ, nextCarZ));
            carPhys.x = nextCarX;
            carPhys.z = nextCarZ;
            carPhys.speed = 0;
            break;
          }

          if (Math.abs(carPhys.speed) > 3.0) {
            for (const npcItem of npcMeshes) {
              if (!npcItem.dead && checkCarCollidesWithNpc(nextCarX, nextCarZ, carPhys.rotationY, 0.96, 2.24, npcItem.group.position.x, npcItem.group.position.z, 0.26)) {
                killNpcWithBlood(npcItem, 'car_impact', { x: nextCarX, z: nextCarZ });
                const remHp = damageVehicle(5);
                if (remHp <= 0) {
                  triggerHouseExplosion(nextCarX, nextCarZ, 0, 'CAR DESTROYED', 'Vehicle integrity reduced to 0%.');
                  break;
                }
              }
            }
            if (carHealthRef.current <= 0 || isExplodingRef.current) break;
            for (const po of policeOfficers) {
              if (!po.dead && checkCarCollidesWithNpc(nextCarX, nextCarZ, carPhys.rotationY, 0.96, 2.24, po.group.position.x, po.group.position.z, 0.26)) {
                damagePoliceOfficer(po, Math.abs(carPhys.speed) * 3.5, 'Vehicle Impact');
                const remHp = damageVehicle(5);
                if (remHp <= 0) {
                  triggerHouseExplosion(nextCarX, nextCarZ, 0, 'CAR DESTROYED', 'Vehicle integrity reduced to 0%.');
                  break;
                }
              }
            }
          }

          // Check collision with NPC Traffic Cars & Police Cruisers -> Combined speed >= 150 MPH explodes immediately; lower speed reduces car health proportionally and bounces solidly!
          const hitNpcTraffic = npcTrafficCars.find(
            (tc) => !tc.destroyed && checkCarCollidesWithCar(nextCarX, nextCarZ, carPhys.rotationY, 0.96, 2.24, tc.x, tc.z, tc.rotationY, 0.96, 2.24)
          );
          const hitPoliceCruiser = !hitNpcTraffic
            ? policeCruisers.find((pc) => !pc.destroyed && checkCarCollidesWithCar(nextCarX, nextCarZ, carPhys.rotationY, 0.96, 2.24, pc.x, pc.z, pc.rotY, 0.96, 2.24))
            : undefined;
          const hitOtherCar = hitNpcTraffic || hitPoliceCruiser;
          if (hitOtherCar) {
            const combinedSpeed = Math.abs(carPhys.speed) + Math.abs(hitOtherCar.speed);
            if (combinedSpeed >= 150.0) {
              carHealthRef.current = 0;
              setCarHealth(0);
              hitOtherCar.destroyed = true;
              if ('respawnTimer' in hitOtherCar) hitOtherCar.respawnTimer = 16.0;
              hitOtherCar.group.visible = false;
              spawnDebrisBurst(hitOtherCar.x, 1.0, hitOtherCar.z, 42);
              reportPlayerCrime(1);
              triggerHouseExplosion(
                carPhys.x,
                carPhys.z,
                0,
                '150+ MPH MULTI-CAR CRASH',
                `Combined collision speed of ${Math.round(combinedSpeed)} MPH caused an immediate explosion!`
              );
              renderer.render(scene, camera);
              return;
            } else {
              const dmg = (combinedSpeed / 150.0) * 100.0;
              const nextCarHp = Math.max(0, carHealthRef.current - dmg);
              carHealthRef.current = nextCarHp;
              setCarHealth(nextCarHp);
              soundFX.playPlaceObject();
              cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.65, combinedSpeed * 0.004));
              // Only show explosion animation when totaled!
              if (nextCarHp <= 0) {
                hitOtherCar.destroyed = true;
                if ('respawnTimer' in hitOtherCar) hitOtherCar.respawnTimer = 16.0;
                hitOtherCar.group.visible = false;
                reportPlayerCrime(1);
                triggerHouseExplosion(
                  carPhys.x,
                  carPhys.z,
                  0,
                  'You died',
                  ''
                );
                renderer.render(scene, camera);
                return;
              }
              if (hitPoliceCruiser) {
                const pcFwdX = Math.sin(hitPoliceCruiser.rotY);
                const pcFwdZ = Math.cos(hitPoliceCruiser.rotY);
                const fwdDot = (nextCarX - hitPoliceCruiser.x) * pcFwdX + (nextCarZ - hitPoliceCruiser.z) * pcFwdZ;
                hitPoliceCruiser.speed =
                  fwdDot >= 0
                    ? -Math.max(6, Math.abs(hitPoliceCruiser.speed) * 0.35)
                    : Math.max(0, hitPoliceCruiser.speed * 0.25);
                hitPoliceCruiser.collisionCooldown = 0.65;
              }
              // Bounce off car without driving through it
              carPhys.speed = -carPhys.speed * 0.35;
              break;
            }
          }

          const hitCol = findVehicleBuildingOrWallCollider(nextCarX, nextCarZ, 1.2);

          if (hitCol) {
            const impactSpd = Math.abs(carPhys.speed);
            if (impactSpd >= 150.0) {
              carHealthRef.current = 0;
              setCarHealth(0);
              if (hitCol.isBuilding) {
                // Cars going 150+ MPH colliding with a house or skyscraper have the exact same effect as bombs!
                triggerBombExplosion(nextCarX, 1.5, nextCarZ, 22.0);
              }
              triggerHouseExplosion(
                carPhys.x,
                carPhys.z,
                0,
                'You died',
                ''
              );
              renderer.render(scene, camera);
              return;
            } else {
              if (impactSpd > 5.0) {
                const dmg = (impactSpd / 150.0) * 100.0;
                const nextCarHp = Math.max(0, carHealthRef.current - dmg);
                carHealthRef.current = nextCarHp;
                setCarHealth(nextCarHp);
                soundFX.playPlaceObject();
                cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.55, impactSpd * 0.004));
                // Only play explosion animation when the vehicle becomes totaled!
                if (nextCarHp <= 0) {
                  triggerHouseExplosion(
                    carPhys.x,
                    carPhys.z,
                    0,
                    'You died',
                    ''
                  );
                  renderer.render(scene, camera);
                  return;
                }
              }
              carPhys.speed = -carPhys.speed * 0.3;
              break;
            }
          } else {
            carPhys.x = nextCarX;
            carPhys.z = nextCarZ;
          }
        }

        let carRotDiff = carPhys.rotationY - smoothVehicleRotYRef.current;
        while (carRotDiff < -Math.PI) carRotDiff += Math.PI * 2;
        while (carRotDiff > Math.PI) carRotDiff -= Math.PI * 2;
        smoothVehicleRotYRef.current += carRotDiff * (1 - Math.exp(-18.0 * dt));

        // Delayed chase camera follow effect so the camera gradually catches up with the turn of the car
        let camCarDiff = carPhys.rotationY - carCameraYawRef.current;
        while (camCarDiff < -Math.PI) camCarDiff += Math.PI * 2;
        while (camCarDiff > Math.PI) camCarDiff -= Math.PI * 2;
        const isCarActivelyTurning = Math.abs(carPhys.steering) > 0.015 && Math.abs(carPhys.speed) > 1.0;
        const carCamFollowRate = isCarActivelyTurning ? 2.6 : 4.5;
        carCameraYawRef.current += camCarDiff * (1 - Math.exp(-carCamFollowRate * dt));

        if (activeCarGroupRef.current) {
          activeCarGroupRef.current.visible = !cur.isFirstPerson;
          activeCarGroupRef.current.position.set(carPhys.x, 0, carPhys.z);
          activeCarGroupRef.current.rotation.set(0, smoothVehicleRotYRef.current, 0);
        }
        humanPosRef.current.set(carPhys.x, 0, carPhys.z);

        const wheelRoll = (worldCarMoveSpd / 0.35) * dt;
        carWheelsRef.current.forEach((w, idx) => {
          w.rotation.order = 'YXZ';
          w.rotation.x = (w.rotation.x + wheelRoll) % (Math.PI * 2);
          w.rotation.y = idx < 2 ? -carPhys.steering * 0.58 : 0;
          w.rotation.z = 0;
        });

        const roundedSpd = Math.round(Math.abs(carPhys.speed));
        updateSpeedIfChanged(roundedSpd, clock.elapsedTime, roundedSpd === maxSpd);

        if (activeCarGroupRef.current) {
          const steerWheel = activeCarGroupRef.current.getObjectByName('carSteeringWheel');
          if (steerWheel) {
            steerWheel.rotation.z = carPhys.steering * 1.85;
          }
        }

        // Unlocked free-look camera from the driver's seat looking over the realistic dashboard & steering wheel!
        if (cur.isFirstPerson) {
          const vRot = smoothVehicleRotYRef.current;
          const driverOffsetLocal = new THREE.Vector3(-0.35, 1.12, -0.06);
          const driverOffsetWorld = driverOffsetLocal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), vRot);

          camera.position.set(
            carPhys.x + driverOffsetWorld.x,
            driverOffsetWorld.y,
            carPhys.z + driverOffsetWorld.z
          );

          const totalYaw = vRot + smoothCamYawRef.current;
          const lookPitch = THREE.MathUtils.clamp(smoothCamPitchRef.current - 0.35, -1.45, 1.45);
          const fwdX = Math.sin(totalYaw) * Math.cos(lookPitch);
          const fwdY = -Math.sin(lookPitch);
          const fwdZ = Math.cos(totalYaw) * Math.cos(lookPitch);

          camera.lookAt(
            camera.position.x + fwdX * 30,
            camera.position.y + fwdY * 30,
            camera.position.z + fwdZ * 30
          );
        } else {
          // Delayed chase camera that smoothly catches up with the car's turn!
          const chaseDist = cameraDistRef.current;
          const yaw = carCameraYawRef.current + smoothCamYawRef.current;
          const pitch = THREE.MathUtils.clamp(smoothCamPitchRef.current, -1.35, 1.48);

          const camTarget = new THREE.Vector3(
            carPhys.x,
            1.25,
            carPhys.z
          );
          camera.position.set(
            carPhys.x - Math.sin(yaw) * Math.cos(pitch) * chaseDist,
            Math.max(0.25, Math.sin(pitch) * chaseDist + 1.25),
            carPhys.z - Math.cos(yaw) * Math.cos(pitch) * chaseDist
          );
          camera.lookAt(camTarget);
        }
      } else {
        // 2. ON-FOOT WALKING SIMULATION WITH JUMPING, JETPACK, SPEED BOOTS, 1ST PERSON VIEW & INTUITIVE CONTROLS
        camera.up.set(0, 1, 0);
        playerGrp.visible = !cur.isFirstPerson;
        playerGrp.rotation.x = 0;
        playerGrp.rotation.z = 0;

        const miscList = cur.platformerMode ? [] : (cur.activeMiscIds || []);
        const hasJetpack = miscList.includes('misc-jetpack');
        const hasSpeedBoots = miscList.includes('misc-speed-boots');
        const hasLowGrav = miscList.includes('misc-low-gravity');
        const hasDiscoAura = miscList.includes('misc-disco-aura');

        if (playerJetpackMesh) {
          playerJetpackMesh.visible = hasJetpack;
          const flames = playerJetpackMesh.userData?.flames as THREE.Mesh[] | undefined;
          if (flames) {
            const isThrusting = hasJetpack && keys.has(' ');
            const flameScale = isThrusting ? 1.15 + Math.sin(clock.elapsedTime * 38) * 0.25 : 0.01;
            flames.forEach((f) => {
              f.visible = isThrusting;
              f.scale.set(1, flameScale, 1);
            });
          }
        }

        if (hasDiscoAura) {
          const hue = (clock.elapsedTime * 0.65) % 1;
          discoLight.color.setHSL(hue, 1.0, 0.55);
          discoLight.intensity = 10.0;
          discoLight.position.set(humanPosRef.current.x, humanPosRef.current.y + 2.2, humanPosRef.current.z);
        } else if (discoLight.intensity > 0) {
          discoLight.intensity = 0;
        }

        let inputForward = 0;
        let inputRight = 0;
        // BATTLE MODE COUNTDOWN & NPC CONVERSATION CHECK:
        if (
          !(cur.pvpConfig?.active && cur.battleCountdown !== null && cur.battleCountdown > 0) &&
          !cur.talkingNpcId
        ) {
          if (keys.has('w') || keys.has('arrowup')) inputForward += 1;
          if (keys.has('s') || keys.has('arrowdown')) inputForward -= 1;
          if (keys.has('d') || keys.has('arrowright')) inputRight += 1;
          if (keys.has('a') || keys.has('arrowleft')) inputRight -= 1;
        }

        const foodSpeedEffect = cur.platformerMode
          ? undefined
          : (activeFoodEffects || []).find((e) => e.type === 'speed' && e.endTime > Date.now());
        const foodLowGravEffect = cur.platformerMode
          ? undefined
          : (activeFoodEffects || []).find((e) => e.type === 'low-gravity' && e.endTime > Date.now());

        const isWalking = inputForward !== 0 || inputRight !== 0;
        const isRunningWithR = keys.has('r') && (keys.has('w') || keys.has('arrowup'));
        const foodSpeedMult = foodSpeedEffect ? foodSpeedEffect.value : 1.0;
        const speedMult =
          (hasSpeedBoots ? 3.2 : 1.0) *
          (hasJetpack && humanPosRef.current.y > 0.3 ? 1.85 : 1.0) *
          foodSpeedMult;
        const walkSpeed = cur.platformerMode
          ? 7.8
          : (isRunningWithR ? 10.5 : keys.has('shift') ? 8.0 : 5.0) * speedMult;
        cur.onSpeedUpdate(isWalking ? Math.round(walkSpeed * 2.237) : 0);

        const curPos = humanPosRef.current;

        // Vertical Jumping, Jetpack Flight, Solid Building Roofs & Walkable Skyscraper Staircases / Floors / Obby Platforms
        let floorY = 0;
        let ceilingY = Infinity;
        let standingObbyPlatform: ObbyPlatform | null = null;

        if (cur.platformerMode && activeObbyLevel) {
          if (curPos.y > PLATFORMER_BASE_Y - 22) {
            floorY = -9999;
            for (const p of activeObbyLevel.platforms) {
              if (
                Math.abs(curPos.x - p.curX) <= p.w * 0.5 + 0.38 &&
                Math.abs(curPos.z - p.curZ) <= p.d * 0.5 + 0.38 &&
                curPos.y >= p.curY - 0.85
              ) {
                if (p.curY > floorY) {
                  floorY = p.curY;
                  standingObbyPlatform = p;
                }
              }
            }
            if (standingObbyPlatform && Math.abs(curPos.y - standingObbyPlatform.curY) <= 0.25 && humanVelYRef.current <= 0) {
              // Carry player with moving platform!
              curPos.x += standingObbyPlatform.curX - standingObbyPlatform.prevX;
              curPos.y += standingObbyPlatform.curY - standingObbyPlatform.prevY;
              curPos.z += standingObbyPlatform.curZ - standingObbyPlatform.prevZ;
              floorY = standingObbyPlatform.curY;
              platformerCoyoteTimer = 0.095;
            } else {
              platformerCoyoteTimer = Math.max(0, platformerCoyoteTimer - dt);
            }
          } else {
            // Player fell off the platforms into the void: fall into void (no city), no health loss, death screen 1 second after falling with no death animation while player keeps falling
            floorY = -99999;
            if (!isExplodingRef.current) {
              platformerFallTimer += dt;
              if (platformerFallTimer >= 0.5) {
                triggerPlayerDeath(
                  'You died',
                  '',
                  false,
                  true
                );
              }
            }
          }
        } else {
          const skyFloor = !cur.pvpConfig?.active
            ? getSkyscraperFloorOrStairHeight(
                curPos.x,
                curPos.y,
                curPos.z,
                skyscrapersRef.current
              )
            : null;
          if (skyFloor !== null) {
            floorY = Math.max(floorY, skyFloor);
          }

          // Solid Roof & Ceiling enforcement for all houses, commercial stores, apartments, and skyscrapers (never phase through roofs, while keeping stairwell cutouts open!)
          if (!cur.pvpConfig?.active) {
            for (const b of destructibleBuildingsRef.current) {
              if (b.destroyed || b.collapsing) continue;
              if (
                Math.abs(curPos.x - b.cx) <= b.w * 0.5 + 0.25 &&
                Math.abs(curPos.z - b.cz) <= b.d * 0.5 + 0.25
              ) {
                const skyBldg = skyscrapersRef.current.find((s) => s.id === b.id);
                const inStairwellCutout = Boolean(
                  skyBldg &&
                    curPos.x >= skyBldg.maxX - 5.7 &&
                    curPos.x <= skyBldg.maxX - 0.7 &&
                    curPos.z >= skyBldg.cz - 3.7 &&
                    curPos.z <= skyBldg.maxZ + 0.1
                );
                if (inStairwellCutout) {
                  continue;
                }
                if (curPos.y >= b.h - 0.65) {
                  floorY = Math.max(floorY, b.h);
                } else {
                  if (skyBldg) {
                    const nextSlabIdx = Math.floor(curPos.y / skyBldg.floorH) + 1;
                    if (nextSlabIdx >= 1 && nextSlabIdx <= skyBldg.numFloors) {
                      ceilingY = Math.min(ceilingY, nextSlabIdx * skyBldg.floorH - 0.15);
                    }
                  } else {
                    ceilingY = Math.min(ceilingY, b.h - 0.15);
                    // Walkable floor level inside suburban houses & front porch decks:
                    // Prevents player feet from sinking into the hardwood floorboards!
                    const frontWallZ = b.cz - b.d * 0.5;
                    const isInsideHouseFootprint =
                      Math.abs(curPos.x - b.cx) <= b.w * 0.5 - 0.05 &&
                      Math.abs(curPos.z - b.cz) <= b.d * 0.5 - 0.05;
                    const isOnPorchDeck =
                      Math.abs(curPos.x - b.cx) <= Math.min(b.w - 1.2, 7.6) * 0.5 + 0.25 &&
                      curPos.z >= frontWallZ - 2.85 &&
                      curPos.z <= frontWallZ + 0.2;
                    if (isInsideHouseFootprint) {
                      floorY = Math.max(floorY, 0.22);
                    } else if (isOnPorchDeck) {
                      floorY = Math.max(floorY, 0.24);
                    }
                  }
                }
              }
            }
          }
        }

        // In Platformer Mode, holding Spacebar while on a platform automatically jumps smoothly!
        if (
          cur.platformerMode &&
          keys.has(' ') &&
          !cur.isMenuOpen &&
          standingObbyPlatform &&
          Math.abs(curPos.y - floorY) <= 0.12 &&
          humanVelYRef.current <= 0.05
        ) {
          humanVelYRef.current = 10.4;
          platformerCoyoteTimer = 0;
        }

        if (hasJetpack && keys.has(' ') && !cur.isMenuOpen) {
          humanVelYRef.current = Math.min(22.0, humanVelYRef.current + 42.0 * dt);
          if (humanVelYRef.current >= -6.0) {
            playerAirbornePeakY = curPos.y;
          }
        } else if (!cur.platformerMode && curPos.y > 5.0 && humanVelYRef.current < -3.0 && keys.has(' ') && !cur.isMenuOpen) {
          // Emergency Parachute Gliding when exiting aircraft in mid-air: holding Space deploys parachute glide!
          humanVelYRef.current = Math.max(-5.0, humanVelYRef.current + 38.0 * dt);
          playerAirbornePeakY = curPos.y + 2.5;
        }

        const foodGravityMult = foodLowGravEffect ? foodLowGravEffect.value : 1.0;
        const gravityAccel =
          cur.platformerMode && isFallingToCityInPlatformer
            ? 145.0
            : (hasLowGrav ? 5.8 : 24.0) * foodGravityMult;

        // Smoothly step up stairs when walking onto a higher stair step
        if (!cur.platformerMode && floorY > curPos.y && floorY - curPos.y <= 1.85 && humanVelYRef.current <= 0) {
          curPos.y = THREE.MathUtils.lerp(curPos.y, floorY, Math.min(1, dt * 18));
          playerAirbornePeakY = curPos.y;
        } else if (curPos.y > floorY || humanVelYRef.current !== 0) {
          if (curPos.y > playerAirbornePeakY) {
            playerAirbornePeakY = curPos.y;
          }
          curPos.y += humanVelYRef.current * dt;
          if (curPos.y > playerAirbornePeakY) {
            playerAirbornePeakY = curPos.y;
          }
          if (curPos.y + 1.65 > ceilingY) {
            curPos.y = Math.max(floorY, ceilingY - 1.65);
            if (humanVelYRef.current > 0) humanVelYRef.current = 0;
          }
          humanVelYRef.current -= gravityAccel * dt; // Gravity
          if (curPos.y <= floorY) {
            const fallDistance = playerAirbornePeakY - floorY;
            curPos.y = floorY;
            humanVelYRef.current = 0;
            playerAirbornePeakY = floorY;

            // Proportional partial and lethal fall damage system:
            // - Safe fall height: up to 5.0m (1 to 1.5 stories / jumping off curbs, crates, fences) deals 0 damage
            // - Partial damage: falls between 5.0m and 20.0m deal proportional HP damage
            // - Fatal fall height: 20.0m+ deals 100% full health lethal damage
            const safeFallHeight = 5.0;
            const fatalFallHeight = 20.0;
            if (fallDistance > safeFallHeight && !isExplodingRef.current && respawnProtectionTimerRef.current <= 0) {
              const isInvincible = Boolean(stateRef.current.invincibleMode && !stateRef.current.platformerMode);
              if (!isInvincible) {
                const excessHeight = fallDistance - safeFallHeight;
                const heightSpan = fatalFallHeight - safeFallHeight; // 15.0m span
                // Proportional damage from ~7 HP at 6m up to 100 HP at 20m
                let damage = Math.min(100, Math.max(7, Math.round((excessHeight / heightSpan) * 100)));
                const isCityMode = !stateRef.current.platformerMode && !stateRef.current.pvpConfig?.active;
                if (isCityMode) {
                  // In City mode: double effective health halves fall damage while keeping max HP at 100
                  damage = Math.round(damage * 0.5);
                }
                const currentHp = playerHealthRef.current;
                const nextHp = Math.max(0, currentHp - damage);
                playerHealthRef.current = nextHp;
                setPlayerHealth(nextHp);

                cameraShakeRef.current = Math.min(0.85, cameraShakeRef.current + (damage / 100) * 0.65);
                triggerDamageFlash(Math.min(0.85, (damage / 100) * 0.75));

                if (nextHp <= 0) {
                  triggerPlayerDeath(
                    'DIED FROM FALL DAMAGE',
                    'You fell from a great height.'
                  );
                } else {
                  // Non-fatal fall landing: silent impact without explosion or debris
                }
              }
            }
          }
        } else {
          playerAirbornePeakY = curPos.y;
        }

        const curYaw = cameraYawRef.current;
        const forwardVec = new THREE.Vector3(Math.sin(curYaw), 0, Math.cos(curYaw)).normalize();
        const rightVec = new THREE.Vector3(-Math.cos(curYaw), 0, Math.sin(curYaw)).normalize();

        const moveVec = new THREE.Vector3()
          .addScaledVector(forwardVec, inputForward)
          .addScaledVector(rightVec, inputRight);
        if (moveVec.lengthSq() > 0.001) moveVec.normalize();

        const targetVelX = moveVec.x * walkSpeed;
        const targetVelZ = moveVec.z * walkSpeed;

        const isOnGround = curPos.y <= floorY + 0.18;
        if (isOnGround && humanVelYRef.current <= 0.15) {
          groundCoyoteTimer = 0.15;
        } else {
          groundCoyoteTimer = Math.max(0, groundCoyoteTimer - dt);
        }

        // Remove inertia for walking on ground, but keep it for jumping/airborne movement
        if (isOnGround) {
          if (isWalking) {
            humanVelXZRef.current.set(targetVelX, targetVelZ);
          } else {
            humanVelXZRef.current.set(0, 0);
          }
        } else {
          // In midair / jumping: keep momentum when letting go, but lose speed over time (air drag)
          if (isWalking) {
            const accelRate = 14.0;
            humanVelXZRef.current.x = THREE.MathUtils.lerp(humanVelXZRef.current.x, targetVelX, 1 - Math.exp(-accelRate * dt));
            humanVelXZRef.current.y = THREE.MathUtils.lerp(humanVelXZRef.current.y, targetVelZ, 1 - Math.exp(-accelRate * dt));
          } else {
            const airDrag = 1.6; // gradual speed loss over time in air
            humanVelXZRef.current.x *= Math.exp(-airDrag * dt);
            humanVelXZRef.current.y *= Math.exp(-airDrag * dt);
          }
        }

        const curWId = cur.platformerMode ? 'weapon-fist' : (cur.activeWeaponId || 'weapon-fist');
        const curMiscW = (MISC_ITEMS_CATALOG || []).find((m) => m.weaponPayload?.id === curWId)?.weaponPayload;
        const curWData = (WEAPONS_CATALOG || []).find((w) => w.id === curWId) || curMiscW;
        const equippedType = curWData?.type || 'unarmed';

        const moveX = humanVelXZRef.current.x * dt;
        const moveZ = humanVelXZRef.current.y * dt;

        if (Math.hypot(moveX, moveZ) > 0.0001) {
          const moved = movePersonWithWallCollision(
            curPos.x,
            curPos.z,
            curPos.y,
            moveX,
            moveZ,
            0.36
          );
          curPos.x = moved.x;
          curPos.z = moved.z;

          playerGrp.position.copy(curPos);

          if (humanVelXZRef.current.lengthSq() > 0.0001) {
            const targetRot = Math.atan2(humanVelXZRef.current.x, humanVelXZRef.current.y);
            let rotDiff = targetRot - playerGrp.rotation.y;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            playerGrp.rotation.y += rotDiff * Math.min(1, dt * 18);
            humanRotRef.current = playerGrp.rotation.y;
          }

          // Legs only walk if you are using the forward/movement button!
          if (isWalking) {
            walkPhase += dt * walkSpeed * 3;
            const swing = Math.sin(walkPhase) * 0.55;
            pLegL.rotation.x = swing;
            pLegR.rotation.x = -swing;
            pArmL.rotation.x = -swing * 0.75;
            pArmL.rotation.z = 0;
            if (cur.activeWeaponId === 'weapon-chainsaw') {
              pArmR.rotation.x = -Math.PI * 0.48 + Math.sin(clock.elapsedTime * 55) * 0.04;
            } else if (weaponAnimState.timer <= 0) {
              pArmR.rotation.x = swing * 0.75;
              pArmR.rotation.z = 0;
            }
          } else {
            pLegL.rotation.x = 0;
            pLegR.rotation.x = 0;
            pArmL.rotation.x = 0;
            pArmL.rotation.z = 0;
            if (cur.activeWeaponId === 'weapon-chainsaw') {
              pArmR.rotation.x = -Math.PI * 0.48 + Math.sin(clock.elapsedTime * 45) * 0.03;
            } else if (weaponAnimState.timer <= 0) {
              pArmR.rotation.x = 0;
              pArmR.rotation.z = 0;
            }
          }
        } else {
          humanVelXZRef.current.set(0, 0);
          playerGrp.position.copy(curPos);
          // Keep current rotation when stopping (do not reset to camera forward)
          playerGrp.rotation.y = humanRotRef.current;
          
          pLegL.rotation.x = 0;
          pLegR.rotation.x = 0;
          pArmL.rotation.x = 0;
          pArmL.rotation.z = 0;
          if (cur.activeWeaponId === 'weapon-chainsaw') {
            pArmR.rotation.x = -Math.PI * 0.48 + Math.sin(clock.elapsedTime * 45) * 0.03;
          } else if (weaponAnimState.timer <= 0) {
            pArmR.rotation.x = 0;
            pArmR.rotation.z = 0;
          }
        }

        // Update Direct Vertical Drop-Shadow & Landing Ring under the player on Obby platforms!
        if (cur.platformerMode && activeObbyLevel && !isExplodingRef.current && !isFallingToCityInPlatformer) {
          let bestShadowPlatY = -99999;
          for (const p of activeObbyLevel.platforms) {
            if (
              Math.abs(curPos.x - p.curX) <= p.w * 0.5 + 0.36 &&
              Math.abs(curPos.z - p.curZ) <= p.d * 0.5 + 0.36 &&
              p.curY <= curPos.y + 0.35
            ) {
              if (p.curY > bestShadowPlatY) {
                bestShadowPlatY = p.curY;
              }
            }
          }
          if (bestShadowPlatY > -9000) {
            const hAbove = Math.max(0, curPos.y - bestShadowPlatY);
            const scaleFactor = THREE.MathUtils.clamp(1.0 - hAbove * 0.08, 0.55, 1.0);
            playerDropShadowGroup.visible = true;
            playerDropShadowGroup.position.set(curPos.x, bestShadowPlatY + 0.018, curPos.z);
            playerDropShadowGroup.scale.set(scaleFactor, 1, scaleFactor);
            dropShadowDiscMat.opacity = THREE.MathUtils.clamp(0.45 - hAbove * 0.06, 0.18, 0.45);
          } else {
            playerDropShadowGroup.visible = false;
          }
        } else {
          playerDropShadowGroup.visible = false;
        }

        // Reset weapon mesh local transform before applying active weapon animation
        if (playerWeaponMesh) {
          playerWeaponMesh.position.set(0, -0.56, 0.26);
          playerWeaponMesh.rotation.set(Math.PI / 2, 0, 0);
        }
        if (weaponAnimState.muzzleTimer > 0) {
          weaponAnimState.muzzleTimer = Math.max(0, weaponAnimState.muzzleTimer - dt);
        }
        if (playerMuzzleFlash) {
          playerMuzzleFlash.visible = weaponAnimState.muzzleTimer > 0;
          if (playerMuzzleFlash.visible) {
            playerMuzzleFlash.rotation.z += 25 * dt;
          }
        }
        if (fpMuzzleFlash) {
          fpMuzzleFlash.visible = weaponAnimState.muzzleTimer > 0;
          if (fpMuzzleFlash.visible) {
            fpMuzzleFlash.rotation.z += 25 * dt;
          }
        }

        // Equipped idle aiming pose when holding a firearm / launcher / hammer so it always looks ready in your hands!
        const isFirearm =
          equippedType === 'pistol' ||
          equippedType === 'smg' ||
          equippedType === 'rifle' ||
          equippedType === 'shotgun' ||
          equippedType === 'sniper' ||
          equippedType === 'minigun' ||
          equippedType === 'rpg' ||
          equippedType === 'cluster_launcher' ||
          equippedType === 'firework_cannon' ||
          equippedType === 'grapple_gun';
        if (isFirearm && weaponAnimState.timer <= 0) {
          pArmR.rotation.x = -Math.PI * 0.46;
          pArmR.rotation.z = 0;
          if (equippedType !== 'pistol' && equippedType !== 'grapple_gun') {
            pArmL.rotation.x = -Math.PI * 0.42;
            pArmL.rotation.z = 0.26;
          }
        }

        // Continuous forward chainsaw operation: stays on & held forward, and cuts trees / damages NPCs continuously!
        if (cur.activeWeaponId === 'weapon-chainsaw' && !cur.isMenuOpen) {
          const sawVibration = chainsawHolding ? 0.085 : 0.028;
          pArmR.rotation.x = -Math.PI * 0.48 + Math.sin(clock.elapsedTime * (chainsawHolding ? 78 : 42)) * sawVibration;
          pArmL.rotation.x = -Math.PI * 0.42 + Math.cos(clock.elapsedTime * (chainsawHolding ? 78 : 42)) * sawVibration;
          pArmL.rotation.z = 0.25;
          if (playerWeaponMesh) {
            playerWeaponMesh.position.z = 0.28 + (chainsawHolding ? 0.12 + Math.sin(clock.elapsedTime * 95) * 0.035 : 0);
          }
          chainsawCutCooldown = Math.max(0, chainsawCutCooldown - dt);
          if (chainsawCutCooldown <= 0) {
            const bladeX = curPos.x + Math.sin(humanRotRef.current) * 1.45;
            const bladeZ = curPos.z + Math.cos(humanRotRef.current) * 1.45;
            // Cut down any tree the running chainsaw blade touches (whether holding click or walking the running blade into a tree!)
            let cutAny = false;
            for (const t of forestTrees) {
              if (t.cut) continue;
              const dBlade = Math.hypot(t.x - bladeX, t.z - bladeZ);
              const dPlayer = Math.hypot(t.x - curPos.x, t.z - curPos.z);
              if (dBlade < (chainsawHolding ? 4.2 : 2.5) || (chainsawHolding && dPlayer < 3.8)) {
                cutDownTree(t, curPos.x, curPos.z);
                soundFX.playPlaceObject();
                cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.22);
                cutAny = true;
                break;
              }
            }
            if (chainsawHolding) {
              for (const npcItem of npcMeshes) {
                if (npcItem.dead) continue;
                const dNpc = Math.hypot(npcItem.group.position.x - bladeX, npcItem.group.position.z - bladeZ);
                if (dNpc <= 2.4) {
                  damageNpc(npcItem, 35, 'Lumberjack Chainsaw');
                  cutAny = true;
                }
              }
              for (const po of policeOfficers) {
                if (po.dead) continue;
                const dPo = Math.hypot(po.group.position.x - bladeX, po.group.position.z - bladeZ);
                if (dPo <= 2.4) {
                  damagePoliceOfficer(po, 35, 'Lumberjack Chainsaw');
                  cutAny = true;
                }
              }
              for (const pc of policeCruisers) {
                if (pc.destroyed) continue;
                const dPc = Math.hypot(pc.x - bladeX, pc.z - bladeZ);
                if (dPc <= 3.2) {
                  damagePoliceCruiser(pc, 45, 'Lumberjack Chainsaw');
                  cutAny = true;
                }
              }
              for (const pe of pvpEnemies) {
                if (pe.dead) continue;
                const dPe = Math.hypot(pe.x - bladeX, pe.z - bladeZ);
                if (dPe <= 2.4) {
                  damagePvpEnemy(pe, 35);
                  cutAny = true;
                }
              }
            }
            if (cutAny) {
              chainsawCutCooldown = 0.22;
            }
          }
        } else if (weaponAnimState.timer > 0) {
          // Distinct per-weapon 3D & 1st-Person Attack Animations!
          weaponAnimState.timer = Math.max(0, weaponAnimState.timer - dt);
          punchAnimTimer = weaponAnimState.timer;
          const progress = 1 - weaponAnimState.timer / Math.max(0.01, weaponAnimState.duration);
          const aType = weaponAnimState.type;

          if (aType === 'gravity_hammer') {
            // Two-handed overhead raise (0..0.35) then violent slam straight into the ground (0.35..0.75) and recovery (0.75..1.0)!
            let slamPitch = 0;
            if (progress < 0.35) {
              const tUp = progress / 0.35;
              slamPitch = -THREE.MathUtils.lerp(Math.PI * 0.4, Math.PI * 0.96, tUp);
            } else if (progress < 0.72) {
              const tDown = (progress - 0.35) / 0.37;
              slamPitch = THREE.MathUtils.lerp(-Math.PI * 0.96, -0.12, Math.pow(tDown, 1.6));
            } else {
              const tRec = (progress - 0.72) / 0.28;
              slamPitch = THREE.MathUtils.lerp(-0.12, -Math.PI * 0.45, tRec);
            }
            pArmR.rotation.x = slamPitch;
            pArmL.rotation.x = slamPitch;
            pArmL.rotation.z = 0.24;
            if (playerWeaponMesh) {
              playerWeaponMesh.rotation.x = Math.PI / 2 + (progress >= 0.35 && progress < 0.8 ? 0.55 : -0.2);
            }
          } else if (aType === 'melee') {
            // Wide diagonal / horizontal power slash across the body!
            const slashArc = Math.sin(progress * Math.PI);
            const sweep = Math.cos(progress * Math.PI);
            pArmR.rotation.x = -Math.PI * 0.52 - slashArc * 0.45;
            pArmR.rotation.z = sweep * 0.85;
            if (playerWeaponMesh) {
              playerWeaponMesh.rotation.x = Math.PI / 2 + slashArc * 0.65;
              playerWeaponMesh.rotation.z = sweep * 0.55;
            }
          } else if (aType === 'unarmed') {
            // Alternating left/right rapid hook & jab punches!
            const jab = Math.sin(progress * Math.PI);
            if (weaponAnimState.handSide > 0) {
              pArmR.rotation.x = -jab * 1.65;
              pArmR.rotation.z = -jab * 0.18;
              pArmL.rotation.x = -0.55;
            } else {
              pArmL.rotation.x = -jab * 1.65;
              pArmL.rotation.z = jab * 0.18;
              pArmR.rotation.x = -0.55;
            }
          } else if (aType === 'grenade' || aType === 'timebomb' || aType === 'remotebomb') {
            // Overhand wind-up behind shoulder & hurl forward!
            if (progress < 0.4) {
              pArmR.rotation.x = -THREE.MathUtils.lerp(0.4, Math.PI * 0.88, progress / 0.4);
            } else {
              pArmR.rotation.x = THREE.MathUtils.lerp(-Math.PI * 0.88, -0.35, (progress - 0.4) / 0.6);
            }
          } else if (aType === 'orbital_laser' || aType === 'meteor_staff') {
            // Skyward beacon/staff raise channeling energy!
            const raise = Math.sin(progress * Math.PI);
            pArmR.rotation.x = -Math.PI * 0.45 - raise * 0.95;
            pArmL.rotation.x = -raise * 0.65;
          } else {
            // Firearms, Shotgun, Sniper, RPG, Minigun, Cluster Launcher, Firework Cannon, Grapple Gun:
            // Distinct firearm recoil kickback + upward muzzle climb!
            const recoilCurve = Math.sin(Math.min(1, progress * 1.35) * Math.PI);
            const isHeavy =
              aType === 'rpg' ||
              aType === 'shotgun' ||
              aType === 'sniper' ||
              aType === 'cluster_launcher' ||
              aType === 'firework_cannon';
            const kickAngle = isHeavy ? 0.44 : aType === 'minigun' ? 0.14 : 0.26;
            const kickBackZ = isHeavy ? 0.16 : aType === 'minigun' ? 0.06 : 0.1;
            pArmR.rotation.x = -Math.PI * 0.48 - recoilCurve * kickAngle;
            if (aType !== 'pistol' && aType !== 'grapple_gun') {
              pArmL.rotation.x = -Math.PI * 0.44 - recoilCurve * (kickAngle * 0.75);
              pArmL.rotation.z = 0.26;
            }
            if (playerWeaponMesh) {
              playerWeaponMesh.position.z = 0.26 - recoilCurve * kickBackZ;
              playerWeaponMesh.rotation.x = Math.PI / 2 - recoilCurve * (kickAngle * 0.85);
              if (aType === 'minigun') {
                playerWeaponMesh.rotation.z = clock.elapsedTime * 36.0;
              }
            }
          }
        }

        const yaw = smoothCamYawRef.current;
        const basePitch = smoothCamPitchRef.current;
        const baseDist = cameraDistRef.current;

        if (cur.isFirstPerson) {
          const eyeY = curPos.y + 1.58;
          // Allow looking all the way straight up (-86°) and straight down (+86°)!
          const lookPitch = THREE.MathUtils.clamp(basePitch - 0.35, -1.48, 1.48);
          const lookX = curPos.x + Math.sin(yaw) * Math.cos(lookPitch) * 20;
          const lookY = eyeY - Math.sin(lookPitch) * 20;
          const lookZ = curPos.z + Math.cos(yaw) * Math.cos(lookPitch) * 20;
          camera.position.set(curPos.x, eyeY, curPos.z);
          camera.lookAt(lookX, lookY, lookZ);
          playerGrp.rotation.y = yaw;
          humanRotRef.current = yaw;

          // Update 1st-Person Weapon Viewmodel in front of the camera so every weapon & animation is visible in 1st-person!
          if (fpWeaponMesh && !isExplodingRef.current) {
            fpWeaponGroup.visible = true;
            camera.updateMatrixWorld();
            const camQuat = camera.quaternion;
            const wProgress =
              weaponAnimState.timer > 0
                ? 1 - weaponAnimState.timer / Math.max(0.01, weaponAnimState.duration)
                : 0;
            const wArc = Math.sin(wProgress * Math.PI);
            const aType = weaponAnimState.type;

            let offsetRight = isAimingRef.current ? 0.04 : 0.28;
            let offsetDown = isAimingRef.current ? -0.16 : -0.26;
            let offsetFwd = isAimingRef.current ? 0.46 : 0.56;
            let rotX = 0;
            let rotY = Math.PI;
            let rotZ = 0;

            if (cur.activeWeaponId === 'weapon-chainsaw') {
              const vib = chainsawHolding ? 0.018 : 0.006;
              offsetFwd = 0.58 + (chainsawHolding ? 0.08 : 0) + Math.sin(clock.elapsedTime * 80) * vib;
              offsetDown = -0.24 + Math.cos(clock.elapsedTime * 80) * vib;
            } else if (aType === 'unarmed' && weaponAnimState.timer <= 0) {
              // Natural boxer guard stance when unarmed: arm anchored to lower edge
              offsetRight = 0.22;
              offsetDown = -0.32;
              offsetFwd = 0.38;
              rotX = 0.15;
              rotY = Math.PI - 0.12;
            } else if (weaponAnimState.timer > 0) {
              if (aType === 'gravity_hammer') {
                if (wProgress < 0.35) {
                  const tUp = wProgress / 0.35;
                  offsetDown = THREE.MathUtils.lerp(-0.22, 0.28, tUp);
                  rotX = THREE.MathUtils.lerp(0.2, 0.95, tUp);
                } else if (wProgress < 0.75) {
                  const tDown = (wProgress - 0.35) / 0.4;
                  offsetDown = THREE.MathUtils.lerp(0.28, -0.52, Math.pow(tDown, 1.5));
                  offsetFwd = THREE.MathUtils.lerp(0.52, 0.78, tDown);
                  rotX = THREE.MathUtils.lerp(0.95, -1.15, Math.pow(tDown, 1.5));
                } else {
                  const tRec = (wProgress - 0.75) / 0.25;
                  offsetDown = THREE.MathUtils.lerp(-0.52, -0.26, tRec);
                  rotX = THREE.MathUtils.lerp(-1.15, 0, tRec);
                }
              } else if (aType === 'melee') {
                offsetRight = 0.28 - Math.sin(wProgress * Math.PI) * 0.42;
                offsetFwd = 0.56 + wArc * 0.22;
                rotZ = Math.cos(wProgress * Math.PI) * 0.85;
                rotX = -wArc * 0.65;
              } else if (aType === 'unarmed') {
                // Natural forward jab & cross punch extending from screen edge with anatomical corkscrew rotation
                offsetRight = weaponAnimState.handSide * 0.18 - wArc * 0.04;
                offsetFwd = 0.38 + wArc * 0.34;
                offsetDown = -0.28 + wArc * 0.06;
                rotX = 0.12 - wArc * 0.18;
                rotY = Math.PI + (weaponAnimState.handSide > 0 ? -0.1 : 0.1);
                rotZ = (weaponAnimState.handSide > 0 ? -1 : 1) * (0.08 + wArc * 0.28);
              } else if (aType === 'grenade' || aType === 'timebomb' || aType === 'remotebomb') {
                offsetFwd = 0.52 + Math.sin(wProgress * Math.PI) * 0.32;
                rotX = -wArc * 0.85;
              } else if (aType === 'orbital_laser' || aType === 'meteor_staff') {
                offsetDown = -0.22 + wArc * 0.35;
                rotX = wArc * 0.75;
              } else {
                // Firearm recoil kickback & muzzle climb in 1st-person
                const isHeavy =
                  aType === 'rpg' ||
                  aType === 'shotgun' ||
                  aType === 'sniper' ||
                  aType === 'cluster_launcher' ||
                  aType === 'firework_cannon';
                offsetFwd = 0.56 - wArc * (isHeavy ? 0.16 : 0.09);
                offsetDown = -0.26 + wArc * (isHeavy ? 0.09 : 0.04);
                rotX = wArc * (isHeavy ? 0.36 : 0.18);
                if (aType === 'minigun') {
                  rotZ = clock.elapsedTime * 36.0;
                }
              }
            }

            const localOffset = new THREE.Vector3(offsetRight, offsetDown, -offsetFwd).applyQuaternion(camQuat);
            fpWeaponGroup.position.copy(camera.position).add(localOffset);
            fpWeaponGroup.quaternion.copy(camQuat);
            fpWeaponMesh.rotation.set(rotX, rotY, rotZ);
          }
        } else {
          fpWeaponGroup.visible = false;
          const px = playerGrp.position.x;
          const pz = playerGrp.position.z;
          let isInside = false;
          for (const bldg of destructibleBuildingsRef.current) {
            if (
              !bldg.destroyed &&
              Math.abs(px - bldg.cx) <= bldg.w * 0.5 &&
              Math.abs(pz - bldg.cz) <= bldg.d * 0.5 &&
              curPos.y < bldg.h
            ) {
              isInside = true;
              break;
            }
          }
          isInsideBuildingRef.current = isInside;

          // Keep house ceilings & roofs visible at all times when inside houses!
          houseRoofMeshesRef.current.forEach((rMesh) => {
            rMesh.visible = true;
          });

          const effectivePitch = THREE.MathUtils.clamp(
            isInside ? Math.min(basePitch, 0.85) : basePitch,
            -1.38,
            1.48
          );
          const effectiveDist = isInside
            ? Math.min(baseDist, 5.8)
            : isAimingRef.current
            ? Math.min(baseDist, 3.0)
            : baseDist;

          // When aiming in 3rd person, align player character orientation & shift camera over right shoulder
          const shoulderOffsetX = isAimingRef.current ? Math.cos(yaw) * 0.42 : 0;
          const shoulderOffsetZ = isAimingRef.current ? -Math.sin(yaw) * 0.42 : 0;

          if (isAimingRef.current || isHoldingLeftClick) {
            playerGrp.rotation.y = yaw;
            humanRotRef.current = yaw;
          }

          const camTarget = new THREE.Vector3(
            playerGrp.position.x + shoulderOffsetX * 0.6,
            curPos.y + (isInside ? 1.3 : cur.platformerMode ? 1.72 : 1.55),
            playerGrp.position.z + shoulderOffsetZ * 0.6
          );
          const camPos = new THREE.Vector3(
            playerGrp.position.x + shoulderOffsetX - Math.sin(yaw) * Math.cos(effectivePitch) * effectiveDist,
            Math.max(curPos.y + 0.2, camTarget.y + Math.sin(effectivePitch) * effectiveDist),
            playerGrp.position.z + shoulderOffsetZ - Math.cos(yaw) * Math.cos(effectivePitch) * effectiveDist
          );
          camera.position.copy(camPos);
          camera.lookAt(camTarget);
        }



        // Check proximity for on-foot HUD prompts (Only show vehicles that have been spawned, and NEVER show city mailbox/shop prompts in Battle Mode!)
        const hPos = humanPosRef.current;
        const isPvpMode = Boolean(cur.pvpConfig?.active);
        const distToHeli = hasSpawnedHeliRef.current
          ? Math.hypot(hPos.x - helicopterPhysicsRef.current.x, hPos.z - helicopterPhysicsRef.current.z)
          : 99999;
        const distToPlane = hasSpawnedPlaneRef.current
          ? Math.hypot(hPos.x - planePhysicsRef.current.x, hPos.z - planePhysicsRef.current.z)
          : 99999;
        const distToMotorcycle = hasSpawnedMotorcycleRef.current
          ? Math.hypot(hPos.x - motorcyclePhysicsRef.current.x, hPos.z - motorcyclePhysicsRef.current.z)
          : 99999;
        let distToCar =
          hasSpawnedCarRef.current && activeCarGroupRef.current?.visible
            ? Math.hypot(hPos.x - carPhysicsRef.current.x, hPos.z - carPhysicsRef.current.z)
            : 99999;
        if (!isPvpMode) {
          for (const pk of parkedCars) {
            if (pk.destroyed || !pk.group.visible) continue;
            const dPk = Math.hypot(hPos.x - pk.x, hPos.z - pk.z);
            if (dPk < distToCar) distToCar = dPk;
          }
        }

        let nearbyMailboxPrompt: { text: string; icon: string; actionId: string } | null = null;
        let nearbyNpcPrompt: { text: string; icon: string; actionId: string } | null = null;
        let nearbyHijackCarPrompt: { text: string; icon: string; actionId: string } | null = null;
        let nearbyGroceryPrompt: { text: string; icon: string; actionId: string } | null = null;
        let nearbyShopPrompt: { text: string; icon: string; actionId: string } | null = null;

        if (!isPvpMode && !cur.platformerMode) {
          for (const mb of mailboxesRef.current) {
            if (Math.hypot(hPos.x - mb.x, hPos.z - mb.z) < 3.6 && hPos.y < 5) {
              const isClaimed = claimedHomeRef.current.name === mb.name;
              nearbyMailboxPrompt = {
                text: isClaimed
                  ? `Claimed Home: ${mb.name}`
                  : `Press [E] at Mailbox to Claim ${mb.name}`,
                icon: '📬',
                actionId: `claim_${mb.name}`,
              };
              break;
            }
          }

          for (const npc of npcMeshes) {
            if (npc.dead || npc.isHostile) continue;
            if (hPos.distanceTo(npc.group.position) < 3.4) {
              nearbyNpcPrompt = {
                text: `Press [E] to Talk to ${npc.data.name} · Left-Click to Attack`,
                icon: '💬',
                actionId: `npc_${npc.data.id}`,
              };
              break;
            }
          }

          for (const tc of npcTrafficCars) {
            if (tc.destroyed || tc.hijacked || !tc.group.visible) continue;
            const dTc = Math.hypot(hPos.x - tc.x, hPos.z - tc.z);
            if (dTc < 5.6) {
              nearbyHijackCarPrompt = {
                text: `Press [E] to Hijack ${tc.carSpec.name}`,
                icon: '🚗',
                actionId: `hijack_${tc.id}`,
              };
              break;
            }
          }
          if (!nearbyHijackCarPrompt) {
            for (const pc of policeCruisers) {
              if (pc.destroyed || !pc.group.visible) continue;
              const dPc = Math.hypot(hPos.x - pc.x, hPos.z - pc.z);
              if (dPc < 5.6) {
                nearbyHijackCarPrompt = {
                  text: 'Press [E] to Hijack Police Cruiser',
                  icon: '🚓',
                  actionId: 'hijack_police',
                };
                break;
              }
            }
          }

          for (const g of groceriesRef.current) {
            if (Math.hypot(hPos.x - g.x, hPos.z - g.z) < 6.0 && hPos.y < 3) {
              nearbyGroceryPrompt = { text: 'Press [E] to Grab Free Ingredients', icon: '🛒', actionId: 'grocery' };
              break;
            }
          }

          for (const b of destructibleBuildingsRef.current) {
            if (b.destroyed) continue;
            const dist = Math.hypot(focusX - b.cx, focusZ - b.cz);
            if (dist < 8.0 && focusY < 3) {
              if (b.isRestaurant) {
                nearbyShopPrompt = { text: `Press [E] to Order Free Margherita Pizza 🍕`, icon: '🍕', actionId: `shop_restaurant` };
                break;
              }
              if (b.isDiner) {
                nearbyShopPrompt = { text: `Press [E] to Order Free Diner Burger 🍔`, icon: '🍔', actionId: `shop_diner` };
                break;
              }
              if (b.isCafe) {
                nearbyShopPrompt = { text: `Press [E] to Order Free Coffee & Pancakes 🥞`, icon: '🥞', actionId: `shop_cafe` };
                break;
              }
              if (b.isHardware) {
                nearbyShopPrompt = { text: `Press [E] to Claim Free High-Tech Tool 🛠️`, icon: '🛠️', actionId: `shop_hardware` };
                break;
              }
              if (b.isGasStation) {
                nearbyShopPrompt = { text: `Press [E] to Grab Free Energy Fuel ⚡`, icon: '⚡', actionId: `shop_gas` };
                break;
              }
            }
          }
        }

        if (nearbyMailboxPrompt) {
          updatePromptIfChanged(nearbyMailboxPrompt);
        } else if (nearbyNpcPrompt) {
          updatePromptIfChanged(nearbyNpcPrompt);
        } else if (nearbyGroceryPrompt) {
          updatePromptIfChanged(nearbyGroceryPrompt);
        } else if (nearbyShopPrompt) {
          updatePromptIfChanged(nearbyShopPrompt);
        } else if (distToPlane < 6.5) {
          updatePromptIfChanged({
            text: 'Press [E] to Board Airplane (E/Q Hold Throttle · S/W Pitch · A/D Roll · F Exit)',
            icon: '✈️',
            actionId: 'plane',
          });
        } else if (distToHeli < 5.5) {
          updatePromptIfChanged({
            text: 'Press [E] to Board Helicopter (E Ascend · Q Descend · WASD Fly · F Exit)',
            icon: '🚁',
            actionId: 'heli',
          });
        } else if (distToMotorcycle < 3.6) {
          updatePromptIfChanged({
            text: 'Press [E] to Ride Motorcycle (WASD Ride & Lean · Space Wheelie · F Exit)',
            icon: '🏍️',
            actionId: 'motorcycle',
          });
        } else if (distToCar < 4.2) {
          updatePromptIfChanged({ text: 'Press [E] to Enter Car (WASD Drive · Space Brake · F Exit)', icon: '🚗', actionId: 'car' });
        } else if (nearbyHijackCarPrompt) {
          updatePromptIfChanged(nearbyHijackCarPrompt);
        } else {
          updatePromptIfChanged(null);
        }
      }

      if (curVehicle) {
        fpWeaponGroup.visible = false;
      }

      // =======================================================================
      // 3. WEAPON PROJECTILES, BOMBS, BUILDING DESTRUCTION & HOSTILE NPC COMBAT
      // =======================================================================
      // Update Active Grenades, Timed C4 Bombs & Remote Detonation Bombs
      // Respects skyscraper/building floor levels & walls so bombs stay on the exact level you put them on without falling through!
      for (let i = activeBombs.length - 1; i >= 0; i--) {
        const b = activeBombs[i];
        if (!b || !b.mesh) {
          activeBombs.splice(i, 1);
          continue;
        }
        if (b.exploded) {
          activeBombs.splice(i, 1);
          continue;
        }
        const skyFloorY = getSkyscraperFloorOrStairHeight(
          b.pos.x,
          b.pos.y,
          b.pos.z,
          skyscrapersRef.current
        );
        const effectiveFloorY = Math.max(0, b.minFloorY ?? 0, skyFloorY ?? 0);
        const restY = effectiveFloorY + 0.12;

        if (b.vel.lengthSq() > 0.001 || b.pos.y > restY) {
          b.vel.y -= 18.0 * dt;
          const stepX = b.vel.x * dt;
          const stepZ = b.vel.z * dt;
          const movedXZ = movePersonWithWallCollision(
            b.pos.x,
            b.pos.z,
            Math.max(effectiveFloorY + 0.25, b.pos.y),
            stepX,
            stepZ,
            0.22
          );
          if (Math.abs(movedXZ.x - (b.pos.x + stepX)) > 0.001) {
            b.vel.x = -b.vel.x * 0.3;
          }
          if (Math.abs(movedXZ.z - (b.pos.z + stepZ)) > 0.001) {
            b.vel.z = -b.vel.z * 0.3;
          }
          b.pos.x = movedXZ.x;
          b.pos.z = movedXZ.z;
          b.pos.y += b.vel.y * dt;

          const updatedSkyFloorY = getSkyscraperFloorOrStairHeight(
            b.pos.x,
            b.pos.y,
            b.pos.z,
            skyscrapersRef.current
          );
          const updatedRestY = Math.max(0, b.minFloorY ?? 0, updatedSkyFloorY ?? 0) + 0.12;

          if (b.pos.y <= updatedRestY) {
            b.pos.y = updatedRestY;
            if (b.type === 'grenade' && Math.abs(b.vel.y) > 2.0) {
              b.vel.y = -b.vel.y * 0.35;
              b.vel.x *= 0.55;
              b.vel.z *= 0.55;
            } else {
              b.vel.set(0, 0, 0);
            }
          }
          b.mesh.position.copy(b.pos);
        }
        if (b.type === 'grenade' || b.type === 'timebomb') {
          b.timer -= dt;
          if (b.timer <= 0) {
            b.exploded = true;
            const bRadius = b.type === 'grenade' ? 14.0 : 18.0;
            triggerBombExplosion(b.pos.x, b.pos.y, b.pos.z, bRadius);
            projectilesGroup.remove(b.mesh);
            activeBombs.splice(i, 1);
          }
        }
      }

      // Helper for continuous segment-to-point distance in XZ plane so fast bullets NEVER tunnel past short-range targets!
      const distPointToSegment2D = (
        px: number,
        pz: number,
        ax: number,
        az: number,
        bx: number,
        bz: number
      ): number => {
        const abx = bx - ax;
        const abz = bz - az;
        const lenSq = abx * abx + abz * abz;
        if (lenSq < 0.00001) return Math.hypot(px - ax, pz - az);
        const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
        return Math.hypot(px - (ax + t * abx), pz - (az + t * abz));
      };

      // Update Fired Bullets & RPG Rockets
      for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const proj = activeProjectiles[i];
        if (!proj || !proj.mesh) {
          activeProjectiles.splice(i, 1);
          continue;
        }
        const prevX = proj.mesh.position.x;
        const prevY = proj.mesh.position.y;
        const prevZ = proj.mesh.position.z;
        proj.life += dt;
        proj.mesh.position.addScaledVector(proj.vel, dt);
        const curX = proj.mesh.position.x;
        const curY = proj.mesh.position.y;
        const curZ = proj.mesh.position.z;

        let hitSomething = false;

        if (proj.isNpcBullet) {
          // Hostile projectile hitting player or player's vehicle (only in Battle Mode / Police):
          const pTargetPos = getActivePlayerWorldPos();
          const isAircraft = activeVehicle === 'helicopter' || activeVehicle === 'plane';
          const hitRadius = isAircraft ? 3.8 : curVehicle ? 2.4 : 0.9;
          const hitHeight = isAircraft ? 3.0 : curVehicle ? 2.2 : 1.2;
          const distToPlayer = distPointToSegment2D(pTargetPos.x, pTargetPos.z, prevX, prevZ, curX, curZ);
          if (distToPlayer < hitRadius && Math.abs(curY - (pTargetPos.y + 1.0)) < hitHeight) {
            cameraShakeRef.current = Math.max(cameraShakeRef.current, proj.isExplosive ? 0.45 : 0.25);
            soundFX.playPlaceObject();
            const rawBulletDmg = proj.damage || (proj.isExplosive ? 42 : 18);
            const isCityMode = !cur.platformerMode && !cur.pvpConfig?.active;
            const effectiveBulletDmg = cur.pvpConfig?.active
              ? (proj.isExplosive ? rawBulletDmg * 0.45 : rawBulletDmg * 0.22)
              : isCityMode
              ? rawBulletDmg * 0.5
              : rawBulletDmg;
            if (curVehicle) {
              if (activeVehicle === 'helicopter') {
                const nextHeliHp = Math.max(0, heliHealthRef.current - effectiveBulletDmg);
                heliHealthRef.current = nextHeliHp;
                setHeliHealth(nextHeliHp);
                if (nextHeliHp <= 0) {
                  setExplodingVehicleType('helicopter');
                  triggerHouseExplosion(pTargetPos.x, pTargetPos.z, pTargetPos.y, 'HELICOPTER SHOT DOWN', 'Enemy gunfire and RPGs destroyed your helicopter!');
                }
              } else if (activeVehicle === 'plane') {
                const nextPlaneHp = Math.max(0, planeHealthRef.current - effectiveBulletDmg);
                planeHealthRef.current = nextPlaneHp;
                setPlaneHealth(nextPlaneHp);
                if (nextPlaneHp <= 0) {
                  setExplodingVehicleType('plane');
                  triggerHouseExplosion(pTargetPos.x, pTargetPos.z, pTargetPos.y, 'AIRCRAFT SHOT DOWN', 'Enemy ground fire shot down your aircraft in battle!');
                }
              } else {
                const dmg = activeVehicle === 'motorcycle' ? effectiveBulletDmg * 2 : effectiveBulletDmg;
                const nextCarHp = Math.max(0, carHealthRef.current - dmg);
                carHealthRef.current = nextCarHp;
                setCarHealth(nextCarHp);
                if (nextCarHp <= 0) {
                  setExplodingVehicleType('car');
                  triggerHouseExplosion(pTargetPos.x, pTargetPos.z, pTargetPos.y, 'VEHICLE DESTROYED', 'Enemy fire destroyed your vehicle!');
                }
              }
            } else {
              const nextHp = Math.max(0, playerHealthRef.current - effectiveBulletDmg);
              playerHealthRef.current = nextHp;
              lastDisplayedHp = Math.round(nextHp);
              setPlayerHealth(nextHp);
              triggerDamageFlash(0.5);
              if (nextHp <= 0) {
                triggerPlayerAttackerDeath(proj.weaponName || 'Hostile Attacker');
              }
            }
            hitSomething = true;
          }
        } else {
          // Player projectile hitting NPC (continuous segment check on visible NPCs so point-blank / short-range / long-range shots always register!)
          for (const npcItem of npcMeshes) {
            if (!npcItem.dead && npcItem.group.visible) {
              const dist = distPointToSegment2D(
                npcItem.group.position.x,
                npcItem.group.position.z,
                prevX,
                prevZ,
                curX,
                curZ
              );
              const npcY = npcItem.group.position.y;
              const minSegY = Math.min(prevY, curY);
              const maxSegY = Math.max(prevY, curY);
              if (dist < 1.55 && maxSegY >= npcY - 0.4 && minSegY <= npcY + 2.6) {
                if (!proj.alreadyHitTarget) {
                  damageNpc(npcItem, proj.damage, proj.isDisaster ? 'natural_disaster' : proj.weaponName);
                }
                if (proj.isExplosive) {
                  triggerBombExplosion(curX, curY, curZ, 18.0, proj.isDisaster);
                }
                hitSomething = true;
                break;
              }
            }
          }

          // Player projectile hitting NPC Traffic Car -> Explode car & award +1 star!
          if (!hitSomething) {
            for (const tc of npcTrafficCars) {
              if (!tc.destroyed && tc.group.visible && Math.hypot(proj.mesh.position.x - tc.x, proj.mesh.position.z - tc.z) < 2.2 && proj.mesh.position.y <= 2.2) {
                if (proj.isExplosive) {
                  triggerBombExplosion(tc.x, 1.0, tc.z, 18.0, proj.isDisaster);
                } else {
                  tc.destroyed = true;
                  tc.respawnTimer = 16.0;
                  tc.group.visible = false;
                  triggerCarExplosionAt(tc.x, 1.0, tc.z, 34);
                  if (!proj.isDisaster) {
                    reportPlayerCrime(1);
                    stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: tc.x, y: 1.0, z: tc.z });
                  }
                }
                hitSomething = true;
                break;
              }
            }
          }

          // Player projectile hitting Parked Car or Player's Spawned Car on foot -> Explode & disappear!
          if (!hitSomething) {
            for (const pk of parkedCars) {
              if (!pk.destroyed && pk.group.visible && Math.hypot(proj.mesh.position.x - pk.x, proj.mesh.position.z - pk.z) < 2.2 && proj.mesh.position.y <= 2.2) {
                if (proj.isExplosive) {
                  triggerBombExplosion(pk.x, 1.0, pk.z, 18.0, proj.isDisaster);
                } else {
                  pk.destroyed = true;
                  pk.group.visible = false;
                  scene.remove(pk.group);
                  triggerCarExplosionAt(pk.x, 1.0, pk.z, 34);
                  if (!proj.isDisaster) {
                    reportPlayerCrime(1);
                    stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: pk.x, y: 1.0, z: pk.z });
                  }
                }
                hitSomething = true;
                break;
              }
            }
            if (!hitSomething && !curVehicle && hasSpawnedCarRef.current && activeCarGroupRef.current?.visible) {
              if (Math.hypot(proj.mesh.position.x - carPhysicsRef.current.x, proj.mesh.position.z - carPhysicsRef.current.z) < 2.2 && proj.mesh.position.y <= 2.2) {
                if (proj.isExplosive) {
                  triggerBombExplosion(carPhysicsRef.current.x, 1.0, carPhysicsRef.current.z, 18.0, proj.isDisaster);
                } else {
                  triggerCarExplosionAt(carPhysicsRef.current.x, 1.0, carPhysicsRef.current.z, 44);
                  hasSpawnedCarRef.current = false;
                  activeCarGroupRef.current.visible = false;
                  scene.remove(activeCarGroupRef.current);
                  activeCarGroupRef.current = null;
                  if (!proj.isDisaster) {
                    reportPlayerCrime(1);
                  }
                }
                hitSomething = true;
              }
            }
          }

          // Player projectile hitting Police Officer (continuous segment check so bullets never tunnel when both are shooting!)
          if (!hitSomething) {
            for (const po of policeOfficers) {
              if (!po.dead) {
                const dist = distPointToSegment2D(
                  po.group.position.x,
                  po.group.position.z,
                  prevX,
                  prevZ,
                  curX,
                  curZ
                );
                const poY = po.group.position.y;
                const minSegY = Math.min(prevY, curY);
                const maxSegY = Math.max(prevY, curY);
                if (dist < 1.55 && maxSegY >= poY - 0.4 && minSegY <= poY + 2.6) {
                  if (!proj.alreadyHitTarget) {
                    damagePoliceOfficer(po, proj.damage, proj.weaponName, proj.isDisaster);
                  }
                  if (proj.isExplosive) {
                    triggerBombExplosion(po.group.position.x, poY + 1.0, po.group.position.z, 16.0, proj.isDisaster);
                  }
                  hitSomething = true;
                  break;
                }
              }
            }
          }

          // Player projectile hitting Police Cruiser -> Explode car identically to normal traffic car & award +1 star!
          if (!hitSomething) {
            for (const pc of policeCruisers) {
              if (!pc.destroyed && Math.hypot(proj.mesh.position.x - pc.x, proj.mesh.position.z - pc.z) < 2.2 && proj.mesh.position.y <= 2.2) {
                if (proj.isExplosive) {
                  triggerBombExplosion(pc.x, 1.0, pc.z, 18.0, proj.isDisaster);
                } else {
                  pc.destroyed = true;
                  pc.group.visible = false;
                  triggerCarExplosionAt(pc.x, 1.0, pc.z, 34);
                  if (!proj.isDisaster) {
                    reportPlayerCrime(1);
                    stateRef.current.onEarnMoney?.(6000, 'Destroyed Police Car', { x: pc.x, y: 1.0, z: pc.z });
                  }
                }
                hitSomething = true;
                break;
              }
            }
          }

          // Player projectile hitting PvP Enemy (continuous segment check so bullets never miss when enemies are shooting!)
          if (!hitSomething) {
            for (const pe of pvpEnemies) {
              if (!pe.dead) {
                const dist = distPointToSegment2D(
                  pe.x,
                  pe.z,
                  prevX,
                  prevZ,
                  curX,
                  curZ
                );
                const maxH = pe.kind === 'plane' || pe.kind === 'helicopter' ? 5.2 : 2.6;
                const minSegY = Math.min(prevY, curY);
                const maxSegY = Math.max(prevY, curY);
                if (dist < (pe.kind === 'on_foot' ? 1.55 : 3.4) && maxSegY >= pe.y - 0.4 && minSegY <= pe.y + maxH) {
                  if (!proj.alreadyHitTarget) {
                    damagePvpEnemy(pe, proj.damage);
                  }
                  if (proj.isExplosive) {
                    triggerBombExplosion(pe.x, pe.y + 0.5, pe.z, 18.0);
                  }
                  hitSomething = true;
                  break;
                }
              }
            }
          }
        }

        // Check Furniture & Building Hit for RPG Rocket or Bullet (Tight wall bounds + minY check so doorways and sidewalks never block bullets!)
        if (!hitSomething) {
          if (!proj.isNpcBullet && !cur.pvpConfig?.active) {
            if (destroyFurnitureAt(curX, Math.max(0, curY - 0.5), curZ, proj.isExplosive ? 2.2 : 0.75, proj.isExplosive)) {
              if (proj.isExplosive) {
                triggerBombExplosion(curX, curY, curZ, 18.0, proj.isDisaster);
              }
              hitSomething = true;
            }
          }
          const hitBldg = !hitSomething && !cur.pvpConfig?.active
            ? getNearbyColliders(proj.mesh.position.x, proj.mesh.position.z).find(
                (col) =>
                  !col.destroyed &&
                  col.isBuilding &&
                  !col.destroyedYRanges?.some(([rMin, rMax]) => proj.mesh.position.y >= rMin && proj.mesh.position.y <= rMax) &&
                  proj.mesh.position.y >= (col.minY ?? 0) &&
                  proj.mesh.position.y <= (col.maxY ?? 18.0) &&
                  proj.mesh.position.x > col.minX - 0.08 &&
                  proj.mesh.position.x < col.maxX + 0.08 &&
                  proj.mesh.position.z > col.minZ - 0.08 &&
                  proj.mesh.position.z < col.maxZ + 0.08
              )
            : undefined;
          if (hitBldg && !proj.isNpcBullet && hitBldg.isFurniture) {
            destroyFurnitureAt(
              proj.mesh.position.x,
              proj.mesh.position.y,
              proj.mesh.position.z,
              proj.isExplosive ? 2.2 : 0.75,
              proj.isExplosive
            );
            hitBldg.destroyed = true;
          }
          if (hitBldg || proj.mesh.position.y <= 0.08) {
            if (proj.isExplosive) {
              triggerBombExplosion(proj.mesh.position.x, proj.mesh.position.y, proj.mesh.position.z, 18.0, proj.isDisaster);
            }
            hitSomething = true;
          }
        }

        if (hitSomething || proj.life >= proj.maxLife || proj.mesh.position.y < -5) {
          projectilesGroup.remove(proj.mesh);
          activeProjectiles.splice(i, 1);
        }
      }

      // Update Blood Splatter Droplets
      for (let i = bloodParticles.length - 1; i >= 0; i--) {
        const bp = bloodParticles[i];
        if (!bp || !bp.mesh) {
          bloodParticles.splice(i, 1);
          continue;
        }
        bp.life += dt;
        if (bp.life >= bp.maxLife) {
          bloodGroup.remove(bp.mesh);
          bloodParticles.splice(i, 1);
          continue;
        }
        bp.vel.y -= 18.0 * dt;
        bp.mesh.position.addScaledVector(bp.vel, dt);
        if (bp.mesh.position.y < 0.05) {
          bp.mesh.position.y = 0.05;
          bp.vel.set(0, 0, 0);
        }
      }

      // Respawn Dead NPCs after timer expires (peaceful by default & hidden health bar until damaged!)
      npcMeshes.forEach((npcObj) => {
        if (npcObj.dead) {
          npcObj.respawnTimer -= dt;
          if (npcObj.respawnTimer <= 0) {
            npcObj.dead = false;
            npcObj.isHostile = false;
            npcObj.health = npcObj.maxHealth;
            npcObj.healthBarGroup.visible = false;
            npcObj.healthBarFill.scale.x = 1;
            npcObj.healthBarFill.position.x = 0;
            (npcObj.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
            npcObj.group.rotation.order = 'XYZ';
            npcObj.group.rotation.set(0, Math.random() * Math.PI * 2, 0);
            npcObj.group.position.y = 0;
            if (npcObj.legL) npcObj.legL.rotation.set(0, 0, 0);
            if (npcObj.legR) npcObj.legR.rotation.set(0, 0, 0);
            if (npcObj.armL) npcObj.armL.rotation.set(0, 0, 0);
            if (npcObj.armR) npcObj.armR.rotation.set(0, 0, 0);
            if (npcObj.bloodPool) {
              bloodGroup.remove(npcObj.bloodPool);
              npcObj.bloodPool = undefined;
            }
          }
        }
      });

      // Update NPC Traffic Cars along Roads & Avenues (and check collision if player is parked/stopped in a car)
      npcTrafficCars.forEach((tc) => {
        if (stateRef.current.pvpConfig?.active) {
          tc.group.visible = false;
          return;
        }
        if (tc.hijacked) {
          tc.group.visible = false;
          return;
        }
        if (tc.destroyed) {
          tc.respawnTimer -= dt;
          if (tc.respawnTimer <= 0) {
            tc.destroyed = false;
            tc.group.visible = true;
          }
          return;
        }
        const distNpcCar = Math.hypot(tc.x - focusX, tc.z - focusZ);
        const maxCarVisDist = cur.resolutionScale === 'extra-low' ? 75 : cur.performanceMode ? 210 : 340;
        const isCarNear = distNpcCar <= maxCarVisDist;
        if (tc.group.visible !== isCarNear) {
          tc.group.visible = isCarNear;
        }

        let isTrafficCarMoving = false;

        if (cur.zombieMode) {
          // In Zombie Apocalypse Mode, possessed cars steer toward the player, NEVER drive through buildings, and NEVER run into each other!
          const targetX = focusX;
          const targetZ = focusZ;
          const dx = targetX - tc.x;
          const dz = targetZ - tc.z;
          const dLen = Math.hypot(dx, dz);
          if (dLen > 0.5) {
            tc.speed = 38;
            const stepX = (dx / dLen) * tc.speed * 0.447 * dt;
            const stepZ = (dz / dLen) * tc.speed * 0.447 * dt;
            let candX = tc.x + stepX;
            let candZ = tc.z + stepZ;

            // Block cars from entering or passing through any building
            if (findVehicleBuildingOrWallCollider(candX, candZ, 1.85)) {
              if (!findVehicleBuildingOrWallCollider(tc.x + stepX, tc.z, 1.85)) {
                candZ = tc.z;
              } else if (!findVehicleBuildingOrWallCollider(tc.x, tc.z + stepZ, 1.85)) {
                candX = tc.x;
              } else {
                candX = tc.x;
                candZ = tc.z;
              }
            }

            // Prevent NPC cars from running into each other
            let blockedByCar = false;
            for (const other of npcTrafficCars) {
              if (other === tc || other.destroyed) continue;
              const oldD = Math.hypot(tc.x - other.x, tc.z - other.z);
              const newD = Math.hypot(candX - other.x, candZ - other.z);
              if (newD < 4.8 && newD < oldD) {
                blockedByCar = true;
                break;
              }
            }
            if (!blockedByCar) {
              tc.x = candX;
              tc.z = candZ;
              isTrafficCarMoving = true;
            }
            tc.rotationY = Math.atan2(dx, dz);
            tc.group.position.set(tc.x, 0, tc.z);
            tc.group.rotation.y = tc.rotationY;
          }
        } else {
          // 1. Check Stop Signs at road intersections: slowly & gradually stop before proceeding
          if (tc.stopTimer > 0) {
            tc.stopTimer = Math.max(0, tc.stopTimer - dt);
            tc.speed = 0;
          } else {
            const intersectionCoords = tc.axis === 'z' ? crossStreetZs : [HW_X, ...cityAvenueXs];
            let approachingIntersection = false;
            let nearestDist = 999;
            let nearestIc = 0;

            for (const ic of intersectionCoords) {
              const stopLineCoord = ic - tc.dirSign * 7.8;
              const curCoord = tc.axis === 'z' ? tc.z : tc.x;
              const distToStopLine = (stopLineCoord - curCoord) * tc.dirSign;
              // Check for upcoming stop line ahead (within 9.5m) that we haven't already completed stopping for
              if (distToStopLine > -0.5 && distToStopLine <= 9.5 && Math.abs(ic - tc.lastStopCoord) > 6.0) {
                if (distToStopLine < nearestDist) {
                  nearestDist = distToStopLine;
                  nearestIc = ic;
                  approachingIntersection = true;
                }
              }
            }

            if (approachingIntersection) {
              if (nearestDist <= 0.6) {
                // Fully arrived at stop line: stop completely and hold
                tc.speed = 0;
                tc.stopTimer = 1.8;
                tc.lastStopCoord = nearestIc;
              } else {
                // Natural braking curve closer to the intersection (maintains cruising speed until ~9m)
                const normDist = Math.max(0, Math.min(1, (nearestDist - 0.6) / 8.9));
                const targetSpeed = tc.initSpeed * Math.sqrt(normDist);
                const decelRate = 26.0;
                if (tc.speed > targetSpeed) {
                  tc.speed = Math.max(targetSpeed, tc.speed - dt * decelRate);
                } else {
                  tc.speed = Math.min(targetSpeed, tc.speed + dt * 14.0);
                }
              }
            } else {
              // Smooth, realistic acceleration back up to normal cruising speed
              const accelRate = 18.0;
              if (tc.speed < tc.initSpeed) {
                tc.speed = Math.min(tc.initSpeed, tc.speed + dt * accelRate);
              }
            }
          }

          const moveDist = tc.speed * 0.447 * dt * tc.dirSign;
          let candX = tc.x;
          let candZ = tc.z;
          if (tc.axis === 'z') {
            candZ += moveDist;
            if (tc.dirSign === 1 && candZ > tc.maxBound) {
              candZ = tc.minBound;
              tc.lastStopCoord = -99999;
            }
            if (tc.dirSign === -1 && candZ < tc.minBound) {
              candZ = tc.maxBound;
              tc.lastStopCoord = -99999;
            }
          } else {
            candX += moveDist;
            if (tc.dirSign === 1 && candX > tc.maxBound) {
              candX = tc.minBound;
              tc.lastStopCoord = -99999;
            }
            if (tc.dirSign === -1 && candX < tc.minBound) {
              candX = tc.maxBound;
              tc.lastStopCoord = -99999;
            }
          }

          // Prevent NPC traffic cars from running into cars directly ahead in the SAME lane, while allowing cars in opposite/adjacent lanes to pass freely!
          let blockedByOtherCar = tc.stopTimer > 0;
          if (!blockedByOtherCar) {
            for (const other of npcTrafficCars) {
              if (other === tc || other.destroyed) continue;
              if (tc.axis === other.axis) {
                const lateralDist = tc.axis === 'z' ? Math.abs(tc.x - other.x) : Math.abs(tc.z - other.z);
                if (lateralDist >= 1.9) continue;
                const aheadDist = tc.axis === 'z' ? (other.z - tc.z) * tc.dirSign : (other.x - tc.x) * tc.dirSign;
                if (aheadDist > 0 && aheadDist < 6.5) {
                  blockedByOtherCar = true;
                  break;
                }
              } else {
                const lateralDist = tc.axis === 'z' ? Math.abs(tc.x - other.x) : Math.abs(tc.z - other.z);
                const aheadDist = tc.axis === 'z' ? (other.z - tc.z) * tc.dirSign : (other.x - tc.x) * tc.dirSign;
                if (lateralDist < 2.0 && aheadDist > 0 && aheadDist < 5.2) {
                  blockedByOtherCar = true;
                  break;
                }
              }
            }
          }
          if (!blockedByOtherCar) {
            for (const pc of policeCruisers) {
              if (pc.destroyed) continue;
              const lateralDist = tc.axis === 'z' ? Math.abs(tc.x - pc.x) : Math.abs(tc.z - pc.z);
              const aheadDist = tc.axis === 'z' ? (pc.z - tc.z) * tc.dirSign : (pc.x - tc.x) * tc.dirSign;
              if (lateralDist < 2.0 && aheadDist > 0 && aheadDist < 5.8) {
                blockedByOtherCar = true;
                break;
              }
            }
          }

          // Stop if the player's car is in the road ahead
          if (!blockedByOtherCar && hasSpawnedCarRef.current && activeCarGroupRef.current?.visible) {
            const lateralDist = tc.axis === 'z' ? Math.abs(tc.x - carPhysicsRef.current.x) : Math.abs(tc.z - carPhysicsRef.current.z);
            const aheadDist = tc.axis === 'z'
              ? (carPhysicsRef.current.z - tc.z) * tc.dirSign
              : (carPhysicsRef.current.x - tc.x) * tc.dirSign;
            const distToPlayerCar = Math.hypot(tc.x - carPhysicsRef.current.x, tc.z - carPhysicsRef.current.z);
            if (distToPlayerCar < 4.5 || (lateralDist < 2.5 && aheadDist > -1.0 && aheadDist < 8.2)) {
              blockedByOtherCar = true;
              tc.speed = 0;
            }
          }
          if (!blockedByOtherCar) {
            for (const pk of parkedCars) {
              if (pk.destroyed || !pk.group.visible) continue;
              const lateralDist = tc.axis === 'z' ? Math.abs(tc.x - pk.x) : Math.abs(tc.z - pk.z);
              const aheadDist = tc.axis === 'z' ? (pk.z - tc.z) * tc.dirSign : (pk.x - tc.x) * tc.dirSign;
              if (lateralDist < 2.5 && aheadDist > 0 && aheadDist < 7.8) {
                blockedByOtherCar = true;
                break;
              }
            }
          }
          if (!blockedByOtherCar && hasSpawnedMotorcycleRef.current && activeMotorcycleGroupRef.current?.visible) {
            const lateralDist = tc.axis === 'z' ? Math.abs(tc.x - motorcyclePhysicsRef.current.x) : Math.abs(tc.z - motorcyclePhysicsRef.current.z);
            const aheadDist = tc.axis === 'z'
              ? (motorcyclePhysicsRef.current.z - tc.z) * tc.dirSign
              : (motorcyclePhysicsRef.current.x - tc.x) * tc.dirSign;
            if (lateralDist < 2.3 && aheadDist > 0 && aheadDist < 7.0 && Math.abs(motorcyclePhysicsRef.current.speed) < 12) {
              blockedByOtherCar = true;
            }
          }

          // Stop if an NPC pedestrian is in the road ahead (Note: do NOT stop if the player on foot is in front!)
          if (!blockedByOtherCar) {
            for (let nIdx = 0; nIdx < npcMeshes.length; nIdx++) {
              const npcItem = npcMeshes[nIdx];
              if (npcItem.dead || !npcItem.group.visible) continue;
              const nx = npcItem.group.position.x;
              const nz = npcItem.group.position.z;
              const lateralDist = tc.axis === 'z' ? Math.abs(tc.x - nx) : Math.abs(tc.z - nz);
              const aheadDist = tc.axis === 'z' ? (nz - tc.z) * tc.dirSign : (nx - tc.x) * tc.dirSign;
              if (lateralDist < 2.2 && aheadDist > 0 && aheadDist < 6.5) {
                blockedByOtherCar = true;
                break;
              }
            }
          }

          if (!blockedByOtherCar) {
            tc.x = candX;
            tc.z = candZ;
            isTrafficCarMoving = true;
          }
          if (isCarNear) {
            tc.group.position.set(tc.x, 0, tc.z);
            if (!blockedByOtherCar) {
              const wSpin = (tc.speed * 0.447 / 0.35) * dt;
              tc.wheels.forEach((w) => {
                w.rotation.x += wSpin;
              });
            }
          }
        }

        // NPC Traffic Car Collisions with Player on Foot
        if (!curVehicle && !isExplodingRef.current && humanPosRef.current.y < 1.8) {
          const carFwdX = Math.sin(tc.rotationY);
          const carFwdZ = Math.cos(tc.rotationY);
          const relX = humanPosRef.current.x - tc.x;
          const relZ = humanPosRef.current.z - tc.z;
          
          // Forward projection (positive is in front of the car)
          const forwardProj = relX * carFwdX + relZ * carFwdZ;
          // Lateral projection (distance from the car's center line)
          const lateralProj = Math.abs(relX * carFwdZ - relZ * carFwdX);

          // LETHAL FRONT COLLISION: If moving car hits player from front -> trigger death
          if (isTrafficCarMoving && forwardProj >= 1.0 && forwardProj <= 2.65 && lateralProj < 1.15) {
            playerHealthRef.current = 0;
            lastDisplayedHp = 0;
            setPlayerHealth(0);
            triggerPlayerDeath('You died', '', false);
            return;
          }
          
          // SIDE/BACK "BUMP" COLLISION: If player touches side or back of car -> move player (bump) but don't damage
          // Car bounds roughly: Length 4.5m (fwd -2.25 to +2.25), Width 2.1m (lat -1.05 to +1.05)
          if (Math.abs(forwardProj) < 2.5 && lateralProj < 1.35) {
            // Calculate push direction (away from car center)
            const pushX = relX;
            const pushZ = relZ;
            const pushLen = Math.hypot(pushX, pushZ);
            if (pushLen > 0.1) {
              const pushFactor = 0.15;
              humanPosRef.current.x += (pushX / pushLen) * pushFactor;
              humanPosRef.current.z += (pushZ / pushLen) * pushFactor;
              playerGrp.position.copy(humanPosRef.current);
            }
          }
        }


        // If player is inside their car and an NPC car drives into them -> apply combined speed >150 MPH or proportional damage!
        if (curVehicle === 'car' && hasSpawnedCarRef.current && !isExplodingRef.current) {
          const distToPlayerCar = Math.hypot(tc.x - carPhysicsRef.current.x, tc.z - carPhysicsRef.current.z);
          if (distToPlayerCar < 3.4) {
            const combinedSpd = Math.abs(carPhysicsRef.current.speed) + Math.abs(tc.speed);
            if (combinedSpd >= 150.0) {
              carHealthRef.current = 0;
              setCarHealth(0);
              tc.destroyed = true;
              tc.respawnTimer = 16.0;
              tc.group.visible = false;
              triggerCarExplosionAt(tc.x, 1.0, tc.z, 42);
              reportPlayerCrime(1);
              stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: tc.x, y: 1.0, z: tc.z });
              triggerHouseExplosion(
                carPhysicsRef.current.x,
                carPhysicsRef.current.z,
                0,
                'HIGH-SPEED TRAFFIC COLLISION',
                `Combined impact speed of ${Math.round(combinedSpd)} MPH destroyed both vehicles!`
              );
            } else {
              // Apply collision damage once upon impact while traffic car had momentum
              if (tc.speed > 0.5) {
                const dmg = Math.min(30, (combinedSpd / 150.0) * 100.0);
                const nextHp = Math.max(0, carHealthRef.current - dmg);
                carHealthRef.current = nextHp;
                setCarHealth(nextHp);
                soundFX.playPlaceObject();
                cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.35);
                if (nextHp <= 0) {
                  tc.destroyed = true;
                  tc.respawnTimer = 16.0;
                  tc.group.visible = false;
                  triggerCarExplosionAt(tc.x, 1.0, tc.z, 42);
                  reportPlayerCrime(1);
                  stateRef.current.onEarnMoney?.(3000, 'Destroyed NPC Car', { x: tc.x, y: 1.0, z: tc.z });
                  triggerHouseExplosion(
                    carPhysicsRef.current.x,
                    carPhysicsRef.current.z,
                    0,
                    'VEHICLE TOTALED',
                    'Traffic collision reduced your vehicle integrity to 0%.'
                  );
                }
              }
              // Immediately lose momentum and come to a complete stop (never teleport back & ram repeatedly!)
              tc.speed = 0;
              tc.stopTimer = 3.5;
            }
          }
        }
      });

      // If Zombie Mode was just turned off, reset all zombies & cars back to their spawn positions!
      if (lastZombieMode && !cur.zombieMode) {
        resetNpcsAndTrafficToSpawn();
      }
      lastZombieMode = Boolean(cur.zombieMode);

      // 4. SIDEWALK WALKING NPCS + HOSTILE BATTLE AI + FLOATING HEALTH BAR BILLBOARDS (Distance-Culled)
      const maxAllowedNpcs = Math.max(npcMeshes.length, cur.npcCount ?? 80);
      npcMeshes.forEach((npcObj, idx) => {
        if (cur.pvpConfig?.active) {
          if (npcObj.group.visible) npcObj.group.visible = false;
          return;
        }
        if (idx >= maxAllowedNpcs) {
          if (npcObj.group.visible) npcObj.group.visible = false;
          return;
        }
        if (npcObj.dead) return;

        // Drown pedestrians in Rising Flood
        if (cur.activeDisaster === 'flood' && floodWaterMesh.visible && npcObj.group.position.y + 1.1 < floodWaterY) {
          killNpcWithBlood(npcObj, 'natural_disaster');
          return;
        }

        // Provoked by AI keyboard chat when message is mean
        if (cur.hostileNpcId === npcObj.data.id && cur.hostileNpcTriggerNonce !== lastHostileTriggerNonce) {
          makeNpcHostile(npcObj);
        }

        // In Zombie Mode, every pedestrian turns into a ravenous zombie!
        if (cur.zombieMode && !npcObj.isHostile) {
          makeNpcHostile(npcObj);
        }

        const distNpcToFocus = Math.hypot(
          npcObj.group.position.x - focusX,
          npcObj.group.position.z - focusZ
        );
        const maxNpcVisDist = cur.resolutionScale === 'extra-low' ? 50 : cur.performanceMode ? 160 : 260;
        if (!npcObj.isHostile && distNpcToFocus > maxNpcVisDist) {
          if (npcObj.group.visible) npcObj.group.visible = false;
          return;
        }
        if (!npcObj.group.visible) npcObj.group.visible = true;

        // Billboard floating health bar toward camera
        if (npcObj.healthBarGroup.visible) {
          npcObj.healthBarGroup.lookAt(camera.position);
        }

        if (npcObj.isHostile) {
          // Hostile NPC / Zombie pursues player on foot and fights with their bare FISTS (no guns outside Battle Mode!)
          const nx = npcObj.group.position.x;
          const nz = npcObj.group.position.z;
          const px = humanPosRef.current.x;
          const pz = humanPosRef.current.z;

          let goalX = px;
          let goalZ = pz;
          const playerBldg = isPointInsideAnyBuildingFootprint(px, pz, 0.2);
          const npcBldg = isPointInsideAnyBuildingFootprint(nx, nz, 0.2);
          if (playerBldg && (!npcBldg || npcBldg.id !== playerBldg.id)) {
            const doorZ = playerBldg.cz - playerBldg.d * 0.5;
            if (!(Math.abs(nx - playerBldg.cx) < 1.1 && nz < doorZ + 1.0 && nz > doorZ - 4.0)) {
              goalX = playerBldg.cx;
              goalZ = doorZ - 1.3;
            }
          } else if (npcBldg && (!playerBldg || playerBldg.id !== npcBldg.id)) {
            const doorZ = npcBldg.cz - npcBldg.d * 0.5;
            if (nz > doorZ - 0.6) {
              goalX = npcBldg.cx;
              goalZ = doorZ - 1.5;
            }
          }

          const toGoal = new THREE.Vector3(goalX - nx, 0, goalZ - nz);
          const toPlayer = new THREE.Vector3(px - nx, 0, pz - nz);
          const distToP = toPlayer.length();
          if (toGoal.length() > 0.01) {
            toGoal.normalize();
            npcObj.group.rotation.y = Math.atan2(toGoal.x, toGoal.z);
          }

          const stopDist = 1.45;
          const runSpeed = cur.zombieMode ? 5.2 : 4.6;

          if (distToP > stopDist && distToP < (cur.zombieMode ? 120.0 : 95.0)) {
            const moved = movePersonWithWallCollision(
              nx,
              nz,
              npcObj.group.position.y,
              toGoal.x * runSpeed * dt,
              toGoal.z * runSpeed * dt,
              0.36
            );
            // Hostile NPCs can leave the sidewalk to pursue the player (walk on roads, etc.)
            npcObj.group.position.x = moved.x;
            npcObj.group.position.z = moved.z;
            const swing = Math.sin(clock.getElapsedTime() * (cur.zombieMode ? 10 : 11)) * 0.65;
            npcObj.legL.rotation.x = swing;
            npcObj.legR.rotation.x = -swing;
            if (cur.zombieMode) {
              npcObj.armL.rotation.x = -Math.PI * 0.48;
              npcObj.armR.rotation.x = -Math.PI * 0.48;
            } else {
              // Boxer guard stance while sprinting to brawl!
              npcObj.armL.rotation.x = -1.15 + swing * 0.35;
              npcObj.armR.rotation.x = -1.15 - swing * 0.35;
            }
          } else {
            npcObj.legL.rotation.x = 0;
            npcObj.legR.rotation.x = 0;
            // Throw alternating left-right fist punches when up close!
            const punchCycle = clock.getElapsedTime() * 14.0 + idx;
            npcObj.armL.rotation.x = -1.2 - Math.max(0, Math.sin(punchCycle)) * 0.65;
            npcObj.armR.rotation.x = -1.2 - Math.max(0, -Math.sin(punchCycle)) * 0.65;
          }

          npcObj.attackCooldown -= dt;
          if (npcObj.attackCooldown <= 0 && distToP < 2.45) {
            npcObj.attackCooldown = cur.zombieMode ? 0.65 : 0.72;
            const isCityMode = !cur.platformerMode && !cur.pvpConfig?.active;
            const baseDmg = cur.zombieMode ? 15 : 14;
            const dmg = isCityMode ? baseDmg * 0.5 : baseDmg;
            if (curVehicle) {
              const nextCarHp = Math.max(0, carHealthRef.current - dmg);
              carHealthRef.current = nextCarHp;
              setCarHealth(nextCarHp);
              if (nextCarHp <= 0) {
                const pPos = getActivePlayerWorldPos();
                triggerHouseExplosion(pPos.x, pPos.z, pPos.y, 'You died', '');
              }
            } else {
              const nextHp = Math.max(0, playerHealthRef.current - dmg);
              playerHealthRef.current = nextHp;
              setPlayerHealth(nextHp);
              triggerDamageFlash(0.5);
              if (nextHp <= 0) {
                triggerPlayerAttackerDeath(cur.zombieMode ? 'Zombie Swarm' : `${npcObj.data.name} (Fistfight)`);
              }
            }
          }
          return;
        }

        // If player is currently talking to this pedestrian, stop walking and face the player until done talking!
        if (cur.talkingNpcId && npcObj.data.id === cur.talkingNpcId) {
          const targetRot = Math.atan2(
            humanPosRef.current.x - npcObj.group.position.x,
            humanPosRef.current.z - npcObj.group.position.z
          );
          let rotDiff = targetRot - npcObj.group.rotation.y;
          while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
          while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
          npcObj.group.rotation.y += rotDiff * Math.min(1, dt * 10.0);
          npcObj.legL.rotation.x = THREE.MathUtils.lerp(npcObj.legL.rotation.x, 0, Math.min(1, dt * 12));
          npcObj.legR.rotation.x = THREE.MathUtils.lerp(npcObj.legR.rotation.x, 0, Math.min(1, dt * 12));
          npcObj.armL.rotation.x = THREE.MathUtils.lerp(npcObj.armL.rotation.x, 0, Math.min(1, dt * 12));
          npcObj.armR.rotation.x = THREE.MathUtils.lerp(npcObj.armR.rotation.x, 0, Math.min(1, dt * 12));
          return;
        }

        // Standard peaceful sidewalk walking
        const data = npcObj.data;
        const targetWp = data.waypoints[data.currentWaypointIdx];
        const targetVec = new THREE.Vector3(targetWp[0], 0, targetWp[1]);

        const dir = new THREE.Vector3().subVectors(targetVec, npcObj.group.position);
        const dist = dir.length();

        if (dist < 0.65) {
          data.currentWaypointIdx = (data.currentWaypointIdx + 1) % data.waypoints.length;
        } else {
          dir.normalize();
          const prevX = npcObj.group.position.x;
          const prevZ = npcObj.group.position.z;
          const moved = movePersonWithWallCollision(
            prevX,
            prevZ,
            0,
            dir.x * 1.8 * dt,
            dir.z * 1.8 * dt,
            0.34
          );
          if (isPointOnSidewalk(moved.x, moved.z, 0.45) && !isPointInsideAnyBuildingFootprint(moved.x, moved.z, 0.3)) {
            npcObj.group.position.x = moved.x;
            npcObj.group.position.z = moved.z;
          } else {
            const snapped = clampToNearestSidewalk(prevX, prevZ);
            npcObj.group.position.x = snapped.x;
            npcObj.group.position.z = snapped.z;
            data.currentWaypointIdx = (data.currentWaypointIdx + 1) % data.waypoints.length;
          }
          // If blocked by an obstacle on a waypoint, advance to next waypoint so NPC never gets stuck
          if (Math.hypot(moved.x - prevX, moved.z - prevZ) < 0.05 * dt) {
            data.currentWaypointIdx = (data.currentWaypointIdx + 1) % data.waypoints.length;
          }
          npcObj.group.rotation.y = Math.atan2(dir.x, dir.z);

          const swing = Math.sin(clock.getElapsedTime() * 5 + data.currentWaypointIdx) * 0.5;
          npcObj.legL.rotation.x = swing;
          npcObj.legR.rotation.x = -swing;
          npcObj.armL.rotation.x = -swing * 0.7;
          npcObj.armR.rotation.x = swing * 0.7;
        }
      });

      // Keep latest player & vehicle positions synced in ref for manual saving
      saveTimer += dt;
      if (saveTimer >= 2.5) {
        saveTimer = 0;
        stateRef.current.onSavePositions?.(
          [humanPosRef.current.x, humanPosRef.current.y, humanPosRef.current.z],
          { x: carPhysicsRef.current.x, z: carPhysicsRef.current.z, rotationY: carPhysicsRef.current.rotationY },
          undefined,
          {
            x: helicopterPhysicsRef.current.x,
            y: helicopterPhysicsRef.current.y,
            z: helicopterPhysicsRef.current.z,
            rotationY: helicopterPhysicsRef.current.rotationY,
          }
        );
      }

      const elp = clock.getElapsedTime();
      waterTexturesRef.current.forEach((wTex) => {
        wTex.offset.x = (elp * 0.025) % 1;
        wTex.offset.y = (elp * 0.018) % 1;
      });

      if (cloudsGroupRef.current) {
        cloudsGroupRef.current.children.forEach((c) => {
          c.position.x += dt * 3.0;
          if (c.position.x > 600) c.position.x = -600;
        });
      }

      // Update 3D Navigation Waypoint Pillar & Check Arrival Disappearance
      if (waypointRef.current) {
        const wp = waypointRef.current;
        waypointGroup.visible = true;
        waypointGroup.position.set(wp.x, 0, wp.z);

        wpDiamondMesh.rotation.y += dt * 1.8;
        wpDiamondMesh.position.y = 14 + Math.sin(elp * 2.5) * 1.2;

        wpRing1.rotation.z += dt * 1.1;
        wpRing2.rotation.z -= dt * 0.8;

        wpBeamMat.opacity = 0.55 + Math.sin(elp * 3.5) * 0.15;
        const groundPulse = 1.0 + Math.sin(elp * 3.0) * 0.12;
        wpGroundOuter.scale.set(groundPulse, groundPulse, 1);

        const distToWp = Math.hypot(focusX - wp.x, focusZ - wp.z);
        const arrivalThreshold = curVehicle ? 8.5 : 5.8;

        // Keep live direction & distance updated in UI state
        if (miniMapFrameTick === 0) {
          const cardinalDir = getCardinalDirection(focusX, focusZ, wp.x, wp.z);
          setActiveDirectionInfo({ distance: Math.round(distToWp), direction: cardinalDir });
        }

        // Once player reaches the waypoint, automatically disappear!
        if (distToWp <= arrivalThreshold) {
          waypointRef.current = null;
          setActiveWaypoint(null);
          setActiveDirectionInfo(null);
          waypointGroup.visible = false;
          soundFX.playInteractChime();
          setWaypointNotice('🎯 Destination Reached!');
          stateRef.current.onQuestProgress?.('reach_waypoints', 1);
          setTimeout(() => setWaypointNotice(null), 3000);
        }
      } else {
        waypointGroup.visible = false;
      }

      // =======================================================================
      // CONTINUOUS RAPIDFIRE WEAPONS & AIRCRAFT ORDNANCE (AIM + SHOOT TOGETHER)
      // =======================================================================
      if (isHoldingLeftClick && !cur.isMenuOpen) {
        if (curVehicle === 'helicopter' || curVehicle === 'plane') {
          fireAircraftOrdnance('gun');
        } else if (!curVehicle) {
          fireEquippedWeapon();
        }
      }
      if (isHoldingRightClick && !cur.isMenuOpen) {
        if (curVehicle === 'helicopter' || curVehicle === 'plane') {
          fireAircraftOrdnance('rocket');
        }
      }

      // =======================================================================
      // POLICE PURSUIT SIMULATION (1-MINUTE PER STAR AUTOMATIC DECAY)
      // =======================================================================
      const isDisasterActive = Boolean(cur.activeDisaster && cur.activeDisaster !== 'none');
      if (cur.policeModeEnabled && !cur.pvpConfig?.active && !isDisasterActive && (cur.wantedLevel || 0) > 0) {
        if (currentWantedStars !== (cur.wantedLevel || 0)) {
          currentWantedStars = cur.wantedLevel || 0;
          if (wantedDecayTimer <= 0) {
            wantedDecayTimer = 60.0; // 1 minute per star!
          }
        }
        wantedDecayTimer -= dt;
        const curSec = Math.max(0, Math.ceil(wantedDecayTimer));
        if (curSec !== lastReportedDecaySec) {
          lastReportedDecaySec = curSec;
          cur.onWantedDecayTimerUpdate?.(curSec, 60.0);
        }
        if (wantedDecayTimer <= 0) {
          const nextStars = Math.max(0, currentWantedStars - 1);
          currentWantedStars = nextStars;
          wantedDecayTimer = nextStars > 0 ? 60.0 : 0;
          lastReportedDecaySec = Math.ceil(wantedDecayTimer);
          cur.onWantedDecayTimerUpdate?.(lastReportedDecaySec, 60.0);
          cur.onWantedLevelChange?.(nextStars);
        }

        const targetWanted = Math.min(5, Math.max(1, cur.wantedLevel || 1));
        const desiredCruisers = [0, 1, 2, 4, 8, 16][targetWanted] || 16;
        let aliveCruisers = policeCruisers.filter((c) => !c.destroyed);
        if (aliveCruisers.length > desiredCruisers) {
          let excess = aliveCruisers.length - desiredCruisers;
          for (const pc of aliveCruisers) {
            if (excess <= 0) break;
            pc.destroyed = true;
            pc.group.visible = false;
            policeGroup.remove(pc.group);
            excess--;
          }
          aliveCruisers = policeCruisers.filter((c) => !c.destroyed);
        }
        for (let i = policeCruisers.length - 1; i >= 0; i--) {
          if (policeCruisers[i].destroyed) {
            policeGroup.remove(policeCruisers[i].group);
            policeCruisers.splice(i, 1);
          }
        }
        // Ensure at least 1 cruiser spawns nearly instantly when wantedLevel >= 1
        const spawnChance = aliveCruisers.length === 0 ? 0.8 : (targetWanted === 1 ? 0.15 : 0.05 * targetWanted);
        if (aliveCruisers.length < desiredCruisers && Math.random() < spawnChance) {
          spawnPoliceCruiserNearPlayer();
        }

        const pWorldPos = getActivePlayerWorldPos();
        for (const pc of policeCruisers) {
          if (pc.destroyed) continue;
          pc.sirenTimer += dt * 10;
          const sirenRed = Math.sin(pc.sirenTimer) > 0;
          const lightBar = pc.group.getObjectByName('policeLightBar');
          if (lightBar && (lightBar as THREE.Mesh).material) {
            ((lightBar as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setHex(
              sirenRed ? 0xef4444 : 0x3b82f6
            );
          }

          const dx = pWorldPos.x - pc.x;
          const dz = pWorldPos.z - pc.z;
          const dist = Math.hypot(dx, dz);

          // If the player is on foot within 22m, brake the police cruiser to a stop and deploy officers from inside the cruiser!
          // If the player gets into a vehicle or moves >32m away, the police cruiser drives after the player using regular car physics!
          const shouldStopForFootDeploy = !curVehicle && dist <= 22.0;
          if (shouldStopForFootDeploy) {
            pc.speed = Math.max(0, pc.speed - 28.0 * dt);
            if (!pc.deployedOfficers) {
              pc.deployedOfficers = true;
              // At 1 star, only 1 officer deploys. At higher levels, 2 officers per cruiser.
              if (targetWanted === 1) {
                spawnPoliceOfficerAt(pc.x + 2.2, pc.z + 1.2);
              } else {
                spawnPoliceOfficerAt(pc.x + 2.2, pc.z + 1.2);
                spawnPoliceOfficerAt(pc.x - 2.2, pc.z + 1.2);
              }
            }
          } else {
            // Regular car steering, acceleration, building collision avoidance, and car-to-car physics!
            if (pc.collisionCooldown && pc.collisionCooldown > 0) {
              pc.collisionCooldown = Math.max(0, pc.collisionCooldown - dt);
            }
            const targetRot = Math.atan2(dx, dz);
            let rDiff = targetRot - pc.rotY;
            while (rDiff < -Math.PI) rDiff += Math.PI * 2;
            while (rDiff > Math.PI) rDiff -= Math.PI * 2;
            const turnRate = pc.collisionCooldown && pc.collisionCooldown > 0 ? 1.2 : 3.2;
            if (Math.abs(pc.speed) > 0.5) {
              pc.rotY += THREE.MathUtils.clamp(rDiff, -turnRate * dt, turnRate * dt) * Math.sign(pc.speed);
            }
            const accelRate = pc.collisionCooldown && pc.collisionCooldown > 0 ? 14.0 : 26.0;
            const maxPoliceSpeed = 82.0;
            let targetMaxSpeed = maxPoliceSpeed;
            if ((curVehicle === 'car' || curVehicle === 'motorcycle') && !isExplodingRef.current) {
              const playerSpd = curVehicle === 'car' ? Math.abs(carPhysicsRef.current.speed) : Math.abs(motorcyclePhysicsRef.current.speed);
              targetMaxSpeed = Math.max(maxPoliceSpeed, playerSpd + 12.0);
            }
            pc.speed = Math.min(targetMaxSpeed, pc.speed + accelRate * dt);

            const stepX = Math.sin(pc.rotY) * pc.speed * 0.447 * dt;
            const stepZ = Math.cos(pc.rotY) * pc.speed * 0.447 * dt;
            let candX = pc.x + stepX;
            let candZ = pc.z + stepZ;

            const isBldgColliding = (cx: number, cz: number) =>
              Boolean(findVehicleBuildingOrWallCollider(cx, cz, 1.85) || isPointInsideAnyBuildingFootprint(cx, cz, 1.2));

            // Respect building & wall colliders (police cruisers NEVER drive through or enter buildings!)
            if (isBldgColliding(candX, candZ)) {
              if (!isBldgColliding(pc.x + stepX, pc.z)) {
                candZ = pc.z;
                pc.rotY += (rDiff >= 0 ? 1 : -1) * 1.8 * dt;
              } else if (!isBldgColliding(pc.x, pc.z + stepZ)) {
                candX = pc.x;
                pc.rotY += (rDiff >= 0 ? 1 : -1) * 1.8 * dt;
              } else {
                candX = pc.x;
                candZ = pc.z;
                pc.speed = -pc.speed * 0.35;
              }
            }

            // Respect other police cruisers & regular traffic cars
            let blockedByCar = false;
            for (const otherPc of policeCruisers) {
              if (otherPc === pc || otherPc.destroyed) continue;
              const oldD = Math.hypot(pc.x - otherPc.x, pc.z - otherPc.z);
              const newD = Math.hypot(candX - otherPc.x, candZ - otherPc.z);
              if (newD < 3.4 && newD < oldD) {
                blockedByCar = true;
                pc.speed *= 0.5;
                break;
              }
            }
            if (!blockedByCar) {
              for (const tc of npcTrafficCars) {
                if (tc.destroyed) continue;
                const oldD = Math.hypot(pc.x - tc.x, pc.z - tc.z);
                const newD = Math.hypot(candX - tc.x, candZ - tc.z);
                if (newD < 3.2 && newD < oldD) {
                  blockedByCar = true;
                  pc.speed *= 0.5;
                  break;
                }
              }
            }

            // Check collision with player vehicle BEFORE stepping into it (bounces and loses momentum like a regular car, ZERO teleporting!)
            if (
              !blockedByCar &&
              (curVehicle === 'car' || curVehicle === 'motorcycle') &&
              !isExplodingRef.current
            ) {
              const oldDistToPlayer = Math.hypot(pWorldPos.x - pc.x, pWorldPos.z - pc.z);
              const candDistToPlayer = Math.hypot(pWorldPos.x - candX, pWorldPos.z - candZ);
              if (candDistToPlayer < 3.4 && candDistToPlayer < oldDistToPlayer) {
                blockedByCar = true;
                const playerVehSpd =
                  curVehicle === 'car'
                    ? Math.abs(carPhysicsRef.current.speed)
                    : Math.abs(motorcyclePhysicsRef.current.speed);
                const combinedSpd = playerVehSpd + Math.abs(pc.speed);

                if (combinedSpd >= 150.0) {
                  carHealthRef.current = 0;
                  setCarHealth(0);
                  pc.destroyed = true;
                  pc.group.visible = false;
                  spawnDebrisBurst(pc.x, 1.0, pc.z, 42);
                  reportPlayerCrime(1);
                  triggerHouseExplosion(
                    pWorldPos.x,
                    pWorldPos.z,
                    0,
                    'HIGH-SPEED TRAFFIC COLLISION',
                    `Combined impact speed of ${Math.round(combinedSpd)} MPH destroyed both vehicles!`
                  );
                } else {
                  if (!pc.collisionCooldown || pc.collisionCooldown <= 0) {
                    const dmg = (combinedSpd / 150.0) * 100.0;
                    const nextHp = Math.max(0, carHealthRef.current - dmg);
                    carHealthRef.current = nextHp;
                    setCarHealth(nextHp);
                    soundFX.playPlaceObject();
                    cameraShakeRef.current = Math.max(cameraShakeRef.current, Math.min(0.45, combinedSpd * 0.004));
                    if (nextHp <= 0) {
                      pc.destroyed = true;
                      pc.group.visible = false;
                      reportPlayerCrime(1);
                      triggerHouseExplosion(
                        pWorldPos.x,
                        pWorldPos.z,
                        0,
                        'VEHICLE TOTALED',
                        'Traffic collision reduced your vehicle integrity to 0%.'
                      );
                    }
                  }
                  // Lose momentum and bounce off the player's car like a regular car (never teleport!)
                  const pcFwdX = Math.sin(pc.rotY);
                  const pcFwdZ = Math.cos(pc.rotY);
                  const fwdDot = (pWorldPos.x - pc.x) * pcFwdX + (pWorldPos.z - pc.z) * pcFwdZ;
                  pc.speed =
                    fwdDot >= 0
                      ? -Math.max(7, Math.abs(pc.speed) * 0.35)
                      : Math.max(0, pc.speed * 0.25);
                  pc.collisionCooldown = 0.65;
                  if (curVehicle === 'car' && Math.abs(carPhysicsRef.current.speed) < 8) {
                    carPhysicsRef.current.speed = Math.min(12, Math.abs(pc.speed) * 0.4);
                  }
                }
              }
            }

            if (!blockedByCar) {
              pc.x = candX;
              pc.z = candZ;
            }
            pc.group.position.set(pc.x, 0, pc.z);
            pc.group.rotation.y = pc.rotY;
            if (!blockedByCar) {
              const wSpin = (pc.speed * 0.447 / 0.35) * dt;
              pc.wheels.forEach((w) => {
                w.rotation.x += wSpin;
              });
            }

            if (!curVehicle && !isExplodingRef.current && humanPosRef.current.y < 1.8 && !blockedByCar) {
              const relX = humanPosRef.current.x - pc.x;
              const relZ = humanPosRef.current.z - pc.z;
              const pcFwdX = Math.sin(pc.rotY);
              const pcFwdZ = Math.cos(pc.rotY);
              const forwardProj = relX * pcFwdX + relZ * pcFwdZ;
              const lateralProj = Math.abs(relX * pcFwdZ - relZ * pcFwdX);

              // LETHAL FRONT COLLISION
              if (pc.speed > 2.0 && forwardProj >= 1.0 && forwardProj <= 2.65 && lateralProj < 1.15) {
                playerHealthRef.current = 0;
                lastDisplayedHp = 0;
                setPlayerHealth(0);
                triggerPlayerDeath('You died', '', false);
                return;
              }
              
              // SIDE/BACK "BUMP" COLLISION
              if (Math.abs(forwardProj) < 2.5 && lateralProj < 1.35) {
                const pushX = relX;
                const pushZ = relZ;
                const pushLen = Math.hypot(pushX, pushZ);
                if (pushLen > 0.1) {
                  const pushFactor = 0.15;
                  humanPosRef.current.x += (pushX / pushLen) * pushFactor;
                  humanPosRef.current.z += (pushZ / pushLen) * pushFactor;
                  playerGrp.position.copy(humanPosRef.current);
                }
              }
            }
          }
        }

        // Update Armed Police Officers on Foot (Intelligent building navigation, switchback staircase climbing & weapon firing animations!)
        for (let poIdx = 0; poIdx < policeOfficers.length; poIdx++) {
          const po = policeOfficers[poIdx];
          if (po.dead) continue;
          if (po.healthBarGroup && po.healthBarGroup.visible) {
            po.healthBarGroup.lookAt(camera.position);
          }
          const ox = po.group.position.x;
          let oy = po.group.position.y;
          const oz = po.group.position.z;
          const px = humanPosRef.current.x;
          const py = humanPosRef.current.y;
          const pz = humanPosRef.current.z;
          const dx = px - ox;
          const dy = py - oy;
          const dz = pz - oz;
          const dist2D = Math.hypot(dx, dz);
          const dist3D = Math.hypot(dx, dy, dz);

          let goalX = px;
          let goalZ = pz;
          let isNavigatingStairsOrDoor = false;

          const playerBldg = isPointInsideAnyBuildingFootprint(px, pz, 0.4);
          const officerBldg = isPointInsideAnyBuildingFootprint(ox, oz, 0.4);

          if (playerBldg) {
            // Player is inside a house or building — police officers wait outside on the exterior sidewalk/street!
            const doorX = playerBldg.cx;
            const doorZ = playerBldg.cz - playerBldg.d * 0.5 - 2.8;
            goalX = doorX;
            goalZ = doorZ;
          } else if (officerBldg) {
            // Push officer outside building immediately
            const doorX = officerBldg.cx;
            const doorZ = officerBldg.cz - officerBldg.d * 0.5 - 2.8;
            goalX = doorX;
            goalZ = doorZ;
          } else if (dist2D > 4.5 && Math.abs(dy) < 1.5) {
            const flankAngle = ((poIdx % 3) - 1) * 0.42;
            const rawAngle = Math.atan2(px - ox, pz - oz) + flankAngle;
            goalX = ox + Math.sin(rawAngle) * dist2D;
            goalZ = oz + Math.cos(rawAngle) * dist2D;
          }

          const moveAngle = Math.atan2(goalX - ox, goalZ - oz);
          po.group.rotation.y = Math.atan2(dx, dz);

          const shouldAdvance = Math.abs(dy) > 1.2 || dist2D > 7.5 || Boolean(playerBldg);
          if (shouldAdvance) {
            const officerSpeed = 4.9;
            const stepX = Math.sin(moveAngle) * officerSpeed * dt;
            const stepZ = Math.cos(moveAngle) * officerSpeed * dt;
            let moved = movePersonWithWallCollision(ox, oz, oy, stepX, stepZ, 0.34);
            if (isPointInsideAnyBuildingFootprint(moved.x, moved.z, 0.35)) {
              // Never step inside a house or building!
              moved.x = ox;
              moved.z = oz;
            }

            if (Math.hypot(moved.x - ox, moved.z - oz) < officerSpeed * dt * 0.25) {
              const sideSign = poIdx % 2 === 0 ? 1 : -1;
              const altAngle1 = moveAngle + (Math.PI * 0.45) * sideSign;
              const altAngle2 = moveAngle - (Math.PI * 0.45) * sideSign;
              const try1 = movePersonWithWallCollision(
                ox,
                oz,
                oy,
                Math.sin(altAngle1) * officerSpeed * dt,
                Math.cos(altAngle1) * officerSpeed * dt,
                0.34
              );
              if (Math.hypot(try1.x - ox, try1.z - oz) > officerSpeed * dt * 0.35) {
                moved = try1;
              } else {
                const try2 = movePersonWithWallCollision(
                  ox,
                  oz,
                  oy,
                  Math.sin(altAngle2) * officerSpeed * dt,
                  Math.cos(altAngle2) * officerSpeed * dt,
                  0.34
                );
                if (Math.hypot(try2.x - ox, try2.z - oz) > officerSpeed * dt * 0.35) {
                  moved = try2;
                }
              }
            }

            po.group.position.x = moved.x;
            po.group.position.z = moved.z;

            const nextSkyFloor = getSkyscraperFloorOrStairHeight(
              po.group.position.x,
              oy,
              po.group.position.z,
              skyscrapersRef.current
            );
            const targetY = nextSkyFloor !== null ? Math.max(0, nextSkyFloor) : 0;
            if (Math.abs(targetY - oy) <= 2.2) {
              oy = THREE.MathUtils.lerp(oy, targetY, Math.min(1, dt * 20));
            } else if (targetY < oy) {
              oy = Math.max(targetY, oy - 18.0 * dt);
            }
            po.group.position.y = oy;

            const sw = Math.sin(clock.getElapsedTime() * 11 + poIdx) * 0.65;
            po.legL.rotation.x = sw;
            po.legR.rotation.x = -sw;
          } else {
            po.legL.rotation.x = 0;
            po.legR.rotation.x = 0;
          }

          // Distinct Police Officer animations for Non-Shooting Carry vs Active Gun Shooting (with horizontal rifle)!
          if ((po.shootAnimTimer || 0) > 0) {
            po.shootAnimTimer = Math.max(0, (po.shootAnimTimer || 0) - dt);
            const env = Math.sin((po.shootAnimTimer / 0.48) * Math.PI);
            const recoilPulse = Math.abs(Math.sin(po.shootAnimTimer * Math.PI * 6));
            // Shooting Animation: Raise both arms to shoulder level, rapid recoil kickback, upper-body lean, and bright muzzle flash!
            po.armR.rotation.x = -Math.PI / 2 - recoilPulse * 0.46;
            po.armR.rotation.z = -0.14 - recoilPulse * 0.08;
            po.armL.rotation.x = -Math.PI * 0.48 - recoilPulse * 0.4;
            po.armL.rotation.z = 0.38;
            po.group.rotation.x = -env * 0.1 - recoilPulse * 0.08;
            if (po.weaponMesh) {
              // Compensate for armR.rotation.x so rifle stays horizontal with slight muzzle climb and slides back on recoil
              po.weaponMesh.rotation.x = -po.armR.rotation.x - recoilPulse * 0.16;
              po.weaponMesh.position.set(0, -0.56 + recoilPulse * 0.12, 0.14 - recoilPulse * 0.06);
            }
            if (po.muzzleFlash) {
              po.muzzleFlash.visible = recoilPulse > 0.25;
              const fScale = 0.9 + recoilPulse * 0.85;
              po.muzzleFlash.scale.set(fScale, fScale, fScale * 1.6);
              po.muzzleFlash.rotation.z += 28 * dt;
            }
          } else {
            // Non-Shooting Patrol/Chase Stance: Lower tactical hip/chest carry with natural stride bob while keeping gun 100% horizontal!
            const carryBob = shouldAdvance ? Math.sin(clock.getElapsedTime() * 11 + poIdx) * 0.14 : 0;
            po.armR.rotation.x = -0.85 + carryBob;
            po.armR.rotation.z = -0.04;
            po.armL.rotation.x = -0.78 - carryBob * 0.7;
            po.armL.rotation.z = 0.22;
            po.group.rotation.x = 0;
            if (po.weaponMesh) {
              po.weaponMesh.rotation.x = -po.armR.rotation.x;
              po.weaponMesh.position.set(0, -0.56, 0.14);
            }
            if (po.muzzleFlash) po.muzzleFlash.visible = false;
          }

          po.shootCooldown -= dt;
          // Fire when within range and on the same floor/stair flight with clear vertical sightline and NO OBSTRUCTIONS between officer and player!
          const poShootPos = new THREE.Vector3(po.group.position.x, po.group.position.y + 1.35, po.group.position.z);
          const pShootTargetPos = new THREE.Vector3(px, py + 1.0, pz);
          if (po.shootCooldown <= 0 && dist3D < 38.0 && Math.abs(dy) < 5.5 && isLineOfSightClear(poShootPos, pShootTargetPos)) {
            po.shootCooldown = 0.95 + Math.random() * 0.5;
            po.shootAnimTimer = 0.48;
            soundFX.playLowPolyExplosion();
            const bMesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.065, 8, 8),
              new THREE.MeshBasicMaterial({ color: 0xef4444 })
            );
            bMesh.position.set(po.group.position.x, po.group.position.y + 1.35, po.group.position.z);
            projectilesGroup.add(bMesh);
            const toP = new THREE.Vector3(dx, (py + 1.0) - (po.group.position.y + 1.35), dz).normalize();
            activeProjectiles.push({
              mesh: bMesh,
              vel: toP.clone().multiplyScalar(50.0),
              isExplosive: false,
              life: 0,
              maxLife: 1.6,
              weaponName: 'Police Tactical Rifle',
              damage: 15,
              isNpcBullet: true,
            });
          }
        }
      } else if (!cur.policeModeEnabled || (cur.wantedLevel || 0) === 0 || cur.pvpConfig?.active || isDisasterActive) {
        if (isDisasterActive || (cur.wantedLevel || 0) === 0) {
          currentWantedStars = 0;
          wantedDecayTimer = 0;
          lastReportedDecaySec = -1;
          if (isDisasterActive && (cur.wantedLevel || 0) > 0) {
            cur.onWantedLevelChange?.(0);
            cur.onWantedDecayTimerUpdate?.(0, 60.0);
          }
        }
        if (policeCruisers.length > 0) {
          for (const pc of policeCruisers) policeGroup.remove(pc.group);
          policeCruisers.length = 0;
        }
        if (policeOfficers.length > 0) {
          for (const po of policeOfficers) policeGroup.remove(po.group);
          policeOfficers.length = 0;
        }
      }

      // =======================================================================
      // PVP FLAT GRASSLAND BATTLE ARENA SIMULATION (DEDICATED MAP & NON-FLEEING AI)
      // =======================================================================
      if (cur.pvpConfig?.active) {
        if (cur.pvpStartNonce !== lastPvpNonce || !lastPvpActive) {
          lastPvpNonce = cur.pvpStartNonce || 0;
          lastPvpActive = true;
          startPvpBattleArena();
        }

        const pWorldPos = getActivePlayerWorldPos();
        let aliveEnemies = 0;

        for (const pe of pvpEnemies) {
          if (pe.dead) continue;
          aliveEnemies++;
          pe.healthBarGroup.lookAt(camera.position);

          // DO NOT MOVE IF COUNTDOWN IS ACTIVE
          if (cur.battleCountdown !== null && cur.battleCountdown > 0) {
            continue;
          }

          const dx = pWorldPos.x - pe.x;
          const dy = pWorldPos.y - pe.y;
          const dz = pWorldPos.z - pe.z;
          const dist = Math.hypot(dx, dz);

          if (pe.kind === 'on_foot') {
            pe.rotY = Math.atan2(dx, dz);
            pe.group.rotation.y = pe.rotY;

            // Soldiers NEVER run away from you when you approach them, AND they don't crowd too close on their own either!
            // If farther than 14m, they advance toward ~13m range; once within 14m, they hold their distance and strafe side-to-side so you can walk right up to them!
            pe.strafeTimer = (pe.strafeTimer ?? 1.5) - dt;
            if (pe.strafeTimer <= 0) {
              pe.strafeTimer = 1.1 + Math.random() * 1.4;
              pe.strafeDir = (pe.strafeDir ?? 1) * -1;
            }
            const strafeSign = pe.strafeDir ?? 1;
            const fwdX = Math.sin(pe.rotY);
            const fwdZ = Math.cos(pe.rotY);
            const perpX = fwdZ;
            const perpZ = -fwdX;

            let moveX = perpX * strafeSign * 1.85;
            let moveZ = perpZ * strafeSign * 1.85;
            if (pe.isMelee) {
              // Melee enemies charge toward the player but stop a short distance away to avoid clipping!
              if (dist > 2.45) {
                const chargeSpd = pe.speed;
                moveX = fwdX * chargeSpd;
                moveZ = fwdZ * chargeSpd;
              } else if (dist < 1.9) {
                // Back up slightly if player crowds them
                const retreatSpd = pe.speed * 0.45;
                moveX = -fwdX * retreatSpd;
                moveZ = -fwdZ * retreatSpd;
              } else {
                moveX = 0;
                moveZ = 0;
              }
            } else if (dist > 14.0) {
              const advanceSpd = Math.min(pe.speed, (dist - 13.0) * 1.6);
              moveX += fwdX * advanceSpd;
              moveZ += fwdZ * advanceSpd;
            }
            pe.x += moveX * dt;
            pe.z += moveZ * dt;
            pe.group.position.set(pe.x, 0, pe.z);

            const sw = Math.sin(clock.getElapsedTime() * 10 + pe.x * 0.2) * (dist > 14.0 || pe.isMelee ? 0.62 : 0.28);
            if (pe.legL) pe.legL.rotation.x = sw;
            if (pe.legR) pe.legR.rotation.x = -sw;

            // Distinct Battle Mode NPC animations for Non-Shooting Carry vs Active Gun Shooting / Melee
            if ((pe.shootAnimTimer || 0) > 0) {
              pe.shootAnimTimer = Math.max(0, (pe.shootAnimTimer || 0) - dt);
              const env = Math.sin((pe.shootAnimTimer / 0.42) * Math.PI);
              const recoilPulse = Math.abs(Math.sin(pe.shootAnimTimer * Math.PI * 6));
              const kickMag = pe.isHeavyRpg ? 0.54 : pe.isMelee ? 0.65 : 0.44;
              if (pe.armR) {
                pe.armR.rotation.x = -Math.PI / 2 - recoilPulse * kickMag;
                pe.armR.rotation.z = -0.14 - recoilPulse * 0.08;
              }
              if (pe.armL) {
                pe.armL.rotation.x = -Math.PI * 0.48 - recoilPulse * (kickMag * 0.85);
                pe.armL.rotation.z = 0.38;
              }
              pe.group.rotation.x = -env * 0.11 - recoilPulse * 0.09;
              if (pe.weaponMesh && pe.armR) {
                pe.weaponMesh.rotation.x = -pe.armR.rotation.x - recoilPulse * 0.18;
                pe.weaponMesh.position.set(0, -0.56 + recoilPulse * 0.13, 0.14 - recoilPulse * 0.07);
              }
              if (pe.muzzleFlash) {
                pe.muzzleFlash.visible = recoilPulse > 0.22 && !pe.isMelee;
                const fScale = 0.95 + recoilPulse * 0.9;
                pe.muzzleFlash.scale.set(fScale, fScale, fScale * 1.65);
                pe.muzzleFlash.rotation.z += 28 * dt;
              }
            } else {
              // Non-Shooting Move/Strafe Stance: Lower tactical hip/chest carry with natural stride bob
              const carryBob = Math.sin(clock.getElapsedTime() * 10 + pe.x * 0.2) * 0.14;
              if (pe.armR) {
                pe.armR.rotation.x = (pe.isMelee ? -0.55 : -0.85) + carryBob;
                pe.armR.rotation.z = -0.04;
              }
              if (pe.armL) {
                pe.armL.rotation.x = (pe.isMelee ? -0.55 : -0.78) - carryBob * 0.7;
                pe.armL.rotation.z = 0.22;
              }
              pe.group.rotation.x = 0;
              if (pe.weaponMesh && pe.armR) {
                pe.weaponMesh.rotation.x = -pe.armR.rotation.x;
                pe.weaponMesh.position.set(0, -0.56, 0.14);
              }
              if (pe.muzzleFlash) pe.muzzleFlash.visible = false;
            }

            pe.attackCooldown -= dt;
            const dist3D = Math.hypot(dx, dy, dz);
            const enemyShootPos = new THREE.Vector3(pe.x, 1.4, pe.z);
            const pTargetPos = new THREE.Vector3(pWorldPos.x, pWorldPos.y + 0.8, pWorldPos.z);
            const canEngage = (dist < 95.0 || (curVehicle && dist3D < 195.0)) && isLineOfSightClear(enemyShootPos, pTargetPos);

            if (pe.isMelee) {
              if (pe.attackCooldown <= 0 && dist < 2.5) {
                pe.attackCooldown = 0.55 + Math.random() * 0.2;
                pe.shootAnimTimer = 0.32;
                soundFX.playPlaceObject();
                const meleeDmg = pe.weaponType === 'chainsaw' ? 30 : pe.weaponType === 'melee' ? 24 : 16;
                const isCity = !cur.platformerMode && !cur.pvpConfig?.active;
                const effDmg = isCity ? meleeDmg * 0.5 : meleeDmg;
                if (curVehicle) {
                  if (activeVehicle === 'helicopter') {
                    const nextH = Math.max(0, heliHealthRef.current - effDmg);
                    heliHealthRef.current = nextH;
                    setHeliHealth(nextH);
                    if (nextH <= 0) triggerHouseExplosion(pWorldPos.x, pWorldPos.z, pWorldPos.y, 'HELICOPTER DESTROYED', '');
                  } else if (activeVehicle === 'plane') {
                    const nextP = Math.max(0, planeHealthRef.current - effDmg);
                    planeHealthRef.current = nextP;
                    setPlaneHealth(nextP);
                    if (nextP <= 0) triggerHouseExplosion(pWorldPos.x, pWorldPos.z, pWorldPos.y, 'PLANE DESTROYED', '');
                  } else {
                    const nextC = Math.max(0, carHealthRef.current - effDmg);
                    carHealthRef.current = nextC;
                    setCarHealth(nextC);
                    if (nextC <= 0) triggerHouseExplosion(pWorldPos.x, pWorldPos.z, pWorldPos.y, 'VEHICLE DESTROYED', '');
                  }
                } else {
                  const nextHp = Math.max(0, playerHealthRef.current - effDmg);
                  playerHealthRef.current = nextHp;
                  lastDisplayedHp = Math.round(nextHp);
                  setPlayerHealth(nextHp);
                  triggerDamageFlash();
                  cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.3);
                  if (nextHp <= 0) {
                    triggerPlayerAttackerDeath(pe.weaponName || 'Enemy Brawler');
                  }
                }
              }
            } else if (pe.attackCooldown <= 0 && canEngage) {
              const isRpg = pe.weaponType === 'rpg';
              const isMinigun = pe.weaponType === 'minigun';
              const isShotgun = pe.weaponType === 'shotgun';
              const isSniper = pe.weaponType === 'sniper';
              const isSmg = pe.weaponType === 'smg';
              const isPistol = pe.weaponType === 'pistol';

              pe.attackCooldown = isMinigun
                ? 0.12 + Math.random() * 0.06
                : isSmg
                ? 0.22 + Math.random() * 0.08
                : isRpg
                ? 1.55 + Math.random() * 0.35
                : isSniper
                ? 1.45 + Math.random() * 0.25
                : isShotgun
                ? 0.85 + Math.random() * 0.2
                : isPistol
                ? 0.62 + Math.random() * 0.18
                : 0.52 + Math.random() * 0.22;

              pe.shootAnimTimer = isMinigun ? 0.12 : isSmg ? 0.18 : 0.42;
              
              if (isMinigun) {
                soundFX.playMinigunBurst();
              } else if (isRpg) {
                soundFX.playLowPolyExplosion();
              } else if (isSniper) {
                soundFX.playLowPolyExplosion(); // Sniper uses heavy shot sound
              } else {
                soundFX.playLowPolyExplosion(); // Default for others
              }

              if (isShotgun) {
                for (let s = -1; s <= 1; s++) {
                  const bMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.065, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xfacc15 })
                  );
                  bMesh.position.set(pe.x + fwdX * 0.7 + perpX * (s * 0.12), 1.4, pe.z + fwdZ * 0.7 + perpZ * (s * 0.12));
                  projectilesGroup.add(bMesh);
                  const spreadDir = new THREE.Vector3(dx + perpX * (s * 4.0), (pWorldPos.y + 0.8) - 1.4, dz + perpZ * (s * 4.0)).normalize();
                  activeProjectiles.push({
                    mesh: bMesh,
                    vel: spreadDir.multiplyScalar(78.0),
                    isExplosive: false,
                    life: 0,
                    maxLife: 2.2,
                    weaponName: pe.weaponName || 'Combat Shotgun',
                    damage: 16,
                    isNpcBullet: true,
                  });
                }
              } else {
                const isExplosive = isRpg;
                const bMesh = new THREE.Mesh(
                  isExplosive
                    ? new THREE.CylinderGeometry(0.11, 0.11, 0.7, 8)
                    : new THREE.SphereGeometry(isSniper ? 0.095 : isMinigun ? 0.065 : 0.085, 8, 8),
                  new THREE.MeshBasicMaterial({
                    color: isExplosive ? 0xf97316 : isSniper ? 0x60cdff : isMinigun ? 0xfde047 : 0xef4444,
                  })
                );
                if (isExplosive) bMesh.rotation.x = Math.PI / 2;
                bMesh.position.set(pe.x + fwdX * 0.7, 1.4, pe.z + fwdZ * 0.7);
                projectilesGroup.add(bMesh);
                const projSpeed = isExplosive ? 72.0 : isSniper ? 145.0 : isMinigun ? 105.0 : 88.0;
                const dirVec = new THREE.Vector3(dx, (pWorldPos.y + 0.8) - 1.4, dz).normalize();
                activeProjectiles.push({
                  mesh: bMesh,
                  vel: dirVec.multiplyScalar(projSpeed),
                  isExplosive,
                  life: 0,
                  maxLife: 4.5,
                  weaponName: pe.weaponName || 'Elite PvP Soldier',
                  damage: isExplosive ? 45 : isSniper ? 55 : isMinigun ? 12 : isSmg ? 15 : isPistol ? 18 : 22,
                  isNpcBullet: true,
                });
              }
            }
          } else if (pe.kind === 'car') {
            pe.rotY = Math.atan2(dx, dz);
            pe.x += Math.sin(pe.rotY) * pe.speed * 0.447 * dt;
            pe.z += Math.cos(pe.rotY) * pe.speed * 0.447 * dt;
            pe.group.position.set(pe.x, 0, pe.z);
            pe.group.rotation.y = pe.rotY;
            if (dist < 3.2) {
              const carHp = Math.max(0, (curVehicle ? carHealthRef.current : playerHealthRef.current) - 2.6 * dt * 3.5);
              if (curVehicle) {
                carHealthRef.current = carHp;
                setCarHealth(carHp);
              } else {
                playerHealthRef.current = carHp;
                setPlayerHealth(carHp);
                triggerDamageFlash();
              }
              cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.4);
              if (carHp <= 0) triggerHouseExplosion(pWorldPos.x, pWorldPos.z, 0, 'You died', '');
            }
          } else if (pe.kind === 'helicopter') {
            if (pe.mainRotor) pe.mainRotor.rotation.y += 32.0 * dt;
            if (pe.tailRotor) pe.tailRotor.rotation.x += 42.0 * dt;
            const desiredX = pWorldPos.x + (pe.lineOffsetX ?? 0) + Math.sin(clock.getElapsedTime() * 0.8 + (pe.lineOffsetX ?? 0)) * 3.5;
            const desiredZ = pWorldPos.z + 45;
            pe.x = THREE.MathUtils.lerp(pe.x, desiredX, dt * 1.8);
            pe.z = THREE.MathUtils.lerp(pe.z, desiredZ, dt * 1.8);
            pe.y = THREE.MathUtils.lerp(pe.y, 24.0, dt * 2.0);
            pe.rotY = Math.atan2(pWorldPos.x - pe.x, pWorldPos.z - pe.z);
            pe.group.position.set(pe.x, pe.y, pe.z);
            pe.group.rotation.y = pe.rotY;
            pe.attackCooldown -= dt;
            if (pe.attackCooldown <= 0) {
              pe.attackCooldown = 0.55;
              soundFX.playMinigunBurst();
              const bMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xf97316 })
              );
              bMesh.position.set(pe.x, pe.y - 0.5, pe.z);
              projectilesGroup.add(bMesh);
              const dirVec = new THREE.Vector3(pWorldPos.x - pe.x, pWorldPos.y - pe.y, pWorldPos.z - pe.z).normalize();
              activeProjectiles.push({
                mesh: bMesh,
                vel: dirVec.multiplyScalar(75.0),
                isExplosive: true,
                life: 0,
                maxLife: 2.2,
                weaponName: 'PvP Gunship Rocket',
                damage: 28,
                isNpcBullet: true,
              });
            }
          } else if (pe.kind === 'plane') {
            pe.rotY = Math.atan2(dx, dz);
            pe.x += Math.sin(pe.rotY) * pe.speed * 0.447 * dt;
            pe.z += Math.cos(pe.rotY) * pe.speed * 0.447 * dt;
            pe.y = 42.0 + Math.sin(clock.getElapsedTime() * 2) * 6;
            pe.group.position.set(pe.x, pe.y, pe.z);
            pe.group.rotation.y = pe.rotY;
            pe.attackCooldown -= dt;
            if (pe.attackCooldown <= 0 && dist < 120.0) {
              pe.attackCooldown = 0.65;
              soundFX.playLowPolyExplosion();
              const bMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.14, 0.14, 1.0, 8),
                new THREE.MeshBasicMaterial({ color: 0xef4444 })
              );
              bMesh.rotation.x = Math.PI / 2;
              bMesh.position.set(pe.x, pe.y, pe.z);
              projectilesGroup.add(bMesh);
              const dirVec = new THREE.Vector3(dx, dy, dz).normalize();
              activeProjectiles.push({
                mesh: bMesh,
                vel: dirVec.multiplyScalar(95.0),
                isExplosive: true,
                life: 0,
                maxLife: 2.4,
                weaponName: 'PvP Fighter Jet Missile',
                damage: 35,
                isNpcBullet: true,
              });
            }
          }
        }
      } else if (lastPvpActive) {
        lastPvpActive = false;
        clearPvpEnemies();
        clearAllBombsAndProjectilesRef?.();
        cityGroup.visible = true;
        houseGroup.visible = true;
        mainRoadMesh.visible = true;
        roadPropsGroup.visible = true;
        allRoadsInst.visible = true;
        allStopPostsInst.visible = true;
        allStopSignsInst.visible = true;
        allYellowDashesInst.visible = true;
        allWhiteEdgesInst.visible = true;
        allSidewalksInst.visible = true;
        allZebraInst.visible = true;
        npcCarsGroup.visible = true;
        excavatorRoadsGroup.visible = true;
        fallingTreesGroup.visible = true;
        policeGroup.visible = true;
        for (const pk of parkedCars) {
          if (!pk.destroyed) pk.group.visible = true;
        }
        if (hasSpawnedCarRef.current && activeCarGroupRef.current) activeCarGroupRef.current.visible = true;
        if (hasSpawnedMotorcycleRef.current && activeMotorcycleGroupRef.current) activeMotorcycleGroupRef.current.visible = true;
        if (hasSpawnedHeliRef.current && activeHeliGroupRef.current) activeHeliGroupRef.current.visible = true;
        if (hasSpawnedPlaneRef.current && activePlaneGroupRef.current) activePlaneGroupRef.current.visible = true;
        if (hasSpawnedExcavatorRef.current && activeExcavatorGroupRef.current) activeExcavatorGroupRef.current.visible = true;
        for (const ch of forestChunks) ch.group.visible = true;

        // Teleport player back from the Battle Mode grassland map (3200, 3200) to their exact City coordinates!
        const returnSpot = savedCityPlayerPos || { ...lastKnownCityPos };
        savedCityPlayerPos = null;
        stateRef.current.onExitVehicle?.();
        humanPosRef.current.set(returnSpot.x, returnSpot.y, returnSpot.z);
        playerContainer.position.set(returnSpot.x, returnSpot.y, returnSpot.z);
        playerContainer.visible = !stateRef.current.isFirstPerson;
        camera.position.set(returnSpot.x, returnSpot.y + 1.65, returnSpot.z - 3.5);
        camera.lookAt(returnSpot.x, returnSpot.y + 1.5, returnSpot.z + 5);
        lastCullX = -99999;
        lastCullZ = -99999;
        updateActiveAreaVisibility(returnSpot.x, returnSpot.z, false);
      }

      // =======================================================================
      // ROBLOX OBBY PLATFORMER MODE: HAZARDS, FIST-FIGHTING NPCS & END PORTAL
      // =======================================================================
      if (cur.platformerMode && activeObbyLevel && !isExplodingRef.current && !isFallingToCityInPlatformer) {
        const px = humanPosRef.current.x;
        const py = humanPosRef.current.y;
        const pz = humanPosRef.current.z;

        // 1. Check End-of-Level Portal Goal
        const goalP = activeObbyLevel.goalPlatform;
        const dGoal = Math.hypot(px - goalP.curX, pz - goalP.curZ);
        if (dGoal <= 2.4 && Math.abs(py - goalP.curY) <= 2.3) {
          soundFX.playInteractChime();
          const currentLvl = Math.max(1, Math.min(TOTAL_PLATFORMER_LEVELS, cur.platformerLevel || 1));
          const nextLvl = currentLvl + 1;
          if (nextLvl <= TOTAL_PLATFORMER_LEVELS) {
            lastPlatformerLevel = nextLvl;
            startPlatformerLevel(nextLvl);
            cur.onPlatformerLevelChange?.(nextLvl);
          } else {
            lastPlatformerLevel = 1;
            startPlatformerLevel(1);
            cur.onPlatformerLevelChange?.(nextLvl);
          }
        } else {
          // 2. Check Lasers, Spinning Laser Beams, Sweeping Pushers & Crusher Gates
          for (const h of activeObbyLevel.hazards) {
            if (h.kind === 'laser_spinner') {
              const spinnerYOverlap = py + 1.42 >= h.curY - 0.05 && py + 0.26 <= h.curY + 0.05;
              if (!spinnerYOverlap) continue;
              const dx = px - h.curX;
              const dz = pz - h.curZ;
              const theta = h.spinnerAngle || 0;
              const halfL = h.spinnerRadius || 2.4;
              // CylinderGeometry rotated +90deg on X points along local Z, so rotation.y = theta points along (sin(theta), cos(theta))
              const along = dx * Math.sin(theta) + dz * Math.cos(theta);
              const perp = Math.abs(dx * Math.cos(theta) - dz * Math.sin(theta));
              if (Math.abs(along) <= Math.max(0.2, halfL - 0.18) && perp <= 0.11) {
                playerHealthRef.current = 0;
                setPlayerHealth(0);
                soundFX.playExplosion();
                triggerPlayerDeath('You died', '');
                break;
              }
              continue;
            }

            const yOverlap = py + 1.52 >= h.curY - h.halfH && py + 0.22 <= h.curY + h.halfH;
            if (!yOverlap) continue;

            if (h.kind === 'pusher_block') {
              if (Math.abs(px - h.curX) <= h.halfW + 0.36 && Math.abs(pz - h.curZ) <= h.halfD + 0.36) {
                const pushSign = px >= h.curX ? 1 : -1;
                humanPosRef.current.x += pushSign * 17.5 * dt;
                humanVelYRef.current = Math.max(humanVelYRef.current, 2.2);
                cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.25);
              }
            } else if (h.kind === 'crusher_overhead') {
              if (Math.abs(px - h.curX) <= h.halfW + 0.15 && Math.abs(pz - h.curZ) <= h.halfD + 0.15) {
                playerHealthRef.current = 0;
                setPlayerHealth(0);
                soundFX.playExplosion();
                triggerPlayerDeath('You died', '');
                break;
              }
            } else {
              // laser_static, laser_moving
              if (Math.abs(px - h.curX) <= Math.max(0.2, h.halfW - 0.08) && Math.abs(pz - h.curZ) <= 0.12) {
                playerHealthRef.current = 0;
                setPlayerHealth(0);
                soundFX.playExplosion();
                triggerPlayerDeath('You died', '');
                break;
              }
            }
          }

          // 3. Fist-Fighting Obby Brawler NPCs (Levels 26 - 50)
          for (let nIdx = 0; nIdx < obbyNpcs.length; nIdx++) {
            const onpc = obbyNpcs[nIdx];
            if (onpc.dead) continue;
            onpc.healthBarGroup.lookAt(camera.position);

            const dx = px - onpc.x;
            const dy = py - onpc.y;
            const dz = pz - onpc.z;
            const dist = Math.hypot(dx, dz);

            if (dist < 15.0 && Math.abs(dy) < 3.2) {
              onpc.rotY = Math.atan2(dx, dz);
              onpc.group.rotation.y = onpc.rotY;

              if (dist > 1.32) {
                const npcSpd = 4.6;
                onpc.x = Math.max(onpc.minX, Math.min(onpc.maxX, onpc.x + (dx / dist) * npcSpd * dt));
                onpc.z = Math.max(onpc.minZ, Math.min(onpc.maxZ, onpc.z + (dz / dist) * npcSpd * dt));
                onpc.group.position.set(onpc.x, onpc.y, onpc.z);
                const sw = Math.sin(clock.elapsedTime * 12 + nIdx) * 0.6;
                onpc.legL.rotation.x = sw;
                onpc.legR.rotation.x = -sw;
              } else {
                onpc.legL.rotation.x = 0;
                onpc.legR.rotation.x = 0;
              }

              onpc.punchCooldown = Math.max(0, onpc.punchCooldown - dt);
              if (dist <= 1.85 && Math.abs(dy) < 1.8 && onpc.punchCooldown <= 0 && !isExplodingRef.current && !stateRef.current.activeVehicle) {
                onpc.punchCooldown = 0.68;
                onpc.punchAnimTimer = 0.28;
                onpc.handSide = onpc.handSide > 0 ? -1 : 1;

                const nextHp = Math.max(0, playerHealthRef.current - 18);
                playerHealthRef.current = nextHp;
                setPlayerHealth(nextHp);
                triggerDamageFlash(0.5);
                soundFX.playPlaceObject();
                cameraShakeRef.current = Math.max(cameraShakeRef.current, 0.25);

                if (dist > 0.05) {
                  humanPosRef.current.x += (dx / dist) * 0.48;
                  humanPosRef.current.z += (dz / dist) * 0.48;
                }

                if (nextHp <= 0) {
                  triggerPlayerDeath('You died', '');
                  break;
                }
              }
            } else {
              onpc.legL.rotation.x = 0;
              onpc.legR.rotation.x = 0;
            }

            if (onpc.punchAnimTimer > 0) {
              onpc.punchAnimTimer = Math.max(0, onpc.punchAnimTimer - dt);
              const pProg = 1 - onpc.punchAnimTimer / 0.28;
              const jab = Math.sin(pProg * Math.PI);
              if (onpc.handSide > 0) {
                onpc.armR.rotation.x = -0.65 - jab * 1.15;
                onpc.armL.rotation.x = -0.65;
              } else {
                onpc.armL.rotation.x = -0.65 - jab * 1.15;
                onpc.armR.rotation.x = -0.65;
              }
            } else {
              onpc.armL.rotation.x = -0.65;
              onpc.armR.rotation.x = -0.65;
            }
          }
        }
      }

      // =======================================================================
      // NATURAL DISASTERS SIMULATION (TORNADO, EARTHQUAKE, METEOR, RISING FLOOD)
      // =======================================================================
      const disaster = cur.activeDisaster || 'none';

      // 1. Rising Flood Survival Game (30s Countdown -> rises all the way to the top floor of the tallest tower!)
      if (disaster === 'flood' && lastActiveDisaster !== 'flood') {
        resetFloodToCountdown();
      }
      lastActiveDisaster = disaster;

      if (disaster === 'flood') {
        // Compute the top walkable floor height of the tallest skyscraper (Ping An Finance Center 66 stories -> floor 65 at 292.5m)
        let maxTowerTopFloorY = 292.5;
        for (const s of skyscrapersRef.current) {
          const topFloorY = (s.numFloors - 1) * s.floorH;
          if (topFloorY > maxTowerTopFloorY) maxTowerTopFloorY = topFloorY;
        }

        if (!isExplodingRef.current) {
          if (floodCountdownTimer > 0) {
            floodCountdownTimer = Math.max(0, floodCountdownTimer - dt);
            floodWaterY = 0;
            floodWaterMesh.visible = false;
            const secLeft = Math.ceil(floodCountdownTimer);
            if (secLeft !== lastDisplayedFloodCountdown) {
              lastDisplayedFloodCountdown = secLeft;
              setFloodCountdownSec(secLeft);
              setFloodHeightDisplay(null);
              cur.onFloodHeightUpdate?.(-secLeft);
            }
          } else {
            if (lastDisplayedFloodCountdown !== 0) {
              lastDisplayedFloodCountdown = 0;
              setFloodCountdownSec(0);
            }
            floodWaterMesh.visible = true;
            // Rise at ~1.05 m/s to match the player's skyscraper staircase climbing pace (~4.5m per story in ~4.3s)
            floodWaterY = Math.min(maxTowerTopFloorY, floodWaterY + 1.05 * dt);
            floodWaterMesh.position.y = floodWaterY;
            cur.onFloodHeightUpdate?.(floodWaterY);
            setFloodHeightDisplay({
              current: Math.round(floodWaterY * 10) / 10,
              max: Math.round(maxTowerTopFloorY * 10) / 10,
            });
            if (floodWaterY >= maxTowerTopFloorY) {
              stateRef.current.onFloodCompleted?.();
            }

            const pWorldPos = getActivePlayerWorldPos();
            // Water kills anyone who does not get to the top in time, and resets the water & 30s countdown on death!
            if (!cur.invincibleMode && pWorldPos.y + 1.1 < floodWaterY) {
              playerHealthRef.current = 0;
              setPlayerHealth(0);
              triggerPlayerDeath(
                'DROWNED IN THE RISING FLOOD',
                'The floodwaters overtook you! Climb the skyscraper stairs to reach the top floor.'
              );
            }
          }
        }
      } else {
        if (floodWaterMesh.visible || lastDisplayedFloodCountdown !== null) {
          floodWaterMesh.visible = false;
          floodWaterY = 0;
          floodCountdownTimer = 30.0;
          lastDisplayedFloodCountdown = null;
          setFloodCountdownSec(null);
          setFloodHeightDisplay(null);
          cur.onFloodHeightUpdate?.(0);
        }
      }

      // 2. Tornado and Earthquake logic removed.

      // 4. Meteor Shower (Meteors streak from sky, detonating and destroying buildings)
      if (disaster === 'meteor_shower') {
        meteorSpawnTimer += dt;
        if (meteorSpawnTimer >= 0.42) {
          meteorSpawnTimer = 0;
          const pWorldPos = getActivePlayerWorldPos();
          const ox = (Math.random() - 0.5) * 160;
          const oz = (Math.random() - 0.5) * 160;
          const targetX = pWorldPos.x + ox;
          const targetZ = pWorldPos.z + oz;
          const mMesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(2.4, 1),
            new THREE.MeshBasicMaterial({ color: 0xf97316 })
          );
          mMesh.position.set(targetX - 35, 120, targetZ - 25);
          projectilesGroup.add(mMesh);
          soundFX.playLowPolyExplosion();
          activeProjectiles.push({
            mesh: mMesh,
            vel: new THREE.Vector3(26.0, -95.0, 18.0),
            isExplosive: true,
            life: 0,
            maxLife: 2.5,
            weaponName: 'Meteor Shower',
            damage: 350,
            isDisaster: true,
          });
        }
      }

      // =======================================================================
      // COLLAPSING BUILDINGS PHYSICS (TOPPLES IN OPPOSITE DIRECTION OF DAMAGE & CRUSHES TARGETS)
      // =======================================================================
      respawnProtectionTimerRef.current = Math.max(0, respawnProtectionTimerRef.current - dt);

      for (const bldg of destructibleBuildingsRef.current) {
        if (bldg.collapsing && !bldg.destroyed) {
          // Fall down with gravity acceleration and progressive tilt away from the impact!
          bldg.collapseVelY = Math.min(36.0, (bldg.collapseVelY || 6.0) + 18.0 * dt);
          bldg.group.position.y -= bldg.collapseVelY * dt;

          bldg.collapseTiltAngle = Math.min(0.42, (bldg.collapseTiltAngle || 0) + (bldg.collapseTiltVel || 0.28) * dt);
          const cDirX = bldg.collapseDirX || 0;
          const cDirZ = bldg.collapseDirZ || 0;
          bldg.group.position.x += cDirX * 3.2 * dt;
          bldg.group.position.z += cDirZ * 3.2 * dt;
          bldg.group.rotation.x = (bldg.collapseTiltAngle || 0) * cDirZ;
          bldg.group.rotation.z = -(bldg.collapseTiltAngle || 0) * cDirX;

          // Spawn occasional dust/debris puffs as it sinks
          if (Math.random() < 0.28) {
            spawnDebrisBurst(
              bldg.cx + (Math.random() - 0.5) * bldg.w * 0.8,
              Math.max(0.8, bldg.group.position.y + bldg.h * 0.35),
              bldg.cz + (Math.random() - 0.5) * bldg.d * 0.8,
              18
            );
          }

          // Any building that falls on a player kills the player (neutralized upon death/respawn!)
          const pPos = getActivePlayerWorldPos();
          const pInBounds =
            pPos.x >= bldg.cx - bldg.w * 0.52 &&
            pPos.x <= bldg.cx + bldg.w * 0.52 &&
            pPos.z >= bldg.cz - bldg.d * 0.52 &&
            pPos.z <= bldg.cz + bldg.d * 0.52;

          if (pInBounds && !isExplodingRef.current && !bldg.neutralizedForPlayer && respawnProtectionTimerRef.current <= 0) {
            const bldgTop = bldg.group.position.y + bldg.h;
            // If the collapsing structure is falling on the player:
            if (pPos.y <= bldgTop + 2.5 && bldg.group.position.y <= pPos.y + 14.0) {
              playerHealthRef.current = 0;
              setPlayerHealth(0);
              triggerPlayerDeath('You died', '');
            }
          }

          // Any building that falls on NPCs kills the NPCs!
          for (const npcItem of npcMeshes) {
            if (npcItem.dead) continue;
            const nx = npcItem.group.position.x;
            const nz = npcItem.group.position.z;
            if (
              nx >= bldg.cx - bldg.w * 0.52 &&
              nx <= bldg.cx + bldg.w * 0.52 &&
              nz >= bldg.cz - bldg.d * 0.52 &&
              nz <= bldg.cz + bldg.d * 0.52
            ) {
              killNpcWithBlood(
                npcItem,
                bldg.collapseCausedByDisaster ? 'meteor_shower' : 'crushed_by_building',
                { x: bldg.cx, z: bldg.cz }
              );
            }
          }

          // Once sunken completely below ground level:
          if (bldg.group.position.y <= -bldg.h - 5.0) {
            bldg.collapsing = false;
            bldg.destroyed = true;
            bldg.group.visible = false;
          }
        }
      }

      // Apply Active Camera Shake & Seismic Tremor Animation during normal gameplay!
      if (cameraShakeRef.current > 0 && !isExplodingRef.current) {
        const shakeAmt = cameraShakeRef.current;
        const tShake = clock.getElapsedTime();
        if ((disaster as string) === 'earthquake') {
          // Continuous multi-frequency seismic shaking animation (horizontal, vertical & roll tremor)
          const waveX = (Math.sin(tShake * 43.0) * 0.6 + Math.cos(tShake * 27.0) * 0.4 + (Math.random() - 0.5) * 0.5) * shakeAmt * 0.42;
          const waveY = (Math.cos(tShake * 51.0) * 0.6 + Math.sin(tShake * 31.0) * 0.4 + (Math.random() - 0.5) * 0.5) * shakeAmt * 0.36;
          const waveZ = (Math.sin(tShake * 37.0) * 0.6 + Math.cos(tShake * 23.0) * 0.4 + (Math.random() - 0.5) * 0.5) * shakeAmt * 0.42;
          camera.position.x += waveX;
          camera.position.y = Math.max(0.2, camera.position.y + waveY);
          camera.position.z += waveZ;
          camera.rotation.z += Math.sin(tShake * 35.0) * shakeAmt * 0.045;
        } else {
          camera.position.x += (Math.random() - 0.5) * shakeAmt * 0.35;
          camera.position.y = Math.max(0.2, camera.position.y + (Math.random() - 0.5) * shakeAmt * 0.35);
          camera.position.z += (Math.random() - 0.5) * shakeAmt * 0.35;
        }
        cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 2.2);
      }

      // Update and project 3D Spatial Floating Money Popups every frame in real-time
      if (spatialMoneyPopsRef.current.length > 0) {
        const containerW = container.clientWidth || window.innerWidth;
        const containerH = container.clientHeight || window.innerHeight;
        const activePops: SpatialMoneyPop[] = [];

        for (const pop of spatialMoneyPopsRef.current) {
          pop.age += dt;
          if (pop.age >= pop.maxAge) continue;

          // Float upward continuously in 3D world space over time
          pop.y += dt * 2.2;

          tempSpatialVec.set(pop.x, pop.y, pop.z);
          tempSpatialVec.project(camera);

          // NDC z < 1.0 means the point is in front of the camera lens
          const isFront = tempSpatialVec.z < 1.0;
          const sx = (tempSpatialVec.x * 0.5 + 0.5) * containerW;
          const sy = (tempSpatialVec.y * -0.5 + 0.5) * containerH;

          const isVisibleOnScreen = isFront && sx >= -120 && sx <= containerW + 120 && sy >= -120 && sy <= containerH + 120;

          const progress = pop.age / pop.maxAge;
          let alpha = 1.0;
          if (progress < 0.12) {
            alpha = progress / 0.12;
          } else if (progress > 0.60) {
            alpha = Math.max(0, 1.0 - (progress - 0.60) / 0.40);
          }

          let scale = 1.0;
          if (progress < 0.14) {
            scale = 0.55 + (progress / 0.14) * 0.53;
          } else if (progress < 0.28) {
            scale = 1.08 - ((progress - 0.14) / 0.14) * 0.08;
          } else if (progress > 0.60) {
            scale = 1.0 - ((progress - 0.60) / 0.40) * 0.18;
          }

          pop.screenX = Math.round(sx);
          pop.screenY = Math.round(sy);
          pop.visible = isVisibleOnScreen;
          pop.opacity = Math.max(0, Math.min(1, alpha));
          pop.scale = scale;

          activePops.push(pop);
        }

        spatialMoneyPopsRef.current = activePops;
        setRenderSpatialPops([...activePops]);
      } else if (renderSpatialPops.length > 0) {
        setRenderSpatialPops([]);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(
        calculateCappedPixelRatio(Boolean(stateRef.current.performanceMode), stateRef.current.resolutionScale)
      );
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      rendererRef.current = null;
      weatherSys.dispose();
      renderer.dispose();
      triggerHouseExplosionRef.current = null;
    };
  }, []);

  return (
    <div
      className={`relative w-full h-full bg-[#191919] overflow-hidden ${
        isMenuOpen || isMiniMapEnlarged ? 'cursor-default' : 'cursor-none'
      }`}
    >
      <div
        ref={containerRef}
        className={`w-full h-full select-none ${
          isMenuOpen || isMiniMapEnlarged ? 'cursor-default' : 'cursor-none'
        }`}
      />

      {/* 3D Spatial Floating Money Popups Overlay */}
      <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden select-none">
        {renderSpatialPops.map((pop) => {
          if (!pop.visible) return null;
          return (
            <div
              key={pop.id}
              className="absolute flex flex-col items-center text-center"
              style={{
                left: `${pop.screenX}px`,
                top: `${pop.screenY}px`,
                opacity: pop.opacity,
                transform: `translate(-50%, -100%) scale(${pop.scale})`,
                willChange: 'transform, opacity, left, top',
              }}
            >
              <span
                className={`font-display font-black tracking-tighter drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] ${
                  pop.amount >= 0 ? 'text-emerald-400' : 'text-rose-500'
                }`}
                style={{
                  fontSize: 'clamp(1.8rem, 3.8vw, 3.2rem)',
                }}
              >
                {pop.amount >= 0 ? `+$${pop.amount.toLocaleString()}` : `-$${Math.abs(pop.amount).toLocaleString()}`}
              </span>
              {pop.reason && (
                <span className="text-xs sm:text-sm font-semibold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                  {pop.reason}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Red Damage Flash Screen Overlay with Radial Vignette & Shaking Border */}
      {damageFlash && (
        <div className="absolute inset-0 pointer-events-none z-40 transition-opacity duration-200 border-[18px] sm:border-[32px] border-red-600/85 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(220,38,38,0.6)_100%)] shadow-[inset_0_0_120px_rgba(220,38,38,0.95)] animate-pulse" />
      )}

      {/* RISING FLOOD STARTING COUNTDOWN OVERLAY IN MIDDLE OF SCREEN */}
      {activeDisaster === 'flood' && floodCountdownSec !== null && floodCountdownSec > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="text-sm sm:text-base uppercase tracking-widest text-[#38bdf8] font-black mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              Rising Flood Starting In
            </div>
            <div className="text-[110px] sm:text-[130px] font-black text-white leading-none font-mono drop-shadow-[0_6px_28px_rgba(0,0,0,0.95)]">
              {floodCountdownSec}
            </div>
          </div>
        </div>
      )}

      {/* Death Screen Overlay */}
      {deathScreenInfo && !pvpConfig?.active && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center animate-death-darken select-none p-6">
          <h2
            className="font-display font-extrabold text-white tracking-tighter text-center drop-shadow-[0_4px_32px_rgba(0,0,0,0.95)]"
            style={{ fontSize: 'clamp(4rem, 10vw, 8rem)' }}
          >
            {deathScreenInfo.title || 'You died'}
          </h2>
        </div>
      )}

      {/* 1st-Person Fighter Jet / Aircraft Cockpit HUD Overlay */}
      {!isMenuOpen && isFirstPerson && (activeVehicle === 'plane' || activeVehicle === 'helicopter') && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <div className="relative w-72 h-56 border border-[#22c55e]/30 rounded-[4px] flex items-center justify-center">
            {/* Pitch Ladder Bars */}
            <div className="w-24 h-[1.5px] bg-[#22c55e]/70" />
            <div className="absolute top-12 w-14 h-[1px] bg-[#22c55e]/45" />
            <div className="absolute bottom-12 w-14 h-[1px] bg-[#22c55e]/45" />
            {/* Center Flight Path Vector Bore-Sight */}
            <div className="w-3 h-3 rounded-full border border-[#22c55e] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#22c55e]" />
            </div>
          </div>
        </div>
      )}

      {/* Precision Center Reticle on Foot (Switches to Emerald Crosshair when Right-Click Aiming) */}
      {!isMenuOpen && !stateRef.current.activeVehicle && !stateRef.current.isDrivingCar && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          {isAiming ? (
            <div className="relative flex items-center justify-center scale-110">
              <div className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
              <div className="absolute -top-3.5 w-[2px] h-2.5 bg-[#34d399] shadow-[0_0_4px_#34d399]" />
              <div className="absolute -bottom-3.5 w-[2px] h-2.5 bg-[#34d399] shadow-[0_0_4px_#34d399]" />
              <div className="absolute -left-3.5 h-[2px] w-2.5 bg-[#34d399] shadow-[0_0_4px_#34d399]" />
              <div className="absolute -right-3.5 h-[2px] w-2.5 bg-[#34d399] shadow-[0_0_4px_#34d399]" />
            </div>
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(0,0,0,0.9)] opacity-85" />
          )}
        </div>
      )}

      {/* Remote Bomb Active Detonation Hint */}
      {remoteBombCount > 0 && !isMenuOpen && (
        <div className="pointer-events-none absolute top-12 left-3 z-30 px-3 py-1.5 bg-[#202020]/95 border border-[#ef4444] rounded-[4px] text-xs text-white shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
          <span>
            Remote C4 Planted ({remoteBombCount}) — Press <strong>[G]</strong> to Detonate
          </span>
        </div>
      )}

      {/* Waypoint Notice Toast Notification */}
      {waypointNotice && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#141414]/95 border border-[#38bdf8] text-white text-xs font-semibold rounded-md shadow-[0_0_25px_rgba(56,189,248,0.35)] animate-fade-in flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
          <span>{waypointNotice}</span>
        </div>
      )}

      {/* Bottom-Left Status HUD: Player Health + Vehicle Integrity Bar / Aircraft Throttle & Landing Gear */}
      {!isMenuOpen && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex flex-col gap-1.5">
          {/* Vehicle Damage Bar when driving Car, Motorcycle, Heli, or Plane, or when they explode (100% Red!) */}
          {(activeVehicle === 'car' || activeVehicle === 'motorcycle' || activeVehicle === 'helicopter' || activeVehicle === 'plane' || isDrivingCar || explodingVehicleType !== null) && (() => {
            const hp = activeVehicle === 'helicopter' ? heliHealth : activeVehicle === 'plane' ? planeHealth : carHealth;
            const isExploded = explodingVehicleType !== null || hp <= 0;
            const vehicleDamage = isExploded ? 100 : Math.max(0, Math.min(100, 100 - hp));
            const label =
              activeVehicle === 'motorcycle' || explodingVehicleType === 'motorcycle'
                ? 'BIKE DAMAGE'
                : activeVehicle === 'helicopter' || explodingVehicleType === 'helicopter'
                ? 'HELI DAMAGE'
                : activeVehicle === 'plane' || explodingVehicleType === 'plane'
                ? 'PLANE DAMAGE'
                : 'CAR DAMAGE';
            return (
              <div
                className={`bg-[#202020]/95 border ${
                  vehicleDamage >= 100 ? 'border-[#ef4444]' : 'border-[#383838]'
                } rounded-[4px] px-3 py-2 shadow-lg flex items-center gap-3`}
              >
                <span
                  className={`text-[11px] font-semibold tracking-wider uppercase ${
                    vehicleDamage >= 100 ? 'text-[#ef4444]' : 'text-[#a0a0a0]'
                  }`}
                >
                  {label}
                </span>
                <div className="w-32 h-2.5 bg-[#0f172a] rounded-[2px] overflow-hidden border border-[#2e2e2e]">
                  <div
                    className={`h-full transition-all duration-150 ${
                      vehicleDamage < 50
                        ? 'bg-[#38bdf8]'
                        : vehicleDamage < 75
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#ef4444]'
                    }`}
                    style={{ width: `${vehicleDamage}%` }}
                  />
                </div>
                <span
                  className={`font-mono text-xs font-bold ${
                    vehicleDamage >= 100 ? 'text-[#ef4444]' : 'text-[#f3f3f3]'
                  }`}
                >
                  {Math.round(vehicleDamage)}%
                </span>
              </div>
            );
          })()}

          {/* Airplane Persistent Throttle Status HUD */}
          {activeVehicle === 'plane' && (
            <div className="bg-[#202020]/95 border border-[#383838] rounded-[4px] px-3 py-2 shadow-lg flex items-center gap-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#a0a0a0]">
                THROTTLE
              </span>
              <div className="w-24 h-2.5 bg-[#0f172a] rounded-[2px] overflow-hidden border border-[#2e2e2e]">
                <div
                  className="h-full bg-[#f59e0b] transition-all duration-100"
                  style={{ width: `${Math.max(0, Math.min(100, planeThrottlePct))}%` }}
                />
              </div>
              <span className="font-mono text-xs text-[#f3f3f3] w-9">{planeThrottlePct}%</span>
            </div>
          )}



          {/* Player Health Bar HUD (Hidden when Invincible Mode is ON) */}
          {!invincibleMode && (
            <div className="bg-[#202020]/95 border border-[#383838] rounded-[4px] px-3 py-2 shadow-lg flex items-center gap-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#a0a0a0]">HP</span>
              <div className="w-32 h-2.5 bg-[#0f172a] rounded-[2px] overflow-hidden border border-[#2e2e2e]">
                <div
                  className="h-full bg-[#10b981] transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, playerHealth))}%` }}
                />
              </div>
              <span className="font-mono text-xs text-[#f3f3f3]">{Math.round(playerHealth)}/100</span>
            </div>
          )}
        </div>
      )}



      {/* Interactive Proximity Action Prompt */}
      {nearbyPrompt && !stateRef.current.activeVehicle && !stateRef.current.isDrivingCar && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-[#202020]/95 border border-[#383838] rounded-[4px] shadow-2xl flex items-center gap-2.5">
          <span className="text-base">{nearbyPrompt.icon}</span>
          <span className="text-xs text-[#f3f3f3]">{nearbyPrompt.text}</span>
        </div>
      )}
    </div>
  );
};
