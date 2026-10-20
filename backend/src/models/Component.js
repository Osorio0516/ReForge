const mongoose = require("mongoose");
const specsSchema = new mongoose.Schema(
  {
    socket: { type: String, trim: true, maxlength: 40 },
    memoryType: { type: String, enum: ["DDR4", "DDR5"] },
    capacityGB: {
      type: Number,
      min: 0,
      max: 100000,
      validate: Number.isFinite,
    },
    modules: { type: Number, min: 0, max: 16, validate: Number.isInteger },
    ramSlots: { type: Number, min: 0, max: 32, validate: Number.isInteger },
    maxRamGB: { type: Number, min: 0, max: 100000, validate: Number.isFinite },
    formFactor: { type: String, trim: true, maxlength: 40 },
    supportedFormFactors: [{ type: String, maxlength: 40 }],
    lengthMm: { type: Number, min: 0, max: 2000, validate: Number.isFinite },
    maxGpuLengthMm: {
      type: Number,
      min: 0,
      max: 2000,
      validate: Number.isFinite,
    },
    heightMm: { type: Number, min: 0, max: 1000, validate: Number.isFinite },
    maxCoolerHeightMm: {
      type: Number,
      min: 0,
      max: 1000,
      validate: Number.isFinite,
    },
    supportedSockets: [{ type: String, maxlength: 40 }],
    supportedPsuFormFactors: [{ type: String, maxlength: 40 }],
    wattage: { type: Number, min: 0, max: 5000, validate: Number.isFinite },
    powerWatts: { type: Number, min: 0, max: 5000, validate: Number.isFinite },
    interface: { type: String, enum: ["SATA", "NVMe"] },
    sataPorts: { type: Number, min: 0, max: 100, validate: Number.isInteger },
    m2Slots: { type: Number, min: 0, max: 100, validate: Number.isInteger },
    integratedGraphics: Boolean,
  },
  { _id: false, strict: "throw" },
);

// categoryId links each part to a document in categories.
const componentSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 80,
    },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    brand: { type: String, required: true, trim: true, maxlength: 80 },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      max: 10000000,
      validate: Number.isFinite,
    },
    currency: { type: String, enum: ["PHP"], default: "PHP" },
    description: { type: String, default: "", maxlength: 2000 },
    specs: { type: specsSchema, required: true, default: () => ({}) },
    active: { type: Boolean, required: true, default: true },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true, strict: "throw", optimisticConcurrency: true },
);
componentSchema.index({ categoryId: 1, price: 1 });
module.exports = mongoose.model("Component", componentSchema, "components");
