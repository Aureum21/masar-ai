// One contact time drives the fist, impact cue and bag impulse. Sampling is
// deterministic, so scrubbing the timeline cannot move the bag prematurely.
export const CONTACT_TIME = 4.82;
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };

export function punchMotion(time) {
  const approach = clamp((time - 4.63) / (CONTACT_TIME - 4.63));
  return {
    wind: smooth((time - 3.55) / .65) * (1 - smooth((time - 4.43) / .27)),
    drive: smooth((time - 4.4) / .42) * (1 - smooth((time - 4.92) / .55)),
    // Accelerate into contact rather than easing to a stop before the bag.
    extension: time < CONTACT_TIME ? approach * approach : 1 - smooth((time - CONTACT_TIME - .012) / .34)
  };
}

export const BAG_LENGTH = .65;
export const BAG_GRAVITY = 14.7; // Scene units: the human is about 3 units tall.
export const BAG_DAMPING = 1.45;
const step = 1 / 240;
const samples = [{ angle: 0, velocity: 4.8 }];
const acceleration = (angle, velocity) => -BAG_GRAVITY / BAG_LENGTH * Math.sin(angle) - BAG_DAMPING * velocity;
// Integrate the nonlinear, damped pendulum after the impact impulse. There is
// no pre-hit swing or force pulling the bag toward the hand.
for (let i = 0; i < 3600; i++) {
  const { angle: a, velocity: v } = samples[i];
  const k1a = v, k1v = acceleration(a, v);
  const k2a = v + k1v * step / 2, k2v = acceleration(a + k1a * step / 2, v + k1v * step / 2);
  const k3a = v + k2v * step / 2, k3v = acceleration(a + k2a * step / 2, v + k2v * step / 2);
  const k4a = v + k3v * step, k4v = acceleration(a + k3a * step, v + k3v * step);
  samples.push({ angle: a + step * (k1a + 2 * k2a + 2 * k3a + k4a) / 6, velocity: v + step * (k1v + 2 * k2v + 2 * k3v + k4v) / 6 });
}

export function bagMotion(time) {
  if (time < CONTACT_TIME) return { angle: 0, velocity: 0 };
  const sample = Math.min((time - CONTACT_TIME) / step, samples.length - 1);
  const index = Math.floor(sample), blend = sample - index;
  const a = samples[index], b = samples[Math.min(index + 1, samples.length - 1)];
  return { angle: a.angle + (b.angle - a.angle) * blend, velocity: a.velocity + (b.velocity - a.velocity) * blend };
}
