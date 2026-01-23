const Notification = require("../models/NotificationModel");
const User = require("../models/UserModel");

const oneMonthFromNow = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
};

module.exports = async function sendNotification({
  userId,
  role,
  subject,
  message,
  link,
  expiresAt, // optional override
}) {
  const notif = await Notification.create({
    userId,
    role,
    subject,
    message,
    link,
    expiresAt: expiresAt || oneMonthFromNow(),
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