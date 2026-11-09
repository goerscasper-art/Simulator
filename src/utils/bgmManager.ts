// ============================================================================
// BACKGROUND MUSIC (BGM) MANAGER & MP3 FILE SLOTS
// ============================================================================

export const BGM_TRACKS = {
  TITLE: '/assets/aistudio/Intro-_AudioTrimmer.com__b727ff17.mp3',
  CITY: '/assets/aistudio/Katsuhisa_Hattori_-_Futaridake_No_Umi___The_Horizon_of_Happiness__1980__d28f3bee.mp3',
  BATTLE: '/assets/aistudio/Ratatat_-_Seventeen_Years-_AudioTrimmer.com__54ae4250.mp3',
  PLATFORMER: '/assets/aistudio/Todd_Terje_-_Inspector_Norse-_AudioTrimmer.com__9b01cdb4.mp3',
};

export type BGMMode = 'title' | 'city' | 'battle' | 'platformer';

class BGMManager {
  private audioA: HTMLAudioElement | null = null;
  private audioB: HTMLAudioElement | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private currentMode: BGMMode | null = null;
  private isMutedState: boolean = false;
  private baseVolume: number = 0.5;
  private isUnlocked: boolean = false;
  private fadeInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
      this.attachUnlockListeners();
    }
  }

  private initAudio() {
    this.audioA = new Audio();
    this.audioA.loop = true;
    this.audioA.volume = 0;
    this.audioA.crossOrigin = 'anonymous';
    // Preload title track immediately to minimize startup delay
    this.audioA.src = BGM_TRACKS.TITLE;
    this.audioA.load();

    this.audioB = new Audio();
    this.audioB.loop = true;
    this.audioB.volume = 0;
    this.audioB.crossOrigin = 'anonymous';
  }

  private attachUnlockListeners() {
    const unlock = () => {
      this.isUnlocked = true;
      if (this.currentMode && !this.isMutedState) {
        this.playMode(this.currentMode);
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  public async playMode(mode: BGMMode) {
    if (this.currentMode === mode && this.activeAudio) return;
    this.currentMode = mode;
    if (this.isMutedState || !this.audioA || !this.audioB) return;

    const trackUrl = BGM_TRACKS[mode.toUpperCase() as keyof typeof BGM_TRACKS];
    
    // Determine which audio element to use for the new track
    const nextAudio = this.activeAudio === this.audioA ? this.audioB : this.audioA;
    const prevAudio = this.activeAudio;

    nextAudio.src = trackUrl;
    nextAudio.loop = true; // Ensure looping is set
    nextAudio.load();
    
    if (this.isUnlocked) {
      nextAudio.play().catch(e => console.warn('BGM play failed:', e));
      if (prevAudio) {
        this.crossfade(prevAudio, nextAudio);
      } else {
        // Instant start for the very first track (Title Screen)
        nextAudio.volume = this.baseVolume;
      }
      this.activeAudio = nextAudio;
    }
  }

  private crossfade(from: HTMLAudioElement | null, to: HTMLAudioElement) {
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    
    const duration = 1500; // 1.5 second crossfade
    const steps = 30;
    const interval = duration / steps;
    let currentStep = 0;

    this.fadeInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      // Exponential-like fade for smoother perception
      const easeIn = progress * progress;
      const easeOut = 1 - easeIn;

      to.volume = easeIn * this.baseVolume;
      if (from) {
        from.volume = Math.max(0, (1 - progress) * this.baseVolume);
      }

      if (currentStep >= steps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        if (from) {
          from.pause();
          from.currentTime = 0;
        }
        to.volume = this.baseVolume;
      }
    }, interval);
  }

  public stopAll() {
    this.currentMode = null;
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    [this.audioA, this.audioB].forEach(a => {
      if (a) {
        a.pause();
        a.currentTime = 0;
        a.volume = 0;
      }
    });
    this.activeAudio = null;
  }

  public stopAbruptly() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    [this.audioA, this.audioB].forEach(a => {
      if (a) {
        a.pause();
        a.currentTime = 0;
        a.volume = 0;
      }
    });
    this.activeAudio = null;
  }

  public restartCurrentModeAbruptly(mode?: BGMMode) {
    this.stopAbruptly();
    const targetMode = mode || this.currentMode;
    if (!targetMode || this.isMutedState) return;
    this.currentMode = targetMode;

    const trackUrl = BGM_TRACKS[targetMode.toUpperCase() as keyof typeof BGM_TRACKS];
    const audio = this.audioA || new Audio();
    audio.src = trackUrl;
    audio.loop = true;
    audio.currentTime = 0;
    audio.volume = this.baseVolume;
    this.activeAudio = audio;

    if (this.isUnlocked) {
      audio.play().catch(e => console.warn('BGM play failed:', e));
    }
  }

  public setMuted(muted: boolean) {
    this.isMutedState = muted;
    if (muted) {
      if (this.fadeInterval) clearInterval(this.fadeInterval);
      [this.audioA, this.audioB].forEach(a => a?.pause());
    } else if (this.currentMode) {
      const mode = this.currentMode;
      this.currentMode = null; // Reset to allow playMode to trigger
      this.playMode(mode);
    }
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public setVolume(vol: number) {
    this.baseVolume = Math.max(0, Math.min(1, vol));
    if (this.activeAudio) this.activeAudio.volume = this.baseVolume;
  }

  public getVolume(): number {
    return this.baseVolume;
  }
}

export const bgmManager = new BGMManager();
