const mongoose = require("mongoose");
const { connectDatabase } = require("./config/database.js");
const { setup } = require("./setup.js");
const { Category, Component, Build, BuildItem } = require("./models/index.js");
const demoParts = [
  [
    "DEMO-CPU-A",
    "Demo AM5 Processor",
    "cpu",
    9000,
    { socket: "AM5", powerWatts: 90, integratedGraphics: true },
  ],
  [
    "DEMO-BOARD-A",
    "Demo AM5 DDR5 Board",
    "motherboard",
    7000,
    {
      socket: "AM5",
      memoryType: "DDR5",
      maxRamGB: 128,
      ramSlots: 4,
      formFactor: "mATX",
      sataPorts: 4,
      m2Slots: 2,
      powerWatts: 40,
    },
  ],
  [
    "DEMO-RAM-A",
    "Demo DDR5 32 GB Kit (2 x 16)",
    "ram",
    4000,
    { memoryType: "DDR5", capacityGB: 32, modules: 2, powerWatts: 10 },
  ],
  [
    "DEMO-GPU-A",
    "Demo Graphics Card",
    "gpu",
    14000,
    { lengthMm: 250, powerWatts: 160 },
  ],
  [
    "DEMO-SSD-A",
    "Demo NVMe 1 TB",
    "storage",
    3000,
    { capacityGB: 1000, interface: "NVMe", powerWatts: 8 },
  ],
  [
    "DEMO-PSU-A",
    "Demo 650 W ATX PSU",
    "psu",
    3500,
    { wattage: 650, formFactor: "ATX" },
  ],
  [
    "DEMO-CASE-A",
    "Demo mATX Case",
    "case",
    2500,
    {
      supportedFormFactors: ["mATX", "Mini-ITX"],
      supportedPsuFormFactors: ["ATX"],
      maxGpuLengthMm: 320,
      maxCoolerHeightMm: 165,
      powerWatts: 6,
    },
  ],
  [
    "DEMO-COOLER-A",
    "Demo AM5 Air Cooler",
    "cpu-cooler",
    1500,
    { supportedSockets: ["AM5"], heightMm: 155, powerWatts: 3 },
  ],
  [
    "DEMO-RAM-B",
    "Demo DDR4 16 GB Kit",
    "ram",
    2000,
    { memoryType: "DDR4", capacityGB: 16, modules: 2, powerWatts: 8 },
  ],
  [
    "DEMO-CPU-B",
    "Demo Different Socket Processor",
    "cpu",
    7500,
    { socket: "LGA1700", powerWatts: 100, integratedGraphics: false },
  ],
  [
    "DEMO-PSU-B",
    "Demo Low Power 300 W PSU",
    "psu",
    1200,
    { wattage: 300, formFactor: "ATX" },
  ],
  [
    "DEMO-GPU-B",
    "Demo Oversized Graphics Card",
    "gpu",
    20000,
    { lengthMm: 360, powerWatts: 250 },
  ],
  [
    "DEMO-SSD-B",
    "Demo SATA 500 GB",
    "storage",
    1500,
    { capacityGB: 500, interface: "SATA", powerWatts: 5 },
  ],
  ["DEMO-RAM-C", "Demo RAM With Incomplete Specs", "ram", 1800, {}],
];
async function seed() {
  await setup();
  for (const [sku, name, slug, price, specs] of demoParts) {
    if (await Component.exists({ sku })) continue;
    const category = await Category.findOne({ slug });
    await Component.create({
      sku,
      name,
      brand: "Demo Parts",
      categoryId: category._id,
      price,
      specs,
      description:
        "Fictional teaching data. Prices and specifications are not market claims.",
    });
  }
  await mongoose.connection.transaction(async (session) => {
    const name = "Demo Starter Build";
    if (await Build.exists({ name }).session(session)) return;
    const build = new Build({
      name,
      budget: 50000,
      notes: "Fictional demonstration build; edit to test compatibility.",
    });
    await build.save({ session });
    for (const [sku] of demoParts.slice(0, 8)) {
      const component = await Component.findOne({ sku }).session(session);
      await new BuildItem({
        buildId: build._id,
        componentId: component._id,
        quantity: 1,
      }).save({ session });
    }
  });
  console.log(
    "Demo seed complete: 14 fictional parts and one starter build. Existing records preserved.",
  );
}
if (require.main === module) {
  (async () => {
    try {
      await connectDatabase();
      await seed();
    } catch (e) {
      console.error("Seed failed:", e.message);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}

module.exports = { demoParts, seed };
