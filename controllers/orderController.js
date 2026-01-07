const Order = require("../models/OrderModel");
const User = require("../models/UserModel");
const Notification = require("../models/NotificationModel");
const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");
// utils
const sendNotification = require("../utils/sendNotification");
// --------------------------------------------------
// CREATE ORDER
// --------------------------------------------------
exports.createOrder = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const { items, itemTotalPrice, shippingFee, totalSum, shippingAddress } =
      req.body;

    // -------------------------------
    // VALIDATION
    // -------------------------------
    if (
      !userId ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !totalSum ||
      !shippingAddress
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required order fields",
      });
    }

    // -------------------------------
    // CREATE ORDER
    // -------------------------------
    const newOrder = await Order.create({
      user: userId,
      items,
      itemTotalPrice,
      shippingFee,
      totalSum,
      shippingAddress,
      status: "pending",
    });

    // -------------------------------
    // ADD TO USER ORDER HISTORY
    // -------------------------------
    await User.findByIdAndUpdate(userId, {
      $push: {
        orderhistory: {
          order: newOrder._id,
          purchasedAt: new Date(),
        },
      },
    });

    // -------------------------------
    // USER NOTIFICATION
    // -------------------------------
    await sendNotification({
      userId,
      role: "user",
      subject: `Pending Order #${newOrder._id}`,
      message: "Order placed successfully.",
      link: `/orders/${newOrder._id}`,
    });

    // -------------------------------
    // RESOLVE UNIQUE SELLERS (OPTIMIZED)
    // -------------------------------
    const productIds = items.map((i) => i.product);

    const products = await Product.find({ _id: { $in: productIds } }).populate({
      path: "seller",
      populate: { path: "owner" },
    });

    const storeOwners = new Map();

    for (const product of products) {
      if (product?.seller?.owner) {
        storeOwners.set(
          product.seller.owner._id.toString(),
          product.seller.owner
        );
      }
    }

    // -------------------------------
    // SELLER NOTIFICATIONS
    // -------------------------------
    for (const owner of storeOwners.values()) {
      await sendNotification({
        userId: owner._id,
        role: "seller",
        subject: "New Order Received",
        message: `Order #${newOrder._id} includes your product(s).`,
        link: `/seller/orders/${newOrder._id}`,
      });
    }

    // -------------------------------
    // CLEAR CART
    // -------------------------------
    await Cart.findOneAndDelete({ user: userId });

    // -------------------------------
    // RESPONSE
    // -------------------------------
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
    const { userId } = req.user;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const orders = await Order.find({ user: userId })
      .populate({
        path: "items.product",
        populate: {
          path: "seller",
          select: "storeName owner",
        },
      })
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
      .populate({
        path: "items.product",
        populate: {
          path: "seller",
          select: "storeName owner",
        },
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
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
