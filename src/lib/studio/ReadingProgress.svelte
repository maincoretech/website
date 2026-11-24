<script>
  import { untrack } from 'svelte';
  import { motionAllowed } from '$lib/motion.js';

  let { track, activeIndex, nested = false } = $props();
  let position = $state(null);
  let mark = $state();
  let previousIndex = -1;

  $effect(() => {
    const list = track;
    const index = activeIndex;
    const icon = mark;
    if (!list || !icon || index < 0) return;

    const row = list.querySelector('[aria-current="location"]');
    if (!row) return;

    const bites = [];
    let frame = 0;
    function align() {
      if (!row.offsetHeight) return;
      position = row.offsetTop + row.offsetHeight / 2;
    }

    function advance() {
      align();
      if (!row.offsetHeight) return;
      const lastIndex = previousIndex;
      previousIndex = index;
      if (index === lastIndex) return;

      const scroller = list.parentElement;
      const visibleTop = scroller.scrollTop;
      const visibleBottom = visibleTop + scroller.clientHeight;
      const rowBottom = row.offsetTop + row.offsetHeight;
      if (row.offsetTop < visibleTop + 4 || rowBottom > visibleBottom - 4) {
        const top = row.offsetTop < visibleTop + 4 ? row.offsetTop - 6 : rowBottom - scroller.clientHeight + 6;
        scroller.scrollTo({ top, behavior: lastIndex >= 0 && motionAllowed() ? 'smooth' : 'instant' });
      }

      if (lastIndex < 0 || index <= lastIndex || !motionAllowed()) return;
      for (const jaw of icon.querySelectorAll('g')) {
        const rotation = jaw.dataset.jaw === 'left' ? -17 : 17;
        bites.push(jaw.animate([
          { transform: 'rotate(0deg)' },
          { transform: `rotate(${rotation}deg)`, offset: .58 },
          { transform: 'rotate(0deg)' }
        ], { duration: 300, easing: 'ease-in-out' }));
      }
    }

    // Read the row after Svelte applies aria-current, and measure only again when its layout changes.
    untrack(advance);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(advance);
    });
    observer.observe(list);
    observer.observe(row);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      for (const bite of bites) bite.cancel();
    };
  });
</script>

<span class="reading-marker" class:nested class:positioned={position !== null} bind:this={mark}
  style:--reading-y={`${position ?? 0}px`} aria-hidden="true">
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <g data-jaw="left">
      <path d="M12.6 2.8C7.2 2.5 3.2 6.3 3.2 11.6c0 3.8 1.3 6.8 4 8.6l5.4-8.5Z" />
    </g>
    <g data-jaw="right">
      <path d="M11.4 2.8c5.4-.3 9.4 3.5 9.4 8.8 0 3.2-1.5 6-4.4 8.1l-5-8Z" />
      <circle cx="15.3" cy="8.4" r="1.35" fill="var(--toc-surface)" />
    </g>
  </svg>
</span>

<style>
  .reading-marker {
    --reading-x: 0px;
    position: absolute;
    z-index: 1;
    inset-block-start: 0;
    inset-inline-start: 7px;
    display: flex;
    color: var(--toc-accent);
    opacity: 0;
    pointer-events: none;
    transform: translate(var(--reading-x), calc(var(--reading-y) - 50%));
  }
  .reading-marker.nested { --reading-x: var(--toc-nested-indent); }
  .reading-marker.positioned { opacity: 1; transition: transform 180ms var(--motion-ease); }
  g { transform-origin: 12px 11px; }
</style>
