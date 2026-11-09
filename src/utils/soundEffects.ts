// Silent no-op sound controller (all sound effects disabled per user preference)
const noop = () => {};

export const soundFX = {
  muted: true,
  playCarEngineStart: noop,
  playCarHorn: noop,
  playPlaceObject: noop,
  playInteractChime: noop,
  playLowPolyExplosion: noop,
  playHelicopterThump: noop,
  playMinigunBurst: noop,
  playExplosion: noop,
  playPoliceSiren: noop,
  playSirenWail: noop,
  playSelect: noop,
  playApplause: noop,
};
