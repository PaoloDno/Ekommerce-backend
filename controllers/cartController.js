const Cart = require("../models/CartModel.js");
const Product = require("../models/ProductModel.js");
const Order = require("../models/OrderModel.js");

exports.getCart = async (req, res, next) => {
  const { userId } = req.user;

  try {
    let cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "name price productImage stock averageRating attributes seller",
      populate: {
        path: "seller",
        select: "storeName logo",
      },
    });

    // Create empty cart if none exists
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Enrich each item with full product info + attributes
    const enrichedItems = cart.items.map((item) => {
      const product = item.product;

      // Convert Map to plain object for frontend
      const attributes = product?.attributes ? Object.fromEntries(product.attributes) : {};

      return {
        ...item.toObject(),
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          averageRating: product.averageRating,
          image: product.productImage,
          seller: product.seller,
          attributes,
        },
        selectedAttributes: item.attributes || {}, // attributes selected by user
      };
    });

    // Calculate totals
    const totalPrice = enrichedItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    const totalItems = enrichedItems.reduce(
      (count, item) => count + item.quantity,
      0
    );

    // Return cart data
    res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      cart: {
        ...cart.toObject(),
        items: enrichedItems,
      },
      totalPrice,
      totalItems,
    });
  } catch (error) {
    next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const { userId } = req.user;

    const product = await Product.findById(productId).populate("seller", "storeName logo");
    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [
          {
            product: product._id,
            seller: product.seller._id,     // ✅ important
            name: product.name,
            price: product.price,
            quantity,
            stock: product.stock,
            attributes: {},                 // selected later
          },
        ],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity = quantity;
      } else {
        cart.items.push({
          product: product._id,
          seller: product.seller._id,     // ✅
          name: product.name,
          price: product.price,
          quantity,
          stock: product.stock,
          attributes: {},
        });
      }
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: "Added to Cart!",
      cart,
    });
  } catch (error) {
    next(error);
  }
};


exports.removeFromCart = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { productId } = req.params;

    console.log("A laundry day");
    console.log(productId);

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      const error = new Error("Cart not found");
      error.statusCode = 404;
      throw error;
    }
    console.log("cart:", cart);
    console.log("cart.items", cart.items);
    console.log(productId);
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product removed from Cart",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const { userId } = req.user;
    await Cart.findOneAndDelete({ user: userId });

    res.status(200).json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    next(error);
  }
};




exports.checkOutCart = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId }).session(session);

    if (!cart || cart.items.length === 0) {
      throw Object.assign(new Error("Cart is empty"), { statusCode: 400 });
    }

    // Step 1: Fetch products
    const productIds = cart.items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);

    // Step 2: Stock validation
    const insufficientStock = [];

    for (const item of cart.items) {
      const product = products.find(
        (p) => p._id.toString() === item.product.toString()
      );

      if (!product) {
        insufficientStock.push({ productId: item.product, reason: "Product not found" });
        continue;
      }

      if (product.stock < item.quantity) {
        insufficientStock.push({
          productId: product._id,
          name: product.name,
          reason: `Only ${product.stock} left in stock`,
        });
      }
    }

    if (insufficientStock.length) {
      throw Object.assign(
        new Error("Some products are unavailable or low on stock."),
        { statusCode: 400 }
      );
    }

    // Step 3: Calculate totals
    let itemsTotal = 0;

    const orderItems = cart.items.map((item) => {
      const product = products.find(
        (p) => p._id.toString() === item.product.toString()
      );

      itemsTotal += product.price * item.quantity;

      return {
        product: product._id,
        seller: product.seller,
        name: product.name,
        image: product.productImage?.[0],
        price: product.price,
        stock: product.stock,
        quantity: item.quantity,
        attributes: item.attributes,
        sellerStatus: "pending",
      };
    });

    const shippingFee = 50;
    const total = itemsTotal + shippingFee;

    // Step 4: Deduct stock
    const bulkOps = orderItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { stock: -item.quantity } },
      },
    }));
    await Product.bulkWrite(bulkOps, { session });

    // Step 5: Create Order (same structure as createOrder)
    const [order] = await Order.create(
      [
        {
          user: userId,
          items: orderItems,
          shippingAddress: req.body.shippingAddress,
          pricing: {
            itemsTotal,
            shippingFee,
            total,
          },
          payment: {
            method: "cod",
            isPaid: false,
          },
          status: "pending",
        },
      ],
      { session }
    );

    // Step 6: Clear cart
    await Cart.findOneAndDelete({ user: userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
