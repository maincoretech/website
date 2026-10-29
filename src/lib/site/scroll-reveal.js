// Animate only on first entry; content stays visible without JS or motion support.
export function scrollReveal(node, { delay = 0 } = {}) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window) || !node.animate || media.matches) return;

  const root = node.closest('.reading-panel');
  const bottom = Math.min(root?.getBoundingClientRect().bottom ?? innerHeight, innerHeight);
  // Never hide content the reader can already see, including restored scroll positions.
  if (node.getBoundingClientRect().top < bottom || node.contains(document.activeElement)) return;
  // Prepare below the viewport, before it can paint; do not wait until it has
  // travelled 15% into the reading area to jump back to the animation's start.
  node.classList.add('scroll-reveal-pending');
  let animation;
  let settled = false;
  const observer = new IntersectionObserver(entries => {
    if (settled || !entries.some(entry => entry.isIntersecting)) return;
    settled = true;
    observer.disconnect();
    if (media.matches || node.contains(document.activeElement)) { cancel(); return; }
    animation = node.animate(
      [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'translateX(0)' }],
      { duration: 620, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }
    );
    node.classList.remove('scroll-reveal-pending');
  }, { root, rootMargin: '0px 0px 24px 0px', threshold: 0 });
  const cancel = () => {
    settled = true;
    observer.disconnect();
    animation?.cancel();
    node.classList.remove('scroll-reveal-pending');
  };
  const reduce = () => {
    if (media.matches) { observer.disconnect(); cancel(); }
  };
  observer.observe(node);
  media.addEventListener('change', reduce);
  node.addEventListener('focusin', cancel);
  return {
    destroy() {
      observer.disconnect();
      cancel();
      media.removeEventListener('change', reduce);
      node.removeEventListener('focusin', cancel);
    }
  };
}
