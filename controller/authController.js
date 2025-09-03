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

exports.signUpUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const {
      username,
      firstname,
      lastname,
      middlename,
      email,
      password,
      address,
    } = req.body;

    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail)
      return res.status(400).json({ message: "Email already registered!" });

    const existingUserName = await User.findOne({ username });
    if (existingUserName)
      return res.status(400).json({ message: "Username already registered!" });

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

    await Cart.create({ user: newUser._id, items: [] });

    const token = generateToken(user);
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logInUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logOutUser = async (req, res) => {
  try {
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
