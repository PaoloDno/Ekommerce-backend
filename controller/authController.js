const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secretKey';

const generateToken = (user) => {
  const payload = {
    userId: user._id,
    username: user.username,
    isAdmin: user.isAdmin,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: '6h'});
};


// signup user

const signUpUser = [
  async (req, res, next) => {
    
  }
];

// login user

const logInUser = [
  async (req, res, next) => {

  }
];