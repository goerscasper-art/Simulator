import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Car,
  Bike,
  Gauge,
  MessageSquare,
  RotateCcw,
  Navigation,
  Eye,
  User,
  Crosshair,
  Plane,
  Hammer,
  Zap,
  Save,
  Check,
  ShieldAlert,
  Skull,
  Flame,
  Swords,
  Send,
  Users,
  CloudLightning,
  Waves,
  AlertTriangle,
  Radiation,
  Trophy,
  Building2,
  BookOpen,
  Info,
} from 'lucide-react';
import {
  ActiveVehicleType,
  CarVehicle,
  CustomCharacterConfig,
  DisasterType,
  HelicopterVehicle,
  MotorcycleVehicle,
  NPCChatMessage,
  NPCData,
  PlaneVehicle,
  PvpBattleConfig,
  PvpEnemyConfig,
  WeaponItem,
  ResolutionScale,
  FoodItem,
} from './types/housesim';
import { INGREDIENTS, RECIPES } from './utils/cookingData';
import { ChefHat, ShoppingBasket, Utensils, Heart, Timer, X, ArrowUp, Wind, Shield, Music, Volume2, VolumeX } from 'lucide-react';
import {
  CARS_CATALOG,
  DEFAULT_CUSTOM_CHARACTER,
  HELICOPTERS_CATALOG,
  MISC_ITEMS_CATALOG,
  MOTORCYCLES_CATALOG,
  PLANES_CATALOG,
  WEAPONS_CATALOG,
} from './data/catalog';
import { VirtualHouseCanvas } from './components/VirtualHouseCanvas';
import { ShopModal, VehicleShopType } from './components/ShopModal';
import { CharacterCustomizerModal } from './components/CharacterCustomizerModal';
import { CookingMenu } from './components/CookingMenu';
import { VehiclePreviewModal } from './components/VehiclePreviewModal';
import { soundFX } from './utils/soundEffects';
import { bgmManager } from './utils/bgmManager';

const CITY_AUTOSAVE_KEY = 'pixel_city_autosave_v1';
const PLATFORMER_AUTOSAVE_KEY = 'pixel_city_platformer_level_v1';

function loadCityAutosave(): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(CITY_AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadSavedPlatformerLevel(): number {
  try {
    const raw = localStorage.getItem(PLATFORMER_AUTOSAVE_KEY);
    if (!raw) return 1;
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 50) return parsed;
    return 1;
  } catch {
    return 1;
  }
}

interface MoneyNotification {
  id: string;
  amount: number;
  reason?: string;
  timestamp: number;
  worldPos?: { x: number; y: number; z: number };
}

