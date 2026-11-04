/** An error that is safe to show to the client. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const validationError = (details, message = "The request contains invalid data.") =>
  new AppError(400, "VALIDATION_ERROR", message, details);
export const unauthorized = (message = "Please sign in to continue.") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have permission to do that.") => new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "The requested resource was not found.") => new AppError(404, "NOT_FOUND", message);
export const conflict = (message, details, code = "CONFLICT") => new AppError(409, code, message, details);
export const tooManyRequests = (message, retryAfter) => {
  const e = new AppError(429, "RATE_LIMITED", message);
  e.retryAfter = retryAfter;
  return e;
};
