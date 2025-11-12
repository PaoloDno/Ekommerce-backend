const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],

    shippingAddress: {
      street: { type: String },
      city: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },

    sellerAddress: {
      street: { type: String },
      city: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },

    shippingFee: { type: Number, default: 0 },
    itemTotalPrice: { type: Number, required: true },
    totalSum: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
