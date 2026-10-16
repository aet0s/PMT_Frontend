// client/src/lib/notificationSound.js
// Synthesized notification bell chime using Web Audio API.
// Works across modern browsers with zero external sound asset dependencies.

let sharedAudioCtx = null;
let isAudioUnlocked = false;

// Attach a one-time gesture unlock listener so AudioContext can play on incoming notifications
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    isAudioUnlocked = true;
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
}

/**
 * Plays a crisp, melodic bell chime (Slack / Apple style dual-tone notification chime).
 * Called by NotificationSoundContext preview or SocketProvider when sound is enabled.
 */
export function playNotificationBellSound({ enabled = true } = {}) {
  try {
    if (typeof window === 'undefined') return;
    if (!enabled) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Primary Bell Strike (A5 - 880 Hz with quick punch & sweet sustain)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(876, now + 0.35);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // 2. High Harmonic Bell Chime (C#6 - 1108.7 Hz, layered at +45ms for melodic chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1108.73, now + 0.045);
    osc2.frequency.exponentialRampToValueAtTime(1104, now + 0.5);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.setValueAtTime(0.0001, now + 0.045);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.045);
    osc2.stop(now + 0.55);

    // 3. Shimmer Overtone (E6 - 1318.5 Hz, layered at +90ms for bell shimmer)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1318.51, now + 0.09);

    gain3.gain.setValueAtTime(0.0001, now);
    gain3.gain.setValueAtTime(0.0001, now + 0.09);
    gain3.gain.linearRampToValueAtTime(0.12, now + 0.105);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.09);
    osc3.stop(now + 0.6);
  } catch (err) {
    // AudioContext blocked by autoplay policy before any user gesture
  }
}
