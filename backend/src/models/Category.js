const mongoose = require("mongoose");

// Schema = the fields and validation rules for one category.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "cpu",
        "motherboard",
        "ram",
        "gpu",
        "storage",
        "psu",
        "case",
        "cpu-cooler",
      ],
    },
    description: { type: String, default: "", maxlength: 500 },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true, strict: "throw", optimisticConcurrency: true },
);
module.exports = mongoose.model("Category", categorySchema, "categories");
