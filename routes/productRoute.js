const express = require('express');
const authenticationMiddleware = require('../middlewares/AuthenticationMiddleware');

const {
  createProduct,
  getProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const paginationMiddleware = require('../middlewares/PaginationMiddleware');

const router = express.Router();

router.get('/', paginationMiddleware, getProducts);
router.get('/:id', getProduct);

router.post('/', authenticationMiddleware, createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);


module.exports = router;