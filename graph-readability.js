(() => {
  const GRAPH_PALETTE = [
    '#7C3AED', '#DB2777', '#0891B2', '#059669', '#D97706', '#4F46E5',
    '#BE123C', '#0284C7', '#65A30D', '#C026D3', '#2563EB', '#EA580C'
  ];

  function makeSolidGradient(ctx, area, base, isMin, isOver){
    const g = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    if (isOver) {
      g.addColorStop(0, '#E11D48');
      g.addColorStop(1, '#FB7185');
      return g;
    }
    if (isMin) {
      g.addColorStop(0, '#BE123C');
      g.addColorStop(1, '#FB7185');
      return g;
    }
    g.addColorStop(0, base);
    g.addColorStop(1, base);
    return g;
  }

  function applyGraphReadability(){
    if (!document.body.classList.contains('theme-kiraki')) return;
    if (typeof chart === 'undefined' || !chart) return;

    const dataset = chart.data?.datasets?.[0];
    if (!dataset) return;
    const values = dataset.data || [];
    const minValue = values.length ? Math.min(...values) : null;

    dataset.backgroundColor = (context) => {
      const area = context.chart.chartArea;
      const index = context.dataIndex || 0;
      const base = GRAPH_PALETTE[index % GRAPH_PALETTE.length];
      if (!area) return base;
      const rec = context.chart?.config?._config?.data?._kirakiSeries?.[index]?.record;
      const value = values[index];
      const over = rec && Number(String(rec.clear_seconds_left || '').replace(/[^0-9.-]/g, '')) < 0;
      return makeSolidGradient(context.chart.ctx, area, base, value === minValue, over);
    };
    dataset.borderColor = values.map((value, index) => value === minValue ? '#9F1239' : GRAPH_PALETTE[index % GRAPH_PALETTE.length]);
    dataset.borderWidth = 1.8;

    const options = chart.options || {};
    if (options.scales?.x?.ticks) {
      options.scales.x.ticks.color = '#24172F';
      options.scales.x.ticks.padding = 8;
      options.scales.x.ticks.font = { family: 'Jua', size: currentView === 'fit' ? 10 : 12, weight: '800' };
    }
    if (options.scales?.y?.ticks) {
      options.scales.y.ticks.color = '#3B3048';
      options.scales.y.ticks.padding = 10;
      options.scales.y.ticks.font = { family: 'Gowun Dodum', size: currentView === 'fit' ? 11 : 12, weight: '800' };
    }
    if (options.scales?.y?.grid) {
      options.scales.y.grid.color = 'rgba(59,48,72,.16)';
    }
    if (options.layout) {
      options.layout.padding = { left: 10, right: 12, top: 8, bottom: 2 };
    } else {
      options.layout = { padding: { left: 10, right: 12, top: 8, bottom: 2 } };
    }
    chart.update('none');
  }

  function patchRenderChart(){
    if (typeof renderChart !== 'function' || renderChart.__kirakiGraphPatched) return;
    const original = renderChart;
    renderChart = function(records){
      original(records);
      try {
        if (typeof chart !== 'undefined' && chart) {
          chart.data._kirakiSeries = makeJobSeries(records);
          chart.config._config.data._kirakiSeries = chart.data._kirakiSeries;
        }
      } catch (_) {}
      applyGraphReadability();
    };
    renderChart.__kirakiGraphPatched = true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    patchRenderChart();
    applyGraphReadability();
    document.addEventListener('click', () => setTimeout(applyGraphReadability, 80));
    document.addEventListener('change', () => setTimeout(applyGraphReadability, 80));
    document.addEventListener('input', () => setTimeout(applyGraphReadability, 120));
    new MutationObserver(() => setTimeout(applyGraphReadability, 80)).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  });
  window.addEventListener('load', () => {
    patchRenderChart();
    applyGraphReadability();
    setTimeout(applyGraphReadability, 500);
  });
})();
