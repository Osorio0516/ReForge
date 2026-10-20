const mongoose = require("mongoose");
const { HttpError } = require("../middleware/errors.js");
function id(value) {
  if (typeof value !== "string" || !mongoose.isObjectIdOrHexString(value))
    throw new HttpError(400, "Invalid record ID");
  return value;
}
function body(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpError(400, "A JSON object is required");
  if (!Object.keys(value).length)
    throw new HttpError(400, "Body must not be empty");
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new HttpError(400, `Unknown or read-only field: ${key}`);
  return value;
}
function pagination(query) {
  const page = Number(query.page ?? 1),
    limit = Number(query.limit ?? 20);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new HttpError(400, "page must be 1–100000 and limit 1–100");
  return { page, limit, skip: (page - 1) * limit };
}
function scalar(value, name) {
  if (typeof value !== "string")
    throw new HttpError(400, `${name} must be a string`);
  return value;
}
function literalRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function money(value, name) {
  const n = Number(scalar(value, name));
  if (!value.trim() || !Number.isFinite(n) || n < 0)
    throw new HttpError(400, `${name} must be non-negative`);
  return n;
}

module.exports = { id, body, pagination, scalar, literalRegex, money };
