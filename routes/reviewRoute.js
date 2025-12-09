const express = require('express');
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware");
const { 
  createReview,
  getProductReview,
  deleteReview
} = require("../controllers/reviewController");
const router = express.Router();

router.post("/", authenticationMiddleware, createReview);
router.get("/:productId", authenticationMiddleware, getProductReview);
router.delete("/:id", authenticationMiddleware, deleteReview);

module.exports = router;