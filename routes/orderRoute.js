const express = require("express");
const { authenticationMiddleware} = require('../middlewares/AuthenticationMiddleware.js');
const { adminMiddleware } = require('../middlewares/AuthorizationMiddleware.js');
const { 
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus
 } = require("../controllers/orderController.js");
const router = express.Router();

router.post("/", authenticationMiddleware, createOrder);
router.get("/users-orders", authenticationMiddleware, getUserOrders);
router.get("/:orderId", authenticationMiddleware, getOrderById);
router.put("/:orderId/status", authenticationMiddleware, adminMiddleware, updateOrderStatus);

module.exports = router;