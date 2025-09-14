const Seller = require("../models/SellerModel");
const User = require("../models/SellerModel");


exports.createSeller = async (req, res, next) => {
  try {
    const {
      storeName,
      owner,
      email,
      phone,
      description,
      sellerLogo,
      sellerBanner,
      address,
    } = req.body;

    console.log("creating store");

    const isOwnerExist = await User.findById(req.user.owner);
    if (!isOwnerExist) {
      const error = new Error("Invalid User");
      error.statusCode = 404;
      throw error;
    };

    const isOwnerOwnedStore = await Seller.findOne({owner})
    if (isOwnerOwnedStore) {
      const error = new Error("Store exist for owner");
      error.statusCode = 404;
      throw error;
    }

    const seller = new Seller({
      storeName,
      owner,
      email,
      phone,
      description,
      sellerLogo,
      sellerBanner,
      address,
    });

    await seller.save();
    res.statusCode(201).json({message: "Store saved!"});
  } catch (error) {
    next(error);
  };
}

exports.getOwnerStore = async (req, res, next) => {
  try {

    const { userId } = req.user;

    const foundOwnerStore = await Seller.findOne( owner = userId );
    if (!foundOwnerStore) {
      const error = new Error("No Store");
      error.statusCode = 400;
      throw error;
    }

    res.status(200).json({
      success: true,
      Seller: foundOwnerStore,
      message: "Owner Store successfully fetch"
    })

  } catch (error){
    next(error);
  }
};

