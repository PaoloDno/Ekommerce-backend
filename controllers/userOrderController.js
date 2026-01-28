const Order = require("../models/OrderModel");
const sendNotification = require("../utils/sendNotification");

// Helper

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

exports.getUserOrders = async (req, res, next) => {
  try {
    console.log("call");
    const { userId } = req.user;
    let orders = await Order.find({ user: userId })
      .populate({
        path: "items.seller",
      })
      .populate({
        path: "items.product",
      })
      .sort({ created: -1 });

    const updated = autoDeliverItems(orders);

    if (updated) {
      for (const order of orders) {
        await order.save(); // triggers pre-save recompute + refundDeadline
      }
    }

    console.log("getUserOrder", orders);
    res.json({ success: true, userOrders: orders });
  } catch (error) {
    next(error);
  }
};

exports.cancelUserOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: "cancelled",
          "items.$[i].sellerStatus": "cancelled",
        },
      },
      {
        arrayFilters: [
          { "i.sellerStatus": { $in: ["pending", "processing"] } },
        ],
        new: true,
      },
    );

    await sendNotification({
      userId: order.seller,
      role: "seller",
      subject: "Order cancelled",
      message: `user ${order.user} has cancelled order#${orderId}`,
      link: `/orders/${orderId}`,
    });

    await sendNotification({
      userId: userId,
      role: "user",
      subject: "Request Refund",
      message: `cancellation for ${orderId}`,
      link: `/orders/${itemId}`,
    });

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

exports.requestUserRefundOrder = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { userId } = req.user;

    const order = await Order.findOneAndUpdate(
      {
        user: userId,
        "items._id": itemId,
        "items.sellerStatus": "delivered",
      },
      {
        $set: {
          "items.$.sellerStatus": "requestRefund",
        },
      },
      { new: true },
    );

    if (!order)
      return res.status(400).json({
        message: "Item not found or not eligible for refund",
      });

    await sendNotification({
      userId: order.seller,
      role: "seller",
      subject: "Request Refund",
      message: `user ${userId} is requesting for a refund for ${itemId}`,
      link: `/order/${itemId}`,
    });

    await sendNotification({
      userId: userId,
      role: "user",
      subject: "Request Refund",
      message: `requesting for a refund for ${itemId}`,
      link: `/order/${itemId}`,
    });

    res.json({
      success: true,
      message: "Refund requested successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
};
