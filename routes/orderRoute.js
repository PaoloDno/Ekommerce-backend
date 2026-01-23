const express = require("express");
const router = express.Router();
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware.js");

const { createOrder, confirmItemDelivery, getSellerOrders, getStoreOrderById, acceptSingleItem, acceptAllMyItems, shipItem, shipOrderForSeller } = require("../controllers/orderController.js");

// users
router.post("/", authenticationMiddleware, createOrder);
router.patch("/:orderId/Item/:itemId/confirm", authenticationMiddleware, confirmItemDelivery);

// seller get
router.get("/seller/:sellerId", authenticationMiddleware, getSellerOrders);
router.get("/seller-order/:orderId", authenticationMiddleware, getStoreOrderById);

// seller accept
router.put("/seller/:orderId/accept-item/:itemId", authenticationMiddleware, acceptSingleItem);
router.put("/seller/:orderId/accept-all/:sellerId", authenticationMiddleware, acceptAllMyItems);

//seller ship
router.put("/seller/:orderId/ship-item/:itemId", authenticationMiddleware, shipItem);
router.put("/seller/:orderId/ship-all/:sellerId", authenticationMiddleware, shipOrderForSeller);


module.exports = router;
