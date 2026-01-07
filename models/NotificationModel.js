const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "seller", "admin"],
    required: true,
  },
  subject: { type: String, required: true},
  message: { type: String, required: true},
  link: { type: String },

}, {timestamps: true});

module.exports = mongoose.model("Notification", NotificationSchema);