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

/**
 * login =>
 * cartSummary = 0 not initiated properly
 * message: Login successfully
 * token: token
 * username: username
 * 
 * get-user-profile =>
 * return {
 *  data = {
 *    address [] = {city, country, postalcode, street, _id}
 *    email: email,
 *    firstname,
 *    isAdmin,
 *    lastname,
 *    middllename,
 *    orderHistory,
 *    reviewHistory: [] this is too many not gonnna lie
 *    storeName,
 *    userAvatar,
 *    userTheme,
 *    username
 *    id
 *  },
 *  message: success
 *  success: true
 *  // should have learned postman
 * }
 * 
 */