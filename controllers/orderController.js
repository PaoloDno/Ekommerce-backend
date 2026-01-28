const Order = require("../models/OrderModel");
const User = require("../models/UserModel");
const Cart = require("../models/CartModel");
const Product = require("../models/ProductModel");
const sendNotification = require("../utils/sendNotification");
const canUpdateStatus = require("../utils/orderPermission");

// Helpers

function recomputeOrderStatus(order) {
  const s = order.items.map((i) => i.sellerStatus);

  if (s.every((v) => v === "delivered")) return "delivered";
  if (s.every((v) => v === "cancelled")) return "cancelled";
  if (s.every((v) => v === "refunded")) return "refunded";
  if (s.every((v) => v === "shipped")) return "shipped";

  if (s.some((v) => v === "refunded")) return "partially_refunded";
  if (s.some((v) => v === "delivered")) return "partially_delivered";
  if (s.some((v) => v === "shipped")) return "partially_shipped";
  if (s.some((v) => v === "forPickUp")) return "ready_for_pickup";
  if (s.some((v) => v === "processing")) return "partial_processing";
  if (s.some((v) => v === "cancelled")) return "partially_cancelled";

  return "pending";
}

async function recomputeAndSave(orderId) {
  const order = await Order.findById(orderId);
  order.status = recomputeOrderStatus(order);
  await order.save();
  return order;
}

const oneMonthFromNow = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
};

function autoDeliverItems(orders) {
  const now = Date.now();
  const THREE_DAYS = 15 * 1000; //3 * 24 * 60 * 60 * 1000;

  let hasChanges = false;

  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (
        item.sellerStatus === "shipped" &&
        item.shippedAt &&
        now - new Date(item.shippedAt).getTime() >= THREE_DAYS
      ) {
        item.sellerStatus = "delivered";
        item.deliveredAt = new Date();
        hasChanges = true;
      }
    });

    if (hasChanges) {
      order.status = undefined; // force recompute in pre-save
    }
  });

  return hasChanges;
}

// --------------------------------
// Create Order
// --------------------------------
exports.createOrder = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const {
      items,
      itemTotalPrice,
      shippingFee,
      totalSum,
      shippingAddress,
      paymentMethod,
      courier,
    } = req.body;

    const newOrder = await Order.create({
      user: userId,
      items: items.map((i) => ({
        ...i,
        productShippingStatus: "pending",
        courier,
        trackingNumber: i._id,
      })),
      shippingAddress,
      pricing: {
        itemsTotal: itemTotalPrice,
        shippingFee: shippingFee || 0,
        total: totalSum,
      },
      payment: { method: paymentMethod, isPaid: false },
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
          expiresAt: oneMonthFromNow(),
        });
      }
    }

    await Cart.findOneAndDelete({ user: userId });

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    next(err);
  }
};

// Seller Orders (only their items)
exports.getSellerOrders = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    let orders = await Order.find({ "items.seller": sellerId })
      .populate("user", "username firstname lastname email address")
      .populate({
        path: "items.product",
      })
      .sort({ createdAt: -1 });

    // delivered items update
    const updated = autoDeliverItems(orders);

    if (updated) {
      for (const order of orders) {
        await order.save(); // triggers pre-save recompute + refundDeadline
      }
    }

    // Filter only this seller’s items for response
    const storeOrders = orders
      .map((order) => ({
        ...order.toObject(),
        items: order.items.filter(
          (item) => item.seller.toString() === sellerId,
        ),
      }))
      .filter((order) => order.items.length > 0);

    res.json({ success: true, storeOrders });
  } catch (err) {
    next(err);
  }
};

// --------------------------------
// Seller View Single Order
// --------------------------------
exports.getStoreOrderById = async (req, res, next) => {
  try {
    const { orderId, sellerId } = req.body;
    const { userId } = req.user;

    const order = await Order.findById(orderId)
      .populate("user", "username email")
      .populate("items.product", "name price productImage");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const myItems = order.items.filter((i) => i.seller.toString() === sellerId);

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

// Seller Accepts Order and Marks Item as Processing
exports.acceptSingleItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;

    console.log("accept single item");

    const order = await Order.findOneAndUpdate(
      { _id: orderId, "items._id": itemId },
      { $set: { "items.$.sellerStatus": "processing" } },
      { new: true },
    );

    console.log(order);

    if (!order) return res.status(404).json({ message: "Item not found" });

    await recomputeAndSave(orderId);

    res.json({ success: true, message: "Item accepted", order });
  } catch (err) {
    next(err);
  }
};

