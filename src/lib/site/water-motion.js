// Shared world-space ripple phase: the shader and paper motion use the same field.
// Analytic sampling only; no physics solver, geometry updates or additional timer.
const X_SCALE = 14;
const Z_SCALE = 12;
const FREQUENCY = 125;
const SPEED = 1.15;
const BEND_X = 19;
const BEND_Z = 31;
export const RIPPLE_COUNT = 4;
export const RIPPLE_LIFETIME = 1.2;
export const SCROLL_WAKE_WIDTH = .18;

// Same screen-space band as the water shader, sampled at each prop's footprint.
export function scrollDisturbance(screenY, wake) {
  const distance = (screenY - wake.x) / SCROLL_WAKE_WIDTH;
  const envelope = Math.max(0, 1 - Math.abs(distance));
  return (1 - 3 * distance) * envelope * envelope * wake.y;
}

// One screen-aligned wake, updated by the existing frame loop. Scroll events only
// accumulate a bounded impulse; they never allocate ripples or trigger rendering.
export function advanceScrollWake(wake, delta, dt) {
  if (Math.abs(delta) > .01) {
    if (Math.abs(wake.y) < .01) wake.x = .68;
    wake.y = Math.max(-.8, Math.min(.8, wake.y + Math.max(-120, Math.min(120, delta)) * .004));
  }
  const decay = Math.exp(-dt * 2.6);
  wake.x = Math.max(.56, Math.min(.92, wake.x + wake.y * (1 - decay) / 2.6 * .36));
  wake.y *= decay;
  if (Math.abs(wake.y) < .001) wake.y = 0;
  return wake;
}

export const SCROLL_WAKE_GLSL = `
  uniform vec2 scrollWake;
  uniform float viewportHeight;
  float scrollDisturbance(float screenY) {
    float distance = (screenY - scrollWake.x) / ${SCROLL_WAKE_WIDTH.toFixed(2)};
    float envelope = max(0., 1. - abs(distance));
    return (1. - 3. * distance) * envelope * envelope * scrollWake.y;
  }
`;

function rippleAmplitude(age, strength) {
  if (age < 0 || age >= RIPPLE_LIFETIME) return 0;
  const fade = Math.max(0, Math.min(1, (age - .6) / (RIPPLE_LIFETIME - .6)));
  // An immediate impulse, followed only by decay: clicks must not wait for a fade-in.
  return Math.exp(-age * 2.4) * (1 - fade * fade * (3 - 2 * fade)) * strength;
}

// Age/decay are prepared once per frame on the CPU, never per water pixel.
export function prepareRipples(time, sources, field) {
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const age = time - source.z;
    const target = field[i];
    target.x = source.x;
    target.y = source.y;
    target.z = .12 + Math.max(0, age) * 1.8;
    target.w = rippleAmplitude(age, source.w);
  }
}

// Compact polynomial falloff avoids exponentials and ignores pixels outside the wake.
export const RIPPLE_GLSL = `
  uniform vec4 ripples[${RIPPLE_COUNT}];
  uniform vec3 flow;
  float disturbance(vec2 point, float time) {
    float height = 0.;
    for (int i = 0; i < ${RIPPLE_COUNT}; i++) {
      if (ripples[i].w > .001) {
        vec2 delta = point - ripples[i].xy;
        float d2 = dot(delta, delta);
        float falloff = max(0., 1. - d2 * .25);
        float ring = max(0., 1. - abs(sqrt(d2) - ripples[i].z) * 3.);
        height += ring * ring * falloff * falloff * ripples[i].w;
      }
    }
    if (flow.z > .001) {
      vec2 delta = point - flow.xy;
      float d2 = dot(delta, delta);
      float falloff = max(0., 1. - d2 * .25);
      if (falloff > 0.) height += sin(sqrt(d2) * 5. - time * 6.) * falloff * falloff * flow.z;
    }
    return height;
  }
`;

export function disturbanceHeight(x, z, time, ripples, flow, prepared = false) {
  let height = 0;
  for (const ripple of ripples) {
    const age = time - ripple.z;
    if (!prepared && (age < 0 || age >= RIPPLE_LIFETIME)) continue;
    const amplitude = prepared ? ripple.w : rippleAmplitude(age, ripple.w);
    if (amplitude <= .001) continue;
    const d2 = (x - ripple.x) ** 2 + (z - ripple.y) ** 2;
    const falloff = Math.max(0, 1 - d2 * .25);
    const radius = prepared ? ripple.z : .12 + age * 1.8;
    const ring = Math.max(0, 1 - Math.abs(Math.sqrt(d2) - radius) * 3);
    height += ring * ring * falloff * falloff * amplitude;
  }
  if (flow?.z > .001) {
    const d2 = (x - flow.x) ** 2 + (z - flow.y) ** 2;
    const falloff = Math.max(0, 1 - d2 * .25);
    if (falloff > 0) height += Math.sin(Math.sqrt(d2) * 5 - time * 6) * falloff * falloff * flow.z;
  }
  return height;
}

export const WATER_PHASE_GLSL = `
  float waterPhase(vec2 world, float time) {
    vec2 p = vec2(world.x / ${X_SCALE.toFixed(1)}, -world.y / ${Z_SCALE.toFixed(1)});
    return p.y * ${FREQUENCY.toFixed(1)} - time * ${SPEED.toFixed(2)}
      + sin(p.x * ${BEND_X.toFixed(1)} + time * .12) * 2.
      + sin(p.y * ${BEND_Z.toFixed(1)} - time * .2);
  }
`;

export function waveHeight(x, z, time) {
  const u = x / X_SCALE;
  const v = -z / Z_SCALE;
  const phase = v * FREQUENCY - time * SPEED
    + Math.sin(u * BEND_X + time * .12) * 2
    + Math.sin(v * BEND_Z - time * .2);
  return Math.sin(phase) * .026;
}

function surfaceHeight(x, z, time, ripples, flow, prepared, scrollHeight) {
  return waveHeight(x, z, time)
    + Math.tanh(disturbanceHeight(x, z, time, ripples, flow, prepared)) * .03
    + Math.tanh(scrollHeight ? scrollHeight(x, z) : 0) * .045;
}

export function sampleFloat(homeX, homeZ, time, pose, ripples = [], flow, prepared = false, scrollHeight) {
  // Bounded drift keeps the paper within its composition instead of leaving the page.
  const phase = (homeX - homeZ) * .37;
  pose.x = homeX + Math.sin(time * SPEED * .3 + phase) * .065;
  pose.z = homeZ - Math.sin(time * SPEED * .24 + phase) * .1;
  // Saturation limits overlapping gestures so the paper keeps its navigation clearance.
  pose.y = .035 + surfaceHeight(pose.x, pose.z, time, ripples, flow, prepared, scrollHeight);
  // Sample across the paper's footprint, smoothing the short waves into a small tilt.
  const reach = .55;
  pose.slopeX = (surfaceHeight(pose.x + reach, pose.z, time, ripples, flow, prepared, scrollHeight) - surfaceHeight(pose.x - reach, pose.z, time, ripples, flow, prepared, scrollHeight)) / (2 * reach);
  pose.slopeZ = (surfaceHeight(pose.x, pose.z + reach, time, ripples, flow, prepared, scrollHeight) - surfaceHeight(pose.x, pose.z - reach, time, ripples, flow, prepared, scrollHeight)) / (2 * reach);
  pose.yaw = Math.sin(time * SPEED * .3 + phase) * .045;
  return pose;
}
