
export class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // Lazy initialization
  }

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3; // Master volume
      }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Background Music - Disabled for now
  // Can be re-enabled later by adding music files to /public/sounds/

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime, 0.1);
    }

    return this.isMuted;
  }

  public getMutedState() {
    return this.isMuted;
  }

  // Sound: "Pluck" / "Swish" when picking up seeds
  public playPickup() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Slide up pitch slightly
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    // Soft envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Sound: "Wood Tock" when dropping a seed
  public playDrop() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Short, percussive sine/triangle
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.1); // Pitch drop for thud effect

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Sound: "Chime/Chord" when capturing
  public playCapture() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Major triad chord
    const freqs = [523.25, 659.25, 783.99]; // C Major

    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = f;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05 + (i * 0.02));
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  // Sound: "Victory Fanfare"
  public playWin() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Arpeggio up
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];

    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      // Lowpass filter to make square wave less harsh
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;

      osc.frequency.value = f;

      const startTime = t + (i * 0.1);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  // Sound: "Seed Drop" - Realistic seed-in-PVC-bowl sound (higher pitch variety)
  public playSeedDrop(pitIndex: number) {
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const noiseGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Pitch varies by pit position for realism
    const basePitch = 180 + (pitIndex % 7) * 15;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(basePitch, t);
    osc.frequency.exponentialRampToValueAtTime(basePitch * 0.5, t + 0.08);

    // Brief noise burst for click/rattle
    noise.type = 'sawtooth';
    noise.frequency.value = 3000 + Math.random() * 1000;
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noiseGain.gain.setValueAtTime(0.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(noiseGain);
    gain.connect(this.masterGain!);
    noiseGain.connect(this.masterGain!);

    osc.start(t);
    osc.stop(t + 0.1);
    noise.start(t);
    noise.stop(t + 0.05);
  }

  // Sound: opponent move notification
  public playOpponentMove() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(520, t + 0.08);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Sound: "Chat Notification" - Two-tone ping
  public playChatNotification() {
    if (this.isMuted || !this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Two-tone notification: 800Hz -> 1000Hz
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.linearRampToValueAtTime(1000, t + 0.1);

    // Soft and short envelope (0.2s total)
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }
}

export const audioService = new AudioService();
