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

    attributes: {
      type: Map,
      of: String,
    },

    sellerStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },

    courier: String,
    trackingNumber: String,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
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

    // Derived automatically
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
  },
  { timestamps: true }
);

// --------------------------------
// Order Status Engine (Automatic)
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

// Auto update order.status before every save
orderSchema.pre("save", function (next) {
  this.status = recomputeOrderStatus(this);
  next();
});

// --------------------------------
// Smart Helpers
// --------------------------------

// Check if order still has undelivered items
orderSchema.virtual("hasUndeliveredItems").get(function () {
  return this.items.some((i) => i.sellerStatus !== "delivered");
});

// Check undelivered items for a specific seller
orderSchema.methods.hasUndeliveredItemsForSeller = function (sellerId) {
  return this.items.some(
    (i) =>
      i.seller.toString() === sellerId.toString() &&
      i.sellerStatus !== "delivered"
  );
};

// Ready for escrow / payout system
orderSchema.methods.isSellerCompleted = function (sellerId) {
  return this.items.every(
    (i) =>
      i.seller.toString() !== sellerId.toString() ||
      i.sellerStatus === "delivered"
  );
};

module.exports = mongoose.model("Order", orderSchema);
