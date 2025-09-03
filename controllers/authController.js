const User = require("../models/UserModel");
const Cart = require("../models/CartModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const JWT_SECRET = process.env.JWT_SECRET || "secretKey";

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, username: user.username, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: "6h" }
  );
};

exports.signUpUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed.");
      error.statusCode = 400;
      error.details = errors.array();
      throw error;
    }

    const {
      username,
      firstname,
      lastname,
      middlename,
      email,
      password,
      address,
    } = req.body;

    // Check for existing email
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      const error = new Error("Email already registered!");
      error.statusCode = 400;
      throw error;
    }

    // Check for existing username
    const existingUserName = await User.findOne({ username });
    if (existingUserName) {
      const error = new Error("Username already registered!");
      error.statusCode = 400;
      throw error;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      username,
      firstname,
      lastname,
      middlename,
      email,
      address,
      password: hashedPassword,
    });

    // Create empty cart for new user
    await Cart.create({ user: newUser._id, items: [] });

    // ✅ FIX: Use `newUser` instead of undefined `user`
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.logInUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed.");
      error.statusCode = 400;
      error.details = errors.array();
      throw error;
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Invalid credentials.");
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error("Invalid credentials.");
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken(user);
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.logOutUser = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};
