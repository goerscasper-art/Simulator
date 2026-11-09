import React from 'react';
import {
  Car,
  Bike,
  Plane,
  Navigation,
} from 'lucide-react';
import {
  ActiveVehicleType,
  CarVehicle,
  HelicopterVehicle,
  MotorcycleVehicle,
  PlaneVehicle,
} from '../types/housesim';
import {
  CARS_CATALOG,
  HELICOPTERS_CATALOG,
  MOTORCYCLES_CATALOG,
  PLANES_CATALOG,
} from '../data/catalog';
import { soundFX } from '../utils/soundEffects';

export type VehicleShopType = 'cars' | 'motorcycles' | 'helicopters' | 'planes';

interface ShopModalProps {
  isOpen: boolean;
  shopType: VehicleShopType;
  money: number;
  onBuyItem: (price: number, name: string, itemId: string, category: VehicleShopType) => boolean;
  ownedCarIds: string[];
  ownedMotorcycleIds: string[];
  ownedHeliIds: string[];
  ownedPlaneIds: string[];
  onClose: () => void;
  onBack?: () => void;
  onPreview: (id: string, name: string, data: any, type: VehicleShopType) => void;
  activeVehicle?: ActiveVehicleType;
  activeCarId?: string | null;
  onSpawnCar?: (car: CarVehicle) => void;
  onSelectCar?: (car: CarVehicle) => void;
  activeMotorcycleId?: string | null;
  onSpawnMotorcycle?: (motorcycle: MotorcycleVehicle) => void;
  onSelectMotorcycle?: (motorcycle: MotorcycleVehicle) => void;
  activeHeliId?: string | null;
  onSpawnHeli?: (heli: HelicopterVehicle) => void;
  onSelectHeli?: (heli: HelicopterVehicle) => void;
  activePlaneId?: string | null;
  onSpawnPlane?: (plane: PlaneVehicle) => void;
  onSelectPlane?: (plane: PlaneVehicle) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  shopType,
  money,
  onBuyItem,
  ownedCarIds,
  ownedMotorcycleIds,
  ownedHeliIds,
  ownedPlaneIds,
  onClose,
  onBack,
  onPreview,
  activeVehicle,
  activeCarId,
  onSpawnCar,
  onSelectCar,
  activeMotorcycleId,
  onSpawnMotorcycle,
  onSelectMotorcycle,
  activeHeliId,
  onSpawnHeli,
  onSelectHeli,
  activePlaneId,
  onSpawnPlane,
  onSelectPlane,
}) => {
  const spawnCar = onSelectCar || onSpawnCar;
  const spawnMoto = onSelectMotorcycle || onSpawnMotorcycle;
  const spawnHeli = onSelectHeli || onSpawnHeli;
  const spawnPlane = onSelectPlane || onSpawnPlane;

  const [shakingItemId, setShakingItemId] = React.useState<string | null>(null);

  const triggerShake = (id: string) => {
    setShakingItemId(id);
    window.setTimeout(() => {
      setShakingItemId((current) => (current === id ? null : current));
    }, 450);
  };

  if (!isOpen) return null;

  const titleByType: Record<VehicleShopType, { title: string; icon: React.ReactNode }> = {
    cars: {
      title: 'Car Dealership',
      icon: <Car className="w-3.5 h-3.5 text-[#0078d4]" />,
    },
    motorcycles: {
      title: 'Motorcycle Dealership',
      icon: <Bike className="w-3.5 h-3.5 text-[#0078d4]" />,
    },
    helicopters: {
      title: 'Helicopter Dealership',
      icon: <Navigation className="w-3.5 h-3.5 text-[#0078d4]" />,
    },
    planes: {
      title: 'Airplane Dealership',
      icon: <Plane className="w-3.5 h-3.5 text-[#0078d4]" />,
    },
  };

  const currentHeader = titleByType[shopType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 select-none cursor-default">
      <div className="w-full max-w-5xl bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh] text-[#f3f3f3]">
        {/* Title Bar */}
        <div className="flex items-center justify-between h-9 pl-3.5 pr-0 bg-white/5 border-b border-white/10 shrink-0 select-none">
          <div className="flex items-center gap-2 text-xs font-normal text-[#e5e5e5]">
            {currentHeader.icon}
            <span className="font-semibold">{currentHeader.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-0.5 rounded bg-[#15803d]/30 border border-[#22c55e]/40 text-[#4ade80] text-xs font-mono font-bold">
              ${money.toLocaleString()}
            </div>
            <div className="flex items-center h-9">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 px-3 h-full text-[#cccccc] hover:bg-white/10 hover:text-white text-xs transition-colors"
                  title="Back to Menu"
                >
                  <span>← Back</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-11 h-full flex items-center justify-center text-[#cccccc] hover:bg-[#e81123] hover:text-white transition-colors text-xs"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-5 overflow-y-auto flex-1 bg-transparent">
          {/* 1. CAR DEALERSHIP */}
          {shopType === 'cars' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {CARS_CATALOG.map((car) => {
                const isOwned = car.price === 0 || ownedCarIds.includes(car.id);
                const canAfford = money >= car.price;
                const isUsing = isOwned && activeVehicle === 'car' && activeCarId === car.id;
                const isShaking = shakingItemId === car.id;

                return (
                  <div
                    key={car.id}
                    className={`border rounded-[4px] p-4 flex flex-col justify-between space-y-3 transition-all ${
                      isShaking ? 'animate-shake ring-1 ring-white/30' : ''
                    } ${
                      isUsing
                        ? 'border-[#0078d4] bg-[#0078d4]/10 shadow-[0_0_15px_rgba(0,120,212,0.15)]'
                        : 'bg-white/5 hover:bg-white/10 backdrop-blur-sm border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/40 inline-block shrink-0"
                              style={{ backgroundColor: car.color }}
                            />
                            <h3 className="text-sm font-semibold text-[#f3f3f3]">{car.name}</h3>
                          </div>
                          <span className="text-[11px] font-mono text-[#60cdff] uppercase block mt-1">
                            Top Speed: {car.maxSpeed} MPH · Handling: {car.handling}x
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded border shrink-0 bg-[#222222] border-[#383838] text-white">
                          {car.price === 0 ? 'FREE' : isOwned ? 'OWNED' : `$${car.price.toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#383838]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(car.id, car.name, car, 'cars');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-white/5 hover:bg-white/10 text-[#cccccc] hover:text-white border border-white/10 text-xs transition-all cursor-pointer"
                      >
                        <Car className="w-3.5 h-3.5 text-[#60cdff]" />
                        Preview
                      </button>
                      <div className="flex items-center gap-2">
                        {isOwned ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundFX.playCarEngineStart();
                              spawnCar?.(car);
                              onClose();
                            }}
                            className={`px-4 py-1.5 rounded-[4px] border text-white font-semibold text-xs transition-all cursor-pointer ${
                              isUsing
                                ? 'bg-[#0078d4] border-white/30 ring-1 ring-[#60cdff]/60'
                                : 'bg-[#0078d4]/80 hover:bg-[#0078d4] border-white/10'
                            }`}
                          >
                            {isUsing ? 'Driving Now' : 'Spawn Car'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canAfford) {
                                onBuyItem(car.price, car.name, car.id, 'cars');
                              } else {
                                triggerShake(car.id);
                              }
                            }}
                            className={`px-4 py-1.5 rounded-[4px] font-semibold text-xs transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-[#0078d4] hover:bg-[#106ebe] text-white shadow-sm'
                                : 'bg-[#262626] border border-[#383838] text-[#888888] hover:border-[#505050]'
                            }`}
                          >
                            Buy for ${car.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. MOTORCYCLE DEALERSHIP */}
          {shopType === 'motorcycles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {MOTORCYCLES_CATALOG.map((moto) => {
                const isOwned = moto.price === 0 || ownedMotorcycleIds.includes(moto.id);
                const canAfford = money >= moto.price;
                const isUsing = isOwned && activeVehicle === 'motorcycle' && activeMotorcycleId === moto.id;
                const isShaking = shakingItemId === moto.id;

                return (
                  <div
                    key={moto.id}
                    className={`rounded-[4px] p-4 flex flex-col justify-between space-y-3 transition-all ${
                      isShaking ? 'animate-shake ring-1 ring-white/30' : ''
                    } ${
                      isUsing
                        ? 'border-[#0078d4] bg-[#0078d4]/10 border shadow-[0_0_15px_rgba(0,120,212,0.15)]'
                        : 'bg-[#2b2b2b] hover:bg-[#323232] border border-[#3d3d3d]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/40 inline-block shrink-0"
                              style={{ backgroundColor: moto.color }}
                            />
                            <h3 className="text-sm font-semibold text-[#f3f3f3]">{moto.name}</h3>
                          </div>
                          <span className="text-[11px] font-mono text-[#60cdff] uppercase block mt-1">
                            Top Speed: {moto.maxSpeed} MPH · Lean Agility: {moto.handling}x
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded border shrink-0 bg-[#222222] border-[#383838] text-white">
                          {moto.price === 0 ? 'FREE' : isOwned ? 'OWNED' : `$${moto.price.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#383838]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(moto.id, moto.name, moto, 'motorcycles');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white border border-[#3d3d3d] text-xs transition-colors cursor-pointer"
                      >
                        <Bike className="w-3.5 h-3.5 text-[#60cdff]" />
                        Preview
                      </button>
                      <div className="flex items-center gap-2">
                        {isOwned ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundFX.playCarEngineStart();
                              spawnMoto?.(moto);
                              onClose();
                            }}
                            className={`px-4 py-1.5 rounded-[4px] border font-semibold text-xs transition-colors cursor-pointer ${
                              isUsing
                                ? 'bg-[#0078d4] border-white/30 text-white ring-1 ring-[#60cdff]/60'
                                : 'bg-[#0078d4] hover:bg-[#106ebe] text-white border-transparent'
                            }`}
                          >
                            {isUsing ? 'Riding Now' : 'Ride Motorcycle'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canAfford) {
                                onBuyItem(moto.price, moto.name, moto.id, 'motorcycles');
                              } else {
                                triggerShake(moto.id);
                              }
                            }}
                            className={`px-4 py-1.5 rounded-[4px] font-semibold text-xs transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-[#0078d4] hover:bg-[#106ebe] text-white shadow-sm'
                                : 'bg-[#262626] border border-[#383838] text-[#888888] hover:border-[#505050]'
                            }`}
                          >
                            Buy for ${moto.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. HELICOPTER DEALERSHIP */}
          {shopType === 'helicopters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {HELICOPTERS_CATALOG.map((heli, idx) => {
                const isOwned = heli.price === 0 || ownedHeliIds.includes(heli.id);
                const canAfford = money >= heli.price;
                const isArmedHeli = idx >= HELICOPTERS_CATALOG.length - 2;
                const isUsing = isOwned && activeVehicle === 'helicopter' && activeHeliId === heli.id;
                const isShaking = shakingItemId === heli.id;

                return (
                  <div
                    key={heli.id}
                    className={`rounded-[4px] p-4 flex flex-col justify-between space-y-3 transition-all ${
                      isShaking ? 'animate-shake ring-1 ring-white/30' : ''
                    } ${
                      isUsing
                        ? 'border-[#0078d4] bg-[#0078d4]/10 border shadow-[0_0_15px_rgba(0,120,212,0.15)]'
                        : 'bg-[#2b2b2b] border border-[#3d3d3d]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-white">{heli.name}</h3>
                            {isArmedHeli && (
                              <span className="px-1.5 py-0.5 rounded-[3px] bg-red-600/30 border border-red-500/60 text-[10px] font-bold text-red-300 uppercase">
                                Rapid-Fire Guns + Rockets
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-[#60cdff] uppercase block mt-1">
                            Top Speed: {heli.maxSpeed} MPH · Climb: {heli.climbRate} m/s
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded border shrink-0 bg-[#222222] border-[#383838] text-white">
                          {heli.price === 0 ? 'FREE' : isOwned ? 'OWNED' : `$${heli.price.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#383838]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(heli.id, heli.name, heli, 'helicopters');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white border border-[#3d3d3d] text-xs transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#60cdff]" />
                        Preview
                      </button>
                      <div className="flex items-center gap-2">
                        {isOwned ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundFX.playCarEngineStart();
                              spawnHeli?.(heli);
                              onClose();
                            }}
                            className={`px-4 py-1.5 rounded-[4px] border font-semibold text-xs transition-colors cursor-pointer ${
                              isUsing
                                ? 'bg-[#0078d4] border-white/30 text-white ring-1 ring-[#60cdff]/60'
                                : 'bg-[#0078d4] hover:bg-[#106ebe] text-white border-transparent'
                            }`}
                          >
                            {isUsing ? 'Flying Now' : 'Spawn Helicopter'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canAfford) {
                                onBuyItem(heli.price, heli.name, heli.id, 'helicopters');
                              } else {
                                triggerShake(heli.id);
                              }
                            }}
                            className={`px-4 py-1.5 rounded-[4px] font-semibold text-xs transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-[#0078d4] hover:bg-[#106ebe] text-white shadow-sm'
                                : 'bg-[#262626] border border-[#383838] text-[#888888] hover:border-[#505050]'
                            }`}
                          >
                            Buy for ${heli.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. AIRPLANE DEALERSHIP */}
          {shopType === 'planes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {PLANES_CATALOG.map((plane, idx) => {
                const isOwned = plane.price === 0 || ownedPlaneIds.includes(plane.id);
                const canAfford = money >= plane.price;
                const isArmedPlane = idx >= PLANES_CATALOG.length - 2;
                const isMach3 = plane.id === 'plane-darkstar';
                const isUsing = isOwned && activeVehicle === 'plane' && activePlaneId === plane.id;
                const isShaking = shakingItemId === plane.id;

                return (
                  <div
                    key={plane.id}
                    className={`rounded-[4px] p-4 flex flex-col justify-between space-y-3 transition-all ${
                      isShaking ? 'animate-shake ring-1 ring-white/30' : ''
                    } ${
                      isUsing
                        ? 'border-[#0078d4] bg-[#0078d4]/10 border shadow-[0_0_15px_rgba(0,120,212,0.15)]'
                        : 'bg-[#2b2b2b] border border-[#3d3d3d]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/40 inline-block shrink-0"
                              style={{ backgroundColor: plane.color }}
                            />
                            <h3 className="text-sm font-semibold text-white">{plane.name}</h3>
                            {isArmedPlane && (
                              <span className="px-1.5 py-0.5 rounded-[3px] bg-red-600/30 border border-red-500/60 text-[10px] font-bold text-red-300 uppercase">
                                Rapid-Fire Guns + Rockets
                              </span>
                            )}
                            {isMach3 && (
                              <span className="px-1.5 py-0.5 rounded-[3px] bg-amber-500/30 border border-amber-400/60 text-[10px] font-bold text-amber-200 uppercase">
                                Mach 3 (2,300 MPH)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-[#60cdff] uppercase block mt-1">
                            Max Airspeed: {plane.maxSpeed} MPH · Thrust: {plane.acceleration}
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded border shrink-0 bg-[#222222] border-[#383838] text-white">
                          {plane.price === 0 ? 'FREE' : isOwned ? 'OWNED' : `$${plane.price.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#383838]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(plane.id, plane.name, plane, 'planes');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white border border-[#3d3d3d] text-xs transition-colors cursor-pointer"
                      >
                        <Plane className="w-3.5 h-3.5 text-[#60cdff]" />
                        Preview
                      </button>
                      <div className="flex items-center gap-2">
                        {isOwned ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              soundFX.playCarEngineStart();
                              spawnPlane?.(plane);
                              onClose();
                            }}
                            className={`px-4 py-1.5 rounded-[4px] border font-semibold text-xs transition-colors cursor-pointer ${
                              isUsing
                                ? 'bg-[#0078d4] border-white/30 text-white ring-1 ring-[#60cdff]/60'
                                : 'bg-[#0078d4] hover:bg-[#106ebe] text-white border-transparent'
                            }`}
                          >
                            {isUsing ? 'Piloting Now' : 'Spawn Airplane'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canAfford) {
                                onBuyItem(plane.price, plane.name, plane.id, 'planes');
                              } else {
                                triggerShake(plane.id);
                              }
                            }}
                            className={`px-4 py-1.5 rounded-[4px] font-semibold text-xs transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-[#0078d4] hover:bg-[#106ebe] text-white shadow-sm'
                                : 'bg-[#262626] border border-[#383838] text-[#888888] hover:border-[#505050]'
                            }`}
                          >
                            Buy for ${plane.price.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
