const Order = require("../models/OrderModel");
const User = require("../models/UserModel");
const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");
const sendNotification = require("../utils/sendNotification");
const canUpdateStatus = require("../utils/orderPermission");


const mongoose = require("mongoose");
// --------------------------------
// Helpers
// --------------------------------
function recomputeOrderStatus(order) {
  const s = order.items.map((i) => i.sellerStatus);

  if (s.every((v) => v === "delivered")) return "delivered";
  if (s.every((v) => v === "cancelled")) return "cancelled";
  if (s.every((v) => v === "shipped")) return "shipped";
  if (s.some((v) => v === "shipped")) return "partially_shipped";
  if (s.some((v) => v === "processing")) return "processing";

  return "pending";
}

// --------------------------------
// Create Order
// --------------------------------
exports.createOrder = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { items, itemTotalPrice, shippingFee, totalSum, shippingAddress } =
      req.body;

    const newOrder = await Order.create({
      user: userId,
      items: items.map((i) => ({ ...i, productShippingStatus: "pending" })),
      shippingAddress,
      pricing: {
        itemsTotal: itemTotalPrice,
        shippingFee: shippingFee || 0,
        total: totalSum,
      },
      payment: { method: "cod", isPaid: false },
      status: "pending",
    });

    await User.findByIdAndUpdate(userId, {
      $push: { orderhistory: { order: newOrder._id, purchasedAt: new Date() } },
    });

    const products = await Product.find({
      _id: { $in: items.map((i) => i.product) },
    }).populate({ path: "seller", populate: { path: "owner" } });

    const notified = new Set();
    for (const p of products) {
      if (p.seller?.owner && !notified.has(p.seller.owner._id.toString())) {
        notified.add(p.seller.owner._id.toString());
        await sendNotification({
          userId: p.seller.owner._id,
          role: "seller",
          subject: "New Order",
          message: `Order #${newOrder._id} contains your products.`,
          link: `/seller/orders/${newOrder._id}`,
        });
      }
    }

    await Cart.findOneAndDelete({ user: userId });

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Seller Orders (only their items)
// --------------------------------
exports.getSellerOrders = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    console.log("sellerID", sellerId);
    // Fetch orders with only this seller's items populated
    const orders = await Order.find({
      "items.seller": sellerId,
    })
      .populate("user", "username firstname lastname email address")
      .populate({
        path: "items",
        match: { seller: sellerId }, // only this seller's items
        populate: [
          { path: "product" },            // populate product
          { path: "seller" },             // populate seller
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log("SELLER ORDERS:", JSON.stringify(orders, null, 2));

    res.json({ success: true, storeOrders: orders });
  } catch (err) {
    next(err);
  }
};


// --------------------------------
// Seller View Single Order
// --------------------------------
exports.getStoreOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.user.sellerId;

    const order = await Order.findById(orderId)
      .populate("user", "username email")
      .populate("items.product", "name price productImage");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const myItems = order.items.filter(
      (i) => i.seller.toString() === sellerId
    );

    res.json({
      success: true,
      orderId: order._id,
      buyer: order.user,
      status: order.status,
      items: myItems,
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Seller Marks Item as Processing
// --------------------------------
exports.processSellerItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const sellerId = req.user.sellerId;

    const order = await Order.findOne({ "items._id": itemId });
    if (!order) return res.status(404).json({ message: "Item not found" });

    const item = order.items.id(itemId);
    if (item.seller.toString() !== sellerId)
      return res.status(403).json({ message: "Not your item" });

    item.sellerStatus = "processing";
    await order.save();

    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Seller Ships Item
// --------------------------------
exports.shipSellerItem = async (req, res, next) => {
  try {
    const { courier, trackingNumber } = req.body;
    const { itemId } = req.params;
    const sellerId = req.user.sellerId;

    const order = await Order.findOne({ "items._id": itemId });
    if (!order) return res.status(404).json({ message: "Item not found" });

    const item = order.items.id(itemId);
    if (item.seller.toString() !== sellerId)
      return res.status(403).json({ message: "Not your item" });

    if (item.sellerStatus !== "processing")
      return res.status(400).json({ message: "Item not ready to ship" });

    item.sellerStatus = "shipped";
    item.courier = courier;
    item.trackingNumber = trackingNumber;
    item.shippedAt = new Date();

    order.status = recomputeOrderStatus(order);
    await order.save();

    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Buyer Confirms Delivery
// --------------------------------
exports.confirmItemDelivery = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.items.id(itemId);
    if (item.sellerStatus !== "shipped")
      return res.status(400).json({ message: "Item not shipped yet" });

    item.sellerStatus = "delivered";
    item.deliveredAt = new Date();

    order.status = recomputeOrderStatus(order);
    await order.save();

    res.json({ success: true, status: order.status });
  } catch (err) {
    next(err);
  }
};
