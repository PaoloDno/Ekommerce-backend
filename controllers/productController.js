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

exports.getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      sortBy = "createdAt", // default sort
      order = "desc", // asc or desc
      page = 1,
      limit = 10,
    } = req.query;

    let filter = {};

    // Search by text
    if (search) {
      filter.$text = { $search: search };
    }

    // Filter by category
    if (category) filter.category = category;

    // Filter by brand
    if (brand) filter.brand = brand;

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Pagination
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOrder = order === "asc" ? 1 : -1;

    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("seller", "name")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "products fetched",
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      products,
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
