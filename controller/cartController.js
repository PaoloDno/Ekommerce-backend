const Cart = require("../models/CartModel.js");
const Product = require("../models/ProductModel.js");

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id })
      .populate("items.productId");

    if (!cant) {
      return res.status(200).json({ message: "Cart is empty", items: []})
    }
  } catch (error) {

  }
}