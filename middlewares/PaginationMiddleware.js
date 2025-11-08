const paginationMiddleware = (req, res, next) => {
  console.log("Pagination Middleware Triggered");

  try {
    
    const limit = parseInt(req.query.limit) || 12;
    const page = parseInt(req.query.page) || 1;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    if (limit <= 0 || page <= 0) {
      const error = new Error("Invalid Pagination parameters");
      error.statusCode = 400;
      throw error;
    }

    const resultsPerPage = limit;
    const currentPage = page;
    const skipDocuments = (currentPage - 1) * resultsPerPage;

    req.pagination = {
      resultsPerPage,
      currentPage,
      skipDocuments,
      sortBy,
      sortOrder,
    };

    next();
  } catch (error) {
    
    console.error("Pagination middleware error:", error.message);
    error.statusCode = error.statusCode || 500;
    error.message = error.message || "Pagination error.";
    next(error);
  }
};

module.exports = paginationMiddleware;