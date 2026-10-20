const mongoose = require("mongoose");

// A build item connects one saved build with one catalog component.
const buildItemSchema = new mongoose.Schema(
  {
    buildId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Build",
      required: true,
    },
    componentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Component",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      max: 16,
      validate: Number.isInteger,
    },
  },
  { timestamps: true, strict: "throw", optimisticConcurrency: true },
);
buildItemSchema.index({ buildId: 1, componentId: 1 }, { unique: true });
module.exports = mongoose.model("BuildItem", buildItemSchema, "buildItems");
