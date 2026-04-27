const buildCase = (caseName, settings) => {
  const time = [];
  const frequency = [];
  const voltageBus1 = [];
  const voltageBus2 = [];
  const pGen1 = [];
  const pGen2 = [];
  const qGen1 = [];
  const qGen2 = [];

  for (let t = 0; t <= 20; t += 0.1) {
    const tt = Number(t.toFixed(1));
    time.push(tt);

    const decay = Math.exp(-(tt - settings.eventTime) * settings.damping);
    const kicked = tt >= settings.eventTime ? 1 : 0;
    const wave = kicked * Math.sin((tt - settings.eventTime) * settings.omega);

    frequency.push(50 - kicked * settings.freqDrop * decay + wave * settings.freqOsc);
    voltageBus1.push(1 - kicked * settings.voltageDip * decay + wave * settings.voltageOsc);
    voltageBus2.push(1 - kicked * settings.voltageDip * 0.85 * decay + wave * settings.voltageOsc * 1.1);
    pGen1.push(settings.pBase - kicked * settings.pDrop * decay + wave * settings.pOsc);
    pGen2.push(settings.pBase * 0.9 - kicked * settings.pDrop * 0.7 * decay + wave * settings.pOsc * 0.8);
    qGen1.push(settings.qBase + kicked * settings.qSwing * decay + wave * settings.qOsc);
    qGen2.push(settings.qBase * 0.8 + kicked * settings.qSwing * 0.75 * decay + wave * settings.qOsc * 1.2);
  }

  return {
    caseName,
    eventTime: settings.eventTime,
    time,
    channels: {
      frequency,
      voltage: {
        "BUS-1": voltageBus1,
        "BUS-2": voltageBus2,
      },
      activePower: {
        "GEN-1": pGen1,
        "GEN-2": pGen2,
      },
      reactivePower: {
        "GEN-1": qGen1,
        "GEN-2": qGen2,
      },
      speed: {},
      angle: {},
    },
  };
};

export const demoCases = [
  buildCase("DEMO_N-1", {
    eventTime: 1,
    damping: 0.45,
    omega: 2.2,
    freqDrop: 0.38,
    freqOsc: 0.08,
    voltageDip: 0.12,
    voltageOsc: 0.03,
    pBase: 540,
    pDrop: 120,
    pOsc: 16,
    qBase: 90,
    qSwing: 55,
    qOsc: 8,
  }),
  buildCase("DEMO_LINE_FAULT", {
    eventTime: 0.8,
    damping: 0.30,
    omega: 2.5,
    freqDrop: 0.55,
    freqOsc: 0.11,
    voltageDip: 0.18,
    voltageOsc: 0.05,
    pBase: 560,
    pDrop: 180,
    pOsc: 22,
    qBase: 95,
    qSwing: 78,
    qOsc: 12,
  }),
  buildCase("DEMO_CRITICAL_GEN_TRIP", {
    eventTime: 1.1,
    damping: 0.22,
    omega: 1.8,
    freqDrop: 0.78,
    freqOsc: 0.14,
    voltageDip: 0.24,
    voltageOsc: 0.07,
    pBase: 575,
    pDrop: 245,
    pOsc: 30,
    qBase: 100,
    qSwing: 102,
    qOsc: 16,
  }),
];
