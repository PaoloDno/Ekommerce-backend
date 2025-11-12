const Product = require("../models/ProductModel.js");
const Category = require("../models/CategoryModel.js");
const Seller = require("../models/SellerModel.js");

exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      description,
      price,
      stock,
      category,
      brand,
      productImage,
      images,
      attributes,
      seller: sellerId,
    } = req.body;

    console.log(sellerId);

    console.log(req.body);

    if (!name || !price || !category) {
      const error = new Error("Required field is empty");
      error.statusCode = 400;
      throw error;
    }

    // find or create category
    let foundCategory = await Category.findOne({ name: category.trim() });
    if (!foundCategory) {
      foundCategory = new Category({ name: category.trim() });
      await foundCategory.save();
    }

    // find seller
    const foundSeller = await Seller.findById(sellerId);
    if (!foundSeller) {
      const error = new Error("Invalid Seller");
      error.statusCode = 400;
      throw error;
    }

    // create product
    const product = new Product({
      name,
      sku,
      description,
      price,
      category: foundCategory._id,
      brand,
      stock,
      productImage,
      images,
      attributes,
      seller: sellerId,
    });

    // save product
    const savedProduct = await product.save();

    // link product to seller
    foundSeller.products.push(savedProduct._id);
    await foundSeller.save();

    res.status(201).json({
      message: "Product created and added to seller store",
      product: savedProduct,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getProducts = async (req, res, next) => {
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

    const { resultsPerPage, currentPage, skipDocuments, sortBy, sortOrder } =
      req.pagination;

    console.log(req.pagination);
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

    

    const effectiveSort = allowedSorts.includes(sortBy) ? sortBy : "createdAt";

    console.log(effectiveSort);
    let filter = {};

    if (name) filter.name = { $regex: name, $options: "i" };
    if (brand) filter.brand = brand;

    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };

    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };

    if (minRating) filter.averageRating = { $gte: Number(minRating) };

    let countQuery = Product.find(filter)
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

    let countResults = await countQuery;

    countResults = countResults.filter(
      (p) => (!storeName || p.seller) && (!categoryName || p.category)
    );

    const totalCounts = countResults.length;
    const totalPages = Math.ceil(totalCounts / resultsPerPage);

    let productsQuery = Product.find(filter)
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

    let products = await productsQuery
      .skip(skipDocuments)
      .limit(resultsPerPage);

    products = products.filter(
      (p) => (!storeName || p.seller) && (!categoryName || p.category)
    );

    if (!["storeName", "categoryName"].includes(effectiveSort)) {
      productsQuery = productsQuery.sort({ [effectiveSort]: sortOrder });
    }
    if (effectiveSort === "storeName") {
      products.sort(
        (a, b) =>
          a.seller.storeName.localeCompare(b.seller.storeName) *
          (sortOrder === -1 ? -1 : 1)
      );
    }

    if (effectiveSort === "categoryName") {
      products.sort(
        (a, b) =>
          a.category.name.localeCompare(b.category.name) *
          (sortOrder === "desc" ? -1 : 1)
      );
    }
    console.log(effectiveSort);
    //console.log(products);
    res.json({
      products,
      pagination: {
        currentPage,
        resultsPerPage,
        totalCounts,
        totalPages,
        sortBy: effectiveSort,
        sortOrder: sortOrder === 1 ? "asc" : "desc",
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    console.log("q");
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .populate("seller", "name storeName email")
      .populate({
        path: "reviews",
        populate: {
          path: "user",
          select: "username email userAvatar",
        },
      });

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    console.log(product);
    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      price,
      category,
      brand,
      stock,
      productImage,
      images,
      attributes,
      seller,
    } = req.body;

    if (!name || !price || !category) {
      const error = new Error("Name, price, and category are required");
      error.statusCode = 400;
      throw error;
    }

    const foundCategory = await Category.findById(category);
    if (!foundCategory) {
      const error = new Error("Invalid category ID");
      error.statusCode = 400;
      throw error;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        sku,
        description,
        price,
        category,
        brand,
        stock,
        productImage,
        images,
        attributes,
        seller,
      },
      { new: true }
    );

    if (!updatedProduct) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    res
      .status(200)
      .json({ message: "Product updated", product: updatedProduct });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};
