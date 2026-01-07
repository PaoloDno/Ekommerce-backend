const express = require("express");
const {
  createNotification,
  getUserNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  broadcastUsers,
  broadcastSellers,
} = require("../controllers/notificationController");
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware");
const router = express.Router();

router.post("/", authenticationMiddleware, createNotification);
router.get("/user-order", authenticationMiddleware, getUserNotifications);
router.patch("/:notifId", authenticationMiddleware, markRead);
router.patch("/read-all", authenticationMiddleware, markAllRead);
router.delete("/:notifId", authenticationMiddleware, deleteNotification);

module.exports = router;


// admin soon