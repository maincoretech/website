import { siteConfig } from '../siteConfig.js';
import { createCameraAxis, advanceCameraAxis } from './camera-motion.js';

export const tabSlideDuration = 1200;

export function tabSlideDirection(from, to) {
  const index = path => siteConfig.nav.findIndex(section => section.href === (path?.replace(/\/$/, '') || '/product'));
  const start = index(from);
  const end = index(to);
  return start < 0 || end < 0 ? 0 : Math.sign(end - start);
}

// Sample the same damped response as the water camera, including its slow start.
export function tabSlideProgress() {
  const axis = createCameraAxis();
  const samples = [0];
  for (let i = 0; i < 60; i++) {
    advanceCameraAxis(axis, 1, tabSlideDuration / 60000);
    samples.push(axis.value);
  }
  const end = samples.at(-1);
  return samples.map(value => value / end);
}

export const tabSlideEasing = `linear(${tabSlideProgress().map(value => value.toFixed(6)).join(',')})`;
