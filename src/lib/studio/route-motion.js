import { usesStudioShell } from './navigation.js';
import { motionAllowed } from '../motion.js';

export function docsZoomDirection(from, to) {
  const depth = (path) => (/^\/docs(?:\/|$)/.test(path) ? path.split('/').filter(Boolean).length : 0);
  return Math.sign(depth(to) - depth(from));
}

function fadeIn(panel) {
  // A viewport-height overlay stays separate from the article's render layer.
  const shade = document.createElement('div');
  shade.className = 'studio-route-shade';
  shade.setAttribute('aria-hidden', 'true');
  panel.append(shade);
  const animation = shade.animate([{ opacity: 0.65 }, { opacity: 0 }], {
    duration: 340,
    easing: 'cubic-bezier(.25, .1, .25, 1)',
    fill: 'both'
  });
  const remove = () => shade.remove();
  animation.finished.then(remove, remove);
  return animation;
}

export function createRouteMotion() {
  let active;

  function track(animation) {
    if (!animation) return;
    active = animation;
    const clear = () => {
      if (active === animation) active = undefined;
    };
    animation.finished.then(clear, clear);
  }

  return ({ from, to }) => {
    if (!from || !to || from.url.pathname === to.url.pathname) return;
    active?.cancel();
    active = undefined;

    const fromPath = from.url.pathname;
    const toPath = to.url.pathname;
    if (!motionAllowed()) return;
    if (usesStudioShell(toPath)) {
      const panel = document.getElementById('site-content');
      if (panel?.animate && !to.url.hash) track(fadeIn(panel));
      return;
    }
    if (usesStudioShell(fromPath)) return;
    const direction = docsZoomDirection(fromPath, toPath);
    if (!direction) return;

    // This runs after the route commits. Animate only the live reading panel.
    const panel = document.querySelector('.reading-panel');
    track(
      panel?.animate([{ transform: direction > 0 ? 'scale(.97)' : 'scale(1.03)' }, { transform: 'none' }], {
        duration: 180,
        easing: 'cubic-bezier(.2, 0, 0, 1)'
      })
    );
  };
}
