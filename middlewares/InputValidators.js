const { body } = require("express-validator");

// Signup validation
exports.validateSignup = [
  body("username")
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
  body("email")
    .isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

// Login validation
exports.validateLogin = [
  body("email")
    .isEmail().withMessage("Invalid email address"),
  body("password")
    .notEmpty().withMessage("Password is required"),
];
