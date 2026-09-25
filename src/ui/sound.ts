// Effetti sonori sintetizzati al volo (Web Audio): nessun file audio da scaricare.

let prefs = { sound: true, vibration: true };
let ctx: AudioContext | null = null;

export function setFeedbackPrefs(p: { sound: boolean; vibration: boolean }): void {
  prefs = { sound: p.sound, vibration: p.vibration };
}

export function vibrationOn(): boolean {
  return prefs.vibration;
}

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slideTo?: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  const t = a.currentTime + start;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(a: AudioContext, dur: number, vol = 0.25) {
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = a.createBufferSource();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  src.buffer = buf;
  f.type = 'bandpass';
  f.frequency.value = 2400;
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export type Sfx = 'shutter' | 'pop' | 'reward' | 'shake' | 'open' | 'rare' | 'level' | 'scan' | 'error';

export function play(s: Sfx): void {
  if (!prefs.sound) return;
  const a = audio();
  if (!a) return;
  try {
    switch (s) {
      case 'shutter':
        noise(a, 0.09);
        tone(a, 1800, 0, 0.03, 'square', 0.05);
        break;
      case 'pop':
        tone(a, 520, 0, 0.09, 'sine', 0.16, 900);
        break;
      case 'reward':
        tone(a, 880, 0, 0.12, 'triangle', 0.14);
        tone(a, 1320, 0.08, 0.18, 'triangle', 0.12);
        break;
      case 'shake':
        tone(a, 180, 0, 0.12, 'triangle', 0.12, 140);
        break;
      case 'open':
        tone(a, 300, 0, 0.35, 'sine', 0.14, 1200);
        tone(a, 1568, 0.3, 0.2, 'triangle', 0.1);
        tone(a, 2093, 0.4, 0.3, 'triangle', 0.08);
        break;
      case 'rare':
        [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, 0.25 + i * 0.09, 0.3, 'triangle', 0.12));
        break;
      case 'level':
        [523, 659, 784].forEach((f, i) => tone(a, f, i * 0.12, 0.16, 'square', 0.06));
        tone(a, 1047, 0.38, 0.6, 'triangle', 0.14);
        break;
      case 'scan':
        tone(a, 1000, 0, 0.07, 'sine', 0.14);
        tone(a, 1500, 0.08, 0.12, 'sine', 0.14);
        break;
      case 'error':
        tone(a, 300, 0, 0.18, 'sawtooth', 0.06, 200);
        break;
    }
  } catch {
    /* audio non disponibile */
  }
}
