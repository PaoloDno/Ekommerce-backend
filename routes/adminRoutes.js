const express = require("express");
const { getProductsForAdmin, getOrdersForAdmin, getSellersForAdmin , getUsersForAdmin, getAdminDashboardStats } = require("../controllers/adminController");

const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware");
const authorizationMiddleware = require("../middlewares/AuthorizationMiddleware");
const paginationMiddleware = require("../middlewares/PaginationMiddleware");

const router = express.Router();

router.get("/get-dashboard-stats", authenticationMiddleware, authenticationMiddleware, getAdminDashboardStats);

router.get("/get-products", authenticationMiddleware, authorizationMiddleware, paginationMiddleware, getProductsForAdmin);
router.get("/get-orders", authenticationMiddleware, authorizationMiddleware, paginationMiddleware, getOrdersForAdmin);
router.get("/get-stores", authenticationMiddleware, authorizationMiddleware, paginationMiddleware, getSellersForAdmin);
router.get("/get-users", authenticationMiddleware, authorizationMiddleware, paginationMiddleware, getUsersForAdmin);

module.exports = router;