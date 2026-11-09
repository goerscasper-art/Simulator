export interface CarVehicle {
  id: string;
  name: string;
  price: number;
  color: string;
  accentColor?: string;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  category?: string;
  modelStyle:
    | 'compact_hatch'
    | 'sedan'
    | 'wagon'
    | 'aeropod'
    | 'vintage_coupe'
    | 'hot_hatch'
    | 'muscle'
    | 'roadster'
    | 'grand_tourer'
    | 'cybertruck'
    | 'track_gt3'
    | 'sport_gt_coupe'
    | 'sport_track_sedan'
    | 'sport_aero_fastback'
    | 'sport_apex_coupe'
    | string;
  description: string;
  categoryTier?: 'starter' | 'street' | 'exotic' | 'hypersonic';
}

export type NPCPersonality =
  | 'friendly'
  | 'cheerful'
  | 'wise'
  | 'rude'
  | 'grumpy'
  | 'hostile'
  | 'mean'
  | 'quirky'
  | 'paranoid';

export interface NPCChatMessage {
  sender: 'player' | 'npc';
  text: string;
}

export interface NPCData {
  id: string;
  name: string;
  role: string;
  outfitColor: string;
  position: [number, number, number];
  rotationY: number;
  waypoints: [number, number][];
  currentWaypointIdx: number;
  dialogueList: string[];
  personality?: NPCPersonality;
  personalityTrait?: string;
  backstory?: string;
  maxHealth?: number;
  weaponType?: 'unarmed' | 'melee' | 'pistol' | 'smg' | 'rifle';
  hostileLines?: string[];
  conversationHistory?: NPCChatMessage[];
  isHostile?: boolean;
}

export type DisasterType = 'none' | 'meteor_shower' | 'flood';

export interface PvpEnemyConfig {
  type: 'foot';
  count: number;
}

export interface PvpBattleConfig {
  active: boolean;
  playerMode: 'foot' | 'plane' | 'helicopter';
  playerWeaponId: string;
  playerVehicleId: string;
  enemyWeaponId?: string;
  enemyCount?: number;
  enemyGroups: PvpEnemyConfig[];
}

export interface CustomCharacterConfig {
  skinColor: string;
  hairStyle: 'short' | 'long' | 'mohawk' | 'afro' | 'ponytail' | 'bald';
  hairColor: string;
  eyeColor: string;
  facialHair: 'none' | 'stubble' | 'beard' | 'mustache' | 'goatee';
  topStyle: 'tshirt' | 'hoodie' | 'jacket' | 'suit' | 'tanktop';
  topColor: string;
  secondaryTopColor: string;
  pantsStyle: 'pants' | 'dress' | 'shorts' | 'jeans' | 'cargo' | 'slacks';
  pantsColor: string;
  shoeColor: string;
  hatStyle: 'none' | 'cap' | 'beanie' | 'tophat' | 'cowboy' | 'crown';
  hatColor: string;
  glassesStyle: 'none' | 'sunglasses' | 'reading' | 'visor';
  glassesColor: string;
  accessory: 'none' | 'backpack' | 'cape' | 'purse' | 'chains';
  accessoryColor: string;
  heightScale: number;
  widthScale: number;
}

export interface CarPhysics {
  x: number;
  y?: number;
  z: number;
  rotationY: number;
  pitchX?: number;
  speed: number;
  steering: number;
  vy?: number;
}

export type ActiveVehicleType = 'car' | 'motorcycle' | 'helicopter' | 'plane' | null;

export interface MotorcycleVehicle {
  id: string;
  name: string;
  price: number;
  color: string;
  accentColor: string;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  style:
    | 'scooter'
    | 'cruiser'
    | 'cafe_racer'
    | 'dirt_bike'
    | 'streetfighter'
    | 'superbike'
    | 'hypersport'
    | 'tomahawk'
    | 'cyber_moto'
    | 'jet_bike';
  description: string;
}

export interface MotorcyclePhysics {
  x: number;
  z: number;
  rotationY: number;
  speed: number;
  steering: number;
  leanAngle: number;
  wheeliePitch?: number;
}

export interface HelicopterPhysics {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  verticalSpeed: number;
  tiltPitch: number;
  tiltRoll: number;
  rotorSpeed: number;
}

export interface PlanePhysics {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  verticalSpeed: number;
  pitch: number;
  roll: number;
  propSpeed: number;
  gearDown?: boolean;
  throttle?: number;
}

export interface ExcavatorPhysics {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  speed: number;
  steering: number;
  boomAngle: number;
  armAngle: number;
  bucketAngle: number;
}

export interface HelicopterVehicle {
  id: string;
  name: string;
  price: number;
  maxSpeed: number;
  climbRate: number;
  handling: number;
  color: string;
  accentColor: string;
  style: 'scout' | 'twin_turbine' | 'apache' | 'gunship';
  description: string;
}

export interface PlaneVehicle {
  id: string;
  name: string;
  price: number;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  color: string;
  accentColor: string;
  style: 'cessna' | 'mustang' | 'learjet' | 'airliner' | 'raptor' | 'darkstar' | 'jetpack';
  description: string;
}

export interface WeaponItem {
  id: string;
  name: string;
  price: number;
  type:
    | 'unarmed'
    | 'melee'
    | 'chainsaw'
    | 'pistol'
    | 'smg'
    | 'rifle'
    | 'shotgun'
    | 'sniper'
    | 'minigun'
    | 'rpg'
    | 'grenade'
    | 'timebomb'
    | 'remotebomb'
    | 'orbital_laser'
    | 'meteor_staff'
    | 'gravity_hammer'
    | 'cluster_launcher'
    | 'grapple_gun'
    | 'firework_cannon'
    | 'nuke';
  damage?: number;
  range: number;
  fireRate: number;
  color: string;
  description: string;
}

export type NaturalDisasterType = 'none' | 'meteor_shower' | 'flood';

export interface BattleArenaConfig {
  active: boolean;
  playerMode: 'foot' | 'car' | 'helicopter' | 'plane';
  playerWeaponId: string;
  playerCarId: string;
  playerHeliId: string;
  playerPlaneId: string;
  groundNpcCount: number;
  heliNpcCount: number;
  planeNpcCount: number;
  triggerId: number;
}

export interface MiscItem {
  id: string;
  name: string;
  price: number;
  category: 'destruction' | 'fun' | 'speed';
  mode: 'handheld' | 'toggle';
  weaponType?: WeaponItem['type'];
  weaponPayload?: WeaponItem;
  color: string;
  badge: string;
  description: string;
}

export type WeatherType = 'sunny' | 'rainy' | 'snowy';

export interface WeatherStatusInfo {
  current: WeatherType;
  target: WeatherType;
  inTransition: boolean;
  transitionProgress: number;
  timeLeftInPhase: number;
  phaseDuration: number;
  autoCycleEnabled: boolean;
  temperatureF: number;
  conditionLabel: string;
  rainWeight: number;
  snowWeight: number;
  sunnyWeight: number;
}

export type ResolutionScale = 'extra-low' | 'low' | 'balanced' | 'high';

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
}

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  effect: {
    type: 'speed' | 'health' | 'jump' | 'low-gravity' | 'strength' | 'none';
    duration: number;
    value: number;
  };
  recipe: string[]; // IDs of ingredients
}


