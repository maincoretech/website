import { tabSlideDuration, tabSlideEasing } from './tab-motion.js';

// Only the outgoing reading panel is copied. The incoming page stays live,
// so finishing a slide never swaps a screenshot back to the real page.
export function prepareTabSlide(panel, direction, { mode = 'slide', duration = tabSlideDuration, easing: customEasing } = {}) {
  if (!panel?.parentElement || !panel.animate) return null;
  const viewport = panel.parentElement;
  const bounds = panel.getBoundingClientRect();
  const parentBounds = viewport.getBoundingClientRect();
  const distance = bounds.width;
  const copy = panel.cloneNode(true);
  const layer = document.createElement('div');
  layer.className = panel.closest('.site-shell').className;
  layer.dataset.tabSlideCopy = '';
  layer.inert = true;
  layer.setAttribute('aria-hidden', 'true');
  for (const node of [copy, ...copy.querySelectorAll('[id]')]) node.removeAttribute('id');
  copy.querySelectorAll('[hidden]').forEach(node => node.remove());
  copy.querySelectorAll('.revealing').forEach(node => node.classList.remove('revealing'));
  Object.assign(copy.style, {
    top: `${bounds.top - parentBounds.top}px`, left: `${bounds.left - parentBounds.left}px`,
    right: 'auto', bottom: 'auto', width: `${bounds.width}px`, height: `${bounds.height}px`,
    margin: '0', animation: 'none', viewTransitionName: 'none'
  });
  layer.append(copy);
  viewport.append(layer);
  copy.scrollTop = panel.scrollTop;
  copy.scrollLeft = panel.scrollLeft;

  let cancelled = false;
  let animations = [];
  let idleCleanup;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const updateMotion = () => { if (preference.matches) cancel(); };
  const easing = customEasing ?? (CSS.supports('animation-timing-function', tabSlideEasing)
    ? tabSlideEasing : 'cubic-bezier(.4, 0, .2, 1)');
  const options = { duration, easing, fill: 'both' };
  const translate = x => `translate3d(${x}px, 0, 0)`;
  function cancel() {
    cancelled = true;
    animations.forEach(animation => animation.cancel());
    layer.remove();
    preference.removeEventListener('change', updateMotion);
    window.removeEventListener('resize', cancel);
    if (idleCleanup !== undefined) {
      if (window.cancelIdleCallback) cancelIdleCallback(idleCleanup);
      else clearTimeout(idleCleanup);
    }
  }
  preference.addEventListener('change', updateMotion);
  window.addEventListener('resize', cancel, { once: true });
  return {
    cancel,
    play() {
      if (cancelled || !panel.isConnected) { cancel(); return; }
      const outgoing = mode === 'zoom' ? copy : copy.querySelector('.route-content');
      const incoming = mode === 'zoom' ? panel : panel.querySelector('.route-content');
      if (!incoming || !outgoing) { cancel(); return; }
      layer.style.visibility = 'visible';
      const zoomFrame = (scale, opacity) => ({ transform: `scale(${scale})`, opacity, transformOrigin: '50% 50%' });
      animations = mode === 'zoom' ? [
        outgoing.animate([zoomFrame(1, 1), zoomFrame(direction > 0 ? 1.04 : .94, 0)], options),
        incoming.animate([zoomFrame(direction > 0 ? .94 : 1.04, 0), zoomFrame(1, 1)], options)
      ] : [
        outgoing.animate([{ transform: translate(0) }, { transform: translate(-direction * distance) }], options),
        incoming.animate([{ transform: translate(direction * distance) }, { transform: translate(0) }], options)
      ];
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        if (cancelled) return;
        // Keep the live panel's compositing layer; discard the off-screen copy
        // in idle time rather than doing DOM cleanup on the final motion frame.
        const cleanup = () => { if (!cancelled) cancel(); };
        idleCleanup = window.requestIdleCallback
          ? requestIdleCallback(cleanup, { timeout: 250 }) : setTimeout(cleanup, 32);
      }).catch(() => {});
    }
  };
}
