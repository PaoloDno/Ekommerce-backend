const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require("./config/db.js")

const app = express()
const PORT = process.env.PORT || 5000;

dotenv.config();

//middlewares
app.use(cors());
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(PORT, () => console.log(`Server Running on PORT http://localhost:${PORT}`));
