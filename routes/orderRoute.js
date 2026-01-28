const express = require("express");
const router = express.Router();
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware.js");

const { createOrder, confirmItemDelivery, getSellerOrders, getStoreOrderById, acceptSingleItem, acceptAllMyItems, shipItem, shipOrderForSeller, storeCancelItem, sellerHandleRefund, getOrderById, getOrdersItemById } = require("../controllers/orderController.js");
const { getUserOrders, cancelUserOrder, requestUserRefundOrder } = require("../controllers/userOrderController.js");




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

// seller cancel item
router.put("/seller/:sellerId/order/:orderId/cancel-item/:itemId/", authenticationMiddleware, storeCancelItem);

// sellerhandle refund item
router.put("/seller/:sellerId/order/:orderId/handle-refund/:itemId/", authenticationMiddleware, sellerHandleRefund );

//**
// USER
// **/

// user order fetch
router.get("/user-order/", authenticationMiddleware, getUserOrders);

// user cancel order
router.patch("/user-cancel/:orderId", authenticationMiddleware, cancelUserOrder);

// user request refund
router.patch("/user-refund/:itemId", authenticationMiddleware, requestUserRefundOrder);

//**
// VIEW
// **/

// orders
router.get("/:orderId", authenticationMiddleware, getOrderById);

// items
router.get("/item/:itemId", authenticationMiddleware, getOrdersItemById);


//i know it says patch but im doing put
module.exports = router;
