import { tick } from 'svelte';

const switches = new WeakMap();
export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function motionAllowed() {
  return typeof window !== 'undefined' && !matchMedia(reducedMotionQuery).matches;
}

function timing(style, type) {
  return {
    duration: parseFloat(style.getPropertyValue(`--expressive-${type}-time`)),
    easing: style.getPropertyValue(`--expressive-${type}-ease`).trim()
  };
}

// Commit every choice immediately. Interrupt any motion on the same content.
export async function transitionContent(node, update) {
  if (!node?.animate) {
    update();
    return;
  }
  const previous = switches.get(node);
  let start = { opacity: 0.76, transform: 'translateY(4px)' };
  if (previous?.some((animation) => animation.playState === 'running')) {
    const { opacity, transform } = getComputedStyle(node);
    start = { opacity, transform };
  }
  previous?.forEach((animation) => animation.cancel());
  const current = [];
  switches.set(node, current);

  try {
    update();
    await tick();
    if (switches.get(node) !== current || !node.isConnected || !motionAllowed() || !node.getClientRects().length)
      return;
    const style = getComputedStyle(node);
    current.push(
      node.animate([{ opacity: start.opacity }, { opacity: 1 }], timing(style, 'effects')),
      node.animate([{ transform: start.transform }, { transform: 'none' }], timing(style, 'spatial'))
    );
    await Promise.allSettled(current.map((animation) => animation.finished));
  } finally {
    if (switches.get(node) === current) switches.delete(node);
  }
}
