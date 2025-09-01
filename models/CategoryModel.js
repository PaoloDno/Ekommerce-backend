const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
}, { timestamps: true });

categorySchema.index({ name: 1 });

module.exports = mongoose.model('Category', categorySchema);
