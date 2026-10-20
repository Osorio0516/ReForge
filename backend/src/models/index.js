const Category = require("./Category.js");
const Component = require("./Component.js");
const Build = require("./Build.js");
const BuildItem = require("./BuildItem.js");
const CompatibilityRule = require("./CompatibilityRule.js");
const TYPES = [
  "cpu",
  "motherboard",
  "ram",
  "gpu",
  "storage",
  "psu",
  "case",
  "cpu-cooler",
  "Gun",
];
const RULES = [
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
  "Gun-type",
];
const models = [Category, Component, Build, BuildItem, CompatibilityRule];
module.exports = {
  Category,
  Component,
  Build,
  BuildItem,
  CompatibilityRule,
  TYPES,
  RULES,
  models,
};
