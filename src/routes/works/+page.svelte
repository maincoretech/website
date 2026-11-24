<script>
  import PageMeta from '$lib/site/PageMeta.svelte';
  import Icon from '$lib/studio/Icon.svelte';
  import { pressFeedback } from '$lib/studio/press-feedback.js';
  import './works.css';

  const works = [
    { name: 'Krose', category: 'sample instrument', art: 'krose', href: 'https://github.com/shiftz300/krose' },
    { name: 'Hakutaku', category: 'asset packaging', art: 'hakutaku', href: 'https://github.com/maincoretech/hakutaku' },
    { name: 'Kēne', category: 'visual novel engine', art: 'keine', href: 'https://github.com/maincoretech/keine' },
    { name: 'DiscImage', category: 'cd authoring', art: 'discimage', href: 'https://github.com/shiftz300/discimage' }
  ];
</script>

<PageMeta title="works · maincore" description="Explore maincore's projects and creative tools." />
<div class="studio-page">
  <h1 class="visually-hidden" lang="en">works</h1>
  <ul class="works-grid" role="list">
    {#each works as { name, category, art, href } (name)}
      <li>
        <a {href} class="work-card studio-press" use:pressFeedback>
          <div class="work-caption">
            <h2>{name}</h2>
            <span class="work-category" lang="en">{category}</span>
            <span class="work-arrow"><Icon name="external" size={18} /></span>
          </div>
          <img class="work-art" src="/works/{art}.svg" width="240" height="110" alt="" />
        </a>
      </li>
    {/each}
  </ul>
</div>
