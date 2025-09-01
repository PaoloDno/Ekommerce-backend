const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String },
  stock: { type: Number, default: 0 },
  productImage: {type: String, default: "A1"},
  images: [String],
  attributes: { type: Map, of: String }, // e.g. { color: "Red", size: "M" }

  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' } // who sells it
}, { timestamps: true });

productSchema.index({ name: 'text', category: 1, price: 1 });

module.exports = mongoose.model('Product', productSchema);