<script>
  import PageMeta from '$lib/site/PageMeta.svelte';
  import Icon from '$lib/studio/Icon.svelte';
  import { pressFeedback } from '$lib/studio/press-feedback.js';
  import { archiveTimeline, timeline } from './timeline.js';
  import './timeline.css';

  const email = 'contact@maincore.work';
  const shortDate = (date) => date.slice(5).replace('-', '.');
</script>

<PageMeta title="about · maincore" description="About maincore, including contact information and the team's history." />
<div class="studio-page">
  <h1 class="visually-hidden" lang="en">about</h1>

  <section class="studio-section-heading studio-contact" aria-labelledby="contact-title">
    <h2 id="contact-title" lang="en">contact</h2>
    <a class="studio-icon-button studio-action studio-press" href={'mailto:' + email} aria-label={email}
      title={email} use:pressFeedback><Icon name="mail" /></a>
  </section>

  <section aria-labelledby="timeline-title">
    <div class="studio-section-heading">
      <h2 id="timeline-title" lang="en">timeline</h2>
      <a class="studio-icon-button studio-action studio-press" href={archiveTimeline} aria-label="MSMP archive"
        title="MSMP archive" lang="en" use:pressFeedback><Icon name="archive" /></a>
    </div>

    <ol class="studio-timeline" role="list" lang="zh-Hans">
      {#each timeline as { year, events } (year)}
        <li>
          <h3 class="timeline-year">{year}</h3>
          <ol class="timeline-entries" role="list" aria-label={year + ' 年事件'}>
            {#each events as { date, end, text, source } (date)}
              <li class="timeline-event">
                <span class="timeline-date">
                  <time datetime={date}>{shortDate(date)}</time>{#if end}–<time datetime={end}>{shortDate(end)}</time>{/if}
                </span>
                <p>{text}{#if source}
                  <a class="timeline-source studio-press" href={source} aria-label="source" title="source"
                    lang="en" use:pressFeedback><Icon name="external" size={16} /></a>
                {/if}</p>
              </li>
            {/each}
          </ol>
        </li>
      {/each}
    </ol>
  </section>
</div>
