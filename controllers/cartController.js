const Cart = require("../models/CartModel.js");
const Product = require("../models/ProductModel.js");
const Order = require("../models/OrderModel.js");

exports.getCart = async (req, res, next) => {
  const { userId } = req.user;

  try {
    let cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name price productImage stock averageRating attributes seller",
      populate: {
        path: "seller",
        select: "storeName logo",
      },
    });

    // Create empty cart if none exists
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Enrich each item with full product info + attributes
    const enrichedItems = cart.items.map((item) => {
      const product = item.product;

      // Convert Map to plain object for frontend
      const attributes = product?.attributes ? Object.fromEntries(product.attributes) : {};

      return {
        ...item.toObject(),
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          averageRating: product.averageRating,
          image: product.productImage,
          seller: product.seller,
          attributes,
        },
        selectedAttributes: item.attributes || {}, // attributes selected by user
      };
    });

    // Calculate totals
    const totalPrice = enrichedItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    const totalItems = enrichedItems.reduce(
      (count, item) => count + item.quantity,
      0
    );

    // Return cart data
    res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      cart: {
        ...cart.toObject(),
        items: enrichedItems,
      },
      totalPrice,
      totalItems,
    });
  } catch (error) {
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const { userId } = req.user;

    const product = await Product.findById(productId);
    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = quantity;
      } else {
        cart.items.push({
          product: productId,
          name: product.name,
          price: product.price,
          quantity,
        });
      }
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: "Added to Cart!",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { productId } = req.params;

    console.log("A laundry day");
    console.log(productId);

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      const error = new Error("Cart not found");
      error.statusCode = 404;
      throw error;
    }
    console.log("cart:", cart);
    console.log("cart.items", cart.items);
    console.log(productId);
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product removed from Cart",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const { userId } = req.user;
    await Cart.findOneAndDelete({ user: userId });

    res.status(200).json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    next(error);
  }
};




exports.checkOutCart = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId }).session(session);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      const error = new Error("Cart Not Found");
      error.statusCode = 400;
      throw error;
    }

    // Step 1: Fetch products
    const productIds = cart.items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).session(
      session
    );

    /*If the field holds an array, then the $in operator selects the documents whose field holds an array that contains at least one element that matches a value in the specified array (for example, <value1>, <value2>, and so on). */

    const insufficientStock = [];
    for (const item of cart.items) {
      const product = products.find(
        (p) => p._id.toString() === item.product.toString()
      );

      if (!product) {
        insufficientStock.push({
          productId: item.product,
          reason: "Product no longer exists",
        });
        continue;
      }

      if (product.stock < item.quantity) {
        insufficientStock.push({
          productId: product._id,
          name: product.name,
          reason: `Only ${product.stock} left in stock`,
        });
      }
    }

    if (insufficientStock.length > 0) {
      await session.abortTransaction();
      console.log("insufficient:", insufficientStock);
      const error = new Error("Some products are unavailable or low on stock.");
      error.statusCode = 400;
      throw error;
    }
    // insufficientStocks = [{stock: -1}}{}] abort session

    // Step 3: Calculate totals
    let itemTotalPrice = 0;
    for (const item of cart.items) {
      const product = products.find(
        (p) => p._id.toString() === item.product.toString()
      );
      item.price = product.price;
      itemTotalPrice += product.price * item.quantity;
    }

    const shippingFee = 50;
    const totalSum = itemTotalPrice + shippingFee;

    // Step 4: Bulk update product stock
    // Model.bulkWrite(operations, options, callback)
    const bulkOps = cart.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: -item.quantity } },
      },
    }));
    await Product.bulkWrite(bulkOps, { session });
    // updateOne search one

    // Step 5: Create Order Ongoing

    const order = await Order.create(
      [
        {
          user: userId,
          items: cart.items,
          shippingFee,
          itemTotalPrice,
          totalSum,
          status: "pending",
          shippingAddress: req.body.shippingAddress || {},
        },
      ],
      { session }
    );

    // Step 6: Delete Cart
    await Cart.findOneAndDelete({ user: userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order: order[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
