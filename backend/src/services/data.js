const mongoose = require("mongoose");
const { Build, BuildItem, Component, Category } = require("../models/index.js");
const { HttpError } = require("../middleware/errors.js");
const { id } = require("../validation/input.js");
async function required(Model, key, session = null) {
  const doc = await Model.findById(id(key)).session(session);
  if (!doc) throw new HttpError(404, `${Model.modelName} not found`);
  return doc;
}
async function touch(doc, session) {
  doc.revision = (doc.revision || 0) + 1;
  await doc.save({ session });
}
async function loadBuild(key, session = null) {
  const build = await required(Build, key, session);
  const items = await BuildItem.find({ buildId: build._id })
    .session(session)
    .populate({ path: "componentId", populate: { path: "categoryId" } })
    .lean();
  if (items.some((i) => !i.componentId || !i.componentId.categoryId))
    throw new HttpError(
      400,
      "Build contains missing catalog records. Repair its items first.",
    );
  return { build, items };
}
const transaction = (fn) => mongoose.connection.transaction(fn);
async function validateItem(
  buildId,
  componentId,
  quantity,
  session,
  excludeId,
) {
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 16
  )
    throw new HttpError(400, "quantity must be an integer from 1 to 16");
  const build = await required(Build, buildId, session);
  const component = await required(Component, componentId, session);
  if (!component.active) throw new HttpError(400, "Component is inactive");
  const category = await required(
    Category,
    String(component.categoryId),
    session,
  );
  const others = await BuildItem.find({
    buildId: build._id,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
    .session(session)
    .populate("componentId");
  if (others.some((i) => String(i.componentId?._id) === String(component._id)))
    throw new HttpError(400, "Component already selected; edit its quantity");
  const singleton = [
    "cpu",
    "motherboard",
    "gpu",
    "psu",
    "case",
    "cpu-cooler",
  ].includes(category.slug);
  if (
    singleton &&
    (quantity !== 1 ||
      others.some(
        (i) => String(i.componentId?.categoryId) === String(category._id),
      ))
  )
    throw new HttpError(
      400,
      `Only one ${category.slug} is supported per build`,
    );
  // Touch referenced documents to serialize concurrent deletion and selection.
  await touch(component, session);
  build.status = "draft";
  await touch(build, session);
  return build;
}

module.exports = { required, touch, loadBuild, transaction, validateItem };
