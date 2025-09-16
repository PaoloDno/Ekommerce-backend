const User = require("../models/UserModel");
const Cart = require("../models/CartModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");


const generateToken = (user) => {
  
  const SECRET_KEY = process.env.JWT_SECRET
  console.log(SECRET_KEY);
  return jwt.sign(
    { userId: user._id,
      username: user.username,
      isAdmin: user.isAdmin },
    SECRET_KEY,
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
    const cart = await Cart.findOne({ userId: newUser._id });
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
    console.log(error);
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


exports.getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId)
      .select("-password -__v -createdAt -updatedAt") // Hide sensitive fields
      .populate({
        path: "orderhistory.order",
        select: "orderNumber totalAmount status createdAt", // Limit order fields
      })
      .populate({
        path: "reviewHistory.product",
        select: "name price", // Limit product fields
      })
      .populate({
        path: "reviewHistory.review",
        select: "rating comment createdAt", // Limit review fields
      })
      .lean(); // Return plain JS object, not a Mongoose doc

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    console.log(user);
    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};


exports.selectorTheme = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { theme } = req.body;

    const validThemes = ["default", "sakura", "dark", "coffee", "dark2"];
    if (!validThemes.includes(theme)) {
      const error = new Error("Invalid theme");
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { theme },
      { new: true }
    ).select("-password"); 

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({
      theme: user.theme,
      message: "Theme updated successfully",
    });
  } catch (error) {
    console.error("Theme update error:", error);
    next(error);
  }
};

