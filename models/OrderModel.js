const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },

    name: String,
    image: String,
    price: Number,
    stock: Number,
    quantity: Number,

    // Cancellation metadata
    cancelInfo: {
      cancelledBy: {
        type: String,
        enum: ["buyer", "seller", "system"],
      },
      cancelledAt: {
        type: Date,
      },
      cancelReason: {
        type: String,
      },
      refundAmount: {
        type: Number,
      },
    },

    attributes: {
      type: Map,
      of: String,
    },

    sellerStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "forPickUp",
        "shipped",
        "delivered",
        "cancelled",
        "requestRefund",
        "rejectRefund",
        "refunded",
      ],
      default: "pending",
    },

    courier: String,
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date,
    refundedAt: Date,
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [orderItemSchema],

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

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "partially_shipped",
        "shipped",
        "delivered",
        "cancelled",
        "partially_cancelled",
        "refunded",
      ],
      default: "pending",
    },

    refundDeadline: Date,
  },
  { timestamps: true }
);

// --------------------------------
// Order Status Engine
// --------------------------------

function recomputeOrderStatus(order) {
  const statuses = order.items.map((i) => i.sellerStatus);

  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  if (statuses.every((s) => s === "refunded")) return "refunded";
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.every((s) => s === "shipped")) return "shipped";

  if (statuses.some((s) => s === "shipped")) return "partially_shipped";
  if (statuses.some((s) => s === "processing")) return "processing";
  if (statuses.some((s) => s === "cancelled")) return "partially_cancelled";

  return "pending";
}

orderSchema.pre("save", function (next) {
  this.status = recomputeOrderStatus(this);

  // Auto set refund deadline when fully delivered
  if (this.status === "delivered" && !this.refundDeadline) {
    this.refundDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  next();
});

module.exports = mongoose.model("Order", orderSchema);
