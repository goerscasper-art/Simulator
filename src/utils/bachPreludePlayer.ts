// Real acoustic piano audio player for J.S. Bach - Prelude No. 1 in C Major (BWV 846)
// Uses authentic studio concert grand piano recording (Kimiko Ishizaka, Open Goldberg / Well-Tempered Clavier CC0).
// Enhanced with Web Audio GainNode + DynamicsCompressor for high-fidelity, high-volume amplification ("way louder").

class BachPreludePlayer {
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isSourceConnected: boolean = false;
  private isPlaying: boolean = false;
  private volumeMultiplier: number = 3.2; // High-gain amplification to make song WAY louder

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio() {
    if (this.audio) return;
    try {
      this.audio = new Audio('/audio/bach-prelude.mp3');
      this.audio.loop = true;
      this.audio.volume = 1.0;
      this.audio.preload = 'auto';

      this.audio.addEventListener('ended', () => {
        if (this.isPlaying && this.audio) {
          this.audio.currentTime = 0;
          this.audio.play().catch(() => {});
        }
      });
    } catch (err) {
      console.warn('Could not initialize Bach prelude audio element:', err);
    }
  }

  private setupWebAudio() {
    if (this.isSourceConnected || !this.audio || typeof window === 'undefined') return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      const ctx = this.audioCtx;
      const source = ctx.createMediaElementSource(this.audio);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.volumeMultiplier, ctx.currentTime);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, ctx.currentTime);
      compressor.knee.setValueAtTime(24, ctx.currentTime);
      compressor.ratio.setValueAtTime(8, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.2, ctx.currentTime);

      source.connect(gain);
      gain.connect(compressor);
      compressor.connect(ctx.destination);

      this.gainNode = gain;
      this.compressor = compressor;
      this.isSourceConnected = true;
    } catch (err) {
      console.warn('Could not setup Web Audio amplification for Bach prelude:', err);
    }
  }

  public async start() {
    this.isPlaying = true;
    this.initAudio();
    this.setupWebAudio();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch {}
    }

    if (this.audio) {
      try {
        this.audio.volume = 1.0;
        if (this.gainNode && this.audioCtx) {
          this.gainNode.gain.setValueAtTime(this.volumeMultiplier, this.audioCtx.currentTime);
        }
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch {
        // Unlock on user interaction if browser autoplay blocked
        const unlock = async () => {
          if (this.isPlaying && this.audio) {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
              try {
                await this.audioCtx.resume();
              } catch {}
            }
            this.audio.play().catch(() => {});
          }
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
          window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { once: true });
      }
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch {}
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(clamped * this.volumeMultiplier, this.audioCtx.currentTime);
    }
    if (this.audio) {
      this.audio.volume = clamped;
    }
  }
}

export const bachPreludePlayer = new BachPreludePlayer();
