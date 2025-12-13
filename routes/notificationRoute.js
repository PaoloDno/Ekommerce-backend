const router = require("express").Router();
const { createNotification, getUserNotifications, markRead, markAllRead, deleteNotification, broadcastSellers, broadcastUsers } = require("../controllers/notificationController")
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware");
// User routes
router.get("/notifcation-user", authenticationMiddleware, getUserNotifications);
router.patch("/read/:notifId", authenticationMiddleware, markRead);
router.patch("/read-all/", authenticationMiddleware, markAllRead);
router.delete("/:notifId", authenticationMiddleware, deleteNotification);

// Create notif manually (for testing)
router.post("/", authenticationMiddleware, createNotification);

// Admin broadcasts
router.post("/broadcast/users", authenticationMiddleware, broadcastUsers);
router.post("/broadcast/sellers", authenticationMiddleware, broadcastSellers);

module.exports = router;
