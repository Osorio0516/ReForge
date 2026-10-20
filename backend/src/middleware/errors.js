class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || 500,
    message = err.message,
    errors;
  if (["ValidationError", "CastError", "StrictModeError"].includes(err.name)) {
    status = 400;
    message = "Validation failed";
    errors = err.errors
      ? Object.fromEntries(
          Object.entries(err.errors).map(([k, v]) => [k, v.message]),
        )
      : { input: err.message };
  }
  if (err.code === 11000) {
    status = 400;
    message = "A record with these unique fields already exists";
  }
  if (err.name === "VersionError") {
    status = 409;
    message = "Record changed. Reload and retry.";
  }
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  }
  if (status >= 500) {
    console.error("Request failed:", err.name);
    message = "Internal server error";
  }
  res.status(status).json({ message, ...(errors ? { errors } : {}) });
}

module.exports = { HttpError, notFound, errorHandler };
