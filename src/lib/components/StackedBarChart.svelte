<script>
  import EChart from './EChart.svelte';

  let { items = [], total, height = '52px', ariaLabel = '堆叠条形图' } = $props();

  const colors = ['#6090a0', '#8aaab8', '#6d91a5'];
  const textStyle = {
    color: '#334755',
    fontFamily: 'Lato, Helvetica, Arial, sans-serif'
  };

  let chartTotal = $derived(total ?? items.reduce((sum, item) => sum + item.value, 0));
  let option = $derived({
    animationDuration: 320,
    animationEasing: 'cubicOut',
    aria: { enabled: true },
    textStyle,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      confine: true,
      backgroundColor: '#d7e4eb',
      borderWidth: 0,
      textStyle,
      extraCssText: 'border-radius: 6px; box-shadow: none;'
    },
    grid: { left: 4, right: 4, top: 6, bottom: 6 },
    xAxis: { type: 'value', show: false, max: chartTotal },
    yAxis: { type: 'category', show: false, data: ['总量'] },
    series: items.map((item, index) => ({
      name: item.label,
      type: 'bar',
      stack: 'content',
      barWidth: 28,
      itemStyle: {
        color: item.color ?? colors[index % colors.length],
        borderRadius: [
          index === 0 ? 4 : 0,
          index === items.length - 1 ? 4 : 0,
          index === items.length - 1 ? 4 : 0,
          index === 0 ? 4 : 0
        ]
      },
      label: {
        show: true,
        position: 'inside',
        color: index === 0 ? '#f4f8fa' : '#334755',
        fontSize: 11,
        formatter: item.display
      },
      data: [item.value]
    }))
  });
</script>

<EChart {option} {height} {ariaLabel} />

<p class="sr-only">
  {#each items as item}{item.label} {item.display}。{/each}
</p>

<style>
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
