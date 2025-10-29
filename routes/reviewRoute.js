const express = require('express');
const authenticationMiddleware = require("../middlewares/AuthenticationMiddleware");
const { 
  createReview,
  getProductReview,
  updateReview,
  deleteReview
} = require("../controllers/reviewController");
const router = express.Router();

router.post("/", authenticationMiddleware, createReview);
router.get("/:productId", authenticationMiddleware, getProductReview);
router.put("/:id", authenticationMiddleware, updateReview);
router.delete("/:id", authenticationMiddleware, deleteReview);

module.exports = router;