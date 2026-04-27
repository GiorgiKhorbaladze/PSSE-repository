import { demoCases } from "./demo-data.js";
import { parseOutFile, parseZipFile, parserInfo } from "./parser.js";
import { initCharts, updateCharts } from "./charts.js";
import { computeCaseAnalytics, generateGeorgianSummary, rankCases } from "./report.js";

const state = {
  cases: [...demoCases],
  analytics: new Map(),
  selectedCaseName: demoCases[0].caseName,
  timeWindow: [0, 20],
};

const ids = {
  frequency: "chart-frequency",
  voltage: "chart-voltage",
  activePower: "chart-p",
  reactivePower: "chart-q",
  comparison: "chart-compare",
  rankFreq: "chart-rank-f",
  rankVoltage: "chart-rank-v",
  critical: "chart-critical",
};

const elements = {
  parserStatusBadge: document.getElementById("parserStatusBadge"),
  parserMessage: document.getElementById("parserMessage"),
  fileInput: document.getElementById("fileInput"),
  fileList: document.getElementById("fileList"),
  parseStatus: document.getElementById("parseStatus"),
  scenarioSelect: document.getElementById("scenarioSelect"),
  timeStart: document.getElementById("timeStart"),
  timeEnd: document.getElementById("timeEnd"),
  applyTimeWindow: document.getElementById("applyTimeWindow"),
  kpiGrid: document.getElementById("kpiGrid"),
  reportSummary: document.getElementById("reportSummary"),
};

const charts = initCharts(ids);

function computeAllAnalytics() {
  state.analytics.clear();
  state.cases.forEach((c) => state.analytics.set(c.caseName, computeCaseAnalytics(c)));
}

function getCurrentCase() {
  return state.cases.find((c) => c.caseName === state.selectedCaseName) ?? state.cases[0];
}

function getGlobalWorstCase() {
  return [...state.cases]
    .map((c) => ({ caseName: c.caseName, minFreq: state.analytics.get(c.caseName).minFrequency }))
    .sort((a, b) => a.minFreq - b.minFreq)[0];
}

function getCriticalTimeline(psseCase) {
  const a = state.analytics.get(psseCase.caseName);
  if (!a.worstChannel.startsWith("ძაბვა")) {
    return {
      name: `${psseCase.caseName} | ${a.worstChannel}`,
      time: psseCase.time,
      values: psseCase.channels.frequency.map((v) => Math.abs(v - 50)),
    };
  }

  const key = a.worstChannel.split(":")[1];
  const values = psseCase.channels.voltage[key] || psseCase.channels.frequency;
  return {
    name: `${psseCase.caseName} | ${a.worstChannel}`,
    time: psseCase.time,
    values: values.map((v) => Math.abs(1 - v)),
  };
}

function renderFileList(files) {
  elements.fileList.innerHTML = "";
  files.forEach((f) => {
    const li = document.createElement("li");
    li.textContent = `${f.name}`;
    elements.fileList.appendChild(li);
  });
}

function renderScenarioSelect() {
  elements.scenarioSelect.innerHTML = "";
  state.cases.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.caseName;
    opt.textContent = c.caseName;
    if (c.caseName === state.selectedCaseName) opt.selected = true;
    elements.scenarioSelect.appendChild(opt);
  });
}

function statusClass(stability) {
  return `kpi-status-${stability.toLowerCase()}`;
}

function renderKpis(analytics) {
  const rows = [
    ["მინ. სიხშირე", `${analytics.minFrequency.toFixed(3)} Hz`],
    ["მაქს. Δf", `${analytics.maxFrequencyDeviation.toFixed(3)} Hz`],
    ["მინ. ძაბვა", `${analytics.minVoltage.toFixed(3)} p.u.`],
    ["მაქს. ΔP", `${analytics.maxActivePowerDeviation.toFixed(2)} MW`],
    ["მაქს. ΔQ", `${analytics.maxReactivePowerDeviation.toFixed(2)} Mvar`],
    ["ყველაზე ცუდი არხი", analytics.worstChannel],
    ["ყველაზე მძიმე დრო", `${analytics.worstEventTime.toFixed(2)} წმ`],
    ["დამშვიდების დრო", analytics.settlingTime ? `${analytics.settlingTime.toFixed(2)} წმ` : "N/A"],
    ["სტაბილურობის სტატუსი", analytics.stability],
  ];

  elements.kpiGrid.innerHTML = rows
    .map(
      ([label, value]) => `
      <article class="card kpi">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value ${label === "სტაბილურობის სტატუსი" ? statusClass(value) : ""}">${value}</div>
      </article>
    `,
    )
    .join("");
}

function renderAll() {
  if (!state.cases.length) return;
  computeAllAnalytics();
  renderScenarioSelect();

  const currentCase = getCurrentCase();
  const analytics = state.analytics.get(currentCase.caseName);
  const rankings = rankCases(state.cases, state.analytics);
  const globalWorst = getGlobalWorstCase();

  renderKpis(analytics);
  elements.reportSummary.innerHTML = generateGeorgianSummary(currentCase, analytics, globalWorst);

  const minTime = currentCase.time[0];
  const maxTime = currentCase.time[currentCase.time.length - 1];
  elements.timeStart.value = state.timeWindow[0] ?? minTime;
  elements.timeEnd.value = state.timeWindow[1] ?? maxTime;

  updateCharts(charts, currentCase, state.cases, rankings, getCriticalTimeline(currentCase), state.timeWindow);
}

async function handleFiles(files) {
  const list = [...files];
  if (!list.length) return;
  renderFileList(list);

  const parsedCases = [];
  elements.parseStatus.textContent = "სტატუსი: ფაილების დამუშავება...";

  for (const file of list) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      const fromZip = await parseZipFile(file);
      parsedCases.push(...fromZip);
    } else if (file.name.toLowerCase().endsWith(".out")) {
      parsedCases.push(await parseOutFile(file));
    }
  }

  if (parsedCases.length) {
    state.cases = parsedCases;
    state.selectedCaseName = parsedCases[0].caseName;
    const mx = parsedCases[0].time[parsedCases[0].time.length - 1];
    state.timeWindow = [0, mx];
    elements.parseStatus.textContent = `სტატუსი: წარმატებით დამუშავდა ${parsedCases.length} სცენარი.`;
  } else {
    elements.parseStatus.textContent = "სტატუსი: .out ფაილები ვერ მოიძებნა.";
  }

  renderAll();
}

function bindEvents() {
  elements.fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
  elements.scenarioSelect.addEventListener("change", (e) => {
    state.selectedCaseName = e.target.value;
    renderAll();
  });
  elements.applyTimeWindow.addEventListener("click", () => {
    const start = Number(elements.timeStart.value);
    const end = Number(elements.timeEnd.value);
    if (Number.isFinite(start) && Number.isFinite(end) && start < end) {
      state.timeWindow = [start, end];
      renderAll();
    }
  });
}

function init() {
  elements.parserMessage.textContent = parserInfo.message;
  elements.parserStatusBadge.textContent = parserInfo.binaryReady ? "ბინარული პარსერი აქტიურია" : "დემო რეჟიმი აქტიურია";
  bindEvents();
  renderAll();
}

init();
