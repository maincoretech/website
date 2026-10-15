import { tick } from 'svelte';
import { fly } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

const switches = new WeakMap();
const ease = 'cubic-bezier(.22, 1, .36, 1)';

export function motionDuration(ms) {
  return typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

export function popup(node) {
  return fly(node, { y: -5, duration: motionDuration(160), easing: cubicOut });
}

export function reveal(node) {
  if (!node?.isConnected || !node.animate || !motionDuration(180)) return;
  const animation = node.animate(
    [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 180, easing: ease }
  );
  animation.finished.catch(() => {});
  return animation;
}

// Keep the component mounted (including its timers and focusable controls).
// A newer interaction cancels the old one before it can overwrite the latest choice.
export async function transitionContent(node, update) {
  if (!node) { await update(); return true; }
  const previous = switches.get(node);
  const opacity = previous ? getComputedStyle(node).opacity : 1;
  previous?.animation?.cancel();
  const current = {};
  switches.set(node, current);
  try {
    if (node.isConnected && node.animate && node.getClientRects().length && motionDuration(70)) {
      current.animation = node.animate([{ opacity }, { opacity: 0 }], { duration: 70, easing: 'ease-out', fill: 'forwards' });
      await current.animation.finished.catch(() => {});
    }
    if (switches.get(node) !== current || !node.isConnected) return false;
    await update();
    await tick();
    if (switches.get(node) !== current || !node.isConnected) return false;
    current.animation?.cancel();
    current.animation = reveal(node);
    await current.animation?.finished.catch(() => {});
    return switches.get(node) === current;
  } finally {
    if (switches.get(node) === current) {
      current.animation?.cancel();
      switches.delete(node);
    }
  }
}
