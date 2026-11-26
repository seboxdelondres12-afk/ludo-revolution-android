// Centralized Web Audio API + Asset Audio Manager for Ludo Revolution.
// Android & iPhone safe: unlocks AudioContext on first user gesture, handles visibilitychange,
// prevents overlapping spam, and persists Music/SFX/Vibration preferences.

const PREFS_KEY = 'ludo_revolution_audio_prefs_v1';

const DEFAULT_PREFS = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.45,
  sfxVolume: 0.85,
  hapticsEnabled: true,
  pawnSpeed: 1.0,
};

export function loadAudioPrefs(config = {}) {
  let saved = {};
  try {
    const raw = window.localStorage?.getItem(PREFS_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    // ignore storage errors in sandboxed frames
  }
  return {
    musicEnabled: config.musicEnabled ?? saved.musicEnabled ?? DEFAULT_PREFS.musicEnabled,
    sfxEnabled: config.sfxEnabled ?? saved.sfxEnabled ?? DEFAULT_PREFS.sfxEnabled,
    musicVolume: config.musicVolume ?? saved.musicVolume ?? DEFAULT_PREFS.musicVolume,
    sfxVolume: config.sfxVolume ?? saved.sfxVolume ?? DEFAULT_PREFS.sfxVolume,
    hapticsEnabled: config.hapticsEnabled ?? saved.hapticsEnabled ?? DEFAULT_PREFS.hapticsEnabled,
    pawnSpeed: saved.pawnSpeed ?? config.animationSpeed ?? DEFAULT_PREFS.pawnSpeed,
  };
}

export function saveAudioPrefs(prefs) {
  try {
    window.localStorage?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export class AudioManager {
  constructor(prefs = DEFAULT_PREFS) {
    this.prefs = { ...DEFAULT_PREFS, ...prefs };
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.buffers = new Map();
    this.loadingPromises = new Map();
    this.currentMusicSource = null;
    this.currentMusicId = null;
    this.lastPlayedAt = new Map();
    this.disposed = false;
    this.unlocked = false;

    this._onVisibilityChange = () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.ctx.suspend().catch(() => {});
      } else if (!this.disposed && this.unlocked) {
        this.ctx.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  ensureContext() {
    if (this.disposed) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    return this.ctx;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.unlocked = true;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    // Preload generated OGG assets once unlocked
    this.preloadAssets(['music_gameplay', 'music_victory', 'sfx_dice_roll', 'sfx_capture', 'sfx_capture_laugh', 'sfx_finish']);
    if (this.currentMusicId && !this.currentMusicSource && this.prefs.musicEnabled) {
      this._startMusicBuffer(this.currentMusicId);
    }
  }

  applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(
      this.prefs.musicEnabled ? Math.max(0, Math.min(1, this.prefs.musicVolume)) : 0,
      now,
      0.03
    );
    this.sfxGain.gain.setTargetAtTime(
      this.prefs.sfxEnabled ? Math.max(0, Math.min(1, this.prefs.sfxVolume)) : 0,
      now,
      0.02
    );
  }

  updatePrefs(partial) {
    const prevMusic = this.prefs.musicEnabled;
    this.prefs = { ...this.prefs, ...partial };
    saveAudioPrefs(this.prefs);
    this.applyVolumes();

    if (prevMusic && !this.prefs.musicEnabled) {
      this.stopMusic(false);
    } else if (!prevMusic && this.prefs.musicEnabled && this.currentMusicId && this.unlocked) {
      this._startMusicBuffer(this.currentMusicId);
    }
  }

  haptic(kind = 'light') {
    if (!this.prefs.hapticsEnabled) return;
    window.lib?.haptics?.play?.(kind);
  }

  preloadAssets(assetIds) {
    for (const id of assetIds) {
      this._loadAsset(id);
    }
  }

  async _loadAsset(assetId) {
    if (this.buffers.has(assetId)) return this.buffers.get(assetId);
    if (this.loadingPromises.has(assetId)) return this.loadingPromises.get(assetId);

    const asset = window.lib?.getAsset?.(assetId);
    if (!asset?.url) return null;

    const ctx = this.ensureContext();
    if (!ctx) return null;

    const promise = fetch(asset.url)
      .then((res) => res.arrayBuffer())
      .then((arr) => ctx.decodeAudioData(arr))
      .then((decoded) => {
        this.buffers.set(assetId, decoded);
        return decoded;
      })
      .catch(() => null);

    this.loadingPromises.set(assetId, promise);
    return promise;
  }

  _canPlay(key, minGapMs = 45) {
    if (this.disposed || !this.prefs.sfxEnabled) return false;
    const now = performance.now();
    const prev = this.lastPlayedAt.get(key) || 0;
    if (now - prev < minGapMs) return false;
    this.lastPlayedAt.set(key, now);
    return true;
  }

  _playBuffer(assetId, gain = 1.0, rate = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.prefs.sfxEnabled) return false;
    const buffer = this.buffers.get(assetId);
    if (!buffer) return false;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.sfxGain);
    src.start(0);
    return true;
  }

  _tone(freq, duration, type = 'sine', gainVal = 0.25, delay = 0, slideToFreq = null) {
    const ctx = this.ensureContext();
    if (!ctx || !this.prefs.sfxEnabled) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideToFreq != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideToFreq), t0 + duration);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gainVal, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // --- MUSIC ---
  startMusic(trackId = 'music_gameplay') {
    this.currentMusicId = trackId;
    if (!this.prefs.musicEnabled || !this.unlocked || this.disposed) return;
    this._startMusicBuffer(trackId);
  }

  async _startMusicBuffer(trackId) {
    const buffer = await this._loadAsset(trackId);
    if (!buffer || this.disposed || !this.prefs.musicEnabled || this.currentMusicId !== trackId) return;

    this.stopMusic(false);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = trackId !== 'music_victory';
    src.connect(this.musicGain);
    src.start(0);
    this.currentMusicSource = src;
  }

  stopMusic(clearId = true) {
    if (clearId) this.currentMusicId = null;
    if (this.currentMusicSource) {
      try {
        this.currentMusicSource.stop();
      } catch {
        // already stopped
      }
      this.currentMusicSource.disconnect();
      this.currentMusicSource = null;
    }
  }

  // --- DICE SOUNDS ---
  playDiceRoll() {
    if (!this._canPlay('diceRoll', 120)) return;
    this.haptic('light');
    if (!this._playBuffer('sfx_dice_roll', 0.9)) {
      // Crisp procedural rattle fallback
      for (let i = 0; i < 4; i++) {
        this._tone(240 + i * 55, 0.045, 'triangle', 0.16, i * 0.055, 160);
      }
    }
  }

  playDiceResult(value) {
    if (!this._canPlay('diceResult', 60)) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const base = scale[(value - 1) % 6] || 329.63;
    if (value === 6) {
      // Special bright 6 chord
      this._tone(523.25, 0.14, 'triangle', 0.22, 0);
      this._tone(659.25, 0.16, 'triangle', 0.22, 0.05);
      this._tone(783.99, 0.22, 'sine', 0.26, 0.1);
    } else {
      this._tone(base, 0.1, 'triangle', 0.18, 0);
    }
  }

  playDoubleSix() {
    if (!this._canPlay('doubleSix', 150)) return;
    this.haptic('medium');
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => this._tone(n, 0.18, 'triangle', 0.24, i * 0.055));
  }

  playThreeSixesBlocked() {
    if (!this._canPlay('threeSixes', 200)) return;
    this.haptic('heavy');
    this._tone(260, 0.14, 'sawtooth', 0.16, 0, 170);
    this._tone(180, 0.24, 'sawtooth', 0.18, 0.12, 110);
  }

  // --- PAWN & SPECIAL RULE SOUNDS ---
  playPawnStep(stepIndex = 0) {
    if (!this._canPlay('step', 45)) return;
    this.haptic('light');
    const freq = 340 + Math.min(stepIndex, 6) * 28;
    this._tone(freq, 0.065, 'sine', 0.18, 0, freq * 1.18);
  }

  playPawnExit() {
    if (!this._canPlay('exit', 80)) return;
    this.haptic('medium');
    this._tone(330, 0.09, 'triangle', 0.2, 0, 520);
    this._tone(587.33, 0.14, 'sine', 0.22, 0.06);
  }

  playPawnCapture(isBackward = false) {
    if (!this._canPlay('capture', 120)) return;
    this.haptic('heavy');
    if (isBackward) {
      this._tone(620, 0.14, 'sawtooth', 0.14, 0, 220);
    }
    if (!this._playBuffer('sfx_capture', 0.85)) {
      this._tone(180, 0.18, 'sine', 0.3, 0.02, 75);
      this._tone(740, 0.12, 'triangle', 0.22, 0.04, 420);
    }
    // Cheeky mocking laugh right after the capture impact
    if (!this._playBuffer('sfx_capture_laugh', 0.95)) {
      [540, 480, 420, 360].forEach((f, i) => {
        this._tone(f, 0.09, 'triangle', 0.2, 0.08 + i * 0.11, f * 0.85);
      });
    }
  }

  playPawnRecovered() {
    if (!this._canPlay('recovered', 120)) return;
    this._tone(440, 0.12, 'sine', 0.2, 0);
    this._tone(554.37, 0.14, 'sine', 0.22, 0.07);
    this._tone(659.25, 0.2, 'triangle', 0.24, 0.14);
  }

  playSafeSpace() {
    if (!this._canPlay('safe', 120)) return;
    this._tone(783.99, 0.12, 'sine', 0.14, 0);
    this._tone(1046.5, 0.18, 'sine', 0.16, 0.06);
  }

  playFinalLaneEnter() {
    if (!this._canPlay('finalLane', 150)) return;
    this._tone(493.88, 0.1, 'triangle', 0.18, 0);
    this._tone(659.25, 0.14, 'triangle', 0.2, 0.07);
    this._tone(783.99, 0.2, 'sine', 0.22, 0.14);
  }

  playPawnFinish() {
    if (!this._canPlay('finish', 180)) return;
    this.haptic('heavy');
    if (!this._playBuffer('sfx_finish', 0.95)) {
      [523.25, 659.25, 783.99, 1046.5].forEach((n, i) =>
        this._tone(n, 0.22, 'triangle', 0.24, i * 0.06)
      );
    }
  }

  // --- UI & TURN SOUNDS ---
  playUiClick() {
    if (!this._canPlay('click', 40)) return;
    this._tone(600, 0.04, 'sine', 0.12, 0, 420);
  }

  playTurnStart() {
    if (!this._canPlay('turn', 120)) return;
    this._tone(440, 0.08, 'sine', 0.1, 0, 520);
  }

  playError() {
    if (!this._canPlay('error', 120)) return;
    this._tone(190, 0.09, 'sawtooth', 0.12, 0, 150);
  }

  playVictory() {
    this.stopMusic(true);
    if (!this.prefs.musicEnabled && !this.prefs.sfxEnabled) return;
    this._startMusicBuffer('music_victory');
  }

  dispose() {
    this.disposed = true;
    this.stopMusic(true);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
