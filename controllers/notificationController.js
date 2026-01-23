const Notification = require("../models/NotificationModel");
const User = require("../models/UserModel");



// Time Helpers
const oneMonthFromNow = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
};

const oneWeekFromNow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
};


// Create Notification (1 month TTL)
exports.createNotification = async (req, res, next) => {
  try {
    const { role, subject, message, link } = req.body;
    const { userId } = req.user;

    if (!message || !role || !subject) {
      const error = new Error("Subject, message and role are required");
      error.statusCode = 400;
      throw error;
    }

    const notif = await Notification.create({
      userId,
      role,
      subject,
      message,
      link,
      expiresAt: oneMonthFromNow(),
    });

    await User.findByIdAndUpdate(userId, {
      $push: {
        mailbox: {
          notification: notif._id,
          mailedAt: new Date(),
          read: false,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Notification created",
      notification: notif,
    });
  } catch (error) {
    next(error);
  }
};


// Get User Notifications
exports.getUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId)
      .populate("mailbox.notification")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const notifications = user.mailbox
      .filter((m) => m.notification)
      .sort(
        (a, b) =>
          new Date(b.notification.createdAt) -
          new Date(a.notification.createdAt)
      )
      .map((m) => ({
        _id: m.notification._id,
        subject: m.notification.subject,
        message: m.notification.message,
        link: m.notification.link,
        role: m.notification.role,
        read: m.read,
        createdAt: m.notification.createdAt,
      }));

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};


// Mark One As Read (shorten to 1 week)
exports.markRead = async (req, res, next) => {
  try {
    const { notifId } = req.params;
    const { userId } = req.user;

    const result = await User.updateOne(
      { _id: userId, "mailbox.notification": notifId },
      { $set: { "mailbox.$.read": true } }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await Notification.findByIdAndUpdate(notifId, {
      isRead: true,
      expiresAt: oneWeekFromNow(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};


// Mark All As Read (shorten all to 1 week)
exports.markAllRead = async (req, res, next) => {
  try {
    const { userId } = req.user;

    await User.updateOne(
      { _id: userId },
      { $set: { "mailbox.$[].read": true } }
    );

    await Notification.updateMany(
      { userId },
      {
        $set: {
          isRead: true,
          expiresAt: oneWeekFromNow(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};


// Delete One
exports.deleteNotification = async (req, res, next) => {
  try {
    const { notifId } = req.params;
    const { userId } = req.user;

    await User.updateOne(
      { _id: userId },
      { $pull: { mailbox: { notification: notifId } } }
    );

    await Notification.findByIdAndDelete(notifId);

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    next(error);
  }
};


// Broadcast To Users
exports.broadcastUsers = async (req, res, next) => {
  try {
    const { message, link, subject } = req.body;
    if (!message || !subject) {
      return res.status(400).json({ message: "Message & subject required" });
    }

    const users = await User.find({}, "_id");

    const notifDocs = users.map((u) => ({
      userId: u._id,
      role: "user",
      subject,
      message,
      link: link || null,
      expiresAt: oneMonthFromNow(),
    }));

    const notifications = await Notification.insertMany(notifDocs);

    const bulkOps = notifications.map((n) => ({
      updateOne: {
        filter: { _id: n.userId },
        update: {
          $push: {
            mailbox: {
              notification: n._id,
              mailedAt: new Date(),
              read: false,
            },
          },
        },
      },
    }));

    await User.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      count: notifications.length,
    });
  } catch (error) {
    next(error);
  }
};


// Broadcast To Sellers\
exports.broadcastSellers = async (req, res, next) => {
  try {
    const { message, link, subject } = req.body;

    if (!message || !subject) {
      const error = new Error("Message and subject are required");
      error.statusCode = 400;
      throw error;
    }

    const sellers = await User.find({ storeName: { $ne: null } }, "_id");

    const notifDocs = sellers.map((u) => ({
      userId: u._id,
      role: "seller",
      subject,
      message,
      link: link || null,
      expiresAt: oneMonthFromNow(),
    }));

    const notifications = await Notification.insertMany(notifDocs);

    const bulkOps = notifications.map((n) => ({
      updateOne: {
        filter: { _id: n.userId },
        update: {
          $push: {
            mailbox: {
              notification: n._id,
              mailedAt: new Date(),
              read: false,
            },
          },
        },
      },
    }));

    await User.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Broadcast sent to all sellers",
      count: notifications.length,
    });
  } catch (error) {
    next(error);
  }
};
