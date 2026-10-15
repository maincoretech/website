<script>
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { motionDuration } from '$lib/motion.js';

  let { label, children } = $props();
  const id = $props.id();
  let expanded = $state(false);
</script>

<div class="disclosure">
  <button type="button" class="disclosure-trigger" aria-expanded={expanded} aria-controls={id} onclick={() => expanded = !expanded}>
    <span class="disclosure-arrow" class:expanded aria-hidden="true">▸</span>{label}
  </button>
  {#if expanded}
    <div {id} class="disclosure-body" transition:slide={{ duration: motionDuration(200), easing: cubicOut }} inert={!expanded}>
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .disclosure-trigger { display: inline-flex; align-items: center; gap: 5px; padding: 3px 5px; margin-left: -5px; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  .disclosure-arrow { display: inline-block; transition: transform 200ms cubic-bezier(.22,1,.36,1); }
  .disclosure-arrow.expanded { transform: rotate(90deg); }
  @media(prefers-reduced-motion:reduce) { .disclosure-arrow { transition: none; } }
</style>
