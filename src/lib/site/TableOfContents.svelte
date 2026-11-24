<script>
  import { getContext, tick, untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { t } from '$lib/i18n/index.js';
  import Icon from '$lib/studio/Icon.svelte';
  import ReadingProgress from '$lib/studio/ReadingProgress.svelte';
  import { studioOutline } from '$lib/studio/navigation.js';

  let { body, routeKey, supporting = false } = $props();

  const registerOutline = getContext(studioOutline);
  const wide = new MediaQuery('(min-width: 1080px) and (min-height: 450px)');
  const sidebar = $derived(supporting && Boolean(registerOutline) && wide.current);
  let headings = $state([]);
  const hasHeadings = $derived(headings.length > 0);
  let currentId = $state('');
  let track = $state();
  const currentIndex = $derived(headings.findIndex(({ id }) => id === currentId));
  let details = $state();
  let summary = $state();

  function close() {
    if (details) details.open = false;
  }

  $effect(() => {
    if (sidebar && hasHeadings) return registerOutline(outline);
  });

  $effect(() => {
    routeKey;
    const target = body;
    if (!target) return;

    let cancelled = false;
    let stopTracking;
    let frame = 0;
    const scrollRoot = target.closest('.reading-panel');

    untrack(close);
    tick().then(() => {
      if (cancelled) return;
      const nodes = [...target.querySelectorAll('h2, h3')];
      headings = nodes.map((node, index) => {
        node.id ||= 'article-section-' + index;
        return { id: node.id, text: node.textContent.trim(), nested: node.tagName === 'H3' };
      });
      if (!nodes.length) return;

      function update() {
        frame = 0;
        const top = scrollRoot?.getBoundingClientRect().top ?? 0;
        const height = scrollRoot?.clientHeight ?? window.innerHeight;
        const boundary = top + Math.min(height * .25, 150);
        let active = nodes[0];
        for (const node of nodes) {
          if (node.getBoundingClientRect().top > boundary) break;
          active = node;
        }
        currentId = active.id;
      }

      function schedule() {
        if (!frame) frame = requestAnimationFrame(update);
      }

      const source = scrollRoot ?? window;
      source.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      stopTracking = () => {
        source.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        cancelAnimationFrame(frame);
      };

      // Existing blog section links use IDs assigned when the article mounts.
      if (supporting && location.hash.startsWith('#article-section-')) {
        tick().then(() => {
          if (!cancelled) nodes.find(node => '#' + node.id === location.hash)?.scrollIntoView();
        });
      }
      update();
    });

    return () => {
      cancelled = true;
      stopTracking?.();
    };
  });
</script>

<svelte:window onkeydown={(event) => {
  if (event.key === 'Escape' && !event.defaultPrevented && details?.open && details.contains(event.target)) {
    close();
    summary?.focus();
  }
}} />

{#snippet links()}
  <nav class="toc-links" aria-label={$t('sidebar.toc')}>
    <div class="toc-track" class:has-progress={supporting} bind:this={track}>
      {#each headings as heading, index (heading.id)}
        <a class:nested={heading.nested} class:passed={index < currentIndex} href={'#' + heading.id}
          aria-current={index === currentIndex ? 'location' : undefined} onclick={close}>{heading.text}</a>
      {/each}
      {#if supporting}
        {#key routeKey}<ReadingProgress {track} activeIndex={currentIndex} nested={headings[currentIndex]?.nested} />{/key}
      {/if}
    </div>
  </nav>
{/snippet}

{#if headings.length}
  {#if !sidebar}
    <details class="reading-toc expressive-overlay" bind:this={details}>
      <summary bind:this={summary}>
        <Icon name="list" size={18} />
        <span>{$t('sidebar.toc')}</span>
        <span class="toc-chevron expressive-chevron"><Icon name="chevron-down" size={16} /></span>
      </summary>
      {@render links()}
    </details>
  {/if}
{/if}

{#snippet outline()}
  <aside class="reading-toc-side">
    <div class="toc-title"><Icon name="list" size={18} />{$t('sidebar.toc')}</div>
    {@render links()}
  </aside>
{/snippet}

<style>
  .reading-toc, .reading-toc-side {
    --toc-surface: var(--studio-surface, #1c2932);
    --toc-tonal: var(--studio-tonal, #30475a);
    --toc-accent: var(--studio-accent, #b3cae5);
    --toc-muted: var(--studio-muted, #a6bdca);
    --toc-text: var(--studio-on-surface, #d5e7ef);
  }
  .reading-toc { position: sticky; top: 8px; z-index: 2; width: fit-content; margin-bottom: 18px; }
  summary {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding-inline: 13px 11px;
    border-radius: 22px;
    color: var(--toc-text);
    background: var(--toc-surface);
    font-size: .9rem;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary:focus-visible, a:focus-visible { outline: 2px solid var(--toc-accent); outline-offset: -2px; }
  .toc-chevron { display: flex; margin-inline-start: 4px; }
  .reading-toc:not([open]) .toc-links { pointer-events: none; }

  .toc-links { overflow: auto; overscroll-behavior: contain; }
  .toc-track { position: relative; display: grid; gap: 3px; }
  .reading-toc .toc-links {
    position: absolute;
    inset: calc(100% + 7px) auto auto 0;
    width: min(340px, calc(100vw - 56px));
    max-height: min(53svh, 360px);
    padding: 7px;
    border-radius: 18px;
    background: var(--toc-surface);
    box-shadow: 0 8px 26px rgb(0 0 0 / 25%);
  }

  .reading-toc-side { min-width: 0; }
  .toc-title { display: flex; align-items: center; gap: 8px; min-height: 36px; padding-inline: 12px; color: var(--toc-text); font-size: .9rem; font-weight: 600; }
  .reading-toc-side .toc-links { max-height: calc(100svh - 172px); padding: 5px 2px 5px 0; }

  a {
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 8px 12px;
    border-radius: 12px;
    color: var(--toc-muted);
    font-size: .86rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  a.nested { padding-inline-start: 24px; }
  a[aria-current='location'] { color: var(--toc-text); background: var(--toc-tonal); }
  .has-progress { --toc-nested-indent: 12px; }
  .has-progress a {
    --toc-entry-indent: 0px;
    position: relative;
    padding-inline-start: calc(34px + var(--toc-entry-indent));
  }
  .has-progress a.nested { --toc-entry-indent: var(--toc-nested-indent); }
  .has-progress a::before {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: calc(15px + var(--toc-entry-indent));
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--toc-accent);
    content: '';
    opacity: .58;
    transform: translateY(-50%);
    transition: opacity 150ms ease-out;
  }
  .has-progress :is(.passed, [aria-current='location'])::before { opacity: 0; }
  @media (hover: hover) {
    summary:hover, a:hover { background: color-mix(in srgb, var(--toc-surface) 88%, var(--toc-accent)); }
    a[aria-current='location']:hover { background: color-mix(in srgb, var(--toc-tonal) 88%, var(--toc-accent)); }
  }
  @media (pointer: coarse) { a { min-height: 44px; } }
</style>
