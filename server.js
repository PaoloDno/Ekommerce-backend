const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middlewares/ErrorHandlerMiddleware.js')

const connectDB = require("./config/db.js")

// routes
const USERroute = require("./routes/authRoute.js");
const CARTroute = require("./routes/cartRoute.js");
const CATEGORYroute = require("./routes/categoryRoute.js");
const PRODUCTroute = require("./routes/productRoute.js");
const ORDERroute = require("./routes/orderRoute.js");
const REVIEWroute = require("./routes/reviewRoute.js");
const SELLERroute = require("./routes/sellerRoute.js");
const SellerModel = require('./models/SellerModel.js');


const app = express()
const PORT = process.env.PORT || 5000;

dotenv.config();

//middlewares
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // Limit each IP to 100 requests
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,    // Return rate limit info in headers
  legacyHeaders: false,     // Disable X-RateLimit headers
});

app.use(cors());
app.use(express.json());
app.use(limiter);
app.use(helmet());

// connectionDB
connectDB();

//routes

app.use('/kommerce/user', USERroute);
app.use('/kommerce/cart', CARTroute);
app.use('/kommerce/category', CATEGORYroute);
app.use('/kommerce/product', PRODUCTroute);
app.use('/kommerce/order', ORDERroute);
app.use('/kommerce/reviews', REVIEWroute);
app.use('/kommerce/seller', SELLERroute);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => 
  console.log(`Server Running on PORT http://localhost:${PORT}`
));
