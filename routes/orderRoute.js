const express = require("express");
const authenticationMiddleware = require('../middlewares/AuthenticationMiddleware.js');
const adminMiddleware = require('../middlewares/AuthorizationMiddleware.js');
const { 
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getSellerOrders,
  shipSellerItems,
  confirmItemDelivery
 } = require("../controllers/orderController.js");
const router = express.Router();

router.post("/", authenticationMiddleware, createOrder);
router.get("/users-orders", authenticationMiddleware, getUserOrders);
router.get("/:orderId", authenticationMiddleware, getOrderById);
router.put("/:orderId/status", authenticationMiddleware, adminMiddleware, updateOrderStatus);
router.get("/store/:sellerId", authenticationMiddleware, getSellerOrders);
router.put("/store/ship/:orderId", authenticationMiddleware, shipSellerItems);
router.put("/delivered/:orderId", authenticationMiddleware, confirmItemDelivery);

module.exports = router;