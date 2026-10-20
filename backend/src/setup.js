const mongoose = require("mongoose");
const { connectDatabase } = require("./config/database.js");
const {
  models,
  Category,
  CompatibilityRule,
  RULES,
} = require("./models/index.js");
async function setup() {
  for (const Model of models) await Model.init();
  const categories = [
    ["CPU", "cpu"],
    ["Motherboard", "motherboard"],
    ["RAM", "ram"],
    ["GPU", "gpu"],
    ["Storage", "storage"],
    ["Power Supply", "psu"],
    ["Case", "case"],
    ["CPU Cooler", "cpu-cooler"],
  ];
  for (const [name, slug] of categories)
    await Category.updateOne(
      { slug },
      { $setOnInsert: { name, slug } },
      { upsert: true, runValidators: true },
    );
  for (const code of RULES)
    await CompatibilityRule.updateOne(
      { code },
      {
        $setOnInsert: {
          code,
          name: code.replaceAll("-", " "),
          description:
            "Built-in educational compatibility check; see README limitations.",
          enabled: true,
        },
      },
      { upsert: true, runValidators: true },
    );
  console.log(
    "Five collections, eight categories and ten rules are ready. Existing records preserved.",
  );
}
if (require.main === module) {
  (async () => {
    try {
      await connectDatabase();
      await setup();
    } catch (e) {
      console.error("Setup failed:", e.message);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}

module.exports = { setup };
