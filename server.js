const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const connectDB = require("./config/db.js")

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
app.use(helmet);


// connectionDB
connectDB();

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(PORT, () => 
  console.log(`Server Running on PORT http://localhost:${PORT}`

  ));
