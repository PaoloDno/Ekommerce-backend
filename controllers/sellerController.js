
const Seller = require("../models/SellerModel");
const User = require("../models/UserModel");


exports.createSeller = async (req, res, next) => {
  try {
    console.log("A");
    const {
      storeName,
      email,
      phone,
      description,
      sellerLogo,
      sellerBanner,
      address,
    } = req.body;

    const { userId } = req.user;
    console.log(userId);
    console.log("creating store");
    console.log("req.user:", req.user);

    const isOwnerExist = await User.findById(userId);

    if (!isOwnerExist) {
      const error = new Error("Invalid User");
      error.statusCode = 404;
      throw error;
    }

    console.log("Awawawa");

    const isOwnerOwnedStore = await Seller.findOne({ owner: userId });
    if (isOwnerOwnedStore) {
      const error = new Error("Store exist for this owner");
      error.statusCode = 409;
      throw error;
    }

    const seller = new Seller({
      storeName,
      owner: userId,
      email,
      phone,
      description,
      sellerLogo,
      sellerBanner,
      address,
    });
    //save store
    await seller.save();
    //save in user
    isOwnerExist.storeName = storeName;
    await isOwnerExist.save();
    res.status(201).json({ message: "Store saved!" });
  } catch (error) {
    next(error);
  }
};

exports.getOwnerStore = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const foundOwnerStore = await Seller.findOne({owner: userId})
    .populate({
        path: "products",         
        model: "Product",         
        select: "name price stock productImage images", 
      });
      
    if (!foundOwnerStore) {
      const error = new Error("No Store");
      error.statusCode = 400;
      throw error;
    }
    console.log(foundOwnerStore);
    res.status(200).json({
      success: true,
      data: foundOwnerStore,
      message: "Owner Store successfully fetch",
    });
  } catch (error) {
    next(error);
  }
};
