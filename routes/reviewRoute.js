const express = require("express");
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware");
const { 
  createReview,
  getProductReview,
  updateReview,
  deleteReviews 
} = require("../controllers/reviewController");
const router = express.Router();

router.post("/", authenticationMiddleware, createReview);
router.get("/:productId", authenticationMiddleware, getProductReview);
router.put("/:id", authenticationMiddleware, updateReview);
router.delete("/:id", authenticationMiddleware, deleteReviews);

module.exports = router;