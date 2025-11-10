const Seller = require("../models/SellerModel");
const User = require("../models/UserModel");
const Review = require("../models/ReviewModel.js");

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

    await seller.save();

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

    const foundOwnerStore = await Seller.findOne({ owner: userId }).populate({
      path: "products",
      model: "Product",
      select: "name price stock productImage images averageRating",
    });

    if (!foundOwnerStore) {
      const error = new Error("No Store");
      error.statusCode = 400;
      throw error;
    }
    console.log(foundOwnerStore);

    const sellerProducts = foundOwnerStore.products.map((p) => p._id);

    const top3 = await Review.find({ product: { $in: sellerProducts } })
      .sort({ rating: -1 })
      .limit(3)
      .populate("user", "username");

    const low3 = await Review.find({ product: { $in: sellerProducts } })
      .sort({ rating: 1 })
      .limit(3)
      .populate("user", "username");

    const storeData = {
      ...foundOwnerStore.toObject(),
      reviews: { top3, low3 },
    };
    res.status(200).json({
      success: true,
      data: storeData,
      message: "Owner Store successfully fetch",
    });
  } catch (error) {
    next(error);
  }
};

exports.getStoreId = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    console.log(storeId);
    const foundStore = await Seller.findById(storeId).populate({
      path: "products",
      model: "Product",
      select: "name price stock productImage images averageRating",
    });
    if (!foundStore) {
      const error = new Error("Could'nt find Store");
      error.statusCode = 400;
      throw error;
    }
    console.log(foundStore);

    const sellerProducts = foundStore.products.map((p) => p._id);

    const top3 = await Review.find({ product: { $in: sellerProducts } })
      .sort({ rating: -1 })
      .limit(3)
      .populate("user", "username");

    const low3 = await Review.find({ product: { $in: sellerProducts } })
      .sort({ rating: 1 })
      .limit(3)
      .populate("user", "username");

    await Seller.updateSellerRating(foundStore.owner);

    const storeData = {
      ...foundStore.toObject(),
      reviews: { top3, low3 },
    };

    res.status(200).json({
      success: true,
      data: storeData,
      message: "Owner Store successfully fetch",
    });
  } catch (error) {
    next(error);
  }
};

exports.getStores = async (req, res, next) => {
  try {
    const { storeName, isVerified, minrating, city, country } = req.query;
    const { resultsPerPage, currentPage, skipDocuments, sortBy, sortOrder } =
      req.pagination;

    const allowedSorts = [
      "createdAt",
      "storeName",
      "ratings.average",
      "isVerified",
    ];

    const effectiveSortBy = allowedSorts.includes(sortBy)
      ? sortBy
      : "createdAt";

    const filter = {};

    if (isVerified === "true") {
      filter.isVerified = true;
    }

    if (minrating) {
      filter["ratings.average"] = { $gte: Number(minrating) };
    }

    if (storeName) {
      filter.storeName = { $regex: storeName, $options: "i" };
    }

    if (city) {
      filter.address.city = city;
    }

    if (country) {
      filter.address.country = country;
    }

    const stores = await Seller.find(filter)
      .select("-salesHistory")
      .sort({ [effectiveSortBy]: sortOrder })
      .skip(skipDocuments)
      .limit(resultsPerPage);

    const totalCounts = await Seller.countDocuments(filter);

    res.json({
      stores,
      pagination: {
        currentPage,
        resultsPerPage,
        totalCounts,
        totalPages: Math.ceil(totalCounts / resultsPerPage),
        sortBy: effectiveSortBy,
        sortOrder,
      },
    });
  } catch (error) {
    next(error);
  }
};
