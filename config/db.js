const mongoose = require("mongoose");


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