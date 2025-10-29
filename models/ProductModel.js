const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, unique: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    brand: { type: String },
    productImage: { type: String, default: "A1" },
    images: {
      type: [String],
      default: [],
      validate: [
        (val) => Array.isArray(val),
        "Images must be an array of strings",
      ],
    },
    attributes: { type: Map, of: String },

    seller: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },

    
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numOfReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

productSchema.statics.updateProductRating = async function (productId) {
  const Review = mongoose.model("Review");

  const reviews = await Review.find({ product: productId });
  if (reviews.length === 0) {
    await this.findByIdAndUpdate(productId, {
      averageRating: 0,
      numOfReviews: 0,
    });
    return;
  }

  const avg =
    reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;

  await this.findByIdAndUpdate(productId, {
    averageRating: avg.toFixed(1),
    numOfReviews: reviews.length,
  });
};

module.exports = mongoose.model("Product", productSchema);
