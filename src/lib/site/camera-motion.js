// A third-order damped response starts with zero velocity and acceleration.
// Keeping all three states also makes rapid tab changes continuous.
export function createCameraAxis(value = 0) {
  return { value, velocity: 0, acceleration: 0 };
}

export function advanceCameraAxis(axis, target, dt) {
  if (!(dt > 0)) return;
  const rate = 9;
  const delta = axis.value - target;
  const linear = axis.velocity + rate * delta;
  const quadratic = (axis.acceleration + 2 * rate * axis.velocity + rate * rate * delta) / 2;
  const position = delta + linear * dt + quadratic * dt * dt;
  const velocity = linear + 2 * quadratic * dt;
  const decay = Math.exp(-rate * dt);
  axis.value = target + position * decay;
  axis.velocity = (velocity - rate * position) * decay;
  axis.acceleration = (2 * quadratic - 2 * rate * velocity + rate * rate * position) * decay;
}

export function resetCameraAxis(axis, value) {
  axis.value = value;
  axis.velocity = axis.acceleration = 0;
}

export function cameraAxisSettled(axis, target) {
  return Math.abs(axis.value - target) < .001 && Math.abs(axis.velocity) < .01 && Math.abs(axis.acceleration) < .05;
}
// Use one unwrapped arc in tab order, including product <-> about.
export const CAMERA_VIEWS = { product: Math.PI / 2, blog: Math.PI, about: Math.PI * 1.5 };

