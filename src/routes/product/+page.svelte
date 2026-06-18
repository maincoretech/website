<script>
  import { products } from '$lib/products.js';
  import { t } from '$lib/i18n/index.js';
</script>

<div id="toc-body">
  <div class="grad-bar grad-bar--toc sec-header">
    <div class="title">Product</div>
    <div class="subtitle">{$t('pages.product.subtitle')}</div>
  </div>

  {#each products as group, gi}
    <div class="toc-section">
      <div class="section-title-box">
        <span class="sec-title-box__title">{group.category}</span>
      </div>
      <div class="section-body">
        {#each group.items as item}
          <p>
            {#if item.link}
              <a href={item.link} target="_blank" rel="noopener noreferrer"><strong>{item.name}</strong></a>
            {:else}
              <strong>{item.name}</strong>
            {/if}
            — {item.desc}
          </p>
        {/each}
      </div>
    </div>
    {#if gi < products.length - 1}
      <div class="divider"></div>
    {/if}
  {/each}
</div>
