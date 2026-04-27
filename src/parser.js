import { demoCases } from "./demo-data.js";

const pickDemoTemplate = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("critical") || lower.includes("trip")) return demoCases[2];
  if (lower.includes("fault") || lower.includes("line")) return demoCases[1];
  return demoCases[0];
};

const cloneCaseWithName = (template, caseName) => ({
  ...structuredClone(template),
  caseName,
});

export async function parseOutFile(file) {
  // Placeholder interface for future real binary parser integration.
  // parseOutFile(file) => { caseName, time, channels: { frequency, voltage, activePower, reactivePower, speed, angle } }
  const base = file.name.replace(/\.out$/i, "") || "UNNAMED_CASE";
  const template = pickDemoTemplate(base);
  return cloneCaseWithName(template, base);
}

export async function parseZipFile(file) {
  const zip = await JSZip.loadAsync(file);
  const outEntries = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".out"));

  const parsed = [];
  for (const entry of outEntries) {
    const pseudoFile = { name: entry.name.split("/").pop() || entry.name };
    parsed.push(await parseOutFile(pseudoFile));
  }
  return parsed;
}

export const parserInfo = {
  binaryReady: false,
  message: "Binary .out parser module is prepared; demo mode is active.",
};
