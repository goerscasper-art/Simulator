import * as THREE from 'three';

export type WeatherType = 'sunny' | 'rainy' | 'snowy';

export interface WeatherStatusInfo {
  current: WeatherType;
  target: WeatherType;
  inTransition: boolean;
  transitionProgress: number; // 0.0 to 1.0
  timeLeftInPhase: number;    // seconds
  phaseDuration: number;      // total seconds for current phase
  autoCycleEnabled: boolean;
  temperatureF: number;
  conditionLabel: string;
  rainWeight: number;
  snowWeight: number;
  sunnyWeight: number;
}

/**
 * Procedural rain streak particle texture
 */
function createRainStreakTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0.0, 'rgba(210, 230, 255, 0.0)');
  grad.addColorStop(0.3, 'rgba(215, 235, 255, 0.25)');
  grad.addColorStop(0.75, 'rgba(230, 245, 255, 0.7)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.95)');

  ctx.fillStyle = grad;
  ctx.fillRect(6, 0, 4, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Procedural soft radial snowflake particle texture
 */
function createSnowflakeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Soft glowing outer circle
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(240, 250, 255, 0.85)');
  grad.addColorStop(0.6, 'rgba(215, 238, 255, 0.35)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  // Subtle 6-point snowflake crystal glint
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(32 - Math.cos(angle) * 16, 32 - Math.sin(angle) * 16);
    ctx.lineTo(32 + Math.cos(angle) * 16, 32 + Math.sin(angle) * 16);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class WeatherSystem {
  public currentWeather: WeatherType = 'sunny';
  public targetWeather: WeatherType = 'sunny';
  public inTransition: boolean = false;
  public transitionProgress: number = 0; // 0 to 1
  public phaseTimer: number = 0;
  public phaseDuration: number = 75; // Average ~75s (65s to 90s)
  public autoCycleEnabled: boolean = true;

  // Weather weights (0.0 to 1.0)
  public sunnyWeight: number = 1.0;
  public rainyWeight: number = 0.0;
  public snowyWeight: number = 0.0;

  // Particle systems
  public weatherGroup: THREE.Group;
  private rainPoints: THREE.Points;
  private rainGeom: THREE.BufferGeometry;
  private rainPositions: Float32Array;
  private rainSpeeds: Float32Array;
  private rainMat: THREE.PointsMaterial;
  private rainCount: number = 3600;

  private snowPoints: THREE.Points;
  private snowGeom: THREE.BufferGeometry;
  private snowPositions: Float32Array;
  private snowSpeeds: Float32Array;
  private snowDriftPhases: Float32Array;
  private snowMat: THREE.PointsMaterial;
  private snowCount: number = 2800;

  // Lightning effect during rain
  public lightningTimer: number = 22.0;
  public lightningFlashIntensity: number = 0.0;

  // Performance Mode (Chromebooks & low-end GPUs)
  public isPerfMode: boolean = false;

  // Internal time accumulator for particle animation
  private elapsedSeconds: number = 0;

  // Bounds for particle volume around camera/focus
  private readonly VOLUME_RADIUS_XZ = 72;
  private readonly VOLUME_HEIGHT_TOP = 46;
  private readonly VOLUME_HEIGHT_BOTTOM = -3;

  constructor() {
    this.weatherGroup = new THREE.Group();
    this.weatherGroup.name = 'WeatherSystemGroup';

    // 1. Setup Rain Particle System
    const rainPositions = new Float32Array(this.rainCount * 3);
    const rainSpeeds = new Float32Array(this.rainCount);
    for (let i = 0; i < this.rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * this.VOLUME_RADIUS_XZ * 2;
      rainPositions[i * 3 + 1] = Math.random() * this.VOLUME_HEIGHT_TOP;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * this.VOLUME_RADIUS_XZ * 2;
      rainSpeeds[i] = 34.0 + Math.random() * 12.0; // 34-46 m/s downwards
    }
    this.rainPositions = rainPositions;
    this.rainSpeeds = rainSpeeds;

    this.rainGeom = new THREE.BufferGeometry();
    this.rainGeom.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    const rainTex = createRainStreakTexture();
    this.rainMat = new THREE.PointsMaterial({
      map: rainTex,
      size: 4.8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      color: 0xcde0f7,
    });
    this.rainPoints = new THREE.Points(this.rainGeom, this.rainMat);
    this.rainPoints.frustumCulled = false;
    this.weatherGroup.add(this.rainPoints);

    // 2. Setup Snow Particle System
    const snowPositions = new Float32Array(this.snowCount * 3);
    const snowSpeeds = new Float32Array(this.snowCount);
    const snowDriftPhases = new Float32Array(this.snowCount);
    for (let i = 0; i < this.snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * this.VOLUME_RADIUS_XZ * 2;
      snowPositions[i * 3 + 1] = Math.random() * this.VOLUME_HEIGHT_TOP;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * this.VOLUME_RADIUS_XZ * 2;
      snowSpeeds[i] = 2.4 + Math.random() * 2.2; // 2.4-4.6 m/s gentle flutter
      snowDriftPhases[i] = Math.random() * Math.PI * 2;
    }
    this.snowPositions = snowPositions;
    this.snowSpeeds = snowSpeeds;
    this.snowDriftPhases = snowDriftPhases;

    this.snowGeom = new THREE.BufferGeometry();
    this.snowGeom.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));

    const snowTex = createSnowflakeTexture();
    this.snowMat = new THREE.PointsMaterial({
      map: snowTex,
      size: 3.8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      color: 0xffffff,
    });
    this.snowPoints = new THREE.Points(this.snowGeom, this.snowMat);
    this.snowPoints.frustumCulled = false;
    this.weatherGroup.add(this.snowPoints);

    // Set initial phase duration
    this.phaseDuration = this.getRandomPhaseDuration();
  }

  /**
   * Returns a random phase duration between 65 and 90 seconds
   * ("Do not rotate too fast, nor too slow")
   */
  private getRandomPhaseDuration(): number {
    return 65 + Math.random() * 25; // 65s to 90s
  }

  /**
   * Picks next random weather type excluding the current one
   */
  private pickNextRandomWeather(): WeatherType {
    const pool: WeatherType[] = ['sunny', 'rainy', 'snowy'];
    const candidates = pool.filter((w) => w !== this.currentWeather);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Starts a smooth transition to a target weather type
   */
  public transitionTo(target: WeatherType) {
    if (this.currentWeather === target && !this.inTransition) return;
    this.targetWeather = target;
    this.inTransition = true;
    this.transitionProgress = 0;
  }

  /**
   * Instantly force a weather type without waiting
   */
  public setWeatherImmediate(type: WeatherType) {
    this.currentWeather = type;
    this.targetWeather = type;
    this.inTransition = false;
    this.transitionProgress = 0;
    this.phaseTimer = 0;
    this.phaseDuration = this.getRandomPhaseDuration();
    this.sunnyWeight = type === 'sunny' ? 1.0 : 0.0;
    this.rainyWeight = type === 'rainy' ? 1.0 : 0.0;
    this.snowyWeight = type === 'snowy' ? 1.0 : 0.0;
  }

  /**
   * Cycle to next weather immediately with smooth transition
   */
  public cycleNext() {
    const next = this.pickNextRandomWeather();
    this.transitionTo(next);
  }

  /**
   * Toggle auto cycling on/off
   */
  public toggleAutoCycle(): boolean {
    this.autoCycleEnabled = !this.autoCycleEnabled;
    return this.autoCycleEnabled;
  }

  /**
   * Configure performance mode (lowers particle counts for Chromebooks & low-tier GPUs)
   */
  public setPerformanceMode(isPerf: boolean) {
    this.isPerfMode = isPerf;
    const rCount = isPerf ? 850 : this.rainCount;
    const sCount = isPerf ? 650 : this.snowCount;
    this.rainGeom.setDrawRange(0, rCount);
    this.snowGeom.setDrawRange(0, sCount);
  }

  /**
   * Update weather simulation, auto rotation, and particle positions
   */
  public update(dt: number, focusX: number, focusY: number, focusZ: number) {
    this.elapsedSeconds += dt;

    // Transition duration = 9 seconds for buttery smooth cross-fade
    const TRANSITION_DURATION = 9.0;

    // Handle Auto-Cycle Timer & Smooth Transition
    if (this.autoCycleEnabled) {
      if (this.inTransition) {
        this.transitionProgress += dt / TRANSITION_DURATION;
        if (this.transitionProgress >= 1.0) {
          this.transitionProgress = 1.0;
          this.currentWeather = this.targetWeather;
          this.inTransition = false;
          this.phaseTimer = 0;
          this.phaseDuration = this.getRandomPhaseDuration();
        }
      } else {
        this.phaseTimer += dt;
        if (this.phaseTimer >= this.phaseDuration) {
          // Time to rotate to the next weather state!
          const next = this.pickNextRandomWeather();
          this.transitionTo(next);
        }
      }
    } else if (this.inTransition) {
      // Manual transition in progress
      this.transitionProgress += dt / TRANSITION_DURATION;
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
        this.currentWeather = this.targetWeather;
        this.inTransition = false;
        this.phaseTimer = 0;
        this.phaseDuration = this.getRandomPhaseDuration();
      }
    }

    // Compute weather weights using smoothstep (Hermite) interpolation
    const getTargetWeights = (type: WeatherType) => ({
      sunny: type === 'sunny' ? 1.0 : 0.0,
      rainy: type === 'rainy' ? 1.0 : 0.0,
      snowy: type === 'snowy' ? 1.0 : 0.0,
    });

    if (!this.inTransition) {
      const w = getTargetWeights(this.currentWeather);
      this.sunnyWeight = w.sunny;
      this.rainyWeight = w.rainy;
      this.snowyWeight = w.snowy;
    } else {
      const curW = getTargetWeights(this.currentWeather);
      const tarW = getTargetWeights(this.targetWeather);
      // Smoothstep interpolation curve: 3*p^2 - 2*p^3
      const p = Math.min(1.0, Math.max(0.0, this.transitionProgress));
      const s = p * p * (3 - 2 * p);

      this.sunnyWeight = THREE.MathUtils.lerp(curW.sunny, tarW.sunny, s);
      this.rainyWeight = THREE.MathUtils.lerp(curW.rainy, tarW.rainy, s);
      this.snowyWeight = THREE.MathUtils.lerp(curW.snowy, tarW.snowy, s);
    }

    // Set particle system opacities based on weights
    this.rainMat.opacity = this.rainyWeight * 0.72;
    this.rainPoints.visible = this.rainyWeight > 0.005;

    this.snowMat.opacity = this.snowyWeight * 0.88;
    this.snowPoints.visible = this.snowyWeight > 0.005;

    // Lightning Flash Logic during rainy weather
    if (this.rainyWeight > 0.45) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningFlashIntensity = 0.95;
        this.lightningTimer = 18.0 + Math.random() * 16.0; // Next flash in 18-34s
      }
    }
    if (this.lightningFlashIntensity > 0) {
      this.lightningFlashIntensity = Math.max(0, this.lightningFlashIntensity - dt * 5.2);
    }

    // Update Rain Particle Positions (Wrap dynamically around focus coordinates)
    if (this.rainPoints.visible) {
      const rPos = this.rainPositions;
      const rSpd = this.rainSpeeds;
      const rLen = this.isPerfMode ? 850 : this.rainCount;
      const windX = -4.2 * dt; // Slight wind slant

      for (let i = 0; i < rLen; i++) {
        const idx = i * 3;
        rPos[idx] += windX;
        rPos[idx + 1] -= rSpd[i] * dt;

        // Check bounds relative to focus position
        const dx = rPos[idx] - focusX;
        const dz = rPos[idx + 2] - focusZ;
        const groundThreshold = Math.max(0.0, focusY + this.VOLUME_HEIGHT_BOTTOM);

        if (
          rPos[idx + 1] < groundThreshold ||
          Math.abs(dx) > this.VOLUME_RADIUS_XZ ||
          Math.abs(dz) > this.VOLUME_RADIUS_XZ
        ) {
          rPos[idx] = focusX + (Math.random() - 0.5) * this.VOLUME_RADIUS_XZ * 2;
          rPos[idx + 1] = focusY + this.VOLUME_HEIGHT_TOP - Math.random() * 6.0;
          rPos[idx + 2] = focusZ + (Math.random() - 0.5) * this.VOLUME_RADIUS_XZ * 2;
        }
      }
      this.rainGeom.attributes.position.needsUpdate = true;
    }

    // Update Snow Particle Positions (Wrap dynamically around focus coordinates with sway)
    if (this.snowPoints.visible) {
      const sPos = this.snowPositions;
      const sSpd = this.snowSpeeds;
      const sDrift = this.snowDriftPhases;
      const sLen = this.isPerfMode ? 650 : this.snowCount;
      const time = this.elapsedSeconds;

      for (let i = 0; i < sLen; i++) {
        const idx = i * 3;
        const phase = sDrift[i];
        // Organic sinusoidal fluttering drift
        const swayX = Math.sin(time * 1.8 + phase) * 1.4 * dt - 0.8 * dt;
        const swayZ = Math.cos(time * 1.3 + phase) * 1.1 * dt;

        sPos[idx] += swayX;
        sPos[idx + 1] -= sSpd[i] * dt;
        sPos[idx + 2] += swayZ;

        const dx = sPos[idx] - focusX;
        const dz = sPos[idx + 2] - focusZ;
        const groundThreshold = Math.max(0.0, focusY + this.VOLUME_HEIGHT_BOTTOM);

        if (
          sPos[idx + 1] < groundThreshold ||
          Math.abs(dx) > this.VOLUME_RADIUS_XZ ||
          Math.abs(dz) > this.VOLUME_RADIUS_XZ
        ) {
          sPos[idx] = focusX + (Math.random() - 0.5) * this.VOLUME_RADIUS_XZ * 2;
          sPos[idx + 1] = focusY + this.VOLUME_HEIGHT_TOP - Math.random() * 8.0;
          sPos[idx + 2] = focusZ + (Math.random() - 0.5) * this.VOLUME_RADIUS_XZ * 2;
        }
      }
      this.snowGeom.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Returns complete metadata for HUD and Menu displays
   */
  public getStatusInfo(): WeatherStatusInfo {
    const timeLeft = this.inTransition
      ? Math.max(0, (1.0 - this.transitionProgress) * 9.0)
      : Math.max(0, this.phaseDuration - this.phaseTimer);

    let temperatureF = 74;
    let conditionLabel = 'Sunny & Clear';

    if (this.currentWeather === 'sunny') {
      temperatureF = 74;
      conditionLabel = this.inTransition
        ? `Clearing to ${this.targetWeather === 'rainy' ? 'Rain' : 'Snow'}...`
        : 'Sunny & Clear';
    } else if (this.currentWeather === 'rainy') {
      temperatureF = 54;
      conditionLabel = this.inTransition
        ? `Rain tapering to ${this.targetWeather === 'sunny' ? 'Sunny' : 'Snow'}...`
        : 'Steady Rain';
    } else if (this.currentWeather === 'snowy') {
      temperatureF = 28;
      conditionLabel = this.inTransition
        ? `Snow shifting to ${this.targetWeather === 'sunny' ? 'Sunny' : 'Rain'}...`
        : 'Gentle Snowfall';
    }

    return {
      current: this.currentWeather,
      target: this.targetWeather,
      inTransition: this.inTransition,
      transitionProgress: this.transitionProgress,
      timeLeftInPhase: Math.round(timeLeft),
      phaseDuration: Math.round(this.phaseDuration),
      autoCycleEnabled: this.autoCycleEnabled,
      temperatureF,
      conditionLabel,
      rainWeight: this.rainyWeight,
      snowWeight: this.snowyWeight,
      sunnyWeight: this.sunnyWeight,
    };
  }

  public dispose() {
    this.rainGeom.dispose();
    this.rainMat.dispose();
    this.snowGeom.dispose();
    this.snowMat.dispose();
  }
}