exports.shipSingleItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;

    console.log("accept single item");

    const order = await Order.findOneAndUpdate(
      { _id: orderId, "items._id": itemId },
      { $set: { "items.$.sellerStatus": "forPickup" } },
      { new: true },
    );

    console.log(order);

    if (!order) return res.status(404).json({ message: "Item not found" });

    await recomputeAndSave(orderId);

    await sendNotification({
      userId: order.seller,
      role: "seller",
      subject: `Shipping Order Item#${itemId}`,
      message: `user#${order.user} order#${itemId} shipped`,
      link: `/order/${itemId}`,
    });

    await sendNotification({
      userId: order.user,
      role: "user",
      subject: `Order#${orderId} has been accepted`,
      message: `seller#${order.seller} has processing order#${orderId}`,
      link: `/order/${itemId}`,
    });

    res.json({ success: true, message: "Item request for pickUp", order });
  } catch (err) {
    next(err);
  }
};

// Seller: Accept ALL Their Items
exports.acceptAllMyItems = async (req, res, next) => {
  try {
    const { orderId, sellerId } = req.params;
    const { userId } = req.user;

    console.log("seller accept order", userId);
    console.log("seller accept order");

    const result = await Order.updateOne(
      { _id: orderId },
      { $set: { "items.$[i].sellerStatus": "processing" } },
      {
        arrayFilters: [{ "i.seller": sellerId, "i.sellerStatus": "pending" }],
      },
    );
    console.log("how");
    if (result.modifiedCount === 0)
      return res.status(400).json({ message: "No pending items to accept" });

    const order = await recomputeAndSave(orderId);

    await sendNotification({
      userId: order.seller,
      role: "seller",
      subject: `Proccessing Order#${orderId}`,
      message: `user#${order.user} order#${itemId} accepted and bound to be process`,
      link: `/orders/${itemId}`,
    });

    await sendNotification({
      userId: order.user,
      role: "user",
      subject: `Order#${orderId} has been accepted`,
      message: `seller#${order.seller} has processing order#${orderId}`,
      link: `/orders/${itemId}`,
    });

    res.json({ success: true, message: "All items accepted", order });
  } catch (err) {
    next(err);
  }
};

// Seller: Ship Item
// --------------------------------
exports.shipItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { courierId } = req.body;

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        "items._id": itemId,
        "items.sellerStatus": "processing",
      },
      {
        $set: {
          "items.$.sellerStatus": "shipped",
          "items.$.courierId": courierId,
          "items.$.shippedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!order)
      return res.status(400).json({ message: "Item not ready to ship" });

    await recomputeAndSave(orderId);

    await sendNotification({
      userId: order.seller,
      role: "seller",
      subject: `Item#${itemId} Shipped`,
      message: `user#${order.user} item#${itemId} has been shipped`,
      link: `/order/${itemId}`,
    });

    await sendNotification({
      userId: order.user,
      role: "user",
      subject: "Request Refund",
      message: `seller#${order.seller} has shipped order#${orderId}`,
      link: `/order/${itemId}`,
    });

    res.json({ success: true, message: "Item shipped", order });
  } catch (err) {
    next(err);
  }
};

// Seller: Ship All His Items In Order
// --------------------------------
// Seller: Ship All His Items In Order
exports.shipOrderForSeller = async (req, res, next) => {
  try {
    const { orderId, sellerId } = req.params;
    const { courierId } = req.body;

    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      {
        $set: {
          "items.$[i].sellerStatus": "shipped",
          "items.$[i].courierId": courierId,
          "items.$[i].shippedAt": new Date(),
        },
      },
      {
        arrayFilters: [
          { "i.seller": sellerId, "i.sellerStatus": "processing" },
        ],
        new: true,
      },
    );

    if (!order)
      return res.status(400).json({ message: "No items ready to ship" });

    await recomputeAndSave(orderId);

    await sendNotification({
      userId: order.seller,
      role: "seller",
      subject: `Order#${orderId} Shipped`,
      message: `user#${order.user} order#${orderId} has been shipped`,
      link: `/orders/${orderId}`,
    });

    await sendNotification({
      userId: order.user,
      role: "user",
      subject: "Request Refund",
      message: `seller#${order.seller} has shipped order#${orderId}`,
      link: `/orders/${orderId}`,
    });

    res.json({ success: true, message: "All items shipped", order });
  } catch (err) {
    next(err);
  }
};

