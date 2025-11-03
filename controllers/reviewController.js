const Review = require("../models/ReviewModel.js");
const Product = require("../models/ProductModel.js");
const User = require("../models/UserModel.js");
const Seller = require("../models/SellerModel.js");

exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const {userId} = req.user; // unified

    const product = await Product.findById(productId);
    if (!product) {
      const error = new Error("Product not found.");
      error.statusCode = 404;
      throw error;
    }

    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      const error = new Error("You have already reviewed this product.");
      error.statusCode = 400;
      throw error;
    }

    const review = new Review({
      product: productId,
      user: userId,
      rating,
      comment,
    });
    await review.save();

    await Promise.all([
      Product.findByIdAndUpdate(productId, { $push: { reviews: review._id } }),
      User.findByIdAndUpdate(userId, {
        $push: { reviewHistory: { product: productId, review: review._id } },
      }),
    ]);

    await Product.updateProductRating(productId);
    await Seller.updateSellerRating(userId);

    res.status(201).json({
      success: true,
      message: "Review created successfully.",
      review,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductReview = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate("user", "username email userAvatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!review) {
      const error = new Error("Review not found.");
      error.statusCode = 404;
      throw error;
    }

    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    await review.save();

    await Product.updateProductRating(review.product);

    res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      review,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!review) {
      const error = new Error("Review not found or not authorized.");
      error.statusCode = 404;
      throw error;
    }

    await Promise.all([
      Product.findByIdAndUpdate(review.product, { $pull: { reviews: review._id } }),
      User.findByIdAndUpdate(req.user.id, {
        $pull: { reviewHistory: { review: review._id } },
      }),
    ]);

    await Product.updateProductRating(review.product);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
