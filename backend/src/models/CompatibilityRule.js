const mongoose = require("mongoose");

const ruleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      enum: [
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
      ],
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    enabled: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, strict: "throw", optimisticConcurrency: true },
);
module.exports = mongoose.model(
  "CompatibilityRule",
  ruleSchema,
  "compatibilityRules",
);
