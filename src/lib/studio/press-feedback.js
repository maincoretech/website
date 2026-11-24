import { reducedMotionQuery } from '$lib/motion.js';

export function pressFeedback(node, intensity = 0.14) {
  const reduced = matchMedia(reducedMotionQuery);
  const ripples = new Map();

  function cancel() {
    for (const [animation, layer] of ripples) {
      animation.cancel();
      layer.remove();
    }
    ripples.clear();
  }

  function press(event) {
    if (reduced.matches || !event.isPrimary || event.button !== 0 || ripples.size >= 2) return;

    const { left, top, width, height } = node.getBoundingClientRect();
    const x = event.clientX - left;
    const y = event.clientY - top;
    const radius = Math.min(128, Math.hypot(Math.max(x, width - x), Math.max(y, height - y)));

    const layer = document.createElement('span');
    layer.className = 'studio-ink';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = `left:${x - radius}px;top:${y - radius}px;width:${radius * 2}px;height:${radius * 2}px`;
    node.append(layer);
    const animation = layer.animate(
      [
        { transform: 'scale(.12)', opacity: 0, easing: 'ease-out' },
        { transform: 'scale(.36)', opacity: intensity, offset: 0.16, easing: 'cubic-bezier(.22, .55, .35, 1)' },
        { transform: 'scale(.98)', opacity: intensity * 0.52, offset: 0.7, easing: 'ease-in-out' },
        { transform: 'scale(1)', opacity: 0 }
      ],
      430
    );
    ripples.set(animation, layer);
    const remove = () => {
      layer.remove();
      ripples.delete(animation);
    };
    animation.finished.then(remove, remove);
  }

  node.addEventListener('pointerdown', press);
  node.addEventListener('pointercancel', cancel);
  return {
    destroy() {
      cancel();
      node.removeEventListener('pointerdown', press);
      node.removeEventListener('pointercancel', cancel);
    }
  };
}
