<script>
  import { lang, setLang } from '$lib/i18n/index.js';
  import { Translate } from '$lib/icons.js';
  import { fly } from 'svelte/transition';

  const langs = [
    { code: 'zh', label: '简' },
    { code: 'zh-Hant', label: '繁' },
    { code: 'ja', label: '日' },
    { code: 'en', label: 'EN' }
  ];

  let open = $state(false);

  function pick(code) {
    setLang(code);
    open = false;
  }

  function toggle() { open = !open; }
  function close() { open = false; }
</script>

<svelte:window onclick={close} />

<span class="lang-wrap">
  <button
    class="lang-btn"
    class:lang-btn--open={open}
    onclick={(e) => { e.stopPropagation(); toggle(); }}
    aria-label="语言"
  >
    {@html Translate}
    <span class="lang-label">{langs.find(l => l.code === $lang)?.label ?? $lang}</span>
  </button>

  {#if open}
    <ul class="lang-drop" transition:fly={{ y: -4, duration: 150 }}>
      {#each langs as l}
        <li>
          <button
            class="lang-opt"
            class:active={$lang === l.code}
            onclick={() => pick(l.code)}
          >{l.label}</button>
        </li>
      {/each}
    </ul>
  {/if}
</span>

<style>
  .lang-wrap { position: relative; display: inline-flex; align-items: center; margin-right: 10px; height: 100%; padding: 9px 0; }
  .lang-btn {
    background: var(--c-sh, rgba(11,80,140,.44)); color: #fff; border: none; border-radius: 4px;
    height: 100%; padding: 0 7px; cursor: pointer; transition: background .15s, border-radius .15s, box-shadow .15s;
    display: inline-flex; align-items: center; gap: 4px; font: .75rem var(--f-b, sans-serif);
    white-space: nowrap; line-height: 1;
  }
  .lang-btn:hover { background: rgba(80,120,150,.55); }
  .lang-btn--open { border-radius: 4px 4px 0 0; box-shadow: inset 0 -2px 3px rgba(0,0,0,.12); }
  .lang-label { font-size: .7rem; line-height: 1; min-width: 14px; text-align: center; }

  .lang-drop {
    position: absolute; top: 100%; right: 0; margin: 0; padding: 3px 0; z-index: 200;
    background: rgb(215,228,235); border-radius: 0 0 4px 4px;
    box-shadow: inset 0 2px 3px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.15);
    list-style: none; min-width: 48px;
  }
  .lang-drop li { margin: 0; padding: 0; line-height: 1; }
  .lang-opt {
    display: block; width: 100%; padding: 5px 14px; border: none; background: none;
    font: .75rem var(--f-b, sans-serif); color: var(--c-t); cursor: pointer;
    text-align: center; transition: background .1s;
  }
  .lang-opt:hover { background: rgba(80,120,150,.3); }
  .lang-opt.active { color: var(--c-l); font-weight: 700; }
</style>
