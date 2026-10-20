const mongoose = require("mongoose");

const buildSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    budget: {
      type: Number,
      required: true,
      min: 0,
      max: 10000000,
      validate: Number.isFinite,
    },
    notes: { type: String, default: "", maxlength: 2000 },
    status: { type: String, enum: ["draft", "completed"], default: "draft" },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true, strict: "throw", optimisticConcurrency: true },
);
module.exports = mongoose.model("Build", buildSchema, "builds");
