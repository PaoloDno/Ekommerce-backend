const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  storeName: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  phone: { type: String },
  description: { type: String },

  sellerLogo: { type: String, default: "A1"},
  sellerBanner: { type: String, default: "A1"},

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

sellerSchema.index({ storeName: 1 });
sellerSchema.index({ 'salesHistory.order': 1 });

module.exports = mongoose.model('Seller', sellerSchema);