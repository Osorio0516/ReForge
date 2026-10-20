const { Router } = require("express");
const mongoose = require("mongoose");
const r = Router();
r.get("/health", (req, res) =>
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: mongoose.connection.readyState === 1 ? "ok" : "unavailable",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);
module.exports = r;