export default function App() {
  const initialCitySave = useRef<Record<string, any> | null>(loadCityAutosave()).current;

  // Currency State (money)
  const [money, setMoney] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('pixel_city_money_v1');
      if (raw !== null) {
        const parsed = parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
      }
      if (typeof initialCitySave?.money === 'number') return initialCitySave.money;
    } catch {}
    return 0;
  });

  const [moneyNotifications, setMoneyNotifications] = useState<MoneyNotification[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('pixel_city_money_v1', String(money));
    } catch {}
  }, [money]);

  const awardMoney = useCallback((amount: number, reason?: string, worldPos?: { x: number; y: number; z: number }) => {
    if (amount === 0) return;
    setMoney((prev) => Math.max(0, prev + amount));
    // Display a centered UI banner for non-spatial events OR negative money changes (excluding death, which is handled after on the death screen)
    if ((!worldPos || amount < 0) && reason !== 'Died') {
      const newNotif: MoneyNotification = {
        id: `${Date.now()}-${Math.random()}`,
        amount,
        reason,
        timestamp: Date.now(),
      };
      setMoneyNotifications((prev) => [...prev.slice(-3), newNotif]);
      setTimeout(() => {
        setMoneyNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
      }, 2800);
    }
  }, []);

  const [titleScreenOpen, setTitleScreenOpen] = useState<boolean>(true);
  const [ownedCarIds, setOwnedCarIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('pixel_city_owned_cars');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [ownedMotorcycleIds, setOwnedMotorcycleIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('pixel_city_owned_motos');
      if (raw) return JSON.parse(raw);
    } catch {}
    return ['moto-vespa-150'];
  });
  const [ownedHeliIds, setOwnedHeliIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('pixel_city_owned_helis');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [ownedPlaneIds, setOwnedPlaneIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('pixel_city_owned_planes');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [ownedWeaponIds, setOwnedWeaponIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('pixel_city_owned_weapons');
      if (raw) return JSON.parse(raw);
    } catch {}
    return ['weapon-fist'];
  });

  useEffect(() => {
    try {
      localStorage.setItem('pixel_city_owned_cars', JSON.stringify(ownedCarIds));
      localStorage.setItem('pixel_city_owned_motos', JSON.stringify(ownedMotorcycleIds));
      localStorage.setItem('pixel_city_owned_helis', JSON.stringify(ownedHeliIds));
      localStorage.setItem('pixel_city_owned_planes', JSON.stringify(ownedPlaneIds));
      localStorage.setItem('pixel_city_owned_weapons', JSON.stringify(ownedWeaponIds));
    } catch {}
  }, [ownedCarIds, ownedMotorcycleIds, ownedHeliIds, ownedPlaneIds, ownedWeaponIds]);

  const handleBuyItem = useCallback(
    (price: number, name: string, itemId: string, category: 'cars' | 'motorcycles' | 'helicopters' | 'planes' | 'weapons'): boolean => {
      if (money < price) {
        awardMoney(0, `Cannot afford ${name} ($${price.toLocaleString()})`);
        return false;
      }
      if (price > 0) {
        awardMoney(-price, `Bought ${name}`);
      }
      if (category === 'cars') setOwnedCarIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      if (category === 'motorcycles') setOwnedMotorcycleIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      if (category === 'helicopters') setOwnedHeliIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      if (category === 'planes') setOwnedPlaneIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      if (category === 'weapons') setOwnedWeaponIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      soundFX.playPlaceObject();
      return true;
    },
    [money, awardMoney]
  );

  const [activeCarId, setActiveCarId] = useState<string | null>(
    initialCitySave?.activeCarId ?? 'car-sedan-metro'
  );
  const [activeMotorcycleId, setActiveMotorcycleId] = useState<string>(
    initialCitySave?.activeMotorcycleId || 'moto-vespa-150'
  );
  const [activeHeliId, setActiveHeliId] = useState<string>(
    initialCitySave?.activeHeliId || 'heli-scout'
  );
  const [activePlaneId, setActivePlaneId] = useState<string>(
    initialCitySave?.activePlaneId || 'plane-cessna'
  );
  const [activeWeaponId, setActiveWeaponId] = useState<string>(
    initialCitySave?.activeWeaponId || 'weapon-fist'
  );
  const [activeMiscIds] = useState<string[]>([]);
  const [customCharacter, setCustomCharacter] = useState<CustomCharacterConfig>(
    initialCitySave?.customCharacter || DEFAULT_CUSTOM_CHARACTER
  );
  const [isFirstPerson, setIsFirstPerson] = useState<boolean>(
    typeof initialCitySave?.isFirstPerson === 'boolean' ? initialCitySave.isFirstPerson : false
  );

  const isChromebookDetected =
    typeof navigator !== 'undefined' &&
    (/CrOS/i.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Linux') && navigator.maxTouchPoints > 0 && !/Android/i.test(navigator.userAgent)) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));

  const [resolutionScale, setResolutionScale] = useState<ResolutionScale>(() => {
    const saved = initialCitySave?.resolutionScale;
    if ((saved as any) === 'extra-fast') return 'extra-low';
    return saved || 'low';
  });

  // Smooth Mode (performanceMode) is now tied to graphics quality: ON for Extra Low/Low, OFF for Balanced/High
  const performanceMode = resolutionScale === 'extra-low' || resolutionScale === 'low';

  // Vehicle Spawn & Building Reset Signals
  const [carSpawnTrigger, setCarSpawnTrigger] = useState(0);
  const [motorcycleSpawnTrigger, setMotorcycleSpawnTrigger] = useState<number>(() => {
    try {
      const firstPlayed = localStorage.getItem('pixel_city_first_played_v2');
      if (!firstPlayed) {
        localStorage.setItem('pixel_city_first_played_v2', 'true');
        return 1;
      }
    } catch {}
    return 0;
  });
  const [heliSpawnTrigger, setHeliSpawnTrigger] = useState(0);
  const [planeSpawnTrigger, setPlaneSpawnTrigger] = useState(0);
  const [superJumpTrigger] = useState(0);
  const [resetBuildingsSignal, setResetBuildingsSignal] = useState(0);
  const [respawnSignal] = useState(0);
  const [healSignal, setHealSignal] = useState(0);
  const [healAmount, setHealAmount] = useState(0);
  const [menuMusicEnabled, setMenuMusicEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('simulator2_music_enabled');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleMusic = useCallback(() => {
    setMenuMusicEnabled((prev) => {
      const next = !prev;
      bgmManager.setMuted(!next);
      try {
        localStorage.setItem('simulator2_music_enabled', String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    bgmManager.setMuted(!menuMusicEnabled);
  }, [menuMusicEnabled]);



  // Natural Disasters State & Timers
  const [activeDisaster, setActiveDisaster] = useState<DisasterType>('none');
  const [floodWaterHeight, setFloodWaterHeight] = useState<number>(0);
  const [disasterSecondsLeft, setDisasterSecondsLeft] = useState<number | null>(null);
  const [survivalBanner, setSurvivalBanner] = useState<string | null>(null);
  const [heliHealth, setHeliHealth] = useState<number>(100);
  const [planeHealth, setPlaneHealth] = useState<number>(100);

  useEffect(() => {
    if (activeDisaster === 'none') {
      setDisasterSecondsLeft(null);
      return;
    }
    let duration = 60;
    if (activeDisaster === 'flood') duration = 30 + Math.ceil(292.5 / 1.05);

    setDisasterSecondsLeft(duration);

    const interval = setInterval(() => {
      setDisasterSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if ((activeDisaster as string) !== 'none') {
            let name = (activeDisaster as string).replace('_', ' ');
            if (activeDisaster === 'meteor_shower') name = 'meteor shower';
            setSurvivalBanner(`YOU HAVE SURVIVED THE ${name.toUpperCase()}!`);
            awardMoney(20000, `Surviving ${name}`);
            setActiveDisaster('none');
            setTimeout(() => setSurvivalBanner(null), 4000);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDisaster, awardMoney]);

  const handleFloodCompleted = () => {
    setSurvivalBanner('YOU HAVE SURVIVED THE FLOOD!');
    awardMoney(20000, 'Surviving Flood');
    setActiveDisaster('none');
    setTimeout(() => setSurvivalBanner(null), 4000);
  };

  // Police Mode & Wanted Level State
  const [policeModeEnabled, setPoliceModeEnabled] = useState<boolean>(
    typeof initialCitySave?.policeModeEnabled === 'boolean' ? initialCitySave.policeModeEnabled : true
  );
  const [wantedLevel, setWantedLevel] = useState<number>(0);
  const [wantedDecaySeconds, setWantedDecaySeconds] = useState<number>(60);
  const [disappearingStar, setDisappearingStar] = useState<number | null>(null);
  const [starLostNotification, setStarLostNotification] = useState<string | null>(null);
  const prevWantedRef = useRef<number>(wantedLevel);

  useEffect(() => {
    if (activeDisaster !== 'none' && wantedLevel > 0) {
      setWantedLevel(0);
    }
  }, [activeDisaster, wantedLevel]);

  useEffect(() => {
    const prev = prevWantedRef.current;
    if (wantedLevel < prev && prev > 0) {
      // One star just disappeared!
      const lostStarNum = prev;
      setDisappearingStar(lostStarNum);
      const remainingMsg =
        wantedLevel > 0
          ? `★ LOST A STAR! (${wantedLevel} STAR${wantedLevel === 1 ? '' : 'S'} REMAINING)`
          : '★ ALL CHARGES CLEARED — PURSUIT EVADED! ★';
      setStarLostNotification(remainingMsg);
      const starTimer = setTimeout(() => {
        setDisappearingStar(null);
      }, 1400);
      const notifTimer = setTimeout(() => {
        setStarLostNotification(null);
      }, 2500);
      return () => {
        clearTimeout(starTimer);
        clearTimeout(notifTimer);
      };
    }
    prevWantedRef.current = wantedLevel;
  }, [wantedLevel]);

  // Wanted level stars disappear one by one every 30 seconds (5 stars = 2.5 minutes)
  useEffect(() => {
    if (wantedLevel <= 0) return;
    const timer = setInterval(() => {
      setWantedLevel((prev) => Math.max(0, prev - 1));
    }, 30000);
    return () => clearInterval(timer);
  }, [wantedLevel]);

  // Zombie Apocalypse Mode State
  const [zombieModeEnabled, setZombieModeEnabled] = useState<boolean>(
    typeof initialCitySave?.zombieModeEnabled === 'boolean' ? initialCitySave.zombieModeEnabled : false
  );

  // Invincible Mode State (Cannot die from anything & health bar is removed)
  const [invincibleMode, setInvincibleMode] = useState<boolean>(
    typeof initialCitySave?.invincibleMode === 'boolean' ? initialCitySave.invincibleMode : false
  );

  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const isProgrammaticPointerUnlockRef = useRef<boolean>(false);

  const [battleCountdown, setBattleCountdown] = useState<number | null>(null);
  const [battleRoundResult, setBattleRoundResult] = useState<'player' | 'enemy' | null>(null);
  const battleRestartTimerRef = useRef<number | null>(null);
  const [battleScore, setBattleScore] = useState<{ player: number; enemies: number }>({
    player: 0,
    enemies: 0,
  });

  // Track the amount of times you win or lose in Battle Mode (persistent across sessions)
  const [battleStats, setBattleStats] = useState<{ wins: number; losses: number }>(() => {
    try {
      const saved = localStorage.getItem('battle_mode_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          wins: Math.max(0, Number(parsed.wins) || 0),
          losses: Math.max(0, Number(parsed.losses) || 0),
        };
      }
    } catch {}
    return { wins: 0, losses: 0 };
  });

  useEffect(() => {
    try {
      localStorage.setItem('battle_mode_stats', JSON.stringify(battleStats));
    } catch {}
  }, [battleStats]);

  // Menu & Submenu Modals
  const [escapeMenuOpen, setEscapeMenuOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [weaponMenuOpen, setWeaponMenuOpen] = useState(false);
  const [shakingWeaponId, setShakingWeaponId] = useState<string | null>(null);
  const triggerWeaponShake = (id: string) => {
    setShakingWeaponId(id);
    window.setTimeout(() => {
      setShakingWeaponId((curr) => (curr === id ? null : curr));
    }, 450);
  };
  const [cookingMenuOpen, setCookingMenuOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activePreviewVehicle, setActivePreviewVehicle] = useState<{
    id: string;
    name: string;
    data: any;
    type: VehicleShopType;
  } | null>(null);
  const [activeShopType, setActiveShopType] = useState<VehicleShopType>('cars');

  const getNpcCountForPreset = (scale: ResolutionScale): number => {
    if (scale === 'high') return 320;
    if (scale === 'balanced') return 160;
    if (scale === 'low') return 60;
    return 25;
  };

  const handleSelectResolutionScale = useCallback((scale: ResolutionScale) => {
    setResolutionScale(scale);
    setNpcTargetCount(getNpcCountForPreset(scale));
  }, []);

  // NPC Population Control State
  const [npcTargetCount, setNpcTargetCount] = useState<number>(() => {
    if (typeof initialCitySave?.npcTargetCount === 'number') {
      if (initialCitySave.npcTargetCount === 80) return 160;
      if (initialCitySave.npcTargetCount === 160) return 320;
      return initialCitySave.npcTargetCount;
    }
    return getNpcCountForPreset(resolutionScale);
  });

  // Nuclear Bomb Trigger Signal
  const [nukeTriggerSignal, setNukeTriggerSignal] = useState<number>(0);

  // PvP Grassland Battle Arena State (Default enemy option: NPCs on foot with customized weapons!)
  const [pvpModalOpen, setPvpModalOpen] = useState<boolean>(false);
  const [pvpConfig, setPvpConfig] = useState<PvpBattleConfig>({
    active: false,
    playerMode: 'foot',
    playerWeaponId: 'weapon-fist',
    playerVehicleId: 'plane-darkstar',
    enemyWeaponId: 'weapon-fist',
    enemyCount: 12,
    enemyGroups: [
      { type: 'foot', count: 12 },
    ],
  });
  const pvpActiveRef = useRef<boolean>(false);
  useEffect(() => {
    pvpActiveRef.current = pvpConfig.active;
  }, [pvpConfig.active]);
  const [pvpStartTrigger, setPvpStartTrigger] = useState<number>(0);
  const [pvpRemainingEnemies, setPvpRemainingEnemies] = useState<number>(12);

  // Roblox Obby 50-Level Platformer Mode State
  const [platformerMode, setPlatformerMode] = useState<boolean>(false);
  const [platformerLevel, setPlatformerLevel] = useState<number>(() => loadSavedPlatformerLevel());
  const [platformerNonce, setPlatformerNonce] = useState<number>(0);
  const [platformerBannerText, setPlatformerBannerText] = useState<string | null>(null);
  const [confirmRestartPlatformer, setConfirmRestartPlatformer] = useState<boolean>(false);
  const [confirmResetProgress, setConfirmResetProgress] = useState<boolean>(false);
  const [resetWorldShake, setResetWorldShake] = useState<boolean>(false);
  const platformerBannerTimerRef = useRef<number | null>(null);

  // Background Music (BGM) State & Syncing
  // Handle Game Mode Music Transitions
  useEffect(() => {
    if (titleScreenOpen) {
      bgmManager.playMode('title');
    } else if (pvpConfig.active) {
      bgmManager.playMode('battle');
    } else if (platformerMode) {
      bgmManager.playMode('platformer');
    } else {
      bgmManager.playMode('city');
    }
  }, [titleScreenOpen, pvpConfig.active, platformerMode]);

  const toggleBgmMute = useCallback(() => {
    handleToggleMusic();
  }, [handleToggleMusic]);



  useEffect(() => {
    try {
      localStorage.setItem(PLATFORMER_AUTOSAVE_KEY, String(platformerLevel));
    } catch {}
  }, [platformerLevel]);

  const triggerPlatformerBanner = (text: string) => {
    if (platformerBannerTimerRef.current !== null) {
      clearTimeout(platformerBannerTimerRef.current);
    }
    setPlatformerBannerText(text);
    platformerBannerTimerRef.current = window.setTimeout(() => {
      setPlatformerBannerText(null);
      platformerBannerTimerRef.current = null;
    }, 2400);
  };

  const handleStartPlatformerMode = () => {
    if (battleRestartTimerRef.current !== null) {
      clearTimeout(battleRestartTimerRef.current);
      battleRestartTimerRef.current = null;
    }
    setBattleRoundResult(null);
    setBattleCountdown(null);
    setPvpConfig((prev) => ({ ...prev, active: false }));
    setActiveDisaster('none');
    setActiveVehicle(null);
    setActiveWeaponId('weapon-fist');
    setConfirmRestartPlatformer(false);
    setPlatformerMode(true);
    setPlatformerNonce((prev) => prev + 1);
    setPvpModalOpen(false);
    setEscapeMenuOpen(false);
    setTitleScreenOpen(false);
    triggerPlatformerBanner(`LEVEL ${platformerLevel}`);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const req = canvas.requestPointerLock as any;
        req?.call(canvas, { unadjustedMovement: true });
      } catch {}
    }
  };

  const handleExitPlatformerMode = () => {
    setPlatformerMode(false);
    setConfirmRestartPlatformer(false);
    setPlatformerBannerText(null);
    setEscapeMenuOpen(false);
  };

  const handlePlatformerAdvanceLevel = (nextLevel: number) => {
    if (nextLevel <= 50) {
      const completedLevel = nextLevel - 1;
      const levelReward = completedLevel * 2000;
      setPlatformerLevel(nextLevel);
      triggerPlatformerBanner(`LEVEL ${nextLevel}`);
      awardMoney(levelReward, `Completed Course ${completedLevel}`);
    } else {
      const level50Reward = 50 * 2000;
      setPlatformerLevel(1);
      setPlatformerNonce((prev) => prev + 1);
      triggerPlatformerBanner('ALL 50 LEVELS COMPLETE!');
      awardMoney(level50Reward, 'Finished Level 50');
    }
  };

  const handleConfirmRestartPlatformer = () => {
    setPlatformerLevel(1);
    setPlatformerNonce((prev) => prev + 1);
    setConfirmRestartPlatformer(false);
    setEscapeMenuOpen(false);
    triggerPlatformerBanner('LEVEL 1');

    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const req = canvas.requestPointerLock as any;
        req?.call(canvas, { unadjustedMovement: true });
      } catch {}
    }
  };

  const handleBattleRoundEnd = (winner: 'player' | 'enemy', enemyCount?: number) => {
    if (battleRestartTimerRef.current !== null) {
      clearTimeout(battleRestartTimerRef.current);
      battleRestartTimerRef.current = null;
    }
    setBattleScore((prev) => ({
      ...prev,
      player: winner === 'player' ? prev.player + 1 : prev.player,
      enemies: winner === 'enemy' ? prev.enemies + 1 : prev.enemies,
    }));
    setBattleStats((prev) => ({
      ...prev,
      wins: winner === 'player' ? prev.wins + 1 : prev.wins,
      losses: winner === 'enemy' ? prev.losses + 1 : prev.losses,
    }));
    setBattleRoundResult(winner);
    if (winner === 'player') {
      const npcCount = enemyCount ?? pvpConfig.enemyCount ?? 12;
      const enemyWeaponId = pvpConfig.enemyWeaponId || 'weapon-fist';
      const enemyWeaponObj = (WEAPONS_CATALOG || []).find((w) => w.id === enemyWeaponId);
      const isPistol = enemyWeaponId === 'weapon-pistol';
      
      // Battle Mode victory payout (cut in half once again): Fists = $1000 base, Pistol = double ($2000 base)
      const baseRewardPerNpc = 1000 + (npcCount * 5);
      const rewardPerNpc = isPistol ? baseRewardPerNpc * 2 : baseRewardPerNpc;
      const totalReward = Math.round(npcCount * rewardPerNpc);
      
      awardMoney(totalReward, `Battle Won (${npcCount} NPCs using ${enemyWeaponObj?.name || 'weapons'})`);
    }
    // Release pointer lock so user can interact with the win/loss prompt
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {}
  };

  useEffect(() => {
    if (battleRoundResult !== null) {
      try {
        if (document.pointerLockElement) {
          document.exitPointerLock?.();
        }
      } catch {}
    }
  }, [battleRoundResult]);

  useEffect(() => {
    if (battleCountdown === null) return;
    if (battleCountdown <= 0) {
      const timer = setTimeout(() => {
        setBattleCountdown(null);
      }, 1200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setBattleCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [battleCountdown]);

  const [projector, setProjector] = useState<((worldPos: { x: number; y: number; z: number }) => { x: number; y: number; visible: boolean } | null) | null>(null);

  // Driving & Interaction States
  const [activeVehicle, setActiveVehicle] = useState<ActiveVehicleType>(null);
  const isDrivingCar = activeVehicle === 'car';
  const [vehicleSpeed, setVehicleSpeed] = useState(0);
  const [flightAltitudeFeet, setFlightAltitudeFeet] = useState(0);

  // Cooking & Food State
  const [ingredientInventory, setIngredientInventory] = useState<string[]>(
    Array.isArray(initialCitySave?.ingredientInventory) ? initialCitySave.ingredientInventory : []
  );
  const [cookedFoodInventory, setCookedFoodInventory] = useState<FoodItem[]>(
    Array.isArray(initialCitySave?.cookedFoodInventory) ? initialCitySave.cookedFoodInventory : []
  );
  const [activeFoodEffects, setActiveFoodEffects] = useState<{ type: string; value: number; endTime: number }[]>([]);


  // Interactive Restaurant Menu State
  const [activeRestaurantMenu, setActiveRestaurantMenu] = useState<{
    type: 'restaurant' | 'diner' | 'cafe';
    name: string;
  } | null>(null);

  // Active AI Pedestrian Chat State
  const [activeNPC, setActiveNPC] = useState<{ npc: NPCData; dialogue: string } | null>(null);
  const [npcChatInput, setNpcChatInput] = useState<string>('');
  const [npcChatHistory, setNpcChatHistory] = useState<NPCChatMessage[]>([]);
  const [isNpcThinking, setIsNpcThinking] = useState<boolean>(false);
  const [hostileNpcTrigger, setHostileNpcTrigger] = useState<{ npcId: string; timestamp: number } | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  // Focus chat input when NPC dialogue opens
  useEffect(() => {
    if (activeNPC) {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 60);
    }
  }, [activeNPC]);

  const wasPointerLockedRef = useRef<boolean>(false);
  const titleScreenOpenRef = useRef<boolean>(titleScreenOpen);
  const activeNpcRef = useRef<{ npc: NPCData; dialogue: string } | null>(activeNPC);

  useEffect(() => {
    titleScreenOpenRef.current = titleScreenOpen;
  }, [titleScreenOpen]);

  useEffect(() => {
    activeNpcRef.current = activeNPC;
  }, [activeNPC]);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement !== null;
      setIsPointerLocked(isLocked);

      if (wasPointerLockedRef.current && !isLocked) {
        // Pointer lock was released
        if (isProgrammaticPointerUnlockRef.current) {
          isProgrammaticPointerUnlockRef.current = false;
        } else {
          // The user pressed Escape to unlock pointer!
          // Chromium browsers consume Escape to exit pointer lock without dispatching keydown.
          if (!titleScreenOpenRef.current && !activeNpcRef.current) {
            if (pvpActiveRef.current) {
              setPvpModalOpen(true);
            } else {
              setEscapeMenuOpen(true);
            }
          }
        }
      }
      wasPointerLockedRef.current = isLocked;
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  // Toggle Menu when pressing Escape or Shift
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept Shift or keys when typing in any text input field
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT'
      ) {
        if (e.key === 'Escape') {
          activeEl.blur();
          if (activeNPC) setActiveNPC(null);
        }
        return;
      }

      const isMenuToggleKey =
        e.key === 'Escape' ||
        e.key === 'Shift' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight';

      if (isMenuToggleKey && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        if (document.pointerLockElement) {
          isProgrammaticPointerUnlockRef.current = true;
          document.exitPointerLock?.();
        }
        if (battleRoundResult !== null) {
          return;
        }
        if (activeNPC) {
          setActiveNPC(null);
          return;
        }
        if (
          infoModalOpen ||
          shopModalOpen ||
          weaponMenuOpen ||
          customizerOpen ||
          cookingMenuOpen ||
          pvpModalOpen ||
          activeRestaurantMenu !== null
        ) {
          setInfoModalOpen(false);
          setShopModalOpen(false);
          setWeaponMenuOpen(false);
          setCustomizerOpen(false);
          setCookingMenuOpen(false);
          setPvpModalOpen(false);
          setActiveRestaurantMenu(null);
          if (!titleScreenOpen && !pvpConfig.active) {
            setEscapeMenuOpen(true);
          }
          return;
        }
        if (titleScreenOpen) {
          return;
        }
        setConfirmRestartPlatformer(false);
        if (pvpConfig.active) {
          setPvpModalOpen((prev) => !prev);
        } else {
          setEscapeMenuOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    titleScreenOpen,
    infoModalOpen,
    shopModalOpen,
    weaponMenuOpen,
    customizerOpen,
    cookingMenuOpen,
    pvpModalOpen,
    activeNPC,
    activeRestaurantMenu,
    battleRoundResult,
    pvpConfig.active,
  ]);

  // Default Spawn Location: Downtown Sidewalk (Out on the sidewalk in Downtown, never inside a building!)
  const [savedPositions, setSavedPositions] = useState<{
    playerPos: [number, number, number];
    carPos: { x: number; z: number; rotationY: number };
    heliPos: { x: number; y: number; z: number; rotationY: number };
  }>(() => {
    const sp = initialCitySave?.savedPositions;
    const validPlayerPos: [number, number, number] =
      Array.isArray(sp?.playerPos) &&
      sp.playerPos.length === 3 &&
      Number.isFinite(sp.playerPos[0]) &&
      Number.isFinite(sp.playerPos[1]) &&
      Number.isFinite(sp.playerPos[2]) &&
      Math.abs(sp.playerPos[0]) < 1500 &&
      Math.abs(sp.playerPos[2]) < 1500 &&
      sp.playerPos[1] < 320
        ? [sp.playerPos[0], Math.max(0, sp.playerPos[1]), sp.playerPos[2]]
        : [196, 0, 6.8];
    const validCarPos =
      sp?.carPos && Number.isFinite(sp.carPos.x) && Number.isFinite(sp.carPos.z) && Math.abs(sp.carPos.x) < 1500
        ? sp.carPos
        : { x: 204.0, z: 2.8, rotationY: Math.PI / 2 };
    const validHeliPos =
      sp?.heliPos && Number.isFinite(sp.heliPos.x) && Number.isFinite(sp.heliPos.z) && Math.abs(sp.heliPos.x) < 1500
        ? sp.heliPos
        : { x: 125, y: 0.18, z: -50, rotationY: 0 };
    return {
      playerPos: validPlayerPos,
      carPos: validCarPos,
      heliPos: validHeliPos,
    };
  });

  const latestPositionsRef = useRef(savedPositions);

  const persistCityAutosave = () => {
    try {
      const payload = {
        ownedCarIds,
        activeCarId,
        activeMotorcycleId,
        activeHeliId,
        activePlaneId,
        activeWeaponId: platformerMode ? (initialCitySave?.activeWeaponId || 'weapon-fist') : activeWeaponId,
        customCharacter,
        isFirstPerson,
        performanceMode,
        resolutionScale,
        policeModeEnabled,
        zombieModeEnabled,
        invincibleMode,
        npcTargetCount,
        ingredientInventory,
        cookedFoodInventory,
        savedPositions: latestPositionsRef.current,
        money,
      };
      localStorage.setItem(CITY_AUTOSAVE_KEY, JSON.stringify(payload));
    } catch {}
  };

  useEffect(() => {
    persistCityAutosave();
  }, [
    ownedCarIds,
    activeCarId,
    activeMotorcycleId,
    activeHeliId,
    activePlaneId,
    activeWeaponId,
    customCharacter,
    isFirstPerson,
    performanceMode,
    resolutionScale,
    policeModeEnabled,
    zombieModeEnabled,
    invincibleMode,
    npcTargetCount,
    ingredientInventory,
    cookedFoodInventory,
    money,
  ]);

  const handleSavePositions = (
    playerPos: [number, number, number],
    carPos: { x: number; z: number; rotationY: number },
    _boatPos?: { x: number; z: number; rotationY: number },
    heliPos?: { x: number; y: number; z: number; rotationY: number }
  ) => {
    // Only overwrite city savedPositions when actually in the city (not in Platformer sky or PvP arena)
    if (!platformerMode && !pvpConfig.active && Math.abs(playerPos[0]) < 1500 && playerPos[1] < 320) {
      latestPositionsRef.current = {
        playerPos,
        carPos,
        heliPos: heliPos || latestPositionsRef.current.heliPos,
      };
      persistCityAutosave();
    }
  };

  const handleEnterVehicle = (type: 'car' | 'motorcycle' | 'helicopter' | 'plane') => {
    setActiveVehicle(type);
  };

  const handleExitVehicle = () => {
    setActiveVehicle(null);
  };

  const handleSpawnCar = (car: CarVehicle) => {
    setOwnedCarIds((prev) => (prev.includes(car.id) ? prev : [...prev, car.id]));
    setActiveCarId(car.id);
    setCarSpawnTrigger((prev) => prev + 1);
    if (pvpConfig.active) {
      // Cannot spawn car in Battle Mode
      return;
    } else {
      setActiveVehicle('car');
    }
    soundFX.playCarEngineStart();
  };

  const handleSpawnMotorcycle = (moto: MotorcycleVehicle) => {
    setActiveMotorcycleId(moto.id);
    setMotorcycleSpawnTrigger((prev) => prev + 1);
    if (pvpConfig.active) {
      // Cannot spawn motorcycle in Battle Mode
      return;
    } else {
      setActiveVehicle('motorcycle');
    }
    soundFX.playCarEngineStart();
  };

  const handleSpawnHeli = (heli: HelicopterVehicle) => {
    setActiveHeliId(heli.id);
    setHeliSpawnTrigger((prev) => prev + 1);
    if (pvpConfig.active) {
      setPvpConfig((prev) => ({ ...prev, playerMode: 'helicopter', playerVehicleId: heli.id }));
      setActiveVehicle('helicopter');
    }
    soundFX.playHelicopterThump();
  };

  const handleSpawnPlane = (plane: PlaneVehicle) => {
    setActivePlaneId(plane.id);
    setPlaneSpawnTrigger((prev) => prev + 1);
    if (pvpConfig.active) {
      setPvpConfig((prev) => ({ ...prev, playerMode: 'plane', playerVehicleId: plane.id }));
      setActiveVehicle('plane');
    }
    soundFX.playCarEngineStart();
  };


  const handleSelectNoVehicle = () => {
    setPvpConfig((prev) => ({ ...prev, playerMode: 'foot' }));
    setActiveVehicle(null);
    setEscapeMenuOpen(false);
    soundFX.playPlaceObject();
  };

  const handleResetBuildings = () => {
    setWantedLevel(0);
    
    setWeaponMenuOpen(false);
    setCookingMenuOpen(false);
    setCustomizerOpen(false);
    setShopModalOpen(false);
    setPvpModalOpen(false);
    setEscapeMenuOpen(false);
    setResetBuildingsSignal((prev) => prev + 1);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const req = canvas.requestPointerLock as any;
        req?.call(canvas, { unadjustedMovement: true });
      } catch {}
    }
  };

  const handleResetProgress = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };


  const handleSelectWeapon = (weapon: WeaponItem) => {
    setActiveWeaponId(weapon.id);
    if (pvpConfig.active) {
      setPvpConfig((prev) => ({ ...prev, playerWeaponId: weapon.id }));
    }
    soundFX.playPlaceObject();
  };

  const handleSelectWeaponById = (id: string) => {
    const w = (WEAPONS_CATALOG || []).find((wp) => wp.id === id);
    if (w) handleSelectWeapon(w);
  };

  const usedOpeningLinesRef = useRef<Set<string>>(new Set());

  function getBasicNpcGreeting(npc: NPCData): string {
    const personality = (npc.personality || 'friendly').toLowerCase();
    const role = (npc.role || '').toLowerCase();

    // Grumpy / Mean / Hostile NPCs
    if (
      personality === 'mean' ||
      personality === 'rude' ||
      personality === 'grumpy' ||
      personality === 'hostile'
    ) {
      const meanGreetings = [
        'Yeah? What do you want?',
        'Make it quick. What is it?',
        'What are you looking at?',
        'Can I help you, or are you just staring?',
        "What do you need? I don't have all day.",
        "Yeah? What's the problem?",
      ];
      return meanGreetings[Math.floor(Math.random() * meanGreetings.length)];
    }

    // Police / Law enforcement
    if (role.includes('police') || role.includes('officer') || role.includes('sheriff')) {
      const policeGreetings = [
        'Hello citizen. Staying safe today?',
        'Officer on duty. What can I do for you?',
        'Hello there. Everything all right?',
        'Afternoon, citizen. Can I help you with something?',
      ];
      return policeGreetings[Math.floor(Math.random() * policeGreetings.length)];
    }

    // Store clerks / Cashiers
    if (
      role.includes('clerk') ||
      role.includes('cashier') ||
      role.includes('attendant') ||
      role.includes('shop') ||
      role.includes('store')
    ) {
      const clerkGreetings = [
        'Welcome! How can I help you today?',
        'Hello! Let me know if you need help finding anything.',
        'Hi there! What can I get for you?',
      ];
      return clerkGreetings[Math.floor(Math.random() * clerkGreetings.length)];
    }

    // Medical / Nurses / Doctors
    if (role.includes('nurse') || role.includes('doctor') || role.includes('paramedic')) {
      const medicalGreetings = [
        'Hello! How are you feeling today?',
        'Hi there. Need any medical assistance?',
        'Hello! What can I do for you today?',
      ];
      return medicalGreetings[Math.floor(Math.random() * medicalGreetings.length)];
    }

    // General civilian basic greetings (open-ended so the player can introduce any topic!):
    const basicGreetings = [
      'Hello! How are you doing today?',
      "Hey there! What's on your mind?",
      "Hi! How's your day going?",
      "Hey! What's up?",
      'Hello there! Good to see you.',
      'Hey! How are things with you?',
      "Hi there! What's going on?",
      "Hello! Nice day, isn't it?",
      "Hey there! How's it going?",
      "Good day! What's new?",
    ];
    return basicGreetings[Math.floor(Math.random() * basicGreetings.length)];
  }

  const handleInteractWithNPC = async (npc: NPCData) => {
    if (document.pointerLockElement) {
      isProgrammaticPointerUnlockRef.current = true;
      document.exitPointerLock?.();
    }

    // Special store clerks keep their instant store action notice
    const isStoreClerk = npc.id === 'hardware-clerk' || npc.id === 'gas-attendant';
    if (isStoreClerk) {
      const clerkLine = npc.dialogueList?.[0] || `Welcome! How can I help you today?`;
      const hist: NPCChatMessage[] = [{ sender: 'npc', text: clerkLine }];
      setNpcChatHistory(hist);
      setNpcChatInput('');
      setActiveNPC({ npc, dialogue: clerkLine });
      return;
    }

    // If we already talked to this specific NPC earlier, resume their existing conversation
    if (npc.conversationHistory && npc.conversationHistory.length > 0) {
      setNpcChatHistory(npc.conversationHistory);
      setNpcChatInput('');
      setActiveNPC({ npc, dialogue: npc.conversationHistory[0].text });
      return;
    }

    // First time talking: Call AI to get an in-character opening greeting according to personality!
    const fallbackGreeting = getBasicNpcGreeting(npc);
    const initialHistory: NPCChatMessage[] = [{ sender: 'npc', text: fallbackGreeting }];
    npc.conversationHistory = initialHistory;
    setNpcChatHistory(initialHistory);
    setNpcChatInput('');
    setIsNpcThinking(true);
    setActiveNPC({ npc, dialogue: fallbackGreeting });

    try {
      const response = await fetch('/api/npc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName: npc.name,
          npcRole: npc.role,
          personality: npc.personality || 'friendly',
          personalityTrait: npc.personalityTrait || '',
          backstory: npc.backstory || '',
          isOpening: true,
        }),
      });
      const data = await response.json();
      const aiGreeting = data.reply || fallbackGreeting;
      const aiHistory: NPCChatMessage[] = [{ sender: 'npc', text: aiGreeting }];
      npc.conversationHistory = aiHistory;
      setNpcChatHistory(aiHistory);
      setActiveNPC({ npc, dialogue: aiGreeting });
      soundFX.playInteractChime();
    } catch {
      // Keep fallback greeting
    } finally {
      setIsNpcThinking(false);
    }
  };

  function emptyOrFirst(hist?: NPCChatMessage[]) {
    return !hist || hist.length === 0;
  }

  const handleSendNpcMessage = async (customText?: string) => {
    if (!activeNPC) return;
    const messageText = (customText ?? npcChatInput).trim();
    if (!messageText || isNpcThinking) return;

    const updatedHistory: NPCChatMessage[] = [
      ...npcChatHistory,
      { sender: 'player', text: messageText },
    ];
    setNpcChatHistory(updatedHistory);
    setNpcChatInput('');
    setIsNpcThinking(true);

    try {
      const response = await fetch('/api/npc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName: activeNPC.npc.name,
          npcRole: activeNPC.npc.role,
          personality: activeNPC.npc.personality || 'friendly',
          personalityTrait: activeNPC.npc.personalityTrait || '',
          backstory: activeNPC.npc.backstory || '',
          playerMessage: messageText,
          history: updatedHistory.slice(-8),
        }),
      });
      const data = await response.json();
      
      // Personality-based one-word fallback if reply is missing or limit reached
      const personality = (activeNPC.npc.personality || 'friendly').toLowerCase();
      let defaultReply = 'Okay.';
      if (personality === 'rude' || personality === 'mean' || personality === 'hostile' || personality === 'grumpy') {
        defaultReply = 'Fuck you.';
      } else if (personality === 'friendly' || personality === 'kind' || personality === 'cheerful') {
        defaultReply = 'How nice.';
      }

      const replyText = data.reply || defaultReply;
      const newHistory: NPCChatMessage[] = [
        ...updatedHistory,
        { sender: 'npc', text: replyText },
      ];
      setNpcChatHistory(newHistory);
      activeNPC.npc.conversationHistory = newHistory;

      if (data.shouldAttack) {
        activeNPC.npc.isHostile = true;
        setHostileNpcTrigger({ npcId: activeNPC.npc.id, timestamp: Date.now() });
        soundFX.playPoliceSiren();
        setTimeout(() => {
          setActiveNPC(null);
        }, 1100);
      } else {
        soundFX.playInteractChime();
      }
    } catch {
      const personality = (activeNPC.npc.personality || 'friendly').toLowerCase();
      let fallbackReply = 'Okay.';
      if (personality === 'rude' || personality === 'mean' || personality === 'hostile' || personality === 'grumpy') {
        fallbackReply = 'Fuck you.';
      } else if (personality === 'friendly' || personality === 'kind' || personality === 'cheerful') {
        fallbackReply = 'How nice.';
      }
      setNpcChatHistory((prev) => [...prev, { sender: 'npc', text: fallbackReply }]);
    } finally {
      setIsNpcThinking(false);
    }
  };

  // Launch PvP Battle Mode in Flat Grassland Arena
  const handleLaunchPvpBattle = () => {
    let validVehId = pvpConfig.playerVehicleId;
    if (pvpConfig.playerMode === 'foot') {
      setActiveWeaponId(pvpConfig.playerWeaponId);
      setActiveVehicle(null);
    } else if (pvpConfig.playerMode === 'helicopter') {
      if (!HELICOPTERS_CATALOG.some((h) => h.id === validVehId)) {
        validVehId = activeHeliId || HELICOPTERS_CATALOG[0].id;
      }
      setActiveHeliId(validVehId);
      setActiveVehicle('helicopter');
    } else if (pvpConfig.playerMode === 'plane') {
      if (!PLANES_CATALOG.some((p) => p.id === validVehId)) {
        validVehId = activePlaneId || PLANES_CATALOG[0].id;
      }
      setActivePlaneId(validVehId);
      setActiveVehicle('plane');
    }

    if (battleRestartTimerRef.current !== null) {
      clearTimeout(battleRestartTimerRef.current);
      battleRestartTimerRef.current = null;
    }
    setBattleRoundResult(null);
    setBattleScore({ player: 0, enemies: 0 });
    setPvpConfig((prev) => ({ ...prev, playerVehicleId: validVehId, active: true }));
    setPvpStartTrigger((prev) => prev + 1);
    setPvpModalOpen(false);
    setEscapeMenuOpen(false);
    setTitleScreenOpen(false);
    soundFX.playExplosion();

    // Start countdown timer!
    setBattleCountdown(5);

    // Request pointer lock synchronously!
    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const req = canvas.requestPointerLock as any;
        req?.call(canvas, { unadjustedMovement: true });
      } catch {}
    }
  };

  const handleExitPvpBattle = () => {
    if (battleRestartTimerRef.current !== null) {
      clearTimeout(battleRestartTimerRef.current);
      battleRestartTimerRef.current = null;
    }
    setBattleRoundResult(null);
    setBattleCountdown(null);
    setPvpRemainingEnemies(0);
    setActiveVehicle(null);
    setPvpConfig((prev) => ({ ...prev, active: false }));
    setPvpStartTrigger((prev) => prev + 1);
    setPvpModalOpen(false);
    setEscapeMenuOpen(false);
    setTitleScreenOpen(false);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const req = canvas.requestPointerLock as any;
        req?.call(canvas, { unadjustedMovement: true });
      } catch {}
    }
  };

  const handlePlayAnotherRound = () => {
    if (battleRestartTimerRef.current !== null) {
      clearTimeout(battleRestartTimerRef.current);
      battleRestartTimerRef.current = null;
    }
    setBattleRoundResult(null);
    setBattleCountdown(5);
    setPvpStartTrigger((prev) => prev + 1);
    soundFX.playExplosion();

    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const req = canvas.requestPointerLock as any;
        req?.call(canvas, { unadjustedMovement: true });
      } catch {}
    }
  };

  const handleSetEnemyCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(100, Math.round(count)));
    setPvpConfig((prev) => ({
      ...prev,
      enemyCount: safeCount,
      enemyGroups: [{ type: 'foot', count: safeCount }],
    }));
  };

  const handleSetEnemyWeapon = (weaponId: string) => {
    setPvpConfig((prev) => ({
      ...prev,
      enemyWeaponId: weaponId,
    }));
  };

  const handleUpdateEnemyGroup = (index: number, patch: Partial<PvpEnemyConfig>) => {
    setPvpConfig((prev) => {
      const next = [...prev.enemyGroups];
      next[index] = { ...next[index], ...patch };
      return { ...prev, enemyGroups: next };
    });
  };

  const handleAddEnemyGroup = (type: PvpEnemyConfig['type'] = 'foot') => {
    setPvpConfig((prev) => ({
      ...prev,
      enemyGroups: [...prev.enemyGroups, { type: 'foot', count: 10 }],
    }));
  };

  const handleRemoveEnemyGroup = (index: number) => {
    setPvpConfig((prev) => ({
      ...prev,
      enemyGroups: prev.enemyGroups.filter((_, i) => i !== index),
    }));
  };

  const handleCookFood = (recipe: FoodItem) => {
    setIngredientInventory((prev) => {
      const next = [...prev];
      recipe.recipe.forEach((ingId) => {
        const idx = next.indexOf(ingId);
        if (idx !== -1) next.splice(idx, 1);
      });
      return next;
    });
    setCookedFoodInventory((prev) => [...prev, recipe]);
    soundFX.playPlaceObject();
  };

  const handleEatFood = (food: FoodItem) => {
    setCookedFoodInventory((prev) => {
      const idx = prev.findIndex((f) => f.id === food.id);
      if (idx !== -1) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev;
    });

    if (food.effect.type !== 'none') {
      const effect = {
        type: food.effect.type,
        value: food.effect.value,
        endTime: Date.now() + food.effect.duration * 1000,
      };
      setActiveFoodEffects((prev) => {
        const filtered = prev.filter((e) => e.type !== food.effect.type);
        return [...filtered, effect];
      });
      if (food.effect.type === 'health' && food.effect.duration === 0) {
        setHealAmount(food.effect.value);
        setHealSignal((prev) => prev + 1);
      }
    }
    soundFX.playPlaceObject();
  };

  const handleGrabIngredients = () => {
    const allIds = INGREDIENTS.map((i) => i.id);
    setIngredientInventory((prev) => [...prev, ...allIds]);
    soundFX.playPlaceObject();
  };

  const getRestaurantMenuItems = (type: 'restaurant' | 'diner' | 'cafe'): FoodItem[] => {
    if (type === 'restaurant') {
      return [
        (RECIPES || []).find((r) => r.id === 'pizza') || (RECIPES || [])[0],
        (RECIPES || []).find((r) => r.id === 'pasta') || (RECIPES || [])[0],
        (RECIPES || []).find((r) => r.id === 'tomato_soup') || (RECIPES || [])[0],
      ];
    } else if (type === 'diner') {
      return [
        (RECIPES || []).find((r) => r.id === 'burger') || (RECIPES || [])[0],
        (RECIPES || []).find((r) => r.id === 'steak') || (RECIPES || [])[0],
        (RECIPES || []).find((r) => r.id === 'baked_potato') || (RECIPES || [])[0],
        (RECIPES || []).find((r) => r.id === 'fries') || (RECIPES || [])[0],
      ];
    } else {
      return [
        (RECIPES || []).find((r) => r.id === 'pancakes') || (RECIPES || [])[0],
        (RECIPES || []).find((r) => r.id === 'cake') || (RECIPES || [])[0],
        (RECIPES || []).find((r) => r.id === 'milkshake') || (RECIPES || [])[0],
        (RECIPES || []).find((r) => r.id === 'fruit_salad') || (RECIPES || [])[0],
      ];
    }
  };

  const ownedCarsList = (CARS_CATALOG || []).filter((c) => (ownedCarIds || []).includes(c.id));
  const isPauseMenuOpen =
    titleScreenOpen ||
    escapeMenuOpen ||
    infoModalOpen ||
    shopModalOpen ||
    weaponMenuOpen ||
    customizerOpen ||
    cookingMenuOpen ||
    pvpModalOpen ||
    activeRestaurantMenu !== null ||
    battleRoundResult !== null;
  const isAnyMenuOpen = isPauseMenuOpen || activeNPC !== null;

  const handleStartSimulationFromTitle = () => {
    setTitleScreenOpen(false);
    setEscapeMenuOpen(false);
    setActiveWeaponId('weapon-fist');
    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const req = canvas.requestPointerLock as any;
        req?.call(canvas, { unadjustedMovement: true });
      } catch {}
    }
  };
  const miscGadgetWeapon = (MISC_ITEMS_CATALOG || []).find(
    (m) => m.weaponPayload?.id === activeWeaponId
  )?.weaponPayload;
  const activeWeaponObj =
    (WEAPONS_CATALOG || []).find((w) => w.id === activeWeaponId) ||
    miscGadgetWeapon ||
    (WEAPONS_CATALOG || [])[0];

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex flex-col bg-[#191919] select-none font-sans ${
        isAnyMenuOpen ? 'cursor-default' : 'cursor-none'
      }`}
    >
      {/* BATTLE MODE ROUND WINNER MODAL (ASK ANOTHER ROUND OR RETURN TO CITY) */}
      {battleRoundResult !== null && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none cursor-default">
          <div className="w-full max-w-md bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden text-[#f3f3f3] flex flex-col">
            {/* Windows Title Bar */}
            <div className="flex items-center justify-between h-9 pl-3.5 pr-3 bg-white/5 border-b border-white/10 select-none shrink-0">
              <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
                <Swords className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>Battle Summary</span>
              </div>
            </div>

            {/* Header banner */}
            <div
              className={`p-6 text-center ${
                battleRoundResult === 'player'
                  ? 'bg-gradient-to-b from-blue-950/60 to-transparent'
                  : 'bg-gradient-to-b from-rose-950/40 to-transparent'
              }`}
            >
              <h2
                className={`text-5xl sm:text-6xl font-black uppercase tracking-wider ${
                  battleRoundResult === 'player' ? 'text-[#60cdff]' : 'text-[#f87171]'
                }`}
              >
                {battleRoundResult === 'player' ? 'Victory!' : 'Defeat!'}
              </h2>
              <p className="text-xs text-[#a0a0a0] mt-2">
                {battleRoundResult === 'player'
                  ? 'You eliminated all opposing enemy forces!'
                  : 'You were taken down in combat by enemy forces.'}
              </p>
            </div>

            {/* Battle Record & Stats */}
            <div className="p-5 space-y-3 bg-transparent">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 border border-white/10 rounded-[4px] text-center">
                  <div className="text-[11px] uppercase tracking-wider text-[#60cdff] font-semibold mb-1 flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Wins
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {battleStats.wins}
                  </div>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-[4px] text-center">
                  <div className="text-[11px] uppercase tracking-wider text-rose-400 font-semibold mb-1 flex items-center justify-center gap-1">
                    <Skull className="w-3.5 h-3.5 text-rose-400" /> Losses
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {battleStats.losses}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2 bg-white/5 border border-white/10 rounded-[4px] text-xs">
                <span className="text-[#a0a0a0]">Win Ratio</span>
                <span className="font-mono font-bold text-emerald-400">
                  {battleStats.wins + battleStats.losses > 0
                    ? `${Math.round((battleStats.wins / (battleStats.wins + battleStats.losses)) * 100)}%`
                    : '0%'}
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2 bg-white/5 border border-white/10 rounded-[4px] text-xs">
                <span className="text-[#a0a0a0]">Session Score</span>
                <span className="font-mono font-bold text-[#e5e5e5]">
                  You {battleScore.player} — {battleScore.enemies} Enemies
                </span>
              </div>
            </div>

            {/* Windows Dialog Footer Actions */}
            <div className="p-4 bg-[#181818] border-t border-[#2e2e2e] flex flex-col sm:flex-row gap-2.5 shrink-0">
              <button
                onClick={handleExitPvpBattle}
                className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[4px] text-xs font-semibold text-[#f3f3f3] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#a0a0a0]" />
                <span>Return to City</span>
              </button>
              <button
                onClick={handlePlayAnotherRound}
                className="flex-1 py-2.5 px-4 bg-[#0078d4] hover:bg-[#1084df] border border-[#0078d4] rounded-[4px] text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Swords className="w-4 h-4 text-white" />
                <span>Another Round</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATTLE MODE STARTING COUNTDOWN OVERLAY */}
      {battleCountdown !== null && battleRoundResult === null && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="text-center animate-pulse">
            <div className="text-sm uppercase tracking-widest text-blue-400 font-black mb-2">
              Battle Mode Starting In
            </div>
            <div className="text-[120px] font-black text-white leading-none font-mono">
              {battleCountdown <= 0 ? 'GO!' : battleCountdown}
            </div>
          </div>
        </div>
      )}

      {/* PLATFORMER MODE BIG LEVEL ANNOUNCEMENT BANNER */}
      {platformerMode && platformerBannerText !== null && (
        <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center">
          <div className="text-center px-10 py-6 rounded-xl bg-black/45 backdrop-blur-[2px] border border-white/15 shadow-[0_12px_48px_rgba(0,0,0,0.85)]">
            <div className="text-6xl sm:text-8xl font-black uppercase tracking-wider text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.95)]">
              {platformerBannerText}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MAIN 3D SIMULATION CANVAS
          ===================================================================== */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <VirtualHouseCanvas
          ownedCars={ownedCarsList}
          activeCarId={activeCarId}
          activeMotorcycleId={activeMotorcycleId}
          activeHeliId={activeHeliId}
          activePlaneId={activePlaneId}
          activeWeaponId={activeWeaponId}
          activeMiscIds={activeMiscIds}
          customCharacter={customCharacter}
          carSpawnTrigger={carSpawnTrigger}
          motorcycleSpawnTrigger={motorcycleSpawnTrigger}
          heliSpawnTrigger={heliSpawnTrigger}
          planeSpawnTrigger={planeSpawnTrigger}
          superJumpTrigger={superJumpTrigger}
          resetBuildingsSignal={resetBuildingsSignal}
          isFirstPerson={isFirstPerson}
          showMiniMap={false}
          performanceMode={performanceMode}
          isDrivingCar={isDrivingCar}
          activeVehicle={activeVehicle}
          onEnterVehicle={handleEnterVehicle}
          onExitVehicle={handleExitVehicle}
          onEnterCar={() => handleEnterVehicle('car')}
          onExitCar={handleExitVehicle}
          onInteractWithNPC={handleInteractWithNPC}
          onOpenShop={(tab) => {
            if (
              tab === 'cars' ||
              tab === 'motorcycles' ||
              tab === 'helicopters' ||
              tab === 'planes'
            ) {
              setActiveShopType(tab);
            } else {
              setActiveShopType('cars');
            }
            setShopModalOpen(true);
          }}
          onSpeedUpdate={setVehicleSpeed}
          onAltitudeUpdate={setFlightAltitudeFeet}
          initialPlayerPos={savedPositions.playerPos}
          initialCarPos={savedPositions.carPos}
          initialHeliPos={savedPositions.heliPos}
          onSavePositions={handleSavePositions}
          respawnSignal={respawnSignal}
          isMenuOpen={isPauseMenuOpen}
          isTitleScreen={titleScreenOpen}
          talkingNpcId={activeNPC?.npc.id || null}
          resolutionScale={resolutionScale}
          onOpenCookingMenu={() => setCookingMenuOpen(true)}
          onGrabIngredients={handleGrabIngredients}
          onOpenRestaurantMenu={(type, name) => setActiveRestaurantMenu({ type, name })}
          activeFoodEffects={activeFoodEffects}
          healSignal={healSignal}
          healAmount={healAmount}
          onSelectWeapon={handleSelectWeaponById}
          onEatFood={handleEatFood}
          activeDisaster={activeDisaster}
          onActiveDisasterChange={setActiveDisaster}
          onFloodHeightUpdate={setFloodWaterHeight}
          onFloodCompleted={handleFloodCompleted}
          policeModeEnabled={policeModeEnabled}
          wantedLevel={wantedLevel}
          onWantedLevelChange={setWantedLevel}
          onWantedDecayTimerUpdate={setWantedDecaySeconds}
          zombieModeEnabled={zombieModeEnabled}
          zombieMode={zombieModeEnabled}
          invincibleMode={invincibleMode}
          npcTargetCount={npcTargetCount}
          npcCount={npcTargetCount}
          pvpConfig={pvpConfig}
          pvpStartTrigger={pvpStartTrigger}
          pvpStartNonce={pvpStartTrigger}
          onPvpRemainingEnemiesChange={setPvpRemainingEnemies}
          onPvpRemainingUpdate={setPvpRemainingEnemies}
          hostileNpcTrigger={hostileNpcTrigger}
          hostileNpcId={hostileNpcTrigger?.npcId}
          hostileNpcTriggerNonce={hostileNpcTrigger?.timestamp}
          onTalkToNpc={handleInteractWithNPC}
          onCloseNpcChat={() => setActiveNPC(null)}
          nukeTriggerSignal={nukeTriggerSignal}
          battleCountdown={battleCountdown}
          onBattleRoundEnd={handleBattleRoundEnd}
          platformerMode={platformerMode}
          platformerLevel={platformerLevel}
          platformerNonce={platformerNonce}
          onPlatformerLevelChange={handlePlatformerAdvanceLevel}
          onEarnMoney={awardMoney}
          onProjectWorldToScreen={setProjector}
        />

        {/* ===================================================================
            TITLE SCREEN OVERLAY (LIVE AERIAL DRONE SHOT OF DOWNTOWN & WHOLE MAP)
            =================================================================== */}
        {titleScreenOpen && !pvpModalOpen && !customizerOpen && (
          <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col justify-between bg-gradient-to-r from-[#090d16]/55 via-[#090d16]/20 to-transparent p-8 sm:p-14 lg:p-20 cursor-default">
            {/* Start Screen Top Bar */}
            <div className="flex items-center justify-between w-full">
              <button
                onClick={toggleBgmMute}
                className="px-3.5 py-2 bg-[#161c28]/90 hover:bg-[#1f293a] border border-white/15 hover:border-white/30 text-slate-100 text-xs font-semibold rounded-md transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
                title="Toggle Music Sound"
              >
                {!menuMusicEnabled ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-400" />
                    <span>Music: Off</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Music: On</span>
                  </>
                )}
              </button>
            </div>

            {/* Center-Left Hero Focal Anchor */}
            <div className="w-full max-w-5xl my-auto space-y-7">
              <div />
              <h1
                className="font-display font-extrabold text-white tracking-tighter drop-shadow-[0_4px_32px_rgba(0,0,0,0.8)]"
                style={{ fontSize: 'clamp(4rem, 10vw, 8rem)' }}
              >
                Simulator 2
              </h1>

              {/* Primary & Secondary Action Controls */}
              <div className="flex flex-nowrap items-center gap-3.5 pt-1">
                <button
                  onClick={handleStartSimulationFromTitle}
                  className="h-12 px-7 bg-[#0078d4] hover:bg-[#1084df] border border-[#0078d4] hover:border-[#1084df] text-white text-sm font-semibold rounded-md shadow-[0_12px_32px_rgba(0,120,212,0.45)] transition-all inline-flex items-center justify-center whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Enter City
                </button>

                <button
                  onClick={() => setPvpModalOpen(true)}
                  className="h-12 px-5 bg-[#161c28]/90 hover:bg-[#1f293a] border border-white/15 hover:border-white/30 text-slate-100 text-sm font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Swords className="w-4 h-4 text-[#60cdff] shrink-0" />
                  <span>Battle Mode</span>
                </button>

                <button
                  onClick={handleStartPlatformerMode}
                  className="h-12 px-5 bg-[#161c28]/90 hover:bg-[#1f293a] border border-white/15 hover:border-white/30 text-slate-100 text-sm font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowUp className="w-4 h-4 text-[#60cdff] shrink-0" />
                  <span>Platformer Mode</span>
                </button>

                <button
                  onClick={() => setCustomizerOpen(true)}
                  className="h-12 px-5 bg-[#161c28]/90 hover:bg-[#1f293a] border border-white/15 hover:border-white/30 text-slate-100 text-sm font-semibold rounded-md transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#60cdff] shrink-0" />
                  <span>Customize Character</span>
                </button>
              </div>
            </div>

            <div />
          </div>
        )}

        {/* TOP-LEFT CORNER HUD */}
        {!isAnyMenuOpen && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                if (document.pointerLockElement) {
                  isProgrammaticPointerUnlockRef.current = true;
                  document.exitPointerLock?.();
                }
                setEscapeMenuOpen(true);
              }}
              className="cursor-pointer pointer-events-auto px-3.5 py-1.5 bg-[#1a1a1a]/85 backdrop-blur-md border border-white/10 hover:border-[#38bdf8]/50 rounded-[4px] text-xs text-[#e5e5e5] hover:text-[#38bdf8] shadow-md font-bold transition-all"
            >
              Menu (Esc)
            </button>



            {!activeVehicle && (
              <div className="pointer-events-none px-3 py-1.5 bg-[#1a1a1a]/85 backdrop-blur-md border border-white/10 rounded-[4px] text-xs text-[#38bdf8] shadow-md">
                {activeWeaponObj.name}
              </div>
            )}
          </div>
        )}

        {/* BATTLE MODE SCORE BANNER */}
        {!isAnyMenuOpen && pvpConfig.active && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-5 py-2 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_8px_32px_rgba(0,0,0,0.85)] text-[#f3f3f3]">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-extrabold text-[#60cdff]">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>WINS:</span>
              <span className="text-white text-sm font-mono">{battleScore.player}</span>
            </div>
            <span className="text-white/20 font-bold">|</span>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-extrabold text-rose-400">
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              <span>LOSSES:</span>
              <span className="text-white text-sm font-mono">{battleScore.enemies}</span>
            </div>
            <span className="text-white/20 font-bold">|</span>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-extrabold text-emerald-400">
              <span>ENEMIES LEFT:</span>
              <span className="text-white text-sm font-mono">{pvpRemainingEnemies}</span>
            </div>
          </div>
        )}

        {/* UPPER MIDDLE MONEY GAIN / LOSS NOTIFICATIONS */}
        {moneyNotifications.length > 0 && (
          <div className="pointer-events-none fixed inset-0 z-50 select-none overflow-hidden flex flex-col items-center pt-16">
            {moneyNotifications.map((n) => (
              <div
                key={n.id}
                className="animate-money-pop flex flex-col items-center text-center my-1"
              >
                <span
                  className={`font-display font-black tracking-tighter drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] ${
                    n.amount >= 0 ? 'text-emerald-400' : 'text-rose-500'
                  }`}
                  style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)' }}
                >
                  {n.amount >= 0 ? `+$${n.amount.toLocaleString()}` : `-$${Math.abs(n.amount).toLocaleString()}`}
                </span>
                {n.reason && (
                  <span className="text-xs sm:text-sm font-semibold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    {n.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TOP-RIGHT CORNER HUD */}
        {!titleScreenOpen && (
          <div className="pointer-events-none absolute top-3 right-3 z-30 flex flex-row items-center gap-2 flex-wrap">
            {/* Police Wanted Level Indicator */}
            {policeModeEnabled && wantedLevel > 0 && !pvpConfig.active && activeDisaster === 'none' && (
              <div className="pointer-events-auto h-9 flex items-center gap-2 px-3.5 bg-red-950/85 backdrop-blur-md border border-red-500/50 rounded-lg text-xs font-bold text-white shadow-xl animate-pulse">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="whitespace-nowrap">POLICE CHASE</span>
                <span className="text-amber-400 tracking-widest whitespace-nowrap">
                  {'★'.repeat(Math.min(5, wantedLevel))}
                  {'☆'.repeat(Math.max(0, 5 - Math.min(5, wantedLevel)))}
                </span>
              </div>
            )}

            {/* Money Badge (Always in top right corner of the screen) */}
            <div className="pointer-events-auto h-9 flex items-center gap-2.5 px-3.5 bg-[#1a1a1a]/85 backdrop-blur-md border border-white/10 hover:border-emerald-500/50 rounded-lg shadow-xl font-mono transition-colors">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-bold text-xs select-none shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0">
                $
              </div>
              <div className="flex flex-col text-right justify-center">
                <span className="text-[9px] text-[#888888] uppercase tracking-wider font-sans font-extrabold leading-none select-none">
                  Money
                </span>
                <span className="text-sm font-black text-emerald-400 tracking-tight leading-tight select-none">
                  ${money.toLocaleString()}
                </span>
              </div>
            </div>


            {/* Zombie Apocalypse Indicator */}
            {!isAnyMenuOpen && zombieModeEnabled && !pvpConfig.active && (
              <div className="px-3 py-1.5 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/50 rounded-[4px] text-xs font-bold text-emerald-300 shadow-lg flex items-center gap-1.5 animate-pulse">
                <Skull className="w-4 h-4 text-emerald-400" />
                <span>ZOMBIE APOCALYPSE ACTIVE</span>
              </div>
            )}

            {/* Active Natural Disaster Indicator */}
            {!isAnyMenuOpen && activeDisaster !== 'none' && (
              <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-orange-950/80 backdrop-blur-md border border-orange-500/50 rounded-[4px] text-xs font-bold text-orange-200 shadow-lg">
                <AlertTriangle className="w-4 h-4 text-orange-400 animate-bounce" />
                <span className="uppercase text-[10px] leading-tight">
                  {activeDisaster === 'flood'
                    ? floodWaterHeight < 0
                      ? `Rising Flood (Starts in ${Math.ceil(Math.abs(floodWaterHeight))}s)`
                      : `Rising Flood (${floodWaterHeight.toFixed(1)}m / 292.5m)`
                    : `${activeDisaster.replace('_', ' ')} ${disasterSecondsLeft !== null ? `(${Math.floor(disasterSecondsLeft / 60)}:${String(disasterSecondsLeft % 60).padStart(2, '0')})` : ''}`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* PLATFORMER MODE BOTTOM LEVEL COUNTER */}
        {!isAnyMenuOpen && platformerMode && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-[#1a1a1a]/90 backdrop-blur-md border border-[#38bdf8]/40 px-6 py-2.5 rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
            <ArrowUp className="w-4 h-4 text-[#38bdf8]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#a0a0a0]">
              Level
            </span>
            <span className="font-mono text-xl font-black text-white tracking-tight">
              {platformerLevel} <span className="text-sm font-normal text-[#888888]">/ 50</span>
            </span>
          </div>
        )}

        {/* CAR / MOTORCYCLE DRIVING HUD */}
        {!platformerMode &&
          (activeVehicle === 'car' ||
            activeVehicle === 'motorcycle') && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-[4px] shadow-2xl">
            {activeVehicle === 'motorcycle' ? (
              <Bike className="w-4 h-4 text-[#ef4444]" />
            ) : (
              <Gauge className="w-4 h-4 text-[#0078d4]" />
            )}
            <span className="font-mono text-lg font-semibold text-white tracking-tight">
              {vehicleSpeed}
            </span>
            <span className="text-xs font-normal text-[#a0a0a0] uppercase tracking-wider">
              MPH
            </span>
            {activeVehicle === 'motorcycle' && (
              <span className="ml-2 pl-2 border-l border-[#383838] text-xs text-[#f87171]">
                [Space] Wheelie · [E/F] Dismount
              </span>
            )}
          </div>
        )}

        {/* HELICOPTER / PLANE FLIGHT HUD */}
        {(activeVehicle === 'helicopter' || activeVehicle === 'plane') && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-[4px] shadow-2xl flex-wrap justify-center">
            {activeVehicle === 'plane' ? (
              <Plane className="w-4 h-4 text-[#0078d4]" />
            ) : (
              <Navigation className="w-4 h-4 text-[#0078d4]" />
            )}
            <span className="font-mono text-lg font-semibold text-white tracking-tight">
              {vehicleSpeed} MPH
            </span>
            {vehicleSpeed >= 760 && (
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400 text-amber-300 font-mono text-xs font-bold rounded">
                MACH {(vehicleSpeed / 767).toFixed(2)}
              </span>
            )}
            <span className="text-[#454545]">|</span>
            <span className="font-mono text-xs text-[#a0a0a0]">
              ALT {flightAltitudeFeet} FT
            </span>
            {activeVehicle === 'plane' && flightAltitudeFeet > 15 && vehicleSpeed < 52 && (
              <>
                <span className="text-[#454545]">|</span>
                <span className="font-mono text-xs font-bold text-[#ef4444] animate-pulse">
                  STALL WARNING
                </span>
              </>
            )}
            <span className="text-[#454545]">|</span>
            <span className="text-xs text-[#38bdf8]">
              {activeVehicle === 'plane'
                ? activePlaneId === 'plane-raptor' || activePlaneId === 'plane-darkstar'
                  ? 'E/Q Throttle · G Landing Gear · W/S Pitch · A/D Bank · Left-Click Rapid Guns · Right-Click/R Rockets · F Exit'
                  : 'E/Q Throttle · G Landing Gear · W/S Pitch · A/D Bank · F Exit'
                : activeHeliId === 'heli-apache' || activeHeliId === 'heli-hypersonic'
                ? 'E Ascend · Q Descend · WASD Fly · Left-Click Rapid Guns · Right-Click/R Rockets · F Exit'
                : 'E Ascend · Q Descend · WASD Fly · F Exit'}
            </span>
          </div>
        )}

        {/* INTERACTIVE AI PEDESTRIAN KEYBOARD CHAT OVERLAY */}
        {activeNPC && (
          <div className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-2xl bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden cursor-default">
            <div className="flex items-center justify-between px-4 h-10 bg-white/5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-[#0078d4]" />
                <span className="font-semibold text-sm text-[#f3f3f3]">{activeNPC.npc.name}</span>
              </div>
              <button
                onClick={() => setActiveNPC(null)}
                className="text-xs text-[#cccccc] hover:text-white px-2.5 py-1 rounded-[4px] hover:bg-[#2d2d2d] transition-colors"
              >
                ✕ Esc
              </button>
            </div>

            {/* Conversation History */}
            <div className="p-5 min-h-[250px] max-h-[380px] overflow-y-auto space-y-3 bg-transparent">
              {npcChatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-[4px] text-sm leading-relaxed ${
                      msg.sender === 'player'
                        ? 'bg-[#0078d4] text-white'
                        : 'bg-[#2b2b2b] text-[#f3f3f3] border border-[#3d3d3d]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isNpcThinking && (
                <div className="text-xs text-[#9e9e9e] italic">
                  {activeNPC.npc.name} is thinking of something to say...
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendNpcMessage();
              }}
              className="flex items-center border-t border-[#2e2e2e] bg-[#181818]"
            >
              <input
                ref={chatInputRef}
                type="text"
                value={npcChatInput}
                onChange={(e) => setNpcChatInput(e.target.value)}
                placeholder={`Type a message to ${activeNPC.npc.name} and press Enter...`}
                className="flex-1 bg-transparent px-4 py-3.5 text-sm text-[#f3f3f3] placeholder-[#888888] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isNpcThinking || !npcChatInput.trim()}
                className="px-5 py-3.5 bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-40 text-sm font-semibold text-white flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* ===================================================================
             MAIN ESCAPE MENU (WINDOWS FLUENT DARK SYSTEM UI)
            =================================================================== */}
        {escapeMenuOpen && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 cursor-default transition-all animate-in fade-in duration-300">
            <div
              className={`w-full ${
                pvpConfig.active ? 'max-w-3xl' : 'max-w-lg'
              } bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden text-[#f3f3f3]`}
            >
              {/* Windows Title Bar */}
              <div className="flex items-center justify-between h-9 pl-3.5 pr-0 bg-[#181818] border-b border-[#2e2e2e] select-none">
                <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
                  <span>
                    {platformerMode
                      ? 'Simulator 2 Menu — Platformer Mode Paused'
                      : pvpConfig.active
                      ? 'Simulator 2 Menu — Battle Mode Paused'
                      : 'Simulator 2 Menu — Game Paused'}
                  </span>
                </div>
                <div className="flex items-center h-full">
                  <button
                    onClick={() => {
                      setConfirmRestartPlatformer(false);
                      setEscapeMenuOpen(false);
                    }}
                    className="flex items-center justify-center w-11 h-full text-[#cccccc] hover:bg-[#e81123] hover:text-white transition-colors text-xs"
                    title="Close (Esc)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Menu Content */}
              <div className="p-5 space-y-4 bg-[#202020] max-h-[84vh] overflow-y-auto">
                {platformerMode ? (
                  <>
                    {/* 1. Return to City Button */}
                    <div>
                      <button
                        onClick={handleExitPlatformerMode}
                        className="w-full px-3.5 py-2.5 text-xs rounded-[4px] font-semibold transition-all flex items-center justify-center gap-2 border bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-[#f3f3f3] shadow-sm"
                      >
                        <RotateCcw className="w-4 h-4 text-[#60cdff]" />
                        <span>Return to City</span>
                      </button>
                    </div>

                    {/* 2. 1st Person Viewpoint Button */}
                    <div className="pt-2 border-t border-[#2e2e2e]">
                      <button
                        onClick={() => setIsFirstPerson((prev) => !prev)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-[4px] font-semibold transition-all border ${
                          isFirstPerson
                            ? 'bg-[#0078d4]/20 hover:bg-[#0078d4]/30 border-[#0078d4]/60 text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-[#f3f3f3]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Eye className="w-4 h-4 text-[#60cdff]" />
                          <span>1st Person Viewpoint</span>
                        </span>
                        <span className={isFirstPerson ? 'text-[#60cdff]' : 'text-[#888888]'}>
                          {isFirstPerson ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>

                    {/* 3. Performance & Graphics Settings */}
                    <div className="space-y-2 pt-2 border-t border-[#2e2e2e]">
                      <div className="p-2.5 bg-white/5 border border-white/10 rounded-[4px] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#cccccc] flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-[#0078d4]" />
                            <span>Graphics</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {(
                            [
                              { key: 'extra-low', label: 'Extra Low' },
                              { key: 'low', label: 'Low' },
                              { key: 'balanced', label: 'Balanced' },
                              { key: 'high', label: 'High' },
                            ] as { key: ResolutionScale; label: string }[]
                          ).map((item) => (
                            <button
                              key={item.key}
                              onClick={() => handleSelectResolutionScale(item.key)}
                              className={`py-1.5 px-2 rounded-[4px] text-[11px] font-semibold capitalize transition-all border ${
                                resolutionScale === item.key
                                  ? 'bg-[#0078d4]/80 border-white/20 text-white shadow-sm'
                                  : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-[#f3f3f3]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 4. Music Settings */}
                    <div className="pt-2 border-t border-[#2e2e2e]">
                      <button
                        onClick={handleToggleMusic}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-[4px] font-semibold transition-all border cursor-pointer ${
                          menuMusicEnabled
                            ? 'bg-blue-600/25 hover:bg-blue-600/35 border-blue-400/60 text-blue-100 shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#cccccc]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Music className={`w-4 h-4 ${menuMusicEnabled ? 'text-[#60cdff]' : 'text-slate-400'}`} />
                          <span>Music</span>
                        </span>
                        <span className={menuMusicEnabled ? 'text-[#60cdff] font-bold' : 'text-[#888888]'}>
                          {menuMusicEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>

                    {/* 5. Character Customizer */}
                    <div className="pt-2 border-t border-[#2e2e2e]">
                      <button
                        onClick={() => {
                          setEscapeMenuOpen(false);
                          setCustomizerOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-[4px] text-[#f3f3f3] font-semibold transition-all shadow-sm"
                      >
                        <User className="w-4 h-4 text-[#60cdff]" />
                        <span>Character Customizer</span>
                      </button>
                    </div>

                    {/* 5. Restart Progress (with confirmation) */}
                    <div className="pt-2 border-t border-[#2e2e2e]">
                      {!confirmRestartPlatformer ? (
                        <button
                          onClick={() => setConfirmRestartPlatformer(true)}
                          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs bg-[#2d2d2d] hover:bg-[#383838] border border-[#3d3d3d] hover:border-[#ef4444] rounded-[4px] transition-colors text-[#f3f3f3] font-semibold"
                        >
                          <RotateCcw className="w-4 h-4 text-[#f87171]" />
                          <span>Restart Progress</span>
                        </button>
                      ) : (
                        <div className="p-3 bg-[#191919] border border-[#ef4444] rounded-[4px] space-y-2.5">
                          <p className="text-xs text-[#f3f3f3] font-semibold text-center">
                            Are you sure you want to restart your progress back to Level 1?
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={handleConfirmRestartPlatformer}
                              className="py-2 px-3 text-xs font-semibold bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-[4px] transition-colors"
                            >
                              Confirm Restart
                            </button>
                            <button
                              onClick={() => setConfirmRestartPlatformer(false)}
                              className="py-2 px-3 text-xs font-semibold bg-[#2d2d2d] hover:bg-[#383838] border border-[#3d3d3d] text-[#f3f3f3] rounded-[4px] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : pvpConfig.active ? (
                  <>
                    {/* Top Battle Mode Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2e2e2e]">
                      <button
                        onClick={() => {
                          setEscapeMenuOpen(false);
                          setPvpModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-[#2d2d2d] hover:bg-[#383838] border border-[#3d3d3d] hover:border-[#505050] rounded-[4px] text-[#f3f3f3] font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Swords className="w-3.5 h-3.5 text-[#60cdff]" />
                        <span>Full Battle Configuration &amp; Presets</span>
                      </button>

                      <button
                        onClick={handleExitPvpBattle}
                        className="px-3 py-1.5 text-xs bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#f3f3f3] font-semibold transition-all"
                      >
                        Return to City Mode
                      </button>
                    </div>

                    {/* Clearly Separated Two-Column Layout: YOUR SIDE vs ENEMY NPC CUSTOMIZATION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* LEFT PANEL: YOUR SIDE (Player Loadout, Vehicles & Settings) */}
                      <div className="bg-[#191919] border border-[#2e2e2e] rounded-[4px] overflow-hidden flex flex-col">
                        <div className="px-3.5 py-2 bg-[#141414] border-b border-[#2e2e2e] flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#60cdff]" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#f3f3f3]">
                            Your Side (Player Loadout)
                          </span>
                        </div>

                        <div className="p-3.5 space-y-3.5 flex-1">
                          {/* Player Weapons */}
                          <div className="space-y-1.5">
                            <button
                              onClick={() => {
                                setEscapeMenuOpen(false);
                                setWeaponMenuOpen(true);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#f3f3f3] font-semibold transition-all"
                            >
                              <span className="flex items-center gap-2">
                                <Crosshair className="w-4 h-4 text-[#60cdff]" />
                                <span>Select Weapon</span>
                              </span>
                              <span className="text-[11px] text-[#60cdff] truncate max-w-[140px] font-normal">
                                {activeWeaponObj.name}
                              </span>
                            </button>
                          </div>

                          {/* Player Vehicles */}
                          <div className="space-y-1.5 pt-2 border-t border-[#2e2e2e]">
                            <div className="grid grid-cols-2 gap-1.5">

                              <button
                                onClick={() => {
                                  setEscapeMenuOpen(false);
                                  setActiveShopType('helicopters');
                                  setShopModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-2.5 py-2 text-xs bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#f3f3f3] font-semibold transition-all"
                              >
                                <Navigation className="w-3.5 h-3.5 text-[#60cdff]" />
                                <span>Helicopter</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEscapeMenuOpen(false);
                                  setActiveShopType('planes');
                                  setShopModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-2.5 py-2 text-xs bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#f3f3f3] font-semibold transition-all"
                              >
                                <Plane className="w-3.5 h-3.5 text-[#60cdff]" />
                                <span>Airplane</span>
                              </button>


                              <button
                                onClick={handleSelectNoVehicle}
                                className={`flex items-center gap-2 px-2.5 py-2 text-xs rounded-[4px] font-semibold transition-colors border ${
                                  !activeVehicle
                                    ? 'bg-[#0078d4] border-[#0078d4] text-white'
                                    : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]'
                                }`}
                              >
                                <User className={`w-3.5 h-3.5 ${!activeVehicle ? 'text-white' : 'text-[#60cdff]'}`} />
                                <span>On Foot</span>
                              </button>
                            </div>
                          </div>

                          {/* Player Settings (Invincible, Viewpoint, Resolution) */}
                          <div className="space-y-1.5 pt-2 border-t border-[#2e2e2e]">
                            <button
                              onClick={() => setInvincibleMode((prev) => !prev)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-[4px] font-semibold transition-colors border ${
                                invincibleMode
                                  ? 'bg-[#2d2d2d] hover:bg-[#383838] border-[#0078d4] text-[#f3f3f3]'
                                  : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#cccccc]'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-[#60cdff]" />
                                <span>Invincible Mode</span>
                              </span>
                              <span className={invincibleMode ? 'text-[#60cdff]' : 'text-[#888888]'}>
                                {invincibleMode ? 'ON' : 'OFF'}
                              </span>
                            </button>

                            <button
                              onClick={() => setIsFirstPerson((prev) => !prev)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-[4px] font-semibold transition-colors border ${
                                isFirstPerson
                                  ? 'bg-[#2d2d2d] hover:bg-[#383838] border-[#0078d4] text-[#f3f3f3]'
                                  : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5 text-[#60cdff]" />
                                <span>1st Person Viewpoint</span>
                              </span>
                              <span className={isFirstPerson ? 'text-[#60cdff]' : 'text-[#888888]'}>
                                {isFirstPerson ? 'ON' : 'OFF'}
                              </span>
                            </button>

                            <div className="p-2 bg-[#141414] border border-[#2e2e2e] rounded-[4px] space-y-1.5">
                              <span className="text-[10px] font-semibold text-[#cccccc] flex items-center gap-1.5">
                                <Gauge className="w-3 h-3 text-[#0078d4]" />
                                <span>Graphics</span>
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                                {(
                                  [
                                    { key: 'extra-low', label: 'Extra Low' },
                                    { key: 'low', label: 'Low' },
                                    { key: 'balanced', label: 'Balanced' },
                                    { key: 'high', label: 'High' },
                                  ] as { key: ResolutionScale; label: string }[]
                                ).map((item) => (
                                  <button
                                    key={item.key}
                                    onClick={() => handleSelectResolutionScale(item.key)}
                                    className={`py-1 px-2 rounded-[4px] text-[11px] font-semibold transition-colors border ${
                                      resolutionScale === item.key
                                        ? 'bg-[#0078d4] border-[#0078d4] text-white'
                                        : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Music Settings */}
                          <div className="space-y-1.5 pt-2 border-t border-[#2e2e2e]">
                            <button
                              onClick={handleToggleMusic}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-[4px] font-semibold transition-all border cursor-pointer ${
                                menuMusicEnabled
                                  ? 'bg-blue-600/25 hover:bg-blue-600/35 border-blue-400/60 text-blue-100 shadow-sm'
                                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#cccccc]'
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <Music className={`w-4 h-4 ${menuMusicEnabled ? 'text-[#60cdff]' : 'text-slate-400'}`} />
                                <span>Music</span>
                              </span>
                              <span className={menuMusicEnabled ? 'text-[#60cdff] font-bold' : 'text-[#888888]'}>
                                {menuMusicEnabled ? 'ON' : 'OFF'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT PANEL: ENEMY NPC CUSTOMIZATION (Opposing Side) */}
                      <div className="bg-[#191919] border border-[#2e2e2e] rounded-[4px] overflow-hidden flex flex-col">
                        <div className="px-3.5 py-2 bg-[#141414] border-b border-[#2e2e2e] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#f87171]" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#f3f3f3]">
                              Enemy NPCs
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-[#f87171] bg-[#202020] border border-[#3a3a3a] px-2 py-0.5 rounded-[3px]">
                            {pvpConfig.enemyCount ?? 12} Units
                          </span>
                        </div>

                        <div className="p-3.5 space-y-3 flex-1 flex flex-col">
                          {/* Enemy Count Stepper & Slider */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] uppercase tracking-wider text-[#a0a0a0] font-semibold">
                                Enemy Unit Count
                              </span>
                              <span className="font-mono text-xs font-bold text-[#60cdff]">
                                {pvpConfig.enemyCount ?? 12}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSetEnemyCount((pvpConfig.enemyCount ?? 12) - 1)}
                                className="w-7 h-7 rounded-[4px] bg-[#2d2d2d] hover:bg-[#383838] border border-[#3d3d3d] text-[#f3f3f3] text-xs font-bold flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="range"
                                min={1}
                                max={50}
                                value={pvpConfig.enemyCount ?? 12}
                                onChange={(e) => handleSetEnemyCount(Number(e.target.value))}
                                className="flex-1 accent-[#0078d4] cursor-pointer"
                              />
                              <button
                                onClick={() => handleSetEnemyCount((pvpConfig.enemyCount ?? 12) + 1)}
                                className="w-7 h-7 rounded-[4px] bg-[#2d2d2d] hover:bg-[#383838] border border-[#3d3d3d] text-[#f3f3f3] text-xs font-bold flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex gap-1 pt-1">
                              {[5, 10, 15, 25, 50].map((cnt) => (
                                <button
                                  key={cnt}
                                  onClick={() => handleSetEnemyCount(cnt)}
                                  className={`flex-1 py-1 rounded-[3px] text-[10px] font-semibold border transition-colors ${
                                    (pvpConfig.enemyCount ?? 12) === cnt
                                      ? 'bg-[#0078d4] border-[#0078d4] text-white'
                                      : 'bg-[#242424] hover:bg-[#2e2e2e] border-[#383838] text-[#cccccc]'
                                  }`}
                                >
                                  {cnt}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Enemy Weapon Selector */}
                          <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] uppercase tracking-wider text-[#a0a0a0] font-semibold">
                                Enemy Weapon
                              </span>
                              <span className="text-[10px] text-[#60cdff] font-semibold">
                                {WEAPONS_CATALOG.find((w) => w.id === (pvpConfig.enemyWeaponId || 'weapon-pistol'))?.name || 'Tactical Pistol'}
                              </span>
                            </div>
                            <div className="space-y-1 max-h-44 overflow-y-auto pr-1 flex-1 bg-[#141414] border border-[#2e2e2e] rounded-[4px] p-1.5">
                              {WEAPONS_CATALOG.filter((w) => w.id === 'weapon-fist' || w.id === 'weapon-pistol').map((w) => {
                                const isSelected = (pvpConfig.enemyWeaponId || 'weapon-pistol') === w.id;
                                return (
                                  <div
                                    key={w.id}
                                    onClick={() => handleSetEnemyWeapon(w.id)}
                                    className={`p-2 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-[#2b2b2b] border-[#0078d4]'
                                        : 'bg-[#202020] border-[#303030] hover:bg-[#282828]'
                                    }`}
                                  >
                                    <div className="text-left">
                                      <div className="text-[11px] font-semibold text-[#f3f3f3] flex items-center gap-1.5">
                                        <span>{w.name}</span>
                                        <span className="text-[9px] px-1 py-0.5 rounded-[2px] bg-[#161616] text-[#60cdff] uppercase font-mono">
                                          {w.type}
                                        </span>
                                      </div>
                                      <div className="text-[9px] text-[#888888]">
                                        Dmg: {w.damage ?? 25} • Range: {w.range}m
                                      </div>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-[3px] text-[10px] font-semibold shrink-0 ${
                                        isSelected
                                          ? 'bg-[#0078d4] text-white'
                                          : 'bg-[#181818] border border-[#383838] text-[#999999]'
                                      }`}
                                    >
                                      {isSelected ? 'Equipped' : 'Equip'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            onClick={handleLaunchPvpBattle}
                            className="w-full py-2 text-xs bg-[#0078d4] hover:bg-[#1084df] text-white font-semibold rounded-[4px] transition-colors cursor-pointer"
                          >
                            Apply Settings &amp; Restart Battle
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* BATTLE MODE & PLATFORMER MODE LAUNCHERS (City Mode) */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setEscapeMenuOpen(false);
                          setPvpModalOpen(true);
                        }}
                        className="w-full px-3 py-2.5 text-xs rounded-[4px] font-semibold transition-colors flex items-center justify-center gap-2 border bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]"
                      >
                        <Swords className="w-4 h-4 text-[#60cdff]" />
                        <span>Battle Mode</span>
                      </button>

                      <button
                        onClick={handleStartPlatformerMode}
                        className="w-full px-3 py-2.5 text-xs rounded-[4px] font-semibold transition-colors flex items-center justify-center gap-2 border bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]"
                      >
                        <ArrowUp className="w-4 h-4 text-[#60cdff]" />
                        <span>Platformer Mode</span>
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#2e2e2e]">
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: 'meteor_shower', label: 'Meteors' },
                            { id: 'flood', label: 'Rising Flood' },
                          ] as { id: DisasterType; label: string }[]
                        ).map((d) => {
                          const isActive = activeDisaster === d.id;
                          return (
                            <button
                              key={d.id}
                              onClick={() => {
                                setActiveDisaster(d.id);
                                if (d.id !== 'none') {
                                  setWantedLevel(0);
                                  setEscapeMenuOpen(false);
                                }
                              }}
                              className={`px-2.5 py-2 rounded-[4px] text-xs font-semibold border transition-colors ${
                                isActive
                                  ? 'bg-[#0078d4] border-[#0078d4] text-white'
                                  : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Game Information Section */}
                    <div className="pt-2 border-t border-[#2e2e2e]">
                      <button
                        onClick={() => setInfoModalOpen(true)}
                        className="w-full px-3 py-2 text-xs rounded-[4px] font-semibold transition-colors flex items-center justify-center gap-2 border bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3] cursor-pointer"
                      >
                        <Info className="w-4 h-4 text-[#cccccc]" />
                        <span>Game Info</span>
                      </button>
                    </div>

                    {/* Camera & Graphics Settings */}
                    <div className="space-y-2 pt-2 border-t border-[#2e2e2e]">
                      <button
                        onClick={() => setIsFirstPerson((prev) => !prev)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-[4px] font-semibold transition-colors border ${
                          isFirstPerson
                            ? 'bg-[#2d2d2d] hover:bg-[#383838] border-[#0078d4] text-[#f3f3f3]'
                            : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Eye className="w-4 h-4 text-[#60cdff]" />
                          <span>1st Person Viewpoint</span>
                        </span>
                        <span className={isFirstPerson ? 'text-[#60cdff]' : 'text-[#888888]'}>
                          {isFirstPerson ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      {/* Graphics Settings */}
                      <div className="p-2.5 bg-white/5 border border-white/10 rounded-[4px] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#cccccc] flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-[#0078d4]" />
                            <span>Graphics</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {(
                            [
                              { key: 'extra-low', label: 'Extra Low' },
                              { key: 'low', label: 'Low' },
                              { key: 'balanced', label: 'Balanced' },
                              { key: 'high', label: 'High' },
                            ] as { key: ResolutionScale; label: string }[]
                          ).map((item) => (
                            <button
                              key={item.key}
                              onClick={() => handleSelectResolutionScale(item.key)}
                              className={`py-1.5 px-2 rounded-[4px] text-[11px] font-semibold capitalize transition-colors border ${
                                resolutionScale === item.key
                                  ? 'bg-[#0078d4] border-[#0078d4] text-white'
                                  : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Music Settings */}
                      <button
                        onClick={handleToggleMusic}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-[4px] font-semibold transition-all border cursor-pointer ${
                          menuMusicEnabled
                            ? 'bg-blue-600/25 hover:bg-blue-600/35 border-blue-400/60 text-blue-100 shadow-sm'
                            : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#cccccc]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Music className={`w-4 h-4 ${menuMusicEnabled ? 'text-[#60cdff]' : 'text-[#888888]'}`} />
                          <span>Music</span>
                        </span>
                        <span className={menuMusicEnabled ? 'text-[#60cdff] font-bold' : 'text-[#888888]'}>
                          {menuMusicEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>

                    {/* Weapons & Character Customizer */}
                    <div className="space-y-2 pt-2 border-t border-[#2e2e2e]">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setEscapeMenuOpen(false);
                            setCustomizerOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#f3f3f3] font-semibold transition-all"
                        >
                          <User className="w-4 h-4 text-[#60cdff]" />
                          <span>Character Customizer</span>
                        </button>

                        <button
                          onClick={() => {
                            setEscapeMenuOpen(false);
                            setWeaponMenuOpen(true);
                          }}
                          className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[4px] text-[#f3f3f3] font-semibold transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <Crosshair className="w-4 h-4 text-[#60cdff]" />
                            <span>Weapon Shop</span>
                          </span>
                          <span className="text-[10px] text-[#a0a0a0] truncate max-w-[140px] font-normal">
                            {activeWeaponObj.name}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Dealerships */}
                    <div className="space-y-2 pt-2 border-t border-[#2e2e2e]">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setEscapeMenuOpen(false);
                            setActiveShopType('cars');
                            setShopModalOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[4px] text-[#f3f3f3] font-semibold transition-all"
                        >
                          <Car className="w-4 h-4 text-[#60cdff]" />
                          <span>Car Dealership</span>
                        </button>

                        <button
                          onClick={() => {
                            setEscapeMenuOpen(false);
                            setActiveShopType('motorcycles');
                            setShopModalOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[4px] text-[#f3f3f3] font-semibold transition-all"
                        >
                          <Bike className="w-4 h-4 text-[#60cdff]" />
                          <span>Motorcycle Dealership</span>
                        </button>

                        <button
                          onClick={() => {
                            setEscapeMenuOpen(false);
                            setActiveShopType('helicopters');
                            setShopModalOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[4px] text-[#f3f3f3] font-semibold transition-all"
                        >
                          <Navigation className="w-4 h-4 text-[#60cdff]" />
                          <span>Helicopter Dealership</span>
                        </button>

                        <button
                          onClick={() => {
                            setEscapeMenuOpen(false);
                            setActiveShopType('planes');
                            setShopModalOpen(true);
                          }}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[4px] text-[#f3f3f3] font-semibold transition-all"
                        >
                          <Plane className="w-4 h-4 text-[#60cdff]" />
                          <span>Airplane Dealership</span>
                        </button>
                      </div>
                    </div>

                    {/* World Actions */}
                    <div className="space-y-2 pt-2 border-t border-[#2e2e2e]">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleResetBuildings}
                          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[4px] transition-all text-[#f3f3f3] font-semibold cursor-pointer ${
                            resetWorldShake ? 'animate-shake border-rose-500 text-rose-400' : ''
                          }`}
                        >
                          <RotateCcw className="w-4 h-4 text-[#60cdff]" />
                          <span>Reset World</span>
                        </button>

                        {confirmResetProgress ? (
                          <div className="col-span-2 p-3 bg-[#1b1b1b] border border-[#e81123]/60 rounded-[4px] space-y-2">
                            <p className="text-[11px] text-[#f87171] font-semibold leading-tight">
                              Are you sure? This will erase all money, vehicles, weapons, and progress!
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                onClick={handleResetProgress}
                                className="py-1.5 px-2 bg-[#e81123] hover:bg-[#c50f1f] text-white font-semibold text-xs rounded-[4px] transition-colors cursor-pointer"
                              >
                                Yes, Reset
                              </button>
                              <button
                                onClick={() => setConfirmResetProgress(false)}
                                className="py-1.5 px-2 bg-[#2d2d2d] hover:bg-[#383838] border border-[#3d3d3d] text-[#f3f3f3] font-semibold text-xs rounded-[4px] transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmResetProgress(true)}
                            className="flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[4px] transition-all text-[#f3f3f3] font-semibold cursor-pointer"
                          >
                            <span>Reset All Progress</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setConfirmRestartPlatformer(false);
                      setEscapeMenuOpen(false);
                      const canvas = document.querySelector('canvas');
                      if (canvas) {
                        try {
                          const req = canvas.requestPointerLock as any;
                          req?.call(canvas, { unadjustedMovement: true });
                        } catch {}
                      }
                    }}
                    className="w-full py-2.5 text-xs font-semibold bg-[#0078d4] hover:bg-[#1084df] text-white border border-[#0078d4] rounded-[4px] transition-colors"
                  >
                    Resume
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
             BATTLE MODE MODAL (WINDOWS FLUENT DARK SYSTEM UI)
            =================================================================== */}
        {pvpModalOpen && (() => {
          const totalEnemyUnits = pvpConfig.enemyCount ?? pvpConfig.enemyGroups.reduce((sum, g) => sum + g.count, 0);
          const selectedWeapon =
            WEAPONS_CATALOG.find((w) => w.id === pvpConfig.playerWeaponId) || WEAPONS_CATALOG[0];
          const selectedEnemyWeapon =
            WEAPONS_CATALOG.find((w) => w.id === (pvpConfig.enemyWeaponId || 'weapon-pistol')) || WEAPONS_CATALOG[0];
          const selectedPlane =
            PLANES_CATALOG.find((p) => p.id === pvpConfig.playerVehicleId) || PLANES_CATALOG[0];
          const selectedHeli =
            HELICOPTERS_CATALOG.find((h) => h.id === pvpConfig.playerVehicleId) || HELICOPTERS_CATALOG[0];
          const selectedCar =
            CARS_CATALOG.find((c) => c.id === pvpConfig.playerVehicleId) || CARS_CATALOG[0];
          const selectedMoto =
            MOTORCYCLES_CATALOG.find((m) => m.id === pvpConfig.playerVehicleId) || MOTORCYCLES_CATALOG[0];

          const activeLoadoutName =
            pvpConfig.playerMode === 'foot'
              ? selectedWeapon.name
              : pvpConfig.playerMode === 'plane'
              ? selectedPlane.name
              : pvpConfig.playerMode === 'helicopter'
              ? selectedHeli.name
              : pvpConfig.playerMode === 'car'
              ? selectedCar.name
              : selectedMoto.name;

          const activeLoadoutSub =
            pvpConfig.playerMode === 'foot'
              ? `${(selectedWeapon?.type || 'weapon').toUpperCase()} • ${selectedWeapon?.damage ?? 25} DMG`
              : pvpConfig.playerMode === 'plane'
              ? `AIRPLANE • ${selectedPlane.maxSpeed} MPH MAX`
              : pvpConfig.playerMode === 'helicopter'
              ? `HELICOPTER • ${selectedHeli.maxSpeed} MPH MAX`
              : pvpConfig.playerMode === 'car'
              ? `CAR • ${selectedCar.maxSpeed} MPH MAX`
              : `MOTORCYCLE • ${selectedMoto.maxSpeed} MPH MAX`;

          return (
            <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 select-none cursor-default">
              <div className="w-full max-w-4xl bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden text-[#f3f3f3] flex flex-col max-h-[88vh]">
                {/* Windows Title Bar */}
                <div className="flex items-center justify-between h-9 pl-3.5 pr-0 bg-white/5 border-b border-white/10 select-none shrink-0">
                  <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
                    <Swords className="w-3.5 h-3.5 text-[#0078d4]" />
                    <span>Battle Mode Configuration</span>
                  </div>
                  <div className="flex items-center h-full">
                    {pvpConfig.active ? (
                      <>
                        <button
                          onClick={handleExitPvpBattle}
                          className="flex items-center gap-1.5 px-3 h-full text-rose-300 hover:bg-rose-950/40 hover:text-rose-100 text-xs transition-colors border-r border-white/10 cursor-pointer"
                          title="Exit Battle and Return to City"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Return to City</span>
                        </button>
                        <button
                          onClick={() => setPvpModalOpen(false)}
                          className="flex items-center gap-1 px-3 h-full text-[#cccccc] hover:bg-[#2d2d2d] hover:text-white text-xs transition-colors cursor-pointer"
                          title="Close modal and resume battle"
                        >
                          <span>Resume</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setPvpModalOpen(false);
                          if (!titleScreenOpen) {
                            setEscapeMenuOpen(true);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 h-full text-[#cccccc] hover:bg-[#2d2d2d] hover:text-white text-xs transition-colors cursor-pointer"
                      >
                        <span>← Back</span>
                      </button>
                    )}
                    <button
                      onClick={() => setPvpModalOpen(false)}
                      className="flex items-center justify-center w-11 h-full text-[#cccccc] hover:bg-[#e81123] hover:text-white transition-colors text-xs cursor-pointer"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Main Two-Side Configuration Area (Your Side vs NPC Customization) */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto flex-1 bg-transparent">
                  {/* =========================================================
                      LEFT PANEL: YOUR SIDE (PLAYER CUSTOMIZATION & LOADOUT)
                      ========================================================= */}
                  <div className="flex flex-col bg-white/5 border border-white/10 rounded-[4px] overflow-hidden">
                    {/* Panel Header */}
                    <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#60cdff]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#f3f3f3]">
                          Your side
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#60cdff] bg-[#202020] border border-[#3a3a3a] px-2 py-0.5 rounded-[3px]">
                        {activeLoadoutName}
                      </span>
                    </div>

                    <div className="p-4 space-y-4 flex-1 flex flex-col">
                      {/* Step 1: Combat Mode */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] uppercase tracking-wider text-[#a0a0a0] font-semibold block">
                          1. Deployment Mode
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'foot', label: 'On Foot', Icon: User },
                              { id: 'plane', label: 'Airplane', Icon: Plane },
                              { id: 'helicopter', label: 'Helicopter', Icon: Navigation },
                            ] as const
                          ).map(({ id, label, Icon }) => {
                            const isSelected = pvpConfig.playerMode === id;
                            return (
                              <button
                                key={id}
                                onClick={() =>
                                  setPvpConfig((prev) => {
                                    let nextVehId = prev.playerVehicleId;
                                    if (id === 'plane' && !PLANES_CATALOG.some((p) => p.id === nextVehId)) {
                                      nextVehId = activePlaneId || PLANES_CATALOG[0].id;
                                    } else if (
                                      id === 'helicopter' &&
                                      !HELICOPTERS_CATALOG.some((h) => h.id === nextVehId)
                                    ) {
                                      nextVehId = activeHeliId || HELICOPTERS_CATALOG[0].id;
                                    }
                                    return { ...prev, playerMode: id, playerVehicleId: nextVehId };
                                  })
                                }
                                className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-[4px] border text-xs font-semibold transition-colors ${
                                  isSelected
                                    ? 'bg-[#0078d4] border-[#0078d4] text-white'
                                    : 'bg-[#2d2d2d] hover:bg-[#383838] border-[#3d3d3d] hover:border-[#505050] text-[#f3f3f3]'
                                }`}
                              >
                                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#60cdff]'}`} />
                                <span className="text-[11px] leading-tight">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Step 2: Weapon or Vehicle Selection */}
                      <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-[#a0a0a0] font-semibold">
                            {pvpConfig.playerMode === 'foot' ? '2. Select primary weapon' : '2. Select combat vehicle'}
                          </span>
                          <span className="text-[10px] font-mono text-[#a0a0a0]">{activeLoadoutSub}</span>
                        </div>

                        <div className="bg-[#141414] border border-[#2e2e2e] rounded-[4px] p-2 space-y-1.5 max-h-60 overflow-y-auto flex-1">
                          {pvpConfig.playerMode === 'foot' &&
                            WEAPONS_CATALOG.filter((w) => w.price === 0 || ownedWeaponIds.includes(w.id)).map((w) => {
                              const active = pvpConfig.playerWeaponId === w.id;
                              return (
                                <div
                                  key={w.id}
                                  onClick={() => setPvpConfig((prev) => ({ ...prev, playerWeaponId: w.id }))}
                                  className={`p-2.5 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between ${
                                    active
                                      ? 'bg-[#2b2b2b] border-[#0078d4]'
                                      : 'bg-[#242424] border-[#353535] hover:bg-[#2d2d2d]'
                                  }`}
                                >
                                  <div className="space-y-0.5 pr-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-[#f3f3f3]">{w.name}</span>
                                    </div>
                                    <div className="text-[10px] text-[#a0a0a0]">
                                      {w.name}
                                    </div>
                                  </div>
                                  <span
                                    className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold shrink-0 ${
                                      active
                                        ? 'bg-[#0078d4] text-white'
                                        : 'bg-[#1f1f1f] border border-[#3d3d3d] text-[#cccccc]'
                                    }`}
                                  >
                                    {active ? 'Selected' : 'Select'}
                                  </span>
                                </div>
                              );
                            })}

                          {pvpConfig.playerMode === 'plane' &&
                            PLANES_CATALOG.filter((p) => p.price === 0 || ownedPlaneIds.includes(p.id)).map((p) => {
                              const active = pvpConfig.playerVehicleId === p.id;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => setPvpConfig((prev) => ({ ...prev, playerVehicleId: p.id }))}
                                  className={`p-2.5 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between ${
                                    active
                                      ? 'bg-[#2b2b2b] border-[#0078d4]'
                                      : 'bg-[#242424] border-[#353535] hover:bg-[#2d2d2d]'
                                  }`}
                                >
                                  <div className="space-y-0.5 pr-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-[#f3f3f3]">{p.name}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#181818] border border-[#3d3d3d] text-[#60cdff] font-mono">
                                        {p.maxSpeed} MPH
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-[#a0a0a0] line-clamp-1">{p.description}</div>
                                  </div>
                                  <span
                                    className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold shrink-0 ${
                                      active
                                        ? 'bg-[#0078d4] text-white'
                                        : 'bg-[#1f1f1f] border border-[#3d3d3d] text-[#cccccc]'
                                    }`}
                                  >
                                    {active ? 'Selected' : 'Select'}
                                  </span>
                                </div>
                              );
                            })}

                          {pvpConfig.playerMode === 'helicopter' &&
                            HELICOPTERS_CATALOG.filter((h) => h.price === 0 || ownedHeliIds.includes(h.id)).map((h) => {
                              const active = pvpConfig.playerVehicleId === h.id;
                              return (
                                <div
                                  key={h.id}
                                  onClick={() => setPvpConfig((prev) => ({ ...prev, playerVehicleId: h.id }))}
                                  className={`p-2.5 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between ${
                                    active
                                      ? 'bg-[#2b2b2b] border-[#0078d4]'
                                      : 'bg-[#242424] border-[#353535] hover:bg-[#2d2d2d]'
                                  }`}
                                >
                                  <div className="space-y-0.5 pr-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-[#f3f3f3]">{h.name}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#181818] border border-[#3d3d3d] text-[#60cdff] font-mono">
                                        {h.maxSpeed} MPH
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-[#a0a0a0] line-clamp-1">{h.description}</div>
                                  </div>
                                  <span
                                    className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold shrink-0 ${
                                      active
                                        ? 'bg-[#0078d4] text-white'
                                        : 'bg-[#1f1f1f] border border-[#3d3d3d] text-[#cccccc]'
                                    }`}
                                  >
                                    {active ? 'Selected' : 'Select'}
                                  </span>
                                </div>
                              );
                            })}

                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col bg-white/5 border border-white/10 rounded-[4px] overflow-hidden">
                    {/* Panel Header */}
                    <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#f87171]" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#f3f3f3]">
                          Enemy npcs
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#f87171] bg-white/10 border border-white/20 px-2 py-0.5 rounded-[3px]">
                        {totalEnemyUnits} {totalEnemyUnits === 1 ? 'Unit' : 'Units'} • {selectedEnemyWeapon.name}
                      </span>
                    </div>

                    <div className="p-4 space-y-4 flex-1 flex flex-col">
                      {/* Step 1: Enemy Unit Count */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-[#a0a0a0] font-semibold">
                            1. Enemy npc squad size
                          </span>
                          <span className="font-mono text-xs font-bold text-[#60cdff]">
                            {totalEnemyUnits} soldiers
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSetEnemyCount(totalEnemyUnits - 1)}
                            className="w-7 h-7 rounded-[4px] bg-white/5 hover:bg-white/10 border border-white/10 text-[#f3f3f3] text-xs font-bold flex items-center justify-center cursor-pointer transition-all"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min={1}
                            max={50}
                            value={totalEnemyUnits}
                            onChange={(e) => handleSetEnemyCount(Number(e.target.value))}
                            className="flex-1 accent-[#0078d4] cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
                          />
                          <button
                            onClick={() => handleSetEnemyCount(totalEnemyUnits + 1)}
                            className="w-7 h-7 rounded-[4px] bg-white/5 hover:bg-white/10 border border-white/10 text-[#f3f3f3] text-xs font-bold flex items-center justify-center cursor-pointer transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {/* Reward Preview Counter */}
                      <div className="bg-[#141414] border border-[#2e2e2e] rounded-[4px] p-2.5 space-y-1 text-xs">
                        {(() => {
                          const isPistol = (pvpConfig.enemyWeaponId || 'weapon-fist') === 'weapon-pistol';
                          const baseNpcReward = 1000 + (totalEnemyUnits * 5);
                          const npcReward = isPistol ? baseNpcReward * 2 : baseNpcReward;
                          const totalPayout = totalEnemyUnits * npcReward;
                          return (
                            <>
                              <div className="flex justify-between items-center text-[#a0a0a0]">
                                <span>Money per NPC killed:</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  ${npcReward.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[#a0a0a0]">
                                <span>Total Victory Payout:</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  ${totalPayout.toLocaleString()}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Step 2: Enemy Weapon Selection */}
                      <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-[#a0a0a0] font-semibold">
                            2. Enemy weapon loadout
                          </span>
                          <span className="text-[10px] font-mono text-[#a0a0a0]">
                            {selectedEnemyWeapon.name}
                          </span>
                        </div>

                        <div className="bg-[#141414] border border-[#2e2e2e] rounded-[4px] p-2 space-y-1.5 max-h-60 overflow-y-auto flex-1">
                          {WEAPONS_CATALOG.filter((w) => w.id === 'weapon-fist' || w.id === 'weapon-pistol').map((w) => {
                            const isEquipped = (pvpConfig.enemyWeaponId || 'weapon-pistol') === w.id;
                            return (
                              <div
                                key={w.id}
                                onClick={() => handleSetEnemyWeapon(w.id)}
                                className={`p-2.5 rounded-[4px] border transition-colors cursor-pointer flex items-center justify-between ${
                                  isEquipped
                                    ? 'bg-[#2b2b2b] border-[#0078d4]'
                                    : 'bg-[#242424] border-[#353535] hover:bg-[#2d2d2d]'
                                }`}
                              >
                                <div className="space-y-0.5 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-[#f3f3f3]">{w.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#181818] border border-[#3d3d3d] text-[#60cdff] uppercase font-mono">
                                      {w.type}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#a0a0a0]">
                                    Damage: <span className="text-[#f3f3f3] font-semibold">{w.damage ?? 25}</span> • Range: <span className="text-[#f3f3f3] font-semibold">{w.range}m</span>
                                  </div>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold shrink-0 ${
                                    isEquipped
                                      ? 'bg-[#0078d4] text-white'
                                      : 'bg-[#1f1f1f] border border-[#3d3d3d] text-[#cccccc]'
                                  }`}
                                >
                                  {isEquipped ? 'Equipped' : 'Equip'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Windows Dialog Footer Bar */}
                <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-[#181818] border-t border-[#2e2e2e] gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-[#a0a0a0]">Record:</span>
                      <span className="text-amber-400 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" /> {battleStats.wins}W
                      </span>
                      <span className="text-[#555]">-</span>
                      <span className="text-rose-400 flex items-center gap-1">
                        <Skull className="w-3.5 h-3.5 text-rose-400" /> {battleStats.losses}L
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => {
                        setPvpModalOpen(false);
                        if (!pvpConfig.active && !titleScreenOpen) {
                          setEscapeMenuOpen(true);
                        }
                      }}
                      className="px-4 py-2 text-xs bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-[4px] text-[#f3f3f3] font-semibold transition-all cursor-pointer"
                    >
                      {pvpConfig.active ? 'Close' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleLaunchPvpBattle}
                      className="px-5 py-2 text-xs bg-[#0078d4] hover:bg-[#1084df] border border-[#0078d4] rounded-[4px] text-white font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>{pvpConfig.active ? 'Restart Battle' : 'Start Battle'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===================================================================
             WEAPON SHOP MODAL
            =================================================================== */}
        {weaponMenuOpen && (
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 select-none cursor-default">
            <div className="w-full max-w-lg bg-[#202020] border border-[#3a3a3a] rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden text-[#f3f3f3]">
              <div className="flex items-center justify-between h-9 pl-3.5 pr-0 bg-[#181818] border-b border-[#2e2e2e] select-none">
                <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
                  <Crosshair className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span className="font-semibold">Weapon Shop</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-0.5 rounded bg-[#15803d]/30 border border-[#22c55e]/40 text-[#4ade80] text-xs font-mono font-bold">
                    ${money.toLocaleString()}
                  </div>
                  <div className="flex items-center h-9">
                    <button
                      onClick={() => {
                        setWeaponMenuOpen(false);
                        setEscapeMenuOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 h-full text-[#cccccc] hover:bg-[#2d2d2d] hover:text-white text-xs transition-colors"
                    >
                      <span>← Back</span>
                    </button>
                    <button
                      onClick={() => setWeaponMenuOpen(false)}
                      className="flex items-center justify-center w-11 h-full text-[#cccccc] hover:bg-[#e81123] hover:text-white transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-2.5 max-h-[75vh] overflow-y-auto bg-[#202020]">
                {WEAPONS_CATALOG.map((weapon) => {
                  const isOwned = weapon.price === 0 || ownedWeaponIds.includes(weapon.id);
                  const isEquipped = weapon.id === (activeWeaponId || 'weapon-fist');
                  const canAfford = money >= weapon.price;
                  const isShaking = shakingWeaponId === weapon.id;

                  return (
                    <div
                      key={weapon.id}
                      onClick={() => {
                        if (!isOwned && !canAfford) {
                          triggerWeaponShake(weapon.id);
                        }
                      }}
                      className={`p-3 rounded-[4px] border transition-all flex items-center justify-between gap-2 ${
                        isShaking ? 'animate-shake ring-1 ring-white/30' : ''
                      } ${
                        isEquipped
                          ? 'bg-[#2b2b2b] border-[#0078d4]'
                          : 'bg-[#2b2b2b]/60 border-[#3d3d3d]'
                      }`}
                    >
                      <div className="space-y-1 pr-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#f3f3f3]">{weapon.name}</span>
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 bg-[#181818] border-[#383838] text-white">
                            {weapon.price === 0 ? 'FREE' : isOwned ? 'OWNED' : `$${weapon.price.toLocaleString()}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#a0a0a0]">
                          Damage: <span className="text-[#f3f3f3] font-semibold">{weapon.damage ?? 25}</span> • Range: <span className="text-[#f3f3f3] font-semibold">{weapon.range}m</span>
                        </div>
                      </div>

                      {isOwned ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectWeapon(weapon);
                          }}
                          className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            isEquipped
                              ? 'bg-[#0078d4] text-white'
                              : 'bg-[#1f1f1f] border border-[#3d3d3d] text-[#d4d4d4] hover:bg-[#383838]'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canAfford) {
                              handleBuyItem(weapon.price, weapon.name, weapon.id, 'weapons');
                            } else {
                              triggerWeaponShake(weapon.id);
                            }
                          }}
                          className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold shrink-0 transition-colors ${
                            canAfford
                              ? 'bg-[#0078d4] hover:bg-[#106ebe] text-white cursor-pointer'
                              : 'bg-[#262626] border border-[#363636] text-[#888888] cursor-pointer'
                          }`}
                        >
                          Buy for ${weapon.price.toLocaleString()}
                        </button>
                      )}
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setWeaponMenuOpen(false);
                      setEscapeMenuOpen(true);
                    }}
                    className="px-4 py-1.5 text-xs bg-[#2b2b2b] hover:bg-[#383838] border border-[#3d3d3d] rounded-[4px] text-[#f3f3f3] font-semibold transition-colors cursor-pointer"
                  >
                    Back to Menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          VEHICLE DEALERSHIP MODAL
          ===================================================================== */}
      {shopModalOpen && (
        <ShopModal
          isOpen={shopModalOpen}
          shopType={activeShopType}
          money={money}
          onBuyItem={handleBuyItem}
          ownedCarIds={ownedCarIds}
          ownedMotorcycleIds={ownedMotorcycleIds}
          ownedHeliIds={ownedHeliIds}
          ownedPlaneIds={ownedPlaneIds}
          onClose={() => setShopModalOpen(false)}
          onBack={() => {
            setShopModalOpen(false);
            setEscapeMenuOpen(true);
          }}
          activeVehicle={activeVehicle}
          activeCarId={activeCarId}
          activeMotorcycleId={activeMotorcycleId}
          activeHeliId={activeHeliId}
          activePlaneId={activePlaneId}
          onSelectCar={handleSpawnCar}
          onSelectMotorcycle={handleSpawnMotorcycle}
          onSelectHeli={handleSpawnHeli}
          onSelectPlane={handleSpawnPlane}
          onPreview={(id, name, data, type) => {
            setActivePreviewVehicle({ id, name, data, type });
            setPreviewModalOpen(true);
          }}
        />
      )}

      <VehiclePreviewModal
        isOpen={previewModalOpen}
        vehicleId={activePreviewVehicle?.id || ''}
        vehicleName={activePreviewVehicle?.name || ''}
        vehicleData={activePreviewVehicle?.data}
        shopType={activePreviewVehicle?.type || 'cars'}
        onClose={() => setPreviewModalOpen(false)}
      />

      {/* =====================================================================
          CHARACTER CUSTOMIZER MODAL
          ===================================================================== */}
      {customizerOpen && (
        <CharacterCustomizerModal
          isOpen={customizerOpen}
          onClose={() => setCustomizerOpen(false)}
          onBack={() => {
            setCustomizerOpen(false);
            if (!titleScreenOpen) {
              setEscapeMenuOpen(true);
            }
          }}
          onCloseAll={() => {
            setCustomizerOpen(false);
            setEscapeMenuOpen(false);
          }}
          config={customCharacter}
          onChange={setCustomCharacter}
          performanceMode={performanceMode}
          resolutionScale={resolutionScale}
        />
      )}

      {/* =====================================================================
          COOKING MENU MODAL
          ===================================================================== */}
      {cookingMenuOpen && (
        <CookingMenu
          inventory={ingredientInventory}
          cookedFood={cookedFoodInventory}
          onCook={handleCookFood}
          onEat={handleEatFood}
          onClose={() => setCookingMenuOpen(false)}
        />
      )}

      {/* =====================================================================
          INTERACTIVE RESTAURANT / DINER / CAFE ORDERING MENU MODAL
          ===================================================================== */}
      {activeRestaurantMenu && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 select-none cursor-default">
          <div className="bg-[#202020] border border-[#3a3a3a] rounded-[6px] max-w-2xl w-full max-h-[82vh] flex flex-col overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)] text-[#f3f3f3]">
            <div className="h-9 pl-3.5 pr-0 bg-[#181818] border-b border-[#2e2e2e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
                <Utensils className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>{activeRestaurantMenu.name}</span>
              </div>
              <button
                onClick={() => setActiveRestaurantMenu(null)}
                className="w-11 h-full flex items-center justify-center text-[#cccccc] hover:bg-[#e81123] hover:text-white transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#202020]">
              {getRestaurantMenuItems(activeRestaurantMenu.type).map((meal) => (
                <div
                  key={meal.id}
                  className="bg-[#2b2b2b] border border-[#3d3d3d] hover:border-[#0078d4] rounded-[4px] p-4 flex flex-col justify-between transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{meal.emoji}</span>
                        <div>
                          <h3 className="font-semibold text-[#f3f3f3] text-xs">{meal.name}</h3>
                          <span className="text-[10px] text-[#60cdff] uppercase font-mono">
                            Fresh &amp; Ready
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#cccccc] mb-3 leading-relaxed">
                      {meal.description}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[#383838]">
                    <button
                      onClick={() => {
                        handleEatFood(meal);
                        setActiveRestaurantMenu(null);
                      }}
                      className="flex-1 py-1.5 px-3 bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold text-xs rounded-[4px] transition-colors cursor-pointer"
                    >
                      Eat Now
                    </button>
                    <button
                      onClick={() => {
                        setCookedFoodInventory((prev) => [...prev, meal]);
                        soundFX.playPlaceObject();
                      }}
                      className="py-1.5 px-3 bg-[#1f1f1f] hover:bg-[#343434] border border-[#3d3d3d] text-[#f3f3f3] font-semibold text-xs rounded-[4px] transition-colors cursor-pointer"
                    >
                      + Pack To-Go
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Survival Banner Overlay */}
      {survivalBanner && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none bg-black/40 backdrop-blur-[2px]">
          <div className="text-center px-8 py-6 bg-emerald-950/90 border-2 border-emerald-500 rounded-lg shadow-[0_0_50px_rgba(16,185,129,0.5)]">
            <h1 className="text-3xl md:text-5xl font-black text-emerald-300 uppercase tracking-widest drop-shadow-lg">
              {survivalBanner}
            </h1>
            <p className="text-sm font-semibold text-emerald-200 mt-2">
              Congratulations on surviving the disaster!
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          INFO MODAL ("Why did I make Simulator?")
          ===================================================================== */}
      {infoModalOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[6px] p-4 cursor-default transition-all animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInfoModalOpen(false);
          }}
        >
          <div className="bg-[#1e1e1e] border border-white/15 rounded-[8px] max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.95)] text-[#f3f3f3]">
            {/* Window Title Bar */}
            <div className="h-10 pl-4 pr-0 bg-[#161616] border-b border-[#2e2e2e] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#e5e5e5]">
                <Info className="w-4 h-4 text-[#60cdff]" />
                <span>Why did I make Simulator?</span>
              </div>
              <button
                onClick={() => setInfoModalOpen(false)}
                className="w-11 h-full flex items-center justify-center text-[#cccccc] hover:bg-[#e81123] hover:text-white transition-colors text-sm cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto text-sm text-[#cccccc] font-sans whitespace-pre-line leading-relaxed">
{`Why did I make Simulator?

First of all, let’s take a look at what Simulator rewards and encourages you to do:

-Murder numerous innocent civilians in order to earn money

-Destroy countless buildings and property. Once again, for the purpose of making money

-Using the money you previously earned to buy tools to make destruction easier, in order to earn more money.

-Doing all of this whilst risking your life, and most likely dying in the process. 

-You died? No worries! Respawn instantly with an infinite number of chances to do it all over again.

All of this reckless activity teaches you that killing people and destroying things is a good thing and should be rewarded. Simulator teaches you that people’s lives are nothing more than a tool to earn money, all for the purpose of killing more people. Simulator teaches you that if you make a mistake, you can just undo it without any repercussions. 

So, what’s the moral of the story? Murder and destruction should be rewarded? 

No! 

I did not make Simulator to teach anyone anything. I made Simulator as a way for people to release their inner violence. To satisfy that urge to destroy things. That urge that people have been suppressing for all of these years. In real society, where violence and famine is punished, people still have a quiet longing for destruction. A longing to obliterate things. A longing to murder people meaninglessly. The longing is the reason people enjoy videogames, where violence is rewarded. 

I made Simulator specifically for people who want to let out their inner violence. I didn’t make Simulator to teach people a lesson. I made Simulator to allow people to release the desire to destroy, so they can focus on other things in real life; things that are rewarded more in modern day society.`}
            </div>

            {/* Bottom Footer Action */}
            <div className="p-3.5 bg-[#181818] border-t border-[#2e2e2e] flex items-center justify-end shrink-0">
              <button
                onClick={() => setInfoModalOpen(false)}
                className="px-5 py-2 bg-[#0078d4] hover:bg-[#1084df] text-white font-semibold text-xs rounded-[4px] shadow-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
