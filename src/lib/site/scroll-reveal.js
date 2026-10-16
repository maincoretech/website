// Animate only on first entry; content stays visible without JS or motion support.
export function scrollReveal(node, { delay = 0 } = {}) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window) || !node.animate || media.matches) return;

  let animation;
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (media.matches || node.contains(document.activeElement)) return;
    animation = node.animate(
      [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'translateX(0)' }],
      { duration: 620, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }
    );
  }, { root: node.closest('.reading-panel'), rootMargin: '0px 0px -15% 0px', threshold: .08 });
  const cancel = () => animation?.cancel();
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
