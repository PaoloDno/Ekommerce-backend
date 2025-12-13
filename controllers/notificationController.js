const Notification = require("../models/NotificationModel");
const User = require("../models/UserModel");


// -------------------------------
// CREATE A NOTIFICATION
// -------------------------------
exports.createNotification = async (req, res, next) => {
  try {
    const { userId, role, message, link } = req.body;

    if (!message || !role) {
      const error = new Error("Message and role are required");
      error.statusCode = 400;
      throw error;
    }

    const notif = await Notification.create({
      userId: userId || null,
      role,
      message,
      link: link || null,
    });

    // If a userId is provided → also push to mailbox
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          mailbox: {
            notification: notif._id,
            mailedAt: new Date(),
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Notification created",
      notification: notif,
    });
  } catch (error) {
    next(error);
  }
};



// -------------------------------
// GET CURRENT USER NOTIFICATIONS
// -------------------------------
exports.getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};



// -------------------------------
// MARK AS READ
// -------------------------------
exports.markRead = async (req, res, next) => {
  try {
    const { notifId } = req.params;

    const notif = await Notification.findByIdAndUpdate(
      notifId,
      { read: true },
      { new: true }
    );

    if (!notif) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      notification: notif,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------
// MARK ALL NOTIFICATIONS AS READ
// -------------------------------
exports.markAllRead = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      const error = new Error("Unauthorized");
      error.statusCode = 401;
      throw error;
    }

    // Update all notifications
    await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    // (Optional) Also update mailbox flags if needed
    await User.updateOne(
      { _id: userId },
      { $set: { "mailbox.$[].read": true } }, // update all mailbox items
      { multi: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------
// DELETE NOTIFICATION
// -------------------------------
exports.deleteNotification = async (req, res, next) => {
  try {
    const { notifId } = req.params;

    const notif = await Notification.findByIdAndDelete(notifId);

    if (!notif) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    // Also remove from user's mailbox
    await User.updateMany(
      {},
      { $pull: { mailbox: { notification: notifId } } }
    );

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    next(error);
  }
};



// -------------------------------
// ADMIN: BROADCAST TO ALL USERS
// -------------------------------
exports.broadcastUsers = async (req, res, next) => {
  try {
    const { message, link } = req.body;

    if (!message) {
      const error = new Error("Message is required");
      error.statusCode = 400;
      throw error;
    }

    const users = await User.find({}, "_id");

    const notifDocs = users.map((u) => ({
      userId: u._id,
      role: "user",
      message,
      link: link || null,
    }));

    const notifications = await Notification.insertMany(notifDocs);

    // Push to mailbox
    for (const notif of notifications) {
      await User.findByIdAndUpdate(notif.userId, {
        $push: { mailbox: { notification: notif._id, mailedAt: new Date() } },
      });
    }

    res.status(200).json({
      success: true,
      message: "Broadcast sent to all users",
      count: notifications.length,
    });

  } catch (error) {
    next(error);
  }
};



// -------------------------------
// ADMIN: BROADCAST TO ALL SELLERS
// -------------------------------
exports.broadcastSellers = async (req, res, next) => {
  try {
    const { message, link } = req.body;

    if (!message) {
      const error = new Error("Message is required");
      error.statusCode = 400;
      throw error;
    }

    const sellers = await User.find({ storeName: { $ne: null } }, "_id");

    const notifDocs = sellers.map((u) => ({
      userId: u._id,
      role: "seller",
      message,
      link: link || null,
    }));

    const notifications = await Notification.insertMany(notifDocs);

    // Push to mailbox
    for (const notif of notifications) {
      await User.findByIdAndUpdate(notif.userId, {
        $push: { mailbox: { notification: notif._id, mailedAt: new Date() } },
      });
    }

    res.status(200).json({
      success: true,
      message: "Broadcast sent to all sellers",
      count: notifications.length,
    });

  } catch (error) {
    next(error);
  }
};
