const Seller = require("../models/SellerModel");
const User = require("../models/UserModel");
const Review = require("../models/ReviewModel.js");
const Order = require("../models/OrderModel.js");

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
      .populate("user", "username userAvatar")
      .populate("product", "name productImage");

    const low3 = await Review.find({ product: { $in: sellerProducts } })
      .sort({ rating: 1 })
      .limit(3)
      .populate("user", "username userAvatar")
      .populate("product", "name productImage");

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

exports.getOwnerStore = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const seller = await Seller.findOne({ owner: userId })
      .populate({
        path: "products",
        select: "name price stock productImage averageRating",
      })

    if (!seller) {
      const error = new Error("No Store");
      error.statusCode = 400;
      throw error;
    }

    const productIds = seller.products.map(p => p._id);

    // ============================
    // ORDERS RELATED TO SELLER
    // ============================
    const orders = await Order.find({
      "items.product": { $in: productIds },
      status: { $in: ["paid", "shipped", "delivered"] },
    }).lean();

    let totalRevenue = 0;
    let totalOrders = orders.length;

    orders.forEach(order => {
      order.items.forEach(item => {
        if (productIds.some(id => id.equals(item.product))) {
          totalRevenue += item.price * item.quantity;
        }
      });
    });

    const averageOrderValue =
      totalOrders > 0 ? +(totalRevenue / totalOrders).toFixed(2) : 0;

    // ============================
    // TIME-BASED METRICS
    // ============================
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const monthlyRevenue = orders
      .filter(o => o.createdAt >= startOfMonth)
      .reduce((sum, o) => {
        o.items.forEach(i => {
          if (productIds.some(id => id.equals(i.product))) {
            sum += i.price * i.quantity;
          }
        });
        return sum;
      }, 0);

    const dailyRevenue = orders
      .filter(o => o.createdAt >= startOfDay)
      .reduce((sum, o) => {
        o.items.forEach(i => {
          if (productIds.some(id => id.equals(i.product))) {
            sum += i.price * i.quantity;
          }
        });
        return sum;
      }, 0);

    // ============================
    // PRODUCT METRICS
    // ============================
    const totalProducts = seller.products.length;
    const outOfStockProducts = seller.products.filter(p => p.stock === 0).length;
    const lowStockProducts = seller.products.filter(p => p.stock <= 5).length;

    // ============================
    // REVIEWS
    // ============================
    const top3 = await Review.find({ product: { $in: productIds } })
      .sort({ rating: -1 })
      .limit(3)
      .populate("user", "username");

    const low3 = await Review.find({ product: { $in: productIds } })
      .sort({ rating: 1 })
      .limit(3)
      .populate("user", "username");

    const storeData = {
        ...seller.toObject(),
        reviews: { top3, low3 },
        metrics: {
          revenue: {
            totalRevenue,
            monthlyRevenue,
            dailyRevenue,
            averageOrderValue,
          },
          orders: {
            totalOrders,
          },
          products: {
            totalProducts,
            outOfStockProducts,
            lowStockProducts,
          },
        },
      }

    res.status(200).json({
      success: true,
      data: storeData,
      message: "Owner store fetched successfully",
    });
  } catch (error) {
    next(error);
  }
};


exports.getStores = async (req, res, next) => {
  try {
    const { storeName, isVerified, minrating, city, country } = req.query;
    const {
      resultsPerPage,
      currentPage,
      skipDocuments,
      sortBy,
      sortOrder,
    } = req.pagination;

    const allowedSorts = [
      "createdAt",
      "storeName",
      "ratings.average",
      "isVerified",
    ];

    const effectiveSortBy = allowedSorts.includes(sortBy)
      ? sortBy
      : "createdAt";

    let filter = {};

    if (storeName) {
      filter.storeName = { $regex: storeName, $options: "i" };
    }

    if (isVerified === "true") {
      filter.isVerified = true;
    }

    if (minrating) {
      filter["ratings.average"] = { $gte: Number(minrating) };
    }

    const addressFilters = [];
    if (city) addressFilters.push({ "address.city": city });
    if (country) addressFilters.push({ "address.country": country });

    if (addressFilters.length > 0) {
      filter.$and = addressFilters;
    }

    let allStores = await Seller.find(filter).select("-salesHistory");

    const direction = sortOrder === -1 ? -1 : 1;

    allStores.sort((a, b) => {
      let aVal, bVal;

      if (effectiveSortBy === "ratings.average") {
        aVal = a.ratings?.average || 0;
        bVal = b.ratings?.average || 0;
      } else {
        aVal = a[effectiveSortBy];
        bVal = b[effectiveSortBy];
      }

      if (aVal > bVal) return 1 * direction;
      if (aVal < bVal) return -1 * direction;
      return 0;
    });

    const totalCounts = allStores.length;
    const totalPages = Math.ceil(totalCounts / resultsPerPage);

    const stores = allStores.slice(
      skipDocuments,
      skipDocuments + resultsPerPage
    );

    res.json({
      stores,
      pagination: {
        currentPage,
        resultsPerPage,
        totalCounts,
        totalPages,
        sortBy: effectiveSortBy,
        sortOrder: direction === 1 ? "asc" : "desc",
      },
    });
  } catch (error) {
    next(error);
  }
};