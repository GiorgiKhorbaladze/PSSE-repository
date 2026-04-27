const createBaseOption = ({ title, yName, thresholdBands = [], thresholdLines = [] }) => ({
  animation: false,
  tooltip: { trigger: "axis" },
  legend: { top: 4 },
  toolbox: {
    feature: {
      dataZoom: { yAxisIndex: "none" },
      restore: {},
      saveAsImage: {},
    },
  },
  xAxis: { type: "value", name: "t (s)" },
  yAxis: { type: "value", name: yName },
  dataZoom: [
    { type: "inside", xAxisIndex: 0, filterMode: "none" },
    { type: "slider", xAxisIndex: 0, bottom: 0, filterMode: "none" },
  ],
  series: [],
  visualMap: thresholdBands.length
    ? {
        show: false,
        dimension: 1,
        pieces: thresholdBands,
      }
    : undefined,
  markLine: thresholdLines.length
    ? {
        symbol: ["none", "none"],
        label: { formatter: "{b}" },
        lineStyle: { type: "dashed" },
        data: thresholdLines,
      }
    : undefined,
  title: title ? { text: title, left: "center", textStyle: { fontSize: 13, fontWeight: 500 } } : undefined,
});

const lineSeries = (name, time, values, extra = {}) => ({
  name,
  type: "line",
  showSymbol: false,
  smooth: true,
  data: time.map((t, i) => [t, values[i]]),
  ...extra,
});

export function initCharts(ids) {
  const charts = {};
  Object.entries(ids).forEach(([key, id]) => {
    charts[key] = echarts.init(document.getElementById(id));
  });
  window.addEventListener("resize", () => Object.values(charts).forEach((c) => c.resize()));
  return charts;
}

export function updateCharts(charts, currentCase, allCases, rankings, critical, timeWindow) {
  const [tStart, tEnd] = timeWindow;
  const within = (t) => t >= tStart && t <= tEnd;

  const idx = currentCase.time.reduce((acc, t, i) => {
    if (within(t)) acc.push(i);
    return acc;
  }, []);
  const t = idx.map((i) => currentCase.time[i]);

  const f = idx.map((i) => currentCase.channels.frequency[i]);
  const vEntries = Object.entries(currentCase.channels.voltage);
  const pEntries = Object.entries(currentCase.channels.activePower);
  const qEntries = Object.entries(currentCase.channels.reactivePower);

  const freqOpt = createBaseOption({
    yName: "Hz",
    thresholdLines: [
      { yAxis: 49.8, name: "Warning 49.8" },
      { yAxis: 49.5, name: "Critical 49.5" },
    ],
  });
  freqOpt.series = [lineSeries("Frequency", t, f)];
  charts.frequency.setOption(freqOpt, true);

  const voltOpt = createBaseOption({
    yName: "p.u.",
    thresholdLines: [
      { yAxis: 0.9, name: "Warning 0.90" },
      { yAxis: 0.85, name: "Critical 0.85" },
    ],
  });
  voltOpt.series = vEntries.map(([name, arr]) => lineSeries(name, t, idx.map((i) => arr[i])));
  charts.voltage.setOption(voltOpt, true);

  const pOpt = createBaseOption({ yName: "MW" });
  pOpt.series = pEntries.map(([name, arr]) => lineSeries(name, t, idx.map((i) => arr[i])));
  charts.activePower.setOption(pOpt, true);

  const qOpt = createBaseOption({ yName: "Mvar" });
  qOpt.series = qEntries.map(([name, arr]) => lineSeries(name, t, idx.map((i) => arr[i])));
  charts.reactivePower.setOption(qOpt, true);

  const compareOpt = createBaseOption({ yName: "Hz" });
  compareOpt.series = allCases.map((c) => lineSeries(c.caseName, c.time, c.channels.frequency));
  charts.comparison.setOption(compareOpt, true);

  charts.rankFreq.setOption(
    {
      tooltip: { trigger: "axis" },
      xAxis: { type: "value", name: "Hz" },
      yAxis: { type: "category", data: rankings.minFreqRanking.map((r) => r.caseName) },
      series: [{ type: "bar", data: rankings.minFreqRanking.map((r) => r.value), itemStyle: { color: "#c1121f" } }],
    },
    true,
  );

  charts.rankVoltage.setOption(
    {
      tooltip: { trigger: "axis" },
      xAxis: { type: "value", name: "p.u." },
      yAxis: { type: "category", data: rankings.minVoltageRanking.map((r) => r.caseName) },
      series: [{ type: "bar", data: rankings.minVoltageRanking.map((r) => r.value), itemStyle: { color: "#374151" } }],
    },
    true,
  );

  charts.critical.setOption(
    {
      tooltip: { trigger: "axis" },
      legend: { top: 0 },
      toolbox: { feature: { restore: {}, saveAsImage: {}, dataZoom: { yAxisIndex: "none" } } },
      dataZoom: [{ type: "inside" }, { type: "slider" }],
      xAxis: { type: "value", name: "t (s)" },
      yAxis: { type: "value", name: "Magnitude" },
      series: [lineSeries(critical.name, critical.time, critical.values)],
    },
    true,
  );
}
