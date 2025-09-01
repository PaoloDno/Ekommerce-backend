const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  userAvatar: {type: String, default: "A1"},

  address: [{
    street: String,
    city: String,
    country: String,
    postalCode: String
  }],
  isAdmin: { type: Boolean, default: false },
  
  orderhistory: [{
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order'},
    purchasedAt: { type: Date, default: Date.now }
  }],

  reviewHistory: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
    review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review'},
    revieAt: { type: Date, default: Date.now }
  }]
  },{ timestamps:true });

  //Indexes
  userSchema.index({email: 1}),
  userSchema.index({'orderHistory': 1});
  userSchema.index({'reviewHistory': 1});

module.exports = mongoose.model('User', userSchema);