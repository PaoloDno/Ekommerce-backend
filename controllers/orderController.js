const Order = require("../models/OrderModel.js");
const User = require("../models/UserModel.js");
const Notification = require("../models/NotificationModel.js");
const Cart = require("../models/CartModel.js");
// --------------------------------------------------
// CREATE ORDER
// --------------------------------------------------
exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId;

    // Pull values from body safely
    const { items, totalPrice, shippingAddress } = req.body;

    if (!userId || !items?.length || !totalPrice || !shippingAddress) {
      const error = new Error("Missing required order fields");
      error.statusCode = 400;
      throw error;
    }

    // Create the order
    const newOrder = await Order.create({
      user: userId,
      items,
      totalPrice,
      shippingAddress,
    });

    // Add to user order history
    await User.findByIdAndUpdate(userId, {
      $push: {
        orderhistory: {
          order: newOrder._id,
          purchasedAt: new Date(),
        },
      },
    });

    // Notify the user
    await Notification.create({
      userId,
      role: "user",
      message: `Order placed successfully! Order #${newOrder._id}.`,
    });

    // Notify the seller (if any)
    if (sellerId) {
      await Notification.create({
        userId: sellerId,
        role: "seller",
        message: `A new order (#${newOrder._id}) was placed.`,
      });
    }

    await Cart.findOneAndDelete({ user: userId });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET ALL ORDERS OF A USER
// --------------------------------------------------
exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.query.userId;

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .populate("seller", "storeName firstname lastname")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET SINGLE ORDER
// --------------------------------------------------
exports.getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("user", "username email")
      .populate("items.product")
      .populate("seller", "storeName firstname lastname");

    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// UPDATE ORDER STATUS (SELLER OR ADMIN)
// --------------------------------------------------
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatus = [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatus.includes(status)) {
      const error = new Error("Invalid order status");
      error.statusCode = 400;
      throw error;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate("user seller");

    if (!updatedOrder) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    // Notify user
    await Notification.create({
      userId: updatedOrder.user._id,
      role: "user",
      message: `Your order #${updatedOrder._id} status is now: "${status}".`,
    });

    // Notify seller (only if exists)
    if (updatedOrder.seller) {
      await Notification.create({
        userId: updatedOrder.seller._id,
        role: "seller",
        message: `Order #${updatedOrder._id} has been updated to "${status}".`,
      });
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
