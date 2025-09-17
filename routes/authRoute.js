const express = require("express");
const { 
  signUpUser, 
  logInUser, 
  logOutUser,
  getUserProfile,
  selectorTheme, } = require("../controllers/authController.js");
const { validateLogin, validateSignup } = require("../middlewares/InputValidators.js");
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware.js");
const router = express.Router();

router.post("/signup", validateSignup, signUpUser);
router.post("/login", validateLogin, logInUser);
router.post("/logout", logOutUser);
router.get("/get-user-profile", authenticationMiddleware, getUserProfile);

router.put("/theme", authenticationMiddleware, selectorTheme);

module.exports = router;