const express = require("express");
const router = express.Router();
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware.js");

const {
  createOrder,
  getSellerOrders,
  getStoreOrderById,
  processSellerItem,
  shipSellerItem,
  confirmItemDelivery,
} = require("../controllers/orderController.js");


  {/**
  createOrder,
  getStoreOrderById,
  getSellerOrders,
  shipSellerItem,
  confirmItemDelivery,
  processSellerItem,
   */}

// --------------------
// Buyer
// --------------------
router.post("/", authenticationMiddleware, createOrder);

// confirm delivery of one item
router.put(
  "/:orderId/items/:itemId/confirm",
  authenticationMiddleware,
  confirmItemDelivery
);

// --------------------
// Seller
// --------------------
router.get(
  "/seller/:sellerId",
  authenticationMiddleware,
  getSellerOrders
);

router.get(
  "/seller/:orderId",
  authenticationMiddleware,
  getStoreOrderById
);

// mark item as processing
router.put(
  "/seller/items/:itemId/process",
  authenticationMiddleware,
  processSellerItem
);

// ship item
router.put(
  "/seller/items/:itemId/ship",
  authenticationMiddleware,
  shipSellerItem
);

module.exports = router;
