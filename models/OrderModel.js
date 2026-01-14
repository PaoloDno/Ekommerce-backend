const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        image: String,
        price: Number,
        stock: Number,
        quantity: Number,
        attributes: {
          type: Map,
          of: String, // e.g., { color: "Red", size: "XL", material: "Cotton" }
        },

        productShippingStatus: {
          type: String,
          enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"],
          default: "pending",
        },

        courier: String,
        trackingNumber: String,
        shippedAt: Date,
        deliveredAt: Date,
      },
    ],


    shippingAddress: {
      street: String,
      city: String,
      country: String,
      postalCode: String,
      phoneNumber: String,
    },

    pricing: {
      itemsTotal: { type: Number, required: true },
      shippingFee: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    payment: {
      method: { type: String, enum: ["cod", "gcash", "paypal"], default: "cod" },
      isPaid: { type: Boolean, default: false },
      paidAt: Date,
      transactionId: String,
    },

    shipping: {
      courier: String,
      trackingNumber: String,
      shippedAt: Date,
      deliveredAt: Date,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
