const express = require("express");
const { signUpUser, logInUser, logOutUser } = require("../controllers/authController.js");
const { validateLogin, validateSignup } = require("../middlewares/InputValidators.js");
const router = express.Router();

router.post("/signup", validateSignup, signUpUser);
router.post("/login", validateLogin, logInUser);
router.post("/logout", logOutUser);

module.exports = router;