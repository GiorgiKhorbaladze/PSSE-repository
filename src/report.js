const minOf = (arr) => Math.min(...arr);
const maxOf = (arr) => Math.max(...arr);
const absMaxDeviation = (arr, baseline) => Math.max(...arr.map((v) => Math.abs(v - baseline)));

const flattenChannels = (obj) => Object.entries(obj).map(([name, series]) => ({ name, series }));

const classifyByFrequency = (minFreq) => {
  if (minFreq < 49.5) return "Critical";
  if (minFreq < 49.8) return "Warning";
  return "Stable";
};

const classifyByVoltage = (minVoltage) => {
  if (minVoltage < 0.85) return "Critical";
  if (minVoltage < 0.9) return "Warning";
  return "Stable";
};

const resolveStatus = (freqStatus, voltStatus) => {
  if (freqStatus === "Critical" || voltStatus === "Critical") return "Critical";
  if (freqStatus === "Warning" || voltStatus === "Warning") return "Warning";
  return "Stable";
};

const estimateSettlingTime = (time, frequency, nominal = 50, tol = 0.05) => {
  const start = Math.max(0, time.findIndex((t) => t >= 0.5));
  for (let i = start; i < time.length; i += 1) {
    const rest = frequency.slice(i);
    if (rest.every((f) => Math.abs(f - nominal) <= tol)) return time[i];
  }
  return null;
};

export function computeCaseAnalytics(psseCase) {
  const { time, channels } = psseCase;
  const minFreq = minOf(channels.frequency);
  const maxFreqDev = absMaxDeviation(channels.frequency, 50);

  const voltageValues = flattenChannels(channels.voltage);
  const voltageMins = voltageValues.map((v) => ({ channel: v.name, value: minOf(v.series) }));
  const minVoltageEntry = voltageMins.sort((a, b) => a.value - b.value)[0];

  const pValues = flattenChannels(channels.activePower);
  const qValues = flattenChannels(channels.reactivePower);
  const pBase = pValues.length ? pValues[0].series[0] : 0;
  const qBase = qValues.length ? qValues[0].series[0] : 0;

  const maxPDev = Math.max(...pValues.map((v) => absMaxDeviation(v.series, pBase)));
  const maxQDev = Math.max(...qValues.map((v) => absMaxDeviation(v.series, qBase)));

  const combined = [
    { name: "სიხშირე", series: channels.frequency.map((v) => Math.abs(v - 50)) },
    ...voltageValues.map((v) => ({ name: `ძაბვა:${v.name}`, series: v.series.map((x) => Math.abs(1 - x)) })),
    ...pValues.map((v) => ({ name: `P:${v.name}`, series: v.series.map((x) => Math.abs(x - pBase)) })),
    ...qValues.map((v) => ({ name: `Q:${v.name}`, series: v.series.map((x) => Math.abs(x - qBase)) })),
  ];

  let worstChannel = "-";
  let worstEventIdx = 0;
  let worstMagnitude = -Infinity;
  combined.forEach((c) => {
    const localMax = maxOf(c.series);
    if (localMax > worstMagnitude) {
      worstMagnitude = localMax;
      worstChannel = c.name;
      worstEventIdx = c.series.findIndex((v) => v === localMax);
    }
  });

  const freqStatus = classifyByFrequency(minFreq);
  const voltStatus = classifyByVoltage(minVoltageEntry?.value ?? 1);
  const stability = resolveStatus(freqStatus, voltStatus);

  return {
    minFrequency: minFreq,
    maxFrequencyDeviation: maxFreqDev,
    minVoltage: minVoltageEntry?.value ?? 1,
    minVoltageChannel: minVoltageEntry?.channel ?? "-",
    maxActivePowerDeviation: maxPDev,
    maxReactivePowerDeviation: maxQDev,
    worstChannel,
    worstEventTime: time[worstEventIdx] ?? 0,
    settlingTime: estimateSettlingTime(time, channels.frequency),
    stability,
  };
}

export function generateGeorgianSummary(psseCase, analytics, globalWorstCase) {
  const settlingText = analytics.settlingTime
    ? `${analytics.settlingTime.toFixed(2)} წმ`
    : "დაუზუსტებელი (არ მოხდა სრულად)";

  return `
    <p><strong>${psseCase.caseName}</strong> სცენარში დარღვევის შემდეგ დაფიქსირდა დინამიკური გარდამავალი პროცესი, სადაც სიხშირე და ძაბვა მკვეთრად გადაიხარა ნომინალური მნიშვნელობებიდან.</p>
    <p>მინიმალური სიხშირეა <strong>${analytics.minFrequency.toFixed(3)} Hz</strong>, ხოლო მინიმალური ძაბვა <strong>${analytics.minVoltage.toFixed(3)} p.u.</strong> (${analytics.minVoltageChannel}).</p>
    <p>აღდგენის შეფასებით სისტემა დამშვიდდა დაახლოებით <strong>${settlingText}</strong>-ში. ყველაზე მძიმე არხი იყო <strong>${analytics.worstChannel}</strong>, მოვლენის პიკი დროს <strong>${analytics.worstEventTime.toFixed(2)} წმ</strong>.</p>
    <p>მრავალსცენარიანი ანალიზით ყველაზე მძიმე შემთხვევაა <strong>${globalWorstCase.caseName}</strong>. საბოლოო კლასიფიკაცია: <strong>${analytics.stability}</strong>.</p>
  `;
}

export function rankCases(cases, analyticsMap) {
  const minFreqRanking = [...cases]
    .map((c) => ({ caseName: c.caseName, value: analyticsMap.get(c.caseName).minFrequency }))
    .sort((a, b) => a.value - b.value);

  const minVoltageRanking = [...cases]
    .map((c) => ({ caseName: c.caseName, value: analyticsMap.get(c.caseName).minVoltage }))
    .sort((a, b) => a.value - b.value);

  return { minFreqRanking, minVoltageRanking };
}
