// Pure functions: these calculations can be tested without a database.
const RULE_CODES = [
  "cpu-socket",
  "ram-type",
  "ram-capacity",
  "ram-slots",
  "case-form-factor",
  "gpu-clearance",
  "cooler-socket",
  "cooler-clearance",
  "psu-form-factor",
  "storage-ports",
];
const norm = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const number = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
function priceSummary(build, items) {
  const lines = items.map((i) => ({
    componentId: String(i.componentId._id),
    name: i.componentId.name,
    quantity: i.quantity,
    unitPrice: i.componentId.price,
    subtotal: round(i.componentId.price * i.quantity),
  }));
  const total = round(lines.reduce((sum, i) => sum + i.subtotal, 0));
  return {
    currency: "PHP",
    lines,
    total,
    budget: build.budget,
    remaining: round(build.budget - total),
    overBudget: total > build.budget,
    overBy: round(Math.max(0, total - build.budget)),
  };
}
function compatibility(items, rules) {
  const parts = (type) =>
    items.filter((i) => i.componentId.categoryId?.slug === type);
  const one = (type) => parts(type)[0]?.componentId.specs;
  const cpu = one("cpu"),
    board = one("motherboard"),
    box = one("case"),
    cooler = one("cpu-cooler"),
    psu = one("psu");
  const checks = [];
  const enabled = new Set(rules.filter((r) => r.enabled).map((r) => r.code));
  const add = (code, known, pass, message) =>
    checks.push({
      code,
      status: !enabled.has(code) || !known ? "unknown" : pass ? "pass" : "fail",
      message: !enabled.has(code)
        ? "Rule missing or disabled"
        : !known
          ? "Required parts or specifications are missing"
          : message,
    });
  add(
    "cpu-socket",
    !!cpu?.socket && !!board?.socket,
    norm(cpu?.socket) === norm(board?.socket),
    "CPU and motherboard sockets must match. BIOS support still needs manufacturer verification.",
  );
  const ram = parts("ram");
  add(
    "ram-type",
    !!board?.memoryType &&
      ram.length > 0 &&
      ram.every((i) => i.componentId.specs.memoryType),
    ram.every((i) => i.componentId.specs.memoryType === board?.memoryType),
    "All RAM kits must use the motherboard memory generation.",
  );
  const capacityKnown =
    ram.length > 0 &&
    ram.every((i) => number(i.componentId.specs.capacityGB)) &&
    number(board?.maxRamGB);
  const totalGB = ram.reduce(
    (n, i) => n + (i.componentId.specs.capacityGB || 0) * i.quantity,
    0,
  );
  add(
    "ram-capacity",
    capacityKnown,
    totalGB <= board?.maxRamGB,
    `Selected RAM: ${totalGB} GB; motherboard limit: ${board?.maxRamGB ?? "?"} GB. Capacity is per kit.`,
  );
  const slotKnown =
    ram.length > 0 &&
    ram.every(
      (i) =>
        Number.isInteger(i.componentId.specs.modules) &&
        i.componentId.specs.modules > 0,
    ) &&
    number(board?.ramSlots);
  const modules = ram.reduce(
    (n, i) => n + (i.componentId.specs.modules || 0) * i.quantity,
    0,
  );
  add(
    "ram-slots",
    slotKnown,
    modules <= board?.ramSlots,
    `Selected RAM modules: ${modules}; slots: ${board?.ramSlots ?? "?"}.`,
  );
  add(
    "case-form-factor",
    !!board?.formFactor && !!box?.supportedFormFactors?.length,
    box?.supportedFormFactors?.some((v) => norm(v) === norm(board?.formFactor)),
    "Case must support the motherboard form factor.",
  );
  const gpu = parts("gpu");
  add(
    "gpu-clearance",
    gpu.length > 0 &&
      gpu.every((i) => number(i.componentId.specs.lengthMm)) &&
      number(box?.maxGpuLengthMm),
    gpu.every((i) => i.componentId.specs.lengthMm <= box?.maxGpuLengthMm),
    "GPU length must fit the case; radiator interference is not modeled.",
  );
  add(
    "cooler-socket",
    !!cpu?.socket && !!cooler?.supportedSockets?.length,
    cooler?.supportedSockets?.some((s) => norm(s) === norm(cpu?.socket)),
    "Cooler mounting kit must support the CPU socket.",
  );
  add(
    "cooler-clearance",
    number(cooler?.heightMm) && number(box?.maxCoolerHeightMm),
    cooler?.heightMm <= box?.maxCoolerHeightMm,
    "Air cooler height must fit the case. Liquid coolers are not modeled.",
  );
  add(
    "psu-form-factor",
    !!psu?.formFactor && !!box?.supportedPsuFormFactors?.length,
    box?.supportedPsuFormFactors?.some(
      (s) => norm(s) === norm(psu?.formFactor),
    ),
    "Case must support the PSU form factor.",
  );
  const drives = parts("storage");
  const storageKnown =
    drives.length > 0 &&
    drives.every((i) =>
      ["SATA", "NVMe"].includes(i.componentId.specs.interface),
    ) &&
    number(board?.sataPorts) &&
    number(board?.m2Slots);
  const sata = drives
    .filter((i) => i.componentId.specs.interface === "SATA")
    .reduce((n, i) => n + i.quantity, 0);
  const nvme = drives
    .filter((i) => i.componentId.specs.interface === "NVMe")
    .reduce((n, i) => n + i.quantity, 0);
  add(
    "storage-ports",
    storageKnown,
    sata <= board?.sataPorts && nvme <= board?.m2Slots,
    `SATA drives: ${sata}; NVMe drives: ${nvme}. Shared lanes and drive dimensions need manual verification.`,
  );
  const missing = [
    "cpu",
    "motherboard",
    "ram",
    "storage",
    "psu",
    "case",
    "cpu-cooler",
  ].filter((t) => !parts(t).length);
  if (!gpu.length && cpu?.integratedGraphics !== true)
    missing.push("gpu (or CPU with confirmed integrated graphics)");
  return {
    status: checks.some((c) => c.status === "fail")
      ? "incompatible"
      : missing.length || checks.some((c) => c.status === "unknown")
        ? "needs-review"
        : "passes-modeled-checks",
    missingCategories: missing,
    checks,
    limitations: [
      "Not a guarantee of compatibility. Check manufacturer CPU/BIOS lists, connectors, RAM QVL, PCIe lanes and physical dimensions.",
      "No discrete GPU yields unknown GPU clearance, even when integrated graphics is available.",
    ],
  };
}
function powerSummary(items) {
  const consumers = items.filter(
    (i) => i.componentId.categoryId?.slug !== "psu",
  );
  const missing = consumers
    .filter((i) => !number(i.componentId.specs.powerWatts))
    .map((i) => i.componentId.name);
  const knownSubtotal = consumers.reduce(
    (sum, i) =>
      sum +
      (number(i.componentId.specs.powerWatts)
        ? i.componentId.specs.powerWatts
        : 0) *
        i.quantity,
    0,
  );
  const complete = consumers.length > 0 && !missing.length;
  const suggested = complete
    ? Math.ceil((knownSubtotal * 1.3) / 50) * 50
    : null;
  const selected = items.find((i) => i.componentId.categoryId?.slug === "psu")
    ?.componentId.specs.wattage;
  return {
    estimatedWatts: complete ? round(knownSubtotal) : null,
    knownSubtotalWatts: round(knownSubtotal),
    missingPowerData: missing,
    headroomPercent: 30,
    suggestedMinimumWatts: suggested,
    selectedPsuWatts: selected ?? null,
    status:
      !complete || !number(selected)
        ? "unknown"
        : selected >= suggested
          ? "sufficient-estimate"
          : "below-estimate",
    note: "Educational estimate from catalog powerWatts plus 30% headroom, rounded up to 50 W. Verify manufacturer PSU advice and connectors.",
  };
}
function comparison(a, b) {
  return {
    left: {
      build: a.build,
      pricing: priceSummary(a.build, a.items),
      power: powerSummary(a.items),
    },
    right: {
      build: b.build,
      pricing: priceSummary(b.build, b.items),
      power: powerSummary(b.items),
    },
    priceDifference: round(
      priceSummary(b.build, b.items).total -
        priceSummary(a.build, a.items).total,
    ),
    note: "Positive priceDifference means the right build costs more. No FPS or performance scores are inferred.",
  };
}

module.exports = {
  RULE_CODES,
  priceSummary,
  compatibility,
  powerSummary,
  comparison,
};
