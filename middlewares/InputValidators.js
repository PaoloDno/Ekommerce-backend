const { body } = require("express-validator");

// Signup validation
exports.validateSignup = [
  body("username")
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 6 characters"),
];

// Login validation
exports.validateLogin = [
  body("username")
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8}).withMessage("atleast 8 character"),
];
