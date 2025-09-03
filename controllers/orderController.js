const Order = require("../models/OrderModel.js");
const User = require("../models/UserModel.js");

exports.createOrder = async( req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId; // fallback if no auth middleware

    if (!userId || !items?.length || !totalPrice) {
      const error = new Error("Missing required order fields");
      error.statusCode = 400;
      throw error;
    }

    // Create new order
    const newOrder = await Order.create({
      user: userId,
      items,
      totalPrice,
      shippingAddress,
    });

    // Add to user history
    await User.findByIdAndUpdate(userId, {
      $push: {
        orderhistory: {
          order: newOrder._id,
          purchasedAt: new Date(),
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    next(error);
  }
};


// get all orders of a user

exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.query.userId;

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

//get single order

exports.getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("user", "username email")
      .populate("items.product");

    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// update Order Status

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!["pending", "paid", "shipped", "delivered", "cancelled"].includes(status)) {
      const error = new Error("Invalid order status");
      error.statusCode = 400;
      throw error;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Order status updated",
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
};