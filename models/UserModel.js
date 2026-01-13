const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    middlename: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    userAvatar: { type: String, default: "A1" },
    userBanner: { type: String, default: "B2" },
    storeName: { type: String, default: null },

    userTheme: { type: String, default: "default" },

    address: [
      {
        street: String,
        city: String,
        country: String,
        postalCode: String,
        phoneNumber: String,
      },
    ],
    isAdmin: { type: Boolean, default: false },

    orderhistory: [
      {
        order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        purchasedAt: { type: Date, default: Date.now },
      },
    ],

    reviewHistory: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        review: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
        reviewAt: { type: Date, default: Date.now },
      },
    ],

    mailbox: [
      {
        notification: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Notification",
        },
        mailedAt: { type: Date, default: Date.now },
        read: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

//Indexes
userSchema.index({ orderhistory: 1 });
userSchema.index({ reviewHistory: 1 });

module.exports = mongoose.model("User", userSchema);
