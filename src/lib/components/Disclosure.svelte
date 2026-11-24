<script>
  import Icon from '$lib/studio/Icon.svelte';

  let { label, children } = $props();
  const id = $props.id();
  let expanded = $state(false);
</script>

<div class="disclosure">
  <button type="button" class="disclosure-trigger" aria-expanded={expanded} aria-controls={id} onclick={() => expanded = !expanded}>
    <span class="disclosure-arrow expressive-chevron" aria-hidden="true"><Icon name="chevron-down" size={16} /></span>{label}
  </button>
  <div {id} class="disclosure-body" class:expanded inert={!expanded}>
    <div class="disclosure-content">{@render children()}</div>
  </div>
</div>

<style>
  .disclosure-trigger { display: inline-flex; align-items: center; gap: 5px; padding: 3px 5px; margin-left: -5px; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  .disclosure-arrow { display: inline-flex; }
  .disclosure-body {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    visibility: hidden;
    transition:
      grid-template-rows var(--expressive-spatial-time) var(--expressive-effects-ease),
      opacity var(--expressive-effects-time) var(--expressive-effects-ease),
      visibility 0s linear var(--expressive-spatial-time);
  }
  .disclosure-body.expanded { grid-template-rows: 1fr; opacity: 1; visibility: visible; transition-delay: 0s; }
  .disclosure-content { min-height: 0; overflow: clip; }
</style>
