import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIPPLE_LIFETIME, SCROLL_WAKE_WIDTH, SCROLL_WAKE_GAIN, prepareRipples, disturbanceHeight, sampleFloat, waveHeight, advanceScrollWake, advancePointerFlow, scrollDisturbance } from '../src/lib/site/water-motion.js';

test('scroll surface matches the shader band and reverses with scroll direction', () => {
  for (const strength of [-.8, -.2, 0, .2, .8]) {
    const wake = { x: .68, y: strength };
    for (let y = 0; y <= 1; y += .005) {
      const distance = (y - wake.x) / SCROLL_WAKE_WIDTH;
      const envelope = Math.max(0, 1 - Math.abs(distance));
      assert(Math.abs(scrollDisturbance(y, wake) - (1 - 3 * distance) * envelope ** 2 * strength * SCROLL_WAKE_GAIN) < 1e-12);
    }
    assert.equal(scrollDisturbance(wake.x, wake), strength * SCROLL_WAKE_GAIN);
    assert.equal(Math.abs(scrollDisturbance(.3, wake)), 0);
  }
});

test('scroll waves lift and tilt props locally, then return to ambient motion', () => {
  const time = .4;
  const baseline = sampleFloat(0, 0, time, {});
  const wake = { x: .68, y: .8 };
  const surface = (x, z) => scrollDisturbance(.68 + (z - baseline.z) * .08, wake);
  const forward = sampleFloat(0, 0, time, {}, [], undefined, true, surface);
  assert(forward.y - baseline.y > .02);
  assert(Math.abs(forward.slopeZ - baseline.slopeZ) > .01);
  wake.y = -.8;
  const reverse = sampleFloat(0, 0, time, {}, [], undefined, true, surface);
  assert(Math.abs(forward.y + reverse.y - 2 * baseline.y) < 1e-12);
  assert(Math.abs(forward.slopeZ + reverse.slopeZ - 2 * baseline.slopeZ) < 1e-12);
  wake.x = .2;
  assert.deepEqual(sampleFloat(0, 0, time, {}, [], undefined, true, surface), baseline);
  wake.y = 0;
  assert.deepEqual(sampleFloat(0, 0, time, {}, [], undefined, true, surface), baseline);
});

test('combined scroll and pointer gestures keep the extra motion bounded', () => {
  const sources = Array.from({ length: 4 }, () => ({ x: 0, y: 0, z: 0, w: .85 }));
  for (const direction of [-1, 1]) {
    const wake = { x: .68, y: 0 };
    for (let frame = 0; frame < 600; frame++) {
      advanceScrollWake(wake, direction * 10000, 1 / 60);
      const pose = sampleFloat(0, 0, frame / 60, {}, sources, { x: 0, y: 0, z: .75 }, false,
        (x, z) => scrollDisturbance(.68 + z * .08, wake));
      assert(Math.abs(pose.y - .035 - waveHeight(pose.x, pose.z, frame / 60)) <= .075);
      assert(Object.values(pose).every(Number.isFinite));
    }
  }
});

test('scroll wake responds immediately in either direction and remains bounded', () => {
  for (const direction of [-1, 1]) {
    const wake = { x: .68, y: 0 };
    advanceScrollWake(wake, direction * 50, 1 / 60);
    assert(wake.y * direction > .1);
    assert((wake.x - .68) * direction > 0);
    for (let frame = 0; frame < 600; frame++) {
      advanceScrollWake(wake, direction * 10000, 1 / 60);
      assert(Math.abs(wake.y) <= .8);
      assert(wake.x >= .56 && wake.x <= .92);
    }
    for (let frame = 0; frame < 180; frame++) advanceScrollWake(wake, 0, 1 / 60);
    assert.equal(wake.y, 0);
  }
});

test('scroll wake decay is independent of render cadence', () => {
  const a = { x: .68, y: .6 }, b = { ...a };
  for (let i = 0; i < 30; i++) advanceScrollWake(a, 0, 1 / 30);
  for (let i = 0; i < 60; i++) advanceScrollWake(b, 0, 1 / 60);
  assert(Math.abs(a.y - b.y) < 1e-10);
  assert(Math.abs(a.x - b.x) < 1e-10);
});

