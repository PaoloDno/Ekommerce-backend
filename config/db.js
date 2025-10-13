const mongoose = require("mongoose");

mongoose.connection.on("connected", () => {
  console.log("MongoDB is connected:", mongoose.connection.host);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB server connected");
  }
  catch(error) {
    console.error("MongoDB connection server failed", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;