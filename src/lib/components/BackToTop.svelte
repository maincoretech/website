<script>
  let visible = $state(false);

  function check() {
    visible = window.scrollY > 300;
  }

  function scrollUp() {
    const start = window.scrollY;
    const duration = 200;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, start * (1 - ease));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
</script>

<svelte:window onscroll={check} />

{#if visible}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <button class="btt" onclick={scrollUp} aria-label="返回顶部">▲</button>
{/if}

<style>
  .btt {
    position: fixed; bottom: 24px; right: 24px; z-index: 100;
    width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer;
    font-size: 1rem; color: rgb(204,218,230);
    background: linear-gradient(145deg,rgba(185,210,230,.95),rgba(160,190,210,.95) 25%,rgba(150,175,195,.9) 75%,rgba(185,215,235,.95)),linear-gradient(240deg,transparent 30%,rgba(160,190,210,.9) 48%,rgba(195,218,232,.9) 54%,rgba(150,175,195,.9) 60%,transparent 80%);
    box-shadow: 4px 2px 6px rgba(180,210,225,.5),-1px 0 5px rgba(180,210,225,.4);
    display: flex; align-items: center; justify-content: center;
    animation: btt-in .2s ease;
    transition: transform .15s;
  }
  @keyframes btt-in { from { opacity: 0; transform: scale(.8); } }
</style>
