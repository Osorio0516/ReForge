const express = require("express");
const router = express.Router();
const { Build, BuildItem, CompatibilityRule } = require("../models/index.js");
const { HttpError } = require("../middleware/errors.js");
const {
  body,
  pagination,
  scalar,
  literalRegex,
} = require("../validation/input.js");
const {
  required,
  touch,
  transaction,
  validateItem,
  loadBuild,
} = require("../services/data.js");
const {
  priceSummary,
  compatibility,
  powerSummary,
  comparison,
} = require("../services/analysis.js");

// PATCH /:id — updateItem
router.patch("/:id", async (req, res, next) => {
  try {
    const input = body(req.body, ["quantity"]);
    const doc = await transaction(async (session) => {
      const d = await required(BuildItem, req.params.id, session);
      await validateItem(
        String(d.buildId),
        String(d.componentId),
        input.quantity,
        session,
        d._id,
      );
      d.quantity = input.quantity;
      await d.save({ session });
      return d;
    });
    res.json({ data: doc });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — removeItem
router.delete("/:id", async (req, res, next) => {
  try {
    await transaction(async (session) => {
      const d = await required(BuildItem, req.params.id, session);
      const b = await required(Build, String(d.buildId), session);
      b.status = "draft";
      await touch(b, session);
      await d.deleteOne({ session });
    });
    res.json({ message: "Build item deleted" });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
