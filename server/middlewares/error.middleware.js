import { ApiError } from "../utils/ApiError.js";

// Centralized error handler to convert ApiError instances into proper HTTP responses
const errorHandler = (err, req, res, _next) => {
  console.error(err); // You can replace this with a logger if desired

  if (err instanceof ApiError) {
    const status = err.statuscode || 500;
    return res.status(status).json({
      success: err.success ?? false,
      message: err.message || "Something went wrong",
      errors: err.errors || [],
      data: err.data ?? null,
    });
  }

  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || "Something went wrong",
  });
};

export default errorHandler;