const jwt = require("jsonwebtoken");
const User = require("../models/UserModel.js");
const SECRET_KEY = process.env.JWT_SECRET;

export const authMiddleware = async (req, res) => {
  
  console.log("Auth Middleware Triggered");

  try {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = new Error("Access denied. No token provided.");
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(" ")[1];
    console.log("Token found, verifying...");

    const decoded = jwt.verify(token, SECRET_KEY);
    console.log("Decoded Token:", decoded);

    const user = await User.findById(decoded.userId);
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }

    req.user = decoded; // or `decoded`, depending on usage
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      error.statusCode = 401;
      error.message = "Token expired. Please log in again.";
      
    } else if (error instanceof jwt.JsonWebTokenError) {
      error.statusCode = 401;
      error.message = "Invalid token. Access denied.";
      
    } else {
      error.statusCode = error.statusCode || 500;
      error.message = error.message || "Internal server error.";
      
    }

    console.error("Token verification error:", error.message);
    res.status(500).json({ message: "Authentication error" });
  }
};