test('a click opens immediately and expands on the next frame', () => {
  const sources = [{ x: 0, y: 0, z: 0, w: .85 }];
  const field = [{}];
  prepareRipples(0, sources, field);
  assert.equal(field[0].w, .85);
  assert(disturbanceHeight(0, 0, 0, sources) > .3);
  const initialRadius = field[0].z;
  prepareRipples(1 / 60, sources, field);
  assert(field[0].w > .8);
  assert(field[0].z > initialRadius);
});

test('impulses decay completely and do not exist before their birth', () => {
  const sources = [{ x: 0, y: 0, z: 1, w: .85 }];
  const field = [{}];
  let previous = 1;
  for (let age = 0; age < RIPPLE_LIFETIME; age += .01) {
    prepareRipples(1 + age, sources, field);
    assert(field[0].w <= previous);
    previous = field[0].w;
  }
  for (const time of [0, 1 + RIPPLE_LIFETIME, 10]) {
    prepareRipples(time, sources, field);
    assert.equal(field[0].w, 0);
    assert.equal(disturbanceHeight(0, 0, time, sources), 0);
  }
});

test('prepared shader fields agree with CPU surface sampling', () => {
  const sources = Array.from({ length: 4 }, (_, i) => ({ x: i * .2, y: i * .3, z: i * .08, w: .85 }));
  const field = sources.map(() => ({}));
  const flow = { x: .1, y: .2, z: .75 };
  for (let time = 0; time < 3; time += .013) {
    prepareRipples(time, sources, field);
    for (const [x, z] of [[0, 0], [.2, .3], [-.4, 1], [4, 4]]) {
      const raw = disturbanceHeight(x, z, time, sources, flow);
      const prepared = disturbanceHeight(x, z, time, field, flow, true);
      assert(Math.abs(raw - prepared) < 1e-10);
    }
  }
});

test('overlapping clicks keep paper displacement bounded', () => {
  const sources = Array.from({ length: 4 }, () => ({ x: 0, y: 0, z: 0, w: .85 }));
  const pose = {};
  for (let time = 0; time < 2; time += .01) {
    sampleFloat(0, 0, time, pose, sources, { x: 0, y: 0, z: .75 });
    const ambient = .035 + waveHeight(pose.x, pose.z, time);
    assert(Math.abs(pose.y - ambient) <= .03);
    assert(Object.values(pose).every(Number.isFinite));
  }
});


test('pointer wake follows rapid direction changes in the next frame, without position easing', () => {
  const flow = { x: -2, y: 3, z: .4 };
  for (const dt of [1 / 120, 1 / 60, 1 / 30]) {
    for (const [x, y] of [[2, -3], [-2, 3], [0, 0]]) {
      advancePointerFlow(flow, { x, y, z: .75 }, dt);
      assert.deepEqual(flow, { x, y, z: .75 });
    }
  }
});

test('holding a finger keeps the wake engaged; lifting fades in place without a final jump', () => {
  const flow = { x: 0, y: 0, z: 0 };
  const target = { x: 1, y: -1, z: .75 };
  for (let i = 0; i < 120; i++) advancePointerFlow(flow, target, 1 / 60);
  assert.deepEqual(flow, target);
  // Consume the endpoint even when a complete swipe occurs between two frames.
  advancePointerFlow(flow, { x: 2, y: -2, z: .75 }, 0);
  const released = { ...flow, z: 0 };
  let previous = flow.z;
  for (let i = 0; i < 120; i++) {
    advancePointerFlow(flow, released, 1 / 60);
    assert.equal(flow.x, 2);
    assert.equal(flow.y, -2);
    assert(flow.z <= previous);
    previous = flow.z;
  }
  assert.equal(flow.z, 0);
});


test('ambient wave fronts cross the viewing direction in every main camera view', () => {
  for (const angle of [Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const x = Math.sin(angle) * 6;
    const z = 1.6 - Math.cos(angle) * 6;
    // A radial move crosses the crests; a sideways move stays on the same band.
    const forward = waveHeight(x + Math.sin(angle) * .04, z - Math.cos(angle) * .04, .7);
    const sideways = waveHeight(x + Math.cos(angle) * .04, z + Math.sin(angle) * .04, .7);
    const centre = waveHeight(x, z, .7);
    assert(Math.abs(forward - centre) > Math.abs(sideways - centre) * 4);
  }
});
