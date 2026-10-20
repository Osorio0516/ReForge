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

// GET /comparison — compare
router.get("/comparison", async (req, res, next) => {
  try {
    const [a, b] = await Promise.all([
      loadBuild(req.query.left),
      loadBuild(req.query.right),
    ]);
    res.json({ data: comparison(a, b) });
  } catch (err) {
    next(err);
  }
});

// GET /statistics — statistics
router.get("/statistics", async (req, res, next) => {
  try {
    const data = await Build.aggregate([
      {
        $lookup: {
          from: "buildItems",
          localField: "_id",
          foreignField: "buildId",
          as: "items",
        },
      },
      {
        $unwind: {
          path: "$items",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "components",
          localField: "items.componentId",
          foreignField: "_id",
          as: "part",
        },
      },
      {
        $unwind: {
          path: "$part",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          status: {
            $first: "$status",
          },
          budget: {
            $first: "$budget",
          },
          total: {
            $sum: {
              $multiply: [
                {
                  $ifNull: ["$items.quantity", 0],
                },
                {
                  $ifNull: ["$part.price", 0],
                },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalBuilds: {
            $sum: 1,
          },
          completedBuilds: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "completed"],
                },
                1,
                0,
              ],
            },
          },
          averageBuildPrice: {
            $avg: "$total",
          },
          overBudgetBuilds: {
            $sum: {
              $cond: [
                {
                  $gt: ["$total", "$budget"],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);
    const result = data[0] || {
      totalBuilds: 0,
      completedBuilds: 0,
      averageBuildPrice: 0,
      overBudgetBuilds: 0,
    };
    result.draftBuilds = result.totalBuilds - result.completedBuilds;
    result.averageBuildPrice = Math.round(result.averageBuildPrice * 100) / 100;
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET / — list
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query),
      filter = {};
    if (req.query.q !== undefined) {
      const q = scalar(req.query.q, "q");
      if (q.length > 100) throw new HttpError(400, "Search too long");
      filter.name = { $regex: literalRegex(q), $options: "i" };
    }
    if (req.query.status !== undefined) {
      if (!["draft", "completed"].includes(req.query.status))
        throw new HttpError(400, "Invalid status");
      filter.status = req.query.status;
    }
    const [data, total] = await Promise.all([
      Build.find(filter)
        .sort({ updatedAt: -1, _id: 1 })
        .skip(skip)
        .limit(limit),
      Build.countDocuments(filter),
    ]);
    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// POST / — create
router.post("/", async (req, res, next) => {
  try {
    const doc = await Build.create(body(req.body, ["name", "budget", "notes"]));
    res.status(201).json({ data: doc });
  } catch (err) {
    next(err);
  }
});

// GET /:id — get
router.get("/:id", async (req, res, next) => {
  try {
    res.json({ data: await loadBuild(req.params.id) });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — update
router.patch("/:id", async (req, res, next) => {
  try {
    const input = body(req.body, ["name", "budget", "notes"]);
    const doc = await transaction(async (session) => {
      const d = await required(Build, req.params.id, session);
      d.set(input);
      d.status = "draft";
      await touch(d, session);
      return d;
    });
    res.json({ data: doc });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — remove
router.delete("/:id", async (req, res, next) => {
  try {
    await transaction(async (session) => {
      const d = await required(Build, req.params.id, session);
      await BuildItem.deleteMany({ buildId: d._id }).session(session);
      await d.deleteOne({ session });
    });
    res.json({ message: "Build and its items deleted" });
  } catch (err) {
    next(err);
  }
});

// GET /:id/items — items
router.get("/:id/items", async (req, res, next) => {
  try {
    const data = await loadBuild(req.params.id);
    res.json({ data: data.items });
  } catch (err) {
    next(err);
  }
});

// POST /:id/items — addItem
router.post("/:id/items", async (req, res, next) => {
  try {
    const input = body(req.body, ["componentId", "quantity"]);
    const quantity = input.quantity ?? 1;
    const doc = await transaction(async (session) => {
      await validateItem(req.params.id, input.componentId, quantity, session);
      const item = new BuildItem({
        buildId: req.params.id,
        componentId: input.componentId,
        quantity,
      });
      await item.save({ session });
      return item;
    });
    res.status(201).json({ data: doc });
  } catch (err) {
    next(err);
  }
});

// POST /:id/copies — copy
router.post("/:id/copies", async (req, res, next) => {
  try {
    const input = body(req.body, ["name"]);
    const doc = await transaction(async (session) => {
      const original = await loadBuild(req.params.id, session);
      await touch(original.build, session);
      const b = new Build({
        name: input.name,
        budget: original.build.budget,
        notes: original.build.notes,
      });
      await b.save({ session });
      for (const item of original.items) {
        await validateItem(
          String(b._id),
          String(item.componentId._id),
          item.quantity,
          session,
        );
        await new BuildItem({
          buildId: b._id,
          componentId: item.componentId._id,
          quantity: item.quantity,
        }).save({ session });
      }
      return b;
    });
    res.status(201).json({ data: doc });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/status — status
router.patch("/:id/status", async (req, res, next) => {
  try {
    const input = body(req.body, ["status"]);
    if (!["draft", "completed"].includes(input.status))
      throw new HttpError(400, "status must be draft or completed");
    const result = await transaction(async (session) => {
      const d = await loadBuild(req.params.id, session);
      if (input.status === "completed") {
        const check = compatibility(
          d.items,
          await CompatibilityRule.find().session(session).lean(),
        );
        if (check.status !== "passes-modeled-checks")
          throw new HttpError(
            400,
            "Resolve missing parts, unknown checks and incompatibilities before completing",
          );
        if (powerSummary(d.items).status !== "sufficient-estimate")
          throw new HttpError(400, "A sufficient PSU estimate is required");
        if (priceSummary(d.build, d.items).overBudget)
          throw new HttpError(400, "Build exceeds its budget");
      }
      d.build.status = input.status;
      await touch(d.build, session);
      return d.build;
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /:id/pricing — pricing
router.get("/:id/pricing", async (req, res, next) => {
  try {
    const d = await loadBuild(req.params.id);
    res.json({ data: priceSummary(d.build, d.items) });
  } catch (err) {
    next(err);
  }
});

// GET /:id/budget — budget
router.get("/:id/budget", async (req, res, next) => {
  try {
    const d = await loadBuild(req.params.id);
    const { total, budget, remaining, overBy, overBudget, currency } =
      priceSummary(d.build, d.items);
    res.json({
      data: { total, budget, remaining, overBy, overBudget, currency },
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id/compatibility — checks
router.get("/:id/compatibility", async (req, res, next) => {
  try {
    const d = await loadBuild(req.params.id);
    res.json({
      data: compatibility(d.items, await CompatibilityRule.find().lean()),
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id/power — power
router.get("/:id/power", async (req, res, next) => {
  try {
    const d = await loadBuild(req.params.id);
    res.json({ data: powerSummary(d.items) });
  } catch (err) {
    next(err);
  }
});
module.exports = router;
