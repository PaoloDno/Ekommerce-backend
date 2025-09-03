export const adminMiddleware = (req, next) => {
  if (req.user && req.user.isAdmin) {
      console.log(req.user.isAdmin);
      console.log("is admin:", req.user.isAdmin);
      next(); // Proceed to next middleware or route handler
  } else {
      const error = new Error('Admin access required');
      error.statusCode = 403;
      next(error); // Pass the error to the error handler
  }
};