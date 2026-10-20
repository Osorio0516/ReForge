// Compatibility with the command from the earlier walkthrough.
const mongoose = require("mongoose");
const { connectDatabase } = require("./src/config/database");
const { setup } = require("./src/setup");
async function main() {
  try {
    await connectDatabase();
    await setup();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
main();
