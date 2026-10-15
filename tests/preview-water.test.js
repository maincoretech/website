import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIPPLE_LIFETIME, prepareRipples, disturbanceHeight, sampleFloat, waveHeight } from '../src/routes/preview/water-motion.js';

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
