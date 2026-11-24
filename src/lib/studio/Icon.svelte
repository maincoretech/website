<script>
  import { materialSymbols } from './material-symbols.js';

  let { name, size = 20 } = $props();
  const symbol = $derived(materialSymbols[name]);
</script>

{#if symbol}
  <svg aria-hidden="true" width={size} height={size} viewBox="0 -960 960 960" fill="currentColor">
    <path d={symbol} />
  </svg>
{:else if name === 'github'}
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.73 2.6 1.23 3.23.94.1-.72.39-1.21.71-1.49-2.5-.29-5.12-1.25-5.12-5.57a4.36 4.36 0 0 1 1.16-3.03c-.12-.29-.5-1.44.11-3 0 0 .95-.31 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.46 3.09-1.15 3.09-1.15.62 1.56.23 2.71.11 3a4.36 4.36 0 0 1 1.16 3.03c0 4.33-2.63 5.27-5.14 5.55.4.35.76 1.04.76 2.1v3.14c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z" />
  </svg>
{/if}
