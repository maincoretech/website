<script>
  import EChart from './EChart.svelte';

  let {
    items = [],
    max,
    height = '82px',
    ariaLabel = '横向条形图',
    labelWidth = 70,
    valueWidth = 90,
    inset = 8,
    alternate = true
  } = $props();

  const colors = {
    primary: '#6090a0',
    secondary: '#6d91a5',
    text: '#334755',
    muted: '#506473',
    track: 'rgba(51, 71, 85, .09)',
    tooltip: '#d7e4eb'
  };

  const textStyle = {
    color: colors.text,
    fontFamily: 'Lato, Helvetica, Arial, sans-serif'
  };

  let chartMax = $derived(max ?? Math.max(1, ...items.map((item) => item.value)));
  let option = $derived({
    animationDuration: 280,
    animationEasing: 'cubicOut',
    aria: { enabled: true },
    textStyle,
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: colors.tooltip,
      borderWidth: 0,
      textStyle,
      extraCssText: 'border-radius: 6px; box-shadow: none;',
      formatter: ({ data }) => `${data.name}<br><strong>${data.display}</strong>`
    },
    grid: { left: labelWidth, right: valueWidth + 8, top: inset, bottom: inset },
    xAxis: { type: 'value', show: false, max: chartMax },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map((item) => item.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...textStyle, fontSize: 12, margin: 10 }
    },
    series: [
      {
        type: 'bar',
        barWidth: items.length > 3 ? 14 : 15,
        showBackground: true,
        backgroundStyle: { color: colors.track, borderRadius: 3 },
        itemStyle: { borderRadius: 3 },
        data: items.map((item, index) => ({
          value: item.value,
          name: item.label,
          display: item.display,
          itemStyle: {
            color: item.color ?? (alternate && index % 2 ? colors.secondary : colors.primary)
          }
        }))
      }
    ]
  });
</script>

<div class="chart-frame" style={`--chart-inset:${inset}px;--value-width:${valueWidth}px;--item-count:${items.length}`}>
  <EChart {option} {height} {ariaLabel} />
  <div class="chart-values" aria-hidden="true">
    {#each items as item}<span>{item.display}</span>{/each}
  </div>
</div>

<dl class="sr-only">
  {#each items as item}<div>
      <dt>{item.label}</dt>
      <dd>{item.display}</dd>
    </div>{/each}
</dl>

<style>
  .chart-frame {
    position: relative;
    min-width: 0;
  }

  .chart-values {
    position: absolute;
    top: var(--chart-inset);
    right: 4px;
    bottom: var(--chart-inset);
    display: grid;
    width: var(--value-width);
    grid-template-rows: repeat(var(--item-count), minmax(0, 1fr));
    align-items: center;
    justify-items: end;
    color: #506473;
    font: 0.72rem var(--f-m);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
