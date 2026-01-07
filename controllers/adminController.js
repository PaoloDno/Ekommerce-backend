const Product = require("../models/ProductModel");
const Order = require("../models/OrderModel");
const Seller = require("../models/SellerModel");
const User = require("../models/UserModel");

exports.getAdminDashboardStats = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    const [
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,

      // Orders by status
      ordersByStatusAgg,

      // Revenue (exclude cancelled)
      revenueAgg,

      // Recent activity
      newUsers,
      newOrders,
    ] = await Promise.all([
      User.countDocuments(),
      Seller.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),

      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: { status: { $ne: "cancelled" } },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalSum" },
          },
        },
      ]),

      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    // Normalize order status result
    const ordersByStatus = {};
    ordersByStatusAgg.forEach((o) => {
      ordersByStatus[o._id] = o.count;
    });

    res.status(200).json({
      success: true,
      dashboard: {
        totals: {
          users: totalUsers,
          sellers: totalSellers,
          products: totalProducts,
          orders: totalOrders,
        },
        ordersByStatus,
        revenue: revenueAgg[0]?.totalRevenue || 0,
        activity: {
          newUsersLast7Days: newUsers,
          newOrdersLast7Days: newOrders,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};


exports.getProductsForAdmin = async (req, res, next) => {
  try {
    const {
      name,
      brand,
      categoryName,
      storeName,
      minPrice,
      maxPrice,
      minRating,
    } = req.query;

    const {
      resultsPerPage,
      currentPage,
      skipDocuments,
      sortBy,
      sortOrder,
    } = req.pagination;

    const allowedSorts = [
      "createdAt",
      "name",
      "price",
      "stock",
      "averageRating",
      "numOfReviews",
      "storeName",
      "categoryName",
    ];

    const effectiveSort = allowedSorts.includes(sortBy)
      ? sortBy
      : "createdAt";

    const filter = {};

    if (name) filter.name = { $regex: name, $options: "i" };
    if (brand) filter.brand = brand;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) filter.averageRating = { $gte: Number(minRating) };

    let products = await Product.find(filter)
      .select("-reviews")
      .populate({
        path: "seller",
        select: "storeName",
        match: storeName
          ? { storeName: { $regex: storeName, $options: "i" } }
          : {},
      })
      .populate({
        path: "category",
        select: "name",
        match: categoryName
          ? { name: { $regex: categoryName, $options: "i" } }
          : {},
      });

    products = products.filter(
      (p) => (!storeName || p.seller) && (!categoryName || p.category)
    );

    const direction = sortOrder === -1 ? -1 : 1;

    if (effectiveSort === "storeName") {
      products.sort(
        (a, b) =>
          a.seller.storeName.localeCompare(b.seller.storeName) * direction
      );
    } else if (effectiveSort === "categoryName") {
      products.sort(
        (a, b) => a.category.name.localeCompare(b.category.name) * direction
      );
    } else {
      products.sort((a, b) =>
        a[effectiveSort] > b[effectiveSort]
          ? direction
          : a[effectiveSort] < b[effectiveSort]
          ? -direction
          : 0
      );
    }

    const totalCounts = products.length;
    const totalPages = Math.ceil(totalCounts / resultsPerPage);

    const paginatedProducts = products.slice(
      skipDocuments,
      skipDocuments + resultsPerPage
    );

    res.json({
      success: true,
      products: paginatedProducts,
      pagination: {
        currentPage,
        resultsPerPage,
        totalCounts,
        totalPages,
        sortBy: effectiveSort,
        sortOrder: direction === 1 ? "asc" : "desc",
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrdersForAdmin = async (req, res, next) => {
  try {
    const { status, userId } = req.query;

    const {
      resultsPerPage,
      currentPage,
      skipDocuments,
      sortOrder,
    } = req.pagination;

    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.user = userId;

    const totalCounts = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalCounts / resultsPerPage);
    const mongoSortOrder = sortOrder === 1 ? 1 : -1;

    const orders = await Order.find(filter)
      .populate("user", "username email")
      .populate("items.product", "name price")
      .sort({ createdAt: mongoSortOrder })
      .skip(skipDocuments)
      .limit(resultsPerPage);

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage,
        resultsPerPage,
        totalCounts,
        totalPages,
        sortBy: "createdAt",
        sortOrder: mongoSortOrder === 1 ? "asc" : "desc",
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getSellersForAdmin = async (req, res, next) => {
  try {
    const { storeName, isVerified } = req.query;

    const {
      resultsPerPage,
      currentPage,
      skipDocuments,
      sortOrder,
    } = req.pagination;

    const mongoSortOrder = sortOrder === 1 ? 1 : -1;

    const filter = {};
    if (storeName)
      filter.storeName = { $regex: storeName, $options: "i" };

    if (isVerified !== undefined)
      filter.isVerified = isVerified === "true";

    const totalCounts = await Seller.countDocuments(filter);
    const totalPages = Math.ceil(totalCounts / resultsPerPage);

    const sellers = await Seller.find(filter)
      .populate("owner", "username email")
      .sort({ createdAt: mongoSortOrder })
      .skip(skipDocuments)
      .limit(resultsPerPage);

    res.json({
      success: true,
      sellers,
      pagination: {
        currentPage,
        resultsPerPage,
        totalCounts,
        totalPages,
        sortBy: "createdAt",
        sortOrder: mongoSortOrder === 1 ? "asc" : "desc",
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getUsersForAdmin = async (req, res, next) => {
  try {
    const { username, email, isAdmin } = req.query;

    const {
      resultsPerPage,
      currentPage,
      skipDocuments,
      sortOrder,
    } = req.pagination;

    const mongoSortOrder = sortOrder === 1 ? 1 : -1;

    const filter = {};
    if (username)
      filter.username = { $regex: username, $options: "i" };

    if (email)
      filter.email = { $regex: email, $options: "i" };

    if (isAdmin !== undefined)
      filter.isAdmin = isAdmin === "true";

    const totalCounts = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalCounts / resultsPerPage);

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: mongoSortOrder })
      .skip(skipDocuments)
      .limit(resultsPerPage);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage,
        resultsPerPage,
        totalCounts,
        totalPages,
        sortBy: "createdAt",
        sortOrder: mongoSortOrder === 1 ? "asc" : "desc",
      },
    });
  } catch (err) {
    next(err);
  }
};