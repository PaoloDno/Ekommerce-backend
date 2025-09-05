const express = require("express");
const authenticationMiddleware = require('../middlewares/AuthenticationMiddleware.js');
const adminMiddleware = require('../middlewares/AuthorizationMiddleware.js');
const {
  createOrLinkCategory,
  getCategories,
  getCategoriesId,
  deleteCategory
} = require("../controllers/categoryController.js")
const router = express.Router();

router.post("/", authenticationMiddleware, adminMiddleware, createOrLinkCategory);     
router.get("/", authenticationMiddleware, adminMiddleware, getCategories);               
router.get("/:id", authenticationMiddleware, adminMiddleware, getCategoriesId);          
router.delete("/:id", authenticationMiddleware, adminMiddleware, deleteCategory);        

module.exports = router;