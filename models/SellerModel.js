const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  storeName: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  phone: { type: String },
  description: { type: String },

  sellerLogo: { type: String, default: "A1"},
  sellerBanner: { type: String, default: "B1"},

  address: {
    street: String,
    city: String,
    country: String,
    postalCode: String
  },

  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  ratings: {
    average: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
  },

  isVerified: { type: Boolean, default: false },

  salesHistory: [{
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    soldAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

sellerSchema.index({ 'salesHistory.order': 1 });

sellerSchema.statics.updateSellerRating = async function (ownerId) {
  const Product = mongoose.model("Product");

  const seller = await this.findOne({ owner: ownerId });
  if (!seller) return;

  const products = await Product.find({ seller: seller._id });

  if (products.length === 0) {
    seller.ratings.average = 0;
    seller.ratings.totalReviews = 0;
    await seller.save();
    return;
  }
  const totalReviews = products.reduce((sum, p) => sum + (p.numOfReviews || 0), 0);
  const weightedSum = products.reduce(
    (sum, p) => sum + (p.averageRating * (p.numOfReviews || 0)),
    0
  );

  const average =
    totalReviews > 0 ? (weightedSum / totalReviews).toFixed(1) : 0;

  seller.ratings.average = average;
  seller.ratings.totalReviews = totalReviews;
  await seller.save();
};




module.exports = mongoose.model('Seller', sellerSchema);