require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app.js");
const { connectDatabase } = require("./config/database.js");
async function startServer() {
  try {
    await connectDatabase();
    const port = Number(process.env.PORT || 5000);
    const host = process.env.HOST || "127.0.0.1";
    const server = app.listen(port, host, () =>
      console.log(`PC Builder API: http://${host}:${port}/api/health`),
    );
    server.on("error", async (error) => {
      console.error("Server could not start:", error.code);
      await mongoose.disconnect();
      process.exitCode = 1;
    });
    for (const signal of ["SIGINT", "SIGTERM"])
      process.on(signal, () =>
        server.close(async () => {
          await mongoose.disconnect();
          process.exit(0);
        }),
      );
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exitCode = 1;
  }
}
startServer();