// Buyer: Confirm Delivery
// Automatic Delivery
exports.confirmItemDelivery = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        user: userId,
        "items._id": itemId,
        "items.sellerStatus": "shipped",
      },
      {
        $set: {
          "items.$.sellerStatus": "delivered",
          "items.$.deliveredAt": new Date(),
        },
      },
      { new: true },
    );

    if (!order)
      return res.status(400).json({ message: "Item not shipped yet" });

    await recomputeAndSave(orderId);

    res.json({ success: true, status: order.status });
  } catch (err) {
    next(err);
  }
};
// not used anymore
exports.userCancelItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { userId } = req.user;

    const order = await Order.findById(orderId);

    if (!order) {
      const error = new Error("No Order match");
      error.statusCode = 400;
      throw error;
    }

    const item = order.items.id(itemId);

    if (!item) {
      const error = new Error("item not found");
      error.statusCode = 400;
      throw error;
    }
    if (["shipped", "delivered"].includes(item.sellerStatus))
      return res
        .status(400)
        .json({ message: "Item already shipped. Cannot cancel." });

    item.sellerStatus = "cancelled";
    item.cancelledBy = "buyer";
    item.cancelledAt = new Date();

    recomputeOrderStatus(order);
    await order.save();

    return res.json({ message: "Item cancelled successfully", order });
  } catch (err) {
    next(err);
  }
};

exports.storeCancelItem = async (req, res, next) => {
  try {
    const { orderId, itemId, sellerId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error("No Order match");
      error.statusCode = 400;
      throw error;
    }

    const item = order.items.id(itemId);
    if (!item) {
      const error = new Error("Item not found");
      error.statusCode = 400;
      throw error;
    }

    if (item.seller.toString() !== sellerId.toString()) {
      const error = new Error("Not your item");
      error.statusCode = 403;
      throw error;
    }

    if (["shipped", "delivered"].includes(item.sellerStatus)) {
      const error = new Error("Item already shipped. Cannot cancel.");
      error.statusCode = 400;
      throw error;
    }

    item.sellerStatus = "cancelled";
    item.cancelledBy = "seller";
    item.cancelledAt = new Date();

    recomputeOrderStatus(order);
    await order.save();

    // notify buyer
    await sendNotification({
      userId: order.user,
      role: "buyer",
      subject: "Item Cancelled by Store",
      message: `An item in Order #${order._id} was cancelled by the seller.`,
      link: `/orders/${order._id}`,
    });

    return res.json({ message: "Item cancelled by seller", order });
  } catch (err) {
    next(err);
  }
};

exports.sellerHandleRefund = async (req, res, next) => {
  try {
    const { orderId, itemId, sellerId } = req.params;
    const { action } = req.body; // "approve" or "reject"

    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error("No Order match");
      error.statusCode = 400;
      throw error;
    }

    const item = order.items.id(itemId);
    if (!item) {
      const error = new Error("Item not found");
      error.statusCode = 400;
      throw error;
    }

    if (item.seller.toString() !== sellerId.toString()) {
      const error = new Error("Not your item");
      error.statusCode = 403;
      throw error;
    }

    if (item.requestStatus !== "requestRefund") {
      const error = new Error("No refund request for this item");
      error.statusCode = 400;
      throw error;
    }

    if (action === "approve") {
      item.refundStatus = "approved";
      item.refundedAt = new Date();
      item.sellerStatus = "refunded";

      await sendNotification({
        userId: order.user,
        role: "buyer",
        subject: "Refund Approved",
        message: `Your refund request for Order #${order._id} was approved.`,
        link: `/orders/${order._id}`,
      });
    } else if (action === "reject") {
      item.sellerStatus = "rejected";

      await sendNotification({
        userId: order.user,
        role: "buyer",
        subject: "Refund Rejected",
        message: `Your refund request for Order #${order._id} was rejected by the seller.`,
        link: `/orders/${order._id}`,
      });
    } else {
      const error = new Error("Invalid action");
      error.statusCode = 400;
      throw error;
    }

    await order.save();
    recomputeOrderStatus(order);

    return res.json({
      success: true,
      message: `Refund ${action}d successfully`,
      order,
    });
  } catch (err) {
    next(err);
  }
};

// VIEW ORDER

exports.getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("user", "username firstname lastname email address")
      .populate(
        "items.product",
        "name description price stock productImage averageRating numOfReviews",
      )
      .populate(
        "items.seller",
        "storeName email phone description address ratings",
      );

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.getOrdersItemById = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId)
      .populate("items.product", "name price productImage")
      .populate("items.seller", "storeName email");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item)
      return res.status(404).json({ message: "Item not found in this order" });

    res.json(item);
  } catch (error) {
    next(error);
  }
};
