<script>
  import evidence from '../../../static/benchmarks/resource-archives.json';
  const value = (row, key) => row.metrics[key] ? row.metrics[key].median.toFixed(3) : '未测 / 不适用';
</script>

<div class="archive-method">
  <h4>资源包补测 · {evidence.date}</h4>
  <p>{evidence.fixture.groups}，共 624 个文件、28 MiB；全部文件在计时外逐字节校验。每格式三次进程、每阶段十次采样；{evidence.method.aggregate}。打包耗时仅每进程一次，不与十轮读取统计混淆。</p>
  <p>{evidence.method.cache}。{evidence.method.order} {evidence.method.build}</p>
  {#each evidence.limitations as note}<p>{note}</p>{/each}
  <div class="table-scroll" tabindex="0" role="region" aria-label="资源包精确数值，可横向滚动">
    <table>
      <caption>体积 / 耗时均越低越好；不同保护与缓存策略需结合说明阅读</caption>
      <thead><tr><th scope="col">资源包</th><th scope="col">MiB</th><th scope="col">打开 ms</th><th scope="col">完整读取 ms</th><th scope="col">首次区间 ms</th><th scope="col">十轮区间 ms</th><th scope="col">随机整文件 ms</th></tr></thead>
      <tbody>{#each evidence.rows as row}<tr><th scope="row">{row.label}</th><td>{value(row, 'archive_mib')}</td><td>{value(row, 'open_ms')}</td><td>{value(row, 'sequential_ms')}</td><td>{value(row, 'first_2000_4k_ms')}</td><td>{value(row, 'random_2000_4k_ms')}</td><td>{value(row, 'random_2000_full_file_ms')}</td></tr>{/each}</tbody>
    </table>
  </div>
  <dl>
    {#each evidence.rows as row}
      <div><dt>{#if row.source}<a href={row.source} target="_blank" rel="noopener noreferrer">{row.label} ↗</a>{:else}{row.label}{/if} · {row.version}</dt><dd>{row.protection}。{row.note}。{row.writer}。</dd></div>
    {/each}
  </dl>
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
  dl { margin: 16px 0; }
  dl div { margin: 12px 0; }
  dt { color: #b7ccd8; }
  dd { margin: 4px 0 0; }
</style>
