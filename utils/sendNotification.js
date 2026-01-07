const Notification = require("../models/NotificationModel");
const User = require("../models/UserModel");

module.exports = async function sendNotification({
  userId,
  role,
  subject,
  message,
  link,
}) {
  const notif = await Notification.create({
    userId,
    role,
    subject,
    message,
    link,
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

  return notif;
};
