import { AppError } from "../utils/AppError.js";

export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Handle Multer errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        status: "fail",
        error: "Unexpected field",
        message: `Expected field name: 'file'. Received: '${err.field}'`,
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "fail",
        error: "File too large",
        message: err.message,
      });
    }
    return res.status(400).json({
      status: "fail",
      error: err.message,
    });
  }

  // Handle operational errors (AppError instances)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err.message,
    });
  }

  // Handle programming or unknown errors
  console.error("ERROR 💥", err);
  return res.status(500).json({
    status: "error",
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

