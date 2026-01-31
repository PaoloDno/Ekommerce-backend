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
const NOTIFroute = require("./routes/notifRoutes.js");
const ADMINroute = require("./routes/adminRoutes.js");


const app = express()
const PORT = process.env.PORT || 5000;

dotenv.config();

app.set("trust proxy", 1);


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

app.use('/user', USERroute);
app.use('/cart', CARTroute);
app.use('/category', CATEGORYroute);
app.use('/product', PRODUCTroute);
app.use('/order', ORDERroute);
app.use('/review', REVIEWroute);
app.use('/store', SELLERroute);
app.use('/notif', NOTIFroute);
app.use('/admin', ADMINroute);

app.get('/', (req, res) => {
  res.send('Hello World! TEST')
})

// Error Handler
app.use(errorHandler);

app.listen(PORT, () => 
  console.log(`Server Running on PORT http://localhost:${PORT}`
));
