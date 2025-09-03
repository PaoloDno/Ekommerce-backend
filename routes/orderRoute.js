const express = require("express");
const { authMiddleware } = require('../middlewares/AuthMiddleware.js');
const {adminMiddleware} = require('../middlewares/AuthorizationMiddleware.js');
const { 
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus
 } = require("../controllers/orderController.js");
const router = express.Router();

router.post("/", authMiddleware, createOrder);
router.get("/users-orders", authMiddleware, getUserOrders);
router.get("/:orderId", authMiddleware, getOrderById);
router.put("/:orderId/status", authMiddleware, adminMiddleware, updateOrderStatus);

module.exports = router;