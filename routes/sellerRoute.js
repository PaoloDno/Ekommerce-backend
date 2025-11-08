const express = require("express");
const { createSeller, getOwnerStore, getStoreId, getStores} = require("../controllers/sellerController.js");
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware.js");
const paginationMiddleware = require("../middlewares/PaginationMiddleware.js");
const router = express.Router();

router.post("/create", authenticationMiddleware, createSeller);
router.get("/get-owner-store", authenticationMiddleware, getOwnerStore);
router.get("/:storeId", getStoreId);
router.get("/", paginationMiddleware, getStores);
module.exports = router;
