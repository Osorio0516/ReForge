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

    if (req.query.categoryId !== undefined)
      filter.categoryId = id(req.query.categoryId);
    if (req.query.brand !== undefined)
      filter.brand = scalar(req.query.brand, "brand");
    if (req.query.active !== undefined) {
      if (!["true", "false"].includes(req.query.active))
        throw new HttpError(400, "active must be true or false");
      filter.active = req.query.active === "true";
    }
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.price = {};
      if (req.query.minPrice !== undefined)
        filter.price.$gte = money(req.query.minPrice, "minPrice");
      if (req.query.maxPrice !== undefined)
        filter.price.$lte = money(req.query.maxPrice, "maxPrice");
      if (filter.price.$gte > filter.price.$lte)
        throw new HttpError(400, "minPrice exceeds maxPrice");
    }
    const sorts = {
      name: { name: 1, _id: 1 },
      "price-asc": { price: 1, _id: 1 },
      "price-desc": { price: -1, _id: 1 },
      newest: sort,
    };
    if (req.query.sort !== undefined) {
      if (!Object.hasOwn(sorts, req.query.sort))
        throw new HttpError(400, "Invalid sort");
      sort = sorts[req.query.sort];
    }

    const data = await Component.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("categoryId");
    const total = await Component.countDocuments(filter);
    res.json({ data, page, limit, total });
  } catch (err) {
    next(err);
  }
});

// GET one: malformed ID is 400; a valid but nonexistent ID is 404.
router.get("/:id", async (req, res, next) => {
  try {
    id(req.params.id);
    const record = await Component.findById(req.params.id).populate(
      "categoryId",
    );
    if (!record)
      return res.status(404).json({ message: "Component not found" });
    res.json({ data: record });
  } catch (err) {
    next(err);
  }
});

// POST: schema validation runs before save. New records return 201.
router.post("/", async (req, res, next) => {
  try {
    const input = body(req.body, [
      "sku",
      "name",
      "brand",
      "categoryId",
      "price",
      "currency",
      "description",
      "specs",
      "active",
    ]);
    const record = await transaction(async (session) => {
      const category = await required(Category, input.categoryId, session);
      await touch(category, session);
      const created = new Component(input);
      await created.save({ session });

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
    const input = body(req.body, [
      "sku",
      "name",
      "brand",
      "price",
      "currency",
      "description",
      "specs",
      "active",
    ]);
    const updated = await transaction(async (session) => {
      const record = await required(Component, req.params.id, session);
      record.set(input);
      await record.save({ session });
      const buildIds = await BuildItem.distinct("buildId", {
        componentId: record._id,
      }).session(session);
      await Build.updateMany(
        { _id: { $in: buildIds } },
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
      const record = await required(Component, req.params.id, session);
      if (await BuildItem.exists({ componentId: record._id }).session(session))
        throw new HttpError(
          400,
          "Component is used in a build. Set active=false instead.",
        );
      await record.deleteOne({ session });
    });
    res.json({ message: "Record deleted" });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
