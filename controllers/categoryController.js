const Category = require("../models/CategoryModel.js");

exports.createOrLinkCategory = async (req, res, next) => {
  try {
    const { name, relatedCategoryName } = req.body;
    
    let category = await Category.findOne({ name });
    if (!category) {
      category = await Category.create({ name });
    }
    
    let relatedCategory;
    if (relatedCategoryName) {
      relatedCategory = await Category.findOne({ name: relatedCategoryName });
      if (!relatedCategory) {
        relatedCategory = await Category.create({ name: relatedCategoryName });
      }

      // Add each other as related if not already
      if (!category.relatedCategories.includes(relatedCategory._id)) {
        category.relatedCategories.push(relatedCategory._id);
      }
      if (!relatedCategory.relatedCategories.includes(category._id)) {
        relatedCategory.relatedCategories.push(category._id);
      }

      await category.save();
      await relatedCategory.save();
    }

    res.status(201).json({
      success: true,
      message: relatedCategory 
        ? `Category '${name}' linked with '${relatedCategoryName}'`
        : `Category '${name}' created/updated successfully`,
      category
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().populate("relatedCategories", "name");
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

exports.getCategoriesId = async ( req, res, next ) => {
  try {
    const category = await Category.findById(req.params.id).populate("relatedCategories", "name");
    if (!category) {
      const error = new Error("Category not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      const error = new Error("Category not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};