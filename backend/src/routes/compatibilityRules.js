const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const Component = require("../models/Component");
const Build = require("../models/Build");
const BuildItem = require("../models/BuildItem");
const CompatibilityRule = require("../models/CompatibilityRule");
const { HttpError } = require("../middleware/errors");
const {
  body,
  id,
  pagination,
  scalar,
  literalRegex,
  money,
} = require("../validation/input");
const { required, touch, transaction } = require("../services/data");

// GET collection: query strings filter the result, while pagination limits its size.
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = {};
    if (req.query.q !== undefined) {
      const q = scalar(req.query.q, "q");
      if (q.length > 100) throw new HttpError(400, "Search is too long");
      filter.name = { $regex: literalRegex(q), $options: "i" };
    }
    let sort = { createdAt: -1, _id: 1 };

    const data = await CompatibilityRule.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    const total = await CompatibilityRule.countDocuments(filter);
    res.json({ data, page, limit, total });
  } catch (err) {
    next(err);
  }
});

// GET one: malformed ID is 400; a valid but nonexistent ID is 404.
router.get("/:id", async (req, res, next) => {
  try {
    id(req.params.id);
    const record = await CompatibilityRule.findById(req.params.id);
    if (!record)
      return res.status(404).json({ message: "CompatibilityRule not found" });
    res.json({ data: record });
  } catch (err) {
    next(err);
  }
});

// POST: schema validation runs before save. New records return 201.
router.post("/", async (req, res, next) => {
  try {
    const input = body(req.body, ["code", "name", "description", "enabled"]);
    const record = await transaction(async (session) => {
      const created = new CompatibilityRule(input);
      await created.save({ session });
      await Build.updateMany(
        {},
        { $set: { status: "draft" }, $inc: { revision: 1 } },
      ).session(session);
      return created;
    });
    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
});

// PATCH changes only supplied fields. save() validates the resulting document.
router.patch("/:id", async (req, res, next) => {
  try {
    const input = body(req.body, ["name", "description", "enabled"]);
    const updated = await transaction(async (session) => {
      const record = await required(CompatibilityRule, req.params.id, session);
      record.set(input);
      await record.save({ session });
      await Build.updateMany(
        {},
        { $set: { status: "draft" }, $inc: { revision: 1 } },
      ).session(session);
      return record;
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE: prevent deleting records that other collections still need.
router.delete("/:id", async (req, res, next) => {
  try {
    await transaction(async (session) => {
      const record = await required(CompatibilityRule, req.params.id, session);

      await record.deleteOne({ session });
      await Build.updateMany(
        {},
        { $set: { status: "draft" }, $inc: { revision: 1 } },
      ).session(session);
    });
    res.json({ message: "Record deleted" });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
