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
    console.log("signing up");
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

    const token = generateToken(newUser);
    const cart = await Cart.findOne({ userId: user._id });
    const totalItems = cart
      ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      username,
      token,
      cartSummary: {
        totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.logInUser = async (req, res, next) => {
  try {
    //console.log("a");

    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed.");
      error.statusCode = 400;
      error.details = errors.array();
      throw error;
    }
    // console.log("b");

    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      const error = new Error("Invalid credentials.");
      error.statusCode = 401;
      throw error;
    }
    //console.log("c");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error("Invalid credentials.");
      error.statusCode = 401;
      throw error;
    }
    // console.log("d");

    const token = generateToken(user);
    const cart = await Cart.findOne({ userId: user._id });
    const totalItems = cart
      ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      username,
      token,
      cartSummary: {
        totalItems,
      },
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
