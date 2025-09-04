const Review = require("../models/ReviewModel.js");
const Product = require("../models/ProductModel.js");
const User = require("../models/UserModel.js");

exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;

    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id,
      rating,
      comment,
    });

    if (!existingReview) {
      const error = new Error("Review for this user alreaady exist");
      error.statusCode = 400;
      throw error;
    }

    const review = new Review({
      product: productId,
      user: req.user.id,
      rating,
      comment,
    });
    await review.save();

    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        reviewHistory: {
          product: productId,
          review: review._id,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Review Created",
      review });
  } catch (error) {
    next(error);
  }
};

exports.getProductReview = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate("user", "username email")
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
    const review = await Review.findOne({ _id: req.params.id, user: req.user.id });

    if (!review) {
      const error = new Error("Review Not Found!");
      error.statusCode = 404;
      throw error;
    }

    review.rating = rating || review.rating;
    review.comment = rating || review.comment;

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review Updated!",
      review
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteReviews = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!review) {
      const error = new Error("Review Not Found!");
      error.statusCode = 404;
      throw error;
    }

    await User.findByIdAndDelete(req.user.id, {
      $pull: { reviewHistory: { review: req.params.id}},
    })

  } catch (error) {
    next(error);
  }
};