import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_VIEWS, createCameraAxis, advanceCameraAxis, resetCameraAxis, cameraAxisSettled } from '../src/lib/site/camera-motion.js';
import { siteConfig } from '../src/lib/siteConfig.js';

test('water turns follow the same direction as every main tab pair', () => {
  const tabs = siteConfig.nav.map(section => section.label);
  for (let from = 0; from < tabs.length; from++) {
    for (let to = 0; to < tabs.length; to++) {
      assert.equal(Math.sign(CAMERA_VIEWS[tabs[to]] - CAMERA_VIEWS[tabs[from]]), Math.sign(to - from));
    }
  }
});

test('first-to-last tab turns keep momentum without wrapping to the opposite arc', () => {
  const axis = createCameraAxis(CAMERA_VIEWS.product);
  advanceCameraAxis(axis, CAMERA_VIEWS.about, .3);
  assert(axis.value > CAMERA_VIEWS.product);
  assert(axis.velocity > 0);
  const before = { ...axis };
  advanceCameraAxis(axis, CAMERA_VIEWS.product, 1e-6);
  assert(Math.abs(axis.velocity - before.velocity) < .001);
  for (let i = 0; i < 180; i++) advanceCameraAxis(axis, CAMERA_VIEWS.product, 1 / 60);
  assert(cameraAxisSettled(axis, CAMERA_VIEWS.product));
});

test('tab turn starts gently, accelerates and settles without overshooting', () => {
  const axis = createCameraAxis();
  advanceCameraAxis(axis, 1, .05);
  assert(axis.value > 0 && axis.value < .02);
  const initialSpeed = axis.velocity;
  advanceCameraAxis(axis, 1, .15);
  assert(axis.velocity > initialSpeed * 2);
  const peakSpeed = axis.velocity;
  let previous = axis.value;
  for (let i = 0; i < 120; i++) {
    advanceCameraAxis(axis, 1, 1 / 60);
    assert(axis.value >= previous && axis.value <= 1);
    previous = axis.value;
  }
  assert(axis.velocity < peakSpeed / 100);
  assert(cameraAxisSettled(axis, 1));
});

test('camera turn is independent of render cadence', () => {
  const results = [30, 60, 120].map(fps => {
    const axis = createCameraAxis(.7);
    for (let i = 0; i < fps; i++) advanceCameraAxis(axis, 3.14, 1 / fps);
    return axis;
  });
  for (const axis of results) for (const key of ['value', 'velocity', 'acceleration']) {
    assert(Math.abs(axis[key] - results[0][key]) < 1e-10);
  }
});

test('retargeting preserves motion and converges to the latest tab', () => {
  const axis = createCameraAxis();
  advanceCameraAxis(axis, Math.PI, .2);
  const before = { ...axis };
  advanceCameraAxis(axis, -Math.PI / 2, 0);
  assert.deepEqual(axis, before);
  advanceCameraAxis(axis, -Math.PI / 2, 1e-6);
  assert(Math.abs(axis.velocity - before.velocity) < .001);
  assert(Math.abs(axis.acceleration - before.acceleration) < .01);
  for (let i = 0; i < 180; i++) advanceCameraAxis(axis, -Math.PI / 2, 1 / 60);
  assert(cameraAxisSettled(axis, -Math.PI / 2));
});

test('reduced motion and resize resets discard residual momentum', () => {
  const axis = createCameraAxis();
  advanceCameraAxis(axis, 2, .2);
  resetCameraAxis(axis, 2);
  assert.deepEqual(axis, { value: 2, velocity: 0, acceleration: 0 });
  assert(cameraAxisSettled(axis, 2));
});
