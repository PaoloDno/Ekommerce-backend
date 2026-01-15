const Order = require("../models/OrderModel");
const User = require("../models/UserModel");
const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");
const sendNotification = require("../utils/sendNotification");
const canUpdateStatus = require("../utils/orderPermission");

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
// User Orders
// --------------------------------

exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .populate({
        path: "items.product",
        select: "name price productImage attributes seller",
        populate: {
          path: "seller",
          select: "storeName sellerLogo owner ratings.average",
        },
      })
      .sort({ createdAt: -1 });

    let statusCount = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };

    orders.forEach((o) => statusCount[o.status]++);

    console.log(statusCount);

    res.json({ success: true, data: { orders, statusCount } });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Single Order
// --------------------------------

exports.getStoreOrderById = async (req, res, next) => {
  try {
    const {orderId} = req.params;
    console.log(orderId);
    const order = await Order.findById(orderId)
      .populate("user", "username email")
      .populate({
        path: "items.product",
        select: "name price productImage attributes seller",
        //* match: { seller: storeId }, *//
        populate: {
          path: "seller",
          select: "name images seller",
        },
      });
    console.log(order);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Admin Global Status Update
// --------------------------------

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, role } = req.body;
    const order = await Order.findById(req.params.orderId).populate("user");

    if (!canUpdateStatus(role, order.status, status))
      return res.status(403).json({ message: "Not allowed" });

    order.items.forEach((i) => {
      i.sellerStatus = status;
      if (status === "shipped") i.shippedAt = new Date();
      if (status === "delivered") i.deliveredAt = new Date();
    });

    order.status = recomputeOrderStatus(order);
    await order.save();

    await sendNotification({
      userId: order.user._id,
      role: "user",
      subject: `Order ${order.status}`,
      message: `Order #${order._id} is now ${order.status}`,
      link: `/orders/${order._id}`,
    });

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Seller Orders (only own items)
// --------------------------------

exports.getSellerOrders = async (req, res, next) => {
  try {
    const sellerId = req.params.sellerId;

    const orders = await Order.find()
      .populate("user", "username email")
      .populate({
        path: "items.product",
        select: "name price productImage attributes seller",
        match: { seller: sellerId },
        populate: {
          path: "seller",
          select: "name images seller",
        },
      })

      .sort({ createdAt: -1 });

      console.log("orders", orders);
      console.log("sellerId", sellerId);

    const sellerOrders = orders
      .map((o) => {
        const myItems = o.items.filter((i) => i.product);
        if (!myItems.length) return null;

        return {
          _id: o._id,
          buyer: o.user,
          status: o.status,
          items: myItems,
          createdAt: o.createdAt,
        };
      })
      .filter(Boolean);

    console.log("seller Ordes", sellerOrders);

    res.json({ success: true, storeOrders: sellerOrders });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Seller Ships Their Items
// --------------------------------

exports.shipSellerItems = async (req, res, next) => {
  try {
    const { courier, trackingNumber } = req.body;
    const sellerId = req.user.userId;

    const order = await Order.findById(req.params.orderId).populate(
      "items.product"
    );

    let updated = false;

    for (const item of order.items) {
      if (
        item.product.seller.toString() === sellerId &&
        item.sellerStatus === "processing"
      ) {
        item.sellerStatus = "shipped";
        item.courier = courier;
        item.trackingNumber = trackingNumber;
        item.shippedAt = new Date();
        updated = true;
      }
    }

    if (!updated) return res.status(403).json({ message: "Nothing to ship" });

    order.status = recomputeOrderStatus(order);
    await order.save();

    res.json({ success: true, status: order.status });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Buyer Confirms Delivery (per item)
// --------------------------------

exports.confirmItemDelivery = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const order = await Order.findOne({ _id: orderId, user: req.user.userId });

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
