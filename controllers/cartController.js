const Cart = require("../models/CartModel.js");
const Product = require("../models/ProductModel.js");

exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id })
      .populate("items.productId");

    if (!cart) {
      // Throw a specific error if cart is missing
      const error = new Error("Cart not found for this user");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      cart
    });
    
  } catch (error) {
    next(error);
  }
}