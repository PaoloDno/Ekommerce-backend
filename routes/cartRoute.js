const express = require("express");
const authenticationMiddleware = require('../middlewares/AuthenticationMiddleware.js');
const {
  getCart,
  addToCart,
  removeFromCart,
  clearCart
} = require("../controllers/cartController.js");
const router = express.Router();

router.get("/", authenticationMiddleware, getCart);
router.post("/", authenticationMiddleware, addToCart);
router.delete("/:productId", authenticationMiddleware, removeFromCart);
router.delete("/:id", authenticationMiddleware, clearCart);

module.exports = router;