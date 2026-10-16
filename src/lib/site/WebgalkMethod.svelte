<script>
  import evidence from '../../../static/benchmarks/webgalk-native.json';
  const labels = { idle: '静态对白', motion: '连续位移', audio: 'BGM', mix: 'BGM + 环境音' };
</script>

<div class="webgalk-method">
  <h4>WebGAL_k 补测 · {evidence.date}</h4>
  <p>{evidence.version} / {evidence.commit.slice(0, 7)}，release 原生应用。960 × 540 CSS、DPR 2，物理 1920 × 1080。{evidence.method}</p>
  {#each evidence.limitations as note}<p>{note}</p>{/each}
  <div class="table-scroll" tabindex="0" role="region" aria-label="WebGAL_k 负载精确数据">
    <table><thead><tr><th scope="col">负载</th><th scope="col">CPU % ↓</th><th scope="col">RSS MiB ↓</th></tr></thead>
      <tbody>{#each evidence.workloads as row}<tr><th scope="row">{labels[row.name]}</th><td>{row.cpu_percent.toFixed(2)}</td><td>{row.rss_mib.toFixed(1)}</td></tr>{/each}</tbody>
    </table>
  </div>
  <p>内置 hexz 另用 624 个合成文件、28 MiB 负载，暖文件系统缓存；三次进程、每阶段十次，取进程中位数的中位数。Rust 1.96.0 / opt-level=z，不与 Hakutaku 栏目的 Rust 1.99.0 / opt-level=3 归档结果归因比较。整文件随机读取不等同 4 KiB seek；密码打开包含 KDF。</p>
  <p>现有 parser 25 项、内置读器新增 7 项、hexz 17 项通过。{evidence.tests.detail} 此处不是“全部测试通过”的声明。</p>
  <p>GPU 与呈现帧间隔未测：{evidence.unavailable.frame_time}。</p>
  <a href={evidence.source} target="_blank" rel="noopener noreferrer">本次 WebGAL_k 源码版本 ↗</a>
  <a href="/benchmarks/webgalk-native.json" target="_blank" rel="noopener noreferrer">原生窗口与内置读器原始样本 ↗</a>
</div>

<style>
  h4 { margin: 20px 0 8px; font: inherit; color: #b7ccd8; }
  .table-scroll { max-width: 100%; overflow-x: auto; margin: 12px 0; }
  table { border-collapse: collapse; width: 100%; font: .7rem/1.5 var(--f-b); }
  th, td { padding: 8px 10px; border-bottom: 1px solid #314b58; text-align: right; white-space: nowrap; }
  th:first-child { text-align: left; }
  th { font-weight: 400; color: #bfd3de; }
  a { margin-right: 18px; }
</style>
