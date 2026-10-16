<script>
  import evidence from '../../../static/benchmarks/resource-archives.json';
  const value = (row, key) => row.metrics[key] ? row.metrics[key].median.toFixed(3) : '未测 / 不适用';
  const span = (row, key) => row.metrics[key].range.map(v => v.toFixed(3)).join('–');
  const columns = [ ['archive_mib', 'MiB'], ['sequential_fresh_ms', '完整读取 · 新会话 ms'], ['random_fresh_2000_4k_ms', '区间 · 新会话 ms'], ['random_reused_2000_4k_ms', '区间 · 复用会话 ms'] ];
</script>

<div class="archive-method">
  <h4>资源包补测 · {evidence.date}</h4>
  <p>{evidence.fixture.groups}，共 624 个文件、28 MiB；全部文件及 2000 次区间读取在计时外逐字节校验。受控组每配置三次进程、每阶段十次采样；{evidence.method.aggregate}。</p>
  <p>{evidence.method.cache}。{evidence.method.order} {evidence.method.build}</p>
  <p>{evidence.method.timing}</p>
  {#each evidence.limitations as note}<p>{note}</p>{/each}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users must be able to scroll the wide table.) -->
  <div class="table-scroll" tabindex="0" role="region" aria-label="资源包精确数值，可横向滚动">
    <table>
      <caption>加密受控组 · 中位数 / 三进程统计范围（非置信区间）；均越低越好</caption>
      <thead><tr><th scope="col">资源包</th>{#each columns as [, label]}<th scope="col">{label}</th>{/each}</tr></thead>
      <tbody>{#each evidence.rows as row}<tr><th scope="row">{row.label}</th>{#each columns as [key]}<td>{value(row, key)}<small>{span(row, key)}</small></td>{/each}</tr>{/each}</tbody>
    </table>
  </div>
  <dl>
    {#each [...evidence.rows, ...evidence.references] as row}
      <div><dt>{#if row.source}<a href={row.source} target="_blank" rel="noopener noreferrer">{row.label} ↗</a>{:else}{row.label}{/if} · {row.version}</dt><dd>{row.protection}。{row.note}。{row.writer}。</dd></div>
    {/each}
  </dl>
  <h4>LGPAK · 历史独立参考，不参与排名</h4>
  <p>原始 JS 导出读器，打开含整包载入；AES-GCM 原始密钥、不含派生。三进程 × 十轮，默认缓存和同一会话；首次轨迹仍为暖文件系统。兼容夹具不代表官方打包性能。</p>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keep keyboard scrolling available at narrow widths.) -->
  <div class="table-scroll" tabindex="0" role="region" aria-label="LGPAK 独立参考数值">
    <table>
      <caption>各项为中位数 / 三进程统计范围，非置信区间；不可与受控组横比</caption>
      <thead><tr><th scope="col">指标</th><th scope="col">数值</th></tr></thead>
      <tbody>{#each evidence.references as row}{#each [['archive_mib', '体积 MiB'], ['open_ms', '原生打开 ms'], ['sequential_ms', '完整读取 ms'], ['first_2000_4k_ms', '首次区间轨迹 ms'], ['random_2000_4k_ms', '区间十轮（含首轮）ms']] as [key, label]}<tr><th scope="row">{label}</th><td>{value(row, key)}<small>{span(row, key)}</small></td></tr>{/each}{/each}</tbody>
    </table>
  </div>
  <h4>未覆盖的发行路径</h4>
  {#each evidence.coverage as entry}
    <p><a href={entry.source} target="_blank" rel="noopener noreferrer">{entry.label} ↗</a> · {entry.status}：{entry.reason}</p>
  {/each}
  <a href="/benchmarks/resource-archives.json" target="_blank" rel="noopener noreferrer">全部进程样本、版本、来源与校验记录 ↗</a>
</div>

<style>
  .archive-method { min-width: 0; }
  h4 { margin: 20px 0 8px; font: inherit; color: #b7ccd8; }
  .table-scroll { max-width: 100%; overflow-x: auto; margin: 16px 0; }
  table { border-collapse: collapse; width: 100%; font: .65rem/1.5 var(--f-b); }
  caption { text-align: left; padding: 8px; color: #94adba; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #314b58; text-align: right; white-space: nowrap; }
  th:first-child { text-align: left; }
  th { font-weight: 400; color: #bfd3de; }
  td small { display: block; color: #8fa6b2; font-size: .9em; }
  dl { margin: 16px 0; }
  dl div { margin: 12px 0; }
  dt { color: #b7ccd8; }
  dd { margin: 4px 0 0; }
</style>
