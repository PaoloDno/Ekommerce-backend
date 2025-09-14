const express = require("express");
const { createSeller, getOwnerStore } = require("../controllers/sellerController.js");
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware.js");
const router = express.Router();

router.post("/create", authenticationMiddleware, createSeller);
router.get("/get-owner-store", authenticationMiddleware, getOwnerStore);
module.exports = router;