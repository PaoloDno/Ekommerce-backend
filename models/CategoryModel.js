const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true, 
      unique: true // Ensures category names are unique
    },
    relatedCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
    ],
  }, 
  { timestamps: true }
);

// Index to speed up lookups by name
categorySchema.index({ name: 1 });

module.exports = mongoose.model('Category', categorySchema);
