import { BarChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

use([BarChart, GridComponent, TooltipComponent, AriaComponent, SVGRenderer]);

export function initSvgChart(host) {
  return init(host, null, { renderer: 'svg' });
}
