const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String },
  productImage: {type: String, default: "A1"},
  images: {type: String, default: []},
  attributes: { type: Map, of: String }, // e.g. { color: "Red", size: "M" }

  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' }
}, { timestamps: true });



module.exports = mongoose.model('Product', productSchema);