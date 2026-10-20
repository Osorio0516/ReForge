require("dotenv").config();
const mongoose = require("mongoose");
async function connectDatabase() {
  if (!process.env.MONGO_URI)
    throw new Error(
      "MONGO_URI is missing. Copy .env.example to .env and enter your Atlas URI.",
    );
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || "pc_builder",
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = { connectDatabase };
