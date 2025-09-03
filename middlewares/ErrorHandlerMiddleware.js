const errorHandler = (err, res) => {
  const isDev = process.env.NODE_ENV === "development";

  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Log error details
  console.error(`Error: ${message}`);
  if (isDev) console.error(err.stack);

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }), // Include stack only in development
  });
};

module.exports = errorHandler;
